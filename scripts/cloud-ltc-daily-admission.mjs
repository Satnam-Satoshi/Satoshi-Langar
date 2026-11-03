import { createHash } from 'node:crypto';

const check = (value, code) => { if (!value) throw new Error(code); };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
export function validPublicationDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function publicationDate(now = Date.now()) {
  check(Number.isFinite(now), 'invalid_publication_clock');
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}

export function assertPublicationDate(lease, now) {
  if (lease?.publicationDate !== undefined) check(lease.publicationDate === publicationDate(now), 'publication_date_changed');
}

export class DailyPublicationComplete extends Error {
  constructor(release) {
    super('daily_publication_already_verified');
    this.release = structuredClone(release);
  }
}

// Invoked inside the same revision-CAS admission that acquires the writer lease.
// The accepted checkpoint survives journal compaction and runner restarts. A Git
// commit, issue file, successful workflow or pending intent is not publication.
export function assertDailyPublicationAvailable(document, date) {
  check(validPublicationDate(date), 'invalid_publication_date');
  const release = document.latestRelease;
  if (!release) return;
  const editionDate = /^(\d{4}-\d{2}-\d{2})-r[1-9]\d?$/.exec(release.editionId ?? '')?.[1];
  const verifiedAt = Date.parse(release.verifiedAt);
  const summary = release.summary, intent = document.intents[summary?.operationId];
  const proof = intent?.proof, remote = proof?.proof, head = document.archiveHead;
  check(validPublicationDate(editionDate) && Number.isFinite(verifiedAt) && /^[a-f0-9]{40}$/.test(release.source ?? '') && /^dpl_[A-Za-z0-9]+$/.test(release.deployment ?? '') && digest(release.artifactManifestSha256), 'daily_checkpoint_invalid');
  check(intent?.status === 'confirmed' && intent.payload?.kind === 'drive-evidence' && intent.payload.role === 'release-summary' && intent.payloadSha256 === hash(intent.payload) && summary.payloadSha256 === intent.payloadSha256 && summary.fileId === intent.payload.fileId && summary.folderId === intent.payload.folderId && summary.sha256 === intent.payload.sha256 && summary.length === intent.payload.bytes && digest(summary.sha256), 'daily_checkpoint_invalid');
  check(document.receipts[summary.operationId]?.sha256 === hash(intent) && hash(document.receipts[summary.operationId].receipt) === hash(intent) && proof?.status === 'applied' && proof.operationId === summary.operationId && proof.payloadSha256 === intent.payloadSha256 && intent.evidenceSha256 === hash(proof) && remote?.ownerOnly === true && remote.downloadVerified === true && remote.fileId === summary.fileId && remote.folderId === summary.folderId && remote.sha256 === summary.sha256 && remote.length === summary.length, 'daily_checkpoint_invalid');
  check(head?.summaryOperationId === summary.operationId && head.summaryFileId === summary.fileId && head.summaryFolderId === summary.folderId && head.summarySha256 === summary.sha256 && head.archiveProofSha256 === intent.evidenceSha256 && head.backupSha256 === summary.archivedStateSha256, 'daily_checkpoint_invalid');
  const verifiedDate = publicationDate(verifiedAt);
  check(editionDate <= date && verifiedDate <= date, 'publication_clock_before_checkpoint');
  if (editionDate === date || verifiedDate === date) throw new DailyPublicationComplete(release);
}
