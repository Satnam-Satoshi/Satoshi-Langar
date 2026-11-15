import test from 'node:test';
import assert from 'node:assert/strict';
import {f33Hash as hash} from './cloud-ltc-f33-retirement-plan.mjs';
import {createF33RetirementCandidate} from './cloud-ltc-f33-retirement-record.mjs';
import {executeF33FreshActivation} from './cloud-ltc-f33-fresh-activation.mjs';
import {encodeStateEnvelope} from './cloud-ltc-state-envelope.mjs';
function fixture(){
 const now=Date.parse('2026-11-14T17:00:00Z'),stamp=new Date(now).toISOString();
 const snapshot={schemaVersion:1,paused:false,restoreHold:false,fence:33,lease:{runId:'gha-43608206507-1',fence:33,expiresAt:now-1,publicationDate:'2026-11-14'},intents:{},receipts:{},latestRelease:{editionId:'2026-11-13-r1',deployment:'dpl_synthetic_baseline',source:'80f0227ba74da75163f8528a3a24a2db54b2da3e',artifactManifestSha256:'a'.repeat(64),summary:{operationId:'old-summary'}},archiveHead:{summaryOperationId:'old-summary'},untouchedHistory:{preserve:true}};
 const confirmedReadbacks=[];
 for(let i=0;i<51;i++){
  const operationId=i===34?'evidence-3f4c009e11e060fe0b51b84fa26e3cf6293a5c9a71c62dc43459f62ec37ca859':`evidence-${i}`;
  const payload={kind:'drive-evidence',role:'release-artifacts',generation:'f33-7092158f2193ac73',artifactPackageManifestSha256:'e83bf0e6aeb88e01f7fb49bfa5d602f5319a023971f6cfdfc0ffade7a1de4727',artifactBundleCount:51,artifactBundleIndex:i,fileId:i===34?'reserved-uncertain-file':`reserved-file-${i}`,folderId:'private-folder-id',sha256:i===34?'048213a85dd7763cf42b2f600b8971ee429572dab325c711e6e1de9404f2bea5':hash(i),bytes:i===34?1253443:100+i};
  const row={operationId,payload,payloadSha256:hash(payload),fence:33,runId:'gha-43608206507-1',status:i<34?'confirmed':i===34?'uncertain':'pending',evidenceSha256:null};
  if(i<34){row.proof={operationId,payloadSha256:row.payloadSha256,status:'applied',proof:{fileId:payload.fileId,folderId:payload.folderId,sha256:payload.sha256,length:payload.bytes,ownerPermissionId:'owner-permission',ownerOnly:true,downloadVerified:true}};row.evidenceSha256=hash(row.proof);snapshot.receipts[operationId]={receipt:structuredClone(row),sha256:hash(row)};confirmedReadbacks.push({observedAt:stamp,operationId,payloadSha256:row.payloadSha256,...row.proof.proof});}
  snapshot.intents[operationId]=row;
 }
 const review={schemaVersion:1,kind:'f33-retirement-proposal',authorization:'proposal-only',authorizePublication:false,authorizeReplay:false,authorizeUnpause:false,repository:'Satnam-Satoshi/Satoshi-Langar',ledgerKey:'website',snapshotVersion:'revision-33',snapshotSha256:hash(snapshot),latestReleaseSha256:hash(snapshot.latestRelease),archiveHeadSha256:hash(snapshot.archiveHead),workflowHead:'b'.repeat(40),sourceHead:'c'.repeat(40),sourcePolicySha256:'d'.repeat(64),folderId:'private-folder-id',ownerPermissionId:'owner-permission',uncertainFileId:'reserved-uncertain-file',expectedDeployment:'dpl_synthetic_baseline'};
 const u=Object.values(snapshot.intents)[34];
 const evidence={origin:{observedAt:stamp,repository:review.repository,id:43608206507,run_attempt:1,status:'completed',conclusion:'failure',head_branch:'main',head_sha:review.workflowHead,event:'workflow_dispatch',path:'.github/workflows/ltc-daily-publication.yml'},controls:{observedAt:stamp,repository:review.repository,sourceHead:review.sourceHead,sourcePolicySha256:review.sourcePolicySha256,cloudPublicationEnabled:false,localPublisherDisabled:true,otherWritersStopped:true,activeWriterCount:0,writerEvidenceSha256:'e'.repeat(64)},publicBaseline:{observedAt:stamp,artifactManifestSha256:snapshot.latestRelease.artifactManifestSha256,manifestCount:99,domains:['https://ltcmagazine.org','https://satnamsatoshi.com'].map(domain=>({domain,deployment:snapshot.latestRelease.deployment,allManifestBytesVerified:true,verifiedCount:99}))},confirmedReadbacks,unknownObservation:{observedAt:stamp,operationId:u.operationId,payloadSha256:u.payloadSha256,fileId:u.payload.fileId,observed:'unknown',diagnostic:'evidence_known_file_not_found',snapshotSha256:review.snapshotSha256}};
 const f={snapshot,snapshotVersion:'revision-33',review,evidence,now};f.pin=()=>{review.snapshotSha256=hash(snapshot);evidence.unknownObservation.snapshotSha256=review.snapshotSha256;f.expectedReviewSha256=hash(review);};f.pin();return f;
}
function pair() {
 const original=fixture();
 original.snapshot.archiveHead={schemaVersion:1,summaryOperationId:'old-summary',summaryFileId:'old-summary-file',summaryFolderId:'private-folder-id',summarySha256:'a'.repeat(64),backupSha256:'b'.repeat(64),archiveProofSha256:'c'.repeat(64),previousArchiveSha256:null,archivedIntentCount:0,archivedReceiptCount:0};
 original.review.archiveHeadSha256=hash(original.snapshot.archiveHead);original.pin();
 const snapshot=createF33RetirementCandidate(original).state;
 const configuration={schemaVersion:1,kind:'f33-fresh-website-admission',snapshotSha256:hash(snapshot),retirementSha256:hash(snapshot.f33Retirement),implementationSha256:'1'.repeat(64),writerExclusionSha256:'2'.repeat(64),completionReceiptSha256:'3'.repeat(64),sourceCommit:'4'.repeat(40),previousDeployment:snapshot.latestRelease.deployment,publicationDate:'2026-11-15',ownerRunId:'123',ownerAttempt:1,websiteOnly:true,allowOldGenerationReplay:false,acceptUnknown:false};
 return {snapshot,configuration};
}

function setup() {
 const {snapshot,configuration}=pair(),now=Date.parse('2026-11-15T12:00:00Z');
 const nonce='12345678-1234-4234-8234-123456789abc',envelope=encodeStateEnvelope('website',snapshot,nonce);
 const receipt={schemaVersion:1,kind:'f33-recovery-reservation',status:'finished',request:{incident:'gha-43608206507-1/fence33',action:'retire-paused-only',proposedStateSha256:hash(snapshot),nonce,envelope,envelopeSha256:hash(envelope)},result:{status:'verified-paused-retirement',nonce,envelopeSha256:hash(envelope),publicationPerformed:false,retryAllowed:false,barrierReleaseAllowed:false}};
 configuration.completionReceiptSha256=hash(receipt);
 const native={runId:'123',workflowSha:'a'.repeat(40),sourceSha:configuration.sourceCommit,executedSourceSha:configuration.sourceCommit,environmentId:27323462394,workflowPath:'.github/workflows/ltc-f33-fresh-activation.yml',expectedAdmissionSha256:hash(configuration)};
 const run={id:123,run_attempt:1,repository:{full_name:'Satnam-Satoshi/Satoshi-Langar'},event:'workflow_dispatch',head_branch:'main',head_sha:native.workflowSha,path:native.workflowPath,status:'in_progress'};
 const jobs={total_count:3,jobs:[{id:1,name:'owner-approval',run_id:123,run_attempt:1,head_sha:native.workflowSha,status:'completed',conclusion:'success'},{id:2,name:'activate-fresh-website-once',run_id:123,run_attempt:1,head_sha:native.workflowSha,status:'in_progress',conclusion:null},{id:3,name:'read-only-preflight',run_id:123,run_attempt:1,head_sha:native.workflowSha,status:'completed',conclusion:'skipped'}]};
 const approval=[{state:'approved',user:{id:268053325,type:'User'},environments:[{id:27323462394,name:'ltc-receipt-owner-approval'}]}];
 const responses=[run,jobs,approval];let writes=0,raw=envelope,revision='retired-revision';
 const dependencies={clock:()=>now,fetchImpl:async()=>new Response(JSON.stringify(responses.shift()),{headers:{'content-type':'application/json'}}),verifyImplementation:async(implementation,source)=>{assert.equal(implementation,configuration.implementationSha256);assert.equal(source,configuration.sourceCommit);},acquireExclusion:async()=>({assertHeld:()=>true}),readState:async()=>({value:structuredClone(snapshot),version:'retired-revision'}),readFinishedReceipt:async()=>structuredClone(receipt),verifyPublicBaseline:async()=>{},verifyPublicPointers:async()=>{},compareAndSwapExact:async(request,{beforeSend})=>{beforeSend();writes++;raw=request.envelope;revision='fresh-revision';},readRawEnvelope:async()=>({raw,revision}),saveResult:async()=>{}};
 return {args:{configuration,native,token:'synthetic'},dependencies,receipt,writes:()=>writes};
}
test('native owner gated fresh activation performs one CAS and exact readback',async()=>{const f=setup(),result=await executeF33FreshActivation(f.args,f.dependencies);assert.equal(result.status,'fresh-website-admission-verified');assert.equal(f.writes(),1);assert.equal(result.publicationPerformed,false);assert.equal(result.barrierReleaseAllowed,false);});
test('missing exclusion capability stops before transport',async()=>{const f=setup();f.dependencies.acquireExclusion=async()=>null;await assert.rejects(executeF33FreshActivation(f.args,f.dependencies),/exclusion_required/);assert.equal(f.writes(),0);});
test('old retirement receipt cannot be treated as fresh publication authority',async()=>{const f=setup();f.args.native.workflowPath='.github/workflows/ltc-f33-paused-retirement.yml';await assert.rejects(executeF33FreshActivation(f.args,f.dependencies));assert.equal(f.writes(),0);});
test('changed finished receipt rejects before write',async()=>{const f=setup();f.receipt.result.barrierReleaseAllowed=true;await assert.rejects(executeF33FreshActivation(f.args,f.dependencies),/receipt_binding/);assert.equal(f.writes(),0);});
test('known lost write response only accepted by exact readback',async()=>{const f=setup(),write=f.dependencies.compareAndSwapExact;f.dependencies.compareAndSwapExact=async(...args)=>{await write(...args);throw Error('lost');};assert.equal((await executeF33FreshActivation(f.args,f.dependencies)).status,'fresh-website-admission-verified');assert.equal(f.writes(),1);});
test('unchanged readback after lost response is uncertain and never retried',async()=>{const f=setup();let sends=0;f.dependencies.compareAndSwapExact=async(_, {beforeSend})=>{beforeSend();sends++;throw Error('lost');};const result=await executeF33FreshActivation(f.args,f.dependencies);assert.equal(result.status,'admission-outcome-uncertain');assert.equal(sends,1);assert.equal(result.retryAllowed,false);});
test('expired exclusion after waits prevents CAS',async()=>{const f=setup();let n=0;f.dependencies.acquireExclusion=async()=>({assertHeld:()=>++n===1});await assert.rejects(executeF33FreshActivation(f.args,f.dependencies),/authority_lost/);assert.equal(f.writes(),0);});
test('result persistence failure remains uncertain',async()=>{const f=setup();f.dependencies.saveResult=async()=>{throw Error('storage');};assert.equal((await executeF33FreshActivation(f.args,f.dependencies)).status,'admission-result-retention-uncertain');assert.equal(f.writes(),1);});

test('real exact-CAS adapter preserves receipt and sends once under native request guard',async()=>{
 const {createF33FreshProvider}=await import('./cloud-ltc-f33-fresh-provider.mjs');
 const f=setup(),snapshot=(await f.dependencies.readState()).value;
 const rows={ledger:{raw:encodeStateEnvelope('website',snapshot),revision:'retired-revision'},receipt:{raw:encodeStateEnvelope('website',f.receipt),revision:'receipt-revision'}};let writes=0;
 const provider=await createF33FreshProvider({ledgerConfig:{documentId:'ledger',folderId:'private-folder'},receiptConfig:{documentId:'receipt',folderId:'private-folder'},ownerPermissionId:'owner',runtimeFactory:async({config,beforeWrite})=>({client:{
 verifySelectedResources:async()=>{},getFileMetadata:async()=>({status:200,body:{id:config.documentId,mimeType:'application/vnd.google-apps.document',trashed:false,ownedByMe:true,shared:false,capabilities:{canEdit:true},parents:['private-folder'],permissions:[{id:'owner'}]}}),
 getDocument:async()=>{const {raw,revision}=rows[config.documentId];return {status:200,body:{documentId:config.documentId,revisionId:revision,tabs:[{tabProperties:{tabId:'tab'},documentTab:{body:{content:[{endIndex:1,sectionBreak:{}},{startIndex:1,endIndex:raw.length+2,paragraph:{elements:[{startIndex:1,endIndex:raw.length+2,textRun:{content:raw+'\n'}}]}}]}}}]}};},
 batchUpdateDocument:async(id,body)=>{beforeWrite();assert.equal(id,'ledger');assert.equal(body.writeControl.requiredRevisionId,'retired-revision');writes++;rows.ledger.raw=body.requests.at(-1).insertText.text;rows.ledger.revision='new-revision';return {status:200};}
 }})});
 const receiptBefore=rows.receipt.raw,result=await executeF33FreshActivation(f.args,{...f.dependencies,...provider});
 assert.equal(result.status,'fresh-website-admission-verified');assert.equal(writes,1);assert.equal(rows.receipt.raw,receiptBefore);
 await assert.rejects(provider.compareAndSwapExact({}, {beforeSend:()=>{}}),/single_attempt/);assert.equal(writes,1);
});

test('slow full-byte scan precedes fresh proof acquisition and is not repeated',async()=>{
 const f=setup();let now=Date.parse('2026-11-15T12:00:00Z'),scan=0,proofTime=null,pointers=0;
 f.dependencies.clock=()=>now;
 f.dependencies.verifyPublicBaseline=async()=>{scan++;assert.equal(proofTime,null);now+=600000;};
 f.dependencies.acquireExclusion=async()=>{proofTime=now;return {assertHeld:()=>now-proofTime<300000};};
 f.dependencies.verifyPublicPointers=async()=>{pointers++;assert.equal(now,proofTime);now+=1000;};
 const r=await executeF33FreshActivation(f.args,f.dependencies);
 assert.equal(r.status,'fresh-website-admission-verified');assert.equal(scan,1);assert.equal(pointers,1);assert.equal(f.writes(),1);
});
test('slow post-proof pointer read still expires authority without writes',async()=>{
 const f=setup();let now=Date.parse('2026-11-15T12:00:00Z');f.dependencies.clock=()=>now;
 f.dependencies.verifyPublicPointers=async()=>{now+=300001;};
 await assert.rejects(executeF33FreshActivation(f.args,f.dependencies));assert.equal(f.writes(),0);
});
test('changed post-proof alias blocks admission without writes',async()=>{
 const f=setup();f.dependencies.verifyPublicPointers=async()=>{throw Error('public_changed');};
 await assert.rejects(executeF33FreshActivation(f.args,f.dependencies),/public_changed/);assert.equal(f.writes(),0);
});
