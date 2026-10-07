import { createHash } from 'node:crypto';

const check = (condition, code) => { if (!condition) throw new Error(code); };
const digest = value => createHash('sha256').update(value).digest('hex');
const copy = value => structuredClone(value);
const validKey = key => /^[a-z0-9][a-z0-9_-]{0,79}$/.test(key);
const validHash = value => /^[a-f0-9]{64}$/.test(value ?? '');
const terminal = intent => ['confirmed', 'not-applied'].includes(intent.status);
const initial = () => ({ schemaVersion: 1, paused: true, restoreHold: false, fence: 0, lease: null, intents: {}, receipts: {} });

// Adapters must provide linearizable read and conditionalWrite, including atomic
// create-if-absent. A failed CAS must throw state_conflict. No last-writer-wins store.
export class MemoryStateAdapter {
  #entries = new Map();
  async read(key) { return copy(this.#entries.get(key) ?? { value: null, version: null }); }
  async conditionalWrite(key, value, expectedVersion) {
    const previous = this.#entries.get(key);
    check((previous?.version ?? null) === expectedVersion, 'state_conflict');
    const version = (previous?.version ?? 0) + 1;
    this.#entries.set(key, { value: copy(value), version });
    return version;
  }
}

// An owner-provisioned private repository is an optional backing store. Credentials
// remain in the caller's request closure; this module never reads or exports them.
// Contents API file SHA is the compare-and-swap version. The repo must be dedicated
// private operational storage, not the public implementation repository.
export class PrivateGitHubStateAdapter {
  constructor({ repository, branch, request }) {
    check(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) && typeof branch === 'string' && /^[A-Za-z0-9_./-]+$/.test(branch) && typeof request === 'function', 'invalid_storage_configuration');
    this.repository = repository; this.branch = branch;
    this.request = async (...args) => {
      try { return await request(...args); }
      catch { throw new Error(args[0] === 'PUT' ? 'storage_write_uncertain' : 'storage_read_failed'); }
    };
  }
  async #private() {
    const result = await this.request('GET', `/repos/${this.repository}`);
    check(result.status === 200 && result.body?.private === true && result.body?.full_name?.toLowerCase() === this.repository.toLowerCase(), 'private_storage_required');
  }
  #path(key) { check(validKey(key), 'invalid_state_key'); return `/repos/${this.repository}/contents/ltc-state/${key}.json`; }
  async read(key) {
    await this.#private();
    const result = await this.request('GET', `${this.#path(key)}?ref=${encodeURIComponent(this.branch)}`);
    if (result.status === 404) return { value: null, version: null };
    check(result.status === 200 && typeof result.body?.sha === 'string' && result.body?.encoding === 'base64', 'storage_read_failed');
    let value;
    try { value = JSON.parse(Buffer.from(result.body.content, 'base64').toString('utf8')); } catch { throw new Error('storage_read_failed'); }
    return { value, version: result.body.sha };
  }
  async conditionalWrite(key, value, expectedVersion) {
    await this.#private();
    const result = await this.request('PUT', this.#path(key), { message: `LTC operational state ${key}`, branch: this.branch, content: Buffer.from(JSON.stringify(value)).toString('base64'), ...(expectedVersion === null ? {} : { sha: expectedVersion }) });
    if ([409, 422].includes(result.status)) throw new Error('state_conflict');
    check([200, 201].includes(result.status) && typeof result.body?.content?.sha === 'string', 'storage_write_uncertain');
    return result.body.content.sha;
  }
}

export class DurableCloudState {
  constructor(adapter, key, { clock = Date.now } = {}) {
    check(validKey(key), 'invalid_state_key'); this.adapter = adapter; this.key = key; this.clock = clock;
  }
  async #update(transform) {
    const { value, version } = await this.adapter.read(this.key);
    const document = value ?? initial();
    validateDocument(document);
    const result = transform(document);
    validateDocument(document);
    await this.adapter.conditionalWrite(this.key, document, version);
    return copy(result);
  }
  async inspect() { const { value } = await this.adapter.read(this.key); if (value) validateDocument(value); return copy(value ?? initial()); }
  async setPaused(paused) {
    check(typeof paused === 'boolean', 'invalid_pause');
    return this.#update(document => { check(paused || !document.restoreHold, 'restore_acceptance_required'); document.paused = paused; return { paused }; });
  }
  #live(document, lease) {
    check(!document.paused && !document.restoreHold, 'publication_paused');
    check(document.lease?.runId === lease?.runId && document.lease?.fence === lease?.fence, 'lease_fenced');
    check(document.lease.expiresAt > this.clock(), 'lease_expired');
  }
  async acquire(runId, ttlMs = 60_000) {
    check(validKey(runId) && Number.isInteger(ttlMs) && ttlMs >= 1000 && ttlMs <= 3_600_000, 'invalid_lease');
    return this.#update(document => {
      check(!document.paused && !document.restoreHold, 'publication_paused');
      // Expiry never silently authorizes another writer. Explicit recovery first.
      check(!document.lease, 'lease_held');
      check(Object.values(document.intents).every(terminal), 'reconciliation_required');
      document.lease = { runId, fence: ++document.fence, expiresAt: this.clock() + ttlMs };
      return document.lease;
    });
  }
  async renew(lease, ttlMs = 60_000) {
    check(Number.isInteger(ttlMs) && ttlMs >= 1000 && ttlMs <= 3_600_000, 'invalid_lease');
    return this.#update(document => { this.#live(document, lease); document.lease.expiresAt = this.clock() + ttlMs; return document.lease; });
  }
  async intend(lease, operationId, payloadSha256) {
    check(validKey(operationId) && validHash(payloadSha256), 'invalid_intent');
    return this.#update(document => {
      this.#live(document, lease);
      const previous = Object.hasOwn(document.intents, operationId) ? document.intents[operationId] : null;
      if (previous) { check(previous.payloadSha256 === payloadSha256, 'idempotency_conflict'); return previous; }
      document.intents[operationId] = { operationId, runId: lease.runId, fence: lease.fence, payloadSha256, status: 'pending', evidenceSha256: null };
      return document.intents[operationId];
    });
  }
  async assertMayMutate(lease, operationId) {
    return this.#update(document => {
      this.#live(document, lease);
      const intent = document.intents[operationId];
      check(intent?.status === 'pending' && intent.fence === lease.fence && intent.runId === lease.runId, 'reconciliation_required');
      // Persist uncertainty before returning authorization. A crash anywhere after
      // this CAS requires external readback; no second call can replay the effect.
      intent.status = 'uncertain';
      return intent;
    });
  }
  async uncertain(lease, operationId) {
    return this.#update(document => {
      const intent = document.intents[operationId];
      check(document.lease?.runId === lease.runId && document.lease?.fence === lease.fence && intent?.runId === lease.runId && intent?.fence === lease.fence && ['pending', 'uncertain'].includes(intent.status), 'lease_fenced');
      intent.status = 'uncertain'; return intent;
    });
  }
  // Reconciliation evidence comes from a trusted service readback, not a retry.
  // Caller must authenticate and verify the service-specific external outcome.
  async reconcile(operationId, status, evidenceSha256) {
    check(['confirmed', 'not-applied'].includes(status) && validHash(evidenceSha256), 'invalid_reconciliation');
    return this.#update(document => {
      const intent = document.intents[operationId]; check(intent, 'intent_missing');
      if (terminal(intent)) { check(intent.status === status && intent.evidenceSha256 === evidenceSha256, 'immutable_receipt_changed'); return intent; }
      intent.status = status; intent.evidenceSha256 = evidenceSha256;
      const receipt = { ...intent }; document.receipts[operationId] = { receipt, sha256: digest(JSON.stringify(receipt)) };
      return intent;
    });
  }
  async release(lease) {
    return this.#update(document => {
      check(document.lease?.runId === lease.runId && document.lease?.fence === lease.fence, 'lease_fenced');
      check(Object.values(document.intents).every(terminal), 'reconciliation_required');
      document.lease = null; return { released: true };
    });
  }
  async recoverExpiredLease(expectedFence, evidenceSha256) {
    check(validHash(evidenceSha256), 'invalid_reconciliation');
    return this.#update(document => {
      check(document.paused, 'recovery_requires_pause');
      check(document.lease?.fence === expectedFence && document.lease.expiresAt <= this.clock(), 'recovery_not_allowed');
      check(Object.values(document.intents).every(terminal), 'reconciliation_required');
      document.lease = null;
      document.recovery = { fence: expectedFence, evidenceSha256 };
      return { recovered: true };
    });
  }
  async acceptRestoredState(evidenceSha256) {
    check(validHash(evidenceSha256), 'invalid_reconciliation');
    return this.#update(document => {
      check(document.paused && document.restoreHold && !document.lease && Object.values(document.intents).every(terminal), 'restore_acceptance_required');
      document.restoreHold = false; document.restoreAcceptance = { evidenceSha256 };
      return { accepted: true, paused: true };
    });
  }
  async backup() {
    const document = await this.inspect(); const bytes = JSON.stringify(document);
    return { schemaVersion: 1, key: this.key, bytes, sha256: digest(bytes) };
  }
  async restore(backup) {
    check(backup?.schemaVersion === 1 && backup.key === this.key && typeof backup.bytes === 'string' && validHash(backup.sha256) && digest(backup.bytes) === backup.sha256, 'invalid_backup');
    let document; try { document = JSON.parse(backup.bytes); } catch { throw new Error('invalid_backup'); }
    validateDocument(document);
    document.paused = true; document.restoreHold = true;
    // Restores cannot overwrite an existing operational ledger.
    await this.adapter.conditionalWrite(this.key, document, null);
    return { restored: true, paused: true, restoreHold: true };
  }
}

function validateDocument(document) {
  check(JSON.stringify(document).length <= 900_000, 'state_capacity_exceeded');
  check(document?.schemaVersion === 1 && typeof document.paused === 'boolean' && typeof document.restoreHold === 'boolean' && Number.isSafeInteger(document.fence) && document.fence >= 0 && document.intents && document.receipts && !Array.isArray(document.intents) && !Array.isArray(document.receipts), 'invalid_state_document');
  if (document.lease) check(validKey(document.lease.runId) && Number.isSafeInteger(document.lease.fence) && document.lease.fence > 0 && document.lease.fence <= document.fence && Number.isFinite(document.lease.expiresAt), 'invalid_state_document');
  for (const [id, intent] of Object.entries(document.intents)) {
    check(validKey(id) && intent.operationId === id && validKey(intent.runId) && Number.isSafeInteger(intent.fence) && intent.fence > 0 && intent.fence <= document.fence && validHash(intent.payloadSha256) && ['pending', 'uncertain', 'confirmed', 'not-applied'].includes(intent.status), 'invalid_state_document');
    if (terminal(intent)) check(validHash(intent.evidenceSha256) && document.receipts[id]?.sha256 === digest(JSON.stringify(intent)) && JSON.stringify(document.receipts[id].receipt) === JSON.stringify(intent), 'invalid_receipt');
  }
  for (const id of Object.keys(document.receipts)) check(document.intents[id] && terminal(document.intents[id]), 'invalid_receipt');
}
