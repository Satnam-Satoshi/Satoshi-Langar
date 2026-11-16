import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, realpath, symlink, unlink, link, open, stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ingestCloudNewsroomV2Bundle, MAX_ARTIFACT_BYTES } from './cloud-newsroom-v2-ingest.mjs';
const GENERATION = 'cloud-newsroom-v2';
const PRODUCER = '6ab31b91763881918f6bfc2b20505366';
async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'ltc-v2-ingest-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const identity = { editionDate: '2026-11-16', editionId: 'ltc-daily-2026-11-16', revision: 1 };
  const producer = { id: PRODUCER, generation: GENERATION, kind: 'daily' }, artifacts = [];
  await mkdir(path.join(root, 'artifacts/2026-11-16/r1'), { recursive: true });
  for (const [role, mimeType, ext] of [['pdf', 'application/pdf', 'pdf'], ['html', 'text/html', 'html'], ['cover', 'image/png', 'png'], ['promo', 'image/png', 'png']]) {
    const content = role === 'cover' ? Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') : Buffer.from(role === 'html' ? '<!doctype html><html lang="en"><head><title>Fixture</title></head><body><h1>Synthetic edition</h1><p>Not publication evidence.</p></body></html>' : `synthetic-${role}-test-only-not-rendered`), relative = `artifacts/2026-11-16/r1/${role}.${ext}`;
    await writeFile(path.join(root, relative), content);
    artifacts.push({ ...identity, role, path: relative, sha256: createHash('sha256').update(content).digest('hex'), bytes: content.length, mimeType, url: null, ...(role === 'pdf' ? { pages: 29 } : {}) });
  }
  const request={ bundleRoot: root, now: '2026-11-16T19:00:00Z', expectedProducer: producer, existingDailyIssues: [], manifest: {
    schemaVersion: 1, generation: GENERATION, kind: 'daily', timezone: 'America/New_York', ...identity, producer: { ...producer }, sourceCommit: 'fd45e107ac37e537195b7311baeba8cd40b2f035', implementationCommit: 'a'.repeat(40), implementationSha256: 'b'.repeat(64), preparedAt: '2026-11-16T18:59:30Z', presentation: {title:'Synthetic daily edition',dek:'Test fixture, not public reporting.'}, artifacts,
    sources: [{ id: 'btc', url: 'https://api.exchange.coinbase.com/products/BTC-USD/ticker', primary: true, status: 'verified', claimVerified: true, value: 123.45, classification: 'current', label: null, publishedAt: null, eventAt: null, effectiveAt: '2026-11-16T18:58:00Z', retrievedAt: '2026-11-16T18:59:00Z', maxRetrievalAgeSeconds: 180, maxEffectiveAgeSeconds: 300 }],
    scope: { summary: 'Synthetic bounded test, never publication evidence.', coveredSourceIds: ['btc'], exclusions: ['Test has no verified live observation.'] }, gaps: [], correction: null,
    novelty: { verified: true, hasMaterialChange: true, checkedAt: '2026-11-16T18:59:30Z', producerId: PRODUCER, editionId: identity.editionId, revision: 1, pdfSha256: artifacts[0].sha256, comparedEditionKeys: [], summary: 'Synthetic novelty attestation for validator test only.' },
  } };
  Object.assign(request,policyFixture(request.manifest.sources[0]));return request;
}
async function rejected(x) { const r = await ingestCloudNewsroomV2Bundle(x); assert.equal(r.status, 'rejected'); assert.deepEqual(r.effects, []); assert.equal(r.operational, false); return r; }
test('actual files produce immutable receipt with exact computed fingerprints, no mutations', async t => {
  const x = await fixture(t), before = structuredClone(x);
  const r = await ingestCloudNewsroomV2Bundle(x);
  assert.equal(r.status, 'accepted-receipt'); assert.equal(r.artifacts.length, 4); assert.equal(r.validation.status, 'validated-description'); assert.deepEqual(r.coverDimensions,{width:1,height:1,verification:'png-ihdr-with-crc',renderVerified:false}); assert.equal(r.publication.page,'/conversations/editions/2026-11-16/'); assert.equal(r.publication.title,x.manifest.presentation.title);
  for (const a of r.artifacts) { const original = x.manifest.artifacts.find(z => z.role === a.role); assert.equal(a.sha256, original.sha256); assert.equal(a.bytes, original.bytes); assert.equal(a.verification, 'actual-local-file-bytes'); }
  assert.ok(Object.isFrozen(r)); assert.ok(Object.isFrozen(r.artifacts[0])); assert.deepEqual(x, before); assert.deepEqual(r.effects, []); assert.equal(r.operational, false);
  assert.deepEqual(await ingestCloudNewsroomV2Bundle(x), r, 'no ambient-clock dependency');
});
test('actual content or byte count mismatch rejects despite matching metadata declarations', async t => {
  for (const change of ['same-length-content', 'new-size']) {
    const x = await fixture(t), a = x.manifest.artifacts[0];
    await writeFile(path.join(x.bundleRoot, a.path), change === 'same-length-content' ? Buffer.alloc(a.bytes, 65) : 'short');
    const r = await rejected(x); assert.ok(r.errors.includes('actual_artifact_validation_failed')); assert.ok(r.validation.errors.includes('artifact_bytes_or_identity_mismatch:pdf'));
  }
});
test('caller-provided observed fingerprints cannot bypass actual reads', async t => {
  const x = await fixture(t); x.observedArtifacts = x.manifest.artifacts;
  await writeFile(path.join(x.bundleRoot, x.manifest.artifacts[0].path), 'replacement');
  await rejected(x);
});
test('unknown or omitted producer fails before attempting bundle reads', async t => {
  const x = await fixture(t); x.expectedProducer.id = 'not-the-existing-producer'; x.bundleRoot = path.join(x.bundleRoot, 'absent');
  const r = await rejected(x); assert.deepEqual(r.errors, ['manifest_preflight_failed']); assert.ok(r.validation.errors.includes('unagreed_producer_identity'));
  delete x.expectedProducer; await rejected(x);
});
test('traversal, absolute and encoded artifact paths are never read', async t => {
  for (const p of ['../outside', '/etc/passwd', 'artifacts/2026-11-16/r1/../../secret', 'artifacts/2026-11-16/r1/%2e%2e/secret', 'artifacts/2026-11-16/r1/a\\b']) {
    const x = await fixture(t); x.manifest.artifacts[0].path = p; const r = await rejected(x); assert.deepEqual(r.artifacts, []);
  }
});
test('symlink artifact is refused even when target is inside the bundle', async t => {
  const x = await fixture(t), a = path.join(x.bundleRoot, x.manifest.artifacts[0].path), target = path.join(x.bundleRoot, 'target');
  await writeFile(target, 'target'); await unlink(a); await symlink(target, a);
  assert.ok((await rejected(x)).errors.includes('symlink_refused'));
});
test('symlink directory escape and symlink bundle root are refused', async t => {
  const x = await fixture(t), outside = await fixture(t), dir = path.join(x.bundleRoot, 'artifacts');
  await rm(dir, { recursive: true }); await symlink(path.join(outside.bundleRoot, 'artifacts'), dir);
  assert.ok((await rejected(x)).errors.includes('symlink_refused'));
  const rootLink = path.join(outside.bundleRoot, 'bundle-link'); await symlink(x.bundleRoot, rootLink); x.bundleRoot = rootLink;
  assert.ok((await rejected(x)).errors.includes('symlink_bundle_root_refused'));
});
test('symlink root ancestor cannot silently select a different canonical root', async t => {
  const x = await fixture(t), other = await fixture(t), alias = path.join(other.bundleRoot, 'alias');
  await symlink(path.dirname(x.bundleRoot), alias); x.bundleRoot = path.join(alias, path.basename(x.bundleRoot));
  assert.ok((await rejected(x)).errors.includes('noncanonical_or_symlink_root_ancestry'));
});
test('hardlinked file, directory-as-artifact, missing file and empty file are rejected', async t => {
  for (const kind of ['hardlink', 'directory', 'missing', 'empty']) {
    const x = await fixture(t), file = path.join(x.bundleRoot, x.manifest.artifacts[0].path);
    if (kind === 'hardlink') await link(file, path.join(x.bundleRoot, 'extra-link'));
    else { await unlink(file); if (kind === 'directory') await mkdir(file); if (kind === 'empty') await writeFile(file, ''); }
    await rejected(x);
  }
});
test('actual oversized sparse file is rejected before reading its bytes', async t => {
  const x = await fixture(t), handle = await open(path.join(x.bundleRoot, x.manifest.artifacts[0].path), 'r+');
  await handle.truncate(MAX_ARTIFACT_BYTES + 1); await handle.close();
  assert.ok((await rejected(x)).errors.includes('artifact_size_limit'));
});
test('invalid roots, malformed manifest, stale/no-news attestations fail closed', async t => {
  for (const bundleRoot of ['', '.', '../bundle', '//network/share', '/some/../bundle']) await rejected({ bundleRoot });
  const x = await fixture(t); x.manifest.novelty.hasMaterialChange = false;
  const r = await rejected(x); assert.ok(r.validation.errors.includes('invalid_or_missing_novelty_attestation'));
  x.manifest = null; await rejected(x);
});
test('ingester does not write/network or invoke production/delivery capabilities', async () => {
  const source = await readFile(new URL('./cloud-newsroom-v2-ingest.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|Date\.now\s*\(|writeFile|execSync|spawn\s*\(|process\.|O_WRONLY|O_RDWR|O_CREAT/);
});

test('presentation is explicit bounded plain text and canonical route is not model-selected', async t => {
  for(const presentation of [undefined,{title:'<b>Title</b>',dek:'Safe'},{title:'x'.repeat(161),dek:'Safe'},{title:'Safe',dek:'x'.repeat(501)},{title:' Safe ',dek:'Safe'},{title:'Safe',dek:'line\ncontrol'}]) { const x=await fixture(t); x.manifest.presentation=presentation; assert.ok((await rejected(x)).errors.includes('bounded_plain_text_presentation_required')); }
  const x=await fixture(t); x.manifest.canonicalUrl='https://evil.example'; const r=await ingestCloudNewsroomV2Bundle(x); assert.equal(r.publication.canonicalUrl,'https://ltcmagazine.org/conversations/editions/2026-11-16/');
});
test('cover PNG header dimensions and CRC are checked against actual bytes', async t => {
  const x=await fixture(t),a=x.manifest.artifacts.find(a=>a.role==='cover'),file=path.join(x.bundleRoot,a.path),bytes=await readFile(file); bytes[20]=1; await writeFile(file,bytes); a.sha256=createHash('sha256').update(bytes).digest('hex'); const r=await rejected(x); assert.ok(r.errors.includes('invalid_cover_png_header_crc'));
});
test('actual HTML active content rejected even with matching declared hash and size', async t => {
 for (const html of ['<!doctype html><html><head><title>X</title></head><body><script>alert(1)</script></body></html>', '<!doctype html><html><head><title>X</title></head><body><p onclick="alert(1)">X</p></body></html>']) {
  const x=await fixture(t),a=x.manifest.artifacts.find(a=>a.role==='html');
  await writeFile(path.join(x.bundleRoot,a.path),html);a.sha256=createHash('sha256').update(html).digest('hex');a.bytes=Buffer.byteLength(html);
  const r=await rejected(x);assert.ok(r.errors[0].startsWith('html_safety_hold:'));
 }
});

// Synthetic external coordinator observations only, never production trust creation.
function policyFixture(s){
 Object.assign(s,{url:'https://api.exchange.coinbase.com/products/BTC-USD/ticker',metricKind:'venue-quote',snapshotSha256:'e'.repeat(64),parserId:'coinbase-ticker',parserVersion:'1',publisherId:'coinbase',evidence:{kind:'snapshot',path:'evidence/btc.json',sha256:'e'.repeat(64),retrievedAt:s.retrievedAt}});
 const key=JSON.stringify([s.id,s.url,s.metricKind]);
 return {trustedSourcePolicies:{[key]:{classification:'current',publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion,maxRetrievalAgeSeconds:7200,maxEffectiveAgeSeconds:7200}},trustedEvidence:{[key]:{kind:'snapshot',bytesObserved:true,sourceId:s.id,url:s.url,snapshotSha256:s.snapshotSha256,path:s.evidence.path,retrievedAt:s.retrievedAt,publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion}}};
}
test('actual ingestion holds stale quote and Morpho despite bundle24h window',async t=>{
 for(const [kind,effective,cap]of [['venue-quote','2026-11-16T16:59:59Z',7200],['morpho','2026-11-16T18:44:59Z',900]]){
  const x=await fixture(t),s=x.manifest.sources[0],old=JSON.stringify([s.id,s.url,s.metricKind]);s.metricKind=kind;s.effectiveAt=effective;s.maxRetrievalAgeSeconds=86400;s.maxEffectiveAgeSeconds=86400;
  const key=JSON.stringify([s.id,s.url,s.metricKind]),p=x.trustedSourcePolicies[old],e=x.trustedEvidence[old];x.trustedSourcePolicies={[key]:{...p,maxRetrievalAgeSeconds:cap,maxEffectiveAgeSeconds:cap}};x.trustedEvidence={[key]:e};
  const r=await rejected(x);assert.ok(r.errors.includes('source_age_cap_exceeded'));assert.ok(r.errors.includes('source_effective_value_stale'));
 }
});
test('actual ingestion requires external evidence and preserves provenance',async t=>{
 const x=await fixture(t),r=await ingestCloudNewsroomV2Bundle(x);assert.equal(r.validation.manifest.sources[0].snapshotSha256,x.manifest.sources[0].snapshotSha256);assert.deepEqual(r.validation.manifest.sources[0].evidence,x.manifest.sources[0].evidence);
 delete x.trustedEvidence;await rejected(x);
});
test('explicit historical policy and null effective age pass real-file ingestion',async t=>{
 const x=await fixture(t),s=x.manifest.sources[0],p=Object.values(x.trustedSourcePolicies)[0];
 s.classification='historical';s.effectiveAt='2026-11-13';s.maxEffectiveAgeSeconds=null;s.label='Dated historical observation; not current';p.classification='historical';p.maxEffectiveAgeSeconds=null;
 const r=await ingestCloudNewsroomV2Bundle(x);assert.equal(r.status,'accepted-receipt',JSON.stringify(r.errors));assert.equal(r.validation.manifest.sources[0].maxEffectiveAgeSeconds,null);
 p.classification='current';await rejected(x);
});
test('coordinator-observed failed fetch is a withheld gap, never a fabricated snapshot',async t=>{
 const x=await fixture(t),s=x.manifest.sources[0],key=JSON.stringify([s.id,s.url,s.metricKind]);
 Object.assign(s,{status:'unavailable',claimVerified:false,value:null,effectiveAt:null,maxEffectiveAgeSeconds:null,snapshotSha256:null,evidence:{kind:'fetch-attempt',attemptId:'attempt-1',retrievedAt:s.retrievedAt,outcome:'timeout'}});
 x.manifest.scope.coveredSourceIds=[];x.manifest.gaps=[{sourceId:s.id,reason:'Coordinator observed timeout; values withheld.',valuesWithheld:true}];
 x.trustedEvidence[key]={kind:'fetch-attempt',attempted:true,sourceId:s.id,url:s.url,attemptId:'attempt-1',retrievedAt:s.retrievedAt,outcome:'timeout',publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion};
 const r=await ingestCloudNewsroomV2Bundle(x);assert.equal(r.status,'accepted-receipt',JSON.stringify(r.errors));assert.equal(r.validation.manifest.sources[0].snapshotSha256,null);
 s.value=123;await rejected(x);s.value=null;s.evidence.attemptId='producer-invented';await rejected(x);s.evidence.attemptId='attempt-1';x.trustedEvidence[key].snapshotSha256='f'.repeat(64);await rejected(x);
});
