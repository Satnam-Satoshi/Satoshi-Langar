import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { assertChanges, assertControls, cleanEnvironment, implementationDigest, isEditionData, pathsFor, safeFailure, verifyImplementation, parseDeploymentOutput, withVercelAuth, verifyProtectedCandidate, assertMigrationAcceptance, builtManifest, verifyPublicDomains, TARGET, prepareObservations, publicReadbackRecord, collectorCommand, acceptedSourceConfig, builtOutputManifest, releaseUnusedAdmission } from './cloud-ltc-release.mjs';

const id = '2026-10-02-r1';
const head = 'a'.repeat(40);
test('routine release permits only one new issue, index and snapshot; rejects edits, deletes, traversal and unrelated code', () => {
  assertChanges([{ status: '??', file: `content/ltc/${id}.json` }, { status: 'M', file: 'content/ltc/index.json' }, { status: 'M', file: 'public/data/ltc-snapshot.json' }], id);
  for (const change of [
    { status: 'M', file: `content/ltc/${id}.json` }, { status: 'D', file: 'content/ltc/index.json' },
    { status: 'M', file: 'app/page.tsx' }, { status: 'A', file: 'content/ltc/2026-10-01-r2.json' },
    { status: '??', file: 'content/ltc/../../app/page.tsx' },
  ]) assert.throws(() => assertChanges([change], id));
  assert.equal(isEditionData('content/ltc/2026-10-02-r1.json'), true);
  assert.equal(isEditionData('content/ltc/2026-10-02-r0.json'), false);
  assert.equal(isEditionData('content/ltc/../config/secret.json'), false);
});
test('pause, admission switch, policy mismatch and competing head fail closed', () => {
  const open = { policy: { policyId: 'bounded-daily-v1', enabled: true, paused: false }, cloudValue: 'true', remoteHead: head, expectedHead: head };
  assertControls(open);
  for (const delta of [{ cloudValue: 'false' }, { cloudValue: undefined }, { remoteHead: 'b'.repeat(40) }, { policy: { ...open.policy, paused: true } }, { policy: { ...open.policy, enabled: false } }, { policy: {} }]) assert.throws(() => assertControls({ ...open, ...delta }));
});
test('child process environment and errors never expose provider tokens', () => {
  const secrets = { GITHUB_TOKEN: 'ghp_thisisprivate', VERCEL_TOKEN: 'privateverceltoken', AWS_SECRET_ACCESS_KEY: 'privatecloudkey', NODE_OPTIONS: '--require ./untrusted.cjs' };
  assert.deepEqual(cleanEnvironment({ PATH: '/usr/bin', ...secrets }), { PATH: '/usr/bin' });
  for (const value of [...Object.values(secrets), 'command_failed_ghp_thisisprivate', 'url https://example.com?token=private']) assert.equal(safeFailure(new Error(value)), 'release_failed_details_withheld');
  assert.equal(safeFailure(new Error('publication_paused')), 'publication_paused');
  assert.equal(safeFailure(new Error('http_403')), 'http_403');
});
test('release verification covers date, exact revision, month, archive, RSS and JSON', () => {
  const files = pathsFor(id);
  for (const required of ['conversations/editions/2026-10-02/index.html', 'conversations/editions/2026-10-02-r1/index.html', 'conversations/archive/2026-10/index.html', 'conversations/feed.xml', 'data/ltc-editions/index.json']) assert.ok(files.includes(required));
  assert.throws(() => pathsFor('../auth'));
});
test('Vercel 61.1 JSON deployment output and legacy URL both parse; malformed or nonproduction output fails closed', () => {
  const deployment = { id: 'dpl_Fixture123', url: 'ltc-fixture.vercel.app', readyState: 'READY', target: 'production' };
  assert.deepEqual(parseDeploymentOutput(JSON.stringify({ status: 'ok', deployment })), { id: deployment.id, url: 'https://ltc-fixture.vercel.app' });
  assert.deepEqual(parseDeploymentOutput(JSON.stringify({ status: 'ok', deployment: { ...deployment, url: 'https://ltc-fixture.vercel.app/' } })), { id: deployment.id, url: 'https://ltc-fixture.vercel.app' });
  assert.deepEqual(parseDeploymentOutput('https://ltc-fixture.vercel.app\n'), { id: null, url: 'https://ltc-fixture.vercel.app' });
  for (const changed of [{ target: 'preview' }, { readyState: 'ERROR' }, { id: '' }, { url: 'https://example.com' }, { url: 'https://ltc-fixture.vercel.app/secret' }, { url: 'https://user:pass@ltc-fixture.vercel.app' }]) assert.throws(() => parseDeploymentOutput(JSON.stringify({ status: 'ok', deployment: { ...deployment, ...changed } })));
  for (const bad of ['not JSON', '{"status":"error","deployment":{}}', '{}', 'https://ltc-fixture.vercel.app?token=secret']) assert.throws(() => parseDeploymentOutput(bad));
});
test('authenticated protected-candidate reads are restricted to manifest paths, with Vercel credentials before curl passthrough', async () => {
  const body = '<html>verified fixture</html>\n';
  const hash = createHash('sha256').update(body).digest('hex');
  const manifest = pathsFor(id).map(file => ({ file, sha256: hash }));
  const calls = [];
  await verifyProtectedCandidate('dpl_Fixture123', id, manifest, args => { calls.push(args); return body; });
  assert.equal(calls.length, 10);
  assert.equal(calls[0][1], '/');
  for (const args of calls) {
    assert.equal(args[0], 'curl'); assert.equal(args[2], '--deployment'); assert.equal(args[3], 'dpl_Fixture123');
    const authenticated = withVercelAuth(args, 'fixture-runtime-token');
    assert.ok(authenticated.indexOf('--scope') < authenticated.indexOf('--'));
    assert.ok(authenticated.indexOf('--token') < authenticated.indexOf('--'));
    assert.ok(!authenticated.slice(authenticated.indexOf('--') + 1).includes('fixture-runtime-token'));
  }
  let forbiddenCalls = 0;
  await assert.rejects(verifyProtectedCandidate('dpl_Fixture123', id, [{ file: '../../secret', sha256: hash }], () => { forbiddenCalls++; return body; }), /invalid_candidate_manifest/);
  assert.equal(forbiddenCalls, 0);
  await assert.rejects(verifyProtectedCandidate('dpl_Fixture123', id, manifest, () => 'Login required'), /deployed_artifact_mismatch/);
  await assert.rejects(verifyProtectedCandidate('https://example.com', id, manifest, () => body), /candidate_identity_failed/);
});
test('implementation digest rejects changed code before execution but permits dated data changes', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ltc-cloud-guard-'));
  const git = args => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  try {
    git(['init', '-q']);
    await mkdir(path.join(dir, 'content/ltc'), { recursive: true });
    await writeFile(path.join(dir, 'runner.mjs'), 'throw new Error("must not execute");');
    await writeFile(path.join(dir, 'content/ltc/index.json'), '[]');
    git(['add', '.']);
    const accepted = await implementationDigest(dir);
    await verifyImplementation(dir, accepted);
    await writeFile(path.join(dir, 'content/ltc/index.json'), '[{"dated":"data"}]');
    await verifyImplementation(dir, accepted);
    await writeFile(path.join(dir, 'runner.mjs'), 'throw new Error("changed");');
    await assert.rejects(verifyImplementation(dir, accepted), /implementation_changed/);
    await assert.rejects(verifyImplementation(dir, ''), /accepted_digest_required/);
    await symlink('runner.mjs', path.join(dir, 'alias.mjs')); git(['add', 'alias.mjs']);
    await assert.rejects(implementationDigest(dir), /non_regular_tracked_file/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('community and newsroom pointers are mutable but their archive records are immutable', () => {
  const archives = ['content/ltc-community/archive/20261007T140000Z.json', 'content/ltc-newsroom/newsroom-20261007T140000Z.json'];
  for (const file of archives) {
    assert.equal(isEditionData(file), true);
    assertChanges([{ file, status: '??' }], id);
    for (const status of ['M', 'D', 'R']) assert.throws(() => assertChanges([{ file, status }], id));
  }
  for (const file of ['content/ltc-community/latest.json', 'content/ltc-newsroom/latest.json']) assertChanges([{ file, status: 'M' }], id);
  for (const file of ['content/ltc-newsroom/arbitrary.json', 'content/ltc-community/archive/../../config.json', 'content/ltc-extras/2026-10-06-delorean-r2.json']) {
    assert.equal(isEditionData(file), false);
    assert.throws(() => assertChanges([{ file, status: '??' }], id));
  }
});
test('activation remains blocked independently of runtime publication switches', () => {
  assert.throws(() => assertMigrationAcceptance(), /migration_acceptance_pending/);
  assert.equal(safeFailure(new Error('migration_acceptance_pending')), 'migration_acceptance_pending');
});
test('public readback verifies both brands and propagates either domain failure', async () => {
  const calls = [];
  await verifyPublicDomains([], async domain => calls.push(domain));
  assert.deepEqual(calls, TARGET.domains);
  await assert.rejects(verifyPublicDomains([], async domain => { if (domain === TARGET.domains[1]) throw Error('second_domain_failed'); }), /second_domain_failed/);
});
test('complete built manifest includes historical issues, specials, newsroom and assets and rejects symlinks', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ltc-manifest-'));
  try {
    for (const file of ['index.html', 'conversations/specials/proof-of-birthday/index.html', 'data/ltc-editions/2026-10-01-r2.json', 'data/ltc-community/20261007T140000Z.json', '_next/static/chunk.js']) {
      await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
      await writeFile(path.join(dir, file), file);
    }
    const records = await builtManifest(dir);
    assert.equal(records.length, 5);
    assert.ok(records.every(record => record.sha256 === createHash('sha256').update(record.file).digest('hex')));
    await symlink('index.html', path.join(dir, 'unsafe'));
    await assert.rejects(builtManifest(dir), /non_regular_tracked_file/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('cloud digest agrees with canonical local release guard on the tracked checkout', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const canonical = execFileSync(process.execPath, ['scripts/ltc-release-guard.mjs'], { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(await implementationDigest(root), canonical);
});

test('fresh full pipeline validates candidate before any accepted-data write and same-day retries preserve issue while refreshing source-dated snapshot', async () => {
  const inputs = Object.fromEntries(['base', 'intelligence', 'policy', 'community'].map(key => [key, `/private/${key}.json`]));
  for (const existingEdition of [false, true]) {
    const calls = []; const writes = [];
    await prepareObservations({ clone: '/clone', evidence: '/private', inputs, existingEdition }, async (binary, args, cwd) => {
      assert.equal(cwd, '/clone'); calls.push(args); return args[0] === 'scripts/collect-ltc.mjs' ? JSON.stringify({fetchedAt:'2026-10-15T12:34:56Z',observations:[{sourceTimestamp:'2026-10-15T12:34:00Z',value:123}]}) : '{}';
    }, async (file, body, options) => writes.push({ file, body, options }));
    assert.deepEqual(calls.slice(0, 4), [
      ['scripts/collect-ltc.mjs', '--stdout'],
      ['scripts/collect-ltc-intelligence.mjs', '--output', inputs.intelligence, '--evidence-dir', '/private/intelligence-raw'],
      ['scripts/collect-ltc-policy.mjs', '--output', inputs.policy],
      ['scripts/collect-ltc-community.mjs', '--output', inputs.community, '--evidence-dir', '/private/community-raw'],
    ]);
    assert.deepEqual(calls[4], ['scripts/collect-litecoin-distribution.mjs', '--output', '/private/litecoin-distribution-raw.json']);
    assert.equal(calls[5][0], 'scripts/prepare-ltc-flagship.mjs');
    assert.ok(calls[5].includes('--output')); assert.ok(!calls[5].includes('--publish'));
    assert.equal(calls.filter(args => args.includes('--publish')).length, existingEdition ? 1 : 2);
    assert.equal(writes.filter(write => write.file.startsWith('/clone')).length, 1);
    const snapshot = writes.find(write => write.file === '/clone/public/data/ltc-snapshot.json');
    assert.deepEqual(JSON.parse(snapshot.body),{fetchedAt:'2026-10-15T12:34:56Z',observations:[{sourceTimestamp:'2026-10-15T12:34:00Z',value:123}]});
    assert.ok(!writes.some(write=>write.file.includes('content/ltc/')));
    assert.deepEqual(writes[0].options, { flag: 'wx', mode: 0o600 });
    assert.equal(calls.at(-3)[0], 'scripts/archive-ltc-community.mjs');
    assert.equal(calls.at(-2)[0], 'scripts/prepare-ltc-newsroom.mjs');
    assert.deepEqual(calls.at(-1), ['scripts/prepare-ltc-source-desk.mjs', '--notebook', '/clone/content/ltc-newsroom/latest.json', '--apply']);
    assert.ok(calls.at(-2).includes('--apply'));
  }
});
test('stale/partial candidate rejection prevents archive, newsroom and accepted snapshot writes', async () => {
  for (const existingEdition of [false,true]) {
  const calls = []; const writes = [];
  await assert.rejects(prepareObservations({ clone: '/clone', evidence: '/private', inputs: { base: '/private/base', intelligence: '/private/intelligence', policy: '/private/policy', community: '/private/community' }, existingEdition }, async (_, args) => {
    calls.push(args); if (args[0] === 'scripts/prepare-ltc-flagship.mjs') throw Error('stale_or_partial'); return '{}';
  }, async file => writes.push(file)), /stale_or_partial/);
  assert.ok(!calls.some(args => args.includes('--publish') || args.includes('--apply') || args[0] === 'scripts/archive-ltc-community.mjs'));
  assert.ok(writes.every(file => file.startsWith('/private')));
  }
});
test('magazine root readback maps to its conversations homepage without following a redirect', () => {
  const manifest = [{ file: 'index.html', sha256: 'community' }, { file: 'conversations/index.html', sha256: 'magazine' }];
  assert.deepEqual(publicReadbackRecord(TARGET.domains[1], manifest[0], manifest), { route: '/conversations/', sha256: 'magazine' });
  assert.deepEqual(publicReadbackRecord(TARGET.domains[0], manifest[0], manifest), { route: '/', sha256: 'community' });
  assert.throws(() => publicReadbackRecord(TARGET.domains[1], manifest[0], []), /invalid_candidate_manifest/);
});

test('collector exit 2 permits normalized gap snapshots but rejects missing/malformed snapshots and arbitrary failures', async () => {
  const exited = status => () => { const error = Error('private provider details'); error.status = status; throw error; };
  const readGap = async () => JSON.stringify({ sources: [{ status: 'unavailable' }] });
  assert.equal(await collectorCommand('node', [], '/clone', '/private/snapshot', exited(2), readGap), '');
  await assert.rejects(collectorCommand('node', [], '/clone', '/private/snapshot', exited(2), async () => '{bad'), /invalid_collector_snapshot/);
  await assert.rejects(collectorCommand('node', [], '/clone', '/private/snapshot', exited(2), async () => { throw Error('ENOENT'); }), /invalid_collector_snapshot/);
  for (const status of [1, 3, null]) await assert.rejects(collectorCommand('node', [], '/clone', '/private/snapshot', exited(status), readGap), /collector_failed/);
  assert.equal(await collectorCommand('node', [], '/clone', '/private/snapshot', () => 'collected', readGap), 'collected');
  await assert.rejects(collectorCommand('node', [], '/clone', '/private/snapshot', () => 'collected', async () => ''), /invalid_collector_snapshot/);
});

test('accepted source is explicit, fixed-repository and verified-domain only; branch ambiguity fails closed', () => {
  const good = {schemaVersion:1, repository:TARGET.repository, branch:'agent/wall-street-20261011', acceptedBaseline:'a'.repeat(40), canonical:TARGET.domains[0]};
  assert.equal(acceptedSourceConfig(good).branch, good.branch);
  for (const change of [{repository:'other/repo'}, {branch:'main'}, {branch:'agent/a..b'}, {branch:'agent/a//b'}, {branch:'agent/x/'}, {acceptedBaseline:'HEAD'}, {canonical:'https://stale.vercel.app'}, {canonical:TARGET.domains[0]+'?secret=x'}]) assert.throws(() => acceptedSourceConfig({...good,...change}), /invalid_accepted_source/);
  assert.throws(() => acceptedSourceConfig(null), /invalid_accepted_source/);
  assert.throws(assertMigrationAcceptance, /migration_acceptance_pending/);
});
test('Build Output provenance includes function implementation/config and detects executable mutation; rejects symlinks and unexpected roots', async () => {
  const dir = await mkdtemp(path.join(tmpdir(),'ltc-build-output-'));
  try {
    await mkdir(path.join(dir,'static'),{recursive:true});
    await mkdir(path.join(dir,'functions/api/chain.func'),{recursive:true});
    await writeFile(path.join(dir,'config.json'),'{}');
    await writeFile(path.join(dir,'static/index.html'),'fixture');
    await writeFile(path.join(dir,'functions/api/chain.func/.vc-config.json'),'{}');
    await writeFile(path.join(dir,'functions/api/chain.func/serve.cjs'),'module.exports=()=>1');
    const before = await builtOutputManifest(dir);
    assert.equal(before.length,4);
    assert.ok(before.some(r=>r.file.endsWith('.vc-config.json')));
    await writeFile(path.join(dir,'functions/api/chain.func/serve.cjs'),'module.exports=()=>2');
    assert.notDeepEqual(await builtOutputManifest(dir),before);
    await writeFile(path.join(dir,'unexpected-private.json'),'{}');
    await assert.rejects(builtOutputManifest(dir),/invalid_candidate_manifest/);
    await rm(path.join(dir,'unexpected-private.json'));
    await symlink('serve.cjs',path.join(dir,'functions/api/chain.func/link.cjs'));
    await assert.rejects(builtOutputManifest(dir),/non_regular_tracked_file/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('exact routine feature, selection and distribution records are add-only and share the implementation classifier', () => {
  const edition = '2026-10-15-r1';
  const dated = ['content/daily-features/2026-10-15.json', 'content/ltc-newsroom-selections/2026-10-15-r1.json', 'content/research/litecoin-distribution-20261015.json', 'public/data/litecoin-distribution-20261015.json'];
  for (const file of dated) {
    assert.equal(isEditionData(file), true);
    assertChanges([{file,status:'A'}],edition);
    assertChanges([{file,status:'??'}],edition);
    assert.throws(()=>assertChanges([{file,status:'M'}],edition),/immutable_edition_changed/);
    assert.throws(()=>assertChanges([{file,status:'D'}],edition),/release_changes_outside_allowlist/);
    assert.throws(()=>assertChanges([{file,status:'A'}],'2026-10-16-r1'),/release_changes_outside_allowlist/);
  }
  for (const file of ['content/ltc-newsroom-selections/latest.json','content/research/litecoin-distribution-latest.json']) {
    assert.equal(isEditionData(file),true); assertChanges([{file,status:'M'}],edition);
  }
  for (const file of ['content/daily-features/latest.json','content/research/unreviewed.json','content/ltc-newsroom-selections/2026-10-15-r2.json','content/daily-features/2026-02-30.json','public/data/litecoin-distribution-20261315.json','content/ltc-newsroom/newsroom-20261015T250000Z.json','content/daily-features/../config.json','content/research/litecoin-distribution-20261015.json/extra','content/research/litecoin-distribution-20261015.JSON']) {
    assert.equal(isEditionData(file),false,file);
    assert.throws(()=>assertChanges([{file,status:'A'}],edition),/release_changes_outside_allowlist/);
  }
  for(const status of ['R','C','T','AM','MM']) assert.throws(()=>assertChanges([{file:dated[0],status}],edition),/release_changes_outside_allowlist/);
});

test('protected readback preserves binary assets as bytes rather than UTF8 text', async () => {
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0xfe]);
  const manifest = pathsFor(id).map(file => ({ file, sha256: createHash('sha256').update(bytes).digest('hex') }));
  manifest.push({ file: 'images/cover.png', sha256: createHash('sha256').update(bytes).digest('hex') });
  await verifyProtectedCandidate('dpl_BinaryFixture', id, manifest, () => bytes);
  await assert.rejects(verifyProtectedCandidate('dpl_BinaryFixture', id, manifest, () => bytes.toString('utf8')), /deployed_artifact_mismatch/);
});

test('pre-effect collection failure can release unused lease, but any current intent retains fencing', async () => {
  const state = new DurableCloudState(new MemoryStateAdapter(), 'website'); await state.setPaused(false);
  let lease = await state.acquire('before-collection');
  assert.equal(await releaseUnusedAdmission({ state, lease }), true); assert.equal((await state.inspect()).lease, null);
  lease = await state.acquire('after-intent');
  await state.intend(lease, 'potential-mutation', 'a'.repeat(64));
  assert.equal(await releaseUnusedAdmission({ state, lease }), false); assert.ok((await state.inspect()).lease);
  await state.assertMayMutate(lease, 'potential-mutation');
  assert.equal(await releaseUnusedAdmission({ state, lease }), false);
});
test('source-desk dated selection is explicitly add-only and trusted inline classifier agrees', async () => {
  const file = 'content/ltc-newsroom-selections/source-desk-2026-10-02-r1.json';
  assert.equal(isEditionData(file), true); assertChanges([{ file, status: '??' }], id);
  assert.throws(() => assertChanges([{ file, status: 'M' }], id), /immutable_edition_changed/);
  const root = fileURLToPath(new URL('..', import.meta.url));
  const workflow = await readFile(path.join(root, 'ops/ltc-daily-workflow.yml'), 'utf8');
  const inline = workflow.slice(workflow.indexOf('const pointers = new Set('), workflow.indexOf('const files=execFileSync'));
  const classify = new Function(inline + '\nreturn isRoutineData;')();
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const name of [...tracked, file, 'content/ltc-newsroom-selections/source-desk-2026-02-30-r1.json', 'content/ltc-community/archive/20261002T250000Z.json', '../config/private.json']) assert.equal(classify(name), isEditionData(name), name);
});
