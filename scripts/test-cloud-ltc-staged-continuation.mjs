import test from 'node:test';
import assert from 'node:assert/strict';
import { stagedContinuationFixture } from './lib/test-staged-continuation-fixture.mjs';
import { continueReviewedStagedDaily } from './cloud-ltc-staged-continuation.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { loadPreviousReleaseManifest } from './cloud-ltc-production.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
async function fixture(flags={}){
 const f=stagedContinuationFixture(),manifest=[{file:'index.html',sha256:hash('new')}],previousManifest=[{file:'index.html',sha256:hash('old')}];
 f.review.artifactManifestSha256=hash(manifest);f.review.previousPublicManifestSha256=hash(previousManifest);
 const stage=f.document.intents[f.review.stageOperationId];stage.payload.artifactManifestSha256=f.review.artifactManifestSha256;stage.proof.proof.artifactManifestSha256=f.review.artifactManifestSha256;f.reseal(stage.operationId);
 const adapter=new MemoryStateAdapter();await adapter.conditionalWrite('website',f.document,null);const state=new DurableCloudState(adapter,'website',{clock:()=>f.now});let pointer=f.review.previousDeployment,uploads=0,lastBundle;const calls=[],saved=[];
 const identity=id=>({id,projectId:TARGET.project,ownerId:TARGET.team,team:{id:TARGET.team},target:'production',readyState:'READY',url:id===f.review.candidateDeployment?'fixture-candidate.vercel.app':'fixture-previous.vercel.app',meta:{ltcSourceCommit:f.review.artifactSource}});
 const dependencies={now:()=>f.now,github:async endpoint=>{calls.push('origin');assert.equal(endpoint,`/actions/runs/${f.review.origin.runId}/attempts/1`);return{id:Number(f.review.origin.runId),run_attempt:1,status:flags.originActive?'in_progress':'completed',conclusion:'failure',event:'workflow_dispatch',head_branch:'main',head_sha:f.review.origin.workflowHead,repository:{full_name:TARGET.repository},path:'.github/workflows/ltc-daily-publication.yml',actor:{id:268053325}};},
  verifyLiveMarkets:async()=>({checkedAt:new Date(f.now).toISOString(),sha256:hash('live fixture'),newCollectionForEdition:false}),verifyControllerAndPolicy:async()=>calls.push('controller'),verifyProjectAndPointers:async()=>{assert.equal(pointer,f.review.previousDeployment);calls.push('previous-pointers');},
  restore:async pinned=>{calls.push('restore40');assert.equal(pinned.evidence.length,40);return{manifest,previousManifest,publicationProvenance:f.review.publicationProvenance,verify:async()=>calls.push('restored-hashes'),verifyPromotion:async()=>calls.push('current-ticker-check')};},
  verifyProtected:async()=>{calls.push('full-protected');if(flags.protectedBad)throw Error('protected bytes');},
  verifyPublic:async records=>{const candidate=hash(records)===hash(manifest);calls.push(candidate?'new-public':'old-public');assert.equal(pointer,candidate?f.review.candidateDeployment:f.review.previousDeployment);if(candidate&&flags.publicBad)throw Error('public bytes');if(candidate&&flags.publicUnavailable)throw Error('network_request_failed');},
  vercel:async endpoint=>{const domain=TARGET.domains.some(d=>new URL(d).hostname===endpoint.split('/').at(-1));return identity(domain?(flags.mixedPointers&&pointer===f.review.candidateDeployment&&endpoint.endsWith('ltcmagazine.org')?f.review.previousDeployment:pointer):endpoint.split('/').at(-1));},
  mutate:async args=>{calls.push(args[0]);assert(['promote','rollback'].includes(args[0]));const current=await state.inspect();assert.equal(current.fence,7);assert.equal(current.lease.runId,'gha-101-1');if(args[0]==='promote'){pointer=f.review.candidateDeployment;if(flags.promoteLost)throw Error('lost response');}else pointer=f.review.previousDeployment;},
  evidenceConfig:{folderId:f.review.bindings.folderId,ownerPermissionId:f.review.bindings.ownerPermissionId},allocate:async({count})=>{assert.equal(count,1);calls.push('allocate-summary-id');return['fixture-summary-id'];},token:async()=>assert.fail('no real authorization'),
  providerFactory:({bundle,config})=>{let proof;return{apply:async context=>{uploads++;lastBundle=bundle;calls.push('summary-upload');const current=await state.inspect(),intent=current.intents[context.operationId];assert.equal(intent.status,'uncertain');assert.equal(intent.payload.role,'release-summary');assert.equal(intent.payload.fileId,config.fileId);proof={operationId:context.operationId,payloadSha256:context.payloadSha256,status:'applied',proof:{fileId:config.fileId,folderId:config.folderId,sha256:bundle.sha256,length:bundle.length,ownerPermissionId:config.ownerPermissionId,ownerOnly:true,downloadVerified:true}};if(flags.summaryLost)throw Error('lost summary');},readback:async()=>proof};},
  save:async value=>saved.push(structuredClone(value)),
 };
 return{...f,adapter,state,dependencies,calls,saved,uploads:()=>uploads,pointer:()=>pointer,bundle:()=>lastBundle};
}
test('expired original lease becomes new actual-run fence only after full proof; first promotion and summary finish paused',async()=>{
 const f=await fixture(),old=structuredClone(f.document);const result=await continueReviewedStagedDaily(f);assert.equal(result.published,true);assert.equal(result.fence,7);assert.equal(result.routineActivationAuthorized,false);
 assert.deepEqual(f.calls.filter(x=>['promote','rollback','summary-upload','deploy'].includes(x)),['promote','summary-upload']);assert(f.calls.indexOf('full-protected')<f.calls.indexOf('promote'));assert.equal(f.uploads(),1);
 const doc=await f.state.inspect();assert.equal(doc.paused,true);assert.equal(doc.lease,null);assert.equal(doc.fence,7);assert.equal(doc.latestRelease.source,f.review.artifactSource);assert.notEqual(doc.latestRelease.continuation.artifactImplementationSha256,doc.latestRelease.continuation.controllerImplementationSha256);assert.equal(doc.latestRelease.continuation.operator.runId,'101');assert.equal(doc.latestRelease.continuation.origin.runId,'100');assert.deepEqual(doc.stagedDailyContinuation.context.originalLease,old.lease);assert.deepEqual(doc.unresolvedSetupIncident,old.unresolvedSetupIncident);assert.equal(doc.stagedDailyContinuation.status,'completed');assert.equal(Object.keys(doc.intents).length,1);assert.equal(doc.archiveHead.archivedIntentCount,48);
 await assert.rejects(continueReviewedStagedDaily(f),/snapshot_changed/);assert.equal(f.uploads(),1);
});
test('protected mismatch or active original job makes no claim and authorizes no effect',async()=>{
 for(const flags of[{protectedBad:true},{originActive:true}]){const f=await fixture(flags);await assert.rejects(continueReviewedStagedDaily(f));assert.equal(hash(await f.state.inspect()),hash(f.document));assert(!f.calls.includes('promote'));assert.equal(f.uploads(),0);}
});
test('lost promotion response is held paused at new fence without rollback/replay or lease retirement',async()=>{
 const f=await fixture({promoteLost:true});await assert.rejects(continueReviewedStagedDaily(f),/operation_outcome_uncertain/);const doc=await f.state.inspect();assert.equal(doc.paused,true);assert.equal(doc.lease.fence,7);assert.equal(doc.lease.runId,'gha-101-1');assert.equal(doc.stagedDailyContinuation.status,'held');assert.equal(Object.values(doc.intents).find(i=>i.payload.kind==='vercel-promote').status,'uncertain');assert.equal(doc.latestRelease,undefined);assert(!f.calls.includes('rollback'));await assert.rejects(continueReviewedStagedDaily(f));assert.equal(f.calls.filter(c=>c==='promote').length,1);
});
test('known promotion with bad public bytes uses authorized rollback once then remains unaccepted held',async()=>{
 const f=await fixture({publicBad:true});await assert.rejects(continueReviewedStagedDaily(f),/public bytes/);assert.deepEqual(f.calls.filter(c=>['promote','rollback'].includes(c)),['promote','rollback']);const doc=await f.state.inspect();assert.equal(doc.paused,true);assert.ok(doc.lease);assert.equal(doc.latestRelease,undefined);assert.equal(f.pointer(),f.review.previousDeployment);assert.equal(f.uploads(),0);
});
test('unknown final upload keeps known private ID and held lease; it cannot allocate or upload again',async()=>{
 const f=await fixture({summaryLost:true});await assert.rejects(continueReviewedStagedDaily(f),/operation_outcome_uncertain/);const doc=await f.state.inspect(),summary=Object.values(doc.intents).find(i=>i.payload.role==='release-summary');assert.equal(doc.paused,true);assert.ok(doc.lease);assert.equal(summary.status,'uncertain');assert.equal(summary.payload.fileId,'fixture-summary-id');assert.equal(doc.latestRelease,undefined);await assert.rejects(continueReviewedStagedDaily(f));assert.equal(f.uploads(),1);
});
test('claim CAS conflicts/lost response never trigger promotion or an automatic second claim',async()=>{
 for(const lost of[false,true]){const f=await fixture(),write=f.adapter.conditionalWrite.bind(f.adapter);let calls=0;f.adapter.conditionalWrite=async(...args)=>{calls++;if(lost)await write(...args);throw Error(lost?'storage_write_uncertain':'state_conflict');};await assert.rejects(continueReviewedStagedDaily(f));assert.equal(calls,1);assert(!f.calls.includes('promote'));assert.equal(f.uploads(),0);}
});

test('verification transport failure rolls back only when both pointers still positively belong to candidate',async()=>{
 for(const mixedPointers of[false,true]){const f=await fixture({publicUnavailable:true,mixedPointers});await assert.rejects(continueReviewedStagedDaily(f));const doc=await f.state.inspect();assert.equal(doc.paused,true);assert.ok(doc.lease);assert.equal(f.calls.filter(x=>x==='rollback').length,mixedPointers?0:1);assert.equal(doc.latestRelease,undefined);}
});
test('ordinary next-run rollback loader reads the real completed continuation summary format',async()=>{
 const f=await fixture();await continueReviewedStagedDaily(f);const document=await f.state.inspect(),summary=document.latestRelease.summary,bundle=f.bundle(),config=f.dependencies.evidenceConfig;
 const json=value=>new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
 const fetchImpl=async(url,options={})=>{
  if(url==='https://oauth2.googleapis.com/token')return json({token_type:'Bearer',access_token:'fixture-access-token-only',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file'});
  assert.equal(options.method,'GET');const parsed=new URL(url),folder=parsed.pathname.includes('/'+config.folderId);
  if(parsed.pathname.endsWith('/permissions'))return json({permissions:[{id:config.ownerPermissionId,type:'user',role:'owner',deleted:false}]});
  if(parsed.searchParams.get('alt')==='media')return new Response(bundle.bytes,{status:200});
  if(folder)return json({id:config.folderId,mimeType:'application/vnd.google-apps.folder',trashed:false,ownedByMe:true});
  return json({id:summary.fileId,name:'ltc-evidence-'+summary.sha256+'.json',mimeType:'application/json',ownedByMe:true,trashed:false,parents:[config.folderId],size:String(summary.length),appProperties:{sha256:summary.sha256,operationId:summary.operationId,payloadSha256:summary.payloadSha256}});
 };
 const manifest=await loadPreviousReleaseManifest({state:f.state,evidenceConfig:config,env:{LTC_GOOGLE_CLIENT_ID:'fixture-client-id.apps.googleusercontent.com',LTC_GOOGLE_CLIENT_SECRET:'fixture-secret-only-value',LTC_GOOGLE_REFRESH_TOKEN:'fixture-refresh-only-value'},fetchImpl});assert.equal(hash(manifest),f.review.artifactManifestSha256);
});

test('claim readback or receipt-save failure pauses claimed new lease before any provider effect',async()=>{
 for(const failure of['readback','save']){const f=await fixture();if(failure==='save'){f.dependencies.save=async value=>{if(value.status==='claimed-new-fence')throw Error('local save failed');};}else{const read=f.adapter.read.bind(f.adapter);let count=0;f.adapter.read=async(...args)=>{if(++count===2)throw Error('readback failed');return read(...args);};}
  await assert.rejects(continueReviewedStagedDaily(f));const current=await f.state.inspect();assert.equal(current.paused,true);assert.equal(current.lease.fence,7);assert.equal(current.stagedDailyContinuation.status,'held');assert(!f.calls.includes('promote'));assert.equal(f.uploads(),0);
 }
});
