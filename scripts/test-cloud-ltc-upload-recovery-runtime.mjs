import test from 'node:test';
import assert from 'node:assert/strict';
import {createUploadRecoveryDependencies,assertUploadRecoveryPolicyBarrier} from './cloud-ltc-upload-recovery-runtime.mjs';
const base=()=>({env:{GITHUB_TOKEN:'fixture-github-token',VERCEL_TOKEN:'fixture-vercel-token'},
  review:{folderId:'private-folder',ownerPermissionId:'owner-identity'},
  evidenceConfig:{folderId:'private-folder',ownerPermissionId:'owner-identity'},root:'/unused',state:{},writerEvidenceFile:'/unused'});
test('runtime rejects mismatched private evidence bindings before any request',()=>{
  for(const key of ['folderId','ownerPermissionId']) {
    const options=base(); options.evidenceConfig[key]='different';
    assert.throws(()=>createUploadRecoveryDependencies(options),/private_binding_changed/);
  }
});
test('origin read uses exact attempt, authenticated GET and repository identity',async()=>{
  const requests=[];
  const d=createUploadRecoveryDependencies({...base(),fetchImpl:async(url,options)=>{
    requests.push({url,options});
    return new Response(JSON.stringify({id:90,run_attempt:1,repository:{full_name:'Satnam-Satoshi/Satoshi-Langar'},status:'completed'}),{status:200});
  }});
  const result=await d.readOrigin({runId:'90',attempt:'1'});
  assert.equal(requests.length,1);
  assert.equal(requests[0].url,'https://api.github.com/repos/Satnam-Satoshi/Satoshi-Langar/actions/runs/90/attempts/1');
  assert.equal(requests[0].options.method,'GET');
  assert.equal(requests[0].options.redirect,'error');
  assert.equal(result.repository,'Satnam-Satoshi/Satoshi-Langar');
  assert.ok(Number.isFinite(Date.parse(result.observedAt)));
  assert.equal(JSON.stringify(result).includes('fixture-github-token'),false);
});
test('wrong repository, unavailable origin and redirects cannot produce origin proof',async()=>{
  for(const fetchImpl of [async()=>new Response(JSON.stringify({repository:{full_name:'other/repo'}})),
    async()=>new Response('{}',{status:403}), async()=>{throw Error('credential-private');}]) {
    const d=createUploadRecoveryDependencies({...base(),fetchImpl});
    await assert.rejects(d.readOrigin({runId:'90',attempt:'1'}),/origin_changed|provider_read_unavailable/);
  }
});

test('fresh source-policy stop is required in addition to the closed admission switch',()=>{
  const policy={schemaVersion:1,policyId:'bounded-daily-v1',enabled:true,paused:true};
  assert.doesNotThrow(()=>assertUploadRecoveryPolicyBarrier({policy,env:{LTC_CLOUD_PUBLISH:'false'}}));
  for(const env of [{},{LTC_CLOUD_PUBLISH:'true'},{LTC_CLOUD_PUBLISH:false}])
    assert.throws(()=>assertUploadRecoveryPolicyBarrier({policy,env}),/policy_stop_required/);
  for(const patch of [{paused:false},{paused:'true'},{enabled:false},{schemaVersion:2},{policyId:'other'}])
    assert.throws(()=>assertUploadRecoveryPolicyBarrier({policy:{...policy,...patch},env:{LTC_CLOUD_PUBLISH:'false'}}),/policy_stop_required/);
});

import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {uploadRecoveryHash as hash} from './cloud-ltc-upload-only-recovery.mjs';
async function writerFixture(t, mutate=()=>{}) {
  const root=await mkdtemp(path.join(tmpdir(),'upload-writer-test-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(path.join(root,'config'));
  const source={repository:'Satnam-Satoshi/Satoshi-Langar',branch:'agent/review'};
  await writeFile(path.join(root,'config/ltc-cloud-source.json'),JSON.stringify(source));
  const local={repository:source.repository,kind:'verified-local-website-writer-stop',disabled:true,activeWriterCount:0,observedAt:new Date().toISOString()};
  const policy={schemaVersion:1,policyId:'bounded-daily-v1',enabled:true,paused:true};
  const f={head:'a'.repeat(40),main:'b'.repeat(40),local,policy,runs:[],total:0,requests:[],env:{...base().env,LTC_SOURCE_BRANCH:source.branch,LTC_CLOUD_PUBLISH:'false',GITHUB_RUN_ID:'91',GITHUB_RUN_ATTEMPT:'1'}};
  const review={...base().review,sourceHead:f.head,operatorWorkflowHead:f.main,sourcePolicySha256:hash(policy),writerEvidenceSha256:hash(local),controllerImplementationSha256:'c'.repeat(64)};
  mutate(f);
  if(f.repinLocal)review.writerEvidenceSha256=hash(local);
  const writerEvidenceFile=path.join(root,'writers.json'); await writeFile(writerEvidenceFile,JSON.stringify(local));
  const deps=createUploadRecoveryDependencies({...base(),root,review,env:f.env,writerEvidenceFile,verifyCode:async()=>{},readHead:()=>f.head,
    fetchImpl:async(url,options)=>{
      assert.equal(options.method,'GET'); f.requests.push(url);
      let value;
      if(url.endsWith('/git/ref/heads/main'))value={object:{sha:f.main}};
      else if(url.includes('/git/ref/heads/'))value={object:{sha:f.head}};
      else if(url.includes('/contents/config/ltc-publication.json?'))value={encoding:'base64',content:Buffer.from(JSON.stringify(policy)).toString('base64')};
      else if(url.includes('/actions/runs?')){value={total_count:f.total,workflow_runs:f.runs};if(f.advanceHead)f.head='e'.repeat(40);}
      else throw Error('unexpected endpoint');
      return new Response(JSON.stringify(value));
    }});
  return {...f,deps};
}
test('writer barrier uses fresh source policy, local evidence and complete run inventory without Variables API',async t=>{
  const f=await writerFixture(t); const proof=await f.deps.verifyStoppedWriters();
  assert.equal(proof.cloudPublicationEnabled,false);assert.equal(proof.otherWritersStopped,true);
  assert.equal(f.requests.some(u=>u.includes('/variables/')),false);
  assert.equal(f.requests.filter(u=>u.includes('/actions/runs?')).length,5);
});
for(const [name,mutate,pattern] of [
  ['open admission',f=>f.env.LTC_CLOUD_PUBLISH='true',/policy_stop/],
  ['changed policy',f=>f.policy.paused=false,/source_changed/],
  ['changed main',f=>f.main='d'.repeat(40),/source_changed/],
  ['active foreign writer',f=>{f.total=1;f.runs=[{id:92,run_attempt:1,path:'.github/workflows/ltc-daily-publication.yml'}];},/other_writer_active/],
  ['incomplete inventory',f=>f.total=101,/inventory_incomplete/],
  ['changed local observation',f=>f.local.disabled=false,/local_writer_proof/],
])test(`writer barrier rejects ${name}`,async t=>{const f=await writerFixture(t,mutate);await assert.rejects(f.deps.verifyStoppedWriters(),pattern);});
test('writer barrier permits only its own exact run attempt',async t=>{
 const f=await writerFixture(t,f=>{f.total=1;f.runs=[{id:91,run_attempt:1,path:'.github/workflows/ltc-daily-publication.yml'}];});
 assert.equal((await f.deps.verifyStoppedWriters()).otherWritersStopped,true);
});

import {createHash} from 'node:crypto';
import {TARGET} from './cloud-ltc-release.mjs';
const bytesHash=b=>createHash('sha256').update(b).digest('hex');
function publicFixture(mode='ok') {
 const files={'index.html':'founder home','conversations/index.html':'magazine home','data/proof.json':'verified data'};
 const manifest=Object.entries(files).map(([file,body])=>({file,sha256:bytesHash(body)}));
 const latest={deployment:'dpl_previous',source:'a'.repeat(40),artifactManifestSha256:hash(manifest)};
 let pointers=0; const requests=[];
 const deps=createUploadRecoveryDependencies({...base(),loadManifest:async()=>manifest,fetchImpl:async(url,options={})=>{
   assert.ok(!options.method || options.method==='GET'); requests.push(url);
   if(url.startsWith('https://api.vercel.com/v9/projects/'))return new Response(JSON.stringify({id:TARGET.project,accountId:TARGET.team,...(mode==='rolling'?{rollingRelease:{enabled:true}}:{})}));
   if(url.startsWith('https://api.vercel.com/v13/deployments/')) {
     pointers++;
     return new Response(JSON.stringify({id:mode==='changed-pointer'&&pointers===2?'dpl_changed':latest.deployment,projectId:TARGET.project,ownerId:TARGET.team,team:{id:TARGET.team},url:'previous.vercel.app',readyState:'READY',target:'production',meta:{ltcSourceCommit:latest.source}}));
   }
   const parsed=new URL(url),route=parsed.pathname;
   const file=route==='/'?(parsed.hostname==='ltcmagazine.org'?'conversations/index.html':'index.html'):route==='/conversations/'?'conversations/index.html':route.slice(1);
   assert.ok(Object.hasOwn(files,file),url);
   return new Response(mode==='bad-bytes'&&file==='data/proof.json'?'tampered':files[file]);
 }});
 return {deps,latest,requests};
}
test('public baseline verifies both aliases and all manifest bytes, then rechecks pointers',async()=>{
 const f=publicFixture(); const proof=await f.deps.verifyPublicBaseline(f.latest);
 assert.equal(proof.domains.length,2);assert.equal(proof.manifestCount,3);
 assert.equal(f.requests.filter(u=>u.includes('/v13/deployments/')).length,4);
 assert.equal(proof.domains.every(d=>d.verifiedCount===3),true);
});
for(const mode of ['rolling','changed-pointer','bad-bytes'])test(`public baseline refuses ${mode}`,async()=>{
 const f=publicFixture(mode);await assert.rejects(f.deps.verifyPublicBaseline(f.latest));
});
test('confirmed upload readback binds exact file, folder, digest and size and never uploads',async()=>{
 const row={operationId:'evidence-one',payloadSha256:'a'.repeat(64),payload:{fileId:'file-one',folderId:'private-folder',sha256:'b'.repeat(64),bytes:123}};
 let calls=0;
 const deps=createUploadRecoveryDependencies({...base(),download:async(receipt,options)=>{
   calls++;assert.deepEqual(receipt,{operationId:row.operationId,payloadSha256:row.payloadSha256,fileId:'file-one',folderId:'private-folder',sha256:'b'.repeat(64),length:123});
   assert.equal(options.config.fileId,'file-one');
   return {proof:{fileId:'file-one',folderId:'private-folder',sha256:'b'.repeat(64),length:123,ownerOnly:true,ownerPermissionId:'owner-identity',downloadVerified:true}};
 }});
 const proof=await deps.verifyConfirmedUpload(row);assert.equal(calls,1);assert.equal(proof.operationId,row.operationId);assert.equal(proof.downloadVerified,true);
 const absent=createUploadRecoveryDependencies({...base(),download:async()=>null});
 await assert.rejects(absent.verifyConfirmedUpload(row),/readback_unavailable/);
});

test('local writer timestamp is retained rather than refreshed by later reads',async t=>{
 const f=await writerFixture(t,f=>{f.local.observedAt=new Date(Date.now()-120000).toISOString();f.repinLocal=true;});
 const proof=await f.deps.verifyStoppedWriters();assert.equal(proof.observedAt,f.local.observedAt);
});
test('source advancing during inventory is caught by final head read',async t=>{
 const f=await writerFixture(t,f=>{f.advanceHead=true;});await assert.rejects(f.deps.verifyStoppedWriters(),/source_changed/);
});
