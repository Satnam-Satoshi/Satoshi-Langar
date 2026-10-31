import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { prepareGitReleasePlan, createVercelReleaseProviders, executeReleaseOperation, assertVercelProjectPolicy, assertVercelDeploymentIdentity } from './cloud-ltc-release-providers.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { ReleaseOperationCoordinator } from './cloud-ltc-operations.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const objectSha = (type, bytes) => createHash('sha1').update(`${type} ${bytes.length}\0`).update(bytes).digest('hex');
async function coordinator() { const state = new DurableCloudState(new MemoryStateAdapter(), 'website'); await state.setPaused(false); const lease = await state.acquire('fixture-run'); return { state, coordinator: new ReleaseOperationCoordinator({ state, lease }) }; }
async function gitFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'ltc-real-git-provider-'));
  const git = (args, input) => execFileSync('git', args, { cwd: root, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' } }).trim();
  git(['init', '-q']); await writeFile(path.join(root, 'record.json'), '{"saved":false}'); git(['add', '.']); git(['-c', 'commit.gpgsign=false', 'commit', '-qm', 'base']);
  const base = git(['rev-parse', 'HEAD']); await writeFile(path.join(root, 'record.json'), '{"saved":true}');
  let plan; let pointer = base; let failAfter = ''; const remote = new Map(); const calls = [];
  const github = async (endpoint, method = 'GET', body) => {
    calls.push({ endpoint, method, body });
    if (method === 'POST' && endpoint === '/git/blobs') { const bytes = Buffer.from(body.content, 'base64'); const sha = objectSha('blob', bytes); remote.set(sha, { sha, encoding: 'base64', content: bytes.toString('base64') }); if (failAfter === 'blob') throw Error('lost response'); return { sha }; }
    if (method === 'POST' && endpoint === '/git/trees') { const step = plan.steps.find(step => step.payload.kind === 'git-tree'); const tree = git(['ls-tree', '-z', step.payload.sha]).split('\0').filter(Boolean).map(line => { const [header, name] = line.split('\t'); const [mode, type, sha] = header.split(' '); return { mode, type, sha, path: name }; }); remote.set(step.payload.sha, { sha: step.payload.sha, tree, truncated: false }); return { sha: step.payload.sha }; }
    if (method === 'POST' && endpoint === '/git/commits') { const step = plan.steps.find(step => step.payload.kind === 'git-commit'); remote.set(step.payload.sha, { ...body, sha: step.payload.sha, tree: { sha: body.tree }, parents: body.parents.map(sha => ({ sha })) }); return { sha: step.payload.sha }; }
    if (method === 'PATCH') { assert.equal(body.force, false); assert.equal(pointer, base); pointer = body.sha; if (failAfter === 'ref') throw Error('lost ref response'); return { object: { sha: pointer } }; }
    if (endpoint.startsWith('/git/ref/')) return { object: { sha: pointer } };
    const result = remote.get(endpoint.split('/').at(-1)); if (!result) throw Error('404 absent immutable object'); return result;
  };
  const options = { root, base, changes: [{ file: 'record.json', status: 'M' }], editionId: '2026-10-30-r1', branch: 'agent/wall-street-20261011', committedAt: '2026-10-30T14:00:00.000Z', github, beforeMutation: async expected => assert.equal(pointer, expected) };
  plan = await prepareGitReleasePlan(options);
  return { root, base, git, options, plan, remote, calls, fail: kind => { failAfter = kind; }, setPointer: sha => { pointer = sha; } };
}

test('every Git blob/tree/commit/ref mutation has its own durable intent and exact immutable readback', async () => {
  const fixture = await gitFixture();
  try {
    const { coordinator: run, state } = await coordinator();
    assert.deepEqual(fixture.plan.steps.map(step => step.payload.kind), ['git-blob', 'git-tree', 'git-commit', 'git-ref']);
    for (const step of fixture.plan.steps) await executeReleaseOperation(run, step);
    assert.equal(Object.keys((await state.inspect()).receipts).length, 4);
    assert.equal(fixture.calls.filter(call => call.method === 'PATCH').length, 1);
    // Same plan is deterministic and a confirmed operation never writes twice.
    const again = await prepareGitReleasePlan(fixture.options); assert.equal(again.commitSha, fixture.plan.commitSha);
    const writes = fixture.calls.filter(call => call.method !== 'GET').length;
    for (const step of again.steps) await executeReleaseOperation(run, step);
    assert.equal(fixture.calls.filter(call => call.method !== 'GET').length, writes);
    const intent = (await state.inspect()).intents[again.steps.at(-1).operationId];
    assert.equal(intent.payload.commit, fixture.plan.commitSha);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test('lost Git blob response recovers by known SHA without creating another object', async () => {
  const fixture = await gitFixture();
  try {
    fixture.fail('blob'); const { coordinator: run, state } = await coordinator(); const step = fixture.plan.steps[0];
    await assert.rejects(run.execute(step), /operation_outcome_uncertain/);
    await assert.rejects(run.execute(step), /operation_reconciliation_required/);
    assert.equal(fixture.calls.filter(call => call.method === 'POST').length, 1);
    assert.equal((await run.reconcile(step)).status, 'confirmed');
    assert.equal((await state.inspect()).intents[step.operationId].status, 'confirmed');
    fixture.remote.get(step.payload.sha).content = Buffer.from('tampered').toString('base64');
    assert.equal((await step.provider.readback({ operationId: step.operationId, payload: step.payload, payloadSha256: hash(JSON.stringify(step.payload)) })).status, 'unknown');
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test('lost ref response reconciles exact commit; competing ref is unknown and never force-overwritten', async () => {
  const fixture = await gitFixture();
  try {
    const { coordinator: run } = await coordinator(); for (const step of fixture.plan.steps.slice(0, -1)) await run.execute(step);
    fixture.fail('ref'); const step = fixture.plan.steps.at(-1);
    await assert.rejects(run.execute(step), /operation_outcome_uncertain/);
    assert.equal((await run.reconcile(step)).status, 'confirmed');
    fixture.setPointer('b'.repeat(40));
    assert.equal((await step.provider.readback({ operationId: step.operationId, payload: step.payload, payloadSha256: hash(JSON.stringify(step.payload)) })).status, 'unknown');
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

function vercelFixture() {
  const target = { project: 'prj_fixture', team: 'team_fixture', domains: ['https://one.example', 'https://two.example'] };
  const deployments = new Map(); const cliCalls = []; let pointer = 'dpl_Previous'; let loseDeploy = false; let duplicate = false; let protectedReads = 0; let publicReads = 0;
  const identity = id => ({ id, projectId: target.project, ownerId: target.team, team: { id: target.team }, teamId: target.team, target: 'production', readyState: 'READY', url: `${id.toLowerCase().replaceAll('_', '-')}.vercel.app` });
  deployments.set(pointer, identity(pointer));
  const vercel = async endpoint => {
    if (endpoint.startsWith('/v6/deployments')) { const found = [...deployments.values()].filter(item => item.meta); return { deployments: duplicate ? [...found, ...found] : found, pagination: { next: null } }; }
    const key = endpoint.split('/').at(-1); if (key.endsWith('.example')) return deployments.get(pointer);
    if (!deployments.has(key)) throw Error('unknown deployment'); return deployments.get(key);
  };
  const cli = async args => {
    cliCalls.push(args);
    if (args[0] === 'deploy') {
      const meta = {}; for (let i = 0; i < args.length; i++) if (args[i] === '--meta') { const [key, value] = args[++i].split('='); meta[key] = value; }
      deployments.set('dpl_Candidate', { ...identity('dpl_Candidate'), meta }); if (loseDeploy) throw Error('timeout after accepted deployment');
    } else if (args[0] === 'promote') pointer = 'dpl_Candidate';
    else if (args[0] === 'rollback') pointer = args[1];
  };
  const providers = createVercelReleaseProviders({ target, vercel, cli, beforeMutation: async () => {}, verifyProtected: async () => { protectedReads++; }, verifyPublic: async () => { publicReads++; } });
  const stage = { operationId: 'stage-fixture', payload: { commit: 'a'.repeat(40), buildOutputSha256: hash('build'), artifactManifestSha256: hash('static') } };
  return { providers, stage, cliCalls, deployments, lose: () => { loseDeploy = true; }, duplicate: () => { duplicate = true; }, pointer: value => { pointer = value; }, protectedReads: () => protectedReads, publicReads: () => publicReads };
}

test('lost Vercel stage response discovers exact tagged deployment and verifies protected bytes without redeploy', async () => {
  const fixture = vercelFixture(); fixture.lose(); const { coordinator: run } = await coordinator(); const step = { ...fixture.stage, provider: fixture.providers.stage(fixture.stage.payload) };
  await assert.rejects(run.execute(step), /operation_outcome_uncertain/);
  await assert.rejects(run.execute(step), /operation_reconciliation_required/);
  assert.equal((await run.reconcile(step)).status, 'confirmed');
  assert.equal(fixture.cliCalls.length, 1); assert.equal(fixture.protectedReads(), 1);
  const proof = await fixture.providers.discoverStage(fixture.stage); assert.equal(proof.deployment, 'dpl_Candidate');
  assert.ok(fixture.cliCalls[0].includes('--skip-domain'));
});

test('missing, duplicated, wrong-team or wrong-payload deployments stay uncertain', async () => {
  const fixture = vercelFixture(); const context = { ...fixture.stage, payloadSha256: hash(JSON.stringify(fixture.stage.payload)) };
  const stage = fixture.providers.stage(fixture.stage.payload);
  assert.equal((await stage.readback(context)).status, 'unknown');
  await stage.apply({ ...context, fence: 1 });
  fixture.deployments.get('dpl_Candidate').teamId = 'team_other'; assert.equal((await stage.readback(context)).status, 'unknown');
  fixture.deployments.get('dpl_Candidate').teamId = 'team_fixture'; fixture.duplicate(); assert.equal((await stage.readback(context)).status, 'unknown');
});

test('promotion and rollback are separate intents; rollback checks ownership and old public bytes', async () => {
  const fixture = vercelFixture(); const { coordinator: run } = await coordinator();
  await run.execute({ ...fixture.stage, provider: fixture.providers.stage(fixture.stage.payload) });
  const payload = { deployment: 'dpl_Candidate', previous: 'dpl_Previous', commit: 'a'.repeat(40) };
  await run.execute({ operationId: 'promote-fixture', payload, provider: fixture.providers.promote(payload) });
  const rollback = { failed: 'dpl_Candidate', restore: 'dpl_Previous', commit: 'a'.repeat(40), previousManifestSha256: hash('prior exact bytes') };
  await run.execute({ operationId: 'rollback-fixture', payload: rollback, provider: fixture.providers.rollback(rollback) });
  assert.equal(fixture.publicReads(), 1); assert.deepEqual(fixture.cliCalls.map(args => args[0]), ['deploy', 'promote', 'rollback']);
  fixture.pointer('dpl_Previous');
  const provider = fixture.providers.rollback(rollback);
  await assert.rejects(provider.apply({ operationId: 'rollback-other', payload: rollback, payloadSha256: hash(JSON.stringify(rollback)), fence: 1 }), /competing_production_release/);
  assert.equal(fixture.cliCalls.length, 3);
});

test('observed Vercel ownerId/team.id identity accepts absent teamId and rejects contradictions', () => {
  const target = { project: 'prj_fixture', team: 'team_fixture', scope: 'owner-scope' };
  const deployment = { id: 'dpl_Fixture', projectId: target.project, ownerId: target.team, team: { id: target.team, slug: target.scope }, readyState: 'READY', target: 'production', url: 'fixture.vercel.app' };
  assert.doesNotThrow(() => assertVercelDeploymentIdentity(deployment, target));
  for (const change of [{ ownerId: 'team_other' }, { team: { id: 'team_other' } }, { teamId: 'team_other' }, { projectId: 'prj_other' }, { url: 'https://fixture.vercel.app' }]) assert.throws(() => assertVercelDeploymentIdentity({ ...deployment, ...change }, target), /deployment_identity_mismatch/);
});
test('reviewed legacy native-link suppression is checked exactly without changing settings', () => {
  const target = { project: 'prj_fixture', team: 'team_fixture' };
  const link = { type: 'github', org: 'Khlnayak', repo: 'https-github.com-Satnam-Satoshi-Satoshi-Langar', repoId: 1246313844, productionBranch: 'main', sourceless: true, deployHooks: [] };
  const project = { id: target.project, accountId: target.team, commandForIgnoringBuildStep: 'exit 0', link };
  assert.equal(assertVercelProjectPolicy(project, target).nativeGit, 'reviewed-legacy-link-suppressed');
  for (const change of [{ org: 'other' }, { repoId: 123 }, { productionBranch: 'other' }, { sourceless: false }, { deployHooks: [{}] }]) assert.throws(() => assertVercelProjectPolicy({ ...project, link: { ...link, ...change } }, target), /native_git_link_requires_owner_resolution/);
  assert.throws(() => assertVercelProjectPolicy({ ...project, commandForIgnoringBuildStep: null }, target), /native_git_link_requires_owner_resolution/);
});
