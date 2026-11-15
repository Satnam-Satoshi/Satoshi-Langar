import test from 'node:test';
import assert from 'node:assert/strict';
import {f33Hash as hash} from './cloud-ltc-f33-retirement-plan.mjs';
import {createF33RetirementCandidate,validateF33RetirementCandidate} from './cloud-ltc-f33-retirement-record.mjs';
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

test('canonical candidate retains UNKNOWN and reconstructs exact original',()=>{const f=fixture(),c=createF33RetirementCandidate(f),r=c.state.f33Retirement;assert.equal(r.status,'retired-paused');assert.equal(r.originalRows[34].status,'uncertain');assert.equal(r.outcome,'UNKNOWN');assert.equal(r.unknownAccepted,false);assert.deepEqual(r.originalReceipts,f.snapshot.receipts);assert.equal(validateF33RetirementCandidate(c.state,{expectedReviewSha256:f.expectedReviewSha256,expectedStateSha256:c.stateSha256,now:f.now}).valid,true);});
for(const [name,mutate] of [
 ['archive status',s=>s.f33Retirement.originalRows[34].status='not-applied'],
 ['receipt',s=>s.f33Retirement.originalReceipts['evidence-0'].sha256='a'.repeat(64)],
 ['proposal hash',s=>s.f33Retirement.proposalStateSha256='a'.repeat(64)],
 ['record status',s=>s.f33Retirement.status='confirmed'],
 ['schema',s=>s.f33Retirement.appliedRecordSchemaVersion=2],
 ['unknown accepted',s=>s.f33Retirement.unknownAccepted=true],
 ['unpause',s=>s.paused=false],
 ['lease',s=>s.lease={fence:34}],
 ['fence',s=>s.fence=35],
 ['extra record field',s=>s.f33Retirement.authorizeRetry=true],
 ['overlap',s=>s.intents['evidence-0']=s.f33Retirement.originalRows[0]],
 ['original fields',s=>s.f33Retirement.originalFields.lease.expiresAt++],
])test('reject '+name+' even with recomputed state hash',()=>{const f=fixture(),c=createF33RetirementCandidate(f);mutate(c.state);assert.throws(()=>validateF33RetirementCandidate(c.state,{expectedReviewSha256:f.expectedReviewSha256,expectedStateSha256:hash(c.state),now:f.now}));});
test('wrong external review pin denied',()=>{const f=fixture(),c=createF33RetirementCandidate(f);assert.throws(()=>validateF33RetirementCandidate(c.state,{expectedReviewSha256:'a'.repeat(64),expectedStateSha256:c.stateSha256,now:f.now}));});
