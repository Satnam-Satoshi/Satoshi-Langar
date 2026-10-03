import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// DRAFT: nothing schedules this file. Default mode never commits or deploys.
export const TARGET = Object.freeze({
  repository: 'Satnam-Satoshi/Satoshi-Langar', branch: 'agent/community-ecosystem-20260930',
  project: 'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx', team: 'team_yc5ZBvCbWT2M7iGyj3vQDOzk',
  scope: 'baba-g-s-projects', canonical: 'https://https-github-com-satnam-satoshi-sat.vercel.app',
});
const requireThat = (value, code) => { if (!value) throw new Error(code); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const time = () => new Date().toISOString();
export const isEditionData = file => /^content\/ltc\/(?:index|\d{4}-\d{2}-\d{2}-r[1-9]\d?)\.json$/.test(file) || file === 'public/data/ltc-snapshot.json';
export const cleanEnvironment = env => Object.fromEntries(Object.entries(env).filter(([key]) => ['PATH', 'HOME', 'USERPROFILE', 'SystemRoot', 'TMPDIR', 'TMP', 'TEMP', 'CI', 'LANG', 'LC_ALL'].includes(key)));
function command(binary, args, cwd, env = cleanEnvironment(process.env)) {
  try { return execFileSync(binary, args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 900_000, maxBuffer: 32 * 1024 * 1024 }); }
  catch { throw new Error(`command_failed_${path.basename(binary).replace(/[^a-zA-Z0-9_-]/g, '_')}`); }
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
export function assertChanges(changes, editionId) {
  requireThat(/^\d{4}-\d{2}-\d{2}-r1$/.test(editionId), 'routine_revision_required');
  const allowed = new Set(['content/ltc/index.json', `content/ltc/${editionId}.json`, 'public/data/ltc-snapshot.json']);
  for (const change of changes) {
    requireThat(allowed.has(change.file) && ['A', 'M', '??'].includes(change.status), 'release_changes_outside_allowlist');
    if (change.file === `content/ltc/${editionId}.json`) requireThat(change.status !== 'M', 'immutable_edition_changed');
  }
}
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
export async function verifyProtectedCandidate(deploymentId, editionId, manifest, readWithCli) {
  requireThat(/^dpl_[A-Za-z0-9]+$/.test(deploymentId), 'candidate_identity_failed');
  const allowed = new Set(pathsFor(editionId));
  requireThat(manifest.length === allowed.size && new Set(manifest.map(record => record.file)).size === allowed.size && manifest.every(record => allowed.has(record.file) && /^[a-f0-9]{64}$/.test(record.sha256)), 'invalid_candidate_manifest');
  for (const record of manifest) {
    const bytes = await readWithCli(['curl', routeFor(record.file), '--deployment', deploymentId, '--', '--silent', '--show-error', '--location', '--fail', '--max-time', '30', '--max-redirs', '3', '--proto', '=https', '--proto-redir', '=https']);
    requireThat(sha(bytes) === record.sha256, 'deployed_artifact_mismatch');
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
async function verifySite(base, manifest) {
  for (const record of manifest) {
    requireThat(sha(await responseBytes(`${base}${routeFor(record.file)}`)) === record.sha256, 'deployed_artifact_mismatch');
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
async function controls(github, expectedHead) {
  // The workflow variable gates admission. A freshly read policy/head is the in-flight stop control.
  const [ref, policyFile] = await Promise.all([
    github(`/git/ref/heads/${TARGET.branch}`),
    github(`/contents/config/ltc-publication.json?ref=${encodeURIComponent(TARGET.branch)}`),
  ]);
  let policy;
  try { policy = JSON.parse(Buffer.from(policyFile.content, 'base64')); } catch { throw new Error('invalid_remote_policy'); }
  assertControls({ policy, cloudValue: 'true', remoteHead: ref.object?.sha, expectedHead });
}
async function commitData(github, root, base, changes, editionId) {
  assertChanges(changes, editionId);
  if (!changes.length) return base;
  await controls(github, base);
  const previous = await github(`/git/commits/${base}`);
  const tree = [];
  for (const { file } of changes) {
    const blob = await github('/git/blobs', 'POST', { content: (await readFile(path.join(root, file))).toString('base64'), encoding: 'base64' });
    tree.push({ path: file, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const createdTree = await github('/git/trees', 'POST', { base_tree: previous.tree.sha, tree });
  const commit = await github('/git/commits', 'POST', { message: `Publish LTC source edition ${editionId}`, tree: createdTree.sha, parents: [base] });
  await controls(github, base);
  // The commit is a child of the observed head; force:false rejects a competing branch advance.
  const update = await github(`/git/refs/heads/${TARGET.branch}`, 'PATCH', { sha: commit.sha, force: false });
  requireThat(update.object?.sha === commit.sha, 'commit_not_confirmed');
  return commit.sha;
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
    const field = { '--root': 'root', '--receipt': 'receipt', '--expected-digest': 'expected' }[argv[i]];
    requireThat(field && argv[i + 1] && !argv[i + 1].startsWith('--'), 'invalid_arguments');
    options[field] = argv[++i];
  }
  return options;
}
export async function runRelease(options, env = process.env) {
  const root = path.resolve(options.root);
  await verifyImplementation(root, options.expected); // Before pnpm, collector, build or other source execution.
  requireThat(!git(root, ['status', '--porcelain=v1', '--untracked-files=no']), 'tracked_checkout_not_clean');
  const source = git(root, ['rev-parse', 'HEAD']);
  const record = { schemaVersion: 1, mode: options.publish ? 'publish' : 'dry-run', startedAt: time(), status: 'started', source, implementationSha256: options.expected, published: false };
  const scratch = await mkdtemp(path.join(tmpdir(), 'ltc-cloud-'));
  const clone = path.join(scratch, 'source');
  const receiptPath = path.resolve(options.receipt || path.join(scratch, 'receipt.json'));
  await mkdir(path.dirname(receiptPath), { recursive: true });
  const save = async () => writeFile(receiptPath, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
  await save();
  try {
    const { github, vercel } = apiClients(env);
    if (options.publish) {
      requireThat(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === TARGET.repository && env.GITHUB_REF === 'refs/heads/main', 'approved_actions_context_required');
      requireThat(env.LTC_CLOUD_PUBLISH === 'true', 'cloud_publication_disabled');
      await controls(github, source);
    }
    command('git', ['clone', '--local', '--no-hardlinks', '--no-checkout', root, clone], scratch);
    command('git', ['checkout', '--detach', source], clone);
    await verifyImplementation(clone, options.expected);
    const policy = JSON.parse(await readFile(path.join(clone, 'config/ltc-publication.json'), 'utf8'));
    assertControls({ policy, cloudValue: 'true', remoteHead: source, expectedHead: source });
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const archive = JSON.parse(await readFile(path.join(clone, 'content/ltc/index.json'), 'utf8'));
    let edition = archive.filter(item => item.date === date).sort((a, b) => b.revision - a.revision)[0];
    if (options.publish && archive.length) {
      const latestSaved = [...archive].sort((a, b) => b.date.localeCompare(a.date) || b.revision - a.revision)[0];
      const liveArchive = JSON.parse(await responseBytes(`${TARGET.canonical}/data/ltc-editions/index.json`));
      requireThat(Array.isArray(liveArchive), 'invalid_live_archive');
      const liveSaved = liveArchive.find(item => item.id === latestSaved.id);
      if (!liveSaved || sha(JSON.stringify(liveSaved)) !== sha(JSON.stringify(latestSaved))) edition = latestSaved;
    }
    // Retry a committed but unpromoted issue using its saved evidence; never silently regenerate its bytes.
    if (!edition) {
      const snapshot = command(process.execPath, ['scripts/collect-ltc.mjs', '--stdout'], clone);
      const snapshotFile = path.join(scratch, 'snapshot.json');
      JSON.parse(snapshot);
      await writeFile(snapshotFile, snapshot);
      const candidate = path.join(scratch, 'candidate.json');
      command(process.execPath, ['scripts/prepare-ltc-edition.mjs', '--snapshot', snapshotFile, '--output', candidate, '--publish'], clone);
      await writeFile(path.join(clone, 'public/data/ltc-snapshot.json'), snapshot);
      edition = JSON.parse(await readFile(path.join(clone, `content/ltc/${date}-r1.json`), 'utf8'));
    }
    record.edition = edition.id;
    record.snapshotSha256 = sha(await readFile(path.join(clone, 'public/data/ltc-snapshot.json')));
    const initialChanges = await changesIn(clone);
    if (initialChanges.length) assertChanges(initialChanges, edition.id);
    command('pnpm', ['install', '--frozen-lockfile'], clone);
    command('pnpm', ['check'], clone);
    command('pnpm', ['release:prepare'], clone);
    await verifyImplementation(clone, options.expected);
    const changes = await changesIn(clone);
    if (changes.length) assertChanges(changes, edition.id);
    const manifest = await Promise.all(pathsFor(edition.id).map(async file => ({ file, sha256: sha(await readFile(path.join(clone, 'dist', file))) })));
    record.artifacts = manifest;
    record.artifactManifestSha256 = sha(JSON.stringify(manifest));
    record.changedFiles = changes.map(item => item.file);
    if (!options.publish) {
      record.status = 'dry-run-passed'; record.completedAt = time(); await save();
      return { status: record.status, receipt: receiptPath, published: false };
    }
    // If the exact issue is already live, reruns are read-only no-ops.
    try { await verifySite(TARGET.canonical, manifest); record.status = 'already-live'; record.completedAt = time(); await save(); return { status: record.status, receipt: receiptPath, published: false }; } catch { /* a saved but unpromoted issue continues */ }
    await controls(github, source);
    const project = await vercel(`/v9/projects/${TARGET.project}`);
    requireThat(project.id === TARGET.project && project.accountId === TARGET.team, 'wrong_vercel_project');
    // Owner must resolve the known old Git linkage and eliminate competing automatic deploys before activation.
    requireThat(!project.link, 'native_git_link_requires_owner_resolution');
    const previous = await vercel(`/v13/deployments/${new URL(TARGET.canonical).hostname}`);
    requireThat(previous.projectId === TARGET.project && previous.readyState === 'READY' && /^dpl_[A-Za-z0-9]+$/.test(previous.id), 'verified_rollback_target_required');
    record.rollbackDeployment = previous.id;
    record.releaseCommit = await commitData(github, clone, source, changes, edition.id);
    await save();
    await mkdir(path.join(clone, '.vercel'), { recursive: true });
    await writeFile(path.join(clone, '.vercel/project.json'), JSON.stringify({ projectId: TARGET.project, orgId: TARGET.team }));
    const cli = env.LTC_VERCEL_CLI || 'vercel';
    requireThat(!cli.includes('\n') && !cli.includes('\0'), 'invalid_cli_path');
    const vercelCommand = args => {
      // Token is supplied only by the runtime environment, never looked up or written. Captured output is never logged.
      return command(cli, withVercelAuth(args, env.VERCEL_TOKEN), clone);
    };
    const candidateOutput = parseDeploymentOutput(vercelCommand(['deploy', '--prebuilt', '--prod', '--skip-domain', '--yes']));
    const candidate = candidateOutput.url;
    const deployment = await vercel(`/v13/deployments/${new URL(candidate).hostname}`);
    requireThat(deployment.projectId === TARGET.project && deployment.readyState === 'READY' && deployment.target === 'production' && /^dpl_[A-Za-z0-9]+$/.test(deployment.id) && (!candidateOutput.id || candidateOutput.id === deployment.id), 'candidate_identity_failed');
    record.candidateDeployment = deployment.id; record.candidateUrl = candidate; await save();
    await verifyProtectedCandidate(deployment.id, edition.id, manifest, vercelCommand); // Authenticated read; protection stays enabled.
    await verifyImplementation(clone, options.expected);
    await controls(github, record.releaseCommit);
    const stillPrevious = await vercel(`/v13/deployments/${new URL(TARGET.canonical).hostname}`);
    requireThat(stillPrevious.id === previous.id, 'competing_production_release');
    record.status = 'promoting'; await save();
    try {
      vercelCommand(['promote', candidate, '--yes']);
      await verifySite(TARGET.canonical, manifest);
      const promoted = await vercel(`/v13/deployments/${new URL(TARGET.canonical).hostname}`);
      requireThat(promoted.id === deployment.id, 'promotion_identity_failed');
      record.status = 'published'; record.published = true;
    } catch {
      // Do not roll back another actor's deployment if the pointer advanced independently.
      const current = await vercel(`/v13/deployments/${new URL(TARGET.canonical).hostname}`);
      if (current.id === deployment.id) {
        vercelCommand(['rollback', previous.id, '--non-interactive']);
        const restored = await vercel(`/v13/deployments/${new URL(TARGET.canonical).hostname}`);
        requireThat(restored.id === previous.id, 'rollback_not_confirmed');
        record.status = 'rolled-back'; await save();
      }
      throw new Error('promotion_or_public_verification_failed');
    }
    record.completedAt = time(); await save();
    return { status: record.status, receipt: receiptPath, published: record.published };
  } catch (error) {
    record.status = record.status === 'rolled-back' ? 'rolled-back' : 'withheld';
    record.failure = safeFailure(error); record.completedAt = time(); await save();
    throw new Error(record.failure);
  }
}
export function safeFailure(error) {
  const message = typeof error?.message === 'string' ? error.message : '';
  const known = new Set(['accepted_digest_required', 'implementation_changed', 'publication_paused', 'cloud_publication_disabled', 'remote_head_changed', 'routine_revision_required', 'release_changes_outside_allowlist', 'immutable_edition_changed', 'invalid_edition_id', 'network_request_failed', 'response_too_large', 'deployed_artifact_mismatch', 'deployment_credential_missing', 'invalid_api_response', 'invalid_remote_policy', 'commit_not_confirmed', 'invalid_arguments', 'tracked_checkout_not_clean', 'approved_actions_context_required', 'wrong_vercel_project', 'native_git_link_requires_owner_resolution', 'verified_rollback_target_required', 'invalid_cli_path', 'invalid_candidate_url', 'invalid_deployment_output', 'invalid_candidate_manifest', 'candidate_identity_failed', 'competing_production_release', 'promotion_identity_failed', 'rollback_not_confirmed', 'promotion_or_public_verification_failed', 'non_regular_tracked_file']);
  return known.has(message) || /^http_[1-5]\d{2}$/.test(message) || /^command_failed_(?:node|git|pnpm|vercel)$/.test(message) ? message : 'release_failed_details_withheld';
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await runRelease(parseArgs(process.argv.slice(2))))); }
  catch (error) { console.error(`LTC cloud release withheld: ${safeFailure(error)}`); process.exitCode = 1; }
}
