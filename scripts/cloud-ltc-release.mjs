import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, lstat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isRoutineData, assertRoutineChanges } from './lib/ltc-routine-data.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { GoogleDocsStateAdapter } from './cloud-ltc-docs-state.mjs';
import { rehearseReleaseOperations } from './cloud-ltc-rehearsal.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { performCoordinatedRelease, loadPreviousReleaseManifest } from './cloud-ltc-production.mjs';
import { assertVercelProjectPolicy } from './cloud-ltc-release-providers.mjs';
import { assertReviewedMigrationAcceptance } from './cloud-ltc-migration-gate.mjs';

// Default mode never commits or deploys. Publication requires protected evidence/policy and durable admission.
export const TARGET = Object.freeze({
  repository: 'Satnam-Satoshi/Satoshi-Langar',
  project: 'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx', team: 'team_yc5ZBvCbWT2M7iGyj3vQDOzk',
  domains: ['https://satnamsatoshi.com', 'https://ltcmagazine.org'],
  scope: 'baba-g-s-projects',
});
const requireThat = (value, code) => { if (!value) throw new Error(code); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const time = () => new Date().toISOString();
// Tracked, implementation-guarded source configuration replaces historical branch/alias constants.
// The baseline is an ancestry floor, not permission to publish or accept a new implementation.
export function acceptedSourceConfig(value) {
  requireThat(value?.schemaVersion === 1 && value.repository === TARGET.repository &&
    typeof value.branch === 'string' && /^agent\/[a-z0-9][a-z0-9/-]{0,150}$/.test(value.branch) &&
    !value.branch.includes('..') && !value.branch.endsWith('/') && !value.branch.includes('//') &&
    /^[a-f0-9]{40}$/.test(value.acceptedBaseline ?? '') && value.canonical === TARGET.domains[0], 'invalid_accepted_source');
  return Object.freeze({ repository: value.repository, branch: value.branch, acceptedBaseline: value.acceptedBaseline, canonical: value.canonical });
}
export const isEditionData = isRoutineData;
export const cleanEnvironment = env => Object.fromEntries(Object.entries(env).filter(([key]) => ['PATH', 'HOME', 'USERPROFILE', 'SystemRoot', 'TMPDIR', 'TMP', 'TEMP', 'CI', 'LANG', 'LC_ALL'].includes(key)));
function command(binary, args, cwd, env = cleanEnvironment(process.env)) {
  try { return execFileSync(binary, args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 900_000, maxBuffer: 32 * 1024 * 1024 }); }
  catch { throw new Error(`command_failed_${path.basename(binary).replace(/[^a-zA-Z0-9_-]/g, '_')}`); }
}
function commandBytes(binary, args, cwd) {
  try { return execFileSync(binary, args, { cwd, env: cleanEnvironment(process.env), stdio: ['ignore', 'pipe', 'pipe'], timeout: 900_000, maxBuffer: 32 * 1024 * 1024 }); }
  catch { throw new Error('protected_candidate_read_failed'); }
}
export async function collectorCommand(binary, args, cwd, normalizedFile, execute = execFileSync, readNormalized = readFile) {
  let output;
  try { output = execute(binary, args, { cwd, env: cleanEnvironment(process.env), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 900_000, maxBuffer: 32 * 1024 * 1024 }); }
  catch (error) {
    // Exit 2 is the documented complete-unavailability result, not permission
    // to ignore crashes. A normalized snapshot must exist before gap handling.
    if (error.status !== 2) throw new Error('collector_failed');
    output = '';
  }
  try { JSON.parse(await readNormalized(normalizedFile, 'utf8')); }
  catch { throw new Error('invalid_collector_snapshot'); }
  return output;
}
const git = (root, args) => command('git', args, root).trim();
export async function implementationDigest(root) {
  const files = command('git', ['ls-files', '-z'], root).split('\0').filter(Boolean).sort();
  const hash = createHash('sha256');
  for (const file of files) {
    const info = await lstat(path.join(root, file));
    requireThat(info.isFile() && !info.isSymbolicLink(), 'non_regular_tracked_file');
    if (isEditionData(file)) continue;
    hash.update(file + '\0'); hash.update(await readFile(path.join(root, file))); hash.update('\0');
  }
  return hash.digest('hex');
}
export async function verifyImplementation(root, expected) {
  requireThat(/^[a-f0-9]{64}$/.test(expected ?? ''), 'accepted_digest_required');
  requireThat(await implementationDigest(root) === expected, 'implementation_changed');
}
export function assertControls({ policy, cloudValue, remoteHead, expectedHead }) {
  requireThat(policy?.policyId === 'bounded-daily-v1' && policy.enabled === true && policy.paused === false, 'publication_paused');
  requireThat(cloudValue === 'true', 'cloud_publication_disabled');
  requireThat(/^[a-f0-9]{40}$/.test(expectedHead) && remoteHead === expectedHead, 'remote_head_changed');
}
export const assertChanges = assertRoutineChanges;

export function pathsFor(editionId) {
  requireThat(/^\d{4}-\d{2}-\d{2}-r[1-9]\d?$/.test(editionId), 'invalid_edition_id');
  const date = editionId.slice(0, 10);
  return ['index.html', 'conversations/index.html', 'conversations/archive/index.html',
    `conversations/archive/${date.slice(0, 7)}/index.html`, `conversations/editions/${date}/index.html`,
    `conversations/editions/${editionId}/index.html`, 'conversations/feed.xml',
    `data/ltc-editions/${editionId}.json`, 'data/ltc-editions/index.json', 'data/ltc-snapshot.json'];
}
export function parseDeploymentOutput(output) {
  const text = output.trim();
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/.test(text)) return { url: text.replace(/\/$/, ''), id: null };
  let result;
  try { result = JSON.parse(text); } catch { throw new Error('invalid_deployment_output'); }
  const deployment = result?.deployment;
  requireThat(result?.status === 'ok' && /^dpl_[A-Za-z0-9]+$/.test(deployment?.id ?? '') && deployment.readyState === 'READY' && deployment.target === 'production', 'invalid_deployment_output');
  requireThat(typeof deployment.url === 'string', 'invalid_candidate_url');
  const url = deployment.url.startsWith('https://') ? deployment.url : `https://${deployment.url}`;
  requireThat(/^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/.test(url), 'invalid_candidate_url');
  return { url: url.replace(/\/$/, ''), id: deployment.id };
}
export function withVercelAuth(args, token) {
  requireThat(typeof token === 'string' && token.length > 10, 'deployment_credential_missing');
  const split = args.indexOf('--');
  const global = ['--scope', TARGET.scope, '--token', token];
  // Curl passthrough arguments follow --; Vercel authentication must precede it.
  return split === -1 ? [...args, ...global] : [...args.slice(0, split), ...global, ...args.slice(split)];
}
function routeFor(file) {
  return '/' + (file.endsWith('/index.html') ? file.slice(0, -10) : file === 'index.html' ? '' : file);
}
// Exact reviewed Build Output redirect policy from prepare-vercel-output.mjs.
// Archived alias bytes remain in the backup; their HTTP routes intentionally
// resolve to these canonical records, whose bytes must also be in the manifest.
export function intendedReadbackRecord(record, manifest) {
  requireThat(/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(record?.file ?? '') && !record.file.split('/').some(part => part === '.' || part === '..') && /^[a-f0-9]{64}$/.test(record.sha256 ?? ''), 'invalid_candidate_manifest');
  const route = routeFor(record.file);
  let location;
  if (/^\/conversations\/specials\/litecoin-at-15(?:\/.*)?$/.test(route)) location = '/conversations/specials/proof-of-birthday/';
  if (['/magazine/litecoin-15/Litecoin-at-15-84-page-advance-edition.pdf', '/magazine/proof-of-birthday/Proof-of-Birthday-LTC-84-pages-r2.pdf'].includes(route)) location = '/magazine/proof-of-birthday/Proof-of-Birthday-LTC-84-pages-r3.pdf';
  if (!location) return { route, sha256: record.sha256 };
  const canonicalFile = location.endsWith('/') ? `${location.slice(1)}index.html` : location.slice(1);
  const target = manifest.find(item => item.file === canonicalFile);
  requireThat(target && /^[a-f0-9]{64}$/.test(target.sha256), 'redirect_target_missing_from_manifest');
  return { route, sha256: target.sha256, redirect: { status: 308, location } };
}
async function verifyIntendedReadback(expected, read) {
  let response = await read(expected.route);
  if (expected.redirect) {
    requireThat(response.status === expected.redirect.status && response.location === expected.redirect.location && !response.redirected, 'reviewed_redirect_changed');
    await response.cancel?.();
    response = await read(expected.redirect.location);
  }
  requireThat(response.status === 200 && !response.redirected, 'unexpected_artifact_status');
  const bytes = Buffer.from(await response.bytes());
  requireThat(bytes.length <= 12 * 1024 * 1024, 'response_too_large');
  requireThat(sha(bytes) === expected.sha256, 'deployed_artifact_mismatch');
}
function protectedHttpResponse(raw) {
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  const boundary = bytes.indexOf('\r\n\r\n');
  requireThat(boundary > 0 && boundary <= 65_536, 'invalid_protected_http_response');
  const lines = bytes.subarray(0, boundary).toString('latin1').split('\r\n');
  const status = /^HTTP\/(?:1\.[01]|2|3) ([1-5]\d\d)(?: [^\r\n]*)?$/.exec(lines.shift());
  requireThat(status, 'invalid_protected_http_response');
  let location = null;
  for (const line of lines) {
    const header = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*([^\r\n]*)$/.exec(line);
    requireThat(header, 'invalid_protected_http_response');
    if (header[1].toLowerCase() === 'location') { requireThat(location === null, 'invalid_protected_http_response'); location = header[2]; }
  }
  return { status: Number(status[1]), location, redirected: false, bytes: async () => bytes.subarray(boundary + 4) };
}
export async function verifyProtectedCandidate(deploymentId, editionId, manifest, readWithCli) {
  const required = pathsFor(editionId);
  requireThat(required.every(file => manifest.some(record => record.file === file)), 'invalid_candidate_manifest');
  return verifyProtectedManifestRecords(deploymentId, manifest, manifest, readWithCli);
}
export async function verifyProtectedManifestRecords(deploymentId, records, manifest, readWithCli) {
  requireThat(/^dpl_[A-Za-z0-9]+$/.test(deploymentId), 'candidate_identity_failed');
  requireThat(Array.isArray(manifest) && Array.isArray(records) && records.length > 0 && new Set(records.map(record => record.file)).size === records.length && new Set(manifest.map(record => record.file)).size === manifest.length && manifest.every(record => /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(record.file) && !record.file.split('/').some(part => part === '.' || part === '..') && /^[a-f0-9]{64}$/.test(record.sha256)) && records.every(record => manifest.some(item => item.file === record.file && item.sha256 === record.sha256)), 'invalid_candidate_manifest');
  for (const record of records) {
    const expected = intendedReadbackRecord(record, manifest);
    await verifyIntendedReadback(expected, async route => protectedHttpResponse(await readWithCli(['curl', route, '--deployment', deploymentId, '--', '--include', '--silent', '--show-error', '--max-time', '30', '--max-redirs', '0', '--proto', '=https'])));
  }
}
async function responseBytes(url, options = {}) {
  let response;
  try { response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(30_000) }); }
  catch { throw new Error('network_request_failed'); }
  requireThat(response.ok, `http_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  requireThat(bytes.length <= 12 * 1024 * 1024, 'response_too_large');
  return bytes;
}
export function publicReadbackRecord(base, record, manifest) {
  if (base === 'https://ltcmagazine.org' && record.file === 'index.html') {
    const magazineHome = manifest.find(item => item.file === 'conversations/index.html');
    requireThat(magazineHome && /^[a-f0-9]{64}$/.test(magazineHome.sha256), 'invalid_candidate_manifest');
    return { route: '/conversations/', sha256: magazineHome.sha256 };
  }
  return intendedReadbackRecord(record, manifest);
}
export async function verifyPublicManifestRecord(base, record, manifest, { fetchImpl = fetch } = {}) {
  requireThat(TARGET.domains.includes(base), 'invalid_candidate_manifest');
  const expected = publicReadbackRecord(base, record, manifest);
  await verifyIntendedReadback(expected, async route => {
    let response;
    try { response = await fetchImpl(base + route, { redirect: 'manual', signal: AbortSignal.timeout(30_000) }); }
    catch { throw Error('network_request_failed'); }
    return { status: response.status, location: response.headers.get('location'), redirected: response.redirected, bytes: () => response.arrayBuffer(), cancel: () => response.body?.cancel() };
  });
}
export async function verifyPublicRootRouting(base, manifest, { fetchImpl = fetch } = {}) {
  requireThat(TARGET.domains.includes(base) && Array.isArray(manifest), 'invalid_candidate_manifest');
  const expected = manifest.find(record => record.file === (base === TARGET.domains[1] ? 'conversations/index.html' : 'index.html'));
  requireThat(expected && /^[a-f0-9]{64}$/.test(expected.sha256), 'invalid_candidate_manifest');
  const read = async url => {
    try { return await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(30_000) }); }
    catch { throw new Error('network_request_failed'); }
  };
  let response = await read(base + '/'); const rootStatus = response.status;
  if (response.status !== 200) {
    requireThat(base === TARGET.domains[1] && [301,302,307,308].includes(response.status) && response.headers.get('location') === '/conversations/', 'public_root_routing_changed');
    await response.body?.cancel().catch(() => {});
    response = await read(base + '/conversations/');
  }
  requireThat(response.status === 200 && !response.redirected, 'public_root_routing_changed');
  const bytes = Buffer.from(await response.arrayBuffer());
  requireThat(bytes.length <= 12 * 1024 * 1024 && sha(bytes) === expected.sha256, 'deployed_artifact_mismatch');
  return { rootStatus, destination: base === TARGET.domains[1] ? '/conversations/' : '/', bytesVerified: true };
}
async function verifySite(base, manifest) {
  await verifyPublicRootRouting(base, manifest);
  for (const record of manifest) {
    await verifyPublicManifestRecord(base, record, manifest);
  }
}
function apiClients(env) {
  const request = async (origin, endpoint, token, method = 'GET', body) => {
    requireThat(typeof token === 'string' && token.length > 10, 'deployment_credential_missing');
    const bytes = await responseBytes(`${origin}${endpoint}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    try { return JSON.parse(bytes); } catch { throw new Error('invalid_api_response'); }
  };
  return {
    github: (endpoint, method, body) => request('https://api.github.com', `/repos/${TARGET.repository}${endpoint}`, env.GITHUB_TOKEN, method, body),
    vercel: endpoint => request('https://api.vercel.com', `${endpoint}${endpoint.includes('?') ? '&' : '?'}teamId=${TARGET.team}`, env.VERCEL_TOKEN),
  };
}
async function controls(github, expectedHead, acceptedSource) {
  // The workflow variable gates admission. A freshly read policy/head is the in-flight stop control.
  const [ref, policyFile] = await Promise.all([
    github(`/git/ref/heads/${acceptedSource.branch}`),
    github(`/contents/config/ltc-publication.json?ref=${encodeURIComponent(acceptedSource.branch)}`),
  ]);
  let policy;
  try { policy = JSON.parse(Buffer.from(policyFile.content, 'base64')); } catch { throw new Error('invalid_remote_policy'); }
  assertControls({ policy, cloudValue: 'true', remoteHead: ref.object?.sha, expectedHead });
}
async function changesIn(root) {
  const output = command('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], root);
  return output.split('\0').filter(Boolean).map(line => ({ status: line.slice(0, 2).trim(), file: line.slice(3) }));
}
function parseArgs(argv) {
  const options = { publish: false, root: process.cwd(), receipt: '', expected: process.env.LTC_ACCEPTED_IMPLEMENTATION_SHA256 ?? '' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') continue;
    if (argv[i] === '--publish') { options.publish = true; continue; }
    const field = { '--root': 'root', '--receipt': 'receipt', '--expected-digest': 'expected', '--state-config': 'stateConfig', '--evidence-config': 'evidenceConfig', '--rollback-manifest': 'rollbackManifest' }[argv[i]];
    requireThat(field && argv[i + 1] && !argv[i + 1].startsWith('--'), 'invalid_arguments');
    options[field] = argv[++i];
  }
  return options;
}
// Only the real private revision-CAS adapter may admit a publication lease.
// Historical proof and owner policy are validated separately; no memory fallback.
export function requireDurableAdapter(adapter) {
  requireThat(adapter instanceof GoogleDocsStateAdapter, 'durable_adapter_required');
}
export async function admitDurablePublication({adapter, runId, key = 'website', clock = Date.now}) {
  requireDurableAdapter(adapter);
  requireThat(/^gha-[0-9]{1,30}-[0-9]{1,6}$/.test(runId ?? ''), 'invalid_cloud_run_id');
  const state = new DurableCloudState(adapter, key, {clock});
  // acquire validates pause/restoreHold, unresolved intents and active lease,
  // then persists its fencing token using the real adapter's revision CAS.
  const lease = await state.acquire(runId, 3_600_000);
  return {state, lease};
}
export async function releaseUnusedAdmission(admission) {
  try {
    const document = await admission.state.inspect();
    if (document.lease?.runId !== admission.lease.runId || document.lease?.fence !== admission.lease.fence || Object.values(document.intents).some(intent => intent.fence === admission.lease.fence)) return false;
    await admission.state.release(admission.lease); return true;
  } catch { return false; } // An ambiguous state read/write never frees a writer.
}
export async function runRelease(options, env = process.env, dependencies = {}) {
  if (options.publish && !options.stateConfig) requireDurableAdapter(dependencies.stateAdapter); // Explicit private runtime config or verified adapter; never fallback.
  const root = path.resolve(options.root);
  await verifyImplementation(root, options.expected); // Before pnpm, collector, build or other source execution.
  requireThat(!git(root, ['status', '--porcelain=v1', '--untracked-files=no']), 'tracked_checkout_not_clean');
  const source = git(root, ['rev-parse', 'HEAD']);
  command('git', ['ls-files', '--error-unmatch', 'config/ltc-cloud-source.json'], root);
  const acceptedSource = acceptedSourceConfig(JSON.parse(await readFile(path.join(root, 'config/ltc-cloud-source.json'), 'utf8')));
  command('git', ['merge-base', '--is-ancestor', acceptedSource.acceptedBaseline, source], root);
  const record = { schemaVersion: 1, mode: options.publish ? 'publish' : 'dry-run', startedAt: time(), status: 'started', source, implementationSha256: options.expected, published: false, acceptedSource };
  const scratch = await mkdtemp(path.join(tmpdir(), 'ltc-cloud-'));
  record.scratchDirectory = scratch;
  const clone = path.join(scratch, 'source');
  const receiptPath = path.resolve(options.receipt || path.join(scratch, 'receipt.json'));
  await mkdir(path.dirname(receiptPath), { recursive: true });
  const save = async () => writeFile(receiptPath, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
  await save();
  let admission; let stateConfig;
  try {
    const { github, vercel } = apiClients(env);
    if (options.publish) {
      requireThat(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === TARGET.repository && env.GITHUB_REF === 'refs/heads/main', 'approved_actions_context_required');
      requireThat(env.LTC_CLOUD_PUBLISH === 'true', 'cloud_publication_disabled');
      const migration = readReviewedMigrationConfiguration(env);
      if (!migration) assertMigrationAcceptance(); // Missing proof/policy stays closed before any private read.
      await controls(github, source, acceptedSource);
      let stateAdapter = dependencies.stateAdapter;
      if (options.stateConfig) {
        stateConfig = JSON.parse(await readFile(path.resolve(options.stateConfig), 'utf8'));
        ({ stateAdapter } = await createGoogleStateRuntime({ config: stateConfig, env }));
      }
      const bindings = migration.pins.stagePins.bindings;
      requireThat(stateConfig?.documentId === bindings.websiteDocumentId && stateConfig.folderId === bindings.folderId && env.LTC_ACCEPTED_IMPLEMENTATION_SHA256 === options.expected, 'private_storage_required');
      record.migrationProof = assertMigrationAcceptance({ document: await new DurableCloudState(stateAdapter, 'website').inspect(), configuration: migration, currentControllerImplementationSha256: options.expected });
      record.migrationConfigurationSha256 = sha(JSON.stringify(migration));
      admission = await admitDurablePublication({adapter:stateAdapter, runId:`gha-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`});
      record.durableAdmission = {key:'website', ...admission.lease};
      await save();
      // An interrupted external intent retains its fence; owner-reviewed proof
      // does not authorize replay, lease stealing or removing a retained UNKNOWN.
    }
    command('git', ['clone', '--local', '--no-hardlinks', '--no-checkout', root, clone], scratch);
    command('git', ['checkout', '--detach', source], clone);
    await verifyImplementation(clone, options.expected);
    const policy = JSON.parse(await readFile(path.join(clone, 'config/ltc-publication.json'), 'utf8'));
    assertControls({ policy, cloudValue: 'true', remoteHead: source, expectedHead: source });
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const archive = JSON.parse(await readFile(path.join(clone, 'content/ltc/index.json'), 'utf8'));
    let edition = archive.filter(item => item.date === date).sort((a, b) => b.revision - a.revision)[0];
    // Private observations are always refreshed, even when today's immutable issue exists.
    const evidence = path.join(scratch, 'evidence');
    await mkdir(evidence, { mode: 0o700 });
    record.evidenceDirectory = evidence; await save();
    const inputs = Object.fromEntries(['base', 'intelligence', 'policy', 'community', 'builders'].map(name => [name, path.join(evidence, `${name}.json`)]));
    await prepareObservations({ clone, evidence, inputs, existingEdition: Boolean(edition) });
    record.evidence = await Promise.all(Object.entries(inputs).map(async ([kind, file]) => ({ kind, sha256: sha(await readFile(file)) })));
    if (!edition) edition = JSON.parse(await readFile(path.join(clone, `content/ltc/${date}-r1.json`), 'utf8'));
    record.distributionSourceSha256 = sha(await readFile(path.join(evidence, 'litecoin-distribution-raw.json')));
    record.edition = edition.id;
    record.snapshotSha256 = sha(await readFile(path.join(clone, 'public/data/ltc-snapshot.json')));
    const initialChanges = await changesIn(clone);
    if (initialChanges.length) assertChanges(initialChanges, edition.id);
    command('pnpm', ['install', '--frozen-lockfile'], clone);
    command(process.execPath, ['scripts/prepare-ltc-daily-graphic.mjs', '--edition', `content/ltc/${edition.id}.json`, '--publish'], clone);
    record.publicationProvenance = { editionSha256: sha(await readFile(path.join(clone, `content/ltc/${edition.id}.json`))), sourceDeskSha256: sha(await readFile(path.join(clone, 'content/ltc-newsroom-selections/latest.json'))), dailyGraphicSha256: sha(await readFile(path.join(clone, `public/magazine/daily/${edition.id}/social.png`))) };
    command('pnpm', ['check'], clone);
    command('pnpm', ['release:prepare'], clone);
    await verifyImplementation(clone, options.expected);
    const changes = await changesIn(clone);
    if (changes.length) assertChanges(changes, edition.id);
    const manifest = await builtManifest(path.join(clone, 'dist'));
    requireThat(pathsFor(edition.id).every(file => manifest.some(record => record.file === file)), 'invalid_candidate_manifest');
    record.buildOutput = await builtOutputManifest(path.join(clone, '.vercel/output'));
    record.buildOutputSha256 = sha(JSON.stringify(record.buildOutput));
    requireThat(manifest.some(item => item.file === `magazine/daily/${edition.id}/social.png` && item.sha256 === record.publicationProvenance.dailyGraphicSha256) && manifest.some(item => item.file === `magazine/daily/${edition.id}/graphic.json`), 'invalid_candidate_manifest');
    record.artifacts = manifest;
    record.artifactManifestSha256 = sha(JSON.stringify(manifest));
    record.changedFiles = changes.map(item => item.file);
    if (!options.publish) {
      record.operationRehearsal = await rehearseReleaseOperations({ directory: path.join(scratch, 'operation-rehearsal'), source, editionId: edition.id, manifest, evidence: record.evidence });
      record.status = 'dry-run-passed'; record.completedAt = time(); await save();
      return { status: record.status, receipt: receiptPath, published: false };
    }
    const project = await vercel(`/v9/projects/${TARGET.project}`);
    record.projectPolicy = assertVercelProjectPolicy(project, TARGET);
    requireThat(options.evidenceConfig, 'production_recovery_configuration_required');
    const evidenceConfig = JSON.parse(await readFile(path.resolve(options.evidenceConfig), 'utf8'));
    const rollbackManifest = options.rollbackManifest ? JSON.parse(await readFile(path.resolve(options.rollbackManifest), 'utf8')) : await loadPreviousReleaseManifest({ state: admission.state, evidenceConfig, env });
    requireThat(stateConfig && evidenceConfig.folderId === stateConfig.folderId && evidenceConfig.ownerPermissionId === readReviewedMigrationConfiguration(env).pins.stagePins.bindings.ownerPermissionId, 'private_storage_required');
    const { createAcceptanceLinkedClient } = await import('./cloud-ltc-acceptance.mjs');
    const { createDurableVercelCommand, createPortableDeploymentWorkspace } = await import('./cloud-ltc-promotion-runtime.mjs');
    const portable = await createPortableDeploymentWorkspace({ sourceRoot: clone, directory: path.join(scratch, 'portable-deployment'), buildOutput: record.buildOutput });
    record.portableArtifact = { buildOutputSha256: portable.buildOutputSha256, vercelConfigSha256: portable.vercelConfigSha256, gitless: true };
    await save();
    const linked = createAcceptanceLinkedClient({ env, vercel, directory: portable.root, report: async diagnostic => { record.safeCliFailure = diagnostic; await save(); } });
    await linked.verifyVersion();
    const vercelCommand = createDurableVercelCommand({ env, state: admission.state, lease: admission.lease, vercel, linked, root: portable.root });
    const result = await performCoordinatedRelease({
      admission, root: clone, source, changes, editionId: edition.id, acceptedSource,
      startedAt: record.startedAt, target: TARGET, github, vercel, cli: vercelCommand,
      controls: commit => controls(github, commit, acceptedSource),
      verifyImplementation: () => verifyImplementation(clone, options.expected),
      verifyMigration: async () => assertMigrationAcceptance({ document: await admission.state.inspect(), configuration: readReviewedMigrationConfiguration(env), currentControllerImplementationSha256: options.expected }),
      verifyBuildOutput: async () => { requireThat(sha(JSON.stringify(await builtOutputManifest(path.join(clone, '.vercel/output')))) === record.buildOutputSha256, 'built_output_changed'); await portable.verify(); },
      verifyProtected: deployment => linked.readProtected(deployment, manifest, manifest),
      verifyPublic: expected => verifyPublicDomains(expected),
      manifest, buildOutput: record.buildOutput, rollbackManifest, evidenceDirectory: evidence,
      evidenceConfig, publicationProvenance: record.publicationProvenance, env, saveReceipt: async update => { Object.assign(record, update); await save(); },
    });
    Object.assign(record, result, { status: result.status ?? 'published', completedAt: time() }); await save();
    return { status: record.status, receipt: receiptPath, published: record.published };
  } catch (error) {
    if (admission) record.unusedLeaseReleased = await releaseUnusedAdmission(admission);
    record.status = record.status === 'rolled-back' ? 'rolled-back' : 'withheld';
    record.failure = safeFailure(error); record.completedAt = time(); await save();
    throw new Error(record.failure);
  }
}
// Activation requires reviewed durable leases, crash reconciliation, evidence restore,
// dual-domain promotion/rollback proof and coordinated local-writer cutover.
// An environment switch cannot substitute for those unimplemented acceptance controls.
export async function prepareObservations({ clone, evidence, inputs, existingEdition }, execute = command, save = writeFile) {
  const run = args => execute(process.execPath, args, clone);
  const collect = async (args, file) => execute === command ? collectorCommand(process.execPath, args, clone, file) : run(args);
  const baseSnapshot = await run(['scripts/collect-ltc.mjs', '--stdout']);
  JSON.parse(baseSnapshot);
  await save(inputs.base, baseSnapshot, { flag: 'wx', mode: 0o600 });
  await collect(['scripts/collect-ltc-intelligence.mjs', '--output', inputs.intelligence, '--evidence-dir', path.join(evidence, 'intelligence-raw')], inputs.intelligence);
  await collect(['scripts/collect-ltc-policy.mjs', '--output', inputs.policy], inputs.policy);
  await collect(['scripts/collect-ltc-community.mjs', '--output', inputs.community, '--evidence-dir', path.join(evidence, 'community-raw')], inputs.community);
  const observationArgs = ['--snapshot', inputs.base, '--intelligence', inputs.intelligence, '--policy', inputs.policy];
  const flagship = ['scripts/prepare-ltc-flagship.mjs', ...observationArgs];
  const builders = inputs.builders ?? path.join(evidence, 'builders.json');
  await run(['scripts/collect-ltc-builder-news.mjs', '--output', builders, '--evidence-dir', path.join(evidence, 'builders-raw')]);
  const distribution = path.join(evidence, 'litecoin-distribution-raw.json');
  await run(['scripts/collect-litecoin-distribution.mjs', '--output', distribution]);
  // Validate all observations before accepted feature/edition writes.
  await run(['scripts/check-ltc-observations.mjs', ...observationArgs, '--builders', builders]);
  await run(['scripts/prepare-ltc-daily-features.mjs', '--builders', builders, '--policy', inputs.policy, '--publish']);
  await run([...flagship, '--output', path.join(evidence, 'flagship-candidate.json')]);
  await run(['scripts/prepare-litecoin-distribution.mjs', '--snapshot', distribution, '--publish']);
  if (!existingEdition) {
    await run([...flagship, '--publish']);
  }
  // This pointer is current context, not an immutable edition. Publish only after
  // the flagship candidate has accepted source dates/freshness; retain raw source
  // timestamps verbatim. Same-day retries must not leave a stale accepted strip.
  await save(path.join(clone, 'public/data/ltc-snapshot.json'), baseSnapshot);
  await run(['scripts/archive-ltc-community.mjs', '--snapshot', inputs.community]);
  await run(['scripts/prepare-ltc-newsroom.mjs', ...observationArgs, '--output', path.join(evidence, 'newsroom-candidate.json'), '--apply']);
  await run(['scripts/prepare-ltc-source-desk.mjs', '--notebook', path.join(clone, 'content/ltc-newsroom/latest.json'), '--builders', builders, '--apply']);
}
export function readReviewedMigrationConfiguration(env) {
  const raw = env.LTC_MIGRATION_ACCEPTANCE_JSON, expected = env.LTC_MIGRATION_ACCEPTANCE_SHA256;
  if (raw === undefined && expected === undefined) return null;
  requireThat(typeof raw === 'string' && Buffer.byteLength(raw) <= 128_000 && /^[a-f0-9]{64}$/.test(expected ?? ''), 'migration_acceptance_pending');
  let value; try { value = JSON.parse(raw); } catch { throw Error('migration_acceptance_pending'); }
  requireThat(sha(JSON.stringify(value)) === expected, 'migration_acceptance_pending'); return value;
}
export function assertMigrationAcceptance(input) { return assertReviewedMigrationAcceptance(input ?? {}); }
export async function builtManifest(directory) {
  const records = [];
  async function walk(relative = '') {
    for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
      const file = relative ? `${relative}/${entry.name}` : entry.name;
      requireThat(!entry.isSymbolicLink(), 'non_regular_tracked_file');
      if (entry.isDirectory()) await walk(file);
      else { requireThat(entry.isFile(), 'non_regular_tracked_file'); records.push({ file, sha256: sha(await readFile(path.join(directory, file))) }); }
    }
  }
  await walk();
  return records.sort((a, b) => a.file.localeCompare(b.file));
}
// Entire Build Output API artifact includes .vc-config.json and executable bundles.
// This is provenance only; dynamic runtime observations still require separate acceptance.
export async function builtOutputManifest(directory) {
  const records = await builtManifest(directory);
  requireThat(records.some(record => record.file === 'config.json') && records.some(record => record.file.startsWith('static/')), 'invalid_candidate_manifest');
  requireThat(records.every(record => record.file === 'config.json' || record.file.startsWith('static/') || record.file.startsWith('functions/')), 'invalid_candidate_manifest');
  return records;
}
export async function verifyPublicDomains(manifest, verify = verifySite) {
  for (const domain of TARGET.domains) await verify(domain, manifest);
}
export function safeFailure(error) {
  const message = typeof error?.message === 'string' ? error.message : '';
  const known = new Set(['operation_outcome_uncertain', 'operation_reconciliation_required', 'reconciliation_required', 'release_operation_not_confirmed', 'state_conflict', 'lease_held', 'lease_fenced', 'lease_expired', 'storage_read_failed', 'storage_write_uncertain', 'google_refresh_credentials_required', 'google_refresh_failed', 'google_refresh_scope_mismatch', 'bootstrap_rollback_manifest_required', 'rollback_manifest_unavailable', 'rollback_manifest_changed', 'evidence_file_ids_required', 'evidence_too_large', 'artifact_source_set_too_large', 'state_capacity_exceeded', 'incomplete_release_artifact_backup', 'protected_candidate_read_failed', 'pinned_cli_version_required', 'pinned_cli_version_mismatch', 'production_recovery_configuration_required', 'collector_failed', 'invalid_collector_snapshot', 'migration_acceptance_pending', 'accepted_digest_required', 'implementation_changed', 'publication_paused', 'cloud_publication_disabled', 'remote_head_changed', 'routine_revision_required', 'release_changes_outside_allowlist', 'immutable_edition_changed', 'invalid_edition_id', 'network_request_failed', 'response_too_large', 'deployed_artifact_mismatch', 'deployment_credential_missing', 'invalid_api_response', 'invalid_remote_policy', 'commit_not_confirmed', 'invalid_arguments', 'invalid_accepted_source', 'durable_adapter_required', 'invalid_cloud_run_id', 'built_output_changed', 'tracked_checkout_not_clean', 'approved_actions_context_required', 'wrong_vercel_project', 'native_git_link_requires_owner_resolution', 'verified_rollback_target_required', 'invalid_cli_path', 'invalid_candidate_url', 'invalid_deployment_output', 'invalid_candidate_manifest', 'candidate_identity_failed', 'competing_production_release', 'promotion_identity_failed', 'rollback_not_confirmed', 'promotion_or_public_verification_failed', 'non_regular_tracked_file']);
  for (const code of ['redirect_target_missing_from_manifest', 'reviewed_redirect_changed', 'unexpected_artifact_status', 'invalid_protected_http_response']) known.add(code);
  return known.has(message) || /^http_[1-5]\d{2}$/.test(message) || /^command_failed_(?:node|git|pnpm|vercel)$/.test(message) ? message : 'release_failed_details_withheld';
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  // Finish evaluating this module before runRelease dynamically imports clients
  // which import these exports. Awaiting here creates an async module cycle:
  // release entry -> acceptance/runtime -> unfinished release entry (Node exit13).
  Promise.resolve().then(() => runRelease(parseArgs(process.argv.slice(2))))
    .then(result => { console.log(JSON.stringify(result)); }, error => { console.error(`LTC cloud release withheld: ${safeFailure(error)}`); process.exitCode = 1; });
}
