import { DurableCloudState } from './cloud-ltc-state.mjs';
import { ReleaseOperationCoordinator } from './cloud-ltc-operations.mjs';
import { createVercelReleaseProviders, assertVercelDeploymentIdentity, assertVercelProjectPolicy } from './cloud-ltc-release-providers.mjs';
import { validateStageAcceptanceReceipt, receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
import { FOUNDER_ACTOR_ID } from './cloud-ltc-setup-quarantine.mjs';

const check = (value, code) => { if (!value) throw Error(code); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const terminal = value => ['confirmed', 'not-applied'].includes(value.status);
const projectName = 'https-github-com-satnam-satoshi-satoshi-langar';
const historicalPinsMatch = (current, previous) => same({ ...current, currentControllerImplementationSha256: previous.currentControllerImplementationSha256 }, previous);

// Owner: Satnam Satoshi. Mission: a finite approved public promotion/rollback
// proof. Memory: private durable state and immutable stage evidence. Emergency
// stop: pause and retain uncertain effects. No collection/source/social writes.
export function validateControlledPromotionReview({ env, review, mode, now = Date.now() }) {
  check(['exercise', 'reconcile', 'complete-rollback'].includes(mode) && env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_REPOSITORY === TARGET.repository && env.GITHUB_ACTOR_ID === FOUNDER_ACTOR_ID && env.LTC_ACCEPTANCE_ENVIRONMENT === 'ltc-production' && env.LTC_ACCEPTANCE_MANUAL === 'true' && env.LTC_CLOUD_PUBLISH === 'false' && /^[1-9]\d*$/.test(env.GITHUB_RUN_ID ?? '') && /^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'promotion_owner_context_required');
  check(review && Buffer.byteLength(JSON.stringify(review)) <= 65_536 && digest(env.LTC_CONTROLLED_PROMOTION_REVIEW_SHA256) && hash(review) === env.LTC_CONTROLLED_PROMOTION_REVIEW_SHA256, 'promotion_review_pin_required');
  check(review.schemaVersion === 1 && review.kind === 'founder-approved-controlled-promotion-rollback' && review.approved === true && review.actorId === FOUNDER_ACTOR_ID && /^[a-z0-9][a-z0-9_-]{0,47}$/.test(review.approvalId ?? '') && Number.isFinite(Date.parse(review.approvedAt)) && Date.parse(review.approvedAt) <= now && review.controllerImplementationSha256 === env.LTC_ACCEPTED_IMPLEMENTATION_SHA256 && digest(review.controllerImplementationSha256) && review.allProjectProductionAliasesApproved === true && review.temporaryPublicExposureApproved === true && review.rollbackRequired === true && review.productionAuthorized === false && review.allowReadOnlyReconciliation === true, 'promotion_specific_approval_required');
  check(mode === 'complete-rollback' ? review.action === 'complete-rollback-only' && digest(review.baseReviewSha256) : review.action === 'exercise', 'promotion_action_not_approved');
  check(review.stagePins?.currentControllerImplementationSha256 === env.LTC_ACCEPTED_IMPLEMENTATION_SHA256, 'promotion_controller_mismatch');
  return hash(review);
}

function incidentBinding(document, review) {
  const pin = review.stagePins.setupIncidentSha256;
  if (pin === undefined) { check(!document.unresolvedSetupIncident && Object.keys(document.retiredSetupIncidents ?? {}).length === 0 && review.retainedIncident === null, 'promotion_incident_policy_required'); return; }
  const incident = document.retiredSetupIncidents?.[pin];
  check(hash(incident) === pin && document.unresolvedSetupIncident?.incidentSha256 === pin && document.unresolvedSetupIncident.outcome === 'UNKNOWN' && document.unresolvedSetupIncident.accepted === false && document.unresolvedSetupIncident.productionAuthorized === false && incident.unknownStage?.status === 'uncertain', 'promotion_incident_changed');
  check(review.retainedIncident?.sha256 === pin && review.retainedIncident.originalOutcome === 'UNKNOWN' && review.retainedIncident.accepted === false && review.retainedIncident.productionAuthorized === false && review.retainedIncident.allowedAction === 'controlled-promotion-rollback', 'promotion_incident_policy_required');
}
async function transition(state, transform) {
  const snapshot = await state.adapter.read('website'); check(snapshot.value && snapshot.version !== null, 'promotion_state_required');
  const document = await new DurableCloudState({ read: async () => snapshot }, 'website').inspect();
  const result = transform(document);
  await new DurableCloudState({ read: async () => ({ value: document }) }, 'website').inspect();
  await state.adapter.conditionalWrite('website', document, snapshot.version); return result;
}
async function projectControls(dependencies) {
  const project = await dependencies.vercel(`/v9/projects/${TARGET.project}`); assertVercelProjectPolicy(project, TARGET);
  check(project.name === projectName && !project.rollingRelease && Array.isArray(project.crons?.definitions) && project.crons.definitions.length === 0, 'promotion_project_control_changed');
  const social = await dependencies.socialState.inspect();
  check(social?.paused === true && social.lease === null && social.records && !Object.values(social.records).some(record => ['create-uncertain', 'schedule-uncertain', 'sending'].includes(record.status)), 'promotion_social_not_paused');
}
async function pointers(dependencies, expected) {
  for (const domain of TARGET.domains) { const deployment = await dependencies.vercel(`/v13/deployments/${new URL(domain).hostname}`); assertVercelDeploymentIdentity(deployment, TARGET); check(deployment.id === expected, 'promotion_public_pointer_changed'); }
}
async function runCompleted(dependencies, identity, requireSuccess = false) {
  const run = await dependencies.github(`/actions/runs/${identity.runId}/attempts/${identity.attempt}`);
  check(String(run?.id) === identity.runId && String(run.run_attempt) === identity.attempt && run.status === 'completed' && run.event === 'workflow_dispatch' && run.head_branch === 'main' && run.repository?.full_name === TARGET.repository && run.path === '.github/workflows/ltc-daily-publication.yml' && String(run.actor?.id) === FOUNDER_ACTOR_ID && (!requireSuccess || run.conclusion === 'success'), 'promotion_origin_not_completed');
}
function operations(record) {
  const p = record.stageSnapshot.acceptance.plan, common = { artifactPackageManifestSha256: p.artifactPackageManifestSha256, controlledReviewSha256: record.reviewSha256, stagePlanSha256: record.review.stagePins.planSha256 };
  return [
    { operationId: `promote-proof-${record.reviewSha256.slice(0, 24)}`, payload: { ...common, kind: 'vercel-promote', editionId: p.editionId, artifactManifestSha256: p.staticManifestSha256, deployment: record.review.stagePins.candidateDeployment, previous: p.previousDeployment, commit: p.source } },
    { operationId: `rollback-proof-${record.reviewSha256.slice(0, 24)}`, payload: { ...common, kind: 'vercel-rollback', failed: record.review.stagePins.candidateDeployment, restore: p.previousDeployment, commit: p.source, previousManifestSha256: p.previousPublicManifestSha256 } },
  ];
}
function polled(provider, dependencies) {
  return { apply: context => provider.apply(context), readback: async context => {
    for (let attempt = 0; attempt < 8; attempt++) {
      try { const result = await provider.readback(context); if (result.status === 'applied') return result; } catch { /* Only service reads may repeat, never apply. */ }
      if (attempt < 7) await dependencies.wait(2000);
    }
    return { ...context, status: 'unknown', proof: { verified: false } };
  } };
}
async function contextFor(record, dependencies) {
  const context = await dependencies.restore(record.stageSnapshot);
  const plan = record.stageSnapshot.acceptance.plan;
  check(context && hash(context.manifest) === plan.staticManifestSha256 && hash(context.previousManifest) === plan.previousPublicManifestSha256, 'promotion_restored_context_mismatch');
  return context;
}
function providersFor(record, state, lease, dependencies, context, readOnly = false) {
  return createVercelReleaseProviders({ target: TARGET, vercel: dependencies.vercel,
    cli: args => { check(!readOnly, 'promotion_read_only'); return dependencies.mutate(args, { candidate: record.review.stagePins.candidateDeployment, candidateUrl: record.candidateUrl, previous: record.review.stagePins.previousDeployment }); },
    beforeMutation: async () => {
      check(!readOnly, 'promotion_read_only'); await state.renew(lease, 3_600_000);
      incidentBinding(await state.inspect(), record.review); await projectControls(dependencies);
    },
    verifyProtected: deployment => dependencies.verifyProtected(deployment, context.manifest),
    verifyPublic: async expected => { check(expected === record.stageSnapshot.acceptance.plan.previousPublicManifestSha256, 'promotion_restored_context_mismatch'); await dependencies.verifyPublic(context.previousManifest); },
  });
}
async function observation(state, lease, key, value) {
  return transition(state, document => { check(document.lease?.fence === lease.fence && document.lease.runId === lease.runId, 'lease_fenced'); document.promotionAcceptance.observations[key] = value; });
}
async function close(state, lease, env, context, dependencies, verified, completedMode = 'exercise') {
  await pointers(dependencies, context.record.review.stagePins.previousDeployment); await dependencies.verifyPublic(context.previousManifest);
  return transition(state, document => {
    check(document.lease?.fence === lease.fence && document.lease.runId === lease.runId && Object.values(document.intents).every(terminal), 'promotion_reconciliation_required');
    const record = document.promotionAcceptance; incidentBinding(document, record.review);
    const relevant = operations(record).map(operation => document.intents[operation.operationId]);
    check(relevant[1]?.status === 'confirmed', 'promotion_rollback_still_required');
    const completion = { schemaVersion: 1, outcome: verified ? 'promotion-rollback-verified' : 'rollback-restored-unaccepted', reviewSha256: record.reviewSha256, stagePlanSha256: record.review.stagePins.planSha256, stageCompletionSha256: record.review.stagePins.completionSha256, stageSnapshotSha256: record.stageSnapshotSha256,
      source: record.stageSnapshot.acceptance.plan.source, candidateDeployment: record.review.stagePins.candidateDeployment, previousDeployment: record.review.stagePins.previousDeployment, fence: lease.fence, controllerImplementationSha256: env.LTC_ACCEPTED_IMPLEMENTATION_SHA256,
      origin: record.origin, completedBy: { runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, mode: `controlled-promotion-rollback-${completedMode}` },
      candidatePublicVerified: record.observations.candidatePublicVerified === true, previousPublicVerified: true, aliasesRestored: true, productionAuthorized: false, continuationReviewSha256: record.continuation?.reviewSha256 ?? null, reconciliationReviewSha256: record.reconciliation?.reviewSha256 ?? null,
      staticManifestSha256: record.stageSnapshot.acceptance.plan.staticManifestSha256, previousPublicManifestSha256: record.stageSnapshot.acceptance.plan.previousPublicManifestSha256,
      terminalProofSha256: hash(relevant.map(intent => ({ operationId: intent.operationId, payloadSha256: intent.payloadSha256, status: intent.status, evidenceSha256: intent.evidenceSha256, receiptSha256: document.receipts[intent.operationId].sha256 }))) };
    check(!verified || (completion.candidatePublicVerified && relevant.every(intent => intent.status === 'confirmed')), 'promotion_verification_incomplete');
    record.operations = Object.fromEntries(relevant.map(intent => [intent.operationId, structuredClone(intent)]));
    record.receipts = Object.fromEntries(relevant.map(intent => [intent.operationId, structuredClone(document.receipts[intent.operationId])]));
    record.status = 'completed'; record.completion = completion; record.completionSha256 = hash(completion); document.paused = true; document.lease = null;
    return { mode: 'controlled-promotion-rollback', status: completion.outcome, completionSha256: record.completionSha256, productionAuthorized: false, aliasesRestored: true, websitePaused: true, leaseReleased: true };
  });
}

export async function runControlledPromotionRollback({ env, review, state, dependencies }) {
  const reviewSha = validateControlledPromotionReview({ env, review, mode: 'exercise', now: dependencies.now() });
  check(state instanceof DurableCloudState && state.key === 'website', 'promotion_durable_state_required');
  const document = await state.inspect();
  const stage = validateStageAcceptanceReceipt({ document, pins: review.stagePins, currentControllerImplementationSha256: env.LTC_ACCEPTED_IMPLEMENTATION_SHA256 });
  incidentBinding(document, review); check(!document.promotionAcceptance, 'promotion_previous_attempt_requires_review');
  await runCompleted(dependencies, review.stagePins.origin); await runCompleted(dependencies, review.stagePins.completedBy, true);
  await projectControls(dependencies); await pointers(dependencies, stage.previousDeployment);
  const candidate = await dependencies.vercel(`/v13/deployments/${stage.candidateDeployment}`); assertVercelDeploymentIdentity(candidate, TARGET);
  check(candidate.url === stage.candidateUrl && candidate.meta?.ltcSourceCommit === stage.source && candidate.meta?.ltcBuildOutputSha256 === stage.buildOutputSha256, 'promotion_candidate_changed');
  const record = { schemaVersion: 1, status: 'admitted', review: structuredClone(review), reviewSha256: reviewSha, stageSnapshot: structuredClone(document), stageSnapshotSha256: hash(document), candidateUrl: stage.candidateUrl,
    origin: { runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT }, observations: {} };
  const context = await contextFor(record, dependencies); context.record = record;
  await dependencies.verifyProtected(candidate, context.manifest); await dependencies.verifyPublic(context.previousManifest); await pointers(dependencies, stage.previousDeployment);
  const lease = await transition(state, current => {
    check(same(current, document), 'state_conflict');
    current.paused = false; current.lease = { runId: `promote-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`, fence: ++current.fence, expiresAt: dependencies.now() + 3_600_000 };
    current.promotionAcceptance = { ...record, runId: current.lease.runId, fence: current.fence }; return structuredClone(current.lease);
  });
  await dependencies.save({ mode: 'controlled-promotion-rollback', status: 'admitted', lease, reviewSha256: reviewSha, productionAuthorized: false });
  const steps = operations(record), coordinator = new ReleaseOperationCoordinator({ state, lease });
  for (const step of steps) await state.intend(lease, step.operationId, hash(step.payload), step.payload);
  const providers = providersFor(record, state, lease, dependencies, context);
  await coordinator.execute({ ...steps[0], provider: polled(providers.promote(steps[0].payload), dependencies) });
  let candidateVerified = false;
  try { await dependencies.verifyPublic(context.manifest); candidateVerified = true; } catch { /* Confirmed promotion still has explicit, separate rollback authority. */ }
  await observation(state, lease, 'candidatePublicVerified', candidateVerified);
  await coordinator.execute({ ...steps[1], provider: polled(providers.rollback(steps[1].payload), dependencies) });
  const result = await close(state, lease, env, context, dependencies, candidateVerified);
  await dependencies.save(result); return result;
}

// Separate job: fresh proof reconciliation only. Pending rollback is deliberately
// retained and paused when promotion happened; no effect can be replayed here.
export async function reconcileControlledPromotionRollback({ env, review, state, dependencies, expectedFence }) {
  validateControlledPromotionReview({ env, review, mode: 'reconcile', now: dependencies.now() });
  const document = await state.inspect(), record = document.promotionAcceptance, lease = document.lease;
  check(record && (record.reviewSha256 === hash(review) || review.baseReviewSha256 === record.reviewSha256) && historicalPinsMatch(review.stagePins, record.review.stagePins) && hash(record.review) === record.reviewSha256 && hash(record.stageSnapshot) === record.stageSnapshotSha256 && lease?.fence === expectedFence && lease.runId === record.runId && record.fence === expectedFence && record.origin.runId !== env.GITHUB_RUN_ID, 'promotion_recovery_context_required');
  validateStageAcceptanceReceipt({ document: record.stageSnapshot, pins: review.stagePins, currentControllerImplementationSha256: env.LTC_ACCEPTED_IMPLEMENTATION_SHA256 }); incidentBinding(document, review);
  await runCompleted(dependencies, record.origin); await state.setPaused(true); await projectControls(dependencies);
  if (hash(review) !== record.reviewSha256) await transition(state, current => { check(current.lease?.fence === expectedFence && current.lease.runId === record.runId, 'lease_fenced'); current.promotionAcceptance.reconciliation = { review: structuredClone(review), reviewSha256: hash(review), runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT }; });
  const context = await contextFor(record, dependencies); context.record = record;
  const providers = providersFor(record, state, lease, dependencies, context, true), coordinator = new ReleaseOperationCoordinator({ state, lease }), steps = operations(record);
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index], intent = (await state.inspect()).intents[step.operationId];
    check(intent && hash(intent.payload) === hash(step.payload), 'promotion_recovery_context_required');
    if (intent.status === 'uncertain') await coordinator.reconcile({ ...step, provider: polled(index === 0 ? providers.promote(step.payload) : providers.rollback(step.payload), dependencies) });
  }
  const fresh = await state.inspect();
  if (fresh.intents[steps[0].operationId].status === 'confirmed' && fresh.intents[steps[1].operationId].status === 'pending') {
    let candidateVerified = false; try { await dependencies.verifyPublic(context.manifest); candidateVerified = true; } catch {}
    await observation(state, lease, 'candidatePublicVerified', candidateVerified);
  }
  if (fresh.intents[steps[1].operationId].status !== 'confirmed') {
    const result = { mode: 'controlled-promotion-rollback-reconciliation', status: 'manual-rollback-required', effectsReissued: false, leaseHeld: true, websitePaused: true, productionAuthorized: false };
    await dependencies.save(result); return result;
  }
  const result = await close(state, lease, env, context, dependencies, fresh.promotionAcceptance.observations.candidatePublicVerified === true, 'reconciliation'); await dependencies.save(result); return result;
}

// Deliberately distinct owner-approved continuation for a rollback whose effect
// was NEVER authorized. Unknown rollback attempts cannot enter this mode.
export async function completeControlledRollback({ env, review, state, dependencies, expectedFence }) {
  validateControlledPromotionReview({ env, review, mode: 'complete-rollback', now: dependencies.now() });
  const document = await state.inspect(), record = document.promotionAcceptance, lease = document.lease;
  check(record && review.baseReviewSha256 === record.reviewSha256 && hash(record.review) === record.reviewSha256 && historicalPinsMatch(review.stagePins, record.review.stagePins) && hash(record.stageSnapshot) === record.stageSnapshotSha256 && lease?.fence === expectedFence && lease.runId === record.runId && document.paused, 'promotion_recovery_context_required');
  validateStageAcceptanceReceipt({ document: record.stageSnapshot, pins: review.stagePins, currentControllerImplementationSha256: env.LTC_ACCEPTED_IMPLEMENTATION_SHA256 });
  await runCompleted(dependencies, record.origin); incidentBinding(document, record.review);
  const steps = operations(record); check(document.intents[steps[0].operationId]?.status === 'confirmed' && document.intents[steps[1].operationId]?.status === 'pending' && !Object.values(document.intents).some(intent => intent.status === 'uncertain'), 'promotion_reconciliation_required');
  const context = await contextFor(record, dependencies); context.record = record;
  await projectControls(dependencies); await pointers(dependencies, review.stagePins.candidateDeployment);
  const claimed = await transition(state, current => { check(same(current, document), 'state_conflict'); current.paused = false; current.lease.expiresAt = dependencies.now() + 3_600_000; current.promotionAcceptance.continuation = { review: structuredClone(review), reviewSha256: hash(review), runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT }; return structuredClone(current.lease); });
  const providers = providersFor(record, state, claimed, dependencies, context), coordinator = new ReleaseOperationCoordinator({ state, lease: claimed });
  await coordinator.execute({ ...steps[1], provider: polled(providers.rollback(steps[1].payload), dependencies) });
  const result = await close(state, claimed, env, context, dependencies, document.promotionAcceptance.observations.candidatePublicVerified === true, 'rollback-continuation'); await dependencies.save(result); return result;
}
