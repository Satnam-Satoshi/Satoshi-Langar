// Finite, receipt-only maintenance for an idle, paused, pre-cutover social ledger.
// Never constructs a Buffer writer or changes publication controls. No retries.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BUFFER_TARGET, bufferToolData, createBufferMcpClient, dateInNewYork, probeBufferCloud } from './cloud-ltc-social.mjs';
import { guardSocialAcceptanceSource } from './cloud-ltc-social-acceptance.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { validateCloudStateConfig } from './cloud-ltc-google-client.mjs';

const check = (value, code) => { if (!value) throw Error(code); };
const hash = value => createHash('sha256').update(value).digest('hex');
const hashJSON = value => hash(JSON.stringify(value));
const plain = value => value && Object.getPrototypeOf(value) === Object.prototype;
const sha = value => /^[a-f0-9]{64}$/.test(value ?? '');
const id = value => /^[a-f0-9]{24}$/.test(value ?? '');
const instant = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const exact = (value, keys) => plain(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const methods = ['get_account', 'list_channels', 'list_posts', 'get_post', 'create_post', 'edit_post'];
const safeURL = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.searchParams.has('token'); } catch { return false; } };

function pausedIdle(value) {
  check(value?.schemaVersion === 1 && value.kind === 'ltc-cloud-social' && value.paused === true && value.lease === null && Number.isSafeInteger(value.fence) && value.fence >= 0 && plain(value.records) && Object.keys(value.records).length > 0 && sha(value.migration?.canonicalSha256) && !Object.hasOwn(value.migration, 'cutoverReceiptSha256') && !value.restoreHold, 'reconciliation_requires_idle_paused_pre_cutover_ledger');
  check(!value.privateDraftAcceptance || value.privateDraftAcceptance.status === 'draft-verified', 'private_draft_reconciliation_required');
  check(!Object.values(value.records).some(record => ['reserved', 'create-uncertain', 'schedule-uncertain', 'uncertain', 'sending'].includes(record.status)), 'social_uncertain_outcome_requires_review');
  check(!value.sentReconciliations || plain(value.sentReconciliations), 'invalid_reconciliation_history');
}

// Excludes provider author/profile data and volatile UI actions/metrics.
export function sentReceipt(post) {
  const channelId = post?.channelId ?? post?.channel?.id;
  check(id(post?.id) && Object.values(BUFFER_TARGET.channels).includes(channelId) && post.status === 'sent' && typeof post.text === 'string' && post.text.length > 0 && post.text.length <= 16000 && instant(post.sentAt) && instant(post.dueAt) && Date.parse(post.sentAt) >= Date.parse(post.dueAt) && Array.isArray(post.assets) && post.assets.length <= 10, 'sent_receipt_unverified');
  const assets = post.assets.map(asset => {
    const url = asset.source ?? asset.url, altText = asset.altText ?? asset.image?.altText ?? null;
    check(safeURL(url) && (altText === null || typeof altText === 'string'), 'sent_media_unverified');
    return { url, altText, type: asset.type ?? null, mimeType: asset.mimeType ?? null };
  });
  return { postId: post.id, channelId, status: 'sent', text: post.text, dueAt: new Date(post.dueAt).toISOString(), sentAt: new Date(post.sentAt).toISOString(), assets };
}

function sourceEvents(record, receipt) {
  const urls = [...(record.sourceUrls ?? []), ...(record.sourceUrl ? [record.sourceUrl] : []), ...(receipt.text.match(/https:\/\/[^\s]+/g) ?? [])].map(url => url.replace(/[).,]+$/, ''));
  check(urls.every(safeURL), 'canonical_source_unverified');
  return [...new Set(urls.map(hash))].sort();
}

export function planPausedSentReconciliation({ snapshot, canonical, evidence, observedAt, historicalMediaEvidence = [] }) {
  check(typeof snapshot?.version === 'string' && snapshot.version.length > 0 && typeof snapshot.documentId === 'string' && instant(observedAt), 'reconciliation_snapshot_required');
  const value = snapshot.value; pausedIdle(value);
  check(canonical?.schemaVersion === 1 && canonical.timezone === 'America/New_York' && Array.isArray(canonical.posts) && canonical.posts.length <= 5000, 'canonical_ledger_required');
  check(Array.isArray(evidence) && evidence.length > 0 && evidence.length <= 100, 'bounded_sent_evidence_required');
  check(Array.isArray(historicalMediaEvidence) && historicalMediaEvidence.length <= 10 && historicalMediaEvidence.every(e => exact(e, ['sourcePath', 'rawJson']) && typeof e.sourcePath === 'string' && typeof e.rawJson === 'string' && Buffer.byteLength(e.rawJson) <= 500000), 'historical_media_evidence_invalid');
  const receipts = evidence.map(sentReceipt).sort((a, b) => a.postId.localeCompare(b.postId));
  check(new Set(receipts.map(p => p.postId)).size === receipts.length, 'duplicate_sent_identity');
  const records = Object.values(value.records), linked = records.map(r => r.postId).filter(Boolean);
  check(new Set(linked).size === linked.length && linked.every(id), 'duplicate_ledger_identity');
  const changes = receipts.map(receipt => {
    check(Date.parse(receipt.sentAt) <= Date.parse(observedAt), 'future_sent_receipt');
    const matches = canonical.posts.filter(p => p.bufferPostId === receipt.postId);
    check(matches.length === 1, 'canonical_identity_missing_or_ambiguous');
    const original = matches[0], platform = Object.keys(BUFFER_TARGET.channels).find(p => BUFFER_TARGET.channels[p] === receipt.channelId);
    // Early imports used a hash of the entire canonical record as their key.
    // Preserve that known cloud key by exact unique provider ID, never rehash a
    // subsequently updated canonical record or invent a key for an unknown ID.
    const key = original.key ?? records.find(r => r.postId === receipt.postId)?.key;
    if (original.key) check(canonical.posts.filter(p => p.key === original.key).length === 1, 'canonical_key_collision');
    const date = original.date ?? (instant(original.dueAt) ? dateInNewYork(original.dueAt) : null);
    check(/^[a-zA-Z0-9][a-zA-Z0-9:_.-]{0,199}$/.test(key ?? '') && original.platform === platform && (!original.channelId || original.channelId === receipt.channelId) && (original.text ?? original.copy) === receipt.text && instant(original.dueAt) && Date.parse(original.dueAt) === Date.parse(receipt.dueAt) && date === dateInNewYork(receipt.dueAt) && ['scheduled', 'scheduled-verified', 'sent', 'published'].includes(original.status), 'canonical_sent_binding_mismatch');
    if (original.textSha256) check(original.textSha256 === hash(receipt.text), 'canonical_copy_hash_mismatch');
    let mediaEvidenceSha256 = null;
    if (original.assetUrl && !receipt.assets.some(a => a.url === original.assetUrl && (!original.altText || a.altText === original.altText))) {
      // Some legacy canonical records retained an old alt-text field after a
      // verified edit. Accept only the original referenced readback file, bound
      // into the reviewed input, whose exact identity/copy/time/media match now.
      const archives = historicalMediaEvidence.filter(e => e.sourcePath === original.queueReceipt);
      check(archives.length === 1, 'canonical_media_mismatch');
      const archived = JSON.parse(archives[0].rawJson);
      check(Array.isArray(archived), 'historical_media_evidence_invalid');
      const matches = archived.filter(p => p.id === receipt.postId);
      check(matches.length === 1 && ['scheduled', 'sent'].includes(matches[0].status), 'historical_media_evidence_invalid');
      const prior = sentReceipt({ ...matches[0], status: 'sent', sentAt: receipt.sentAt });
      check(hashJSON(prior) === hashJSON(receipt), 'historical_media_evidence_mismatch');
      mediaEvidenceSha256 = hash(archives[0].rawJson);
    }
    const before = value.records[key] ?? null;
    check(!records.some(r => r.postId === receipt.postId && r.key !== key), 'canonical_key_collision');
    if (before) {
      check(before.key === key && before.postId === receipt.postId && before.platform === platform && before.date === date && Date.parse(before.dueAt) === Date.parse(receipt.dueAt) && ['scheduled', 'scheduled-verified', 'sent', 'published'].includes(before.status), 'existing_receipt_binding_mismatch');
      if (before.contentHash !== hash(receipt.text)) check(original.editHistory?.some(edit => typeof edit.text === 'string' && hash(edit.text) === before.contentHash && edit.textSha256 === before.contentHash && Date.parse(edit.dueAt) === Date.parse(receipt.dueAt)), 'canonical_edit_history_required');
    }
    const kind = /policy/.test(original.type ?? '') ? 'update' : /daily|routine|evergreen-invitation|^owner-authorized-learning-campaign$/.test(original.type ?? '') ? 'invitation' : 'owner-reserved';
    const after = { ...(before ?? { key, platform, date, kind, sourceIds: [...(original.sourceIds ?? []), ...(original.sourceId ? [original.sourceId] : [])] }), status: before?.status === 'published' ? 'published' : 'sent', postId: receipt.postId, contentHash: hash(receipt.text), dueAt: receipt.dueAt, sentAt: receipt.sentAt, sentDate: dateInNewYork(receipt.sentAt), sourceEventKeys: [...new Set([...(before?.sourceEventKeys ?? []), ...sourceEvents(original, receipt)])].sort(), readbackSha256: hashJSON(receipt), deliveryObservation: { status: 'sent', observedAt, provider: 'official-buffer-mcp', publicVerification: 'not-performed', mediaMetadataSha256: hashJSON(receipt.assets) } };
    if (mediaEvidenceSha256) after.deliveryObservation.historicalMediaEvidenceSha256 = mediaEvidenceSha256;
    return { key, before, after, canonicalRecordSha256: hashJSON(original), receipt };
  });
  check(new Set(changes.map(c => c.key)).size === changes.length, 'canonical_key_collision');
  const nextRecords = { ...value.records, ...Object.fromEntries(changes.map(c => [c.key, c.after])) };
  const dates = [...new Set(changes.map(c => c.after.sentDate))].sort();
  const dailyCounts = dates.flatMap(date => Object.keys(BUFFER_TARGET.channels).map(platform => {
    const count = Object.values(nextRecords).filter(r => r.platform === platform && (r.date === date || r.sentDate === date)).length;
    const cap = Math.min(BUFFER_TARGET.maximum[platform], value.policy?.campaign?.[platform === 'x' ? 'maximumXPostsPerDay' : 'maximumInstagramPostsPerDay'] ?? BUFFER_TARGET.maximum[platform]);
    return { date, platform, reservedOrSent: count, cap, exceedsCap: count > cap };
  }));
  return { schemaVersion: 1, purpose: 'paused-social-sent-reconciliation-only', documentId: snapshot.documentId, expectedRevision: snapshot.version, beforeSha256: hashJSON(value), canonicalSha256: hashJSON(canonical), observedAt, fence: value.fence, changes, dailyCounts, bufferWrites: false, activationAllowed: false };
}

function nextState(input, plan) {
  const value = structuredClone(input.snapshot.value), planSha256 = hashJSON(plan);
  for (const change of plan.changes) value.records[change.key] = structuredClone(change.after);
  value.sentReconciliations ??= {};
  check(!Object.hasOwn(value.sentReconciliations, planSha256), 'reconciliation_receipt_collision');
  value.sentReconciliations[planSha256] = { schemaVersion: 1, purpose: plan.purpose, planSha256, beforeSha256: plan.beforeSha256, canonicalSha256: plan.canonicalSha256, observedAt: plan.observedAt, fence: plan.fence, imported: plan.changes.filter(c => !c.before).length, updated: plan.changes.filter(c => c.before).length, priorRecords: Object.fromEntries(plan.changes.filter(c => c.before).map(c => [c.key, c.before])), afterRecordsSha256: hashJSON(plan.changes.map(c => c.after)), bufferWrites: false, activationAllowed: false };
  check(Buffer.byteLength(JSON.stringify(value)) <= 850000, 'social_ledger_capacity_exceeded');
  return value;
}

export async function applyPausedSentReconciliation({ adapter, client, probe, input, plan, now = new Date().toISOString(), clock = () => Date.parse(now), expiresAt = null }) {
  check(hashJSON(planPausedSentReconciliation(input)) === hashJSON(plan), 'reconciliation_plan_mismatch');
  check(instant(now) && Date.parse(now) >= Date.parse(plan.observedAt) && Date.parse(now) - Date.parse(plan.observedAt) <= 86400000, 'reconciliation_evidence_expired');
  check(probe?.identityVerified === true && probe.queueReadComplete === true, 'reconciliation_identity_probe_required');
  const intended = nextState(input, plan), intendedHash = hashJSON(intended), current = await adapter.read('social'); pausedIdle(current.value);
  const result = status => ({ mode: 'reconcile-sent', status, planSha256: hashJSON(plan), imported: plan.changes.filter(c => !c.before).length, updated: plan.changes.filter(c => c.before).length, paused: true, fence: plan.fence, bufferWrites: false, activationAllowed: false });
  if (hashJSON(current.value) === intendedHash) return result('already-applied');
  check(current.version === plan.expectedRevision && hashJSON(current.value) === plan.beforeSha256, 'reconciliation_snapshot_changed');
  // Independently reread every known ID through the read-only client. A list,
  // earlier local receipt or an edited canonical file is not enough to apply.
  for (const change of plan.changes) {
    client.rememberPostId(change.receipt.postId);
    const raw = bufferToolData(await client.callTool('get_post', { postId: change.receipt.postId }));
    check(hashJSON(sentReceipt(raw.post ?? raw)) === hashJSON(change.receipt), 'reconciliation_provider_changed');
  }
  check(clock() >= Date.parse(plan.observedAt) && clock() - Date.parse(plan.observedAt) <= 86400000 && (expiresAt === null || (instant(expiresAt) && clock() < Date.parse(expiresAt))), 'reconciliation_authorization_expired');
  try { await adapter.conditionalWrite('social', intended, current.version); }
  catch (error) {
    // Lost responses and CAS conflicts are read back once, never blindly replayed.
    let saved; try { saved = await adapter.read('social'); } catch { throw Error('reconciliation_write_uncertain'); }
    if (hashJSON(saved.value) === intendedHash) return result('confirmed-after-readback');
    throw Error(error.message === 'state_conflict' ? 'reconciliation_snapshot_changed' : 'reconciliation_write_uncertain');
  }
  let saved; try { saved = await adapter.read('social'); } catch { throw Error('reconciliation_write_uncertain'); }
  check(hashJSON(saved.value) === intendedHash, 'reconciliation_readback_mismatch');
  return result('applied-and-verified');
}

export function validateSentReconciliationPolicy(policy, { env, accepted, config, policySha256, input, plan, now = new Date().toISOString() }) {
  validateCloudStateConfig(config);
  check(config.ledgerKey === 'social' && config.documentId === input.snapshot.documentId, 'separate_social_ledger_required');
  check(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === 'Satnam-Satoshi/Satoshi-Langar' && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_ACTOR_ID === '268053325' && /^\d{1,30}$/.test(env.GITHUB_RUN_ID ?? '') && /^\d{1,6}$/.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'founder_manual_actions_required');
  check(sha(policySha256) && env.LTC_SOCIAL_RECONCILIATION_POLICY_SHA256 === policySha256, 'reconciliation_owner_policy_required');
  check(exact(policy, ['schemaVersion', 'purpose', 'ownerId', 'source', 'implementationSha256', 'documentId', 'folderId', 'inputSha256', 'planSha256', 'acceptedSchemaHashes', 'expiresAt']) && policy.schemaVersion === 1 && policy.purpose === plan.purpose && policy.ownerId === 268053325 && policy.source === accepted.source && policy.implementationSha256 === accepted.implementationSha256 && policy.documentId === config.documentId && policy.folderId === config.folderId && policy.inputSha256 === hashJSON(input) && policy.planSha256 === hashJSON(plan) && instant(policy.expiresAt) && Date.parse(policy.expiresAt) > Date.parse(now) && Date.parse(policy.expiresAt) - Date.parse(now) <= 86400000, 'invalid_reconciliation_policy');
  check(exact(policy.acceptedSchemaHashes, methods) && methods.every(m => sha(policy.acceptedSchemaHashes[m])), 'social_schema_acceptance_required');
}

export async function loadGuardedReconciliationInputs({ root, env = process.env, git, paths, computeDigest, readPrivateFile = readFile }) {
  const accepted = await guardSocialAcceptanceSource({ root, env, git, ...(computeDigest ? { computeDigest } : {}) });
  git(['ls-files', '--error-unmatch', 'scripts/cloud-ltc-social-reconcile.mjs']);
  const json = async file => JSON.parse(await readPrivateFile(path.resolve(file), 'utf8'));
  const config = await json(paths.config), input = await json(paths.input), plan = await json(paths.plan);
  const bytes = await readPrivateFile(path.resolve(paths.policy)), policy = JSON.parse(bytes), policySha256 = hash(bytes);
  check(hashJSON(planPausedSentReconciliation(input)) === hashJSON(plan), 'reconciliation_plan_mismatch');
  validateSentReconciliationPolicy(policy, { env, accepted, config, policySha256, input, plan });
  return { config, input, plan, policy };
}

async function main() {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i += 2) { const key = { '--mode': 'mode', '--input': 'input', '--plan': 'plan', '--social-state-config': 'config', '--policy': 'policy', '--receipt': 'receipt' }[args[i]]; check(key && !options[key] && args[i + 1], 'invalid_reconciliation_arguments'); options[key] = args[i + 1]; }
  check(['plan', 'apply'].includes(options.mode) && options.input && options.plan, 'invalid_reconciliation_arguments');
  if (options.mode === 'plan') {
    check(Object.keys(options).length === 3, 'invalid_reconciliation_arguments');
    const input = JSON.parse(await readFile(path.resolve(options.input), 'utf8'));
    const plan = planPausedSentReconciliation(input);
    await writeFile(path.resolve(options.plan), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ mode: 'plan', imported: plan.changes.filter(c => !c.before).length, updated: plan.changes.filter(c => c.before).length, bufferWrites: false, activationAllowed: false })); return;
  }
  check(options.config && options.policy && options.receipt, 'invalid_reconciliation_arguments');
  const root = process.cwd(), git = argv => execFileSync('git', argv, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const { config, input, plan, policy } = await loadGuardedReconciliationInputs({ root, git, paths: options });
  const { stateAdapter: adapter } = await createGoogleStateRuntime({ config });
  const client = createBufferMcpClient({ allowWrites: false });
  const probe = await probeBufferCloud({ client });
  check(methods.every(m => probe.schemaHashes[m] === policy.acceptedSchemaHashes[m]), 'social_schema_probe_mismatch');
  const result = await applyPausedSentReconciliation({ adapter, client, probe, input, plan, clock: Date.now, expiresAt: policy.expiresAt });
  await writeFile(path.resolve(options.receipt), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ mode: result.mode, status: result.status, paused: true, bufferWrites: false, activationAllowed: false }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(() => { console.error('Social receipt reconciliation withheld; inspect private evidence before retrying.'); process.exitCode = 1; });
