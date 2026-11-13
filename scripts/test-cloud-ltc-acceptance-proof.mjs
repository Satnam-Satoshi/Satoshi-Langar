import test from 'node:test';
import assert from 'node:assert/strict';
import {receiptHash as h,validateStageAcceptanceReceipt as validate} from './cloud-ltc-acceptance-proof.mjs';
import {stageReceiptFixture} from './lib/test-acceptance-proof-fixture.mjs';
const fixture=options=>stageReceiptFixture({recovery:false,...options});

test('valid direct/recovered proofs report stage only and never authorize production',()=>{
 for(const recovery of [false,true]){const result=validate(fixture({recovery}));assert.equal(result.stageOnlyVerified,true);assert.equal(result.productionAuthorized,false);assert.equal(result.promotionAuthorized,false);assert.equal(result.rollbackVerified,false);assert.ok(Object.isFrozen(result))}
});
test('new approved controller differs from old tested digest: no self-digest receipt bootstrap loop',()=>{
 const f=fixture({recovery:true});assert.notEqual(f.pins.testedImplementationSha256,f.currentControllerImplementationSha256);assert.equal(validate(f).stageOnlyVerified,true);
 f.currentControllerImplementationSha256='e'.repeat(64);assert.throws(()=>validate(f),/controller_mismatch/);
});
test('missing required external pins are not accepted',()=>{
 const f=fixture();for(const field of Object.keys(f.pins)){const c=structuredClone(f);delete c.pins[field];assert.throws(()=>validate(c),undefined,field)}
});
test('state active, restored, leased or nonterminal cannot be stage accepted',()=>{
 for(const patch of [{paused:false},{restoreHold:true},{lease:{}},{fence:4}]){const f=fixture();Object.assign(f.document,patch);assert.throws(()=>validate(f))}
 const f=fixture();Object.values(f.document.intents)[0].status='uncertain';assert.throws(()=>validate(f));
});
test('every source/project/team/domain/folder/document binding is pinned',()=>{
 for(const field of ['repository','project','team','domains','folderId','websiteDocumentId','socialDocumentId','ownerPermissionId']){const f=fixture();f.document.acceptance.plan[field]=field==='domains'?['https://evil.example','https://other.example']:'changed_fixture';assert.throws(()=>validate(f),undefined,field)}
});
test('bitflips in plan/completion/verification and external pins fail',()=>{
 for(const mutate of [f=>f.document.acceptance.plan.source='f'.repeat(40),f=>f.document.acceptance.plan.buildOutputSha256='f'.repeat(64),f=>f.document.acceptance.completion.source='f'.repeat(40),f=>f.document.acceptance.completionSha256='f'.repeat(64),f=>f.pins.planSha256='f'.repeat(64),f=>f.pins.completionSha256='f'.repeat(64),f=>f.document.acceptance.completion.terminalProofSha256='f'.repeat(64)]){const f=fixture();mutate(f);assert.throws(()=>validate(f))}
});
test('all four verification flags must be exactly true',()=>{
 for(const field of ['fullRestoreVerified','publicBaselineVerified','publicUnchangedVerified','protectedStageVerified'])for(const value of [false,undefined,'true',1]){const f=fixture();f.document.acceptance.completion.verification[field]=value;assert.throws(()=>validate(f))}
});
test('wrong original/completing run, attempt, mode or controller cannot be substituted',()=>{
 for(const mutate of [f=>f.document.acceptance.fence++,f=>f.document.acceptance.runId='accept-123-2',f=>f.document.acceptance.completion.origin.attempt='2',f=>f.document.acceptance.completion.completedBy.runId='999',f=>f.document.acceptance.completion.completedBy.mode='scheduled',f=>f.document.acceptance.completion.controllerImplementationSha256='f'.repeat(64)]){const f=fixture();mutate(f);assert.throws(()=>validate(f))}
});
test('missing, orphan, modified proof/receipt and changed terminal status fail even with same outer completion',()=>{
 for(const mutate of [f=>delete f.document.receipts[Object.keys(f.document.receipts)[0]],f=>f.document.receipts.orphan={},f=>Object.values(f.document.intents)[0].proof.verifiedFixture=false,f=>Object.values(f.document.intents)[0].status='not-applied',f=>Object.values(f.document.receipts)[0].sha256='f'.repeat(64),f=>delete Object.values(f.document.intents)[0].payload]){const f=fixture();mutate(f);assert.throws(()=>validate(f))}
});
test('rehashed internal terminal receipt cannot evade pinned terminalProofSha',()=>{
 const f=fixture();const key=Object.keys(f.document.intents)[0];const intent=f.document.intents[key];intent.proof.verifiedFixture='tampered';intent.evidenceSha256=h(intent.proof);f.document.receipts[key]={receipt:structuredClone(intent),sha256:h(intent)};
 assert.throws(()=>validate(f),/terminal_proof_mismatch/);
});

function rechain(f){
 const a=f.document.acceptance,c=a.completion;
 for(const [key,i] of Object.entries(f.document.intents)){i.evidenceSha256=h(i.proof);f.document.receipts[key]={receipt:structuredClone(i),sha256:h(i)}}
 c.terminalProofSha256=h(Object.values(f.document.intents).filter(i=>i.fence===a.fence).sort((x,y)=>x.operationId.localeCompare(y.operationId)).map(i=>({operationId:i.operationId,payloadSha256:i.payloadSha256,status:i.status,evidenceSha256:i.evidenceSha256,receiptSha256:f.document.receipts[i.operationId].sha256})));
 c.verificationSha256=h(c.verification);a.completionSha256=h(c);f.pins.completionSha256=a.completionSha256;
}
test('stage-only result exposes pinned candidate URL/manifests while current controller remains separately approved',()=>{
 const f=fixture({recovery:true});const before=JSON.stringify(f);const result=validate(f);
 assert.equal(result.candidateDeployment,'dpl_Candidate');assert.equal(result.candidateUrl,'fixture-candidate.vercel.app');assert.equal(result.previousDeployment,'dpl_Fixture');assert.equal(result.source,f.pins.source);assert.equal(result.fence,3);
 for(const field of ['sourceManifestSha256','staticManifestSha256','buildOutputSha256','artifactPackageManifestSha256','previousPublicManifestSha256'])assert.equal(result[field],f.document.acceptance.plan[field]);
 assert.equal(JSON.stringify(f),before);assert.notEqual(result.currentControllerImplementationSha256,result.testedImplementationSha256);assert.notEqual(result.currentControllerImplementationSha256,result.completionControllerImplementationSha256);
});
test('nested applied envelope must bind exact operation/payload and cannot be replaced with a claimed leaf',()=>{
 for(const mutation of [i=>i.proof.operationId='other-operation',i=>i.proof.payloadSha256='f'.repeat(64),i=>i.proof.status='not-applied',i=>i.proof.proof=null,i=>i.proof={...i.proof.proof}]){
  const f=fixture();mutation(Object.values(f.document.intents)[0]);rechain(f);assert.throws(()=>validate(f),/applied_proof_invalid/);
 }
});
test('even fully rehashed stage proof cannot substitute candidate, unsafe URL, source or manifest digests',()=>{
 for(const [key,value]of Object.entries({kind:'vercel-promote',deployment:'dpl_Other',url:'https://external.invalid/',source:'f'.repeat(40),buildOutputSha256:'f'.repeat(64),artifactManifestSha256:'f'.repeat(64)})){
  const f=fixture();const stage=Object.values(f.document.intents).find(i=>i.payload.kind==='vercel-stage');stage.proof.proof[key]=value;rechain(f);assert.throws(()=>validate(f),/stage_proof_invalid/,key);
 }
 for(const field of ['candidateDeployment','previousDeployment','fence']){const f=fixture();f.pins[field]=field==='fence'?4:'dpl_Changed';assert.throws(()=>validate(f),undefined,field)}
});
test('every private evidence proof must prove the exact immutable bytes, parent and owner-only downloaded object',()=>{
 for(const [key,value]of Object.entries({fileId:'other_file',folderId:'other_folder',sha256:'f'.repeat(64),length:101,ownerPermissionId:'other_owner',ownerOnly:false,downloadVerified:false})){
  const f=fixture();const evidence=Object.values(f.document.intents).find(i=>i.payload.kind==='drive-evidence');evidence.proof.proof[key]=value;rechain(f);assert.throws(()=>validate(f),/evidence_proof_invalid/,key);
 }
});
test('fixed production targets cannot be changed even by replacing matching private binding pins',()=>{
 for(const [key,value]of Object.entries({repository:'Other/Repository',project:'prj_other_fixture',team:'team_other_fixture',domains:['https://other.example','https://second.example']})){
  const f=fixture();f.document.acceptance.plan[key]=value;f.pins.bindings[key]=value;assert.throws(()=>validate(f),/binding_mismatch/,key);
 }
});
test('retained UNKNOWN incident must be exact pinned completed-stage lineage, never hidden or accepted',()=>{
 const f=fixture({recovery:true,withIncident:true});assert.equal(validate(f).setupIncidentSha256,f.pins.setupIncidentSha256);
 const original=JSON.stringify(f.document.retiredSetupIncidents);validate(f);assert.equal(JSON.stringify(f.document.retiredSetupIncidents),original);
 for(const mutate of [g=>delete g.pins.setupIncidentSha256,g=>g.pins.setupIncidentSha256='f'.repeat(64),g=>delete g.document.unresolvedSetupIncident,g=>delete g.document.retiredSetupIncidents,g=>Object.values(g.document.retiredSetupIncidents)[0].unknownStage.status='not-applied',g=>g.document.unresolvedSetupIncident.accepted=true,g=>g.document.unresolvedSetupIncident.productionAuthorized=true,g=>delete g.document.acceptance.setupIncidentSha256]){
  const g=fixture({recovery:true,withIncident:true});mutate(g);assert.throws(()=>validate(g));
 }
 const clean=fixture();clean.pins.setupIncidentSha256='f'.repeat(64);assert.throws(()=>validate(clean),/incident_binding_mismatch/);
});
test('shared fixture accepts actual manifest arrays and binds stage/completion hashes to them',()=>{
 const candidateManifest=[{file:'index.html',sha256:'a'.repeat(64)}],previousManifest=[{file:'index.html',sha256:'b'.repeat(64)}];
 const f=stageReceiptFixture({candidateManifest,previousManifest,withIncident:true});const proof=validate(f);
 assert.equal(proof.staticManifestSha256,h(candidateManifest));assert.equal(proof.previousPublicManifestSha256,h(previousManifest));
 assert.equal(f.document.acceptance.completion.verification.staticManifestSha256,h(candidateManifest));
 const stage=Object.values(f.document.intents).find(i=>i.payload.kind==='vercel-stage');assert.equal(stage.proof.proof.artifactManifestSha256,h(candidateManifest));
});
