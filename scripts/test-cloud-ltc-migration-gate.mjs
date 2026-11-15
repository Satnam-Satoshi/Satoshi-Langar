import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { stageReceiptFixture } from './lib/test-acceptance-proof-fixture.mjs';
import { validatePromotionRollbackReceipt as validate, assertReviewedMigrationAcceptance as gate } from './cloud-ltc-migration-gate.mjs';
import { assertSetupIncidentsForProduction } from './cloud-ltc-setup-quarantine.mjs';

function fixture({ withIncident = true } = {}) {
  const stage = stageReceiptFixture({ withIncident }), stagePins = structuredClone(stage.pins), stageSnapshot = structuredClone(stage.document), plan = stageSnapshot.acceptance.plan;
  const review = { schemaVersion: 1, kind: 'founder-approved-controlled-promotion-rollback', approved: true, actorId: '268053325', approvalId: 'fixture-promotion', approvedAt: '2026-10-30T12:00:00Z', controllerImplementationSha256: stage.currentControllerImplementationSha256, action: 'exercise', allProjectProductionAliasesApproved: true, temporaryPublicExposureApproved: true, rollbackRequired: true, productionAuthorized: false, allowReadOnlyReconciliation: true, stagePins: structuredClone(stagePins), retainedIncident: withIncident ? { sha256: stagePins.setupIncidentSha256, originalOutcome: 'UNKNOWN', accepted: false, productionAuthorized: false, allowedAction: 'controlled-promotion-rollback' } : null };
  const reviewSha256 = hash(review), origin = { runId: '200', attempt: '1' }, runId = 'promote-200-1', fence = stagePins.fence + 1;
  const record = { schemaVersion: 1, status: 'completed', review, reviewSha256, stageSnapshot, stageSnapshotSha256: hash(stageSnapshot), candidateUrl: 'fixture-candidate.vercel.app', origin, runId, fence, observations: { candidatePublicVerified: true }, operations: {}, receipts: {} };
  const common = { artifactPackageManifestSha256: plan.artifactPackageManifestSha256, controlledReviewSha256: reviewSha256, stagePlanSha256: stagePins.planSha256 };
  const operations = [
    { operationId: `promote-proof-${reviewSha256.slice(0, 24)}`, payload: { ...common, kind: 'vercel-promote', editionId: plan.editionId, artifactManifestSha256: plan.staticManifestSha256, deployment: stagePins.candidateDeployment, previous: plan.previousDeployment, commit: plan.source } },
    { operationId: `rollback-proof-${reviewSha256.slice(0, 24)}`, payload: { ...common, kind: 'vercel-rollback', failed: stagePins.candidateDeployment, restore: plan.previousDeployment, commit: plan.source, previousManifestSha256: plan.previousPublicManifestSha256 } },
  ];
  const document = structuredClone(stage.document); document.fence = fence;
  for (const [index, operation] of operations.entries()) {
    const deployment = index === 0 ? stagePins.candidateDeployment : stagePins.previousDeployment;
    const pointers = stagePins.bindings.domains.map(domain => ({ domain, deployment }));
    const leaf = index === 0 ? { kind: 'vercel-promote', pointers, previous: stagePins.previousDeployment, deployment } : { kind: 'vercel-rollback', pointers, restored: stagePins.previousDeployment, previousManifestSha256: plan.previousPublicManifestSha256 };
    const proof = { operationId: operation.operationId, payloadSha256: hash(operation.payload), status: 'applied', proof: leaf };
    const intent = { ...operation, runId, fence, payloadSha256: hash(operation.payload), status: 'confirmed', evidenceSha256: hash(proof), proof };
    const receipt = { receipt: structuredClone(intent), sha256: hash(intent) };
    record.operations[operation.operationId] = intent; record.receipts[operation.operationId] = receipt;
    document.intents[operation.operationId] = structuredClone(intent); document.receipts[operation.operationId] = structuredClone(receipt);
  }
  record.completion = { schemaVersion: 1, outcome: 'promotion-rollback-verified', reviewSha256, stagePlanSha256: stagePins.planSha256, stageCompletionSha256: stagePins.completionSha256, stageSnapshotSha256: record.stageSnapshotSha256, source: plan.source, candidateDeployment: stagePins.candidateDeployment, previousDeployment: stagePins.previousDeployment, fence, controllerImplementationSha256: stage.currentControllerImplementationSha256, origin: structuredClone(origin), completedBy: { ...origin, mode: 'controlled-promotion-rollback-exercise' }, candidatePublicVerified: true, previousPublicVerified: true, aliasesRestored: true, productionAuthorized: false, continuationReviewSha256: null, reconciliationReviewSha256: null, staticManifestSha256: plan.staticManifestSha256, previousPublicManifestSha256: plan.previousPublicManifestSha256, terminalProofSha256: hash(Object.values(record.operations).map(intent => ({ operationId: intent.operationId, payloadSha256: intent.payloadSha256, status: intent.status, evidenceSha256: intent.evidenceSha256, receiptSha256: record.receipts[intent.operationId].sha256 }))) };
  record.completionSha256 = hash(record.completion); document.promotionAcceptance = record;
  const pins = { stagePins, reviewSha256, completionSha256: record.completionSha256, completionControllerImplementationSha256: record.completion.controllerImplementationSha256, currentControllerImplementationSha256: stage.currentControllerImplementationSha256, ...(withIncident ? { setupIncidentSha256: stagePins.setupIncidentSha256 } : {}) };
  const ownerDecision = { schemaVersion: 1, kind: withIncident ? 'founder-approved-daily-publication-with-retained-setup-incident' : 'founder-approved-daily-publication', approved: true, actorId: '268053325', approvedAt: '2026-10-30T12:00:00Z', currentControllerImplementationSha256: stage.currentControllerImplementationSha256, authorizeDailyPublication: true, singleWriterCutoverVerified: true, localWriterCutoverSha256: hash('owner-verified-local-writer-cutover'), scope: { repository: plan.repository, project: plan.project, team: plan.team, domains: structuredClone(plan.domains) }, stagePlanSha256: stagePins.planSha256, stageCompletionSha256: stagePins.completionSha256, promotionReviewSha256: reviewSha256, promotionCompletionSha256: record.completionSha256, setupIncidentSha256: stagePins.setupIncidentSha256 ?? null, originalOutcome: withIncident ? 'UNKNOWN' : null, accepted: false, retainIncident: withIncident };
  return { document, pins, currentControllerImplementationSha256: stage.currentControllerImplementationSha256, configuration: { schemaVersion: 1, pins, ownerDecision }, now: Date.parse('2026-10-31T12:00:00Z') };
}
function rechain(f) {
  const r = f.document.promotionAcceptance;
  for (const [key, intent] of Object.entries(r.operations)) {
    intent.payloadSha256 = hash(intent.payload); intent.evidenceSha256 = hash(intent.proof); r.receipts[key] = { receipt: structuredClone(intent), sha256: hash(intent) };
    if (Object.hasOwn(f.document.intents, key)) { f.document.intents[key] = structuredClone(intent); f.document.receipts[key] = structuredClone(r.receipts[key]); }
  }
  r.completion.terminalProofSha256 = hash(Object.values(r.operations).map(intent => ({ operationId: intent.operationId, payloadSha256: intent.payloadSha256, status: intent.status, evidenceSha256: intent.evidenceSha256, receiptSha256: r.receipts[intent.operationId].sha256 })));
  r.completionSha256 = hash(r.completion); f.pins.completionSha256 = r.completionSha256; f.configuration.ownerDecision.promotionCompletionSha256 = r.completionSha256;
}
test('strict promotion/rollback proof is historical evidence only until a separately pinned founder daily policy exists', () => {
  const f = fixture(), before = JSON.stringify(f); assert.equal(validate(f).promotionRollbackVerified, true); assert.equal(validate(f).productionAuthorized, false);
  assert.throws(() => gate({ ...f, configuration: undefined }), /migration_acceptance_pending/);
  const result = gate(f); assert.equal(result.productionAuthorized, true); assert.equal(result.requiresDurableAdmission, true); assert.equal(result.retainedUnknownAccepted, false); assert.equal(result.singleWriterCutoverAttested, true); assert.equal(JSON.stringify(f), before);
  assert.throws(() => assertSetupIncidentsForProduction(f.document), /production_quarantined_setup_incident/);
});
test('later approved controller and compaction do not rewrite historical implementation/receipt evidence', () => {
  const f = fixture(), r = f.document.promotionAcceptance, old = hash(r);
  f.currentControllerImplementationSha256 = 'e'.repeat(64); f.pins.currentControllerImplementationSha256 = f.currentControllerImplementationSha256; f.pins.stagePins.currentControllerImplementationSha256 = f.currentControllerImplementationSha256; f.configuration.ownerDecision.currentControllerImplementationSha256 = f.currentControllerImplementationSha256;
  f.document.fence += 7; f.document.intents = {}; f.document.receipts = {}; f.document.paused = false;
  assert.equal(gate(f).productionAuthorized, true); assert.equal(hash(r), old); assert.equal(r.completion.controllerImplementationSha256, 'd'.repeat(64));
  delete r.operations; delete r.receipts; assert.throws(() => validate(f), /operation_proof_invalid/);
});
test('all independent pins and raw stage snapshot/completion hashes are mandatory', () => {
  const f = fixture(); for (const key of Object.keys(f.pins)) { const g = structuredClone(f); delete g.pins[key]; assert.throws(() => validate(g), undefined, key); }
  for (const mutate of [g => g.document.promotionAcceptance.stageSnapshot.paused = false, g => g.document.promotionAcceptance.stageSnapshotSha256 = 'f'.repeat(64), g => g.document.promotionAcceptance.completionSha256 = 'f'.repeat(64), g => g.document.promotionAcceptance.review.approved = false, g => g.document.promotionAcceptance.review.actorId = '222']) { const g = fixture(); mutate(g); assert.throws(() => validate(g)); }
});
test('terminal proofs bind both effects, exact pointer sets, source/digests and every applied receipt', () => {
  for (const mutate of [i => i.status = 'not-applied', i => i.fence++, i => i.runId = 'other-run', i => i.proof.operationId = 'other', i => i.proof.status = 'not-applied', i => i.proof.proof.pointers[0].domain = 'https://other.invalid', i => i.proof.proof.pointers[0].deployment = 'dpl_Other', i => i.payload.commit = 'f'.repeat(40), i => i.payload.controlledReviewSha256 = 'f'.repeat(64)]) {
    const f = fixture(); mutate(Object.values(f.document.promotionAcceptance.operations)[0]); rechain(f); assert.throws(() => validate(f));
  }
  const f = fixture(); const key = Object.keys(f.document.promotionAcceptance.operations)[0]; f.document.intents[key].status = 'uncertain'; assert.throws(() => validate(f), /active_receipt_changed/);
  const orphan = fixture(); orphan.document.promotionAcceptance.receipts.extra = {}; assert.throws(() => validate(orphan), /operation_snapshot_invalid/);
});
test('candidate and previous public verification are strict true and rollback-only outcome cannot activate', () => {
  for (const [key, value] of Object.entries({ candidatePublicVerified: false, previousPublicVerified: 'true', aliasesRestored: false, productionAuthorized: true, outcome: 'rollback-restored-unaccepted' })) {
    const f = fixture(); f.document.promotionAcceptance.completion[key] = value; rechain(f); assert.throws(() => validate(f), undefined, key);
  }
});
test('owner daily policy cannot silently discard UNKNOWN, switch targets, bypass cutover or self-approve a future date', () => {
  for (const [key, value] of Object.entries({ approved: false, actorId: '222', authorizeDailyPublication: false, currentControllerImplementationSha256: 'f'.repeat(64), accepted: true, retainIncident: false, originalOutcome: 'not-applied', setupIncidentSha256: 'f'.repeat(64), stageCompletionSha256: 'f'.repeat(64), promotionCompletionSha256: 'f'.repeat(64), singleWriterCutoverVerified: false, localWriterCutoverSha256: '', approvedAt: '2099-01-01T00:00:00Z' })) {
    const f = fixture(); f.configuration.ownerDecision[key] = value; assert.throws(() => gate(f), undefined, key);
  }
  const wrongScope = fixture(); wrongScope.configuration.ownerDecision.scope.domains = ['https://other.invalid']; assert.throws(() => gate(wrongScope), /owner_policy_required/);
  const erased = fixture(); delete erased.document.unresolvedSetupIncident; assert.throws(() => gate(erased), /incident_policy_mismatch/);
});
test('incident-free policy is explicit; per-effect historical revalidation preserves current fenced uncertainty', () => {
  const f = fixture({ withIncident: false }); assert.equal(gate(f).productionAuthorized, true); f.configuration.ownerDecision.retainIncident = true; assert.throws(() => gate(f), /owner_incident_policy_required/);
  const restored = fixture(); restored.document.restoreHold = true; assert.throws(() => gate(restored), /migration_operational_hold/);
  const active = fixture(); active.document.fence = 8; active.document.paused = false; active.document.lease = { runId: 'gha-999-1', fence: 8, expiresAt: Date.now() + 60_000 };
  const payload = { kind: 'git-tree', sha: 'f'.repeat(40) }; active.document.intents['current-release-effect'] = { operationId: 'current-release-effect', runId: 'gha-999-1', fence: 8, payload, payloadSha256: hash(payload), status: 'uncertain', evidenceSha256: null };
  const before = JSON.stringify(active.document); assert.equal(gate(active).productionAuthorized, true); assert.equal(gate(active).requiresDurableAdmission, true); assert.equal(JSON.stringify(active.document), before);
});

function reviewedCompletion(f, mode, { chain = false } = {}) {
  const r = f.document.promotionAcceptance;
  const makeReview = (action, controller, approvalId) => {
    const review = structuredClone(r.review); review.action = action; review.controllerImplementationSha256 = controller; review.stagePins.currentControllerImplementationSha256 = controller; review.baseReviewSha256 = r.reviewSha256; review.approvalId = approvalId; return review;
  };
  if (mode === 'reconciliation' || chain) {
    const review = makeReview('exercise', 'e'.repeat(64), 'approved-read-reconciliation');
    r.reconciliation = { review, reviewSha256: hash(review), runId: '201', attempt: '1' }; r.completion.reconciliationReviewSha256 = r.reconciliation.reviewSha256;
  }
  const controller = mode === 'reconciliation' ? 'e'.repeat(64) : 'f'.repeat(64);
  if (mode === 'rollback-continuation') {
    const review = makeReview('complete-rollback-only', controller, 'approved-never-authorized-rollback');
    r.continuation = { review, reviewSha256: hash(review), runId: '202', attempt: '1' }; r.completion.continuationReviewSha256 = r.continuation.reviewSha256;
  }
  r.completion.controllerImplementationSha256 = controller; r.completion.completedBy = { runId: mode === 'reconciliation' ? '201' : '202', attempt: '1', mode: `controlled-promotion-rollback-${mode}` };
  f.pins.completionControllerImplementationSha256 = controller;
  f.currentControllerImplementationSha256 = '9'.repeat(64); f.pins.currentControllerImplementationSha256 = f.currentControllerImplementationSha256; f.pins.stagePins.currentControllerImplementationSha256 = f.currentControllerImplementationSha256; f.configuration.ownerDecision.currentControllerImplementationSha256 = f.currentControllerImplementationSha256;
  rechain(f); return f;
}
test('new-controller reconciliation and separately approved never-authorized rollback continuation have bound authority chains', () => {
  for (const [mode, chain] of [['reconciliation', false], ['rollback-continuation', false], ['rollback-continuation', true]]) {
    const f = reviewedCompletion(fixture(), mode, { chain }); assert.equal(gate(f).productionAuthorized, true); assert.notEqual(f.document.promotionAcceptance.completion.controllerImplementationSha256, f.document.promotionAcceptance.review.controllerImplementationSha256);
  }
});
test('a changed completion controller cannot appear without its matching founder/base-review/run approval', () => {
  const missing = fixture(); missing.document.promotionAcceptance.completion.controllerImplementationSha256 = 'e'.repeat(64); missing.pins.completionControllerImplementationSha256 = 'e'.repeat(64); rechain(missing); assert.throws(() => validate(missing), /reconciliation_approval_invalid/);
  for (const mutate of [f => { delete f.document.promotionAcceptance.reconciliation; }, f => { f.document.promotionAcceptance.reconciliation.runId = '999'; }, f => { f.document.promotionAcceptance.reconciliation.review.actorId = '222'; }, f => { f.document.promotionAcceptance.reconciliation.review.baseReviewSha256 = '0'.repeat(64); }]) {
    const f = reviewedCompletion(fixture(), 'reconciliation'); mutate(f); assert.throws(() => validate(f));
  }
  for (const mutate of [f => { delete f.document.promotionAcceptance.continuation; }, f => { f.document.promotionAcceptance.continuation.runId = '999'; }, f => { f.document.promotionAcceptance.continuation.review.actorId = '222'; }, f => { f.document.promotionAcceptance.continuation.review.action = 'exercise'; }, f => { f.document.promotionAcceptance.continuation.review.baseReviewSha256 = '0'.repeat(64); }, f => { f.document.promotionAcceptance.reconciliation.runId = '200'; }]) {
    const f = reviewedCompletion(fixture(), 'rollback-continuation', { chain: true }); mutate(f); assert.throws(() => validate(f));
  }
});
