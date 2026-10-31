import {setupQuarantineFixture} from './lib/test-setup-quarantine-fixture.mjs';
import {buildOwnerQuarantinedSetupTransition} from './cloud-ltc-setup-quarantine.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, chmod, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { acceptanceHash, assertAcceptanceContext, prepareStageAcceptance, runStageAcceptance, recoverStageAcceptance, persistedAcceptancePlan, verifyRecoveryController, safeAcceptanceFailure, acceptanceArgumentsFor, assertAcceptanceSetupPolicy, acceptanceProjectScopedAuth, createAcceptanceLinkedClient, existingAcceptanceBypass, existingLinkedReadRecords, safeAcceptanceCliDiagnostic, ACCEPTANCE_PROJECT_NAME, ACCEPTANCE_CLI_VERSION } from './cloud-ltc-acceptance.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { TARGET, pathsFor, implementationDigest, builtManifest } from './cloud-ltc-release.mjs';

async function fixture(t) {
  const scratch = await mkdtemp(path.join(tmpdir(), 'ltc-stage-contract-')); t.after(() => rm(scratch, { recursive: true, force: true }));
  const root = path.join(scratch, 'source'), evidenceDirectory = path.join(scratch, 'evidence'); await mkdir(root); await mkdir(evidenceDirectory);
  const put = async (file, bytes) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, bytes); };
  await put(path.join(root, '.gitignore'), 'dist/\n.vercel/\n'); await put(path.join(root, 'package.json'), '{"private":true}');
  await put(path.join(root, 'vercel.json'), '{"framework":null}');
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
    vercel: async endpoint => endpoint.startsWith('/v9/') ? { id: TARGET.project, accountId: TARGET.team, name: ACCEPTANCE_PROJECT_NAME } : endpoint.startsWith('/v6/') ? { deployments: flags.hideStage ? [] : [...deployments.values()].filter(item => item.meta), pagination: { next: null } } : deployments.get(TARGET.domains.some(domain => new URL(domain).hostname === endpoint.split('/').at(-1)) ? pointer : endpoint.split('/').at(-1)),
    github: async endpoint => { events.push(`github:${endpoint}`); assert.ok(['/actions/runs/100', '/actions/runs/100/attempts/1'].includes(endpoint)); return { id: 100, run_attempt: endpoint === '/actions/runs/100' ? 2 : 1, status: flags.running ? 'in_progress' : 'completed', event: 'workflow_dispatch', head_branch: 'main', repository: { full_name: TARGET.repository }, path: '.github/workflows/ltc-daily-publication.yml' }; },
    verifySource: async () => assert.equal(git(['status', '--porcelain']), ''),
    preallocate: async count => Array.from({ length: count }, (_, index) => `preallocated_file_${index}`),
    evidenceProvider: (bundle, fileId) => ({
      apply: async context => { const doc = await state.inspect(); assert.equal(Object.values(doc.intents).filter(intent => intent.payload.kind === 'drive-evidence').length, plan.bundleCount); assert.equal(Object.values(doc.intents).filter(intent => intent.payload.kind === 'vercel-stage').length, 1); flags.uploadCalls++; events.push('upload'); uploaded.set(fileId, { bundle, context }); },
      readback: async context => ({ ...context, status: 'applied', proof: proofFor(context.payload) }),
    }),
    download: async receipt => { events.push('download'); if (flags.unknown) return null; const saved = uploaded.get(receipt.fileId); if (!saved) return null; assert.equal(saved.context.payloadSha256, receipt.payloadSha256); const bundle = flags.corruptDownload ? { ...saved.bundle, bytes: Buffer.from('corrupt') } : saved.bundle; return { bundle, proof: proofFor(saved.context.payload) }; },
    verifyPublic: async manifest => { assert.equal(acceptanceHash(manifest), plan.previousPublicManifestSha256); assert.notEqual(acceptanceHash(manifest), plan.staticManifestSha256); assert.equal(pointer, plan.previousDeployment); if (flags.failPublicAfterStage && flags.stageCalls) throw Error('baseline read unavailable'); events.push('public'); },
    verifyProtected: async (deployment, id, manifest) => { assert.equal(deployment.id, 'dpl_Candidate'); assert.equal(id, plan.editionId); assert.equal(acceptanceHash(manifest), plan.staticManifestSha256); events.push('protected'); },
    verifyLinkedExistingRead: async (deployment, manifest) => { assert.equal(deployment, plan.previousDeployment); assert.equal(acceptanceHash(manifest), plan.previousPublicManifestSha256); events.push('linked-existing-read'); return { linkedCliExistingReadVerified: true, countsAsStageAcceptance: false, recordCount: 3, previousManifestSha256: acceptanceHash(manifest) }; },
    cli: async (args, cwd) => { assert.equal(args[0], 'deploy'); assert.ok(args.includes('--prebuilt') && args.includes('--prod') && args.includes('--skip-domain')); assert.equal(acceptanceHash(await builtManifest(path.join(cwd, '.vercel/output/static'))), plan.staticManifestSha256); assert.deepEqual(JSON.parse(await readFile(path.join(cwd, '.vercel/project.json'), 'utf8')), { projectId: TARGET.project, orgId: TARGET.team, projectName: ACCEPTANCE_PROJECT_NAME }); const meta = {}; for (let n = 0; n < args.length; n++) if (args[n] === '--meta') { const [key, value] = args[++n].split('='); meta[key] = value; } flags.stageCalls++; events.push('deploy'); deployments.set('dpl_Candidate', { ...identity('dpl_Candidate'), meta }); },
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
  assert.equal(state.acceptance.status, 'completed'); assert.equal(state.acceptance.completion.outcome, 'stage-verified'); assert.equal(state.acceptance.completionSha256, result.completionSha256); assert.equal(acceptanceHash(state.acceptance.completion), result.completionSha256);
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
  assert.ok(f.events.includes('github:/actions/runs/100/attempts/1')); assert.ok(!f.events.includes('github:/actions/runs/100'));
  assert.equal((await f.state.inspect()).paused, true); assert.equal((await f.state.inspect()).lease, null);
});

test('lost stage confirmation recovers from remote package without local source and never deploys twice', async t => {
  const f = await fixture(t); const stageId = `accept-${acceptanceHash(f.plan).slice(0, 24)}-stage`;
  await assert.rejects(runStageAcceptance({ ...f, crashAfter: stageId }), /operation_outcome_uncertain/);
  await rm(f.root, { recursive: true }); await rm(f.dependencies.directory, { recursive: true });
  const result = await f.recovery(); assert.equal(result.status, 'stage-verified'); assert.equal(f.flags.stageCalls, 1); assert.equal(f.flags.uploadCalls, f.plan.bundleCount); assert.ok(f.events.includes('protected')); assert.equal((await f.state.inspect()).lease, null);
  const completed = (await f.state.inspect()).acceptance.completion;
  assert.deepEqual(completed.origin, { runId: '100', attempt: '1' }); assert.deepEqual(completed.completedBy, { runId: '101', attempt: '1', mode: 'stage-only-recovery' }); assert.equal(completed.verification.fullRestoreVerified, true); assert.equal(completed.verification.publicBaselineVerified, true); assert.equal(completed.verification.protectedStageVerified, true);
});

test('unknown remote outcome remains paused with original lease; active original run and wrong fence cannot reconcile', async t => {
  const f = await fixture(t); await assert.rejects(runStageAcceptance({ ...f, crashAfter: 'first-effect' }), /operation_outcome_uncertain/);
  f.flags.running = true; await assert.rejects(f.recovery(), /acceptance_origin_still_running/);
  f.flags.running = false; await assert.rejects(f.recovery({ expectedFence: 999 }), /acceptance_recovery_fence_required/);
  f.flags.unknown = true; await assert.rejects(f.recovery(), /operation_outcome_uncertain/);
  const doc = await f.state.inspect(); assert.equal(doc.paused, true); assert.ok(doc.lease); assert.ok(Object.values(doc.intents).some(intent => intent.status === 'uncertain')); assert.equal(f.flags.uploadCalls, 1);
  assert.equal(doc.acceptance.status, 'admitted'); assert.equal(doc.acceptance.completion, undefined);
});

test('tampered downloaded bytes prevent staging and preserve fence for reviewed recovery', async t => { const f = await fixture(t); f.flags.corruptDownload = true; await assert.rejects(runStageAcceptance(f)); assert.equal(f.flags.stageCalls, 0); assert.ok((await f.state.inspect()).lease); });

test('failure before any intent recovers admission without creating effects', async t => {
  const f = await fixture(t); f.dependencies.preallocate = async () => { throw Error('allocation unavailable'); };
  await assert.rejects(runStageAcceptance(f), /allocation unavailable/); const doc = await f.state.inspect(); assert.ok(doc.lease); assert.deepEqual(doc.intents, {});
  const result = await f.recovery(); assert.equal(result.status, 'incomplete-no-resume'); assert.equal((await f.state.inspect()).paused, true); assert.equal((await f.state.inspect()).lease, null); assert.equal(f.flags.uploadCalls, 0);
  const completed = (await f.state.inspect()).acceptance.completion; assert.equal(completed.outcome, 'incomplete-no-resume'); assert.equal(completed.verification.fullRestoreVerified, false); assert.equal(completed.verification.publicBaselineVerified, false); assert.equal(completed.verification.protectedStageVerified, false);
});

test('bounded durable completion survives loss of ephemeral final receipt and binds terminal proofs', async t => {
  const f = await fixture(t); f.dependencies.save = async value => { if (value.status === 'stage-verified') throw Error('local receipt unavailable'); };
  await assert.rejects(runStageAcceptance(f), /local receipt unavailable/);
  const document = await f.state.inspect(), completion = document.acceptance.completion;
  assert.equal(document.lease, null); assert.equal(document.paused, true); assert.equal(document.acceptance.status, 'completed');
  assert.equal(completion.planSha256, acceptanceHash(f.plan)); assert.equal(completion.source, f.plan.source); assert.equal(completion.implementationSha256, f.plan.implementationSha256); assert.equal(completion.fence, document.fence);
  assert.deepEqual(completion.origin, { runId: '100', attempt: '1' }); assert.deepEqual(completion.completedBy, { runId: '100', attempt: '1', mode: 'stage-only' });
  assert.equal(completion.verificationSha256, acceptanceHash(completion.verification)); assert.equal(document.acceptance.completionSha256, acceptanceHash(completion)); assert.ok(Buffer.byteLength(JSON.stringify(completion)) < 4096);
  const intents = Object.values(document.intents).filter(intent => intent.fence === completion.fence).sort((a, b) => a.operationId.localeCompare(b.operationId));
  assert.equal(completion.terminalProofSha256, acceptanceHash(intents.map(intent => ({ operationId: intent.operationId, payloadSha256: intent.payloadSha256, status: intent.status, evidenceSha256: intent.evidenceSha256, receiptSha256: document.receipts[intent.operationId].sha256 }))));
  await assert.rejects(runStageAcceptance(f), /acceptance_ledger_not_idle/); assert.equal(f.flags.stageCalls, 1);
});

test('approved replacement recovery controller preserves original plan/source binding and never repeats an effect', async t => {
  const f = await fixture(t); await assert.rejects(runStageAcceptance({ ...f, crashAfter: 'first-effect' }), /operation_outcome_uncertain/);
  const env = { ...f.env, GITHUB_RUN_ID: '101', LTC_ACCEPTED_IMPLEMENTATION_SHA256: 'f'.repeat(64) };
  assert.throws(() => assertAcceptanceContext(f.plan, env), /acceptance_context_required/);
  await assert.rejects(f.recovery({ env: { ...env, LTC_ACCEPTANCE_PLAN_SHA256: '0'.repeat(64) } }), /acceptance_context_required/);
  await assert.rejects(f.recovery({ env: { ...env, LTC_ACCEPTANCE_SOURCE_COMMIT: '0'.repeat(40) } }), /acceptance_context_required/);
  const result = await f.recovery({ env }); assert.equal(result.status, 'incomplete-no-resume'); assert.equal(f.flags.uploadCalls, 1); assert.equal(f.flags.stageCalls, 0);
  const completion = (await f.state.inspect()).acceptance.completion;
  assert.equal(completion.implementationSha256, f.plan.implementationSha256); assert.equal(completion.controllerImplementationSha256, env.LTC_ACCEPTED_IMPLEMENTATION_SHA256); assert.equal(completion.planSha256, acceptanceHash(f.plan)); assert.equal(completion.source, f.plan.source);
});

test('recovery controller verifier checks current checkout bytes against the protected current digest', async t => {
  const f = await fixture(t); await verifyRecoveryController({ env: f.env, root: f.root });
  await writeFile(path.join(f.root, 'package.json'), '{"changedController":true}');
  await assert.rejects(verifyRecoveryController({ env: f.env, root: f.root }), /implementation_changed/);
  let called = false; await assert.rejects(verifyRecoveryController({ env: { ...f.env, GITHUB_REF: 'refs/heads/unapproved' }, root: f.root, verify: async () => { called = true; } }), /acceptance_context_required/); assert.equal(called, false);
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
    const dependencies={socialState:{inspect:async()=>({paused:true,lease:null,records:{}})},vercel:async endpoint=>endpoint.startsWith('/v9/')?{id:TARGET.project,accountId:TARGET.team,name:'https-github-com-satnam-satoshi-satoshi-langar'}:{id:input.plan.previousDeployment,projectId:TARGET.project,ownerId:TARGET.team,team:{id:TARGET.team},target:'production',readyState:'READY',url:'accepted.vercel.app'},verifySource:async()=>{},verifyPublic:async()=>{},save:async()=>{},preallocate:async count=>Array.from({length:count},(_,n)=>'known_id_'+n),evidenceProvider:()=>({apply:async context=>writeFile(input.effect,JSON.stringify(context)),readback:async()=>{throw Error('must not reach confirmation');}}),crashBoundary:()=>process.kill(process.pid,'SIGKILL')};
    await runStageAcceptance({...input,state,dependencies,crashAfter:'first-effect'});
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, JSON.stringify(input)], { encoding: 'utf8' });
  assert.equal(result.signal, 'SIGKILL', result.stderr); const record = JSON.parse(await readFile(ledger, 'utf8')).value;
  const applied = JSON.parse(await readFile(effect, 'utf8')); assert.equal(record.intents[applied.operationId].status, 'uncertain'); assert.equal(record.receipts[applied.operationId], undefined); assert.ok(record.lease); assert.ok(Object.values(record.intents).some(intent => intent.payload.kind === 'vercel-stage' && intent.status === 'pending'));
});

function linkedFixture() {
  const token = 'fixture-project-token-only', bypass = 'fixture-existing-bypass-only';
  const deployment = { id: 'dpl_Previous', projectId: TARGET.project, ownerId: TARGET.team, team: { id: TARGET.team, slug: TARGET.scope }, readyState: 'READY', target: 'production', url: 'accepted-fixed.vercel.app' };
  const project = { id: TARGET.project, accountId: TARGET.team, name: ACCEPTANCE_PROJECT_NAME, protectionBypass: { [bypass]: { scope: 'automation-bypass' } } };
  const env = { PATH: process.env.PATH, HOME: '/private/fixture-home', LTC_VERCEL_CLI_VERSION: ACCEPTANCE_CLI_VERSION, VERCEL_TOKEN: token, LTC_GOOGLE_REFRESH_TOKEN: 'must-not-be-in-child-env', LTC_BUFFER_API_KEY: 'must-not-be-in-child-env', APP_PRINCIPAL_ENABLED: 'must-not-be-in-child-env', VERCEL_AUTOMATION_BYPASS_SECRET: 'untrusted-inherited-bypass' };
  const html = Buffer.from('previous homepage'), png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0xff]), canonical = Buffer.from('canonical birthday HTML'), alias = 'conversations/specials/litecoin-at-15/1/index.html';
  const manifest = [{ file: 'index.html', sha256: acceptanceHash(html) }, { file: 'images/existing.png', sha256: acceptanceHash(png) }, { file: alias, sha256: acceptanceHash('old archive bytes') }, { file: 'conversations/specials/proof-of-birthday/index.html', sha256: acceptanceHash(canonical) }];
  const calls = [], apiCalls = [], reports = [];
  const vercel = async endpoint => { apiCalls.push(endpoint); assert.ok([`/v13/deployments/${deployment.id}`, `/v9/projects/${TARGET.project}`].includes(endpoint)); return endpoint.startsWith('/v13/') ? deployment : project; };
  const execute = (binary, args, options) => {
    calls.push({ binary, args, options }); if (args[0] === '--version') { assert.equal(options.env.VERCEL_TOKEN, undefined); assert.equal(options.env.VERCEL_AUTOMATION_BYPASS_SECRET, undefined); return ACCEPTANCE_CLI_VERSION; }
    assert.equal(args[0], 'curl'); assert.equal(args.includes('--scope'), false); assert.equal(args.includes('--deployment'), false); assert.equal(args.includes('--trace'), false); assert.equal(args.includes('--location'), false);
    assert.equal(args.includes('--token'), false); assert.ok(!JSON.stringify(args).includes(token)); assert.equal(options.env.VERCEL_TOKEN, token);
    assert.equal(options.env.VERCEL_AUTOMATION_BYPASS_SECRET, bypass);
    for (const field of ['LTC_GOOGLE_REFRESH_TOKEN', 'LTC_BUFFER_API_KEY', 'APP_PRINCIPAL_ENABLED']) assert.equal(options.env[field], undefined);
    assert.ok(!JSON.stringify(args).includes(bypass)); const url = new URL(args[1]); assert.equal(url.origin, 'https://' + deployment.url);
    const route = url.pathname;
    const header = route === '/conversations/specials/litecoin-at-15/1/' ? 'HTTP/2 308\r\nlocation: /conversations/specials/proof-of-birthday/\r\n\r\n' : 'HTTP/2 200\r\ncontent-type: application/octet-stream\r\n\r\n';
    return Buffer.concat([Buffer.from(header), route === '/' ? html : route === '/images/existing.png' ? png : canonical]);
  };
  return { env, token, bypass, deployment, project, manifest, calls, apiCalls, reports, vercel, execute, report: async value => { reports.push(value); } };
}
test('supported linked client reads exactly three existing records in order using full bound URLs and existing env-only bypass', async () => {
  const f = linkedFixture(), client = createAcceptanceLinkedClient({ ...f, directory: '/private/fixture-read' }); await client.verifyVersion();
  await assert.rejects(createAcceptanceLinkedClient({ ...f, directory: '/private/fixture-read', execute: () => '61.1.0' }).verifyVersion(), /pinned_cli_version_mismatch/);
  const records = existingLinkedReadRecords(f.manifest); await client.readProtected(f.deployment, records, f.manifest);
  assert.deepEqual(f.calls.filter(call => call.args[0] === 'curl').map(call => new URL(call.args[1]).pathname), ['/', '/images/existing.png', '/conversations/specials/litecoin-at-15/1/', '/conversations/specials/proof-of-birthday/']);
  assert.deepEqual(f.apiCalls, [`/v13/deployments/${f.deployment.id}`, `/v9/projects/${TARGET.project}`]); assert.deepEqual(f.reports, []);
  assert.equal(f.calls.some(call => call.args[0] === 'deploy'), false);
});
test('project-only auth forbids scope/implicit targeting and bypass credentials never enter auth arguments', () => {
  const token = 'fixture-project-token-only', args = ['deploy', '--prebuilt']; const authenticated = acceptanceProjectScopedAuth(args, token); assert.deepEqual(authenticated, args); assert.notEqual(authenticated, args);
  for (const flag of ['--scope', '--scope=other', '--team', '-S', '--api=https://other.invalid', '--local-config=other', '--trace', '--debug', '--token=other']) assert.throws(() => acceptanceProjectScopedAuth(['curl', 'https://accepted.vercel.app/', flag], token), /acceptance_cli_auth_scope_forbidden/);
  for (const missing of [undefined, '', 'bad token']) assert.throws(() => acceptanceProjectScopedAuth(['curl', 'https://accepted.vercel.app/'], missing), /acceptance_cli_auth_scope_forbidden/);
  assert.throws(() => createAcceptanceLinkedClient({ env: { LTC_VERCEL_CLI_VERSION: '61.1.0' } }), /pinned_cli_version_required/);
});
test('missing/ambiguous existing bypass, changed deployment URL/owner and project name fail without a CLI request or token creation', async () => {
  for (const mutate of [f => { delete f.project.protectionBypass; }, f => { f.project.protectionBypass = {}; }, f => { f.project.protectionBypass['another-existing-bypass'] = { scope: 'automation-bypass' }; }, f => { f.project.name = 'other-project'; }, f => { f.deployment.ownerId = 'team_other'; }, f => { f.deployment.url = 'https://external.invalid/'; }]) {
    const f = linkedFixture(); mutate(f); const client = createAcceptanceLinkedClient({ ...f, directory: '/private/fixture-read' }); await assert.rejects(client.readProtected({ id: 'dpl_Previous' }, existingLinkedReadRecords(f.manifest), f.manifest)); assert.equal(f.calls.length, 0);
  }
  const f = linkedFixture(), client = createAcceptanceLinkedClient({ ...f, directory: '/private/fixture-read' }); await assert.rejects(client.readProtected({ id: 'dpl_Previous', url: 'other.vercel.app' }, existingLinkedReadRecords(f.manifest), f.manifest), /acceptance_protected_read_binding_failed/); assert.equal(f.calls.length, 0);
});
test('safe child failure diagnostics contain only a fixed enum and bounded exit status', async () => {
  const f = linkedFixture(), leak = 'private token stdout stderr argv must never escape';
  const error = Object.assign(Error(leak), { status: 17, stdout: Buffer.from(leak), stderr: Buffer.from(leak), spawnargs: [leak], code: 'PRIVATE_CODE' });
  const client = createAcceptanceLinkedClient({ ...f, directory: '/private/fixture-read', execute: () => { throw error; } });
  await assert.rejects(client.readProtected(f.deployment, existingLinkedReadRecords(f.manifest), f.manifest), /acceptance_cli_failed/);
  assert.deepEqual(f.reports, [{ operation: 'protected-read', category: 'cli-exited', exitStatus: 17 }]); assert.ok(!JSON.stringify(f.reports).includes('private'));
  for (const [code, category] of [['ENOENT', 'cli-unavailable'], ['ETIMEDOUT', 'cli-timeout'], ['ENOBUFS', 'cli-output-limit'], ['PRIVATE', 'cli-execution-failed']]) assert.deepEqual(safeAcceptanceCliDiagnostic({ code, status: null, message: leak }), { category, exitStatus: null });
  assert.equal(safeAcceptanceCliDiagnostic({ status: 999 }).exitStatus, null);
});
test('linked deploy checks exact raw project/name and local link, scrubs credentials and never passes bypass', async t => {
  const f = linkedFixture(), directory = await mkdtemp(path.join(tmpdir(), 'ltc-linked-deploy-')); t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, '.vercel')); await writeFile(path.join(directory, '.vercel/project.json'), JSON.stringify({ projectId: TARGET.project, orgId: TARGET.team, projectName: ACCEPTANCE_PROJECT_NAME })); await writeFile(path.join(directory, 'vercel.json'), '{}');
  let effects = 0; const client = createAcceptanceLinkedClient({ ...f, directory, execute: (binary, args, options) => { effects++; assert.equal(args[0], 'deploy'); assert.equal(args.includes('--scope'), false); assert.equal(args.includes('--token'), false); assert.ok(!JSON.stringify(args).includes(f.token)); assert.equal(options.env.VERCEL_TOKEN, f.token); assert.equal(options.env.VERCEL_AUTOMATION_BYPASS_SECRET, undefined); assert.equal(options.env.LTC_GOOGLE_REFRESH_TOKEN, undefined); return Buffer.from('candidate output'); } });
  const args = ['deploy', '--prebuilt', '--prod', '--skip-domain', '--yes']; await client.deploy(args, directory); assert.equal(effects, 1);
  await writeFile(path.join(directory, 'vercel.json'), '{"scope":"implicit-other-team"}'); await assert.rejects(client.deploy(args, directory), /acceptance_cli_auth_scope_forbidden/); assert.equal(effects, 1);
});
test('recovery saves linked existing-read proof before unknown stage readback and does not replay or complete acceptance', async t => {
  const f = await fixture(t), stageId = `accept-${acceptanceHash(f.plan).slice(0, 24)}-stage`; await assert.rejects(runStageAcceptance({ ...f, crashAfter: stageId }), /operation_outcome_uncertain/);
  const saved = []; f.dependencies.save = async value => { saved.push(value); }; f.flags.hideStage = true;
  await assert.rejects(f.recovery(), /operation_outcome_uncertain/);
  assert.equal(saved.at(-1).linkedCliExistingReadVerified, true); assert.equal(saved.at(-1).lease.fence, 1); assert.equal(f.flags.stageCalls, 1);
  const doc = await f.state.inspect(); assert.equal(doc.paused, true); assert.ok(doc.lease); assert.equal(doc.intents[stageId].status, 'uncertain'); assert.equal(doc.acceptance.completion, undefined);
  f.dependencies.verifyLinkedExistingRead = undefined; await assert.rejects(f.recovery(), /acceptance_linked_read_required/); assert.equal(f.flags.stageCalls, 1);
});

test('acceptance diagnostics expose fixed failure codes and redact arbitrary provider details', () => {
  assert.equal(safeAcceptanceFailure(Error('acceptance_public_pointer_changed')), 'acceptance_public_pointer_changed');
  assert.equal(safeAcceptanceFailure(Error('deployed_artifact_mismatch')), 'deployed_artifact_mismatch');
  assert.equal(safeAcceptanceFailure(Error('http_403')), 'http_403');
  assert.equal(safeAcceptanceFailure(Error('Bearer private-token account@example.invalid')), 'release_failed_details_withheld');
  assert.equal(safeAcceptanceFailure(Error('acceptance_private_secret_value')), 'release_failed_details_withheld');
});

async function quarantinedFixture(t){
 const f=await fixture(t);const quarantine=buildOwnerQuarantinedSetupTransition(setupQuarantineFixture());
 const snapshot=await f.state.adapter.read('website');await f.state.adapter.conditionalWrite('website',quarantine.nextDocument,snapshot.version);
 f.plan.setupIncidentSha256=quarantine.incidentSha256;f.env.LTC_SETUP_INCIDENT_SHA256=quarantine.incidentSha256;f.env.LTC_ACCEPTANCE_PLAN_SHA256=acceptanceHash(f.plan);
 return {...f,quarantine};
}
test('legacy plan remains hash-identical and incident-free stage needs no new pin',async t=>{
 const f=await fixture(t);const before=acceptanceHash(f.plan);assert.equal(Object.hasOwn(f.plan,'setupIncidentSha256'),false);
 await runStageAcceptance(f);assert.equal(acceptanceHash(f.plan),before);assert.equal(Object.hasOwn((await f.state.inspect()).acceptance,'setupIncidentSha256'),false);
});
test('quarantined new stage preserves exact pinned incident through admission, effects and completion',async t=>{
 const f=await quarantinedFixture(t);const oldHash=f.quarantine.incidentSha256;const result=await runStageAcceptance(f);assert.equal(result.status,'stage-verified');
 const doc=await f.state.inspect();assert.equal(doc.fence,3);assert.equal(doc.acceptance.setupIncidentSha256,oldHash);assert.equal(doc.unresolvedSetupIncident.incidentSha256,oldHash);assert.equal(doc.retiredSetupIncidents[oldHash].unknownStage.status,'uncertain');assert.equal(doc.paused,true);assert.equal(doc.lease,null);
});
test('absent/wrong incident pin or unbound new plan fails before upload/deploy',async t=>{
 for(const mode of ['missing','wrong','planmissing']){const f=await quarantinedFixture(t);if(mode==='missing')delete f.env.LTC_SETUP_INCIDENT_SHA256;else if(mode==='wrong')f.env.LTC_SETUP_INCIDENT_SHA256='f'.repeat(64);else{delete f.plan.setupIncidentSha256;f.env.LTC_ACCEPTANCE_PLAN_SHA256=acceptanceHash(f.plan)}
 await assert.rejects(runStageAcceptance(f),/setup_incident/);assert.equal(f.flags.uploadCalls,0);assert.equal(f.flags.stageCalls,0);}
});
test('incident cannot disappear between admission and first provider effect',async t=>{
 const f=await quarantinedFixture(t);const preallocate=f.dependencies.preallocate;
 f.dependencies.preallocate=async count=>{const snapshot=await f.state.adapter.read('website');delete snapshot.value.unresolvedSetupIncident;await f.state.adapter.conditionalWrite('website',snapshot.value,snapshot.version);return preallocate(count)};
 await assert.rejects(runStageAcceptance(f),/setup_incident/);assert.equal(f.flags.uploadCalls,0);assert.equal(f.flags.stageCalls,0);
});
test('quarantine CLI is no-build exact-fence review-only mode; artifact/deploy arguments rejected',()=>{
 const base=['--mode','quarantine','--state-config','/private/website','--social-state-config','/private/social','--evidence-config','/private/evidence','--receipt','/private/receipt','--review-file','/private/review','--previous-manifest','/private/previous','--expected-fence','1'];
 assert.equal(acceptanceArgumentsFor(base).mode,'quarantine');
 for(const pair of [['--root','/source'],['--evidence-dir','/artifact'],['--plan','/new-plan'],['--crash-after','stage-effect']])assert.throws(()=>acceptanceArgumentsFor([...base,...pair]),/invalid_acceptance_arguments/);
 assert.throws(()=>acceptanceArgumentsFor(base.filter((_,i)=>i<12||i>13)),/invalid_acceptance_arguments/);
});
test('quarantine source guard and readonly dispatch precede private config/linked provider creation',async()=>{
 const source=await readFile(new URL('./cloud-ltc-acceptance.mjs',import.meta.url),'utf8');
 const dispatch=source.indexOf("if(options.mode==='quarantine')");assert.ok(dispatch>0);
 assert.ok(source.indexOf("if (['recover','quarantine'].includes(options.mode)) await verifyRecoveryController")<source.indexOf('const stateConfig = await json'));
 assert.ok(source.indexOf("if (!['recover','quarantine'].includes(options.mode)) prepared")>0);
 const branch=source.slice(dispatch,source.indexOf('}else{',dispatch));assert.ok(branch.includes('applyOwnerSetupQuarantine'));assert.ok(!/createAcceptanceLinkedClient|preallocateEvidenceIds|createDriveEvidenceProvider|downloadEvidence|linked\./.test(branch));
});
test('new plan preparation pins optional incident explicitly without changing legacy preparation shape',async t=>{
 const f=await fixture(t);const options={...f,acceptanceId:f.plan.acceptanceId,editionId:f.plan.editionId,previousDeployment:f.plan.previousDeployment,implementationSha256:f.plan.implementationSha256};
 const legacy=await prepareStageAcceptance(options);assert.equal(Object.hasOwn(legacy.plan,'setupIncidentSha256'),false);
 const pinned=await prepareStageAcceptance({...options,setupIncidentSha256:'a'.repeat(64)});assert.equal(pinned.plan.setupIncidentSha256,'a'.repeat(64));
 const stripped={...pinned.plan};delete stripped.setupIncidentSha256;assert.deepEqual(stripped,legacy.plan);
 await assert.rejects(prepareStageAcceptance({...options,setupIncidentSha256:'wrong'}),/setup_incident/);
});
test('new quarantined-stage crash recovery retains incident binding and never repeats stage',async t=>{
 const f=await quarantinedFixture(t);const stageId=`accept-${acceptanceHash(f.plan).slice(0,24)}-stage`;
 await assert.rejects(runStageAcceptance({...f,crashAfter:stageId}),/operation_outcome_uncertain/);assert.equal(f.flags.stageCalls,1);
 const originalHash=acceptanceHash(f.plan);const result=await f.recovery();assert.equal(result.status,'stage-verified');assert.equal(f.flags.stageCalls,1);assert.equal(acceptanceHash(f.plan),originalHash);
 const doc=await f.state.inspect();assert.equal(doc.acceptance.setupIncidentSha256,f.quarantine.incidentSha256);assert.equal(doc.retiredSetupIncidents[f.quarantine.incidentSha256].unknownStage.status,'uncertain');
});

test('known native authentication-flag failure has a fixed category without returning private diagnostics',()=>{
 const diagnostic=safeAcceptanceCliDiagnostic({status:2,stderr:Buffer.from('private-token-private@example.invalid\ncurl: option --token: is unknown')});
 assert.deepEqual(diagnostic,{category:'native-auth-flag-forwarded',exitStatus:2});
 assert.equal(JSON.stringify(diagnostic).includes('private'),false);
});
