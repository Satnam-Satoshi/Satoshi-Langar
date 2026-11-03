import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { BUFFER_TARGET, assertCloudSocialAcceptance } from './cloud-ltc-social.mjs';
import { sentReceipt, planPausedSentReconciliation, applyPausedSentReconciliation, loadGuardedReconciliationInputs, validateSentReconciliationPolicy } from './cloud-ltc-social-reconcile.mjs';

const hash = v => createHash('sha256').update(v).digest('hex');
const h = v => hash(JSON.stringify(v));
const id = i => i.toString(16).padStart(24, '0');
const now = '2026-11-03T18:00:00.000Z';
function fixture() {
  const posts = Array.from({ length: 3 }, (_, i) => ({ id: id(i + 1), channelId: BUFFER_TARGET.channels.x, status: 'sent', text: `Read source ${i}. https://ltcmagazine.org/conversations/litecoin/#topic-${i}`, dueAt: `2026-11-03T1${i}:00:00.000Z`, sentAt: `2026-11-03T1${i}:00:05.000Z`, assets: [{ source: 'https://ltcmagazine.org/brand/ltc-launch-share.png', type: 'image', mimeType: 'image/png', image: { altText: 'Original conceptual graphic.' } }] }));
  const originals = posts.map((p, i) => ({ key: `original-${i}`, platform: 'x', date: '2026-11-03', type: i ? 'owner-authorized-story-handle-campaign' : 'owner-authorized-learning-campaign', status: 'scheduled', bufferPostId: p.id, dueAt: p.dueAt, text: p.text, textSha256: hash(p.text), assetUrl: p.assets[0].source, altText: p.assets[0].image.altText }));
  originals[0].editHistory = [{ text: 'Older reviewed copy', textSha256: hash('Older reviewed copy'), dueAt: posts[0].dueAt }];
  const value = { schemaVersion: 1, kind: 'ltc-cloud-social', paused: true, fence: 0, lease: null, migration: { canonicalSha256: hash('bootstrap') }, policy: { campaign: { maximumXPostsPerDay: 4, maximumInstagramPostsPerDay: 2 } }, records: { 'original-0': { key: 'original-0', platform: 'x', date: originals[0].date, kind: 'invitation', status: 'scheduled', postId: posts[0].id, contentHash: hash('Older reviewed copy'), dueAt: posts[0].dueAt, sourceEventKeys: [hash('prior-event')], sourceIds: [] } }, privateDraftAcceptance: { status: 'draft-verified', postId: id(90), planned: { text: 'Preserve private draft' } } };
  const input = { snapshot: { documentId: 'private_social_document', version: 'v1', value }, canonical: { schemaVersion: 1, timezone: 'America/New_York', posts: originals }, evidence: posts, observedAt: now };
  let stored = structuredClone(value), version = 'v1', writes = 0, reads = 0;
  const adapter = { async read(key) { assert.equal(key, 'social'); reads++; return { value: structuredClone(stored), version }; }, async conditionalWrite(key, next, expected) { assert.equal(key, 'social'); assert.equal(expected, version); writes++; stored = structuredClone(next); version = `v${writes + 1}`; } };
  const calls = [], client = { rememberPostId() {}, async callTool(name, args) { calls.push(name); assert.equal(name, 'get_post'); return { structuredContent: structuredClone(posts.find(p => p.id === args.postId)) }; } };
  return { input, plan: planPausedSentReconciliation(input), adapter, client, probe: { identityVerified: true, queueReadComplete: true }, now, calls, writes: () => writes, reads: () => reads, value: () => structuredClone(stored), mutate: fn => { fn(stored); version = 'concurrent-revision'; } };
}

test('finite reconciliation imports missing sent records, preserves pause/fence/controls/private draft and archives old copy', async () => {
  const f = fixture(), initial = structuredClone(f.input), result = await applyPausedSentReconciliation(f), saved = f.value();
  assert.equal(result.imported, 2); assert.equal(result.updated, 1); assert.equal(result.bufferWrites, false); assert.equal(result.activationAllowed, false); assert.equal(f.writes(), 1);
  for (const field of ['paused', 'fence', 'lease', 'migration', 'policy', 'privateDraftAcceptance']) assert.deepEqual(saved[field], initial.snapshot.value[field]);
  assert.deepEqual(f.input, initial); assert.equal(saved.records['original-0'].status, 'sent'); assert.equal(saved.records['original-0'].contentHash, hash(f.input.evidence[0].text));
  assert.ok(saved.records['original-0'].sourceEventKeys.includes(hash('prior-event')));
  assert.deepEqual(Object.values(saved.sentReconciliations)[0].priorRecords['original-0'], initial.snapshot.value.records['original-0']);
  assert.equal(saved.records['original-1'].deliveryObservation.publicVerification, 'not-performed');
  assert.deepEqual(f.calls, ['get_post', 'get_post', 'get_post']); assert.throws(assertCloudSocialAcceptance, /pending/);
});
test('identical repeat is a no-op with no writes or provider replay', async () => {
  const f = fixture(); await applyPausedSentReconciliation(f); const saved = f.value();
  assert.equal((await applyPausedSentReconciliation(f)).status, 'already-applied'); assert.equal(f.writes(), 1); assert.equal(f.calls.length, 3); assert.deepEqual(f.value(), saved);
});
test('lost write response is reconciled once and never blindly written again', async () => {
  const f = fixture(), write = f.adapter.conditionalWrite;
  f.adapter.conditionalWrite = async (...args) => { await write(...args); throw Error('storage_write_uncertain'); };
  assert.equal((await applyPausedSentReconciliation(f)).status, 'confirmed-after-readback');
  assert.equal((await applyPausedSentReconciliation(f)).status, 'already-applied'); assert.equal(f.writes(), 1);
});
test('unapplied lost response remains uncertain without automatic retry', async () => {
  const f = fixture(); let attempts = 0; f.adapter.conditionalWrite = async () => { attempts++; throw Error('storage_write_uncertain'); };
  await assert.rejects(applyPausedSentReconciliation(f), /write_uncertain/); assert.equal(attempts, 1); assert.deepEqual(f.value(), f.input.snapshot.value);
});
test('readback failure or mismatch never claims successful repair', async () => {
  for (const kind of ['failure', 'mismatch']) {
    const f = fixture(), read = f.adapter.read;
    f.adapter.read = async key => { if (f.writes()) { if (kind === 'failure') throw Error('unavailable'); const r = await read(key); r.value.fence++; return r; } return read(key); };
    await assert.rejects(applyPausedSentReconciliation(f), kind === 'failure' ? /write_uncertain/ : /readback_mismatch/); assert.equal(f.writes(), 1);
  }
});
test('changed revision/state and active or cutover state fail without Buffer calls or writes', async () => {
  for (const change of [v => v.policy.extra = true, v => v.paused = false, v => v.lease = { fence: 1 }, v => v.fence++, v => v.migration.cutoverReceiptSha256 = hash('cutover'), v => v.privateDraftAcceptance.status = 'create-uncertain', v => v.records['original-0'].status = 'create-uncertain', () => {}]) {
    const f = fixture(); f.mutate(change); await assert.rejects(applyPausedSentReconciliation(f)); assert.equal(f.writes(), 0); assert.deepEqual(f.calls, []);
  }
});
test('concurrent writer during provider checks causes CAS conflict without clobbering it', async () => {
  const f = fixture(), call = f.client.callTool; let attempted = 0;
  f.client.callTool = async (...args) => { const r = await call(...args); f.mutate(v => { v.reviewMarker = 'other writer'; }); return r; };
  f.adapter.conditionalWrite = async () => { attempted++; throw Error('state_conflict'); };
  await assert.rejects(applyPausedSentReconciliation(f), /snapshot_changed/); assert.equal(attempted, 1); assert.equal(f.writes(), 0); assert.equal(f.value().reviewMarker, 'other writer');
});
test('duplicate IDs, missing/ambiguous canonical entries and collisions cannot fabricate imports', () => {
  for (const change of [f => f.input.evidence.push(f.input.evidence[0]), f => f.input.canonical.posts.pop(), f => f.input.canonical.posts.push(f.input.canonical.posts[0]), f => f.input.canonical.posts[1].key = 'original-0', f => f.input.canonical.posts[2].key = 'original-1', f => f.input.snapshot.value.records['other-key'] = { ...f.input.snapshot.value.records['original-0'], key: 'other-key' }]) {
    const f = fixture(); change(f); assert.throws(() => planPausedSentReconciliation(f.input));
  }
});
test('changed copy requires hash-matching original edit history; changes to time, asset or identity are refused', () => {
  for (const change of [f => delete f.input.canonical.posts[0].editHistory, f => f.input.canonical.posts[0].editHistory[0].text = 'invented', f => f.input.canonical.posts[0].editHistory[0].dueAt = '2026-11-02T10:00:00Z', f => f.input.canonical.posts[1].text += 'changed', f => f.input.canonical.posts[1].date = '2026-11-02', f => f.input.canonical.posts[1].assetUrl = 'https://example.com/changed.png', f => f.input.evidence[0].channelId = 'personal-channel', f => f.input.evidence[0].sentAt = '2026-11-04T10:00:00Z', f => f.input.evidence[0].status = 'scheduled']) {
    const f = fixture(); change(f); assert.throws(() => planPausedSentReconciliation(f.input));
  }
});
test('later provider changes, partial probe, stale evidence and plan tampering cause zero state writes', async () => {
  for (const change of [f => f.probe.queueReadComplete = false, f => f.probe.identityVerified = false, f => f.now = '2026-11-05T18:00:00Z', f => f.plan.changes[0].after.kind = 'update', f => { f.client.callTool = async () => ({ structuredContent: { ...f.input.evidence[0], text: 'edited after review' } }); }]) {
    const f = fixture(); change(f); await assert.rejects(applyPausedSentReconciliation(f)); assert.equal(f.writes(), 0);
  }
});
test('expiry during slow provider readbacks stops before the conditional write', async () => {
  const f = fixture(); f.clock = () => Date.parse('2026-11-03T19:00:00Z'); f.expiresAt = '2026-11-03T18:30:00Z';
  await assert.rejects(applyPausedSentReconciliation(f), /authorization_expired/); assert.equal(f.writes(), 0);
});
test('over-cap history is preserved and reported without increasing the cap; New York sent dates survive delayed delivery', async () => {
  const f = fixture(); f.input.snapshot.value.policy.campaign.maximumXPostsPerDay = 2;
  f.input.evidence[2].sentAt = '2026-11-04T05:00:05Z'; f.input.observedAt = '2026-11-04T06:00:00Z';
  f.plan = planPausedSentReconciliation(f.input); f.now = f.input.observedAt;
  assert.equal(f.plan.changes[2].after.sentDate, '2026-11-04');
  assert.deepEqual(f.plan.dailyCounts.filter(d => d.platform === 'x').map(d => [d.date, d.reservedOrSent, d.cap, d.exceedsCap]), [['2026-11-03', 3, 2, true], ['2026-11-04', 1, 2, false]]);
});
test('sent projection excludes provider personal metadata and does not claim public inspection or downloaded media', () => {
  const f = fixture(), p = f.input.evidence[0]; p.author = { email: 'private@example.invalid' }; p.externalLink = 'https://x.com/example/status/123';
  const receipt = sentReceipt(p); assert.equal(receipt.author, undefined); assert.equal(receipt.externalLink, undefined); assert.equal(receipt.mediaSha256, undefined);
});
test('changed source/gates stop before private input reads or credential-owning providers', async () => {
  let reads = 0; const env = { LTC_CLOUD_PUBLISH: 'false', LTC_ACCEPTED_IMPLEMENTATION_SHA256: hash('code') };
  const args = { root: '/reviewed', paths: {}, git: argv => argv[0] === 'rev-parse' ? 'a'.repeat(40) : '', computeDigest: async () => hash('code'), readPrivateFile: async () => { reads++; throw Error('must not read'); } };
  for (const changed of [{ ...env, LTC_CLOUD_PUBLISH: 'true' }, { ...env, LTC_SOCIAL_PUBLISH: 'true' }, { ...env, LTC_ACCEPTED_IMPLEMENTATION_SHA256: hash('other') }]) await assert.rejects(loadGuardedReconciliationInputs({ ...args, env: changed }));
  assert.equal(reads, 0);
});
test('policy pins exact source, input, plan, social resource, founder manual context and short expiry', () => {
  const f = fixture(); const config = { schemaVersion: 1, provider: 'google-docs', publicationEnabled: false, folderId: 'private_folder', documentId: f.input.snapshot.documentId, ledgerKey: 'social' };
  const accepted = { source: 'a'.repeat(40), implementationSha256: hash('code') }, policySha256 = hash('protected-policy');
  const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Satnam-Satoshi/Satoshi-Langar', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_ACTOR_ID: '268053325', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', LTC_SOCIAL_RECONCILIATION_POLICY_SHA256: policySha256 };
  const policy = { schemaVersion: 1, purpose: f.plan.purpose, ownerId: 268053325, ...accepted, documentId: config.documentId, folderId: config.folderId, inputSha256: h(f.input), planSha256: h(f.plan), acceptedSchemaHashes: Object.fromEntries(['get_account', 'list_channels', 'list_posts', 'get_post', 'create_post', 'edit_post'].map(m => [m, hash(m)])), expiresAt: '2026-11-03T19:00:00Z' };
  const context = { ...f, env, config, accepted, policySha256 }; validateSentReconciliationPolicy(policy, context);
  for (const mutate of [p => p.source = 'b'.repeat(40), p => p.planSha256 = hash('other'), p => p.inputSha256 = hash('other'), p => p.documentId = 'website_doc', p => p.expiresAt = now, p => p.expiresAt = '2026-11-06T19:00:00Z', p => p.extra = true, p => delete p.acceptedSchemaHashes.get_post]) { const altered = structuredClone(policy); mutate(altered); assert.throws(() => validateSentReconciliationPolicy(altered, context)); }
  for (const altered of [{ ...env, GITHUB_ACTOR_ID: 'other' }, { ...env, GITHUB_EVENT_NAME: 'schedule' }, { ...env, LTC_SOCIAL_RECONCILIATION_POLICY_SHA256: hash('other') }]) assert.throws(() => validateSentReconciliationPolicy(policy, { ...context, env: altered }));
  assert.throws(() => validateSentReconciliationPolicy(policy, { ...context, config: { ...config, ledgerKey: 'website' } }));
});
test('controller has no scheduling/unpause APIs and every Buffer invocation is read-only', async () => {
  const source = await readFile(new URL('./cloud-ltc-social-reconcile.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /allowWrites:\s*true|\.setPaused\(|\.acquire\(|callTool\(['"](?:create_post|edit_post)/);
  assert.match(source, /createBufferMcpClient\(\{ allowWrites: false \}\)/);
});
