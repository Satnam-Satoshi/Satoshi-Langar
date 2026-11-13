import test from 'node:test';
import { createAcceptanceLinkedClient, ACCEPTANCE_PROJECT_NAME, ACCEPTANCE_CLI_VERSION } from './cloud-ltc-acceptance.mjs';
import assert from 'node:assert/strict';
import { createDurableVercelCommand, createControlledVercelMutation, createPortableDeploymentWorkspace } from './cloud-ltc-promotion-runtime.mjs';
import { TARGET, readReviewedMigrationConfiguration, assertMigrationAcceptance, builtManifest, builtOutputManifest } from './cloud-ltc-release.mjs';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

async function portableFixture() {
 const directory=await mkdtemp(path.join(tmpdir(),'ltc-portable-artifact-')),sourceRoot=path.join(directory,'source'),destination=path.join(directory,'portable');
 await mkdir(path.join(sourceRoot,'.git'),{recursive:true});
 for(const [file,bytes]of [['vercel.json','{"framework":null}'],['.env','private-input-never-copied'],['package.json','{"name":"source-never-copied"}'],['.vercel/output/config.json','{"version":3}'],['.vercel/output/static/index.html','exact html'],['.vercel/output/functions/api.func/.vc-config.json','{}'],['.vercel/output/functions/api.func/worker.js','exact function']]){const target=path.join(sourceRoot,file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);}
 const buildOutput=await builtOutputManifest(path.join(sourceRoot,'.vercel/output'));
 return{directory,sourceRoot,destination,buildOutput};
}
test('routine stage uses exact gitless portable output with only reviewed config/link and durable attribution',async()=>{
 const f=await portableFixture();try{
  const portable=await createPortableDeploymentWorkspace({...f,directory:f.destination});await portable.verify();
  const records=await builtManifest(portable.root);
  assert.deepEqual(records.map(r=>r.file).sort(),['vercel.json','.vercel/project.json',...f.buildOutput.map(r=>'.vercel/output/'+r.file)].sort());
  assert.equal(await readFile(path.join(portable.root,'.vercel/output/functions/api.func/worker.js'),'utf8'),'exact function');
  const lease={runId:'run',fence:8,expiresAt:Date.now()+60000},payload={kind:'vercel-stage',commit:'a'.repeat(40),buildOutputSha256:portable.buildOutputSha256};
  const intent={runId:'run',fence:8,status:'uncertain',operationId:'op',payload,payloadSha256:hash(payload)};
  let deployed=false;const command=createDurableVercelCommand({env:{},state:{inspect:async()=>({fence:8,lease,paused:false,restoreHold:false,intents:{op:intent}})},lease,root:portable.root,linked:{deploy:async(args,cwd,beforeEffect)=>{await portable.verify();await beforeEffect();assert.equal(cwd,f.destination);assert(args.includes('ltcSourceCommit='+payload.commit));assert(!cwd.startsWith(f.sourceRoot));deployed=true;}}});
  const args=['deploy','--prebuilt','--prod','--skip-domain','--yes','--meta','ltcOperationId=op','--meta','ltcPayloadSha256='+hash(payload),'--meta','ltcSourceCommit='+payload.commit,'--meta','ltcBuildOutputSha256='+payload.buildOutputSha256];
  await command(args);assert.equal(deployed,true);
 }finally{await rm(f.directory,{recursive:true,force:true});}
});
test('unknown files, Git discovery, config/output drift and symlinks invalidate the portable workspace',async()=>{
 for(const change of [f=>writeFile(path.join(f.destination,'extra.txt'),'unknown'),f=>mkdir(path.join(f.destination,'.git')),f=>writeFile(path.join(f.destination,'.vercel/output/static/index.html'),'drift'),f=>writeFile(path.join(f.sourceRoot,'.vercel/output/static/index.html'),'source drift'),f=>writeFile(path.join(f.destination,'vercel.json'),'{}'),f=>symlink('config.json',path.join(f.destination,'.vercel/output/unknown-link'))]){
  const f=await portableFixture();try{const portable=await createPortableDeploymentWorkspace({...f,directory:f.destination});await change(f);await assert.rejects(portable.verify());}finally{await rm(f.directory,{recursive:true,force:true});}
 }
 const f=await portableFixture();try{await writeFile(path.join(f.sourceRoot,'.vercel/output/unknown'),'unreviewed');await assert.rejects(createPortableDeploymentWorkspace({...f,directory:f.destination}));}finally{await rm(f.directory,{recursive:true,force:true});}
});

test('routine stage command requires one uncertain current-fence intent and exact durable metadata',async()=>{
 const lease={runId:'run',fence:8,expiresAt:Date.now()+60000}, payload={kind:'vercel-stage',commit:'a'.repeat(40),buildOutputSha256:'b'.repeat(64)};
 const intent={runId:'run',fence:8,status:'uncertain',operationId:'op',payload,payloadSha256:hash(payload)};
 const document={fence:8,lease,paused:false,restoreHold:false,intents:{op:intent}}, calls=[];
 const command=createDurableVercelCommand({env:{},state:{inspect:async()=>document},lease,root:'/exact',linked:{deploy:async(args,root,beforeEffect)=>{await beforeEffect();calls.push({args,root});}}});
 const args=['deploy','--prebuilt','--prod','--skip-domain','--yes',...Object.entries({ltcOperationId:'op',ltcPayloadSha256:hash(payload),ltcSourceCommit:payload.commit,ltcBuildOutputSha256:payload.buildOutputSha256}).flatMap(([key,value])=>['--meta',key+'='+value])];
 await command(args);assert.equal(calls.length,1);assert.equal(calls[0].root,'/exact');
 for(const change of [()=>intent.status='pending',()=>{intent.status='uncertain';intent.fence=7;},()=>{intent.fence=8;document.paused=true;}]){change();await assert.rejects(command(args));}
 assert.equal(calls.length,1);
});
test('routine alias commands reject historical stage receipts and mismatched deployment identities before POST',async()=>{
 const lease={runId:'run',fence:8,expiresAt:Date.now()+60000}, payload={kind:'vercel-promote',deployment:'dpl_Candidate',previous:'dpl_Previous',commit:'a'.repeat(40)};
 const intent={runId:'run',fence:8,status:'uncertain',payload};
 const stage={runId:'old',fence:7,status:'confirmed',payload:{kind:'vercel-stage',commit:payload.commit},proof:{proof:{deployment:payload.deployment,url:'candidate.vercel.app'}}};
 const document={fence:8,lease,paused:false,restoreHold:false,intents:{intent,stage}}, posts=[];
 const command=createDurableVercelCommand({env:{VERCEL_TOKEN:'private-test-token-only'},state:{inspect:async()=>document},lease,vercel:async()=>({id:payload.deployment,projectId:'wrong',ownerId:TARGET.team,team:{id:TARGET.team},meta:{ltcSourceCommit:payload.commit},url:'candidate.vercel.app'}),fetchImpl:async(...args)=>posts.push(args)});
 await assert.rejects(command(['promote','https://candidate.vercel.app','--yes'])); stage.runId='run';stage.fence=8;
 await assert.rejects(command(['promote','https://candidate.vercel.app','--yes']));assert.equal(posts.length,0);
});
test('mutation denial/network errors reveal no provider body or token and never retry',async()=>{
 for(const failure of ['denied','network']){
  let count=0;const command=createControlledVercelMutation({env:{VERCEL_TOKEN:'private-test-token-only'},review:{stagePins:{candidateDeployment:'dpl_Candidate',previousDeployment:'dpl_Previous'}},fetchImpl:async()=>{count++;if(failure==='network')throw Error('private-body-token');return new Response('private-body-token',{status:403});}});
  await assert.rejects(command(['promote','https://candidate.vercel.app','--yes'],{candidate:'dpl_Candidate',previous:'dpl_Previous',candidateUrl:'candidate.vercel.app'}),error=>error.message==='controlled_vercel_write_uncertain');assert.equal(count,1);
 }
});
test('routine promotion and rollback derive only current stage identity and exact durable targets',async()=>{
 const lease={runId:'run',fence:8,expiresAt:Date.now()+60000}, commit='a'.repeat(40), candidate='dpl_Candidate', previous='dpl_Previous';
 const stage={runId:'run',fence:8,status:'confirmed',payload:{kind:'vercel-stage',commit},proof:{proof:{deployment:candidate,url:'candidate.vercel.app'}}};
 const current={runId:'run',fence:8,status:'uncertain',payload:{kind:'vercel-promote',deployment:candidate,previous,commit}};
 const document={fence:8,lease,paused:false,restoreHold:false,intents:{stage,current}}, posts=[];
 const command=createDurableVercelCommand({env:{VERCEL_TOKEN:'private-test-token-only'},state:{inspect:async()=>document},lease,vercel:async endpoint=>{assert.equal(endpoint,'/v13/deployments/'+candidate);return{id:candidate,projectId:TARGET.project,ownerId:TARGET.team,team:{id:TARGET.team},meta:{ltcSourceCommit:commit},url:'candidate.vercel.app'};},fetchImpl:async(url,options)=>{posts.push({url,options});return new Response(null,{status:204});}});
 await command(['promote','https://candidate.vercel.app','--yes']);
 current.payload={kind:'vercel-rollback',failed:candidate,restore:previous,commit};
 await command(['rollback',previous,'--non-interactive']);
 assert(posts[0].url.includes('/promote/'+candidate));assert(posts[1].url.includes('/rollback/'+previous));
 for(const post of posts){assert.equal(post.options.redirect,'error');assert.equal(post.options.method,'POST');assert.equal(post.options.body,'{}');assert.equal(post.options.headers.Authorization,'Bearer private-test-token-only');}
 await assert.rejects(command(['rollback','dpl_Other','--non-interactive']));assert.equal(posts.length,2);
});
test('routine gate stays closed without separately protected configuration and exact canonical hash',()=>{
 assert.throws(()=>assertMigrationAcceptance(),/migration_acceptance_pending/);assert.equal(readReviewedMigrationConfiguration({}),null);
 for(const env of [{LTC_MIGRATION_ACCEPTANCE_JSON:'{}'},{LTC_MIGRATION_ACCEPTANCE_JSON:'{}',LTC_MIGRATION_ACCEPTANCE_SHA256:'a'.repeat(64)}])assert.throws(()=>readReviewedMigrationConfiguration(env));
 const config={schemaVersion:1};assert.deepEqual(readReviewedMigrationConfiguration({LTC_MIGRATION_ACCEPTANCE_JSON:JSON.stringify(config),LTC_MIGRATION_ACCEPTANCE_SHA256:hash(config)}),config);
});

function mutationFixture(kind = 'promote', hooks = {}) {
 let now = Date.parse('2026-11-12T16:00:00Z');
 const lease = { runId: 'run', fence: 8, expiresAt: now + 60_000 };
 const commit = 'a'.repeat(40), candidate = 'dpl_Candidate', previous = 'dpl_Previous';
 const stage = { runId: 'run', fence: 8, status: 'confirmed', payload: { kind: 'vercel-stage', commit }, proof: { proof: { deployment: candidate, url: 'candidate.vercel.app' } } };
 const payload = kind === 'promote' ? { kind: 'vercel-promote', deployment: candidate, previous, commit } : { kind: 'vercel-rollback', failed: candidate, restore: previous, commit };
 const current = { runId: 'run', fence: 8, status: 'uncertain', payload };
 const document = { fence: 8, lease, paused: false, restoreHold: false, intents: { stage, current } };
 let reads = 0, gets = 0, posts = 0;
 const command = createDurableVercelCommand({ env: { VERCEL_TOKEN: 'private-test-token-only' }, lease,
  state: { clock: () => now, inspect: async () => { reads++; await hooks.inspect?.(document, reads); return document; } },
  vercel: async () => { gets++; await hooks.get?.(document); return { id: candidate, projectId: TARGET.project, ownerId: TARGET.team, team: { id: TARGET.team }, meta: { ltcSourceCommit: commit }, url: 'candidate.vercel.app' }; },
  verifyPromotionFreshness: hooks.freshness ? async () => hooks.freshness(document) : undefined,
  assertPromotionFreshness: hooks.assertFreshness,
  fetchImpl: async () => { posts++; return new Response(null, { status: 204 }); },
 });
 return { document, command: () => command(kind === 'promote' ? ['promote', 'https://candidate.vercel.app', '--yes'] : ['rollback', previous, '--non-interactive']), setNow: value => { now = value; }, counts: () => ({ reads, gets, posts }) };
}
for (const kind of ['promote', 'rollback']) {
 test(`${kind}: initially expired lease or emergency hold prevents even provider lookup`, async () => {
  for (const mutate of [d => { d.fence++; }, d => { d.lease.expiresAt = 0; }, d => { delete d.lease.expiresAt; }, d => { d.paused = true; }, d => { d.restoreHold = true; }]) {
   const f = mutationFixture(kind); mutate(f.document); await assert.rejects(f.command, /controlled_vercel_scope_mismatch/); assert.equal(f.counts().gets, 0); assert.equal(f.counts().posts, 0);
  }
 });
 test(`${kind}: every ownership/hold/intent/stage race during provider read blocks the single POST`, async () => {
  for (const mutate of [d => { d.fence++; }, d => { d.lease.expiresAt = 0; }, d => { d.lease.fence++; }, d => { d.lease.runId = 'other'; }, d => { d.paused = true; }, d => { d.restoreHold = true; }, d => { d.intents.current.status = 'pending'; }, d => { d.intents.current.payload.commit = 'b'.repeat(40); }, d => { d.intents.other = structuredClone(d.intents.current); }, d => { d.intents.stage.status = 'uncertain'; }, d => { d.intents.stage.proof.proof.url = 'other.vercel.app'; }]) {
   const f = mutationFixture(kind, { get: mutate }); await assert.rejects(f.command, /controlled_vercel_scope_mismatch/); assert.equal(f.counts().posts, 0);
  }
 });
 test(`${kind}: expiry and daily midnight during the final state read are fenced`, async () => {
  for (const daily of [false, true]) {
   let f; const midnight = Date.parse('2026-11-13T05:00:00Z');
   f = mutationFixture(kind, { inspect: (d, count) => { if (count === 2) f.setNow(daily ? midnight : d.lease.expiresAt); } });
   if (daily) { f.setNow(midnight - 1000); f.document.lease.expiresAt = midnight + 60_000; f.document.lease.publicationDate = '2026-11-12'; }
   await assert.rejects(f.command, daily ? /publication_date_changed/ : /controlled_vercel_scope_mismatch/); assert.equal(f.counts().posts, 0);
  }
 });
}
test('promotion rechecks synchronous review expiry after the final awaited state read', async () => {
 let f; const expiry = Date.parse('2026-11-12T16:00:01Z');
 f = mutationFixture('promote', { inspect: (_d, count) => { if (count === 2) f.setNow(expiry); }, assertFreshness: (_d, now) => { assert(now < expiry, 'review expired'); } });
 await assert.rejects(f.command, /review expired/); assert.equal(f.counts().posts, 0);
});
test('promotion hold during async freshness is blocked; unchanged promotion and rollback each POST once', async () => {
 const held = mutationFixture('promote', { freshness: d => { d.restoreHold = true; } }); await assert.rejects(held.command, /controlled_vercel_scope_mismatch/); assert.equal(held.counts().posts, 0);
 for (const kind of ['promote', 'rollback']) {
  let assertions = 0; const f = mutationFixture(kind, { assertFreshness: () => { assertions++; } });
  await f.command(); assert.equal(f.counts().posts, 1); assert.equal(assertions, kind === 'promote' ? 1 : 0);
 }
});
test('rollback does not require an unexpired first-promotion review, but still requires live lease', async () => {
 const f = mutationFixture('rollback', { assertFreshness: () => { throw Error('review expired'); } }); await f.command(); assert.equal(f.counts().posts, 1);
 f.document.lease.expiresAt = 0; await assert.rejects(f.command, /controlled_vercel_scope_mismatch/); assert.equal(f.counts().posts, 1);
});

test('stage final guard reaches real linked client after project lookup and prevents expired/held/rebound CLI effect', async t => {
 const directory = await mkdtemp(path.join(tmpdir(), 'ltc-stage-final-')); t.after(() => rm(directory, { recursive: true, force: true }));
 await mkdir(path.join(directory, '.vercel')); await writeFile(path.join(directory, '.vercel/project.json'), JSON.stringify({ projectId: TARGET.project, orgId: TARGET.team, projectName: ACCEPTANCE_PROJECT_NAME })); await writeFile(path.join(directory, 'vercel.json'), '{}');
 for (const change of [null, d => { d.lease.expiresAt = 0; }, d => { d.restoreHold = true; }, d => { d.paused = true; }, d => { d.intents.op.status = 'pending'; }, d => { d.lease.fence++; }]) {
  const now = Date.parse('2026-11-12T16:00:00Z'), lease = { runId: 'run', fence: 8, expiresAt: now + 60_000 };
  const payload = { kind: 'vercel-stage', commit: 'a'.repeat(40), buildOutputSha256: 'b'.repeat(64) };
  const intent = { runId: 'run', fence: 8, status: 'uncertain', operationId: 'op', payload, payloadSha256: hash(payload) };
  const document = { fence: 8, lease, paused: false, restoreHold: false, intents: { op: intent } };
  const env = { LTC_VERCEL_CLI_VERSION: ACCEPTANCE_CLI_VERSION, VERCEL_TOKEN: 'private-test-token-only' }; let effects = 0;
  const vercel = async () => { change?.(document); return { id: TARGET.project, accountId: TARGET.team, name: ACCEPTANCE_PROJECT_NAME }; };
  const linked = createAcceptanceLinkedClient({ env, directory, vercel, execute: () => { effects++; return Buffer.from('test'); } });
  const command = createDurableVercelCommand({ env, state: { inspect: async () => document, clock: () => now }, lease, linked, root: directory });
  const args = ['deploy', '--prebuilt', '--prod', '--skip-domain', '--yes', ...Object.entries({ ltcOperationId: 'op', ltcPayloadSha256: hash(payload), ltcSourceCommit: payload.commit, ltcBuildOutputSha256: payload.buildOutputSha256 }).flatMap(([key, value]) => ['--meta', key + '=' + value])];
  if (change) { await assert.rejects(command(args), /controlled_vercel_scope_mismatch/); assert.equal(effects, 0); }
  else { await command(args); assert.equal(effects, 1); }
 }
});

test('historical stage is allowed only by exact stored software recovery claim, never by ordinary routine scope', async () => {
 for (const fault of ['', 'missing-claim', 'changed-binding', 'stage-drift', 'claim-race']) {
  const lease = { runId: 'software-recovery-900002-1', fence: 8, expiresAt: Date.now() + 60000 }, commit = 'a'.repeat(40);
  const stage = { runId: 'software-900001-1', fence: 7, status: 'confirmed', payload: { kind: 'vercel-stage', commit }, proof: { proof: { deployment: 'dpl_Candidate', url: 'candidate.vercel.app' } } };
  const binding = { operationId: 'old-stage', intentSha256: hash(stage), reviewSha256: 'c'.repeat(64) };
  const document = { fence: 8, lease, paused: false, restoreHold: false, intents: { 'old-stage': stage, current: { runId: lease.runId, fence: 8, status: 'uncertain', payload: { kind: 'vercel-promote', deployment: 'dpl_Candidate', previous: 'dpl_Previous', commit } } }, softwareStageRecovery: { status: 'claimed', owner: { runId: lease.runId, fence: 8 }, stageBinding: structuredClone(binding), reviewSha256: binding.reviewSha256 } };
  if (fault === 'missing-claim') delete document.softwareStageRecovery;
  if (fault === 'changed-binding') document.softwareStageRecovery.stageBinding.intentSha256 = '0'.repeat(64);
  if (fault === 'stage-drift') stage.proof.proof.url = 'other.vercel.app';
  let posts = 0;
  const options = { env: { VERCEL_TOKEN: 'private-fixture-token' }, state: { inspect: async () => document }, lease, historicalStage: binding,
   vercel: async () => { if (fault === 'claim-race') document.softwareStageRecovery.extra = 'changed'; return { id: 'dpl_Candidate', projectId: TARGET.project, ownerId: TARGET.team, team: { id: TARGET.team }, meta: { ltcSourceCommit: commit }, url: 'candidate.vercel.app' }; },
   fetchImpl: async () => { posts++; return new Response(null, { status: 204 }); } };
  const command = createDurableVercelCommand(options), args = ['promote', 'https://candidate.vercel.app', '--yes'];
  if (fault) { await assert.rejects(command(args), /controlled_vercel_scope_mismatch/); assert.equal(posts, 0); }
  else { await command(args); assert.equal(posts, 1); await assert.rejects(createDurableVercelCommand({ ...options, historicalStage: undefined })(args), /controlled_vercel_scope_mismatch/); assert.equal(posts, 1); }
 }
});
