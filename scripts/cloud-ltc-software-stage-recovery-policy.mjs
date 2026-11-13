import { createHash } from 'node:crypto';
import { releaseGeneration } from './cloud-ltc-generation.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
import { validateSoftwareReview, assertSoftwareContext } from './lib/ltc-software-release.mjs';

const check = (ok, code) => { if (!ok) throw Error(code); };
export const softwareRecoveryHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const hash = softwareRecoveryHash;
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const commit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const run = value => typeof value === 'string' && /^[1-9][0-9]{0,29}$/.test(value);
const plain = value => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const same = (a, b) => hash(a) === hash(b);
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{8,160}$/.test(value);
const deployment = value => typeof value === 'string' && /^dpl_[A-Za-z0-9]{1,156}$/.test(value);

// Pure preflight only. This does NOT reconcile an uncertain stage, read remote
// bytes, claim/renew a lease, authorize a POST or construct a replacement state.
// All manifests/context must come from the independently restored and verified
// existing archive, never a rebuild. A future executor must prove that origin.
export function validateSoftwareStageRecoveryReview({ env, review, now = Date.now() }) {
  check(Number.isFinite(now) && env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
    env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_REPOSITORY === TARGET.repository && env.GITHUB_ACTOR_ID === '268053325' &&
    run(env.GITHUB_RUN_ID) && env.GITHUB_RUN_ATTEMPT === '1' && env.LTC_CLOUD_PUBLISH === 'false' && env.LTC_SOFTWARE_RELEASE_ENABLED === 'false', 'software_recovery_owner_required');
  check(plain(review) && Buffer.byteLength(JSON.stringify(review)) <= 65536 && review.schemaVersion === 1 &&
    review.kind === 'reviewed-existing-software-stage-recovery' && review.approved === true && review.actorId === '268053325' &&
    /^[a-z0-9][a-z0-9_-]{0,47}$/.test(review.approvalId ?? '') && same(review.target, TARGET), 'software_recovery_review_required');
  const approved = Date.parse(review.approvedAt), expires = Date.parse(review.expiresAt);
  check(Number.isFinite(approved) && approved <= now && now < expires && expires - approved <= 86400000 && expires > approved, 'software_recovery_review_expired');
  check(digest(env.LTC_SOFTWARE_STAGE_RECOVERY_REVIEW_SHA256) && hash(review) === env.LTC_SOFTWARE_STAGE_RECOVERY_REVIEW_SHA256 &&
    commit(review.controllerSource) && review.controllerSource === env.LTC_RECOVERY_CONTROLLER_SOURCE &&
    digest(review.controllerImplementationSha256) && review.controllerImplementationSha256 === env.LTC_ACCEPTED_IMPLEMENTATION_SHA256 &&
    commit(review.operatorWorkflowHead) && review.operatorWorkflowHead === env.GITHUB_SHA, 'software_recovery_controller_pin_required');
  check(['snapshotSha256', 'originalReviewSha256', 'originalContextSha256', 'priorReleaseSha256', 'artifactImplementationSha256',
    'artifactManifestSha256', 'buildOutputSha256', 'artifactPackageManifestSha256', 'stageIntentSha256'].every(key => digest(review[key])) &&
    commit(review.artifactSource) && /^[a-z0-9][a-z0-9_-]{0,79}$/.test(review.stageOperationId ?? '') && deployment(review.candidateDeployment) && deployment(review.previousDeployment) && review.candidateDeployment !== review.previousDeployment &&
    Number.isSafeInteger(review.artifactPartCount) && review.artifactPartCount > 0 && review.artifactPartCount <= 64 &&
    plain(review.bindings) && ['websiteDocumentId', 'folderId', 'ownerPermissionId'].every(key => id(review.bindings[key])) && review.bindings.websiteDocumentId !== review.bindings.folderId,
    'software_recovery_scope_required');
  check(review.noRebuild === true && review.noRedeploy === true && review.noArtifactReupload === true && review.noGitWrites === true &&
    review.preserveDailyPublication === true && review.preserveHistoricalMarkers === true && review.allowNewFencedClaim === true &&
    review.firstPromotionOnly === true && review.allProjectProductionAliasesApproved === true && review.rollbackOnConfirmedVerificationFailure === true &&
    review.expiryScope === 'admission-and-first-promotion' && review.rollbackAfterExpiryWithinLease === true && review.authorizeRoutineActivation === false,
    'software_recovery_finite_scope_required');
  const origin = review.origin;
  check(plain(origin) && run(origin.runId) && run(origin.attempt) && origin.runId !== env.GITHUB_RUN_ID && commit(origin.workflowHead) &&
    Number.isSafeInteger(origin.fence) && origin.fence > 0 && Number.isSafeInteger(origin.fence + 1), 'software_recovery_origin_required');
  return { origin, approved };
}

export function validateSoftwareStageRecovery({ env, review, document, originRun,
  originalReview, originalContext, manifest, buildOutput, changedPaths, now = Date.now() }) {
  const { origin, approved } = validateSoftwareStageRecoveryReview({ env, review, now });
  check(plain(originRun) && String(originRun.id) === origin.runId && String(originRun.run_attempt) === origin.attempt &&
    originRun.status === 'completed' && originRun.conclusion === 'failure' && originRun.event === 'workflow_dispatch' &&
    originRun.head_branch === 'main' && originRun.head_sha === origin.workflowHead && originRun.repository?.full_name === TARGET.repository &&
    originRun.path === '.github/workflows/ltc-software-release.yml' && String(originRun.actor?.id) === '268053325', 'software_recovery_origin_not_completed');
  const started = Date.parse(originRun.run_started_at), finished = Date.parse(originRun.updated_at);
  check(Number.isFinite(started) && Number.isFinite(finished) && started <= finished && finished <= now && finished <= approved,
    'software_recovery_origin_clock_invalid');
  check(plain(document) && document.schemaVersion === 1 && hash(document) === review.snapshotSha256 &&
    typeof review.originalPaused === 'boolean' && document.paused === review.originalPaused && document.restoreHold === false &&
    document.fence === origin.fence && document.lease?.fence === origin.fence && document.lease.runId === `software-${origin.runId}-${origin.attempt}` &&
    Number.isFinite(document.lease.expiresAt) && document.lease.publicationDate === undefined &&
    !document.softwareStageRecovery && plain(document.intents) && plain(document.receipts), 'software_recovery_snapshot_changed');
  // A paused recovery snapshot is not activation. Project a copy solely to use
  // the existing immutable baseline validator; no supplied object is changed.
  const baseline = { ...document, paused: false };
  check(hash(originalReview) === review.originalReviewSha256 && hash(originalContext) === review.originalContextSha256 &&
    originalReview.source === review.artifactSource && originalReview.implementationSha256 === review.artifactImplementationSha256,
    'software_recovery_original_review_changed');
  const computed = validateSoftwareReview(originalReview, { source: review.artifactSource, implementationSha256: review.artifactImplementationSha256,
    manifest, buildOutput, changedPaths, document: baseline, now: started, target: TARGET });
  check(same(computed, originalContext), 'software_recovery_original_context_changed');
  assertSoftwareContext(baseline, originalContext, now);
  check(review.priorReleaseSha256 === hash(document.latestRelease) && review.previousDeployment === document.latestRelease.deployment &&
    review.artifactManifestSha256 === hash(manifest) && review.buildOutputSha256 === hash(buildOutput) &&
    originalContext.previousDeployment === review.previousDeployment && originalContext.artifactManifestSha256 === review.artifactManifestSha256 &&
    originalContext.buildOutputSha256 === review.buildOutputSha256, 'software_recovery_artifact_binding_changed');
  const current = [], archived = [];
  for (const [key, item] of Object.entries(document.intents)) {
    check(plain(item) && item.operationId === key && Number.isSafeInteger(item.fence) && item.fence > 0 && item.fence <= origin.fence &&
      plain(item.payload) && hash(item.payload) === item.payloadSha256, 'software_recovery_intent_changed');
    if (item.fence === origin.fence) {
      check(item.runId === document.lease.runId, 'software_recovery_origin_intent_changed'); current.push(item);
    }
    if (key === review.stageOperationId) continue;
    const proof = item.proof, receipt = document.receipts[key];
    check(item.status === 'confirmed' && plain(proof) && proof.operationId === key && proof.payloadSha256 === item.payloadSha256 &&
      proof.status === 'applied' && plain(proof.proof) && hash(proof) === item.evidenceSha256 &&
      plain(receipt) && receipt.sha256 === hash(item) && same(receipt.receipt, item), 'software_recovery_receipt_changed');
    if (item.fence === origin.fence) archived.push(item);
  }
  check(Object.keys(document.receipts).every(key => Object.hasOwn(document.intents, key) && key !== review.stageOperationId), 'software_recovery_orphan_receipt');
  const stage = document.intents[review.stageOperationId];
  check(plain(stage) && hash(stage) === review.stageIntentSha256 && current.includes(stage) && stage.status === 'uncertain' &&
    stage.evidenceSha256 === null && !Object.hasOwn(stage, 'proof') && !Object.hasOwn(document.receipts, review.stageOperationId) &&
    same(stage.payload, { kind: 'vercel-stage', editionId: document.latestRelease.editionId, artifactPackageManifestSha256: review.artifactPackageManifestSha256,
      commit: review.artifactSource, buildOutputSha256: review.buildOutputSha256, artifactManifestSha256: review.artifactManifestSha256 }), 'software_recovery_stage_changed');
  check(current.length === review.artifactPartCount + 1 && archived.length === review.artifactPartCount, 'software_recovery_effect_set_changed');
  archived.sort((a, b) => a.payload.artifactBundleIndex - b.payload.artifactBundleIndex);
  const files = new Set(), generations = new Set();
  for (const [index, item] of archived.entries()) {
    const p = item.payload, leaf = item.proof.proof;
    check(p.kind === 'drive-evidence' && p.role === 'release-artifacts' && p.artifactBundleIndex === index && p.artifactBundleCount === review.artifactPartCount &&
      p.artifactPackageManifestSha256 === review.artifactPackageManifestSha256 && p.generation === releaseGeneration(document.lease) && id(p.fileId) && p.folderId === review.bindings.folderId && digest(p.sha256) &&
      Number.isSafeInteger(p.bytes) && p.bytes > 0 && p.bytes <= 3500000 &&
      leaf.fileId === p.fileId && leaf.folderId === p.folderId && leaf.sha256 === p.sha256 && leaf.length === p.bytes &&
      leaf.ownerPermissionId === review.bindings.ownerPermissionId && leaf.ownerOnly === true && leaf.downloadVerified === true,
      'software_recovery_archive_changed');
    files.add(p.fileId); generations.add(p.generation);
  }
  check(files.size === archived.length && generations.size === 1, 'software_recovery_archive_changed');
  return Object.freeze({ schemaVersion: 1, kind: 'validated-software-stage-recovery-preflight', reviewSha256: hash(review),
    snapshotSha256: review.snapshotSha256, stageIntentSha256: review.stageIntentSha256, originalContextSha256: review.originalContextSha256,
    priorReleaseSha256: review.priorReleaseSha256, originFence: origin.fence, artifactPartCount: archived.length,
    candidateDeployment: review.candidateDeployment, artifactSource: review.artifactSource, controllerSource: review.controllerSource,
    originalDailyVerifiedAt: document.latestRelease.verifiedAt, validationOnly: true, stageReconciliationRequired: true,
    archiveRestoreVerified: false, protectedBytesVerified: false, apiHandlersVerified: false, mutationAuthorized: false });
}
