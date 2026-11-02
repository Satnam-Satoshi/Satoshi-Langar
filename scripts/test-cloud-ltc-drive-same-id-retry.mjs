import test from'node:test';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{packageEvidence,createDriveEvidenceProvider}from'./cloud-ltc-evidence.mjs';import{DurableCloudState,MemoryStateAdapter}from'./cloud-ltc-state.mjs';import{ReleaseOperationCoordinator}from'./cloud-ltc-operations.mjs';import{createEvidenceAttemptGuard}from'./cloud-ltc-production.mjs';
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
async function fixture(actions,{hook=true,readFailure=null}={}){
 let now=Date.parse('2030-01-01T12:00:00Z'),remote=null,remoteBytes=null,mediaErrors=readFailure==='temporary-media'?1:0,metadataErrors=readFailure==='temporary-metadata'?1:0;
 const config={folderId:'fixed_fixture_folder',fileId:'pregenerated_fixture_id',ownerPermissionId:'fixture_owner'},bundle=packageEvidence([{path:'fixture.json',bytes:Buffer.from('immutable authorized bytes')}]),payload={kind:'drive-evidence',role:'release-artifacts',generation:'f1-fixture',artifactPackageManifestSha256:'b'.repeat(64),fileId:config.fileId,folderId:config.folderId,sha256:bundle.sha256,bytes:bundle.length};
 const state=new DurableCloudState(new MemoryStateAdapter(),'website',{clock:()=>now});await state.setPaused(false);const lease=await state.acquire('gha-777-1',3600000),admission={state,lease,firstFreshGeneration:null},guard=createEvidenceAttemptGuard({admission,env:{},uploadQuarantineBinding:null}),posts=[],events=[],waits=[],diagnostics=[],guardCalls=[];
 const createBody=body=>{const delimiter='--ltc_evidence_'+bundle.sha256,parts=body.split(delimiter);remote=JSON.parse(parts[1].split('\r\n\r\n')[1].trim());remoteBytes=Buffer.from(parts[2].split('\r\n\r\n')[1].replace(/\r\n$/,''));remote={...remote,size:String(remoteBytes.length),ownedByMe:true,trashed:false};};
 const options={bundle,config,getAccessToken:async()=>{await options.onToken?.();return 'synthetic-token';},timeoutMs:25,readbackWait:async ms=>{events.push('wait');waits.push(ms);await options.onWait?.(ms);},onDiagnostic:d=>diagnostics.push(d),...(hook?{beforeCreateAttempt:async context=>{guardCalls.push(context.attempt);await options.onGuard?.(context);await guard(context);}}:{}),fetcher:async(url,o)=>{
  const u=new URL(url);assert.equal(u.origin,'https://www.googleapis.com');assert(['GET','POST'].includes(o.method));assert.equal(o.redirect,'error');
  if(o.method==='POST'){
   if(posts.length)assert.equal(events.at(-1),'file-get','Every additional create follows a fresh exact-ID GET');
   assert.equal(typeof o.body,'string','Captured multipart body is an immutable primitive');posts.push({body:o.body,contentType:o.headers['content-type']});events.push('post');const action=actions[Math.min(posts.length-1,actions.length-1)];
   const metadata=JSON.parse(o.body.split('\r\n\r\n')[1].split('\r\n--')[0]);assert.equal(metadata.id,config.fileId);assert.deepEqual(metadata.parents,[config.folderId]);assert.equal(metadata.appProperties.operationId,'fixture-upload');assert.equal(metadata.appProperties.payloadSha256,hash(payload));
   if(action.store)createBody(o.body);if(action.mismatch==='owner')remote.owner=false;if(action.mismatch==='hash')remote.appProperties.sha256='f'.repeat(64);if(action.mismatch==='parent')remote.parents=['different-folder'];
   if(action.bodyTimeout)return new Response(new ReadableStream({start(){}}),{status:200});if(action.timeout)return new Promise(()=>{});if(action.transport)throw Error('PRIVATE_TOKEN transport response');return new Response(action.status>=400?'PRIVATE_TOKEN body':JSON.stringify({id:config.fileId}),{status:action.status});
  }
  if(u.pathname.endsWith('/'+config.folderId)){events.push('folder-get');return Response.json({id:config.folderId,mimeType:'application/vnd.google-apps.folder',ownedByMe:true,trashed:false});}
  if(u.pathname.endsWith('/permissions')){events.push('permissions-get');return Response.json({permissions:[{id:config.ownerPermissionId,type:'user',role:'owner'},...(remote?.owner===false&&u.pathname.includes(config.fileId)?[{id:'public',type:'anyone',role:'reader'}]:[])]});}
  if(u.pathname.endsWith('/'+config.fileId)){
   if(u.searchParams.get('alt')==='media'){events.push('media-get');if(mediaErrors-->0)throw Error('PRIVATE_TOKEN body connection');return new Response(remoteBytes);}
   events.push('file-get');if(remote&&readFailure==='auth-metadata')return new Response(null,{status:403});if(remote&&metadataErrors-->0)return new Response(null,{status:503});if(!remote)return new Response(null,{status:404});return Response.json(remote);
  }
  assert.fail('Unexpected fixed-origin request');
 }};
 const provider=createDriveEvidenceProvider(options),run=new ReleaseOperationCoordinator(admission),operation={operationId:'fixture-upload',payload,provider};
 return{state,lease,admission,options,payload,bundle,posts,events,waits,diagnostics,guardCalls,run,operation,setNow:n=>now=n,now:()=>now,commitLast:()=>createBody(posts.at(-1).body),execute:()=>run.execute(operation)};
}
test('502 then a new successful create uses the same ID, byte-identical body, payload and live authorization',async()=>{
 const f=await fixture([{status:502},{status:200,store:true}]);assert.equal((await f.execute()).status,'confirmed');assert.equal(f.posts.length,2);assert.equal(new Set(f.posts.map(p=>hash(p.body))).size,1);assert.equal(new Set(f.posts.map(p=>p.contentType)).size,1);assert.deepEqual(f.guardCalls,[1,2]);assert.equal(f.diagnostics[0].httpStatus,502);assert.equal((await f.execute()).status,'confirmed');assert.equal(f.posts.length,2);
});
test('late first commit is found before another create, and a racing successful first create409 is never accepted without exact GET proof',async()=>{
 const late=await fixture([{status:502},{status:200,store:true}]);let waits=0;late.options.onWait=()=>{if(++waits===3)late.commitLast();};assert.equal((await late.execute()).status,'confirmed');assert.equal(late.posts.length,1);
 const conflict=await fixture([{status:502},{status:409,store:true}]);assert.equal((await conflict.execute()).status,'confirmed');assert.equal(conflict.posts.length,2);assert.equal(new Set(conflict.posts.map(p=>hash(p.body))).size,1);
 const missing=await fixture([{status:409}]);await assert.rejects(missing.execute(),/operation_outcome_uncertain/);assert.equal(missing.posts.length,1);assert.equal((await missing.state.inspect()).intents['fixture-upload'].status,'uncertain');
});
test('retryable exhaustion has a fixed three-create cap and cannot be resumed by coordinator execute',async()=>{
 for(const action of[{status:500},{status:502},{status:503},{status:504},{transport:true},{timeout:true}]){const f=await fixture([action]);f.options.maxCreateAttempts=100;await assert.rejects(f.execute(),/operation_outcome_uncertain/);assert.equal(f.posts.length,3);assert.deepEqual(f.guardCalls,[1,2,3]);assert.equal(new Set(f.posts.map(p=>hash(p.body))).size,1);await assert.rejects(f.execute(),/operation_reconciliation_required/);assert.equal(f.posts.length,3);assert(!JSON.stringify(f.diagnostics).includes('PRIVATE_TOKEN'));}
});
test('auth/client/unsupported statuses, missing retry guard and ownership/hash/parent mismatch stay UNKNOWN without another create',async()=>{
 for(const status of[400,401,403,408,429,501,505]){const f=await fixture([{status}]);await assert.rejects(f.execute(),/operation_outcome_uncertain/);assert.equal(f.posts.length,1);}
 const noGuard=await fixture([{status:502}],{hook:false});await assert.rejects(noGuard.execute(),/operation_outcome_uncertain/);assert.equal(noGuard.posts.length,1);
 for(const mismatch of['owner','hash','parent']){const f=await fixture([{status:502,store:true,mismatch}]);await assert.rejects(f.execute(),/operation_outcome_uncertain/);assert.equal(f.posts.length,1);}
});
test('successful create200 only polls unavailable/missing proof and never resends the POST',async()=>{
 for(const readFailure of['temporary-media','temporary-metadata']){const f=await fixture([{status:200,store:true}],{readFailure});assert.equal((await f.execute()).status,'confirmed');assert.equal(f.posts.length,1);assert.equal(f.waits.length,1);}
 const auth=await fixture([{status:200,store:true}],{readFailure:'auth-metadata'});await assert.rejects(auth.execute(),/operation_outcome_uncertain/);assert.equal(auth.posts.length,1);assert.equal(auth.waits.length,0);
 const absent=await fixture([{status:200}]);await assert.rejects(absent.execute(),/operation_outcome_uncertain/);assert.equal(absent.posts.length,1);
});
test('captured body cannot be changed by later caller-buffer mutation; config/payload mutation refuses another create',async()=>{
 const f=await fixture([{status:502},{status:200,store:true}]);f.options.onWait=()=>f.bundle.bytes.fill(0);assert.equal((await f.execute()).status,'confirmed');assert.equal(f.posts.length,2);assert.equal(f.posts[0].body,f.posts[1].body);
 const g=await fixture([{status:502},{status:200,store:true}]);g.options.onWait=()=>{g.options.config.fileId='changed-file-id';};await assert.rejects(g.execute(),/operation_outcome_uncertain/);assert.equal(g.posts.length,1);
});
test('pause, restore hold, expired/fenced lease or retired binding changes prevent a second POST with no lease extension',async()=>{
 for(const change of[async f=>f.state.setPaused(true),async f=>{const s=await f.state.adapter.read('website');s.value.restoreHold=true;await f.state.adapter.conditionalWrite('website',s.value,s.version);},async f=>f.setNow(f.now()+3600001),async f=>{const s=await f.state.adapter.read('website');s.value.fence++;await f.state.adapter.conditionalWrite('website',s.value,s.version);},async f=>{const s=await f.state.adapter.read('website');s.value.intents['fixture-upload'].payload.fileId='changed-durable-id';s.value.intents['fixture-upload'].payloadSha256=hash(s.value.intents['fixture-upload'].payload);await f.state.adapter.conditionalWrite('website',s.value,s.version);},async f=>{const s=await f.state.adapter.read('website');s.value.routineUploadRetirement={unexpected:true};await f.state.adapter.conditionalWrite('website',s.value,s.version);}]){const f=await fixture([{status:502},{status:200,store:true}]);let changed=false;f.options.onWait=async()=>{if(!changed){changed=true;await change(f);}};await assert.rejects(f.execute(),/operation_outcome_uncertain/);assert.equal(f.posts.length,1);const d=await f.state.inspect();assert.equal(d.lease.expiresAt,f.lease.expiresAt);assert.equal(d.intents['fixture-upload'].status,'uncertain');}
});

test('final-summary authorization works after source/Git advancement without assuming the pre-Git branch head',async()=>{
 const state=new DurableCloudState(new MemoryStateAdapter(),'website');await state.setPaused(false);const lease=await state.acquire('gha-888-1',60000),payload={kind:'drive-evidence',role:'release-summary',archivedStateSha256:'a'.repeat(64),fileId:'known-summary-file',folderId:'known-folder',sha256:'b'.repeat(64),bytes:100},operationId='summary-fixture';await state.intend(lease,operationId,hash(payload),payload);await state.assertMayMutate(lease,operationId);
 const s=await state.adapter.read('website');s.value.latestRelease={source:'c'.repeat(40),deployment:'dpl_PreviousPublic'};await state.adapter.conditionalWrite('website',s.value,s.version);
 const guard=createEvidenceAttemptGuard({admission:{state,lease,firstFreshGeneration:null},env:{},uploadQuarantineBinding:null});await guard({operationId,payload,payloadSha256:hash(payload),fence:lease.fence,attempt:2});assert.equal((await state.inspect()).lease.expiresAt,lease.expiresAt);
});

test('token acquisition cannot carry an additional create past expiry or emergency pause',async()=>{
 for(const mode of['expire','pause']){
  const f=await fixture([{status:502},{status:200,store:true}]);let interrupted=false;
  f.options.onToken=async()=>{if(!interrupted&&f.posts.length===1&&f.waits.length===3&&f.events.at(-1)==='file-get'){interrupted=true;await Promise.resolve();if(mode==='expire')f.setNow(f.lease.expiresAt+1);else await f.state.setPaused(true);}};
  await assert.rejects(f.execute(),/operation_outcome_uncertain/);assert.equal(interrupted,true);assert.equal(f.posts.length,1);assert.equal((await f.state.inspect()).intents['fixture-upload'].status,'uncertain');assert.deepEqual(f.guardCalls,[1,2]);
 }
});


test('shared request deadline bounds token and guard; late resolution cannot send a POST',async()=>{
 for(const phase of['token','guard']){
  const f=await fixture([{status:200,store:true}]);let release,entered=false;const blocked=new Promise(resolve=>{release=resolve;});
  if(phase==='token')f.options.onToken=async()=>{if(f.events.at(-1)==='file-get'){entered=true;await blocked;}};
  else f.options.onGuard=async()=>{entered=true;await blocked;};
  await assert.rejects(f.execute(),/operation_outcome_uncertain/);assert.equal(entered,true);assert.equal(f.posts.length,0);assert.equal(f.diagnostics[0].phase,'upload-post');assert.equal(f.diagnostics[0].timedOut,true);assert.equal(f.diagnostics[0].postAttempted,false);
  release();await new Promise(resolve=>setTimeout(resolve,40));assert.equal(f.posts.length,0);assert.equal((await f.state.inspect()).intents['fixture-upload'].status,'uncertain');
 }
});


test('acknowledged create200 with stalled response body is bounded and never causes another create',async()=>{
 const f=await fixture([{bodyTimeout:true}]);await assert.rejects(f.execute(),/operation_outcome_uncertain/);assert.equal(f.posts.length,1);assert.equal(f.diagnostics[0].httpStatus,200);assert.equal(f.diagnostics[0].timedOut,true);assert.equal(f.diagnostics[0].postAttempted,true);assert.equal((await f.state.inspect()).intents['fixture-upload'].status,'uncertain');
});
