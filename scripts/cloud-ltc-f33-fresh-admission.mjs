import { validPublicationDate, publicationDate } from './cloud-ltc-daily-admission.mjs';
import { createHash } from 'node:crypto';

// Founder-owned website-only repair. Pure proposal/transition validation, not an
// authentication mechanism. The protected runner must authenticate owner approval,
// hold the shared writer group and exclude old executable revisions before supplying
// this configuration. Never read configuration from the ledger itself.
export const f33Digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const check = (v, code) => { if (!v) throw Error(`f33_fresh_${code}`); };
const sha = v => /^[a-f0-9]{64}$/.test(v ?? '');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const origin = 'gha-43608206507-1';
const generation = 'f33-7092158f2193ac73';
const packageHash = 'e83bf0e6aeb88e01f7fb49bfa5d602f5319a023971f6cfdfc0ffade7a1de4727';

export function assertF33ArchivedLineage(document) {
  const r = document?.f33Retirement;
  if (!r) return;
  check(r.status === 'retired-paused' && r.appliedRecordSchemaVersion === 1 &&
    r.outcome === 'UNKNOWN' && r.unknownAccepted === false && r.requiresOldGenerationBan === true &&
    r.effectsReissued === false && r.publicationPerformed === false, 'archive_invalid');
  check(Array.isArray(r.originalRows) && r.originalRows.length === 51 &&
    r.originalRows.every((row, i) => row.runId === origin && row.fence === 33 &&
      row.status === (i < 34 ? 'confirmed' : i === 34 ? 'uncertain' : 'pending') &&
      row.payload?.generation === generation && row.payload.artifactPackageManifestSha256 === packageHash &&
      row.payloadSha256 === f33Digest(row.payload)) && Object.keys(r.originalReceipts ?? {}).length === 34, 'archive_invalid');
  const ids = new Set(r.originalRows.map(row => row.operationId));
  const files = new Set(r.originalRows.map(row => row.payload.fileId));
  check(ids.size === 51 && files.size === 51, 'archive_invalid');
  check(Number.isSafeInteger(document.fence) && document.fence >= 34 && (!document.lease || document.lease.fence > 34 && document.lease.runId !== origin), 'old_lease');
  for (const row of Object.values(document.intents ?? {})) {
    check(!ids.has(row.operationId) && row.runId !== origin && row.fence !== 33 &&
      !files.has(row.payload?.fileId) && row.payload?.generation !== generation &&
      row.payload?.artifactPackageManifestSha256 !== packageHash, 'old_lineage');
  }
  check(Object.keys(document.receipts ?? {}).every(id => !ids.has(id)), 'old_receipt');
}

function configCheck(c) {
  check(c?.schemaVersion === 1 && c.kind === 'f33-fresh-website-admission' &&
    ['snapshotSha256', 'retirementSha256', 'implementationSha256', 'writerExclusionSha256', 'completionReceiptSha256'].every(k => sha(c[k])) &&
    /^[a-f0-9]{40}$/.test(c.sourceCommit ?? '') && /^dpl_[A-Za-z0-9_]+$/.test(c.previousDeployment ?? '') &&
    validPublicationDate(c.publicationDate) && c.publicationDate >= '2026-11-15' &&
    /^[1-9]\d*$/.test(c.ownerRunId ?? '') && c.ownerAttempt === 1 &&
    c.websiteOnly === true && c.allowOldGenerationReplay === false && c.acceptUnknown === false,
    'review_required');
}

// Result is a proposal only. One authenticated, reviewed CAS and exact readback
// are required; never apply via setPaused or retry a lost acknowledgement.
export function proposeF33FreshAdmission(snapshot, configuration) {
  const c = structuredClone(configuration); configCheck(c); assertF33ArchivedLineage(snapshot);
  check(snapshot?.f33Retirement && f33Digest(snapshot) === c.snapshotSha256 &&
    f33Digest(snapshot.f33Retirement) === c.retirementSha256 && snapshot.paused === true &&
    snapshot.restoreHold === false && snapshot.fence === 34 && snapshot.lease === null &&
    !snapshot.f33FreshAdmission && snapshot.latestRelease?.deployment === c.previousDeployment &&
    Object.values(snapshot.intents).every(row => ['confirmed', 'not-applied'].includes(row.status)), 'snapshot_changed');
  const original = structuredClone(snapshot), r = original.f33Retirement;
  delete original.f33Retirement; Object.assign(original, r.originalFields);
  for (const row of r.originalRows) original.intents[row.operationId] = row;
  Object.assign(original.receipts, r.originalReceipts);
  check(f33Digest(original) === r.originalSnapshotSha256, 'archive_binding');
  const next = structuredClone(snapshot);
  next.f33FreshAdmission = { configuration: c, configurationSha256: f33Digest(c), unknownAccepted: false, oldGenerationBanned: true };
  next.paused = false;
  return next;
}

// Called at the shared provider CAS boundary, including direct recovery writes.
// A matching externally supplied protected review is mandatory on every write.
export function assertF33Transition(previous, next, configuration, { now = Date.now() } = {}) {
  if (!previous?.f33Retirement) {
    check(!next?.f33Retirement && !next?.f33FreshAdmission, 'dedicated_retirement_required');
    return;
  }
  configCheck(configuration);
  assertF33ArchivedLineage(previous); assertF33ArchivedLineage(next);
  check(same(previous.f33Retirement, next.f33Retirement) &&
    f33Digest(previous.f33Retirement) === configuration.retirementSha256, 'archive_changed');
  if (!previous.f33FreshAdmission) {
    check(same(next, proposeF33FreshAdmission(previous, configuration)), 'admission_required');
    return;
  }
  const admission = previous.f33FreshAdmission;
  check(admission.configurationSha256 === f33Digest(configuration) && same(admission.configuration, configuration) &&
    admission.unknownAccepted === false && admission.oldGenerationBanned === true &&
    same(admission, next.f33FreshAdmission), 'admission_changed');
  for (const [id, row] of Object.entries(next.intents ?? {})) {
    if (!Object.hasOwn(previous.intents ?? {}, id)) check(row.fence > 34 && row.runId !== origin, 'old_intent');
  }
  if (next.lease) {
    const today = publicationDate(now);
    check(next.lease.publicationDate === today && today >= configuration.publicationDate, 'current_date_required');
  }
  if (!same(previous.latestRelease, next.latestRelease)) {
    const release = next.latestRelease, intent = next.intents?.[release?.summary?.operationId];
    check(/^[a-f0-9]{40}$/.test(release?.source ?? '') && /^dpl_[A-Za-z0-9]+$/.test(release?.deployment ?? '') &&
      sha(release?.artifactManifestSha256) && intent?.status === 'confirmed' &&
      intent.fence > 34 && release.summary.payloadSha256 === intent.payloadSha256 &&
      release.summary.sha256 === intent.payload?.sha256 && release.summary.fileId === intent.payload?.fileId,
      'release_checkpoint_invalid');
  }
  check(next.fence >= previous.fence && (!next.lease || next.lease.fence > 34), 'fence_regressed');
}
