import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
import { downloadEvidence, restoreArtifactEvidence } from './cloud-ltc-evidence.mjs';
import { createVercelReleaseProviders } from './cloud-ltc-release-providers.mjs';
import { TARGET, cleanEnvironment, withVercelAuth, verifyProtectedCandidate, verifyPublicDomains } from './cloud-ltc-release.mjs';
const check = (value, code) => { if (!value) throw Error(code); };
const hash = value => createHash('sha256').update(value).digest('hex');
const gitSha = (kind, bytes) => createHash('sha1').update(`${kind} ${bytes.length}\0`).update(bytes).digest('hex');

async function readGitIntent(intent, github, intents) {
  const payload = intent.payload;
  if (payload.kind === 'git-ref') check(/^agent\/[a-z0-9][a-z0-9/-]{0,150}$/.test(payload.branch ?? '') && !payload.branch.includes('..') && /^[a-f0-9]{40}$/.test(payload.commit ?? ''), 'recovery_context_required');
  else check(/^[a-f0-9]{40}$/.test(payload.sha ?? ''), 'recovery_context_required');
  if (payload.kind === 'git-blob') {
    const record = await github(`/git/blobs/${payload.sha}`); const bytes = Buffer.from(record.content ?? '', 'base64');
    check(record.encoding === 'base64' && record.sha === payload.sha && bytes.length === payload.bytes && hash(bytes) === payload.sha256 && gitSha('blob', bytes) === payload.sha, 'git_readback_mismatch');
    return { kind: payload.kind, sha: payload.sha, sha256: payload.sha256 };
  }
  if (payload.kind === 'git-tree') {
    const record = await github(`/git/trees/${payload.sha}`);
    check(record.sha === payload.sha && record.truncated === false && Array.isArray(record.tree), 'git_readback_mismatch');
    const entries = [...record.tree].sort((a, b) => Buffer.compare(Buffer.from(a.path + (a.type === 'tree' ? '/' : '')), Buffer.from(b.path + (b.type === 'tree' ? '/' : ''))));
    const bytes = Buffer.concat(entries.map(entry => { check(typeof entry.path === 'string' && !entry.path.includes('/') && !entry.path.includes('\0') && /^[a-f0-9]{40}$/.test(entry.sha) && /^(040000|100644|100755|120000|160000)$/.test(entry.mode), 'git_readback_mismatch'); return Buffer.concat([Buffer.from(`${entry.mode === '040000' ? '40000' : entry.mode} ${entry.path}\0`), Buffer.from(entry.sha, 'hex')]); }));
    check(gitSha('tree', bytes) === payload.sha, 'git_readback_mismatch'); return { kind: payload.kind, sha: payload.sha };
  }
  let expected = payload;
  if (payload.kind === 'git-ref') {
    const ref = await github(`/git/ref/heads/${payload.branch}`); check(ref.object?.sha === payload.commit, 'git_ref_mismatch');
    expected = Object.values(intents).find(record => record.payload?.kind === 'git-commit' && record.payload.sha === payload.commit)?.payload;
    check(expected, 'recovery_context_required');
  }
  check(expected.kind === 'git-commit', 'unsupported_operation_kind');
  const record = await github(`/git/commits/${expected.sha}`);
  check(record.sha === expected.sha && record.tree?.sha === expected.tree && JSON.stringify(record.parents?.map(parent => parent.sha)) === JSON.stringify(expected.parents) && record.message.replace(/\n?$/, '\n') === expected.message, 'git_readback_mismatch');
  for (const key of ['author', 'committer']) check(record[key]?.name === expected[key].name && record[key]?.email === expected[key].email && new Date(record[key]?.date).valueOf() === new Date(expected[key].date).valueOf(), 'git_readback_mismatch');
  return { kind: payload.kind, sha: expected.sha, tree: expected.tree, ...(payload.kind === 'git-ref' ? { branch: payload.branch } : {}) };
}

export async function inspectPersistedOperations({ state, github, vercel, evidenceConfig, getAccessToken, fetcher = fetch, directory, readProtected, readPublic, recoverManifests }) {
  const document = await state.inspect(); const cache = new Map();
  const recover = recoverManifests ?? (async payload => {
    const key = payload.artifactPackageManifestSha256; check(/^[a-f0-9]{64}$/.test(key ?? ''), 'recovery_context_required');
    if (cache.has(key)) return cache.get(key);
    const operations = Object.values(document.intents).filter(intent => intent.payload?.kind === 'drive-evidence' && intent.payload.role === 'release-artifacts' && intent.payload.artifactPackageManifestSha256 === key);
    const count = operations[0]?.payload.artifactBundleCount;
    check(Number.isInteger(count) && count > 0 && count <= 64 && operations.length === count && new Set(operations.map(intent => intent.payload.artifactBundleIndex)).size === count && operations.every(intent => intent.payload.artifactBundleCount === count && intent.payload.artifactBundleIndex >= 0 && intent.payload.artifactBundleIndex < count), 'recovery_context_required');
    const bundles = [];
    for (const operation of operations.sort((a, b) => a.payload.artifactBundleIndex - b.payload.artifactBundleIndex)) {
      const p = operation.payload; check(p.folderId === evidenceConfig.folderId, 'private_storage_required');
      const result = await downloadEvidence({ ...p, length: p.bytes, operationId: operation.operationId, payloadSha256: operation.payloadSha256 }, { config: { ...evidenceConfig, fileId: p.fileId }, getAccessToken, fetcher });
      check(result?.bundle, 'recovery_context_required'); bundles.push(result.bundle);
    }
    const destination = path.join(directory, `restored-${key.slice(0, 24)}`);
    await restoreArtifactEvidence(bundles, { directory: destination, expectedManifestSha256: key });
    const currentBytes = await readFile(path.join(destination, 'evidence/artifact-manifest.json'));
    const previous = JSON.parse(await readFile(path.join(destination, 'evidence/rollback-manifest.json'), 'utf8'));
    const result = { current: JSON.parse(currentBytes), currentSha256: hash(currentBytes), previous: previous.manifest, previousSha256: hash(JSON.stringify(previous.manifest)) };
    cache.set(key, result); return result;
  });
  const results = [];
  for (const intent of Object.values(document.intents)) {
    if (['confirmed', 'not-applied'].includes(intent.status)) continue;
    const base = { operationId: intent.operationId, durableStatus: intent.status, kind: intent.payload?.kind ?? 'legacy-context-missing' };
    if (intent.status === 'pending') { results.push({ ...base, observed: 'not-authorized', proof: { authorizationDurablyGranted: false } }); continue; }
    try {
      check(intent.payload && hash(JSON.stringify(intent.payload)) === intent.payloadSha256, 'recovery_context_required');
      const p = intent.payload; let proof;
      if (p.kind.startsWith('git-')) proof = await readGitIntent(intent, github, document.intents);
      else if (p.kind === 'drive-evidence') {
        check(p.folderId === evidenceConfig.folderId, 'private_storage_required');
        const result = await downloadEvidence({ ...p, length: p.bytes, operationId: intent.operationId, payloadSha256: intent.payloadSha256 }, { config: { ...evidenceConfig, fileId: p.fileId }, getAccessToken, fetcher });
        check(result?.proof, 'provider_readback_unknown'); proof = result.proof;
      } else if (['vercel-stage', 'vercel-promote', 'vercel-rollback'].includes(p.kind)) {
        const manifests = await recover(p);
        const providers = createVercelReleaseProviders({ target: TARGET, vercel, cli: async () => { throw Error('read_only_reconciliation'); }, beforeMutation: async () => { throw Error('read_only_reconciliation'); },
          verifyProtected: async deployment => { check(manifests.currentSha256 === p.artifactManifestSha256, 'recovery_context_required'); await readProtected(deployment, p.editionId, manifests.current); },
          verifyPublic: async expected => { check(expected === manifests.previousSha256, 'recovery_context_required'); await readPublic(manifests.previous); },
        });
        const method = { 'vercel-stage': 'stage', 'vercel-promote': 'promote', 'vercel-rollback': 'rollback' }[p.kind];
        const result = await providers[method](p).readback({ operationId: intent.operationId, payload: p, payloadSha256: intent.payloadSha256 });
        check(result.status === 'applied', 'provider_readback_unknown');
        if (p.kind === 'vercel-promote') { check(manifests.currentSha256 === p.artifactManifestSha256, 'recovery_context_required'); await readPublic(manifests.current); }
        proof = result.proof;
      } else throw Error('unsupported_operation_kind');
      results.push({ ...base, observed: 'applied', proof, proofSha256: hash(JSON.stringify(proof)) });
    } catch { results.push({ ...base, observed: 'unknown', reason: 'provider-or-recovery-proof-unavailable' }); }
  }
  return { schemaVersion: 1, mode: 'read-only-crash-reconciliation', publicationEnabled: false, stateChanged: false, effectsReissued: false, paused: document.paused, leaseHeld: document.lease !== null, results, requiresExplicitReview: true };
}

export function createReadOnlyReleaseClients({ env = process.env, fetcher = fetch }) {
  async function get(origin, endpoint, credential) {
    check(typeof credential === 'string' && credential.length > 10 && endpoint.startsWith('/') && !endpoint.includes('://'), 'provider_read_authorization_required');
    let response; try { response = await fetcher(origin + endpoint, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { Authorization: `Bearer ${credential}`, Accept: 'application/json' } }); } catch { throw Error('provider_read_unavailable'); }
    check(response.status === 200 && !response.redirected && response.body, 'provider_read_unavailable');
    const reader = response.body.getReader(); let length = 0; const chunks = [];
    try { while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; check(length <= 12_000_000, 'provider_read_unavailable'); chunks.push(part.value); } } finally { await reader.cancel().catch(() => {}); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Error('provider_read_unavailable'); }
  }
  return {
    github: endpoint => get('https://api.github.com', `/repos/${TARGET.repository}${endpoint}`, env.GITHUB_TOKEN),
    vercel: endpoint => get('https://api.vercel.com', `${endpoint}${endpoint.includes('?') ? '&' : '?'}teamId=${TARGET.team}`, env.VERCEL_TOKEN),
  };
}
function argumentsFor(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 2) { const field = { '--state-config': 'stateConfig', '--evidence-config': 'evidenceConfig', '--receipt': 'receipt' }[args[i]]; check(field && !result[field] && args[i + 1] && !args[i + 1].startsWith('--'), 'invalid_reconciliation_arguments'); result[field] = path.resolve(args[i + 1]); }
  check(result.stateConfig && result.evidenceConfig && result.receipt && new Set(Object.values(result)).size === 3, 'invalid_reconciliation_arguments'); return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = argumentsFor(process.argv.slice(2));
    const config = JSON.parse(await readFile(options.stateConfig, 'utf8')); const evidenceConfig = JSON.parse(await readFile(options.evidenceConfig, 'utf8'));
    check(config.folderId === evidenceConfig.folderId, 'private_storage_required');
    const runtime = await createGoogleStateRuntime({ config });
    const state = new DurableCloudState(runtime.stateAdapter, 'website'); const clients = createReadOnlyReleaseClients({});
    const directory = await mkdtemp(path.join(tmpdir(), 'ltc-reconciliation-'));
    const readProtected = async (deployment, editionId, manifest) => {
      const version = process.env.LTC_VERCEL_CLI_VERSION; check(/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version ?? ''), 'pinned_cli_version_required');
      const cli = process.env.LTC_VERCEL_CLI || 'vercel';
      const installed = execFileSync(cli, ['--version'], { encoding: 'utf8', env: cleanEnvironment(process.env), stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      check([version, `Vercel CLI ${version}`].includes(installed), 'pinned_cli_version_mismatch');
      await verifyProtectedCandidate(deployment.id, editionId, manifest, args => execFileSync(cli, withVercelAuth(args, process.env.VERCEL_TOKEN), { env: cleanEnvironment(process.env), stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000, maxBuffer: 32 * 1024 * 1024 }));
    };
    const receipt = await inspectPersistedOperations({ state, ...clients, evidenceConfig, directory, getAccessToken: () => withGoogleCloudAuthorization({}, access => access.LTC_GOOGLE_ACCESS_TOKEN), readProtected, readPublic: verifyPublicDomains });
    await writeFile(options.receipt, JSON.stringify({ ...receipt, recoveryDirectory: directory }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ mode: receipt.mode, stateChanged: false, effectsReissued: false, unknown: receipt.results.filter(record => record.observed === 'unknown').length, requiresExplicitReview: true }));
  } catch { console.error('read_only_reconciliation_unavailable'); process.exitCode = 1; }
}
