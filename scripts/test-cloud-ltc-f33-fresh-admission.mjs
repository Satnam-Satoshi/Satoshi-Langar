import test from 'node:test';
import assert from 'node:assert/strict';
import {f33Hash as hash} from './cloud-ltc-f33-retirement-plan.mjs';
import {createF33RetirementCandidate} from './cloud-ltc-f33-retirement-record.mjs';
import {proposeF33FreshAdmission,assertF33Transition} from './cloud-ltc-f33-fresh-admission.mjs';
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
test('exact proposal preserves all archive and baseline, permits only separate admission',()=>{
 const {snapshot,configuration}=pair(), next=proposeF33FreshAdmission(snapshot,configuration);
 assert.deepEqual(next.f33Retirement,snapshot.f33Retirement);assert.deepEqual(next.latestRelease,snapshot.latestRelease);assert.equal(next.paused,false);
 assert.doesNotThrow(()=>assertF33Transition(snapshot,next,configuration));
 assert.throws(()=>assertF33Transition(snapshot,next),/review_required/);
 assert.throws(()=>assertF33Transition(snapshot,{...snapshot,paused:false},configuration),/admission_required/);
});
for(const [label,mutate] of [
 ['remove archive',s=>delete s.f33Retirement],['accept unknown',s=>s.f33Retirement.unknownAccepted=true],
 ['change archived receipt',s=>s.f33Retirement.originalReceipts['evidence-0'].sha256='0'.repeat(64)],
 ['remove admission',s=>delete s.f33FreshAdmission],['regress fence',s=>s.fence=33],['infinite fence',s=>s.fence=Infinity],['malformed checkpoint',s=>s.latestRelease={bad:true}],
 ['old intent',s=>s.intents['evidence-0']=structuredClone(s.f33Retirement.originalRows[0])],
 ['old file',s=>s.intents.new={operationId:'new',fence:35,runId:'new-run',payload:{fileId:s.f33Retirement.originalRows[0].payload.fileId}}],
 ['old generation',s=>s.intents.new={operationId:'new',fence:35,runId:'new-run',payload:{generation:'f33-7092158f2193ac73'}}],
 ['old package',s=>s.intents.new={operationId:'new',fence:35,runId:'new-run',payload:{artifactPackageManifestSha256:s.f33Retirement.originalRows[0].payload.artifactPackageManifestSha256}}],
 ['old run',s=>s.lease={runId:'gha-43608206507-1',fence:35}],
 ['old fence new intent',s=>s.intents.new={operationId:'new',fence:34,runId:'new-run'}],
 ['undated lease',s=>{s.fence=35;s.lease={runId:'new-run',fence:35};}],
])test('reject '+label,()=>{const {snapshot,configuration}=pair(), admitted=proposeF33FreshAdmission(snapshot,configuration),next=structuredClone(admitted);mutate(next);assert.throws(()=>assertF33Transition(admitted,next,configuration),/f33_fresh_/);});
test('snapshot and receipt review pins cannot be changed',()=>{const {snapshot,configuration}=pair();assert.throws(()=>proposeF33FreshAdmission({...snapshot,fence:35},configuration),/snapshot_changed/);const admitted=proposeF33FreshAdmission(snapshot,configuration);assert.throws(()=>assertF33Transition(admitted,admitted,{...configuration,completionReceiptSha256:'0'.repeat(64)}),/admission_changed/);});
test('ordinary non-F33 ledgers remain unchanged; cannot inject retirement',()=>{assert.doesNotThrow(()=>assertF33Transition({paused:true},{paused:false}));const {snapshot}=pair();assert.throws(()=>assertF33Transition({},snapshot),/dedicated_retirement_required/);});

test('shared Docs boundary rejects legacy direct CAS before provider write',async()=>{
 const {GoogleDocsStateAdapter}=await import('./cloud-ltc-docs-state.mjs');
 const {encodeStateEnvelope}=await import('./cloud-ltc-state-envelope.mjs');
 const {snapshot,configuration}=pair();const raw=encodeStateEnvelope('website',snapshot);let writes=0;
 const client={getFileMetadata:async()=>({status:200,body:{id:'document-id',mimeType:'application/vnd.google-apps.document',trashed:false,ownedByMe:true,shared:false,capabilities:{canEdit:true},parents:['folder-id']}}),getDocument:async()=>({status:200,body:{documentId:'document-id',revisionId:'revision-fresh',tabs:[{tabProperties:{tabId:'tab'},documentTab:{body:{content:[{endIndex:1,sectionBreak:{}},{startIndex:1,endIndex:raw.length+2,paragraph:{elements:[{startIndex:1,endIndex:raw.length+2,textRun:{content:raw+'\n'}}]}}]}}}]}}),batchUpdateDocument:async()=>{writes++;return {status:200,body:{documentId:'document-id',writeControl:{requiredRevisionId:'revision-after'}}};}};
 const legacy=new GoogleDocsStateAdapter({documentId:'document-id',folderId:'folder-id',client});
 await assert.rejects(legacy.conditionalWrite('website',{...snapshot,paused:false},'revision-fresh'),/review_required/);assert.equal(writes,0);
 const fresh=new GoogleDocsStateAdapter({documentId:'document-id',folderId:'folder-id',client,f33Admission:configuration});
 await assert.rejects(fresh.conditionalWrite('website',{...snapshot,paused:false},'revision-fresh'),/admission_required/);assert.equal(writes,0);
 assert.equal(await fresh.conditionalWrite('website',proposeF33FreshAdmission(snapshot,configuration),'revision-fresh'),'revision-after');assert.equal(writes,1);
});

test('reject malformed date and zero owner run',()=>{const {snapshot,configuration}=pair();for(const change of [{publicationDate:'2026-99-99'},{ownerRunId:'0'}])assert.throws(()=>proposeF33FreshAdmission(snapshot,{...configuration,...change}),/review_required/);});
