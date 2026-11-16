import { checkTrustedSourcePolicies } from './cloud-newsroom-v2-source-policy.mjs';
import { inspectCloudNewsroomV2Html, MAX_INERT_HTML_BYTES } from './cloud-newsroom-v2-html-safety.mjs';
/** Bounded, read-only local handoff ingestion. No network, writes or delivery.
 * An accepted receipt verifies the supplied local bytes, not producer identity,
 * research truth, PDF rendering, novelty, or permission to publish. The bundle
 * must be isolated/quiescent: portable Node has no descriptor-relative openat
 * API, so path checks are not a hostile-concurrent-writer security boundary.
 */
import { constants } from 'node:fs';
import { lstat, realpath, open } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { validateCloudNewsroomV2Manifest } from './cloud-newsroom-v2-manifest.mjs';
export const MAX_ARTIFACT_BYTES = 32 * 1024 * 1024;
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const freeze = x => { if (obj(x) || Array.isArray(x)) { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
const plain = (value, limit) => typeof value === 'string' && value.length > 0 && value.length <= limit && value === value.trim() && !/[<>\u0000-\u001f\u007f]/.test(value);
function coverPngDimensions(header) {
  if (header.length < 33 || !header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || header.readUInt32BE(8) !== 13 || header.toString('ascii', 12, 16) !== 'IHDR') fault('invalid_cover_png_header');
  let crc = 0xffffffff;
  for (const byte of header.subarray(12,29)) { crc ^= byte; for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
  if (((crc^0xffffffff)>>>0) !== header.readUInt32BE(29)) fault('invalid_cover_png_header_crc');
  const width=header.readUInt32BE(16), height=header.readUInt32BE(20);
  if (!width || !height || width>20000 || height>20000 || width*height>50000000) fault('cover_dimensions_limit');
  return {width,height,verification:'png-ihdr-with-crc',renderVerified:false};
}
const sameIdentity = (a, b) => a.dev === b.dev && a.ino === b.ino;
const sameFile = (a, b) => sameIdentity(a, b) && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs && a.nlink === b.nlink;
const inside = (root, file) => { const relative = path.relative(root, file); return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative); };
function fault(code) { const error = new Error(code); error.ingestCode = code; throw error; }
function safeRelative(name) { return typeof name === 'string' && name.length <= 300 && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(name) && name.split('/').every(x => x !== '' && x !== '.' && x !== '..'); }
async function inspectPath(root, relative, expectedRoot) {
  if (!safeRelative(relative)) fault('unsafe_artifact_path');
  const currentRoot = await lstat(root);
  if (!currentRoot.isDirectory() || currentRoot.isSymbolicLink() || !sameIdentity(currentRoot, expectedRoot)) fault('bundle_root_changed');
  let current = root;
  const chain = [{ path: root, stat: currentRoot }], parts = relative.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    if (!inside(root, current)) fault('artifact_outside_root');
    const st = await lstat(current);
    if (st.isSymbolicLink()) fault('symlink_refused');
    if (i < parts.length - 1 ? !st.isDirectory() : !st.isFile()) fault('nonregular_artifact_or_parent');
    chain.push({ path: current, stat: st });
  }
  if (await realpath(current) !== current) fault('artifact_path_changed');
  const file = chain.at(-1).stat;
  if (file.nlink !== 1) fault('hardlinked_artifact_refused');
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_ARTIFACT_BYTES) fault('artifact_size_limit');
  return { file: current, stat: file, chain };
}
async function unchangedChain(chain) {
  for (const entry of chain) {
    const st = await lstat(entry.path);
    if (st.isSymbolicLink() || !sameIdentity(st, entry.stat)) fault('bundle_path_changed_during_read');
  }
}
async function observeArtifact(root, artifact, rootStat) {
  const inspection = await inspectPath(root, artifact.path, rootStat);
  if (!Number.isInteger(constants.O_NOFOLLOW)) fault('no_follow_open_unavailable');
  const handle = await open(inspection.file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat();
    if (!before.isFile() || !sameFile(before, inspection.stat) || before.nlink !== 1) fault('artifact_changed_before_read');
    await unchangedChain(inspection.chain);
    const hash = createHash('sha256'), buffer = Buffer.alloc(64 * 1024);
    let bytes = 0, header = Buffer.alloc(0);
    const htmlChunks = [];
    while (true) {
      const count = Math.min(buffer.length, MAX_ARTIFACT_BYTES + 1 - bytes);
      const { bytesRead } = await handle.read(buffer, 0, count, bytes);
      if (!bytesRead) break;
      bytes += bytesRead;
      if (bytes > MAX_ARTIFACT_BYTES) fault('artifact_size_limit');
      hash.update(buffer.subarray(0, bytesRead));
      if (artifact.role === 'html') {
        if (bytes > MAX_INERT_HTML_BYTES) fault('html_safety_byte_bounds');
        htmlChunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
      }
      if (header.length < 33) header = Buffer.concat([header, buffer.subarray(0, Math.min(bytesRead, 33-header.length))]);
    }
    const after = await handle.stat();
    if (!sameFile(before, after) || bytes !== before.size) fault('artifact_changed_during_read');
    await unchangedChain(inspection.chain);
    const final = await lstat(inspection.file);
    if (!final.isFile() || !sameFile(final, after) || await realpath(inspection.file) !== inspection.file) fault('artifact_changed_after_read');
    const htmlSafety = artifact.role === 'html' ? inspectCloudNewsroomV2Html(Buffer.concat(htmlChunks)) : null;
    if (htmlSafety && htmlSafety.status !== 'accepted-inert-subset') fault('html_safety_hold:' + htmlSafety.reason);
    return { ...(htmlSafety ? { htmlSafety } : {}), role: artifact.role, path: artifact.path, editionId: artifact.editionId, revision: artifact.revision,
      sha256: hash.digest('hex'), bytes, verification: 'actual-local-file-bytes',
      ...(artifact.role === 'cover' ? { dimensions: artifact.mimeType === 'image/png' ? coverPngDimensions(header) : null } : {}) };
  } finally { await handle.close(); }
}
/** Required inputs: bundleRoot, now, expectedProducer, manifest,
 * existingDailyIssues. expectedProducer and inventory must be injected by the
 * trusted coordinator, never inferred from the bundle's own manifest. */
export async function ingestCloudNewsroomV2Bundle(input) {
  const limitations = [
    'No producer is configured, invoked or independently authenticated.',
    'Research, novelty and correction approval are external attestations.',
    'Use an isolated/quiescent bundle; portable path checks do not defeat every hostile concurrent directory-swap race.',
    'No publication, credential, email, social or network action is performed. Receipt validity does not extend to later file mutations.',
  ];
  const finish = (status, errors, artifacts = [], validation = null, publication = null, coverDimensions = null) => freeze({ schemaVersion: 1, status, errors, artifacts, validation, publication, coverDimensions, effects: [], operational: false, limitations });
  let request;
  try {
    if (!obj(input) || typeof input.bundleRoot !== 'string' || !path.isAbsolute(input.bundleRoot) || input.bundleRoot.includes('\0') || input.bundleRoot.startsWith('//') || input.bundleRoot.includes('\\') || path.resolve(input.bundleRoot) !== input.bundleRoot) return finish('rejected', ['explicit_absolute_bundle_root_required']);
    request = structuredClone(input);
  } catch { return finish('rejected', ['invalid_ingestion_input']); }
  const { now, expectedProducer, manifest, existingDailyIssues } = request;
  const sourcePolicy=checkTrustedSourcePolicies({sources:manifest?.sources,now,trustedSourcePolicies:request.trustedSourcePolicies,trustedEvidence:request.trustedEvidence});
  if(sourcePolicy.status!=='trusted-source-evidence-matched')return finish('rejected',sourcePolicy.errors);
  if (!obj(manifest?.presentation) || !plain(manifest.presentation.title,160) || !plain(manifest.presentation.dek,500)) return finish('rejected',['bounded_plain_text_presentation_required']);
  // Metadata preflight only. These declared observations do not enter a receipt;
  // the second validation below is bound to fingerprints computed from files.
  let preflight;
  try {
    const declarations = Array.isArray(manifest?.artifacts) ? manifest.artifacts.map(a => obj(a) ? { role: a.role, path: a.path, editionId: a.editionId, revision: a.revision, sha256: a.sha256, bytes: a.bytes } : null) : [];
    preflight = validateCloudNewsroomV2Manifest({ now, expectedProducer, manifest, existingDailyIssues, observedArtifacts: declarations });
  } catch { return finish('rejected', ['invalid_manifest_input']); }
  if (preflight.status !== 'validated-description') return finish('rejected', ['manifest_preflight_failed'], [], preflight);
  const observations = [];
  try {
    const provided = await lstat(request.bundleRoot);
    if (provided.isSymbolicLink()) fault('symlink_bundle_root_refused');
    if (!provided.isDirectory()) fault('bundle_root_not_directory');
    const root = await realpath(request.bundleRoot);
    if (root !== request.bundleRoot) fault('noncanonical_or_symlink_root_ancestry');
    const rootStat = await lstat(root);
    if (!sameIdentity(provided, rootStat) || rootStat.isSymbolicLink()) fault('bundle_root_changed');
    for (const artifact of manifest.artifacts) observations.push(await observeArtifact(root, artifact, rootStat));
    const validation = validateCloudNewsroomV2Manifest({ now, expectedProducer, manifest, existingDailyIssues, observedArtifacts: observations });
    if (validation.status !== 'validated-description') return finish('rejected', ['actual_artifact_validation_failed'], observations, validation);
    const page = `/conversations/editions/${manifest.editionDate}${manifest.revision === 1 ? '' : `-r${manifest.revision}`}/`;
    const publication = { registryId: `${manifest.editionDate}-r${manifest.revision}`, page, canonicalUrl: `https://ltcmagazine.org${page}`, title: manifest.presentation.title, dek: manifest.presentation.dek, preparedAt: validation.manifest.preparedAt, preparedDate: manifest.editionDate };
    return finish('accepted-receipt', [], observations, validation, publication, observations.find(x=>x.role==='cover')?.dimensions ?? null);
  } catch (error) {
    // Never emit absolute paths, underlying OS messages, contents or credentials.
    const code = error?.ingestCode ?? (['ENOENT', 'EACCES', 'EPERM', 'ELOOP', 'ENOTDIR'].includes(error?.code) ? `bundle_read_${error.code.toLowerCase()}` : 'bundle_read_failed');
    return finish('rejected', [code], observations);
  }
}
