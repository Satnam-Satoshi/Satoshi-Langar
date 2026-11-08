import { createHash } from 'node:crypto';
import { DurableCloudState } from './cloud-ltc-state.mjs';

// Review-only controller. No credential lookup, provider mutation, workflow
// dispatch, unpause, or production wiring. The caller must supply verified reads.
const check = (value, code) => { if (!value) throw Error(code); };
const copy = structuredClone;
export const uploadRecoveryHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const commit = value => /^[a-f0-9]{40}$/.test(value ?? '');
const id = value => /^[a-z0-9][a-z0-9_-]{0,79}$/.test(value ?? '');
const terminal = value => ['confirmed', 'not-applied'].includes(value.status);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const historyKey = 'uploadOnlyLeaseRecoveries';
const targets = ['https://satnamsatoshi.com', 'https://ltcmagazine.org'];

function validateReview(review, expectedReviewSha256, now) {
  check(digest(expectedReviewSha256) && uploadRecoveryHash(review) === expectedReviewSha256,
    'upload_recovery_review_pin_mismatch');
  check(review?.schemaVersion === 1 && review.kind === 'reviewed-upload-only-lease-recovery' &&
    review.approved === true && review.archiveOnly === true && review.pauseAfter === true &&
    review.authorizePublication === false && review.repository === 'Satnam-Satoshi/Satoshi-Langar' &&
    review.ledgerKey === 'website', 'upload_recovery_review_required');
  const start = Date.parse(review.approvedAt), end = Date.parse(review.expiresAt);
  check(Number.isFinite(now) && Number.isFinite(start) && start <= now && end > now && end - start <= 21_600_000,
    'upload_recovery_review_expired');
  check(digest(review.snapshotSha256) && digest(review.latestReleaseSha256) && digest(review.archiveHeadSha256) &&
    digest(review.sourcePolicySha256) && commit(review.sourceHead) &&
    review.origin && /^[1-9]\d{0,29}$/.test(review.origin.runId ?? '') &&
    /^[1-9]\d{0,9}$/.test(review.origin.attempt ?? '') && commit(review.origin.workflowHead) &&
    Number.isSafeInteger(review.origin.fence) && review.origin.fence > 0 &&
    ['schedule', 'workflow_dispatch'].includes(review.origin.event), 'upload_recovery_origin_required');
  check(typeof review.snapshotVersion === 'string' && review.snapshotVersion.length > 0 && review.snapshotVersion.length <= 2048 &&
    /^[A-Za-z0-9_-]{8,160}$/.test(review.folderId ?? '') &&
    /^[A-Za-z0-9_-]{8,160}$/.test(review.ownerPermissionId ?? '') &&
    new RegExp(`^f${review.origin.fence}-[a-f0-9]{16}$`).test(review.generation ?? '') &&
    digest(review.artifactPackageManifestSha256) && Number.isInteger(review.bundleCount) &&
    review.bundleCount > 0 && review.bundleCount <= 64 && Number.isInteger(review.confirmedCount) &&
    review.confirmedCount >= 0 && Array.isArray(review.pendingOperationIds) && review.pendingOperationIds.length > 0 &&
    review.pendingOperationIds.every(id) && new Set(review.pendingOperationIds).size === review.pendingOperationIds.length &&
    review.confirmedCount + review.pendingOperationIds.length === review.bundleCount,
    'upload_recovery_generation_required');
}

function validateSnapshot(document, review, now) {
  check(uploadRecoveryHash(document) === review.snapshotSha256 && document.restoreHold === false &&
    document.fence === review.origin.fence && document.lease?.fence === review.origin.fence &&
    document.lease.runId === `gha-${review.origin.runId}-${review.origin.attempt}` &&
    document.lease.expiresAt <= now && uploadRecoveryHash(document.latestRelease) === review.latestReleaseSha256 &&
    uploadRecoveryHash(document.archiveHead) === review.archiveHeadSha256,
    'upload_recovery_snapshot_changed');
  check(document.latestRelease && document.archiveHead &&
    document.latestRelease.summary?.operationId === document.archiveHead.summaryOperationId,
    'upload_recovery_public_baseline_required');
  const rows = Object.values(document.intents).filter(row => row.fence === document.fence);
  check(rows.length === review.bundleCount && rows.every(row => row.runId === document.lease.runId) &&
    Object.values(document.intents).every(row => row.fence === document.fence ||
      (row.runId !== document.lease.runId && terminal(row))), 'upload_recovery_non_archive_intents');
  const pending = rows.filter(row => row.status === 'pending');
  check(same(pending.map(row => row.operationId).sort(), [...review.pendingOperationIds].sort()) &&
    rows.filter(row => row.status === 'confirmed').length === review.confirmedCount &&
    rows.every(row => ['pending', 'confirmed'].includes(row.status)) &&
    new Set(rows.map(row => row.payload?.fileId)).size === rows.length,
    'upload_recovery_nonterminal_shape_changed');
  const ordered = rows.toSorted((a, b) => a.payload?.artifactBundleIndex - b.payload?.artifactBundleIndex);
  for (const [index, row] of ordered.entries()) {
    const p = row.payload;
    check(p?.kind === 'drive-evidence' && p.role === 'release-artifacts' && p.generation === review.generation &&
      p.artifactPackageManifestSha256 === review.artifactPackageManifestSha256 &&
      p.artifactBundleCount === review.bundleCount && p.artifactBundleIndex === index &&
      p.folderId === review.folderId && /^[A-Za-z0-9_-]{8,160}$/.test(p.fileId ?? '') && digest(p.sha256) &&
      Number.isSafeInteger(p.bytes) && p.bytes > 0 && uploadRecoveryHash(p) === row.payloadSha256,
      'upload_recovery_non_archive_intents');
    if (row.status === 'pending') {
      check(row.evidenceSha256 === null && !Object.hasOwn(row, 'proof') && !Object.hasOwn(document.receipts, row.operationId),
        'upload_recovery_pending_has_receipt');
    } else {
      const proof = row.proof, remote = proof?.proof;
      check(proof?.operationId === row.operationId && proof.payloadSha256 === row.payloadSha256 && proof.status === 'applied' &&
        remote?.fileId === p.fileId && remote.folderId === p.folderId && remote.sha256 === p.sha256 &&
        remote.length === p.bytes && remote.ownerPermissionId === review.ownerPermissionId && remote.ownerOnly === true && remote.downloadVerified === true,
        'upload_recovery_confirmed_proof_required');
    }
  }
  const history = document[historyKey] ?? [];
  check(Array.isArray(history) && history.length < 16 && history.every(record => record.originalLease?.fence !== document.fence),
    'upload_recovery_history_conflict');
  return ordered;
}

function fresh(proof, now) {
  const observed = Date.parse(proof?.observedAt);
  check(Number.isFinite(observed) && observed <= now && now - observed <= 300_000,
    'upload_recovery_stale_proof');
}
function verifyOrigin(proof, review, now) {
  fresh(proof, now);
  check(proof.repository === review.repository && String(proof.id) === review.origin.runId &&
    String(proof.run_attempt) === review.origin.attempt && proof.status === 'completed' &&
    ['failure', 'cancelled', 'timed_out'].includes(proof.conclusion) && proof.head_branch === 'main' &&
    proof.head_sha === review.origin.workflowHead && proof.event === review.origin.event &&
    proof.path === '.github/workflows/ltc-daily-publication.yml', 'upload_recovery_origin_not_completed');
}
function verifyControls(proof, review, now) {
  fresh(proof, now);
  check(proof.repository === review.repository && proof.sourceHead === review.sourceHead &&
    proof.sourcePolicySha256 === review.sourcePolicySha256 && proof.cloudPublicationEnabled === false &&
    proof.localPublisherDisabled === true && proof.otherWritersStopped === true &&
    digest(proof.writerEvidenceSha256), 'upload_recovery_writers_not_stopped');
}
function verifyPublic(proof, document, now) {
  fresh(proof, now);
  const latest = document.latestRelease;
  check(proof.artifactManifestSha256 === latest.artifactManifestSha256 &&
    Number.isSafeInteger(proof.manifestCount) && proof.manifestCount > 0 &&
    Array.isArray(proof.domains) && proof.domains.length === targets.length &&
    targets.every(domain => proof.domains.filter(row => row.domain === domain &&
      row.deployment === latest.deployment && row.allManifestBytesVerified === true &&
      row.verifiedCount === proof.manifestCount).length === 1), 'upload_recovery_public_baseline_changed');
}
function verifyConfirmed(proof, row, now) {
  fresh(proof, now);
  const p = row.payload;
  check(proof.operationId === row.operationId && proof.payloadSha256 === row.payloadSha256 &&
    proof.fileId === p.fileId && proof.folderId === p.folderId && proof.sha256 === p.sha256 &&
    proof.length === p.bytes && proof.ownerPermissionId === row.proof.proof.ownerPermissionId && proof.ownerOnly === true && proof.downloadVerified === true,
    'upload_recovery_confirmed_readback_changed');
}

// Reconstruct the exact before-state to recognize only a completed, unchanged
// application of this review. The full after-state digest must come from the
// independently retained controller receipt, never from the ledger being read.
function alreadyRecovered(document, review, reviewHash, expectedStateSha256) {
  const history = document[historyKey];
  if (!Array.isArray(history) || history.at(-1)?.reviewSha256 !== reviewHash) return false;
  check(digest(expectedStateSha256), 'upload_recovery_replay_pin_required');
  check(uploadRecoveryHash(document) === expectedStateSha256, 'upload_recovery_replay_changed');
  const record = history.at(-1);
  check(record.schemaVersion === 1 && record.status === 'recovered-paused' && document.paused === true &&
    document.lease === null && same(record.review, review) && record.originalSnapshotSha256 === review.snapshotSha256 &&
    same(record.originalPending.map(row => row.operationId).sort(), [...review.pendingOperationIds].sort()),
    'upload_recovery_replay_changed');
  const before = copy(document);
  for (const original of record.originalPending) {
    const { intent, receipt } = terminalPending(original, record.proof);
    check(same(document.intents[original.operationId], intent) && same(document.receipts[original.operationId], receipt),
      'upload_recovery_replay_changed');
    before.intents[original.operationId] = copy(original);
    delete before.receipts[original.operationId];
  }
  before.lease = copy(record.originalLease); before.paused = record.originalPaused;
  if (record.hadHistory) before[historyKey] = history.slice(0, -1); else delete before[historyKey];
  check(uploadRecoveryHash(before) === review.snapshotSha256, 'upload_recovery_replay_changed');
  return true;
}
function terminalPending(original, recoveryProof) {
  const proof = { operationId: original.operationId, payloadSha256: original.payloadSha256,
    status: 'not-applied', proof: { basis: 'completed-origin-and-never-durably-authorized',
      originalStatus: 'pending', authorizationDurablyGranted: false, recoveryProofSha256: uploadRecoveryHash(recoveryProof) } };
  const intent = { ...copy(original), status: 'not-applied', evidenceSha256: uploadRecoveryHash(proof), proof };
  return { intent, receipt: { receipt: copy(intent), sha256: uploadRecoveryHash(intent) } };
}
async function validateState(value) {
  await new DurableCloudState({ read: async () => ({ value }) }, 'website').inspect();
  check(JSON.stringify({ schemaVersion: 1, key: 'website', value }).length <= 900_000,
    'state_capacity_exceeded');
}

export async function recoverUploadOnlyLease({ state, review: input, expectedReviewSha256, expectedRecoveredStateSha256, dependencies: d }) {
  // Clone once: injected verification callbacks cannot mutate the approved scope.
  const review = copy(input);
  check(state instanceof DurableCloudState && state.key === 'website' &&
    d && ['now', 'readOrigin', 'verifyStoppedWriters', 'verifyPublicBaseline', 'verifyConfirmedUpload']
      .every(name => typeof d[name] === 'function'), 'upload_recovery_configuration_required');
  validateReview(review, expectedReviewSha256, d.now());
  const initial = await state.adapter.read('website');
  await validateState(initial.value);
  if (alreadyRecovered(initial.value, review, expectedReviewSha256, expectedRecoveredStateSha256)) {
    return { status: 'recovered-paused', alreadyRecovered: true, conditionalWrites: 0,
      stateSha256: uploadRecoveryHash(initial.value), publicationPerformed: false, effectsReissued: false };
  }
  check(initial.version === review.snapshotVersion, 'upload_recovery_revision_changed');
  const document = initial.value, rows = validateSnapshot(document, review, d.now());
  // The initial writer barrier is checked before expensive evidence reads.
  const controls = await d.verifyStoppedWriters(copy(review)); verifyControls(controls, review, d.now());
  const origin = await d.readOrigin(copy(review.origin)); verifyOrigin(origin, review, d.now());
  const publicProof = await d.verifyPublicBaseline(copy(document.latestRelease)); verifyPublic(publicProof, document, d.now());
  const confirmed = [];
  for (const row of rows.filter(row => row.status === 'confirmed')) {
    const proof = await d.verifyConfirmedUpload(copy(row)); verifyConfirmed(proof, row, d.now()); confirmed.push(proof);
  }
  // Recheck both barriers immediately before the single CAS, then reject a
  // concurrent journal revision. Production wiring must use monotonic revisions
  // (Google Docs requiredRevisionId), not GitHub's content-SHA versioning.
  const finalControls = await d.verifyStoppedWriters(copy(review)); verifyControls(finalControls, review, d.now());
  const finalOrigin = await d.readOrigin(copy(review.origin)); verifyOrigin(finalOrigin, review, d.now());
  validateReview(review, expectedReviewSha256, d.now());
  verifyPublic(publicProof, document, d.now());
  for (const [index, row] of rows.filter(row => row.status === 'confirmed').entries()) verifyConfirmed(confirmed[index], row, d.now());
  const current = await state.adapter.read('website');
  check(current.version === initial.version && uploadRecoveryHash(current.value) === review.snapshotSha256,
    'upload_recovery_snapshot_changed');
  const proof = { schemaVersion: 1, reviewSha256: expectedReviewSha256, snapshotSha256: review.snapshotSha256,
    origin: finalOrigin, controls: finalControls, publicBaseline: publicProof, confirmedReadbacks: confirmed,
    basis: 'pending-means-provider-authorization-was-never-durably-granted',
    externalAbsenceUsedAsAuthorizationProof: false, effectsReissued: false, publicationPerformed: false };
  const next = copy(document);
  const pending = rows.filter(row => row.status === 'pending');
  for (const row of pending) {
    const result = terminalPending(row, proof); next.intents[row.operationId] = result.intent;
    next.receipts[row.operationId] = result.receipt;
  }
  next.paused = true; next.lease = null;
  next[historyKey] = [...(document[historyKey] ?? []), { schemaVersion: 1, status: 'recovered-paused',
    reviewSha256: expectedReviewSha256, review, originalSnapshotSha256: review.snapshotSha256,
    originalLease: copy(document.lease), originalPaused: document.paused,
    hadHistory: Object.hasOwn(document, historyKey), originalPending: copy(pending), proof }];
  await validateState(next);
  // No awaits between final scope/freshness checks and the write invocation.
  // Earlier awaited provider/state reads can otherwise outlive their proof.
  validateReview(review, expectedReviewSha256, d.now());
  verifyControls(finalControls, review, d.now());
  verifyOrigin(finalOrigin, review, d.now());
  verifyPublic(publicProof, document, d.now());
  for (const [index, row] of rows.filter(row => row.status === 'confirmed').entries()) verifyConfirmed(confirmed[index], row, d.now());
  // Production transport invokes this synchronously after its own awaited
  // revision, OAuth and privacy reads, immediately before the actual POST.
  if (d.armWriteGuard) d.armWriteGuard(() => {
    validateReview(review, expectedReviewSha256, d.now());
    verifyControls(finalControls, review, d.now());
    verifyOrigin(finalOrigin, review, d.now());
    verifyPublic(publicProof, document, d.now());
    for (const [index, row] of rows.filter(row => row.status === 'confirmed').entries()) verifyConfirmed(confirmed[index], row, d.now());
  });
  // Exactly one write attempt. A lost response is inspected, never retried.
  let writeError;
  try { await state.adapter.conditionalWrite('website', next, initial.version); }
  catch (error) { writeError = error; }
  let readback;
  try { readback = await state.adapter.read('website'); }
  catch { throw Error('upload_recovery_write_outcome_uncertain'); }
  if (!same(readback.value, next)) {
    if (writeError?.message === 'state_conflict') throw Error('state_conflict');
    throw Error('upload_recovery_write_outcome_uncertain');
  }
  await validateState(readback.value);
  return { status: 'recovered-paused', alreadyRecovered: false, conditionalWrites: 1,
    stateSha256: uploadRecoveryHash(next), originalSnapshotSha256: review.snapshotSha256,
    confirmedRetained: review.confirmedCount, pendingRetired: pending.length, fence: next.fence,
    lostWriteResponseRecovered: Boolean(writeError), publicationPerformed: false, effectsReissued: false };
}
