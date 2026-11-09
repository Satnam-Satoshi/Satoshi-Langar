import test from 'node:test';
import assert from 'node:assert/strict';
import { GoogleDocsStateAdapter } from './cloud-ltc-docs-state.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { ReleaseOperationCoordinator } from './cloud-ltc-operations.mjs';
import { recoverUploadOnlyLease, uploadRecoveryHash as hash } from './cloud-ltc-upload-only-recovery.mjs';

function fixture() {
  const now = Date.parse('2026-11-07T12:00:00Z');
  const old = { operationId: 'old-summary', runId: 'gha-80-1', fence: 21,
    payload: { kind: 'drive-evidence', role: 'release-summary' }, status: 'confirmed' };
  old.payloadSha256 = hash(old.payload); old.proof = { verified: true }; old.evidenceSha256 = hash(old.proof);
  const document = { schemaVersion: 1, paused: false, restoreHold: false, fence: 22,
    lease: { runId: 'gha-90-1', fence: 22, expiresAt: now - 1, publicationDate: '2026-11-06' },
    intents: { [old.operationId]: old }, receipts: { [old.operationId]: { receipt: structuredClone(old), sha256: hash(old) } },
    latestRelease: { source: 'a'.repeat(40), deployment: 'dpl_previous', artifactManifestSha256: 'b'.repeat(64), summary: { operationId: old.operationId } },
    archiveHead: { schemaVersion: 1, summaryOperationId: old.operationId, summaryFileId: 'old-summary-file',
      summaryFolderId: 'private-folder-id', summarySha256: 'c'.repeat(64), backupSha256: 'd'.repeat(64),
      archiveProofSha256: 'e'.repeat(64), previousArchiveSha256: null, archivedIntentCount: 50, archivedReceiptCount: 50 },
    priorAuditHistory: { incident: 'must-preserve', receipts: ['original-receipt'] } };
  for (let index = 0; index < 43; index++) {
    const payload = { kind: 'drive-evidence', role: 'release-artifacts', generation: 'f22-1234567890abcdef',
      artifactPackageManifestSha256: 'f'.repeat(64), artifactBundleCount: 43, artifactBundleIndex: index,
      fileId: `reserved-file-${index}`, folderId: 'private-folder-id', sha256: hash(`bytes-${index}`), bytes: index + 100 };
    const row = { operationId: `evidence-${index}`, runId: 'gha-90-1', fence: 22,
      payload, payloadSha256: hash(payload), status: index < 39 ? 'confirmed' : 'pending', evidenceSha256: null };
    if (row.status === 'confirmed') {
      row.proof = { operationId: row.operationId, payloadSha256: row.payloadSha256, status: 'applied',
        proof: { fileId: payload.fileId, folderId: payload.folderId, sha256: payload.sha256, length: payload.bytes,
          ownerPermissionId: 'test-owner-permission', ownerOnly: true, downloadVerified: true } };
      row.evidenceSha256 = hash(row.proof);
      document.receipts[row.operationId] = { receipt: structuredClone(row), sha256: hash(row) };
    }
    document.intents[row.operationId] = row;
  }
  const review = { schemaVersion: 1, kind: 'reviewed-upload-only-lease-recovery', approved: true,
    archiveOnly: true, pauseAfter: true, authorizePublication: false,
    repository: 'Satnam-Satoshi/Satoshi-Langar', ledgerKey: 'website', approvedAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + 3600000).toISOString(), snapshotSha256: hash(document), snapshotVersion: 'revision-1',
    latestReleaseSha256: hash(document.latestRelease), archiveHeadSha256: hash(document.archiveHead),
    sourcePolicySha256: 'a'.repeat(64), sourceHead: 'a'.repeat(40),
    origin: { runId: '90', attempt: '1', workflowHead: 'b'.repeat(40), fence: 22, event: 'schedule' },
    folderId: 'private-folder-id', ownerPermissionId: 'test-owner-permission', generation: 'f22-1234567890abcdef', artifactPackageManifestSha256: 'f'.repeat(64),
    bundleCount: 43, confirmedCount: 39, pendingOperationIds: ['evidence-39', 'evidence-40', 'evidence-41', 'evidence-42'] };
  const f = { document, review, now, writes: 0, version: 'revision-1', reads: 0, verifications: 0 };
  const adapter = {
    async read() { f.reads++; if (f.failReadback && f.writes) throw Error('unavailable'); return { value: structuredClone(f.document), version: f.version }; },
    async conditionalWrite(key, value, expected) {
      f.writes++; if (f.conflictAtWrite) { f.version = 'concurrent-revision'; throw Error('state_conflict'); }
      assert.equal(key, 'website'); assert.equal(expected, f.version);
      if (f.failWriteBeforeApply) throw Error('storage_write_uncertain');
      f.document = structuredClone(value); f.version = 'revision-2';
      if (f.loseWriteResponse) throw Error('storage_write_uncertain');
    }
  };
  f.state = new DurableCloudState(adapter, 'website', { clock: () => f.now });
  f.dependencies = {
    now: () => f.now,
    async readOrigin() { return { observedAt: new Date(f.now).toISOString(), repository: review.repository, id: 90,
      run_attempt: 1, status: 'completed', conclusion: 'failure', head_branch: 'main', head_sha: review.origin.workflowHead,
      event: 'schedule', path: '.github/workflows/ltc-daily-publication.yml' }; },
    async verifyStoppedWriters() { return { observedAt: new Date(f.now).toISOString(), repository: review.repository,
      sourceHead: review.sourceHead, sourcePolicySha256: review.sourcePolicySha256, cloudPublicationEnabled: false,
      localPublisherDisabled: true, otherWritersStopped: true, writerEvidenceSha256: '9'.repeat(64) }; },
    async verifyPublicBaseline(latest) { return { observedAt: new Date(f.now).toISOString(),
      artifactManifestSha256: latest.artifactManifestSha256, manifestCount: 350,
      domains: ['https://satnamsatoshi.com', 'https://ltcmagazine.org'].map(domain => ({ domain,
        deployment: latest.deployment, allManifestBytesVerified: true, verifiedCount: 350 })) }; },
    async verifyConfirmedUpload(row) { f.verifications++; return { observedAt: new Date(f.now).toISOString(),
      operationId: row.operationId, payloadSha256: row.payloadSha256, ...row.proof.proof }; }
  };
  f.repin = () => { review.snapshotSha256 = hash(f.document); review.latestReleaseSha256 = hash(f.document.latestRelease);
    review.archiveHeadSha256 = hash(f.document.archiveHead); review.snapshotVersion = f.version; };
  f.run = (expectedRecoveredStateSha256) => recoverUploadOnlyLease({ state: f.state, review, expectedReviewSha256: hash(review), expectedRecoveredStateSha256, dependencies: f.dependencies });
  return f;
}
function mutateRead(f, method, mutate) { const original = f.dependencies[method]; f.dependencies[method] = async (...args) => mutate(await original(...args)); }

test('one captured timestamp admits exactly six hours but rejects even one extra millisecond before state reads', async () => {
  for (const extra of [0, 1, 7]) {
    const f = fixture();
    const approved = f.now - 1000;
    f.review.approvedAt = new Date(approved).toISOString();
    f.review.expiresAt = new Date(approved + 21600000 + extra).toISOString();
    f.dependencies.verifyStoppedWriters = async () => { throw Error('reached-first-proof'); };
    await assert.rejects(f.run(), extra ? /upload_recovery_review_expired/ : /reached-first-proof/);
    assert.equal(f.reads, extra ? 0 : 1);
    assert.equal(f.writes, 0); assert.equal(f.verifications, 0);
  }
});

test('exact 39 confirmed + 4 pending recovery is one paused CAS preserving all original history and confirmed bytes', async () => {
  const f = fixture(), before = structuredClone(f.document);
  const result = await f.run();
  assert.equal(result.status, 'recovered-paused'); assert.equal(result.confirmedRetained, 39); assert.equal(result.pendingRetired, 4);
  assert.equal(result.publicationPerformed, false); assert.equal(result.effectsReissued, false);
  assert.equal(f.writes, 1); assert.equal(f.document.paused, true); assert.equal(f.document.lease, null); assert.equal(f.document.fence, 22);
  for (const [key, value] of Object.entries(before)) if (!['paused', 'lease', 'intents', 'receipts'].includes(key)) assert.deepEqual(f.document[key], value);
  for (const row of Object.values(before.intents).filter(row => row.status === 'confirmed')) {
    assert.deepEqual(f.document.intents[row.operationId], row); assert.deepEqual(f.document.receipts[row.operationId], before.receipts[row.operationId]);
  }
  for (const name of f.review.pendingOperationIds) {
    const row = f.document.intents[name]; assert.equal(row.status, 'not-applied'); assert.equal(row.proof.proof.authorizationDurablyGranted, false);
  }
  await f.state.inspect(); await assert.rejects(f.state.acquire('new-writer'), /publication_paused/);
});

test('identical repeat is read-only, while later or tampered state is not treated as completed', async () => {
  const f = fixture(); const first = await f.run(); const second = await f.run(first.stateSha256); assert.equal(second.alreadyRecovered, true); assert.equal(f.writes, 1);
  f.document.priorAuditHistory.incident = 'changed'; await assert.rejects(f.run(first.stateSha256), /upload_recovery_replay_changed/); assert.equal(f.writes, 1);
});

test('terminalized IDs can never be issued again by the operation coordinator', async () => {
  const f = fixture(); await f.run(); await f.state.setPaused(false); const lease = await f.state.acquire('new-writer');
  const coordinator = new ReleaseOperationCoordinator({ state: f.state, lease }); let effects = 0;
  const row = f.document.intents['evidence-39'];
  const result = await coordinator.execute({ operationId: row.operationId, payload: row.payload,
    provider: { apply: async () => effects++, readback: async () => { throw Error('must-not-read'); } } });
  assert.equal(result.status, 'not-applied'); assert.equal(effects, 0);
});

for (const [name, mutate, pattern] of [
  ['uncertain upload', f => { f.document.intents['evidence-39'].status = 'uncertain'; }, /nonterminal_shape/],
  ['Git provider intent', f => { const row = f.document.intents['evidence-39']; row.payload.kind = 'git-ref'; row.payloadSha256 = hash(row.payload); }, /non_archive/],
  ['unexpired lease', f => { f.document.lease.expiresAt = f.now + 1000; }, /snapshot_changed/],
  ['restore hold', f => { f.document.restoreHold = true; }, /snapshot_changed/],
  ['foreign current-fence run', f => { f.document.intents['evidence-39'].runId = 'gha-99-1'; }, /non_archive/],
  ['old nonterminal intent', f => { const row = f.document.intents['old-summary']; row.status = 'uncertain'; delete f.document.receipts[row.operationId]; }, /non_archive/],
  ['pending evidence', f => { f.document.intents['evidence-39'].evidenceSha256 = '9'.repeat(64); }, /pending_has_receipt/],
  ['missing bundle', f => { delete f.document.intents['evidence-42']; }, /non_archive/],
  ['duplicate bundle index', f => { const row = f.document.intents['evidence-42']; row.payload.artifactBundleIndex = 41; row.payloadSha256 = hash(row.payload); }, /non_archive/],
  ['duplicate reserved ID', f => { const row = f.document.intents['evidence-42']; row.payload.fileId = f.document.intents['evidence-41'].payload.fileId; row.payloadSha256 = hash(row.payload); }, /nonterminal_shape/],
]) test(`${name} fails before provider reads and writes`, async () => {
  const f = fixture(); mutate(f); f.repin(); await assert.rejects(f.run(), pattern); assert.equal(f.writes, 0); assert.equal(f.verifications, 0);
});

for (const [name, method, mutate, pattern] of [
  ['still running origin', 'readOrigin', p => ({ ...p, status: 'in_progress' }), /origin_not_completed/],
  ['wrong workflow head', 'readOrigin', p => ({ ...p, head_sha: '0'.repeat(40) }), /origin_not_completed/],
  ['wrong original attempt', 'readOrigin', p => ({ ...p, run_attempt: 2 }), /origin_not_completed/],
  ['cloud gate on', 'verifyStoppedWriters', p => ({ ...p, cloudPublicationEnabled: true }), /writers_not_stopped/],
  ['local owner not stopped', 'verifyStoppedWriters', p => ({ ...p, localPublisherDisabled: false }), /writers_not_stopped/],
  ['unknown competing writer', 'verifyStoppedWriters', p => ({ ...p, otherWritersStopped: false }), /writers_not_stopped/],
  ['changed source', 'verifyStoppedWriters', p => ({ ...p, sourceHead: '0'.repeat(40) }), /writers_not_stopped/],
  ['changed public bytes', 'verifyPublicBaseline', p => ({ ...p, domains: p.domains.map(row => ({ ...row, allManifestBytesVerified: false })) }), /public_baseline_changed/],
  ['only one domain', 'verifyPublicBaseline', p => ({ ...p, domains: p.domains.slice(0, 1) }), /public_baseline_changed/],
  ['wrong confirmed bytes', 'verifyConfirmedUpload', p => ({ ...p, sha256: '0'.repeat(64) }), /confirmed_readback_changed/],
  ['wrong confirmed owner', 'verifyConfirmedUpload', p => ({ ...p, ownerPermissionId: 'other-owner-permission' }), /confirmed_readback_changed/],
  ['nonprivate confirmed upload', 'verifyConfirmedUpload', p => ({ ...p, ownerOnly: false }), /confirmed_readback_changed/],
  ['stale origin evidence', 'readOrigin', p => ({ ...p, observedAt: '2026-11-06T00:00:00Z' }), /stale_proof/],
]) test(`${name} refuses without a write`, async () => {
  const f = fixture(); mutateRead(f, method, mutate); await assert.rejects(f.run(), pattern); assert.equal(f.writes, 0);
});

test('wrong exact review pin and expired/overlong approval fail before state reads', async () => {
  const f = fixture(); await assert.rejects(recoverUploadOnlyLease({ state: f.state, review: f.review,
    expectedReviewSha256: '0'.repeat(64), dependencies: f.dependencies }), /review_pin_mismatch/); assert.equal(f.reads, 0);
  f.review.expiresAt = new Date(f.now - 1).toISOString(); await assert.rejects(f.run(), /review_expired/); assert.equal(f.reads, 0);
  f.review.expiresAt = new Date(f.now + 30_000_000).toISOString(); await assert.rejects(f.run(), /review_expired/); assert.equal(f.reads, 0);
});

test('concurrent revision during evidence reads stops before CAS even when state bytes match', async () => {
  const f = fixture(); const original = f.dependencies.verifyPublicBaseline;
  f.dependencies.verifyPublicBaseline = async (...args) => { f.version = 'revision-concurrent'; return original(...args); };
  await assert.rejects(f.run(), /snapshot_changed/); assert.equal(f.writes, 0);
});

test('concurrent pending authorization cannot be overwritten', async () => {
  const f = fixture(); const original = f.dependencies.verifyPublicBaseline;
  f.dependencies.verifyPublicBaseline = async (...args) => { f.document.intents['evidence-39'].status = 'uncertain'; return original(...args); };
  await assert.rejects(f.run(), /snapshot_changed/); assert.equal(f.writes, 0);
});

test('CAS conflict, lost pre-apply write, and unavailable readback are never retried', async () => {
  for (const [flag, pattern] of [['conflictAtWrite', /state_conflict/], ['failWriteBeforeApply', /write_outcome_uncertain/], ['failReadback', /write_outcome_uncertain/]]) {
    const f = fixture(); f[flag] = true; await assert.rejects(f.run(), pattern); assert.equal(f.writes, 1);
  }
});

test('lost successful write response is proven by exact readback and then safely no-ops', async () => {
  const f = fixture(); f.loseWriteResponse = true; const result = await f.run(); assert.equal(result.lostWriteResponseRecovered, true);
  assert.equal((await f.run(result.stateSha256)).alreadyRecovered, true); assert.equal(f.writes, 1);
});

test('writer restart or origin rerun at final barrier refuses before CAS', async () => {
  for (const method of ['verifyStoppedWriters', 'readOrigin']) {
    const f = fixture(); let calls = 0; mutateRead(f, method, p => ++calls === 1 ? p :
      method === 'readOrigin' ? { ...p, status: 'in_progress' } : { ...p, cloudPublicationEnabled: true });
    await assert.rejects(f.run(), /writers_not_stopped|origin_not_completed/); assert.equal(f.writes, 0);
  }
});

test('approval expiry during verification blocks the write', async () => {
  const f = fixture(); let calls = 0; mutateRead(f, 'readOrigin', p => { if (++calls === 2) f.now += 3_600_000; return { ...p, observedAt: new Date(f.now).toISOString() }; });
  await assert.rejects(f.run(), /review_expired/); assert.equal(f.writes, 0);
});


test('repeat without independently retained result pin cannot claim verified recovery', async () => {
  const f = fixture(); await f.run(); await assert.rejects(f.run(), /replay_pin_required/); assert.equal(f.writes, 1);
});

test('added recovery record fields and coordinated proof/receipt rehashing fail the independent result pin', async () => {
  for (const mutate of [
    f => { f.document.uploadOnlyLeaseRecoveries[0].unapproved = true; },
    f => {
      const record = f.document.uploadOnlyLeaseRecoveries[0]; record.proof.controls.cloudPublicationEnabled = true;
      for (const name of f.review.pendingOperationIds) {
        const row = f.document.intents[name]; row.proof.proof.recoveryProofSha256 = hash(record.proof);
        row.evidenceSha256 = hash(row.proof); f.document.receipts[name] = { receipt: structuredClone(row), sha256: hash(row) };
      }
    }
  ]) {
    const f = fixture(); const result = await f.run(); mutate(f);
    await assert.rejects(f.run(result.stateSha256), /replay_changed/); assert.equal(f.writes, 1);
  }
});

test('a delayed final ledger read cannot outlive approval or verified proofs', async () => {
  for (const delay of [300001, 3600001]) {
    const f = fixture(); const read = f.state.adapter.read;
    f.state.adapter.read = async (...args) => { const result = await read(...args); if (f.reads === 2) f.now += delay; return result; };
    await assert.rejects(f.run(), /stale_proof|review_expired/); assert.equal(f.writes, 0);
  }
});

test('a delayed final origin read cannot leave stale writer controls at CAS', async () => {
  const f = fixture(); let calls = 0;
  mutateRead(f, 'readOrigin', p => { if (++calls === 2) f.now += 300001; return { ...p, observedAt: new Date(f.now).toISOString() }; });
  await assert.rejects(f.run(), /stale_proof/); assert.equal(f.writes, 0);
});

// Exercise the recovery controller through the production Docs adapter rather
// than a permissive in-memory conditionalWrite implementation.
function withDocsAdapter(f, mode = 'success') {
  const documentId = 'recovery-ledger-fixture', folderId = 'private-folder-id';
  let revision = 'revision-1', raw = JSON.stringify({schemaVersion:1,key:'website',value:f.document});
  const calls = [];
  const client = {
    async getFileMetadata() { return {status:200,body:{id:documentId,mimeType:'application/vnd.google-apps.document',trashed:false,ownedByMe:true,shared:false,parents:[folderId],capabilities:{canEdit:true}}}; },
    async getDocument() {
      return {status:200,body:{documentId,revisionId:revision,tabs:[{tabProperties:{tabId:'tab-one'},documentTab:{body:{content:[{endIndex:1,sectionBreak:{}},{startIndex:1,endIndex:raw.length+2,paragraph:{elements:[{startIndex:1,endIndex:raw.length+2,textRun:{content:raw+'\n'}}]}}]}}}]}};
    },
    async batchUpdateDocument(id, body) {
      if(f.transportDelay){f.now+=f.transportDelay;f.finalWriteGuard();}
      calls.push(structuredClone(body));
      assert.equal(id, documentId);
      assert.deepEqual(body.writeControl, {requiredRevisionId:'revision-1'});
      assert.equal(body.requests.length, 2);
      assert.deepEqual(body.requests[0].deleteContentRange.range,{startIndex:1,endIndex:raw.length+1,tabId:'tab-one'});
      assert.deepEqual(body.requests[1].insertText.location,{index:1,tabId:'tab-one'});
      if (mode === 'conflict') { revision = 'concurrent-revision'; return {status:400,body:{}}; }
      if (mode === 'rejected') return {status:403,body:{}};
      raw = body.requests[1].insertText.text; revision = 'revision-2';
      if (mode === 'lost-response') throw Error('timeout');
      return {status:200,body:{documentId,writeControl:{requiredRevisionId:revision}}};
    }
  };
  const adapter = new GoogleDocsStateAdapter({documentId,folderId,client});
  f.state = new DurableCloudState(adapter,'website',{clock:()=>f.now});
  return {calls,adapter};
}
for (const mode of ['success','lost-response']) {
  test(`actual Docs CAS recovery: ${mode} retains 39 uploads and writes once`, async () => {
    const f=fixture(), before=structuredClone(f.document), docs=withDocsAdapter(f,mode);
    const result=await f.run();
    assert.equal(result.status,'recovered-paused');
    assert.equal(result.lostWriteResponseRecovered,mode==='lost-response');
    assert.equal(docs.calls.length,1);
    const after=(await docs.adapter.read('website')).value;
    assert.equal(after.paused,true); assert.equal(after.lease,null);
    for (const row of Object.values(before.intents).filter(r=>r.status==='confirmed')) {
      assert.deepEqual(after.intents[row.operationId],row);
      assert.deepEqual(after.receipts[row.operationId],before.receipts[row.operationId]);
    }
    assert.equal((await f.run(result.stateSha256)).alreadyRecovered,true);
    assert.equal(docs.calls.length,1);
  });
}
for (const [mode,pattern] of [['conflict',/state_conflict/],['rejected',/write_outcome_uncertain/]]) {
  test(`actual Docs CAS recovery: ${mode} never retries or clears lease`, async () => {
    const f=fixture(),before=structuredClone(f.document),docs=withDocsAdapter(f,mode);
    await assert.rejects(f.run(),pattern);
    assert.equal(docs.calls.length,1);
    assert.deepEqual((await docs.adapter.read('website')).value,before);
  });
}

test('controller freshness guard reaches the actual adapter write boundary',async()=>{
 const f=fixture(),docs=withDocsAdapter(f),before=structuredClone(f.document);
 f.dependencies.armWriteGuard=guard=>{f.finalWriteGuard=guard;};
 f.transportDelay=300001;
 await assert.rejects(f.run(),/write_outcome_uncertain/);
 assert.equal(docs.calls.length,0);
 assert.deepEqual((await docs.adapter.read('website')).value,before);
});
