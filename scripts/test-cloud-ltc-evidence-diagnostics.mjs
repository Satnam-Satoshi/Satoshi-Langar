import test from'node:test';import assert from'node:assert/strict';import{readFile,mkdtemp,writeFile,rm}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
import{packageEvidence,createDriveEvidenceProvider,safeEvidenceDiagnostic}from'./cloud-ltc-evidence.mjs';import{DurableCloudState,MemoryStateAdapter}from'./cloud-ltc-state.mjs';import{ReleaseOperationCoordinator}from'./cloud-ltc-operations.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function fixture(mode){const config={folderId:'fixture_folder_123',fileId:'fixture_file_123',ownerPermissionId:'fixture_owner_123'},bundle=packageEvidence([{path:'fixture.json',bytes:Buffer.from('safe fixture')}]),payload={kind:'drive-evidence',fileId:config.fileId,folderId:config.folderId,sha256:bundle.sha256,bytes:bundle.length},context={operationId:'fixture-upload',payload,payloadSha256:hash(payload)},diagnostics=[],waits=[];let post=0,stored=false,metadataReads=0;
 const opts={bundle,config,getAccessToken:async()=>{if(mode==='token')throw Error('PRIVATE_TOKEN authorization body');return 'synthetic-token';},timeoutMs:mode==='timeout'?5:5000,readbackWait:async ms=>waits.push(ms),onDiagnostic:d=>diagnostics.push(d),fetcher:async(url,o)=>{
  const u=new URL(url);assert.equal(u.origin,'https://www.googleapis.com');assert.equal(o.redirect,'error');
  if(mode==='preflight')throw Error('PRIVATE_TOKEN https://private.invalid/body');
  if(u.pathname.endsWith('/'+config.folderId))return Response.json({id:config.folderId,mimeType:'application/vnd.google-apps.folder',ownedByMe:true,trashed:false});
  if(u.pathname.endsWith('/permissions'))return Response.json({permissions:[{id:config.ownerPermissionId,type:'user',role:'owner'},...(mode==='wrong-owner'&&stored?[{id:'another',type:'anyone',role:'reader'}]:[])]});
  if(o.method==='POST'){post++;if(mode==='timeout')return new Promise(()=>{});if(mode==='http')return new Response('PRIVATE_TOKEN HTTP body',{status:429});if(mode==='missing')throw Error('PRIVATE_TOKEN transport error');stored=true;if(['lost','lag','wrong-owner','wrong-hash','wrong-parent'].includes(mode))throw Error('PRIVATE_TOKEN lost create acknowledgement');return Response.json({id:config.fileId});}
  if(u.pathname.endsWith('/'+config.fileId)){if(!stored)return new Response(null,{status:404});if(u.searchParams.get('alt')==='media'){if(mode==='media')throw Error('PRIVATE_TOKEN media URL');return new Response(bundle.bytes);}metadataReads++;if(mode==='lag'&&metadataReads<3)return new Response(null,{status:404});return Response.json({id:config.fileId,name:'ltc-evidence-'+bundle.sha256+'.json',mimeType:'application/json',ownedByMe:true,trashed:false,parents:[mode==='wrong-parent'?'different-folder':config.folderId],size:String(bundle.length),appProperties:{sha256:mode==='wrong-hash'?'0'.repeat(64):bundle.sha256,operationId:context.operationId,payloadSha256:context.payloadSha256}});}
  assert.fail('unexpected fixed fixture route');
 }};return{provider:createDriveEvidenceProvider(opts),payload,context,diagnostics,waits,posts:()=>post,metadataReads:()=>metadataReads};}
test('network/token preflight failures report fixed phase and no attempted upload',async()=>{for(const mode of['preflight','token']){const f=fixture(mode);await assert.rejects(f.provider.apply(f.context));assert.equal(f.posts(),0);assert.deepEqual(f.diagnostics,[{provider:'drive-evidence',phase:'folder-metadata',reason:mode==='token'?'authorization':'transport',httpStatus:null,timedOut:false,postAttempted:false}]);assert(!JSON.stringify(f.diagnostics).includes('PRIVATE_TOKEN'));}});
test('bounded transient retries and non-retryable HTTP failures remain UNKNOWN without resumed replay',async()=>{for(const mode of['missing','http','timeout']){const f=fixture(mode),state=new DurableCloudState(new MemoryStateAdapter(),'website');await state.setPaused(false);const lease=await state.acquire('fixture-run',60000),run=new ReleaseOperationCoordinator({state,lease});await assert.rejects(run.execute({operationId:f.context.operationId,payload:f.payload,provider:f.provider}),/operation_outcome_uncertain/);assert.equal(f.posts(),mode==='http'?1:3);assert.deepEqual(f.waits,mode==='http'?[1000,1000]:[1000,1000,1000,1000,1000,2000,1000,1000]);assert.equal((await state.inspect()).intents[f.context.operationId].status,'uncertain');const d=f.diagnostics[0];assert.equal(d.phase,'upload-post');assert.equal(d.postAttempted,true);assert.equal(d.reason,mode==='http'?'http-status':mode==='timeout'?'timeout':'transport');assert.equal(d.httpStatus,mode==='http'?429:null);assert.equal(d.timedOut,mode==='timeout');assert(!JSON.stringify(d).includes('PRIVATE_TOKEN'));await assert.rejects(run.execute({operationId:f.context.operationId,payload:f.payload,provider:f.provider}),/operation_reconciliation_required/);assert.equal(f.posts(),mode==='http'?1:3);}});
test('lost upload acknowledgement accepts only complete same-ID owner/hash proof; wrong ownership stays UNKNOWN without another POST',async()=>{const good=fixture('lost');assert.equal((await good.provider.apply(good.context)).status,'applied');assert.equal(good.posts(),1);assert.equal(good.waits.length,0);for(const mode of['wrong-owner','wrong-hash','wrong-parent']){const bad=fixture(mode);await assert.rejects(bad.provider.apply(bad.context),/outcome_unknown/);assert.equal(bad.posts(),1);assert.equal(bad.waits.length,0);assert.equal((await bad.provider.readback(bad.context)).status,'unknown');assert.equal(bad.posts(),1);}const late=fixture('lag');assert.equal((await late.provider.apply(late.context)).status,'applied');assert.equal(late.posts(),1);assert.deepEqual(late.waits,[1000,1000]);});
test('successful create followed by media readback failure reports readback phase and still issues only one POST',async()=>{const f=fixture('media');await assert.rejects(f.provider.apply(f.context));assert.equal(f.posts(),1);assert.equal(f.diagnostics[0].phase,'readback-media');assert.equal(f.diagnostics[0].postAttempted,true);assert.equal(f.diagnostics[0].reason,'transport');});
test('safe diagnostic projection drops unknown phases/reasons/statuses and every injected secret field',()=>{assert.deepEqual(safeEvidenceDiagnostic({phase:'PRIVATE_TOKEN',reason:'https://private.invalid',httpStatus:'secret',timedOut:'secret',postAttempted:'secret',error:'PRIVATE_TOKEN'}),{provider:'drive-evidence',phase:'unknown',reason:'unknown',httpStatus:null,timedOut:false,postAttempted:false});});
test('actual sanitized GitHub result block retains only safe evidence fields from a poisoned private receipt',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'ltc-safe-diagnostic-'));try{const workflow=await readFile(new URL('../ops/ltc-daily-workflow.yml',import.meta.url),'utf8'),section=workflow.split('- name: Sanitized result only')[1].split('\n  acceptance-probe:')[0],code=section.split("<<'NODE'\n")[1].split('\n          NODE')[0].replace(/^          /gm,'');assert(!code.includes('import('),'Always-run summary must not execute repository code after a withheld guard');await writeFile(path.join(dir,'ltc-receipt.json'),JSON.stringify({status:'failed',providerFailure:{phase:'upload-post',reason:'http-status',httpStatus:403,timedOut:false,postAttempted:true,raw:'PRIVATE_TOKEN body'}}));execFileSync(process.execPath,['--input-type=module','-e',"globalThis.fetch=()=>{throw Error('NO NETWORK')};\n"+code],{cwd:process.cwd(),env:{...process.env,RUNNER_TEMP:dir,GITHUB_STEP_SUMMARY:path.join(dir,'summary.md')},stdio:'pipe'});const text=await readFile(path.join(dir,'summary.md'),'utf8');assert(text.includes('"httpStatus": 403'));assert(text.includes('"postAttempted": true'));assert(!text.includes('PRIVATE_TOKEN'));assert(!text.includes('"raw"'));}finally{await rm(dir,{recursive:true,force:true});}});


async function retryFixture({first=502,second=200,hidden=false,mismatch,stop}={}) {
 const config={folderId:'retry_folder_123',fileId:'retry_file_123',ownerPermissionId:'retry_owner_123'};
 const bundle=packageEvidence([{path:'test.json',bytes:Buffer.from('identical private fixture')}]);
 const payload={kind:'drive-evidence',fileId:config.fileId,folderId:config.folderId,sha256:bundle.sha256,bytes:bundle.length};
 let now=1000,posts=0,stored=false,reads=0,tokens=0;const bodies=[],waits=[],diagnostics=[];
 const adapter=new MemoryStateAdapter(),state=new DurableCloudState(adapter,'website',{clock:()=>now});await state.setPaused(false);
 const lease=await state.acquire('same-id-run',60000),coordinator=new ReleaseOperationCoordinator({state,lease});
 const operationId='same-id-upload';
 const options={bundle,config,timeoutMs:25,getAccessToken:async()=>{tokens++;if(stop==='token-expiry'&&tokens===4)now=999999;return 'fixture-token';},onDiagnostic:d=>diagnostics.push(d),readbackWait:async ms=>{
  waits.push(ms);if(!stop)return;
  if(stop==='pause')await state.setPaused(true);
  else if(stop==='expiry')now=999999;
  else {const {value,version}=await adapter.read('website');if(stop==='fence')value.lease.fence++;if(stop==='fence')value.fence++;if(stop==='hold')value.restoreHold=true;if(stop==='payload'){value.intents[operationId].payload.bytes++;value.intents[operationId].payloadSha256=hash(value.intents[operationId].payload);}await adapter.conditionalWrite('website',value,version);}
 },fetcher:async(url,o)=>{
  const u=new URL(url);assert.equal(u.origin,'https://www.googleapis.com');assert.equal(o.redirect,'error');
  if(u.pathname.endsWith('/'+config.folderId))return Response.json({id:config.folderId,mimeType:'application/vnd.google-apps.folder',ownedByMe:true,trashed:false});
  if(u.pathname.endsWith('/permissions'))return Response.json({permissions:[{id:config.ownerPermissionId,type:'user',role:'owner'},...(mismatch==='owner'&&stored&&u.pathname.includes(config.fileId)?[{id:'public',type:'anyone',role:'reader'}]:[])]});
  if(o.method==='POST'){
   posts++;bodies.push(Buffer.from(o.body));const raw=Buffer.from(o.body).toString();assert(raw.includes('"id":"'+config.fileId+'"'));
   const status=posts===1?first:second;
   if(status===200||hidden)stored=true;
   if(status==='timeout')return new Promise(()=>{});
   if(status==='transport')throw Error('PRIVATE_TOKEN lost acknowledgement');
   return Response.json({id:config.fileId},{status});
  }
  if(u.pathname.endsWith('/'+config.fileId)){
   if(!stored||(hidden&&posts===1)||second===409&&mismatch==='missing')return new Response(null,{status:404});
   if(u.searchParams.get('alt')==='media')return new Response(mismatch==='bytes'?Buffer.from('corrupt'):bundle.bytes);
   reads++;
   return Response.json({id:config.fileId,name:'ltc-evidence-'+bundle.sha256+'.json',mimeType:'application/json',ownedByMe:true,trashed:false,size:String(bundle.length),parents:[mismatch==='parent'?'wrong_parent':config.folderId],appProperties:{sha256:bundle.sha256,operationId:mismatch==='operation'?'wrong-operation':operationId,payloadSha256:hash(payload)}});
  }
  assert.fail('unexpected route');
 }};
 const provider=createDriveEvidenceProvider(options),operation={operationId,payload,provider};
 return {state,coordinator,operation,posts:()=>posts,bodies,waits,diagnostics};
}
test('same-ID transient upload retries use identical bytes and verify full private content before confirmation',async()=>{
 for(const first of [500,502,503,504,'transport','timeout']){
  const f=await retryFixture({first});assert.equal((await f.coordinator.execute(f.operation)).status,'confirmed');assert.equal(f.posts(),2);assert(f.bodies[0].equals(f.bodies[1]));
  assert.equal((await f.coordinator.execute(f.operation)).appliedNow,false);assert.equal(f.posts(),2);
 }
});
test('same-ID 409 is accepted only after exact owner, parent, operation and downloaded bytes proof',async()=>{
 const f=await retryFixture({hidden:true,second:409});assert.equal((await f.coordinator.execute(f.operation)).status,'confirmed');assert.equal(f.posts(),2);assert(f.bodies[0].equals(f.bodies[1]));
 for(const mismatch of ['missing','owner','parent','operation','bytes']){
  const bad=await retryFixture({hidden:true,second:409,mismatch});await assert.rejects(bad.coordinator.execute(bad.operation),/operation_outcome_uncertain/);assert.equal(bad.posts(),2);assert.equal((await bad.state.inspect()).intents[bad.operation.operationId].status,'uncertain');
  await assert.rejects(bad.coordinator.execute(bad.operation),/operation_reconciliation_required/);assert.equal(bad.posts(),2);
 }
});
test('retry budget exhausted preserves UNKNOWN; non-transient HTTP status never authorizes another POST',async()=>{
 const f=await retryFixture({second:502});await assert.rejects(f.coordinator.execute(f.operation),/operation_outcome_uncertain/);assert.equal(f.posts(),3);assert(f.bodies.every(b=>b.equals(f.bodies[0])));assert.equal((await f.state.inspect()).intents[f.operation.operationId].status,'uncertain');
 for(const first of [400,401,403,404,409,429]){const bad=await retryFixture({first});await assert.rejects(bad.coordinator.execute(bad.operation),/operation_outcome_uncertain/);assert.equal(bad.posts(),1);}
});
test('pause, hold, expired lease, changed fence and changed intent prohibit the repeated POST',async()=>{
 for(const stop of ['pause','hold','expiry','fence','payload']){const f=await retryFixture({stop});await assert.rejects(f.coordinator.execute(f.operation),/operation_outcome_uncertain/);assert.equal(f.posts(),1);assert.equal((await f.state.inspect()).intents[f.operation.operationId].status,'uncertain');}
});

test('lease expiry during initial upload token resolution prevents the first POST',async()=>{const f=await retryFixture({stop:'token-expiry'});await assert.rejects(f.coordinator.execute(f.operation),/operation_outcome_uncertain/);assert.equal(f.posts(),0);assert.equal((await f.state.inspect()).intents[f.operation.operationId].status,'uncertain');});
