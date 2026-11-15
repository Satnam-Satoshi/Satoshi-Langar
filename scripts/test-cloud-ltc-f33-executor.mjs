import test from 'node:test';
import assert from 'node:assert/strict';
import { executeF33Retirement } from './cloud-ltc-f33-executor.mjs';
import { f33Hash as hash } from './cloud-ltc-f33-retirement-plan.mjs';
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

function harness(){
 const f=fixture();let sent=0,reserved=0,reads=0,raw=null,finished=null;
 const a={now:()=>f.now,readVerifiedInputs:async()=>{reads++;return {snapshot:structuredClone(f.snapshot),snapshotVersion:f.snapshotVersion,evidence:structuredClone(f.evidence)};},
 authorizeOwner:async(token,binding)=>{assert.equal(token,'owner-token');assert.equal(binding.action,'retire-paused-only');return {assertValid:()=>true};},
 acquireBarrier:async()=>({assertHeld:()=>true}),
 reserveReceipt:async r=>{assert.equal(++reserved,1);return {assertReserved:()=>true};},
 compareAndSwap:async(r,{beforeSend})=>{beforeSend();sent++;raw=r.envelope;},
 readEnvelope:async()=>({raw,revision:'revision-34'}),finishReceipt:async(_,r)=>{finished=r;}};
 return {f,a,call:()=>executeF33Retirement({review:f.review,expectedReviewSha256:f.expectedReviewSha256,authorizationToken:'owner-token'},a),stats:()=>({sent,reserved,reads,finished})};
}
test('single CAS, nonce-bound verification, paused only, no release authority',async()=>{const h=harness();const r=await h.call();assert.equal(r.status,'verified-paused-retirement');assert.equal(r.retryAllowed,false);assert.equal(r.barrierReleaseAllowed,false);assert.equal(h.stats().sent,1);assert.equal(h.stats().reads,2);});
for(const [name,change] of [
 ['untrusted authority flag',h=>h.a.authorizeOwner=async()=>true],
 ['barrier flag',h=>h.a.acquireBarrier=async()=>({durable:true})],
 ['async guard',h=>h.a.acquireBarrier=async()=>({assertHeld:async()=>true})],
 ['reservation flag',h=>h.a.reserveReceipt=async()=>({durable:true})],
 ['reservation uncertain',h=>h.a.reserveReceipt=async()=>{throw Error('private');}],
 ['invalid snapshot',h=>h.f.snapshot.fence=34],
 ['changed second snapshot',h=>{const original=h.a.readVerifiedInputs;let n=0;h.a.readVerifiedInputs=async()=>{const v=await original();if(++n===2)v.snapshot.paused=true;return v;};}],
 ['revoked authority after reservation',h=>{let valid=true;h.a.authorizeOwner=async()=>({assertValid:()=>valid});h.a.reserveReceipt=async()=>{valid=false;return {assertReserved:()=>true};};}]
])test(name+' fails before send',async()=>{const h=harness();change(h);await assert.rejects(h.call);assert.equal(h.stats().sent,0);});
test('transport failure and original-state observation remain uncertain, no retry',async()=>{const h=harness();let attempts=0;h.a.compareAndSwap=async(_,c)=>{c.beforeSend();attempts++;throw Error('token secret');};h.a.readEnvelope=async()=>({raw:JSON.stringify(h.f.snapshot),revision:'revision-33'});assert.equal((await h.call()).status,'outcome-uncertain');assert.equal(attempts,1);});
test('lost response verified only by exact invocation readback',async()=>{const h=harness(),send=h.a.compareAndSwap;h.a.compareAndSwap=async(...args)=>{await send(...args);throw Error('lost');};assert.equal((await h.call()).status,'verified-paused-retirement');});
test('semantic equality with another nonce cannot confirm',async()=>{const h=harness();let raw;h.a.compareAndSwap=async(r,c)=>{c.beforeSend();const v=JSON.parse(r.envelope);v.writeNonce='11111111-1111-4111-8111-111111111111';raw=JSON.stringify(v);};h.a.readEnvelope=async()=>({raw,revision:'revision-34'});assert.equal((await h.call()).status,'outcome-uncertain');});
test('missing final transport guard cannot confirm',async()=>{const h=harness();let raw;h.a.compareAndSwap=async r=>{raw=r.envelope;};h.a.readEnvelope=async()=>({raw,revision:'revision-34'});assert.equal((await h.call()).status,'outcome-uncertain');});
test('duplicate send guard rejects second invocation',async()=>{const h=harness();let sends=0;h.a.compareAndSwap=async(_,c)=>{c.beforeSend();sends++;c.beforeSend();sends++;};assert.equal((await h.call()).status,'outcome-uncertain');assert.equal(sends,1);});
test('barrier lost during credential wait prevents send',async()=>{const h=harness();let held=true;h.a.acquireBarrier=async()=>({assertHeld:()=>held});h.a.compareAndSwap=async(_,c)=>{await Promise.resolve();held=false;c.beforeSend();assert.fail('send');};assert.equal((await h.call()).status,'outcome-uncertain');});
test('failed durable finalization is not reported complete',async()=>{const h=harness();h.a.finishReceipt=async()=>{throw Error('secret');};assert.equal((await h.call()).status,'receipt-finalization-uncertain');});
test('unreadable readback is uncertain',async()=>{const h=harness();h.a.readEnvelope=async()=>{throw Error('private');};assert.equal((await h.call()).status,'outcome-uncertain');});
test('durable incident reservation refuses second invocation before CAS',async()=>{const h=harness();await h.call();await assert.rejects(h.call);assert.equal(h.stats().sent,1);});
test('fresh updated observation times bind final candidate before authorization',async()=>{const h=harness(),read=h.a.readVerifiedInputs;let n=0;h.a.readVerifiedInputs=async()=>{const v=await read();if(++n===2){h.f.now+=1000;for(const p of [v.evidence.origin,v.evidence.controls,v.evidence.publicBaseline,v.evidence.unknownObservation,...v.evidence.confirmedReadbacks])p.observedAt=new Date(h.f.now).toISOString();}return v;};assert.equal((await h.call()).status,'verified-paused-retirement');});
test('reservation delay expiring evidence blocks CAS',async()=>{const h=harness();h.a.reserveReceipt=async()=>{h.f.now+=300001;return {assertReserved:()=>true};};await assert.rejects(h.call,/stale_proof/);assert.equal(h.stats().sent,0);});
test('credential wait expiring evidence blocks transport',async()=>{const h=harness();let sent=0;h.a.compareAndSwap=async(_,c)=>{h.f.now+=300001;c.beforeSend();sent++;};assert.equal((await h.call()).status,'outcome-uncertain');assert.equal(sent,0);});
test('canonical retired-paused candidate is bound before owner approval and transport',async()=>{const h=harness();let approved;h.a.authorizeOwner=async(_,binding)=>{approved=binding.proposedStateSha256;return {assertValid:()=>true};};const send=h.a.compareAndSwap;h.a.compareAndSwap=async(request,c)=>{const envelope=JSON.parse(request.envelope);assert.equal(envelope.value.f33Retirement.status,'retired-paused');assert.equal(hash(envelope.value),approved);assert.equal(envelope.value.f33Retirement.proposalStateSha256,request.proposalStateSha256);return send(request,c);};assert.equal((await h.call()).status,'verified-paused-retirement');});
