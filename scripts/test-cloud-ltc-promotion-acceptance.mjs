import test from 'node:test';
import assert from 'node:assert/strict';
import { promotionFixture } from './lib/test-promotion-acceptance-fixture.mjs';
import { validatePromotionRollbackReceipt } from './cloud-ltc-migration-gate.mjs';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { runControlledPromotionRollback, reconcileControlledPromotionRollback, completeControlledRollback, validateControlledPromotionReview } from './cloud-ltc-promotion-acceptance.mjs';
import { createControlledVercelMutation } from './cloud-ltc-promotion-runtime.mjs';
import { TARGET } from './cloud-ltc-release.mjs';

test('controlled proof promotes once, verifies candidate, rolls back once, verifies old bytes and retains original UNKNOWN', async () => {
  const f = await promotionFixture(), result = await runControlledPromotionRollback(f); assert.equal(result.status, 'promotion-rollback-verified'); assert.equal(result.productionAuthorized, false);
  assert.deepEqual(f.events.filter(value => ['promote', 'rollback', 'public:candidate'].includes(value)), ['promote', 'public:candidate', 'rollback']);
  const doc = await f.state.inspect(); assert.equal(doc.paused, true); assert.equal(doc.lease, null); assert.equal(doc.fence, 4); assert.equal(doc.promotionAcceptance.status, 'completed'); assert.equal(doc.promotionAcceptance.completionSha256, result.completionSha256); assert.equal(hash(doc.retiredSetupIncidents[f.pins.setupIncidentSha256]), f.pins.setupIncidentSha256); assert.equal(doc.unresolvedSetupIncident.outcome, 'UNKNOWN'); assert.equal(doc.promotionAcceptance.completion.candidatePublicVerified, true);
  assert.equal(validatePromotionRollbackReceipt({ document: doc, pins: { stagePins: f.pins, reviewSha256: hash(f.review), completionSha256: result.completionSha256, completionControllerImplementationSha256: f.env.LTC_ACCEPTED_IMPLEMENTATION_SHA256, currentControllerImplementationSha256: f.env.LTC_ACCEPTED_IMPLEMENTATION_SHA256, setupIncidentSha256: f.pins.setupIncidentSha256 }, currentControllerImplementationSha256: f.env.LTC_ACCEPTED_IMPLEMENTATION_SHA256 }).promotionRollbackVerified, true);
  await assert.rejects(runControlledPromotionRollback(f)); assert.equal(f.events.filter(value => value === 'promote').length, 1);
});
test('missing founder policy/pins or automatic activation context cannot authorize either effect', async () => {
  const f = await promotionFixture();
  for (const changed of [{ GITHUB_ACTOR_ID: '222' }, { GITHUB_EVENT_NAME: 'schedule' }, { GITHUB_REF: 'refs/heads/other' }, { LTC_CLOUD_PUBLISH: 'true' }, { LTC_CONTROLLED_PROMOTION_REVIEW_SHA256: '0'.repeat(64) }]) assert.throws(() => validateControlledPromotionReview({ ...f, env: { ...f.env, ...changed }, mode: 'exercise' }));
  for (const changed of [{ approved: false }, { rollbackRequired: false }, { temporaryPublicExposureApproved: false }, { allProjectProductionAliasesApproved: false }, { productionAuthorized: true }, { retainedIncident: null }]) {
    const review = { ...f.review, ...changed }, env = { ...f.env, LTC_CONTROLLED_PROMOTION_REVIEW_SHA256: hash(review) }; await assert.rejects(runControlledPromotionRollback({ ...f, review, env }));
  }
  assert.equal(f.events.includes('promote'), false); assert.equal((await f.state.inspect()).lease, null);
});
test('uncertain promotion holds without rollback or retry; separate reconciliation never reissues effects', async () => {
  const f = await promotionFixture(); f.flags.lostPromotion = true; await assert.rejects(runControlledPromotionRollback(f), /operation_outcome_uncertain/); assert.equal(f.pointer(), 'dpl_Candidate'); assert.equal(f.events.includes('rollback'), false);
  const result = await reconcileControlledPromotionRollback({ ...f, env: { ...f.env, GITHUB_RUN_ID: '126' }, expectedFence: 4 }); assert.equal(result.status, 'manual-rollback-required'); assert.equal(result.effectsReissued, false); assert.equal(f.events.filter(value => value === 'promote').length, 1); assert.equal(f.events.includes('rollback'), false); assert.equal((await f.state.inspect()).paused, true); assert.ok((await f.state.inspect()).lease);
});
test('lost rollback response reconciles old pointers without a second rollback', async () => {
  const f = await promotionFixture(); f.flags.lostRollback = true; await assert.rejects(runControlledPromotionRollback(f), /operation_outcome_uncertain/);
  const result = await reconcileControlledPromotionRollback({ ...f, env: { ...f.env, GITHUB_RUN_ID: '126' }, expectedFence: 4 }); assert.equal(result.status, 'promotion-rollback-verified'); assert.equal(f.events.filter(value => value === 'rollback').length, 1); assert.equal((await f.state.inspect()).lease, null);
});
test('pending rollback requires separate explicit owner continuation and executes only once after reconciliation', async () => {
  const f = await promotionFixture(); f.flags.lostPromotion = true; await assert.rejects(runControlledPromotionRollback(f));
  await reconcileControlledPromotionRollback({ ...f, env: { ...f.env, GITHUB_RUN_ID: '126' }, expectedFence: 4 });
  const review = { ...f.review, action: 'complete-rollback-only', baseReviewSha256: hash(f.review), approvalId: 'explicit-rollback-2' }, env = { ...f.env, GITHUB_RUN_ID: '127', LTC_CONTROLLED_PROMOTION_REVIEW_SHA256: hash(review) };
  const result = await completeControlledRollback({ ...f, review, env, expectedFence: 4 }); assert.equal(result.status, 'promotion-rollback-verified'); assert.equal(f.pointer(), 'dpl_Fixture'); assert.equal(f.events.filter(value => value === 'promote').length, 1); assert.equal(f.events.filter(value => value === 'rollback').length, 1);
  const doc = await f.state.inspect(); assert.equal(doc.promotionAcceptance.completion.continuationReviewSha256, hash(review)); assert.equal(doc.promotionAcceptance.completion.completedBy.runId, '127'); assert.equal(Object.keys(doc.promotionAcceptance.operations).length, 2); assert.equal(doc.unresolvedSetupIncident.outcome, 'UNKNOWN');
  await assert.rejects(completeControlledRollback({ ...f, review, env, expectedFence: 4 }));
});
test('approved recovery controller may change while original tested artifact/source remain pinned', async () => {
  const f = await promotionFixture(); f.flags.lostRollback = true; await assert.rejects(runControlledPromotionRollback(f));
  const review = structuredClone(f.review); review.baseReviewSha256 = hash(f.review); review.controllerImplementationSha256 = 'e'.repeat(64); review.stagePins.currentControllerImplementationSha256 = review.controllerImplementationSha256;
  const env = { ...f.env, GITHUB_RUN_ID: '126', LTC_ACCEPTED_IMPLEMENTATION_SHA256: review.controllerImplementationSha256, LTC_CONTROLLED_PROMOTION_REVIEW_SHA256: hash(review) };
  const result = await reconcileControlledPromotionRollback({ ...f, review, env, expectedFence: 4 }); assert.equal(result.status, 'promotion-rollback-verified');
  const doc = await f.state.inspect(); assert.equal(doc.promotionAcceptance.completion.controllerImplementationSha256, 'e'.repeat(64)); assert.equal(doc.promotionAcceptance.completion.reconciliationReviewSha256, hash(review)); assert.equal(doc.promotionAcceptance.stageSnapshot.acceptance.plan.implementationSha256, 'b'.repeat(64)); assert.equal(f.events.filter(value => value === 'rollback').length, 1);
});
test('confirmed promotion with bad candidate bytes still uses approved rollback but cannot produce an acceptance proof', async () => {
  const f = await promotionFixture(); f.flags.badCandidateBytes = true; const result = await runControlledPromotionRollback(f); assert.equal(result.status, 'rollback-restored-unaccepted'); assert.equal(f.pointer(), 'dpl_Fixture'); assert.equal((await f.state.inspect()).promotionAcceptance.completion.candidatePublicVerified, false);
});
test('exact original job completion and original fence are required for effect-free recovery', async () => {
  const f = await promotionFixture(); f.flags.lostPromotion = true; await assert.rejects(runControlledPromotionRollback(f)); f.flags.originRunning = true;
  await assert.rejects(reconcileControlledPromotionRollback({ ...f, env: { ...f.env, GITHUB_RUN_ID: '126' }, expectedFence: 4 }), /promotion_origin_not_completed/);
  f.flags.originRunning = false; await assert.rejects(reconcileControlledPromotionRollback({ ...f, env: { ...f.env, GITHUB_RUN_ID: '126' }, expectedFence: 5 }), /promotion_recovery_context_required/); assert.equal(f.events.filter(value => value === 'promote').length, 1);
});
test('official project-scoped bridge accepts only exact candidate promote and previous rollback endpoints', async () => {
  const f = await promotionFixture(), token = 'fixture-project-scoped-token', calls = [];
  const mutate = createControlledVercelMutation({ env: { VERCEL_TOKEN: token }, review: f.review, fetchImpl: async (url, options) => { calls.push({ url, options }); return new Response(null, { status: 202 }); } });
  const context = { candidate: 'dpl_Candidate', candidateUrl: 'fixture-candidate.vercel.app', previous: 'dpl_Fixture' };
  await mutate(['promote', 'https://fixture-candidate.vercel.app', '--yes'], context); await mutate(['rollback', 'dpl_Fixture', '--non-interactive'], context);
  assert.deepEqual(calls.map(call => call.url), [`https://api.vercel.com/v10/projects/${TARGET.project}/promote/dpl_Candidate?teamId=${TARGET.team}`, `https://api.vercel.com/v9/projects/${TARGET.project}/rollback/dpl_Fixture?teamId=${TARGET.team}`]);
  for (const call of calls) { assert.equal(call.options.method, 'POST'); assert.equal(call.options.redirect, 'error'); assert.equal(call.options.body, '{}'); assert.equal(call.options.headers.Authorization, `Bearer ${token}`); }
  await assert.rejects(mutate(['deploy', '--prod'], context), /controlled_vercel_action_forbidden/); await assert.rejects(mutate(['rollback', 'dpl_Other', '--non-interactive'], context)); assert.equal(calls.length, 2);
});
