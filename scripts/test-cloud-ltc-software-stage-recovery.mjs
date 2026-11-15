import test from 'node:test';
import assert from 'node:assert/strict';
import { softwareRecoveryFixture } from './lib/test-software-recovery-fixture.mjs';
import { continueReviewedSoftwareStage } from './cloud-ltc-software-stage-recovery.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { softwareRecoveryHash as hash } from './cloud-ltc-software-stage-recovery-policy.mjs';
import { createDurableVercelCommand } from './cloud-ltc-promotion-runtime.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
import { assertFreshGenerationAdmission, captureFreshGenerationBinding } from './cloud-ltc-generation.mjs';
import { publicationDate, assertDailyPublicationAvailable, DailyPublicationComplete } from './cloud-ltc-daily-admission.mjs';
async function fixture(fault = '') {
 const f = softwareRecoveryFixture(); let now = f.now;
 const adapter = new MemoryStateAdapter(); await adapter.conditionalWrite('website', f.document, null);
 const state = new DurableCloudState(adapter, 'website', { clock: () => now });
 let pointer = f.review.previousDeployment; const events = [], saved = [];
 const candidateUrl = 'fixture-candidate.vercel.app';
 const identity = id => ({ id, url: id === f.review.candidateDeployment ? candidateUrl : 'fixture-old.vercel.app', projectId: TARGET.project, ownerId: TARGET.team, team: { id: TARGET.team }, target: 'production', readyState: 'READY', meta: { ltcSourceCommit: f.review.artifactSource } });
 const vercel = async endpoint => identity(TARGET.domains.some(domain => endpoint.endsWith(new URL(domain).hostname)) ? pointer : endpoint.split('/').at(-1));
 const d = {
  now: () => now, save: async value => { saved.push(structuredClone(value)); }, github: async () => f.originRun,
  restore: async () => Object.fromEntries(['originalReview','originalContext','manifest','buildOutput','changedPaths','previousManifest'].map(k => [k, f[k]])),
  verifyControllerAndPolicy: async () => { events.push('controller'); if (fault === 'controller-after-claim' && (await state.inspect()).fence > 27) throw Error('controller_changed'); },
  verifyProjectAndPointers: async () => { assert.equal(pointer, f.review.previousDeployment); events.push('old-pointers'); },
  verifyProtectedCandidate: async () => { events.push('full-existing-readback'); if (fault === 'protected') throw Error('byte_mismatch'); return { kind: 'vercel-stage', deployment: f.review.candidateDeployment, url: candidateUrl, source: f.review.artifactSource, buildOutputSha256: f.review.buildOutputSha256, artifactManifestSha256: f.review.artifactManifestSha256 }; },
  verifyPublic: async manifest => { const fresh = hash(manifest) === f.review.artifactManifestSha256; events.push(fresh ? 'new-public' : 'old-public'); if (fresh && fault === 'public') throw Error('public_mismatch'); },
  verifyProtected: async () => { throw Error('no second stage readback'); }, vercel,
  createMutation: options => createDurableVercelCommand({ ...options, env: { VERCEL_TOKEN: 'fixture-token-private' }, vercel, fetchImpl: async url => { events.push(url.includes('/promote/') ? 'promote' : 'rollback'); pointer = url.split('/').at(-1).split('?')[0]; if (fault === 'uncertain-promote') { pointer = 'dpl_Unknown'; throw Error('lost_ack'); } return new Response(null, { status: 204 }); } }),
  evidenceConfig: { folderId: f.review.bindings.folderId, ownerPermissionId: f.review.bindings.ownerPermissionId },
  allocate: async () => { events.push('allocate-summary'); return ['fixture_new_summary']; }, token: async () => 'fixture-token',
  providerFactory: ({ bundle, config }) => { let stored; return {
   apply: async context => { events.push('summary'); if (fault === 'summary') throw Error('lost_summary'); stored = { operationId: context.operationId, payloadSha256: context.payloadSha256, status: 'applied', proof: { fileId: config.fileId, folderId: config.folderId, sha256: bundle.sha256, length: bundle.length, ownerPermissionId: f.review.bindings.ownerPermissionId, ownerOnly: true, downloadVerified: true } }; },
   readback: async () => stored,
  }; },
 };
 return { ...f, state, d, events, saved, setNow: value => { now = value; }, run: () => continueReviewedSoftwareStage({ env: f.env, review: f.review, state, dependencies: d }) };
}
test('existing software stage uses one new fence and one promotion, no build/upload-stage; daily checkpoint retained', async () => {
 const f = await fixture(), before = structuredClone(f.document), result = await f.run(), final = await f.state.inspect();
 assert.equal(result.published, true); assert.equal(result.dailyPublished, false); assert.equal(result.stageReissued, false);
 assert.equal(final.fence, 28); assert.equal(final.lease, null); assert.equal(final.paused, false);
 assert.equal(final.latestRelease.verifiedAt, before.latestRelease.verifiedAt); assert.equal(final.latestRelease.editionId, before.latestRelease.editionId); assert.deepEqual(final.latestRelease.publicationProvenance, before.latestRelease.publicationProvenance);
 assert.equal(final.latestRelease.deployment, f.review.candidateDeployment); assert(final.latestRelease.softwareVerifiedAt);
 assert.equal(final.softwareStageRecovery.status, 'completed'); assert.deepEqual(final.softwareStageRecovery.originalStageIntent, before.intents[f.review.stageOperationId]); assert.deepEqual(final.softwareStageRecovery.originalLease, before.lease);
 assert.deepEqual(f.events.filter(x => ['promote','rollback','summary','allocate-summary'].includes(x)), ['promote','allocate-summary','summary']);
 const claim = f.saved.find(x => x.status === 'claiming-software-recovery-fence'); assert.equal(claim.fence, 28);
 assert.equal(Object.keys(final.intents).length, 1);
 await assert.rejects(f.run, /software_recovery_snapshot_changed/); assert.equal(f.events.filter(x => x === 'promote').length, 1);
});
test('preflight proof failure, changed snapshot and expired new review leave original journal byte-identical', async () => {
 for (const fault of ['protected','snapshot','expiry']) {
  const f = await fixture(fault), before = await f.state.backup();
  if (fault === 'snapshot') f.review.snapshotSha256 = '0'.repeat(64);
  if (fault === 'expiry') f.setNow(Date.parse(f.review.expiresAt));
  await assert.rejects(f.run); assert.deepEqual(await f.state.backup(), before); assert(!f.events.includes('promote'));
 }
});
test('one exact claim CAS rejects concurrent journal change without reconciling or claiming stale state', async () => {
 const f = await fixture(), original = f.d.verifyProtectedCandidate;
 f.d.verifyProtectedCandidate = async args => { const proof = await original(args); await f.state.setPaused(true); return proof; };
 await assert.rejects(f.run); const state = await f.state.inspect();
 assert.equal(state.fence, 27); assert.equal(state.intents[f.review.stageOperationId].status, 'uncertain'); assert.equal(state.softwareStageRecovery, undefined); assert(!f.events.includes('promote'));
});
test('post-claim control failure holds the new owner, preserves original stage fence and forbids a POST', async () => {
 const f = await fixture('controller-after-claim'); await assert.rejects(f.run);
 const final = await f.state.inspect(); assert.equal(final.fence, 28); assert.equal(final.paused, true); assert.equal(final.softwareStageRecovery.status, 'held'); assert.equal(final.lease.fence, 28);
 assert.equal(final.intents[f.review.stageOperationId].fence, 27); assert.equal(final.intents[f.review.stageOperationId].status, 'confirmed'); assert(!f.events.includes('promote'));
});
test('confirmed promotion/public failure performs one separate rollback and holds, not a new stage', async () => {
 const f = await fixture('public'); await assert.rejects(f.run); assert.deepEqual(f.events.filter(x => ['promote','rollback'].includes(x)), ['promote','rollback']);
 const final = await f.state.inspect(); assert.equal(final.paused, true); assert.deepEqual(final.latestRelease, f.document.latestRelease); assert.equal(final.softwareStageRecovery.status, 'held');
});
test('uncertain promotion or final summary never repeats mutation or releases recovery lease', async () => {
 for (const fault of ['uncertain-promote','summary']) {
  const f = await fixture(fault); await assert.rejects(f.run);
  const final = await f.state.inspect(); assert.equal(final.paused, true); assert(final.lease); assert.equal(final.softwareStageRecovery.status, 'held'); assert.equal(f.events.filter(x => x === 'promote').length, 1); assert(!f.events.includes('rollback'));
  assert(Object.values(final.intents).some(x => x.status === 'uncertain'));
 }
});
test('pre-existing paused state is restored after successful reviewed software recovery', async () => {
 const f = await fixture(); f.document.paused = true; f.review.originalPaused = true; f.review.snapshotSha256 = hash(f.document); f.env.LTC_SOFTWARE_STAGE_RECOVERY_REVIEW_SHA256 = hash(f.review);
 const snap = await f.state.adapter.read('website'); await f.state.adapter.conditionalWrite('website', f.document, snap.version);
 await f.run(); assert.equal((await f.state.inspect()).paused, true);
});

test('review expiry while saving claim status prevents the claim CAS itself', async () => {
 const f = await fixture(), before = await f.state.backup(), save = f.d.save;
 f.d.save = async value => { await save(value); if (value.status === 'claiming-software-recovery-fence') f.setNow(Date.parse(f.review.expiresAt)); };
 await assert.rejects(f.run, /software_recovery_review_expired/); assert.deepEqual(await f.state.backup(), before); assert(!f.events.includes('promote'));
});
test('restored reserved fields cannot override reviewed policy scope', async () => {
 const f = await fixture(), restore = f.d.restore;
 f.d.restore = async () => ({ ...await restore(), env: {}, document: {}, review: {}, originRun: {} });
 const result = await f.run(); assert.equal(result.published, true);
});
test('real quarantine/first-fresh historical fixture stays byte-identical through software recovery', async () => {
 const { checkpointRecoveryFixture } = await import('./lib/test-checkpoint-recovery-fixture.mjs');
 const { recoverPromotedCheckpoint } = await import('./cloud-ltc-checkpoint-recovery.mjs');
 const { acceptFirstFreshGeneration } = await import('./cloud-ltc-generation.mjs');
 const old = await checkpointRecoveryFixture(); await recoverPromotedCheckpoint(old); const history = await old.state.inspect(); acceptFirstFreshGeneration(history, { env: old.env });
 const f = await fixture();
 const keys = ['unresolvedSetupIncident','retiredSetupIncidents','stagedDailyRetirement','uploadFailureQuarantine','checkpointRecovery','nextFreshGeneration'];
 for (const key of keys) if (Object.hasOwn(history, key)) f.document[key] = structuredClone(history[key]);
 f.review.snapshotSha256 = hash(f.document); f.env.LTC_SOFTWARE_STAGE_RECOVERY_REVIEW_SHA256 = hash(f.review);
 f.env.LTC_UPLOAD_QUARANTINE_COMPLETION_SHA256 = history.uploadFailureQuarantine.completionSha256;
 const snapshot = await f.state.adapter.read('website'); await f.state.adapter.conditionalWrite('website', f.document, snapshot.version);
 const before = await f.state.backup(), pin = f.env.LTC_UPLOAD_QUARANTINE_COMPLETION_SHA256;
 f.env.LTC_UPLOAD_QUARANTINE_COMPLETION_SHA256 = '0'.repeat(64); await assert.rejects(f.run, /upload_quarantine_independent_acceptance_required/); assert.deepEqual(await f.state.backup(), before);
 f.env.LTC_UPLOAD_QUARANTINE_COMPLETION_SHA256 = pin; await f.run(); const completed = await f.state.inspect();
 for (const key of keys) assert.deepEqual(completed[key], f.document[key]); assert.equal(completed.lease, null);
 // Exactly the existing scheduled-admission predicates, not a special recovery
 // exemption. The software timestamp must not consume this next daily date.
 const scheduledEnv = { ...f.env, GITHUB_EVENT_NAME: 'schedule' }, date = publicationDate(f.now);
 assert.throws(() => assertDailyPublicationAvailable(completed, publicationDate(Date.parse(f.document.latestRelease.verifiedAt))), DailyPublicationComplete);
 const dailyLease = await f.state.acquire('gha-900003-1', 3600000, value => {
   assertFreshGenerationAdmission(value, { env: scheduledEnv, now: f.now });
   assert.equal(captureFreshGenerationBinding(value), null);
   assertDailyPublicationAvailable(value, date);
 }, date);
 assert.equal(dailyLease.fence, 29); assert.equal(dailyLease.publicationDate, date);
});
