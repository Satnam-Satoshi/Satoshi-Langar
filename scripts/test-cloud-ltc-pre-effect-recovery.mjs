import test from 'node:test';
import assert from 'node:assert/strict';
import { retireReviewedPreEffectLease } from './cloud-ltc-pre-effect-recovery.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { migrationFixture } from './lib/test-migration-gate-fixture.mjs';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
async function fixture(){
 const f=migrationFixture(),document=f.document,previousManifest=[{file:'index.html',sha256:'a'.repeat(64)}];
 document.fence=5;document.paused=false;document.lease={runId:'gha-400-1',fence:5,expiresAt:Date.now()+60000};
 document.migrationActivation={publicDeployment:'dpl_Previous',publicManifestSha256:hash(previousManifest)};
 const review={schemaVersion:1,kind:'founder-approved-pre-effect-lease-retirement',approved:true,actorId:'268053325',approvedAt:'2026-10-31T00:00:00Z',controllerImplementationSha256:'b'.repeat(64),controllerSource:'c'.repeat(40),zeroCurrentFenceIntentsRequired:true,pausedAfter:true,authorizePublication:false,snapshotSha256:hash(document),sourcePolicySha256:hash({policyId:'bounded-daily-v1',enabled:true,paused:false}),previousPublicManifestSha256:hash(previousManifest),previousDeployment:'dpl_Previous',scope:{repository:TARGET.repository,project:TARGET.project,team:TARGET.team,domains:TARGET.domains},origin:{runId:'400',attempt:'1',source:'d'.repeat(40),workflowHead:'e'.repeat(40),fence:5},bindings:{websiteDocumentId:'fixture-document',folderId:'fixture-folder'}};
 const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:TARGET.repository,GITHUB_ACTOR_ID:'268053325',GITHUB_RUN_ID:'401',GITHUB_RUN_ATTEMPT:'1',LTC_ACCEPTANCE_ENVIRONMENT:'ltc-production',LTC_ACCEPTANCE_MANUAL:'true',LTC_CLOUD_PUBLISH:'false',LTC_ACCEPTANCE_FENCE:'5',LTC_ACCEPTANCE_SOURCE_COMMIT:review.origin.source,LTC_ACCEPTED_IMPLEMENTATION_SHA256:review.controllerImplementationSha256,LTC_PRE_EFFECT_RECOVERY_REVIEW_SHA256:hash(review)};
 const adapter=new MemoryStateAdapter();await adapter.conditionalWrite('website',document,null);const state=new DurableCloudState(adapter,'website'),events=[];
 const origin={id:400,run_attempt:1,status:'completed',conclusion:'failure',event:'workflow_dispatch',head_branch:'main',head_sha:review.origin.workflowHead,repository:{full_name:TARGET.repository},path:'.github/workflows/ltc-daily-publication.yml',actor:{id:268053325}};
 const dependencies={github:async endpoint=>{assert.equal(endpoint,'/actions/runs/400/attempts/1');events.push('origin');return origin;},sourceControlCheck:async value=>{assert.equal(value.originalSource,review.origin.source);assert.equal(value.controllerSource,review.controllerSource);events.push('source');},vercel:async endpoint=>{events.push(endpoint.startsWith('/v9/')?'project':'pointer');return endpoint.startsWith('/v9/')?{id:TARGET.project,accountId:TARGET.team,name:'https-github-com-satnam-satoshi-satoshi-langar',crons:{definitions:[]}}:{id:'dpl_Previous',projectId:TARGET.project,ownerId:TARGET.team,team:{id:TARGET.team},target:'production',readyState:'READY',url:'previous.vercel.app'};},verifyPublic:async manifest=>{assert.equal(hash(manifest),hash(previousManifest));events.push('bytes');},save:async result=>events.push('save')};
 return{state,adapter,document,review,env,origin,previousManifest,dependencies,events};
}
test('completed failed origin, exact snapshot/lease, zero fence intents and full public proof precede one paused CAS',async()=>{
 const f=await fixture(),original=structuredClone(f.document),write=f.adapter.conditionalWrite.bind(f.adapter);let writes=0;
 f.adapter.conditionalWrite=async(...args)=>{writes++;assert.deepEqual(f.events,['origin','source','project','pointer','pointer','bytes']);return write(...args);};
 const result=await retireReviewedPreEffectLease(f);assert.equal(writes,1);assert.equal(result.publicationAuthorized,false);assert.equal(result.effectsReissued,false);
 const next=await f.state.inspect();assert.equal(next.paused,true);assert.equal(next.lease,null);assert.equal(next.fence,5);assert.deepEqual(next.intents,original.intents);assert.deepEqual(next.receipts,original.receipts);assert.deepEqual(next.unresolvedSetupIncident,original.unresolvedSetupIncident);assert.equal(next.latestRelease,undefined);assert.equal(next.preEffectLeaseRetirements[0].snapshotSha256,hash(original));
});
test('any current-fence intent including pending/confirmed/uncertain prevents retirement without provider reads',async()=>{
 for(const status of ['pending','confirmed','uncertain']){
  const f=await fixture(),payload={kind:'vercel-stage'};f.document.intents.current={operationId:'current',runId:'gha-400-1',fence:5,status,payload,payloadSha256:hash(payload),evidenceSha256:null};
  // Validation itself may reject a synthetic terminal without receipt; neither path permits a CAS.
  await f.adapter.conditionalWrite('website',f.document,(await f.adapter.read('website')).version);f.review.snapshotSha256=hash(f.document);f.env.LTC_PRE_EFFECT_RECOVERY_REVIEW_SHA256=hash(f.review);
  await assert.rejects(retireReviewedPreEffectLease(f));assert.equal(f.events.length,0);assert.ok((await f.adapter.read('website')).value.lease);
 }
});
test('wrong owner, review hash, source/attempt/fence, active origin or pointer/byte failure cannot clear lease',async()=>{
 for(const change of [f=>f.env.GITHUB_ACTOR_ID='2',f=>f.env.LTC_PRE_EFFECT_RECOVERY_REVIEW_SHA256='f'.repeat(64),f=>{f.review.origin.fence=6;f.env.LTC_PRE_EFFECT_RECOVERY_REVIEW_SHA256=hash(f.review);},f=>f.origin.run_attempt=2,f=>f.origin.status='in_progress',f=>f.origin.head_sha='f'.repeat(40),f=>f.origin.actor.id=2,f=>f.dependencies.sourceControlCheck=async()=>{throw Error('changed');},f=>f.dependencies.verifyPublic=async()=>{throw Error('wrong bytes');},f=>{const read=f.dependencies.vercel;f.dependencies.vercel=async endpoint=>{const result=await read(endpoint);if(!endpoint.startsWith('/v9/'))result.id='dpl_Other';return result;};}]){
  const f=await fixture();change(f);await assert.rejects(retireReviewedPreEffectLease(f));const current=(await f.adapter.read('website')).value;assert.ok(current.lease);assert.equal(current.paused,false);
 }
});
test('concurrent state change, ambiguous CAS and readback mismatch never retry or report success',async()=>{
 for(const failure of ['conflict','lost-response','mismatch']){
  const f=await fixture(),write=f.adapter.conditionalWrite.bind(f.adapter);let writes=0;
  f.adapter.conditionalWrite=async(...args)=>{writes++;if(failure==='conflict')throw Error('state_conflict');if(failure==='lost-response'){await write(...args);throw Error('storage_write_uncertain');}return null;};
  await assert.rejects(retireReviewedPreEffectLease(f));assert.equal(writes,1);assert(!f.events.includes('save'));
 }
});
test('snapshot pin is exact and repeat execution cannot retire a different or already retired lease',async()=>{
 const f=await fixture();await retireReviewedPreEffectLease(f);await assert.rejects(retireReviewedPreEffectLease(f),/snapshot_changed/);assert.equal((await f.state.inspect()).preEffectLeaseRetirements.length,1);
});
test('an actual concurrent state revision during public readback fences the captured-snapshot CAS',async()=>{
 const f=await fixture();
 f.dependencies.verifyPublic=async()=>{const current=await f.adapter.read('website');await f.adapter.conditionalWrite('website',{...current.value,paused:true},current.version);};
 await assert.rejects(retireReviewedPreEffectLease(f),/state_conflict/);
 const current=await f.state.inspect();assert.equal(current.paused,true);assert.ok(current.lease);assert.equal(current.preEffectLeaseRetirements,undefined);assert(!f.events.includes('save'));
});
