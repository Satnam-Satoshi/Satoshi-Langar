import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performCoordinatedRelease } from './cloud-ltc-production.mjs';
import { collectReleaseArtifacts } from './cloud-ltc-artifacts.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
async function fixture({ uncertainStage = false, badPublishedBytes = false, uncertainPromotion = false } = {}) {
  const scratch = await mkdtemp(path.join(tmpdir(), 'ltc-production-contract-')); const root = path.join(scratch, 'source'); const evidenceDirectory = path.join(scratch, 'evidence');
  await mkdir(root); await mkdir(evidenceDirectory);
  await writeFile(path.join(root, 'package.json'), '{}');
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' } }).trim();
  git(['init', '-q']); git(['add', '.']); git(['-c', 'commit.gpgsign=false', 'commit', '-qm', 'base']);
  const source = git(['rev-parse', 'HEAD']);
  for (const [file, bytes] of [['dist/index.html', 'new html'], ['.vercel/output/config.json', '{}'], ['.vercel/output/static/index.html', 'new html'], ['.vercel/output/functions/api.func/.vc-config.json', '{}'], ['.vercel/output/functions/api.func/index.js', 'export default () => {};']]) { const full = path.join(root, file); await mkdir(path.dirname(full), { recursive: true }); await writeFile(full, bytes); }
  await writeFile(path.join(evidenceDirectory, 'base.json'), '{"normalized":true}');
  const state = new DurableCloudState(new MemoryStateAdapter(), 'website'); await state.setPaused(false); const lease = await state.acquire('fixture-release', 3_600_000);
  const target = { project: 'prj_fixture', team: 'team_fixture', domains: ['https://first.example', 'https://second.example'] };
  const deployments = new Map(); let pointer = 'dpl_Previous'; let allocated = 0; const events = []; const saved = [];
  const identity = id => ({ id, projectId: target.project, ownerId: target.team, team: { id: target.team }, teamId: target.team, readyState: 'READY', target: 'production', url: `${id.toLowerCase().replaceAll('_', '-')}.vercel.app` });
  deployments.set(pointer, identity(pointer));
  const vercel = async endpoint => endpoint.startsWith('/v6/deployments') ? { deployments: [...deployments.values()].filter(record => record.meta), pagination: { next: null } } : deployments.get(endpoint.split('/').at(-1).endsWith('.example') ? pointer : endpoint.split('/').at(-1));
  const cli = async args => {
    events.push(args[0]);
    if (args[0] === 'deploy') { const meta = {}; for (let i = 0; i < args.length; i++) if (args[i] === '--meta') { const [key, value] = args[++i].split('='); meta[key] = value; } deployments.set('dpl_Candidate', { ...identity('dpl_Candidate'), meta }); if (uncertainStage) throw Error('lost stage response'); }
    if (args[0] === 'promote') { pointer = 'dpl_Candidate'; if (uncertainPromotion) throw Error('lost promotion response'); }
    if (args[0] === 'rollback') pointer = args[1];
  };
  const manifest = [{ file: 'index.html', sha256: hash('new html') }]; const rollbackManifest = [{ file: 'index.html', sha256: hash('old html') }];
  const options = {
    admission: { state, lease }, root, source, changes: [], editionId: '2026-10-30-r1', acceptedSource: { branch: 'agent/wall-street-20261011' }, startedAt: '2026-10-30T14:00:00Z', target,
    github: async () => { throw Error('no source changes means no GitHub mutations'); }, vercel, cli,
    controls: async expected => assert.equal(expected, source), verifyImplementation: async () => {}, verifyBuildOutput: async () => {},
    verifyProtected: async () => events.push('protected-readback'),
    verifyPublic: async expected => { const fresh = expected[0].sha256 === manifest[0].sha256; events.push(fresh ? 'new-public-readback' : 'old-public-readback'); if (fresh && badPublishedBytes) throw Error('deployed_artifact_mismatch'); },
    manifest, buildOutput: [{ file: 'config.json', sha256: hash('{}') }, { file: 'static/index.html', sha256: hash('new html') }], rollbackManifest, evidenceDirectory,
    evidenceConfig: { folderId: 'fixture-folder', ownerPermissionId: 'fixture-owner' }, env: {},
    preallocateIds: async ({ count }) => Array.from({ length: count }, () => `file-fixture-${++allocated}`),
    evidenceProviderFactory: ({ bundle, config }) => {
      let stored;
      return {
        async apply(context) {
          events.push('evidence-upload');
          const intent = (await state.inspect()).intents[context.operationId];
          assert.equal(intent.status, 'uncertain'); assert.equal(intent.payload.fileId, config.fileId); assert.equal(intent.payload.sha256, bundle.sha256);
          stored = { operationId: context.operationId, payloadSha256: context.payloadSha256, status: 'applied', proof: { fileId: config.fileId, sha256: bundle.sha256, folderId: config.folderId, length: bundle.length, ownerOnly: true, downloadVerified: true } };
        },
        async readback(context) { return stored ?? { ...context, status: 'unknown' }; },
      };
    },
    saveReceipt: async update => { saved.push(structuredClone(update)); },
  };
  return { scratch, root, options, state, events, saved };
}

test('production wiring archives complete source/static/function evidence before staging and checkpoints next-run rollback manifest', async () => {
  const f = await fixture();
  try {
    const result = await performCoordinatedRelease(f.options);
    assert.equal(result.published, true);
    assert.ok(f.events.indexOf('evidence-upload') < f.events.indexOf('deploy'));
    assert.ok(f.events.indexOf('protected-readback') < f.events.indexOf('promote'));
    assert.ok(f.events.lastIndexOf('evidence-upload') > f.events.indexOf('new-public-readback'));
    const document = await f.state.inspect();
    assert.equal(document.lease, null); assert.equal(document.latestRelease.deployment, 'dpl_Candidate');
    assert.equal(document.latestRelease.artifactManifestSha256, hash(JSON.stringify(f.options.manifest)));
    assert.ok(Object.values(document.intents).every(intent => intent.status === 'confirmed' && intent.payload && intent.proof));
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('uncertain stage leaves fenced lease and intent; no promotion, rollback or second deploy occurs', async () => {
  const f = await fixture({ uncertainStage: true });
  try {
    await assert.rejects(performCoordinatedRelease(f.options), /operation_outcome_uncertain/);
    assert.deepEqual(f.events.filter(event => ['deploy', 'promote', 'rollback'].includes(event)), ['deploy']);
    const document = await f.state.inspect(); assert.ok(document.lease);
    assert.equal(Object.values(document.intents).find(intent => intent.payload.kind === 'vercel-stage' && intent.operationId.startsWith('stage-')).status, 'uncertain');
    assert.equal(document.latestRelease, undefined);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('confirmed promotion with failed public bytes invokes separately fenced rollback', async () => {
  const f = await fixture({ badPublishedBytes: true });
  try {
    await assert.rejects(performCoordinatedRelease(f.options), /deployed_artifact_mismatch/);
    assert.deepEqual(f.events.filter(event => ['deploy', 'promote', 'rollback'].includes(event)), ['deploy', 'promote', 'rollback']);
    assert.ok(f.saved.some(record => record.status === 'rolled-back'));
    const document = await f.state.inspect(); assert.ok(document.lease); assert.equal(document.latestRelease, undefined);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('uncertain promotion never triggers automatic rollback even when service pointer changed', async () => {
  const f = await fixture({ uncertainPromotion: true });
  try {
    await assert.rejects(performCoordinatedRelease(f.options), /operation_outcome_uncertain/);
    assert.deepEqual(f.events.filter(event => ['deploy', 'promote', 'rollback'].includes(event)), ['deploy', 'promote']);
    assert.ok((await f.state.inspect()).lease);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('artifact collection preserves explicit hidden function configs and refuses source secrets and symlinks', async () => {
  const f = await fixture();
  try {
    const args = { root: f.root, staticDirectory: path.join(f.root, 'dist'), outputDirectory: path.join(f.root, '.vercel/output'), evidenceDirectory: f.options.evidenceDirectory };
    const files = await collectReleaseArtifacts(args);
    assert.ok(files.some(file => file.path === 'build-output/functions/api.func/.vc-config.json'));
    await writeFile(path.join(f.root, '.env'), 'must not be opened');
    await assert.rejects(collectReleaseArtifacts({ ...args, changedFiles: ['.env'] }), /credential_file_in_artifacts/);
    await assert.rejects(collectReleaseArtifacts({ ...args, changedFiles: ['.aws/credentials'] }), /credential_file_in_artifacts/);
    await symlink('index.html', path.join(f.root, 'dist/alias.html'));
    await assert.rejects(collectReleaseArtifacts(args), /non_regular_artifact_file/);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('exact same live bytes return no-op without archive upload, source write or deployment after compaction', async () => {
  const f = await fixture();
  try {
    f.options.manifest = f.options.rollbackManifest;
    const result = await performCoordinatedRelease(f.options);
    assert.equal(result.status, 'already-live'); assert.equal(result.published, false);
    assert.ok(!f.events.some(event => ['evidence-upload', 'deploy', 'promote', 'rollback'].includes(event)));
    assert.equal((await f.state.inspect()).lease, null);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});
