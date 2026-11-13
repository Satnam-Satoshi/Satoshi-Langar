import { createHash } from 'node:crypto';
import { assertDailyPublicationAvailable, DailyPublicationComplete, publicationDate } from '../cloud-ltc-daily-admission.mjs';
import { verifyRoutineRetirement } from '../cloud-ltc-routine-retirement-proof.mjs';
import { verifyRoutineFollowupRetirement } from '../cloud-ltc-routine-followup-proof.mjs';
import { isRoutineData } from './ltc-routine-data.mjs';

const check = (value, code) => { if (!value) throw Error(code); };
export const softwareHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const commit = value => /^[a-f0-9]{40}$/.test(value ?? '');
const same = (a, b) => softwareHash(a) === softwareHash(b);

// No new daily edition is admitted here. Validate the existing compacted daily
// proof without interpreting DailyPublicationComplete as permission to publish.
export function assertSoftwareBaseline(document, now = Date.now()) {
  check(document?.paused === false && document.restoreHold === false && document.latestRelease, 'software_baseline_required');
  if (document.nextFreshGeneration) check(document.nextFreshGeneration.status === 'routine-enabled', 'software_recovery_gate_active');
  // A completed follow-up deliberately preserves its predecessor as
  // manual-admitted. Validate the full immutable proof chain, not just the
  // historical status. Runtime admission still checks independent env pins.
  if (document.routineUploadFollowupRetirement) {
    check(document.routineUploadFollowupRetirement.status === 'routine-enabled', 'software_recovery_gate_active');
    verifyRoutineRetirement(document);
    verifyRoutineFollowupRetirement(document);
  } else if (document.routineUploadRetirement) {
    check(document.routineUploadRetirement.status === 'routine-enabled', 'software_recovery_gate_active');
    verifyRoutineRetirement(document);
  }
  try { assertDailyPublicationAvailable(document, publicationDate(now)); }
  catch (error) { if (!(error instanceof DailyPublicationComplete)) throw error; }
  check(Date.parse(document.latestRelease.verifiedAt) <= now && (!document.latestRelease.softwareVerifiedAt || Date.parse(document.latestRelease.softwareVerifiedAt) <= now), 'software_verification_clock_invalid');
  const p = document.latestRelease.publicationProvenance;
  check(p && ['editionSha256', 'sourceDeskSha256', 'dailyGraphicSha256'].every(key => digest(p[key])), 'software_provenance_required');
  return document.latestRelease;
}

export function validateSoftwareReview(review, { source, implementationSha256, manifest, buildOutput, changedPaths, document, now = Date.now(), target }) {
  const prior = assertSoftwareBaseline(document, now);
  check(review?.schemaVersion === 1 && review.kind === 'reviewed-software-only-release' && review.approved === true && review.actorId === '268053325' && /^[a-z0-9][a-z0-9_-]{0,47}$/.test(review.approvalId ?? ''), 'software_review_required');
  const approved = Date.parse(review.approvedAt), expires = Date.parse(review.expiresAt);
  check(Number.isFinite(approved) && approved <= now && now < expires && expires - approved <= 86400000, 'software_review_expired');
  check(commit(source) && review.source === source && review.implementationSha256 === implementationSha256 && digest(implementationSha256) && same(review.target, target), 'software_review_scope_changed');
  check(review.priorReleaseSha256 === softwareHash(prior) && review.previousDeployment === prior.deployment && review.rollbackManifestSha256 === prior.artifactManifestSha256, 'software_baseline_changed');
  check(review.artifactManifestSha256 === softwareHash(manifest) && review.buildOutputSha256 === softwareHash(buildOutput), 'software_artifact_changed');
  check(review.preserveDailyPublication === true && review.rollbackOnConfirmedVerificationFailure === true && review.expiryScope === 'admission-and-first-promotion' && review.rollbackAfterExpiryWithinLease === true && /^[1-9][0-9]{0,29}$/.test(review.visualQaRunId ?? ''), 'software_review_scope_changed');
  check(Array.isArray(changedPaths) && changedPaths.length > 0 && changedPaths.length <= 500 && Array.isArray(review.allowedChangedPaths) && same([...changedPaths].sort(), [...review.allowedChangedPaths].sort()), 'software_source_scope_changed');
  // Diff uses both trees, including deleted paths and modes. An explicit file
  // allowlist may approve UI/editorial software, never a daily record rewrite.
  check(changedPaths.every(file => typeof file === 'string' && !isRoutineData(file) && !file.startsWith('content/ltc/') && !file.startsWith('content/daily-features/') && !file.startsWith('public/data/ltc-editions/') && !file.startsWith('public/magazine/daily/')), 'software_daily_content_changed');
  return Object.freeze({
    schemaVersion: 1, kind: 'software-only', approvalId: review.approvalId,
    reviewSha256: softwareHash(review), priorReleaseSha256: softwareHash(prior),
    previousSource: prior.source, previousDeployment: prior.deployment,
    previousManifestSha256: prior.artifactManifestSha256,
    editionId: prior.editionId, dailyVerifiedAt: prior.verifiedAt,
    publicationProvenance: structuredClone(prior.publicationProvenance),
    source, implementationSha256, visualQaRunId: review.visualQaRunId,
    artifactManifestSha256: review.artifactManifestSha256, buildOutputSha256: review.buildOutputSha256,
  });
}

export function assertSoftwareContext(document, context, now = Date.now()) {
  const prior = assertSoftwareBaseline(document, now);
  check(context?.schemaVersion === 1 && context.kind === 'software-only' && digest(context.reviewSha256) && context.priorReleaseSha256 === softwareHash(prior) && context.previousSource === prior.source && context.previousDeployment === prior.deployment && context.previousManifestSha256 === prior.artifactManifestSha256 && context.editionId === prior.editionId && context.dailyVerifiedAt === prior.verifiedAt && same(context.publicationProvenance, prior.publicationProvenance), 'software_baseline_changed');
  check(commit(context.source) && digest(context.implementationSha256) && digest(context.artifactManifestSha256) && digest(context.buildOutputSha256), 'software_context_invalid');
  return context;
}

export function assertSoftwarePublicData(previous, current) {
  const protectedFile = file => file.startsWith('data/ltc-editions/') || file === 'data/ltc-snapshot.json' || /^magazine\/daily\//.test(file);
  const selected = records => records.filter(record => protectedFile(record.file)).sort((a, b) => a.file.localeCompare(b.file));
  check(selected(previous).length > 0 && same(selected(previous), selected(current)), 'software_generated_daily_data_changed');
}

// verifiedAt retains its original daily-content meaning so a software deploy
// before today's edition cannot consume that day's publication allowance.
export function softwareCheckpointFields(context, softwareVerifiedAt) {
  check(Number.isFinite(Date.parse(softwareVerifiedAt)) && Date.parse(softwareVerifiedAt) >= Date.parse(context.dailyVerifiedAt), 'software_verification_clock_invalid');
  return { verifiedAt: context.dailyVerifiedAt, softwareVerifiedAt, softwareRelease: structuredClone(context) };
}

export function validateSoftwareApiReadback(raw) {
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  check(bytes.length < 512000, 'software_api_invalid');
  const boundary = bytes.indexOf('\r\n\r\n');
  check(boundary > 0 && boundary < 65536, 'software_api_invalid');
  const headers = bytes.subarray(0, boundary).toString('latin1');
  check(/^HTTP\/(?:1\.[01]|2|3) (?:200|503)(?: [^\r\n]*)?\r\n/i.test(headers + '\r\n') && /(?:^|\r\n)content-type:[ \t]*application\/json(?:[;\r]|$)/i.test(headers) && !/(?:^|\r\n)location:/i.test(headers), 'software_api_invalid');
  let body; try { body = JSON.parse(bytes.subarray(boundary + 4)); } catch { throw Error('software_api_invalid'); }
  check(body?.schemaVersion === 1 && Number.isFinite(Date.parse(body.checkedAt)), 'software_api_invalid');
  if (/^HTTP\/[^ ]+ 503/.test(headers)) check(body.status === 'unavailable', 'software_api_invalid');
  return { status: body.status ?? 'available', checkedAt: body.checkedAt };
}

export function assertSoftwarePromotionWindow(review, now = Date.now()) {
  check(review.expiryScope === 'admission-and-first-promotion' && now < Date.parse(review.expiresAt), 'software_review_expired');
}
