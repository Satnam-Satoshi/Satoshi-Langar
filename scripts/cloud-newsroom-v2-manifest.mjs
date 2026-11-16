/** Pure handoff validation, not a producer, scheduler or publication capability.
 * Observed artifact fingerprints and producer/novelty attestations are supplied
 * by the caller; this module does not discover or configure the daily producer.
 * Optional Uint8Array observations are hashed in memory. No IO/effects occur.
 */
import { createHash } from 'node:crypto';
import { GENERATION, PRIMARY_HOSTS } from './cloud-newsroom-v2-plan.mjs';
const ROLES = ['pdf', 'html', 'cover', 'promo'];
const MIME = { pdf: ['application/pdf'], html: ['text/html'], cover: ['image/png', 'image/jpeg', 'image/webp'], promo: ['image/png', 'image/jpeg', 'image/webp'] };
const match = (r, x) => typeof x === 'string' && r.test(x);
const sha = x => match(/^[a-f0-9]{64}$/, x), commit = x => match(/^[a-f0-9]{40}$/, x);
const id = x => match(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/, x);
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = x => typeof x === 'string' && x.trim().length > 0 && x.length <= 4000;
const day = x => match(/^\d{4}-\d{2}-\d{2}$/, x) && Number.isFinite(Date.parse(`${x}T00:00:00Z`)) && new Date(`${x}T00:00:00Z`).toISOString().slice(0, 10) === x;
const instant = x => typeof x === 'string' && day(x.slice(0, 10)) && Number(x.slice(11, 13)) < 24 && Number(x.slice(14, 16)) < 60 && Number(x.slice(17, 19)) < 60 && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(x) ? Date.parse(x) : NaN;
function nyDay(ms) { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ms).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; }
function url(x, hosts) { try { if (typeof x !== 'string' || /[\\\u0000-\u0020]|%2e|%2f|%5c|(?:^|\/)\.\.?(?:\/|$)/i.test(x)) return false; const u = new URL(x); return u.protocol === 'https:' && !u.username && !u.password && !u.port && !u.hash && hosts.includes(u.hostname); } catch { return false; } }
function localPath(x) { return typeof x === 'string' && x.length <= 300 && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(x) && x.split('/').every(p => p !== '.' && p !== '..' && p !== '') && !x.includes('\\'); }
function frozen(x) { if (obj(x) || Array.isArray(x)) { Object.values(x).forEach(frozen); Object.freeze(x); } return x; }
const scalar = x => ['string', 'boolean', 'number'].includes(typeof x) && (typeof x !== 'string' || text(x)) && (typeof x !== 'number' || Number.isFinite(x));
const sourceTime = x => day(x) ? Date.parse(`${x}T00:00:00Z`) : instant(x);
const normalizedDate = x => x === null ? null : day(x) ? x : new Date(instant(x)).toISOString();
/** Input contract and the known November16 PDF fixture are in the sibling tests. */
export function validateCloudNewsroomV2Manifest(input) {
  const errors = [], fail = s => { if (!errors.includes(s)) errors.push(s); };
  const result = manifest => frozen({ status: errors.length ? 'rejected' : 'validated-description', errors, manifest: errors.length ? null : manifest,
    effects: [], operational: false, limitations: ['No producer is configured or invoked.', 'Caller-supplied fingerprints/identity/novelty attestations require independent verification.', 'Validation is not permission to send, deploy, replace history or publish.'] });
  if (!obj(input) || !obj(input.manifest)) { fail('exactly_one_manifest_required'); return result(null); }
  const m = input.manifest, now = instant(input.now), producer = input.expectedProducer;
  if (!Number.isFinite(now)) fail('invalid_injected_clock');
  if (m.schemaVersion !== 1 || m.generation !== GENERATION || m.kind !== 'daily' || m.timezone !== 'America/New_York') fail('new_generation_daily_only');
  if (!day(m.editionDate) || (Number.isFinite(now) && m.editionDate !== nyDay(now))) fail('edition_date_not_current_new_york_day');
  if (m.editionId !== `ltc-daily-${m.editionDate}` || !Number.isSafeInteger(m.revision) || m.revision < 1) fail('invalid_edition_identity');
  if (!obj(producer) || !id(producer.id) || producer.generation !== GENERATION || producer.kind !== 'daily' || !obj(m.producer) || m.producer.id !== producer.id || m.producer.generation !== producer.generation || m.producer.kind !== 'daily') fail('unagreed_producer_identity');
  if (!commit(m.sourceCommit) || !commit(m.implementationCommit) || !sha(m.implementationSha256)) fail('invalid_source_or_implementation_hash');
  if (!Number.isFinite(instant(m.preparedAt)) || instant(m.preparedAt) > now || (Number.isFinite(instant(m.preparedAt)) && nyDay(instant(m.preparedAt)) !== m.editionDate)) fail('invalid_prepared_at');
  const artifacts = [], observed = input.observedArtifacts;
  if (!Array.isArray(m.artifacts) || m.artifacts.length !== 4 || !Array.isArray(observed) || observed.length !== 4) fail('exactly_four_artifacts_required');
  else {
    const roles = new Set(), paths = new Set(), hashes = new Set(), evidenceRoles = new Set();
    for (const o of observed) { if (!obj(o) || !ROLES.includes(o.role) || evidenceRoles.has(o.role)) fail('duplicate_or_invalid_observed_artifact'); else evidenceRoles.add(o.role); }
    for (const a of m.artifacts) {
      if (!obj(a) || !ROLES.includes(a.role)) { fail('invalid_artifact'); continue; }
      if (roles.has(a.role) || paths.has(a.path) || hashes.has(a.sha256)) fail('duplicate_artifact');
      roles.add(a.role); paths.add(a.path); hashes.add(a.sha256);
      if (!localPath(a.path) || !a.path.startsWith(`artifacts/${m.editionDate}/r${m.revision}/`)) fail(`unsafe_artifact_path:${a.role}`);
      if (!sha(a.sha256) || !Number.isSafeInteger(a.bytes) || a.bytes < 1 || a.bytes > 32 * 1024 * 1024 || !MIME[a.role].includes(a.mimeType)) fail(`invalid_artifact_fingerprint:${a.role}`);
      if (a.editionId !== m.editionId || a.editionDate !== m.editionDate || a.revision !== m.revision) fail(`artifact_identity_mismatch:${a.role}`);
      if (a.url !== null && !url(a.url, ['ltcmagazine.org', 'satnamsatoshi.com'])) fail(`invalid_artifact_url:${a.role}`);
      if (a.role === 'pdf' && (!Number.isSafeInteger(a.pages) || a.pages < 1 || a.pages > 500)) fail('invalid_pdf_page_count');
      const o = observed.find(x => obj(x) && x.role === a.role);
      let actualHash = o?.sha256, actualBytes = o?.bytes, evidenceMode = 'injected-fingerprint';
      if (o?.content instanceof Uint8Array) { actualHash = createHash('sha256').update(o.content).digest('hex'); actualBytes = o.content.byteLength; evidenceMode = 'in-memory-bytes'; }
      if (!o || o.path !== a.path || o.editionId !== m.editionId || o.revision !== m.revision || actualHash !== a.sha256 || actualBytes !== a.bytes) fail(`artifact_bytes_or_identity_mismatch:${a.role}`);
      artifacts.push({ role: a.role, path: a.path, url: a.url, editionId: a.editionId, editionDate: a.editionDate, revision: a.revision, sha256: a.sha256, bytes: a.bytes, mimeType: a.mimeType, ...(a.role === 'pdf' ? { pages: a.pages } : {}), evidenceMode });
    }
    if (ROLES.some(x => !roles.has(x))) fail('missing_artifact_role');
  }
  const existing = input.existingDailyIssues;
  let latest = null;
  if (!Array.isArray(existing)) fail('existing_daily_inventory_required');
  else {
    const seen = new Set();
    for (const prior of existing) {
      if (!obj(prior) || !day(prior.editionDate) || prior.editionId !== `ltc-daily-${prior.editionDate}` || !Number.isSafeInteger(prior.revision) || prior.revision < 1 || !sha(prior.pdfSha256) || !['draft', 'published'].includes(prior.status)) { fail('invalid_existing_daily_issue'); continue; }
      const key = `${prior.editionId}:r${prior.revision}`;
      if (seen.has(key)) fail('duplicate_existing_daily_identity'); seen.add(key);
      if (prior.editionDate > m.editionDate) fail('future_existing_daily_issue');
      if (prior.editionDate === m.editionDate && (!latest || prior.revision > latest.revision)) latest = prior;
      if (prior.pdfSha256 === artifacts.find(a => a.role === 'pdf')?.sha256) fail('duplicate_canonical_daily_artifact');
    }
  }
  if (latest) {
    const c = m.correction;
    if (!obj(c) || c.approved !== true || !id(c.approvalId) || !text(c.reason) || c.replacesRevision !== latest.revision || c.replacesPdfSha256 !== latest.pdfSha256 || c.preserveOriginal !== true || m.revision !== latest.revision + 1) fail('explicit_correction_revision_required');
  } else if (m.revision !== 1 || m.correction !== null) fail('unexpected_correction_without_original');
  const sources = [], scope = m.scope, gaps = m.gaps;
  if (!obj(scope) || !text(scope.summary) || !Array.isArray(scope.coveredSourceIds) || !Array.isArray(scope.exclusions) || scope.exclusions.some(x => !text(x))) fail('invalid_scope');
  if (!Array.isArray(gaps) || gaps.some(g => !obj(g) || !id(g.sourceId) || !text(g.reason) || g.valuesWithheld !== true)) fail('invalid_gaps');
  if (!Array.isArray(m.sources) || m.sources.length === 0) fail('sources_required');
  else {
    const seen = new Set();
    for (const s of m.sources) {
      if (!obj(s) || !id(s.id) || seen.has(s.id)) { fail('duplicate_or_invalid_source'); continue; } seen.add(s.id);
      if (!url(s.url, PRIMARY_HOSTS) || s.primary !== true) fail(`invalid_primary_source_url:${s.id}`);
      const retrieved = instant(s.retrievedAt), maxAge = s.maxRetrievalAgeSeconds;
      if (!Number.isFinite(retrieved) || retrieved > now || !Number.isSafeInteger(maxAge) || maxAge <= 0 || maxAge > 86400 || now - retrieved > maxAge * 1000) fail(`stale_or_invalid_retrieval:${s.id}`);
      for (const key of ['publishedAt', 'eventAt', 'effectiveAt']) if (s[key] !== null && (!Number.isFinite(sourceTime(s[key])) || sourceTime(s[key]) > now || sourceTime(s[key]) > retrieved)) fail(`future_or_invalid_${key}:${s.id}`);
      if (s.status === 'unavailable') {
        if (s.value !== null || !Array.isArray(gaps) || !gaps.some(g => g?.sourceId === s.id && g?.valuesWithheld === true)) fail(`unsupported_gap_value:${s.id}`);
      } else if (s.status !== 'verified' || s.claimVerified !== true || !scalar(s.value)) fail(`unverified_claim:${s.id}`);
      if (!['current', 'historical'].includes(s.classification)) fail(`invalid_freshness_classification:${s.id}`);
      if (s.status === 'verified' && s.classification === 'current' && (s.effectiveAt === null || !Number.isSafeInteger(s.maxEffectiveAgeSeconds) || s.maxEffectiveAgeSeconds <= 0 || s.maxEffectiveAgeSeconds > 86400 || now - sourceTime(s.effectiveAt) > s.maxEffectiveAgeSeconds * 1000)) fail(`stale_current_value:${s.id}`);
      if (s.classification === 'historical' && (s.effectiveAt === null || s.maxEffectiveAgeSeconds !== null || s.label !== 'Dated historical observation; not current')) fail(`historical_label_required:${s.id}`);
      sources.push(s);
    }
    if (obj(scope) && Array.isArray(scope.coveredSourceIds)) {
      const covered = sources.filter(s => s.status === 'verified').map(s => s.id).sort();
      if (new Set(scope.coveredSourceIds).size !== scope.coveredSourceIds.length || JSON.stringify([...scope.coveredSourceIds].sort()) !== JSON.stringify(covered)) fail('coverage_scope_mismatch');
    }
    if (Array.isArray(gaps) && (new Set(gaps.map(g => g?.sourceId)).size !== gaps.length || gaps.some(g => !sources.some(s => s.id === g?.sourceId && s.status === 'unavailable')))) fail('gap_scope_mismatch');
  }
  const n = m.novelty, at = instant(n?.checkedAt);
  const previousKeys = Array.isArray(existing) ? existing.filter(obj).map(x => `${x.editionId}:r${x.revision}`).sort() : [];
  if (!obj(n) || n.verified !== true || n.hasMaterialChange !== true || !text(n.summary) || !Number.isFinite(at) || at > now || now - at > 86400_000 || n.producerId !== producer?.id || n.editionId !== m.editionId || n.revision !== m.revision || n.pdfSha256 !== artifacts.find(a => a.role === 'pdf')?.sha256 || !Array.isArray(n.comparedEditionKeys) || JSON.stringify([...n.comparedEditionKeys].sort()) !== JSON.stringify(previousKeys)) fail('invalid_or_missing_novelty_attestation');
  if (errors.length) return result(null);
  return result({ schemaVersion: 1, generation: GENERATION, kind: 'daily', timezone: 'America/New_York', editionDate: m.editionDate, editionId: m.editionId, revision: m.revision,
    producer: { id: producer.id, generation: GENERATION, kind: 'daily' }, sourceCommit: m.sourceCommit, implementationCommit: m.implementationCommit, implementationSha256: m.implementationSha256,
    preparedAt: normalizedDate(m.preparedAt), idempotencyKey: `${GENERATION}:${m.editionDate}:${artifacts.find(a => a.role === 'pdf').sha256}`,
    artifacts: artifacts.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role)),
    sources: sources.map(s => ({ id: s.id, url: s.url, primary: true, status: s.status, classification: s.classification, label: s.label ?? null, value: s.value, publishedAt: normalizedDate(s.publishedAt), eventAt: normalizedDate(s.eventAt), effectiveAt: normalizedDate(s.effectiveAt), retrievedAt: normalizedDate(s.retrievedAt), claimVerified: s.status === 'verified', maxRetrievalAgeSeconds: s.maxRetrievalAgeSeconds, maxEffectiveAgeSeconds: s.maxEffectiveAgeSeconds ?? null })).sort((a, b) => a.id.localeCompare(b.id, 'en')),
    scope: { summary: scope.summary, coveredSourceIds: [...scope.coveredSourceIds].sort(), exclusions: [...scope.exclusions] }, gaps: gaps.map(g => ({ sourceId: g.sourceId, reason: g.reason, valuesWithheld: true })).sort((a, b) => a.sourceId.localeCompare(b.sourceId, 'en')),
    novelty: { verified: true, hasMaterialChange: true, summary: n.summary, checkedAt: normalizedDate(n.checkedAt), comparedEditionKeys: [...n.comparedEditionKeys].sort() },
    correction: latest ? { approvalId: m.correction.approvalId, reason: m.correction.reason, replacesRevision: latest.revision, replacesPdfSha256: latest.pdfSha256, preserveOriginal: true } : null,
    immutableDescription: true, oldLedgerMutation: false, historicalDocumentsMutation: false });
}
