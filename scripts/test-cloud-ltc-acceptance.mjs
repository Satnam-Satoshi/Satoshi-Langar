import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, chmod, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { acceptanceHash, assertAcceptanceContext, prepareStageAcceptance, runStageAcceptance, recoverStageAcceptance, persistedAcceptancePlan } from './cloud-ltc-acceptance.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { TARGET, pathsFor, implementationDigest, builtManifest } from './cloud-ltc-release.mjs';

async function fixture(t) {
  const scratch = await mkdtemp(path.join(tmpdir(), 'ltc-stage-contract-')); t.after(() => rm(scratch, { recursive: true, force: true }));
  const root = path.join(scratch, 'source'), evidenceDirectory = path.join(scratch, 'evidence'); await mkdir(root); await mkdir(evidenceDirectory);
  const put = async (file, bytes) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, bytes); };
  await put(path.join(root, '.gitignore'), 'dist/\n.vercel/\n'); await put(path.join(root, 'package.json'), '{"private":true}');
  await put(path.join(root, 'launch.sh'), '#!/bin/sh\nexit 0\n'); await chmod(path.join(root, 'launch.sh'), 0o700);
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' } }).trim();
  git(['init', '-q']); git(['add', '.']); git(['-c', 'commit.gpgsign=false', 'commit', '-qm', 'accepted']);
  const editionId = '2026-10-30-r1';
  for (const file of pathsFor(editionId)) { const bytes = Buffer.from(`accepted ${file}\0\xff`, 'latin1'); await put(path.join(root, 'dist', file), bytes); await put(path.join(root, '.vercel/output/static', file), bytes); }
  await put(path.join(root, '.vercel/output/config.json'), '{"version":3}');
  await put(path.join(root, '.vercel/output/functions/api.func/.vc-config.json'), '{"runtime":"nodejs22.x"}');
  await put(path.join(root, '.vercel/output/functions/api.func/index.js'), 'export default () => {};');
  await put(path.join(evidenceDirectory, 'build-receipt.json'), '{"mode":"accepted-current-build"}');
  const stateConfig = { documentId: 'website_document_123', folderId: 'private_folder_123' }, socialStateConfig = { documentId: 'social_document_123', folderId: stateConfig.folderId, ledgerKey: 'social' }, evidenceConfig = { folderId: stateConfig.folderId, ownerPermissionId: 'owner_permission_123' };
  const previousManifest = (await builtManifest(path.join(root, 'dist'))).map(record => ({ ...record, sha256: acceptanceHash(`previous accepted ${record.file}`) }));
  const { plan, packed } = await prepareStageAcceptance({ root, evidenceDirectory, editionId, acceptanceId: 'fixture-stage-1', previousDeployment: 'dpl_Previous', previousManifest, implementationSha256: await implementationDigest(root), stateConfig, socialStateConfig, evidenceConfig });
  const env = { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: TARGET.repository, GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '1', LTC_ACCEPTANCE_ENVIRONMENT: 'ltc-production', LTC_ACCEPTANCE_MANUAL: 'true', LTC_CLOUD_PUBLISH: 'false', LTC_ACCEPTANCE_PLAN_SHA256: acceptanceHash(plan), LTC_ACCEPTANCE_SOURCE_COMMIT: plan.source, LTC_ACCEPTED_IMPLEMENTATION_SHA256: plan.implementationSha256 };
  const adapter = new MemoryStateAdapter(), state = new DurableCloudState(adapter, 'website'); await state.setPaused(true);
  const events = [], uploaded = new Map(), deployments = new Map(); let pointer = plan.previousDeployment;
  const identity = id => ({ id, projectId: TARGET.project, ownerId: TARGET.team, team: { id: TARGET.team, slug: TARGET.scope }, readyState: 'READY', target: 'production', url: `${id.toLowerCase().replaceAll('_', '-')}.vercel.app` });
  deployments.set(pointer, identity(pointer));
  const flags = { unknown: false, running: false, socialPaused: true, corruptDownload: false, stageCalls: 0, uploadCalls: 0 };
  const directory = path.join(scratch, 'run'); await mkdir(directory);
  const proofFor = p => ({ fileId: p.fileId, folderId: p.folderId, sha256: p.sha256, length: p.bytes, ownerPermissionId: plan.ownerPermissionId, ownerOnly: true, downloadVerified: true });
  const dependencies = {
    directory, socialState: { inspect: async () => ({ paused: flags.socialPaused, lease: null, records: {} }) },
    vercel: async endpoint => endpoint.startsWith('/v9/') ? { id: TARGET.project, accountId: TARGET.team } : endpoint.startsWith('/v6/') ? { deployments: [...deployments.values()].filter(item => item.meta), pagination: { next: null } } : deployments.get(TARGET.domains.some(domain => new URL(domain).hostname === endpoint.split('/').at(-1)) ? pointer : endpoint.split('/').at(-1)),
    github: async () => ({ id: 100, run_attempt: 1, status: flags.running ? 'in_progress' : 'completed', event: 'workflow_dispatch', head_branch: 'main', repository: { full_name: TARGET.repository }, path: '.github/workflows/ltc-daily-publication.yml' }),
    verifySource: async () => assert.equal(git(['status', '--porcelain']), ''),
    preallocate: async count => Array.from({ length: count }, (_, index) => `preallocated_file_${index}`),
    evidenceProvider: (bundle, fileId) => ({
      apply: async context => { const doc = await state.inspect(); assert.equal(Object.values(doc.intents).filter(intent => intent.payload.kind === 'drive-evidence').length, plan.bundleCount); assert.equal(Object.values(doc.intents).filter(intent => intent.payload.kind === 'vercel-stage').length, 1); flags.uploadCalls++; events.push('upload'); uploaded.set(fileId, { bundle, context }); },
      readback: async context => ({ ...context, status: 'applied', proof: proofFor(context.payload) }),
    }),
    download: async receipt => { events.push('download'); if (flags.unknown) return null; const saved = uploaded.get(receipt.fileId); if (!saved) return null; assert.equal(saved.context.payloadSha256, receipt.payloadSha256); const bundle = flags.corruptDownload ? { ...saved.bundle, bytes: Buffer.from('corrupt') } : saved.bundle; return { bundle, proof: proofFor(saved.context.payload) }; },
    verifyPublic: async manifest => { assert.equal(acceptanceHash(manifest), plan.previousPublicManifestSha256); assert.notEqual(acceptanceHash(manifest), plan.staticManifestSha256); assert.equal(pointer, plan.previousDeployment); if (flags.failPublicAfterStage && flags.stageCalls) throw Error('baseline read unavailable'); events.push('public'); },
    verifyProtected: async (deployment, id, manifest) => { assert.equal(deployment.id, 'dpl_Candidate'); assert.equal(id, plan.editionId); assert.equal(acceptanceHash(manifest), plan.staticManifestSha256); events.push('protected'); },
    cli: async (args, cwd) => { assert.equal(args[0], 'deploy'); assert.ok(args.includes('--prebuilt') && args.includes('--prod') && args.includes('--skip-domain')); assert.equal(acceptanceHash(await builtManifest(path.join(cwd, '.vercel/output/static'))), plan.staticManifestSha256); assert.deepEqual(JSON.parse(await readFile(path.join(cwd, '.vercel/project.json'), 'utf8')), { projectId: TARGET.project, orgId: TARGET.team }); const meta = {}; for (let n = 0; n < args.length; n++) if (args[n] === '--meta') { const [key, value] = args[++n].split('='); meta[key] = value; } flags.stageCalls++; events.push('deploy'); deployments.set('dpl_Candidate', { ...identity('dpl_Candidate'), meta }); },
    save: async value => { events.push(`save:${value.status}`); },
  };
  const recovery = async overrides => { const recoveryDir = await mkdtemp(path.join(scratch, 'recovery-')); const document = await state.inspect(); return recoverStageAcceptance({ plan, env: { ...env, GITHUB_RUN_ID: '101' }, state, expectedFence: document.lease?.fence, dependencies: { ...dependencies, directory: recoveryDir }, ...overrides }); };
  return { plan, packed, previousManifest, env, state, dependencies, flags, events, recovery, root, evidenceDirectory, stateConfig, socialStateConfig, evidenceConfig, setPointer: id => { pointer = id; deployments.set(id, identity(id)); } };
}

test('complete acceptance uses remote restored exact bytes, persists identities first, stages only and closes paused', async t => {
  const f = await fixture(t); const result = await runStageAcceptance(f);
  assert.equal(result.status, 'stage-verified'); assert.equal(result.aliasesChanged, false); assert.equal(f.flags.stageCalls, 1);
  assert.ok(f.events.indexOf('upload') < f.events.indexOf('download') && f.events.indexOf('download') < f.events.indexOf('deploy') && f.events.includes('protected'));
  const state = await f.state.inspect(); assert.equal(state.paused, true); assert.equal(state.lease, null); assert.ok(Object.values(state.intents).every(intent => intent.status === 'confirmed'));
  await assert.rejects(runStageAcceptance(f), /acceptance_ledger_not_idle/);
});

test('admission requires exact plan, main manual protected context, switches closed and social paused', async t => {
  const f = await fixture(t);
  for (const change of [{ GITHUB_REF: 'refs/heads/other' }, { GITHUB_EVENT_NAME: 'schedule' }, { LTC_CLOUD_PUBLISH: 'true' }, { LTC_ACCEPTANCE_MANUAL: 'false' }, { LTC_ACCEPTANCE_PLAN_SHA256: '0'.repeat(64) }, { LTC_ACCEPTANCE_SOURCE_COMMIT: '0'.repeat(40) }, { LTC_ACCEPTANCE_ENVIRONMENT: '' }]) assert.throws(() => assertAcceptanceContext(f.plan, { ...f.env, ...change }), /acceptance_context_required/);
  f.flags.socialPaused = false; await assert.rejects(runStageAcceptance(f), /acceptance_social_not_paused/); assert.equal((await f.state.inspect()).paused, true); assert.equal(f.flags.uploadCalls, 0);
});

test('changed current public deployment fails before admission or effects', async t => { const f = await fixture(t); f.setPointer('dpl_Unexpected'); await assert.rejects(runStageAcceptance(f), /acceptance_public_pointer_changed/); assert.equal((await f.state.inspect()).lease, null); assert.equal(f.flags.uploadCalls, 0); });

test('lost upload confirmation recovers fresh proof in a new job, abandons never-authorized stage, never repeats effects', async t => {
  const f = await fixture(t); await assert.rejects(runStageAcceptance({ ...f, crashAfter: 'first-effect' }), /operation_outcome_uncertain/);
  const before = await f.state.inspect(); assert.ok(before.lease); assert.equal(Object.values(before.intents).filter(intent => intent.status === 'uncertain').length, 1);
  const result = await f.recovery(); assert.equal(result.status, 'incomplete-no-resume'); assert.equal(result.effectsReissued, false); assert.equal(f.flags.uploadCalls, 1); assert.equal(f.flags.stageCalls, 0);
  assert.equal((await f.state.inspect()).paused, true); assert.equal((await f.state.inspect()).lease, null);
});

test('lost stage confirmation recovers from remote package without local source and never deploys twice', async t => {
  const f = await fixture(t); const stageId = `accept-${acceptanceHash(f.plan).slice(0, 24)}-stage`;
  await assert.rejects(runStageAcceptance({ ...f, crashAfter: stageId }), /operation_outcome_uncertain/);
  await rm(f.root, { recursive: true }); await rm(f.dependencies.directory, { recursive: true });
  const result = await f.recovery(); assert.equal(result.status, 'stage-verified'); assert.equal(f.flags.stageCalls, 1); assert.equal(f.flags.uploadCalls, f.plan.bundleCount); assert.ok(f.events.includes('protected')); assert.equal((await f.state.inspect()).lease, null);
});

test('unknown remote outcome remains paused with original lease; active original run and wrong fence cannot reconcile', async t => {
  const f = await fixture(t); await assert.rejects(runStageAcceptance({ ...f, crashAfter: 'first-effect' }), /operation_outcome_uncertain/);
  f.flags.running = true; await assert.rejects(f.recovery(), /acceptance_origin_still_running/);
  f.flags.running = false; await assert.rejects(f.recovery({ expectedFence: 999 }), /acceptance_recovery_fence_required/);
  f.flags.unknown = true; await assert.rejects(f.recovery(), /operation_outcome_uncertain/);
  const doc = await f.state.inspect(); assert.equal(doc.paused, true); assert.ok(doc.lease); assert.ok(Object.values(doc.intents).some(intent => intent.status === 'uncertain')); assert.equal(f.flags.uploadCalls, 1);
});

test('tampered downloaded bytes prevent staging and preserve fence for reviewed recovery', async t => { const f = await fixture(t); f.flags.corruptDownload = true; await assert.rejects(runStageAcceptance(f)); assert.equal(f.flags.stageCalls, 0); assert.ok((await f.state.inspect()).lease); });

test('failure before any intent recovers admission without creating effects', async t => {
  const f = await fixture(t); f.dependencies.preallocate = async () => { throw Error('allocation unavailable'); };
  await assert.rejects(runStageAcceptance(f), /allocation unavailable/); const doc = await f.state.inspect(); assert.ok(doc.lease); assert.deepEqual(doc.intents, {});
  const result = await f.recovery(); assert.equal(result.status, 'incomplete-no-resume'); assert.equal((await f.state.inspect()).paused, true); assert.equal((await f.state.inspect()).lease, null); assert.equal(f.flags.uploadCalls, 0);
});

test('original plan survives admission and confirmed-stage recovery still obtains fresh protected proof', async t => {
  const f = await fixture(t); f.flags.failPublicAfterStage = true;
  await assert.rejects(runStageAcceptance(f), /baseline read unavailable/);
  const document = await f.state.inspect(); assert.equal(Object.values(document.intents).find(intent => intent.payload.kind === 'vercel-stage').status, 'confirmed');
  const plan = persistedAcceptancePlan(document, document.lease.fence, acceptanceHash(f.plan)); assert.deepEqual(plan, f.plan);
  assert.throws(() => persistedAcceptancePlan(document, document.lease.fence + 1, acceptanceHash(f.plan)), /acceptance_recovery_context_missing/);
  assert.throws(() => persistedAcceptancePlan(document, document.lease.fence, '0'.repeat(64)), /acceptance_recovery_context_missing/);
  f.flags.failPublicAfterStage = false; const result = await f.recovery(); assert.equal(result.status, 'stage-verified'); assert.equal(f.flags.stageCalls, 1); assert.equal(f.events.filter(event => event === 'protected').length, 2);
});

test('concurrent acceptance admission has one CAS winner, one upload and one deployment', async t => { const f = await fixture(t); const results = await Promise.allSettled([runStageAcceptance(f), runStageAcceptance(f)]); assert.equal(results.filter(result => result.status === 'fulfilled').length, 1); assert.equal(f.flags.stageCalls, 1); assert.equal(f.flags.uploadCalls, f.plan.bundleCount); });

test('offline preparation refuses dirty accepted source and static/Build Output disagreement', async t => {
  const f = await fixture(t); await writeFile(path.join(f.root, '.vercel/output/static/index.html'), 'wrong output');
  const options = { ...f, acceptanceId: f.plan.acceptanceId, editionId: f.plan.editionId, previousDeployment: f.plan.previousDeployment, implementationSha256: f.plan.implementationSha256 };
  await assert.rejects(prepareStageAcceptance(options), /acceptance_static_output_mismatch/);
  await writeFile(path.join(f.root, 'package.json'), '{"changed":true}'); await assert.rejects(prepareStageAcceptance(options), /acceptance_source_not_clean/);
});

test('actual SIGKILL after provider effect leaves durable uncertainty and no terminal receipt', async t => {
  const f = await fixture(t), ledger = path.join(f.dependencies.directory, 'ledger.json'), effect = path.join(f.dependencies.directory, 'effect.json');
  await writeFile(ledger, JSON.stringify({ value: await f.state.inspect(), version: 1 }));
  const input = { plan: f.plan, previousManifest: f.previousManifest, env: f.env, packed: { ...f.packed, bundles: f.packed.bundles.map(bundle => ({ ...bundle, bytes: bundle.bytes.toString('base64') })) }, ledger, effect };
  const script = `
    import {readFile,writeFile} from 'node:fs/promises';
    import {runStageAcceptance} from ${JSON.stringify(new URL('./cloud-ltc-acceptance.mjs', import.meta.url).href)};
    import {DurableCloudState} from ${JSON.stringify(new URL('./cloud-ltc-state.mjs', import.meta.url).href)};
    import {TARGET} from ${JSON.stringify(new URL('./cloud-ltc-release.mjs', import.meta.url).href)};
    const input=JSON.parse(process.argv[1]); for(const bundle of input.packed.bundles)bundle.bytes=Buffer.from(bundle.bytes,'base64');
    const adapter={read:async()=>JSON.parse(await readFile(input.ledger,'utf8')),conditionalWrite:async(key,value,expected)=>{const prior=JSON.parse(await readFile(input.ledger,'utf8'));if(prior.version!==expected)throw Error('conflict');await writeFile(input.ledger,JSON.stringify({value,version:expected+1}));}};
    const state=new DurableCloudState(adapter,'website');
    const dependencies={socialState:{inspect:async()=>({paused:true,lease:null,records:{}})},vercel:async endpoint=>endpoint.startsWith('/v9/')?{id:TARGET.project,accountId:TARGET.team}:{id:input.plan.previousDeployment,projectId:TARGET.project,ownerId:TARGET.team,team:{id:TARGET.team},target:'production',readyState:'READY',url:'accepted.vercel.app'},verifySource:async()=>{},verifyPublic:async()=>{},save:async()=>{},preallocate:async count=>Array.from({length:count},(_,n)=>'known_id_'+n),evidenceProvider:()=>({apply:async context=>writeFile(input.effect,JSON.stringify(context)),readback:async()=>{throw Error('must not reach confirmation');}}),crashBoundary:()=>process.kill(process.pid,'SIGKILL')};
    await runStageAcceptance({...input,state,dependencies,crashAfter:'first-effect'});
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, JSON.stringify(input)], { encoding: 'utf8' });
  assert.equal(result.signal, 'SIGKILL', result.stderr); const record = JSON.parse(await readFile(ledger, 'utf8')).value;
  const applied = JSON.parse(await readFile(effect, 'utf8')); assert.equal(record.intents[applied.operationId].status, 'uncertain'); assert.equal(record.receipts[applied.operationId], undefined); assert.ok(record.lease); assert.ok(Object.values(record.intents).some(intent => intent.payload.kind === 'vercel-stage' && intent.status === 'pending'));
});
