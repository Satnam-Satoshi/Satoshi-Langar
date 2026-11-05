import { validateStageAcceptanceReceipt, receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { FOUNDER_ACTOR_ID } from './cloud-ltc-setup-quarantine.mjs';

const check = (condition, code) => { if (!condition) throw Error(code); };
const plain = value => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const run = value => typeof value === 'string' && /^[1-9]\d*$/.test(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const target = Object.freeze({ repository: 'Satnam-Satoshi/Satoshi-Langar', project: 'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx', team: 'team_yc5ZBvCbWT2M7iGyj3vQDOzk', domains: ['https://satnamsatoshi.com', 'https://ltcmagazine.org'] });
const stagePinsMatch = (historical, current) => plain(historical) && plain(current) && [...new Set([...Object.keys(historical), ...Object.keys(current)])].filter(key => key !== 'currentControllerImplementationSha256').every(key => same(historical[key], current[key]));

function retainedIncident(document, pin) {
  const entries = Object.entries(document.retiredSetupIncidents ?? {}), marker = document.unresolvedSetupIncident;
  if (pin === undefined) {
    check(entries.length === 0 && !marker, 'migration_incident_policy_mismatch'); return;
  }
  check(digest(pin) && entries.length === 1 && entries[0][0] === pin && hash(entries[0][1]) === pin && marker?.incidentSha256 === pin && marker.outcome === 'UNKNOWN' && marker.accepted === false && marker.productionAuthorized === false, 'migration_incident_policy_mismatch');
  const incident = entries[0][1];
  check(incident.kind === 'quarantined-setup-stage-unknown' && incident.outcome === 'UNKNOWN' && incident.accepted === false && incident.productionAuthorized === false && incident.unknownStage?.status === 'uncertain', 'migration_incident_policy_mismatch');
}
function controlledReview(review) {
  check(plain(review) && review.schemaVersion === 1 && review.kind === 'founder-approved-controlled-promotion-rollback' && review.approved === true && review.actorId === FOUNDER_ACTOR_ID && /^[a-z0-9][a-z0-9_-]{0,47}$/.test(review.approvalId ?? '') && Number.isFinite(Date.parse(review.approvedAt)) && digest(review.controllerImplementationSha256) && review.stagePins?.currentControllerImplementationSha256 === review.controllerImplementationSha256 && review.allProjectProductionAliasesApproved === true && review.temporaryPublicExposureApproved === true && review.rollbackRequired === true && review.productionAuthorized === false && review.allowReadOnlyReconciliation === true, 'migration_controlled_review_invalid');
}

// Owner: Satnam Satoshi. Pure validation only. Protected pins are independent of
// the private receipt and the caller must verify current controller bytes before
// execution. No API, credential, state mutation, deployment or activation here.
export function validatePromotionRollbackReceipt({ document, pins, currentControllerImplementationSha256 }) {
  let encoded; try { encoded = JSON.stringify(document); } catch { throw Error('migration_receipt_state_invalid'); }
  check(typeof encoded === 'string' && encoded.length <= 900_000, 'migration_receipt_state_invalid');
  check(plain(document) && document.schemaVersion === 1 && Number.isSafeInteger(document.fence) && document.fence > 0 && plain(document.intents) && plain(document.receipts), 'migration_receipt_state_invalid');
  check(plain(pins) && plain(pins.stagePins) && ['reviewSha256', 'completionSha256', 'completionControllerImplementationSha256', 'currentControllerImplementationSha256'].every(key => digest(pins[key])), 'migration_receipt_pins_required');
  check(digest(currentControllerImplementationSha256) && currentControllerImplementationSha256 === pins.currentControllerImplementationSha256 && pins.stagePins.currentControllerImplementationSha256 === currentControllerImplementationSha256, 'migration_receipt_controller_mismatch');
  const record = document.promotionAcceptance;
  check(plain(record) && record.schemaVersion === 1 && record.status === 'completed' && plain(record.stageSnapshot) && digest(record.stageSnapshotSha256) && hash(record.stageSnapshot) === record.stageSnapshotSha256, 'migration_stage_snapshot_invalid');
  const stage = validateStageAcceptanceReceipt({ document: record.stageSnapshot, pins: pins.stagePins, currentControllerImplementationSha256 });
  check(pins.setupIncidentSha256 === pins.stagePins.setupIncidentSha256, 'migration_incident_policy_mismatch');
  retainedIncident(document, pins.setupIncidentSha256);
  const review = record.review;
  controlledReview(review);
  check(record.reviewSha256 === pins.reviewSha256 && hash(review) === pins.reviewSha256 && review.action === 'exercise' && stagePinsMatch(review.stagePins, pins.stagePins), 'migration_review_pin_mismatch');
  if (pins.setupIncidentSha256 === undefined) check(review.retainedIncident === null, 'migration_incident_policy_mismatch');
  else check(review.retainedIncident?.sha256 === pins.setupIncidentSha256 && review.retainedIncident.originalOutcome === 'UNKNOWN' && review.retainedIncident.accepted === false && review.retainedIncident.productionAuthorized === false && review.retainedIncident.allowedAction === 'controlled-promotion-rollback', 'migration_incident_policy_mismatch');
  check(record.candidateUrl === stage.candidateUrl && Number.isSafeInteger(record.fence) && record.fence === stage.fence + 1 && document.fence >= record.fence && run(record.origin?.runId) && run(record.origin?.attempt) && record.runId === `promote-${record.origin.runId}-${record.origin.attempt}`, 'migration_promotion_origin_invalid');
  const completion = record.completion;
  check(plain(completion) && completion.schemaVersion === 1 && completion.outcome === 'promotion-rollback-verified' && completion.reviewSha256 === pins.reviewSha256 && completion.stagePlanSha256 === stage.planSha256 && completion.stageCompletionSha256 === stage.completionSha256 && completion.stageSnapshotSha256 === record.stageSnapshotSha256 && completion.fence === record.fence && completion.source === stage.source && completion.candidateDeployment === stage.candidateDeployment && completion.previousDeployment === stage.previousDeployment && completion.controllerImplementationSha256 === pins.completionControllerImplementationSha256 && same(completion.origin, record.origin), 'migration_promotion_completion_invalid');
  check(completion.candidatePublicVerified === true && completion.previousPublicVerified === true && completion.aliasesRestored === true && completion.productionAuthorized === false && record.observations?.candidatePublicVerified === true && completion.staticManifestSha256 === stage.staticManifestSha256 && completion.previousPublicManifestSha256 === stage.previousPublicManifestSha256, 'migration_public_verification_invalid');
  const by = completion.completedBy;
  check(run(by?.runId) && run(by?.attempt) && ['controlled-promotion-rollback-exercise', 'controlled-promotion-rollback-reconciliation', 'controlled-promotion-rollback-rollback-continuation'].includes(by.mode), 'migration_completing_run_invalid');
  if (by.mode === 'controlled-promotion-rollback-exercise') check(same({ runId: by.runId, attempt: by.attempt }, record.origin), 'migration_completing_run_invalid');
  else check(by.runId !== record.origin.runId, 'migration_completing_run_invalid');
  if (by.mode === 'controlled-promotion-rollback-rollback-continuation') {
    const continuation = record.continuation;
    controlledReview(continuation?.review);
    check(digest(completion.continuationReviewSha256) && completion.continuationReviewSha256 === continuation.reviewSha256 && hash(continuation.review) === continuation.reviewSha256 && continuation.review.action === 'complete-rollback-only' && continuation.review.baseReviewSha256 === record.reviewSha256 && stagePinsMatch(continuation.review.stagePins, review.stagePins) && same(continuation.review.retainedIncident, review.retainedIncident) && continuation.review.controllerImplementationSha256 === completion.controllerImplementationSha256 && continuation.runId === by.runId && continuation.attempt === by.attempt, 'migration_continuation_approval_invalid');
  } else check(completion.continuationReviewSha256 === null && record.continuation === undefined, 'migration_continuation_approval_invalid');
  if (completion.reconciliationReviewSha256 !== null) {
    const reconciliation = record.reconciliation;
    controlledReview(reconciliation?.review);
    check(digest(completion.reconciliationReviewSha256) && completion.reconciliationReviewSha256 === reconciliation.reviewSha256 && hash(reconciliation.review) === reconciliation.reviewSha256 && reconciliation.review.action === 'exercise' && reconciliation.review.baseReviewSha256 === record.reviewSha256 && stagePinsMatch(reconciliation.review.stagePins, review.stagePins) && same(reconciliation.review.retainedIncident, review.retainedIncident) && run(reconciliation.runId) && run(reconciliation.attempt) && reconciliation.runId !== record.origin.runId, 'migration_reconciliation_approval_invalid');
    if (by.mode === 'controlled-promotion-rollback-reconciliation') check(reconciliation.runId === by.runId && reconciliation.attempt === by.attempt && reconciliation.review.controllerImplementationSha256 === completion.controllerImplementationSha256, 'migration_reconciliation_approval_invalid');
    else check(by.mode === 'controlled-promotion-rollback-rollback-continuation' && reconciliation.runId !== by.runId, 'migration_reconciliation_approval_invalid');
  } else {
    check(record.reconciliation === undefined, 'migration_reconciliation_approval_invalid');
    if (by.mode !== 'controlled-promotion-rollback-rollback-continuation') check(completion.controllerImplementationSha256 === review.controllerImplementationSha256, 'migration_reconciliation_approval_invalid');
  }
  check(record.completionSha256 === pins.completionSha256 && hash(completion) === pins.completionSha256, 'migration_completion_hash_mismatch');

  const common = { artifactPackageManifestSha256: stage.artifactPackageManifestSha256, controlledReviewSha256: record.reviewSha256, stagePlanSha256: stage.planSha256 };
  const operations = [
    { operationId: `promote-proof-${record.reviewSha256.slice(0, 24)}`, payload: { ...common, kind: 'vercel-promote', editionId: record.stageSnapshot.acceptance.plan.editionId, artifactManifestSha256: stage.staticManifestSha256, deployment: stage.candidateDeployment, previous: stage.previousDeployment, commit: stage.source } },
    { operationId: `rollback-proof-${record.reviewSha256.slice(0, 24)}`, payload: { ...common, kind: 'vercel-rollback', failed: stage.candidateDeployment, restore: stage.previousDeployment, commit: stage.source, previousManifestSha256: stage.previousPublicManifestSha256 } },
  ];
  const savedOperations = record.operations ?? document.intents, savedReceipts = record.receipts ?? document.receipts;
  check(plain(savedOperations) && plain(savedReceipts) && (record.operations === undefined || Object.keys(savedOperations).length === 2) && (record.receipts === undefined || Object.keys(savedReceipts).length === 2), 'migration_operation_snapshot_invalid');
  const terminalProof = [];
  for (const [index, expected] of operations.entries()) {
    const intent = savedOperations[expected.operationId], receipt = savedReceipts[expected.operationId];
    check(plain(intent) && intent.operationId === expected.operationId && intent.fence === record.fence && intent.runId === record.runId && intent.status === 'confirmed' && same(intent.payload, expected.payload) && hash(intent.payload) === intent.payloadSha256 && digest(intent.evidenceSha256) && plain(intent.proof) && hash(intent.proof) === intent.evidenceSha256 && same(receipt?.receipt, intent) && hash(intent) === receipt.sha256, 'migration_operation_proof_invalid');
    const envelope = intent.proof, leaf = envelope.proof;
    check(envelope.operationId === intent.operationId && envelope.payloadSha256 === intent.payloadSha256 && envelope.status === 'applied' && plain(leaf), 'migration_operation_proof_invalid');
    const expectedDeployment = index === 0 ? stage.candidateDeployment : stage.previousDeployment;
    check(same(leaf.pointers, target.domains.map(domain => ({ domain, deployment: expectedDeployment }))), 'migration_pointer_proof_invalid');
    check(index === 0 ? leaf.kind === 'vercel-promote' && leaf.previous === stage.previousDeployment && leaf.deployment === stage.candidateDeployment : leaf.kind === 'vercel-rollback' && leaf.restored === stage.previousDeployment && leaf.previousManifestSha256 === stage.previousPublicManifestSha256, 'migration_operation_proof_invalid');
    if (Object.hasOwn(document.intents, intent.operationId) || Object.hasOwn(document.receipts, intent.operationId)) check(same(document.intents[intent.operationId], intent) && same(document.receipts[intent.operationId], receipt), 'migration_active_receipt_changed');
    terminalProof.push({ operationId: intent.operationId, payloadSha256: intent.payloadSha256, status: intent.status, evidenceSha256: intent.evidenceSha256, receiptSha256: receipt.sha256 });
  }
  check(hash(terminalProof) === completion.terminalProofSha256, 'migration_terminal_proof_mismatch');
  return Object.freeze({ promotionRollbackVerified: true, productionAuthorized: false, stagePlanSha256: stage.planSha256, stageCompletionSha256: stage.completionSha256, reviewSha256: pins.reviewSha256, completionSha256: pins.completionSha256, candidateDeployment: stage.candidateDeployment, previousDeployment: stage.previousDeployment, source: stage.source, setupIncidentSha256: pins.setupIncidentSha256 ?? null, completionControllerImplementationSha256: completion.controllerImplementationSha256, currentControllerImplementationSha256 });
}

// Explicit policy gate, separate from assertSetupIncidentsForProduction, which
// intentionally still rejects every retained incident. This function changes no
// policy/configuration itself. A later founder decision must independently pin
// this exact promotion/rollback proof and explicitly retain the UNKNOWN incident.
export function assertReviewedMigrationAcceptance({ document, configuration, currentControllerImplementationSha256, now = Date.now() }) {
  check(configuration !== undefined && configuration !== null, 'migration_acceptance_pending');
  check(plain(configuration) && configuration.schemaVersion === 1 && plain(configuration.pins) && plain(configuration.ownerDecision), 'migration_owner_policy_required');
  const pins = configuration.pins, decision = configuration.ownerDecision;
  const proof = validatePromotionRollbackReceipt({ document, pins, currentControllerImplementationSha256 });
  const incidentPin = pins.setupIncidentSha256;
  const kind = incidentPin === undefined ? 'founder-approved-daily-publication' : 'founder-approved-daily-publication-with-retained-setup-incident';
  check(decision.schemaVersion === 1 && decision.kind === kind && decision.approved === true && decision.actorId === FOUNDER_ACTOR_ID && Number.isFinite(now) && Number.isFinite(Date.parse(decision.approvedAt)) && Date.parse(decision.approvedAt) <= now && decision.currentControllerImplementationSha256 === currentControllerImplementationSha256 && decision.authorizeDailyPublication === true && decision.singleWriterCutoverVerified === true && digest(decision.localWriterCutoverSha256) && plain(decision.scope) && Object.entries(target).every(([key, value]) => same(decision.scope[key], value)), 'migration_owner_policy_required');
  check(decision.stagePlanSha256 === pins.stagePins.planSha256 && decision.stageCompletionSha256 === pins.stagePins.completionSha256 && decision.promotionReviewSha256 === pins.reviewSha256 && decision.promotionCompletionSha256 === pins.completionSha256 && decision.accepted === false, 'migration_owner_policy_pin_mismatch');
  if (incidentPin === undefined) check(decision.setupIncidentSha256 === null && decision.originalOutcome === null && decision.retainIncident === false, 'migration_owner_incident_policy_required');
  else check(decision.setupIncidentSha256 === incidentPin && decision.originalOutcome === 'UNKNOWN' && decision.retainIncident === true, 'migration_owner_incident_policy_required');
  // Historical authorization is also rechecked while the caller's fenced
  // operation is uncertain-before-apply. Admission/pause/lease checks remain
  // exclusively with DurableCloudState; this proof never clears those holds.
  check(document.restoreHold === false && typeof document.paused === 'boolean', 'migration_operational_hold');
  return Object.freeze({ ...proof, productionAuthorized: true, requiresDurableAdmission: true, retainedUnknownAccepted: false, singleWriterCutoverAttested: true, localWriterCutoverSha256: decision.localWriterCutoverSha256 });
}
