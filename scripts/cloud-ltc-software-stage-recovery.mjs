import { DurableCloudState } from './cloud-ltc-state.mjs';
import { validateSoftwareStageRecovery, validateSoftwareStageRecoveryReview, softwareRecoveryHash as hash } from './cloud-ltc-software-stage-recovery-policy.mjs';
import { finishConfirmedStagedRelease, assertReleaseCapacity } from './cloud-ltc-production.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
import { assertSoftwareContext, assertSoftwarePromotionWindow, softwareCheckpointFields } from './lib/ltc-software-release.mjs';
import { createHash } from 'node:crypto';
import { captureUploadQuarantineBinding, assertUploadQuarantineBinding } from './cloud-ltc-upload-quarantine-proof.mjs';
const check = (value, code) => { if (!value) throw Error(code); };
const same = (a, b) => hash(a) === hash(b);
const suffix = value => createHash('sha256').update(value).digest('hex').slice(0, 40);

// No source change, artifact upload, build or deploy path exists here. The caller
// supplies bounded read-only verification and the shared guarded promotion tail.
export async function continueReviewedSoftwareStage({ env, state, review, dependencies: d }) {
  review = structuredClone(review); env = { ...env };
  const now = () => d.now?.() ?? Date.now();
  validateSoftwareStageRecoveryReview({ env, review, now: now() });
  check(state instanceof DurableCloudState && state.key === 'website', 'software_recovery_state_required');
  const original = await state.adapter.read('website');
  const document = await new DurableCloudState({ read: async () => original }, 'website').inspect();
  const uploadQuarantineBinding = captureUploadQuarantineBinding(document, { env });
  check(hash(document) === review.snapshotSha256, 'software_recovery_snapshot_changed');
  const originRun = await d.github(`/actions/runs/${review.origin.runId}/attempts/${review.origin.attempt}`);
  await d.verifyControllerAndPolicy();
  await d.verifyProjectAndPointers();
  const restored = await d.restore(review, document);
  const policyArgs = { env, review, document, originRun, originalReview: restored.originalReview, originalContext: restored.originalContext, manifest: restored.manifest, buildOutput: restored.buildOutput, changedPaths: restored.changedPaths };
  validateSoftwareStageRecovery({ ...policyArgs, now: now() });
  check(hash(restored.previousManifest) === document.latestRelease.artifactManifestSha256, 'software_recovery_previous_manifest_changed');
  const data = structuredClone(restored), stage = document.intents[review.stageOperationId];
  await d.save({ status: 'checking-existing-software-stage', effectsReissued: false });
  // Callback MUST verify raw metadata, the complete static manifest and all four
  // protected APIs before returning the exact existing provider proof below.
  const remoteProof = structuredClone(await d.verifyProtectedCandidate({ review: structuredClone(review), stage: structuredClone(stage), manifest: structuredClone(data.manifest), buildOutput: structuredClone(data.buildOutput) }));
  check(/^[a-z0-9-]+\.vercel\.app$/.test(remoteProof?.url ?? '') && same(remoteProof, {
    kind: 'vercel-stage', deployment: review.candidateDeployment, url: remoteProof.url,
    source: review.artifactSource, buildOutputSha256: review.buildOutputSha256, artifactManifestSha256: review.artifactManifestSha256,
  }), 'software_recovery_candidate_unverified');
  await d.verifyPublic(data.previousManifest);
  await d.verifyProjectAndPointers();
  await d.verifyControllerAndPolicy();
  validateSoftwareStageRecovery({ ...policyArgs, now: now() });

  const proof = { operationId: stage.operationId, payloadSha256: stage.payloadSha256, status: 'applied', proof: remoteProof };
  const confirmedStage = { ...structuredClone(stage), status: 'confirmed', evidenceSha256: hash(proof), proof };
  const lease = { runId: `software-recovery-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`, fence: document.fence + 1, expiresAt: now() + 3600000 };
  const stageBinding = { operationId: stage.operationId, intentSha256: hash(confirmedStage), reviewSha256: hash(review) };
  const context = { schemaVersion: 1, kind: 'software-stage-recovery', reviewSha256: hash(review), origin: structuredClone(review.origin),
    artifactSource: review.artifactSource, controllerSource: review.controllerSource, controllerImplementationSha256: review.controllerImplementationSha256,
    candidateDeployment: review.candidateDeployment, originalContextSha256: review.originalContextSha256, priorReleaseSha256: review.priorReleaseSha256,
    owner: { runId: lease.runId, fence: lease.fence } };
  const marker = { schemaVersion: 1, status: 'claimed', review: structuredClone(review), reviewSha256: hash(review), context,
    owner: context.owner, stageBinding, originalLease: structuredClone(document.lease), originalStageIntent: structuredClone(stage),
    originalSnapshotSha256: review.snapshotSha256, claimedAt: new Date(now()).toISOString() };
  const next = structuredClone(document); next.fence = lease.fence; next.lease = lease; next.paused = false;
  next.intents[stage.operationId] = confirmedStage;
  next.receipts[stage.operationId] = { receipt: structuredClone(confirmedStage), sha256: hash(confirmedStage) };
  next.softwareStageRecovery = marker;
  await new DurableCloudState({ read: async () => ({ value: next }) }, 'website').inspect();
  const operationReceipts = Object.values(next.intents).filter(row => row.fence === review.origin.fence).map(row => ({ operationId: row.operationId, payload: row.payload, status: 'confirmed', evidenceSha256: row.evidenceSha256, proof: row.proof, appliedNow: false }));
  assertReleaseCapacity({ document: next, manifest: data.manifest, receipts: operationReceipts, tailContext: { publicationProvenance: document.latestRelease.publicationProvenance, softwareRelease: data.originalContext, continuation: context, candidate: { deployment: review.candidateDeployment, url: remoteProof.url }, previousDeployment: review.previousDeployment, releaseCommit: review.artifactSource, editionId: document.latestRelease.editionId } });
  await d.save({ status: 'claiming-software-recovery-fence', originalFence: document.fence, fence: lease.fence });
  // One exact revision-CAS reconciles the proved original stage in its ORIGINAL
  // fence and creates a NEW writer. No origin impersonation or blind lease reset.
  validateSoftwareStageRecovery({ ...policyArgs, now: now() });
  await state.adapter.conditionalWrite('website', next, original.version);

  const originalIds = Object.keys(next.intents);
  const retained = value => { const copy = structuredClone(value); for (const key of ['fence','lease','paused','intents','receipts','softwareStageRecovery','latestRelease','archiveHead']) delete copy[key]; return copy; };
  const promoteId = `promote-${suffix(review.candidateDeployment)}`, rollbackId = `rollback-${suffix(review.candidateDeployment)}`;
  const promotePayload = { kind: 'vercel-promote', editionId: document.latestRelease.editionId, artifactPackageManifestSha256: review.artifactPackageManifestSha256,
    artifactManifestSha256: review.artifactManifestSha256, deployment: review.candidateDeployment, previous: review.previousDeployment, commit: review.artifactSource };
  const rollbackPayload = { kind: 'vercel-rollback', artifactPackageManifestSha256: review.artifactPackageManifestSha256, failed: review.candidateDeployment,
    restore: review.previousDeployment, commit: review.artifactSource, previousManifestSha256: document.latestRelease.artifactManifestSha256 };
  function exactHistory(value, successOnly = false) {
    assertUploadQuarantineBinding(value, uploadQuarantineBinding);
    check(value.fence === lease.fence && value.lease?.runId === lease.runId && value.lease.fence === lease.fence && value.lease.expiresAt > now() && value.paused === false && value.restoreHold === false &&
      same(retained(value), retained(document)) && same(value.softwareStageRecovery, marker) && same(value.latestRelease, document.latestRelease) && same(value.archiveHead, document.archiveHead), 'software_recovery_history_changed');
    for (const id of originalIds) check(same(value.intents[id], next.intents[id]) && same(value.receipts[id], next.receipts[id]), 'software_recovery_history_changed');
    const added = Object.keys(value.intents).filter(id => !originalIds.includes(id));
    check(added.every(id => id === promoteId || (!successOnly && id === rollbackId)) && (!successOnly || added.length === 1 && added[0] === promoteId), 'software_recovery_effect_outside_scope');
    for (const id of added) {
      const row = value.intents[id];
      check(row.runId === lease.runId && row.fence === lease.fence && same(row.payload, id === promoteId ? promotePayload : rollbackPayload) && ['pending','uncertain','confirmed'].includes(row.status), 'software_recovery_effect_outside_scope');
      if (id === rollbackId) check(value.intents[promoteId]?.status === 'confirmed', 'software_recovery_effect_outside_scope');
      if (successOnly) check(row.status === 'confirmed' && same(row.proof?.proof, { kind: 'vercel-promote', pointers: TARGET.domains.map(domain => ({ domain, deployment: review.candidateDeployment })), previous: review.previousDeployment, deployment: review.candidateDeployment }), 'software_recovery_effect_outside_scope');
    }
    check(Object.keys(value.receipts).every(id => originalIds.includes(id) || added.includes(id)), 'software_recovery_effect_outside_scope');
  }
  const beforeMutation = async source => {
    check(source === review.artifactSource, 'software_recovery_artifact_binding_changed');
    const current = await state.inspect(); exactHistory(current);
    if (current.intents[promoteId]?.status === 'uncertain') assertSoftwarePromotionWindow(review, now());
    await d.verifyControllerAndPolicy();
    // Only the new proved owner can renew itself; never the failed origin.
    await state.renew(lease, 3600000);
  };
  const completeCheckpoint = async ({ summaryId, summaryPayload, backup, publicVerifiedAt }) => {
    exactHistory(JSON.parse(backup.bytes), true);
    const snapshot = await state.adapter.read('website');
    const value = await new DurableCloudState({ read: async () => snapshot }, 'website').inspect();
    assertUploadQuarantineBinding(value, uploadQuarantineBinding);
    const summary = value.intents[summaryId];
    const expectedLatest = { source: review.artifactSource, editionId: document.latestRelease.editionId,
      ...softwareCheckpointFields(data.originalContext, publicVerifiedAt), deployment: review.candidateDeployment,
      publicationProvenance: document.latestRelease.publicationProvenance, artifactManifestSha256: review.artifactManifestSha256,
      artifactPackageManifestSha256: review.artifactPackageManifestSha256, continuation: context,
      summary: { archivedStateSha256: backup.sha256, operationId: summaryId, payloadSha256: hash(summaryPayload), fileId: summaryPayload.fileId,
        folderId: summaryPayload.folderId, sha256: summaryPayload.sha256, length: summaryPayload.bytes } };
    check(value.fence === lease.fence && value.lease?.runId === lease.runId && value.lease.fence === lease.fence && value.lease.expiresAt > now() && value.paused === false && value.restoreHold === false &&
      same(retained(value), retained(document)) && same(value.softwareStageRecovery, marker) && same(value.latestRelease, expectedLatest) &&
      Object.keys(value.intents).length === 1 && Object.keys(value.receipts).length === 1 && summary?.status === 'confirmed' &&
      summary.runId === lease.runId && summary.fence === lease.fence && same(summary.payload, summaryPayload) && summary.payload.role === 'release-summary' &&
      summaryPayload.folderId === review.bindings.folderId && summary.proof.proof.ownerOnly === true && summary.proof.proof.downloadVerified === true &&
      summary.proof.proof.ownerPermissionId === review.bindings.ownerPermissionId && value.archiveHead?.summaryOperationId === summaryId && value.archiveHead.backupSha256 === backup.sha256,
      'software_recovery_checkpoint_changed');
    const completed = structuredClone(value); completed.lease = null; completed.paused = document.paused;
    completed.softwareStageRecovery.status = 'completed';
    completed.softwareStageRecovery.completion = { outcome: 'existing-software-stage-published', completedAt: new Date(now()).toISOString(),
      summaryOperationId: summaryId, archivedStateSha256: backup.sha256, originalDailyVerifiedAt: document.latestRelease.verifiedAt,
      softwareVerifiedAt: publicVerifiedAt, artifactRebuilt: false, stageReissued: false, originalFence: document.fence, recoveryFence: lease.fence };
    await new DurableCloudState({ read: async () => ({ value: completed }) }, 'website').inspect();
    await state.adapter.conditionalWrite('website', completed, snapshot.version);
    check(same((await state.adapter.read('website')).value, completed), 'software_recovery_checkpoint_readback_changed');
  };
  try {
    check(same((await state.adapter.read('website')).value, next), 'software_recovery_claim_readback_changed');
    const cli = d.createMutation({ state, lease, historicalStage: stageBinding,
      assertPromotionFreshness: (value, stamp) => { exactHistory(value); assertSoftwarePromotionWindow(review, stamp); assertSoftwareContext(value, data.originalContext, stamp); } });
    const result = await finishConfirmedStagedRelease({ admission: { state, lease }, editionId: document.latestRelease.editionId,
      releaseCommit: review.artifactSource, candidate: { deployment: review.candidateDeployment, url: remoteProof.url }, previousDeployment: review.previousDeployment,
      manifest: data.manifest, rollbackManifest: data.previousManifest, artifactPackageManifestSha256: review.artifactPackageManifestSha256,
      publicationProvenance: document.latestRelease.publicationProvenance, softwareRelease: data.originalContext, continuation: context,
      target: TARGET, vercel: d.vercel, cli, beforeMutation, verifyProtected: d.verifyProtected, verifyPublic: d.verifyPublic,
      evidenceConfig: d.evidenceConfig, allocate: d.allocate, providerFactory: d.providerFactory, token: d.token, fetchImpl: d.fetchImpl,
      operationReceipts, saveReceipt: d.save, env, completeCheckpoint, uploadQuarantineBinding,
      beforeSummary: async () => exactHistory(await state.inspect(), true), verifyBackup: async backup => exactHistory(JSON.parse(backup.bytes), true) });
    return { ...result, mode: 'reviewed-software-stage-recovery', originalFence: document.fence, recoveryFence: lease.fence, stageReissued: false, dailyPublished: false };
  } catch (error) {
    // Preserve every uncertain effect. A held failure is not a retry permission.
    try { const snapshot = await state.adapter.read('website'), value = snapshot.value;
      if (value?.lease?.runId === lease.runId && value.lease.fence === lease.fence && value.softwareStageRecovery?.reviewSha256 === hash(review)) {
        const held = structuredClone(value); held.paused = true; held.softwareStageRecovery.status = 'held';
        await state.adapter.conditionalWrite('website', held, snapshot.version);
      }
    } catch {}
    throw error;
  }
}
