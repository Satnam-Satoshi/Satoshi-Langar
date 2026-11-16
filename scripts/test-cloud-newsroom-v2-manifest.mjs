import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { validateCloudNewsroomV2Manifest } from './cloud-newsroom-v2-manifest.mjs';
const GENERATION = 'cloud-newsroom-v2';
const KNOWN_PDF = { sha256: 'e10b9d8bfa55259d09b95419f82bef88e9e64e5569a7b386a6a58b8651d84f5a', bytes: 183234, pages: 29 };
function fixture() {
  const producer = { id: 'externally-agreed-producer', generation: GENERATION, kind: 'daily' };
  const identity = { editionDate: '2026-11-16', editionId: 'ltc-daily-2026-11-16', revision: 1 };
  const artifacts = ['pdf', 'html', 'cover', 'promo'].map((role, i) => ({ role, ...identity, path: `artifacts/2026-11-16/r1/${role}.${i === 0 ? 'pdf' : i === 1 ? 'html' : 'png'}`, sha256: String(i + 1).repeat(64), bytes: 1000 + i, mimeType: i === 0 ? 'application/pdf' : i === 1 ? 'text/html' : 'image/png', url: null, ...(i === 0 ? KNOWN_PDF : {}) }));
  return { now: '2026-11-16T19:00:00Z', expectedProducer: producer, existingDailyIssues: [], observedArtifacts: artifacts.map(a => ({ role: a.role, path: a.path, editionId: a.editionId, revision: a.revision, sha256: a.sha256, bytes: a.bytes })), manifest: {
    schemaVersion: 1, generation: GENERATION, kind: 'daily', timezone: 'America/New_York', ...identity, producer: { ...producer },
    sourceCommit: 'fd45e107ac37e537195b7311baeba8cd40b2f035', implementationCommit: 'a'.repeat(40), implementationSha256: 'b'.repeat(64), preparedAt: '2026-11-16T18:59:30Z', artifacts,
    sources: [{ id: 'btc', url: 'https://api.exchange.coinbase.com/products/BTC-USD/ticker', primary: true, status: 'verified', claimVerified: true, value: 123.45, classification: 'current', label: null, publishedAt: null, eventAt: null, effectiveAt: '2026-11-16T18:58:00Z', retrievedAt: '2026-11-16T18:59:00Z', maxRetrievalAgeSeconds: 180, maxEffectiveAgeSeconds: 300 }],
    scope: { summary: 'Bounded daily source briefing, not exhaustive coverage.', coveredSourceIds: ['btc'], exclusions: ['No unverified flow estimate.'] }, gaps: [], correction: null,
    novelty: { verified: true, hasMaterialChange: true, checkedAt: '2026-11-16T18:59:30Z', producerId: producer.id, editionId: identity.editionId, revision: 1, pdfSha256: KNOWN_PDF.sha256, comparedEditionKeys: [], summary: 'Fresh source check with changed, source-dated evidence.' },
  } };
}
function rejected(x) { const r = validateCloudNewsroomV2Manifest(x); assert.equal(r.status, 'rejected'); assert.equal(r.manifest, null); assert.deepEqual(r.effects, []); assert.equal(r.operational, false); return r; }
test('known November16 daily29-page PDF is preserved in normalized immutable description', () => {
  const x = fixture(), before = structuredClone(x), result = validateCloudNewsroomV2Manifest(x);
  assert.equal(result.status, 'validated-description'); assert.equal(result.manifest.artifacts[0].sha256, KNOWN_PDF.sha256); assert.equal(result.manifest.artifacts[0].bytes, 183234); assert.equal(result.manifest.artifacts[0].pages, 29);
  assert.equal(result.manifest.idempotencyKey, `${GENERATION}:2026-11-16:${KNOWN_PDF.sha256}`);
  assert.ok(Object.isFrozen(result.manifest.sources[0])); assert.ok(Object.isFrozen(result.manifest.artifacts)); assert.deepEqual(result.effects, []); assert.equal(result.operational, false); assert.deepEqual(x, before);
  assert.deepEqual(validateCloudNewsroomV2Manifest(x), result);
});
test('synthetic byte evidence is hashed only in memory, mismatches rejected', () => {
  const x = fixture(), bytes = new TextEncoder().encode('%PDF-synthetic fixture only');
  const digest = createHash('sha256').update(bytes).digest('hex');
  Object.assign(x.manifest.artifacts[0], { sha256: digest, bytes: bytes.byteLength });
  x.manifest.novelty.pdfSha256 = digest; x.observedArtifacts[0].content = bytes;
  assert.equal(validateCloudNewsroomV2Manifest(x).manifest.artifacts[0].evidenceMode, 'in-memory-bytes');
  x.observedArtifacts[0].content = new Uint8Array([1, 2]); rejected(x);
});
test('mismatched bytes, identity, duplicate roles, paths and hashes are rejected', () => {
  for (const field of ['sha256', 'bytes', 'editionId', 'revision']) { const x = fixture(); x.observedArtifacts[0][field] = field === 'bytes' || field === 'revision' ? 999 : 'wrong'; rejected(x); }
  for (const field of ['role', 'path', 'sha256']) { const x = fixture(); x.manifest.artifacts[1][field] = x.manifest.artifacts[0][field]; rejected(x); }
  const x = fixture(); x.manifest.artifacts[1].editionDate = '2026-11-15'; rejected(x);
});
test('missing artifacts, multiple manifests and multiple daily logical identities fail closed', () => {
  for (const x of [null, {}, { ...fixture(), manifest: [fixture().manifest, fixture().manifest] }, { ...fixture(), manifest: null }]) rejected(x);
  const x = fixture(); x.manifest.artifacts.pop(); rejected(x);
  const y = fixture(); y.existingDailyIssues = [{ editionId: 'other-daily', editionDate: '2026-11-16', revision: 1, pdfSha256: 'e'.repeat(64), status: 'published' }]; rejected(y);
});
test('producer must match explicit external agreement; no implicit configured producer', () => {
  const x = fixture(); delete x.expectedProducer; rejected(x);
  const y = fixture(); y.manifest.producer.id = 'some-other-producer'; rejected(y);
  const z = fixture(); z.expectedProducer.kind = 'social'; rejected(z);
});
test('strict New York edition clock, future source events and malformed dates rejected', () => {
  for (const patch of [{ editionDate: '2026-11-17' }, { timezone: 'UTC' }, { preparedAt: '2026-11-17T19:00:00Z' }, { preparedAt: '2026-02-30T00:00:00Z' }]) { const x = fixture(); Object.assign(x.manifest, patch); rejected(x); }
  for (const field of ['publishedAt', 'eventAt', 'effectiveAt', 'retrievedAt']) { const x = fixture(); x.manifest.sources[0][field] = '2026-11-17T00:00:00Z'; rejected(x); }
  const x = fixture(); x.now = '2026-11-17T01:00:00Z'; const r = rejected(x); assert.ok(!r.errors.includes('edition_date_not_current_new_york_day'));
});
test('safe relative artifact paths and HTTPS exact allowlisted URLs only', () => {
  for (const path of ['/absolute/file.pdf', '../secret', 'artifacts/2026-11-16/r1/../file.pdf', 'artifacts/2026-11-16/r1/%2e%2e/file.pdf', 'artifacts/2026-11-16/r1/a\\b.pdf', 'artifacts/2026-11-16/r1//file.pdf']) { const x = fixture(); x.manifest.artifacts[0].path = path; rejected(x); }
  for (const url of ['http://litecoin.com/', 'https://litecoin.com.evil.test/', 'https://user:password@litecoin.com/', 'file:///tmp/data', 'https://litecoin.com/../secret', 'https://litecoin.com/%2e%2e/secret']) { const x = fixture(); x.manifest.sources[0].url = url; rejected(x); }
  const x = fixture(); x.manifest.artifacts[0].url = 'https://private.example/pdf'; rejected(x);
});
test('stale or unsupported values cannot cross handoff as current facts', () => {
  for (const patch of [{ effectiveAt: '2026-09-30' }, { retrievedAt: '2026-11-15T19:00:00Z' }, { claimVerified: false }, { status: 'unavailable' }, { value: Infinity }, { effectiveAt: null }]) { const x = fixture(); Object.assign(x.manifest.sources[0], patch); rejected(x); }
});
test('honest historical dates preserve source precision; explicit withheld gap can be described', () => {
  const x = fixture(); Object.assign(x.manifest.sources[0], { classification: 'historical', label: 'Dated historical observation; not current', effectiveAt: '2026-09-30', publishedAt: '2026-11-10', maxEffectiveAgeSeconds: null });
  const r = validateCloudNewsroomV2Manifest(x); assert.equal(r.status, 'validated-description'); assert.equal(r.manifest.sources[0].effectiveAt, '2026-09-30');
  const y = fixture(); Object.assign(y.manifest.sources[0], { status: 'unavailable', claimVerified: false, value: null, effectiveAt: null });
  y.manifest.scope.coveredSourceIds = []; y.manifest.gaps = [{ sourceId: 'btc', valuesWithheld: true, reason: 'Provider did not return a usable observation.' }];
  assert.equal(validateCloudNewsroomV2Manifest(y).status, 'validated-description');
  y.manifest.sources[0].value = 123; rejected(y);
});
test('duplicate canonical PDF cannot become a second daily edition', () => {
  const x = fixture(); x.existingDailyIssues = [{ editionId: x.manifest.editionId, editionDate: x.manifest.editionDate, revision: 1, pdfSha256: KNOWN_PDF.sha256, status: 'published' }];
  assert.ok(rejected(x).errors.includes('duplicate_canonical_daily_artifact'));
});
test('same-date replacement requires next correction revision and preservation of original', () => {
  const x = fixture(); x.existingDailyIssues = [{ editionId: x.manifest.editionId, editionDate: x.manifest.editionDate, revision: 1, pdfSha256: 'e'.repeat(64), status: 'published' }];
  rejected(x); x.manifest.revision = 2; x.manifest.novelty.revision = 2; x.manifest.novelty.comparedEditionKeys = [`${x.manifest.editionId}:r1`];
  for (const a of x.manifest.artifacts) { a.revision = 2; a.path = a.path.replace('/r1/', '/r2/'); }
  for (const a of x.observedArtifacts) { a.revision = 2; a.path = a.path.replace('/r1/', '/r2/'); }
  x.manifest.correction = { approved: true, approvalId: 'owner-revision-approval', reason: 'Correct a sourced observation, preserving original.', replacesRevision: 1, replacesPdfSha256: 'e'.repeat(64), preserveOriginal: true };
  assert.equal(validateCloudNewsroomV2Manifest(x).status, 'validated-description');
  x.manifest.correction.preserveOriginal = false; rejected(x);
});
test('novelty must bind exact edition and PDF and compare supplied existing inventory', () => {
  for (const patch of [{ verified: false }, { hasMaterialChange: false }, { pdfSha256: 'f'.repeat(64) }, { comparedEditionKeys: ['unknown:r1'] }, { checkedAt: '2026-11-15T00:00:00Z' }]) { const x = fixture(); Object.assign(x.manifest.novelty, patch); rejected(x); }
});
test('malformed scope, gaps and sources reject without exceptions', () => {
  for (const patch of [{ gaps: [null] }, { gaps: [{}] }, { sources: [null] }, { scope: null }, { gaps: null }, { sources: [] }, { correction: {} }, { implementationCommit: ['a'.repeat(40)] }]) { const x = fixture(); Object.assign(x.manifest, patch); rejected(x); }
});
test('validator has no network, IO, ambient clock, email/social or effect APIs', () => {
  const source = readFileSync(new URL('./cloud-newsroom-v2-manifest.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /node:fs|\bfetch\s*\(|Date\.now\s*\(|writeFile|execSync|spawn\s*\(|process\./);
});
