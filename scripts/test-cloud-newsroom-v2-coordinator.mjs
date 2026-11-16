import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCloudNewsroomV2Coordinator} from './cloud-newsroom-v2-coordinator.mjs';
function fixture(){
 let version=1,time='2026-11-16T19:00:00Z';const calls=[];
 let value={schemaVersion:1,generation:'cloud-newsroom-v2',branch:'agent/cloud-newsroom-v2-20261116',enabled:true,previewEnabled:true,publicationEnabled:true,emergencyStop:false,oldWritersDisabled:true,approvedCodeCommit:'a'.repeat(40),repository:'Satnam-Satoshi/Satoshi-Langar',projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',domains:['ltcmagazine.org','satnamsatoshi.com'],expectedDomains:{'ltcmagazine.org':'old','satnamsatoshi.com':'old'},fence:0,completed:[],run:null,lease:null};
 const req={branch:value.branch,candidateTreeGitSha:'d'.repeat(40),receiptSha256:'e'.repeat(64),reviewDigest:'f'.repeat(64),owner:'coordinator',runId:'run-1',editionDate:'2026-11-16',candidateCommit:'b'.repeat(40),artifactSha256:'c'.repeat(64),reviewedCodeCommit:value.approvedCodeCommit,repository:value.repository,projectId:value.projectId,admission:{branch:value.branch,candidateTreeGitSha:'d'.repeat(40),receiptSha256:'e'.repeat(64),reviewDigest:'f'.repeat(64),status:'eligible-for-preview-review',candidateCommit:'b'.repeat(40),artifactSha256:'c'.repeat(64),reviewedCodeCommit:value.approvedCodeCommit,expiresAt:'2026-11-16T20:00:00Z'},approval:{approved:true,projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',deploymentId:'new',sourceCommit:'b'.repeat(40),artifactSha256:'c'.repeat(64),domains:[...value.domains],expiresAt:'2026-11-16T20:00:00Z'}};
 const domainState=Object.fromEntries(value.domains.map(d=>[d,'old']));
 const adapters={clock:async()=>time,state:{read:async ns=>{assert.equal(ns,'cloud-newsroom-v2');return {version,value:structuredClone(value)};},cas:async(ns,expected,next)=>{calls.push('cas:'+next.run?.phase);if(expected!==version)return {ok:false};value=structuredClone(next);version++;return {ok:true,version};}},provider:{createPreview:async args=>{assert.equal(value.run.phase,'create-intent');assert.equal(args.production,false);assert.equal(args.target,'preview');calls.push('create');return {id:'new'};},getDeployment:async()=>({id:'new',projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',sourceCommit:req.candidateCommit,repository:'Satnam-Satoshi/Satoshi-Langar',target:'preview',status:'READY'}),getDomainDeployment:async({domain})=>({deploymentId:domainState[domain],projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx'}),promote:async args=>{assert.equal(value.run.phase,'promotion-intent');calls.push('promote');for(const d of args.domains)domainState[d]='new';}},qa:{verify:async args=>({...args,passed:true,expiresAt:'2026-11-16T20:00:00Z'})}};
 const coordinator=createCloudNewsroomV2Coordinator(adapters);
 return {req,adapters,calls,domains:domainState,advance:()=>coordinator.advance(req),state:()=>value,mutate:fn=>{fn(value);version++;},time:t=>{time=t;}};
}
test('executes durable claim/create/READY/QA/promotion/reconciliation sequence',async()=>{
 const x=fixture();assert.equal((await x.advance()).status,'awaiting-preview');assert.equal(x.state().fence,1);assert.equal((await x.advance()).status,'preview-verified');assert.equal((await x.advance()).status,'awaiting-reconciliation');assert.equal((await x.advance()).status,'published-verified');assert.equal(x.state().completed.length,1);assert.equal(x.state().run,null);assert.equal((await x.advance()).status,'duplicate-no-op');assert.equal(x.calls.filter(x=>x==='promote').length,1);
 x.req.artifactSha256='d'.repeat(64);x.req.admission.artifactSha256=x.req.artifactSha256;assert.equal((await x.advance()).status,'hold');
});
test('disabled, stopped, mismatched pins, absent admission and CAS conflict never create',async()=>{
 for(const mutate of [x=>x.mutate(s=>s.enabled=false),x=>x.mutate(s=>s.previewEnabled=false),x=>x.mutate(s=>s.emergencyStop=true),x=>x.req.reviewedCodeCommit='d'.repeat(40),x=>delete x.req.admission,x=>x.adapters.state.cas=async()=>({ok:false})]){const x=fixture();mutate(x);assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('create'));}
});
test('creation uncertainty persists intent and never retries',async()=>{
 const x=fixture();let effects=0;x.adapters.provider.createPreview=async()=>{effects++;throw Error('timeout after side effect');};assert.equal((await x.advance()).status,'hold');assert.equal(x.state().run.phase,'create-intent');assert.equal((await x.advance()).status,'hold');assert.equal(effects,1);
});
test('READY source mismatch, truthy QA, expired QA and wrong bindings hold',async()=>{
 for(const mutate of [x=>x.adapters.provider.getDeployment=async()=>({id:'new',sourceCommit:'wrong'}),x=>x.adapters.qa.verify=async()=>({passed:'true'}),x=>x.adapters.qa.verify=async args=>({...args,passed:true,expiresAt:'2026-11-16T18:00:00Z'})]){const x=fixture();await x.advance();mutate(x);assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('promote'));}
 const x=fixture();await x.advance();x.adapters.provider.getDeployment=async()=>({id:'new',projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',sourceCommit:x.req.candidateCommit,repository:'Satnam-Satoshi/Satoshi-Langar',target:'preview',status:'BUILDING'});assert.equal((await x.advance()).status,'awaiting-preview');
});
test('publication enabled, approval exact domains and baseline are required',async()=>{
 for(const mutate of [x=>x.mutate(s=>s.publicationEnabled=false),x=>x.req.approval.domains=['ltcmagazine.org'],x=>x.req.approval.approved='true',x=>x.domains['ltcmagazine.org']='manual-change']){const x=fixture();await x.advance();await x.advance();mutate(x);assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('promote'));}
});
test('uncertain promotion reconciles without retry; partial outcome stays hold',async()=>{
 const x=fixture();await x.advance();await x.advance();let promoted=0;x.adapters.provider.promote=async()=>{promoted++;x.domains['ltcmagazine.org']='new';throw Error('partial');};assert.equal((await x.advance()).status,'awaiting-reconciliation');assert.equal((await x.advance()).status,'hold');assert.equal(promoted,1);x.domains['satnamsatoshi.com']='new';assert.equal((await x.advance()).status,'published-verified');assert.equal(promoted,1);
});
test('emergency stop after intent prevents effect, sameowner safe lease renews monotonically',async()=>{
 const x=fixture(),original=x.adapters.state.cas;x.adapters.state.cas=async(...args)=>{const r=await original(...args);if(args[2].run?.phase==='create-intent')x.mutate(s=>s.emergencyStop=true);return r;};assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('create'));
 const y=fixture();await y.advance();y.time('2026-11-16T19:03:00Z');assert.equal((await y.advance()).status,'preview-verified');assert.equal(y.state().fence,2);
 const z=fixture();z.adapters.provider.createPreview=async()=>{throw Error();};await z.advance();z.time('2026-11-16T19:03:00Z');assert.equal((await z.advance()).reason,'expired_lease_uncertain_effect_requires_reconciliation');assert.equal(z.state().fence,1);
});
test('no imports, credentials discovery, network implementation or ambient clock',()=>{const src=readFileSync(new URL('./cloud-newsroom-v2-coordinator.mjs',import.meta.url),'utf8');assert.doesNotMatch(src,/^import\s|\bfetch\s*\(|process\.|Date\.now\s*\(/m);});

import {evaluateCooperativePreview} from './cloud-newsroom-v2-cooperative-preview.mjs';
test('same intent CAS produces state accepted by real provider cooperative gate before create',async()=>{
 const x=fixture(),create=x.adapters.provider.createPreview;
 x.adapters.provider.createPreview=async args=>{
  const state=x.state(),g=state.previewGrant;
  assert.equal(state.run.phase,'create-intent');assert.equal(g.fence,state.fence);assert.equal(g.owner,state.lease.owner);assert.ok(Date.parse(g.expiresAt)<=Date.parse(state.lease.expiresAt));assert.equal(typeof state.lease.expiresAt,'string');
  const env={VERCEL_PROJECT_ID:state.projectId,VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_GIT_REPO_OWNER:'Satnam-Satoshi',VERCEL_GIT_REPO_SLUG:'Satoshi-Langar',VERCEL_GIT_COMMIT_REF:state.branch,VERCEL_GIT_COMMIT_SHA:x.req.candidateCommit};
  const options={env,git:ref=>ref==='HEAD'?x.req.candidateCommit:x.req.candidateTreeGitSha,now:Date.parse('2026-11-16T19:00:00Z'),fetcher:async()=>new Response(JSON.stringify(state))};
  assert.equal(await evaluateCooperativePreview(options),true);
  for(const mutate of [v=>v.emergencyStop=true,v=>v.previewEnabled=false,v=>v.fence++,v=>v.previewGrant.candidateTreeGitSha='a'.repeat(40)]){const bad=structuredClone(state);mutate(bad);assert.equal(await evaluateCooperativePreview({...options,fetcher:async()=>new Response(JSON.stringify(bad))}),false);}
  return create(args);
 };
 assert.equal((await x.advance()).status,'awaiting-preview');await x.advance();await x.advance();assert.equal((await x.advance()).status,'published-verified');assert.equal(x.state().previewGrant,null);
});
test('missing schema, wrong canonical branch and unbound candidate tree/receipt/review deny',async()=>{
 for(const mutate of [x=>x.mutate(s=>delete s.schemaVersion),x=>x.mutate(s=>s.branch='main'),x=>x.req.branch='main',x=>x.req.candidateTreeGitSha='a'.repeat(40),x=>x.req.receiptSha256='a'.repeat(64),x=>x.req.reviewDigest='a'.repeat(64)]){const x=fixture();mutate(x);assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('create'));}
});
test('queued deployment renews exact grant with monotonic fence, without another create',async()=>{
 const x=fixture();await x.advance();const old=structuredClone(x.state().previewGrant);x.time('2026-11-16T19:03:00Z');
 x.adapters.provider.getDeployment=async()=>({id:'new',projectId:x.req.projectId,sourceCommit:x.req.candidateCommit,repository:x.req.repository,target:'preview',status:'BUILDING'});
 assert.equal((await x.advance()).status,'awaiting-preview');const state=x.state();assert.equal(state.fence,old.fence+1);assert.equal(state.previewGrant.fence,state.fence);assert.equal(state.run.deploymentId,'new');assert.equal(x.calls.filter(c=>c==='create').length,1);
 const env={VERCEL_PROJECT_ID:state.projectId,VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_GIT_REPO_OWNER:'Satnam-Satoshi',VERCEL_GIT_REPO_SLUG:'Satoshi-Langar',VERCEL_GIT_COMMIT_REF:state.branch,VERCEL_GIT_COMMIT_SHA:x.req.candidateCommit};
 const args={env,git:r=>r==='HEAD'?x.req.candidateCommit:x.req.candidateTreeGitSha,now:Date.parse('2026-11-16T19:03:00Z'),fetcher:async()=>new Response(JSON.stringify(state))};
 assert.equal(await evaluateCooperativePreview(args),true);assert.equal(await evaluateCooperativePreview({...args,fetcher:async()=>new Response(JSON.stringify({...state,previewGrant:old}))}),false);
});
test('expired admission cannot renew; QA expiry stays fixed and no create repeats',async()=>{
 const x=fixture();await x.advance();x.time('2026-11-16T20:01:00Z');assert.equal((await x.advance()).reason,'fresh_external_admission_required');assert.equal(x.state().fence,1);
 const y=fixture();await y.advance();await y.advance();const expiry=y.state().run.qa.expiresAt;y.time('2026-11-16T19:03:00Z');y.mutate(s=>s.publicationEnabled=false);assert.equal((await y.advance()).status,'hold');assert.equal(y.state().fence,2);assert.equal(y.state().run.qa.expiresAt,expiry);assert.equal(y.calls.filter(c=>c==='create').length,1);
});
test('CAS readback mismatch and same-version ownership tampering cannot reach effects',async()=>{
 const x=fixture(),cas=x.adapters.state.cas;x.adapters.state.cas=async(...args)=>{const written=await cas(...args);return {...written,version:'wrong'};};assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('create'));
 const y=fixture(),read=y.adapters.state.read;let reads=0;y.adapters.state.read=async(...args)=>{const r=await read(...args);if(++reads===3)r.value.lease.owner='other';return r;};assert.equal((await y.advance()).status,'hold');assert.ok(!y.calls.includes('create'));
});
