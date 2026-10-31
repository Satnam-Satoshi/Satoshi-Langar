import {setupQuarantineFixture} from './lib/test-setup-quarantine-fixture.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {hash,buildOwnerQuarantinedSetupTransition as build,assertSetupIncidentsForStage as stage,assertSetupIncidentsForProduction as production} from './cloud-ltc-setup-quarantine.mjs';
test('pure incident quarantine preserves UNKNOWN, evidence archive and prohibits production',()=>{const f=setupQuarantineFixture();const before=JSON.stringify(f);const r=build(f);assert.equal(JSON.stringify(f),before);const n=r.nextDocument;assert.equal(n.paused,true);assert.equal(n.lease,null);assert.equal(n.fence,2);assert.equal(n.unresolvedSetupIncident.outcome,'UNKNOWN');assert.equal(n.retiredSetupIncidents[r.incidentSha256].unknownStage.status,'uncertain');assert.equal(n.retiredSetupIncidents[r.incidentSha256].bannedOperationIds.length,37);assert.equal(r.productionAuthorized,false);assert.throws(()=>production(n),/production_quarantined/);});
test('new stage requires EXACT protected incident pin and a distinct plan; no implicit acceptance',()=>{const r=build(setupQuarantineFixture());const q={document:r.nextDocument,protectedIncidentSha256:r.incidentSha256,newPlanSha256:hash('fresh')};assert.equal(stage(q).stageOnlyAllowed,true);assert.equal(stage(q).productionAuthorized,false);for(const pin of [undefined,hash('wrong')])assert.throws(()=>stage({...q,protectedIncidentSha256:pin}));assert.throws(()=>stage({...q,newPlanSha256:r.nextDocument.retiredSetupIncidents[r.incidentSha256].originalPlanSha256}));});
test('missing founder/manual approval, mismatched actor, plan/source/controller/fence fail',()=>{for(const [key,value]of Object.entries({authority:'generic-autonomy',event:'schedule',ref:'refs/heads/other',actorId:'222',originCompleted:false,source:'d'.repeat(40),testedImplementationSha256:'d'.repeat(64),controllerImplementationSha256:'d'.repeat(64),fence:2,protectedDecisionSha256:hash('wrong')})){const f=setupQuarantineFixture();f.decision[key]=value;assert.throws(()=>build(f),undefined,key)}});
test('preparation and provider facts are fresh against independent runtime clock',()=>{for(const mode of ['clock','isolation','archive','future']){const f=setupQuarantineFixture();if(mode==='clock')f.now+=300001;else if(mode==='isolation')f.isolation.checkedAt='2026-10-30T15:00:00Z';else if(mode==='archive')f.archiveProof.checkedAt='2026-10-30T15:00:00Z';else f.isolation.checkedAt='2026-10-30T17:00:00Z';assert.throws(()=>build(f))}});
test('any scheduling, hook, integration, mutable function or changed public/source artifact prevents quarantine',()=>{for(const [key,value]of Object.entries({projectCronCount:1,deployHookCount:1,webhookCount:1,integrationConfigurationCount:1,buildOutputCronsAbsent:false,vercelConfigCronsAbsent:false,skipDomainOnly:false,prebuiltOnly:false,allFunctionsReadOnly:false,publicUnchanged:false,socialPaused:false,socialUnknownOperations:1,previousDeployment:'dpl_Changed',buildOutputSha256:hash('changed')})){const f=setupQuarantineFixture();f.isolation[key]=value;assert.throws(()=>build(f),undefined,key)}});
test('wrong/running original attempt or social in-flight writer is rejected',()=>{for(const mutate of [f=>f.isolation.origin.status='in_progress',f=>f.isolation.origin.attempt='2',f=>f.isolation.origin.path='other.yml',f=>f.isolation.socialLease={},f=>f.decision.decisionRunId='123']){const f=setupQuarantineFixture();mutate(f);assert.throws(()=>build(f))}});
test('unverified, partial or nonprivate archive never permits lease removal',()=>{for(const patch of [{downloadVerified:false},{privateSingleOwner:false},{bytes:1},{downloadedSha256:hash('wrong')},{folderId:'wrong_fixture'},{ownerPermissionId:'other_fixture'}]){const f=setupQuarantineFixture();Object.assign(f.archiveProof,patch);assert.throws(()=>build(f))}});
test('tampering old state/receipt, missing part or extra side effect is rejected',()=>{for(const mutate of [f=>delete f.document.receipts[Object.keys(f.document.receipts)[0]],f=>Object.values(f.document.intents)[0].status='uncertain',f=>Object.values(f.document.intents)[0].payload.kind='git-ref',f=>f.document.latestRelease={},f=>f.document.lease=null,f=>f.document.paused=false,f=>f.document.intents.extra={payload:{kind:'vercel-promote'}},f=>f.document.acceptance.status='completed']){const f=setupQuarantineFixture();mutate(f);assert.throws(()=>build(f))}});
test('incident cannot be hidden, tampered, multiplied or reused as generic lease clearance',()=>{for(const mutate of [n=>delete n.unresolvedSetupIncident,n=>Object.values(n.retiredSetupIncidents)[0].unknownStage.status='not-applied',n=>n.retiredSetupIncidents.extra={},n=>n.fence++,n=>n.intents.extra={},n=>n.unresolvedSetupIncident.accepted=true]){const r=build(setupQuarantineFixture());mutate(r.nextDocument);assert.throws(()=>stage({document:r.nextDocument,protectedIncidentSha256:r.incidentSha256,newPlanSha256:hash('fresh')}))}});
function repin(f){const sh=hash(f.document);f.decision.originalStateSha256=sh;Object.assign(f.archiveProof,{originalStateSha256:sh,downloadedSha256:sh,bytes:Buffer.byteLength(JSON.stringify(f.document))});f.decision.protectedIsolationSha256=hash(f.isolation);f.decision.protectedArchiveProofSha256=hash(f.archiveProof);Object.assign(f.decision.statement,{originalStateSha256:sh,isolationSha256:f.decision.protectedIsolationSha256,archiveProofSha256:f.decision.protectedArchiveProofSha256});f.decision.protectedDecisionSha256=hash(f.decision.statement)}
test('even freshly rebound approval pins cannot legalize excluded effects or broken prior receipts',()=>{for(const mutate of [f=>delete f.document.receipts[Object.keys(f.document.receipts)[0]],f=>Object.values(f.document.intents)[0].status='uncertain',f=>f.isolation.webhookCount=1,f=>f.isolation.projectCronCount=1,f=>f.archiveProof.downloadVerified=false,f=>f.document.latestRelease={},f=>Object.values(f.document.intents).find(i=>i.payload.kind==='vercel-stage').status='not-applied']){const f=setupQuarantineFixture();mutate(f);repin(f);assert.throws(()=>build(f))}});

test('specific human approval persists across CI delay; preparation and provider facts remain fresh',()=>{
 const f=setupQuarantineFixture();f.decision.approvedAt='2026-10-01T12:00:00Z';f.decision.statement.approvedAt=f.decision.approvedAt;f.decision.protectedDecisionSha256=hash(f.decision.statement);
 assert.equal(build(f).productionAuthorized,false);
 for(const change of [g=>g.decision.approvedAt='2026-10-30T17:00:00Z',g=>g.decision.preparedAt='2026-10-30T15:00:00Z',g=>g.isolation.checkedAt='2026-10-30T15:00:00Z',g=>g.archiveProof.checkedAt='2026-10-30T15:00:00Z']){
  const g=setupQuarantineFixture();change(g);g.decision.statement.approvedAt=g.decision.approvedAt;g.decision.statement.preparedAt=g.decision.preparedAt;repin(g);assert.throws(()=>build(g));
 }
});

test('founder identity is fixed: attacker cannot substitute both numeric actor and claimed founder',()=>{
 const f=setupQuarantineFixture();f.decision.actorId='222';f.decision.founderActorId='222';f.decision.statement.actorId='222';repin(f);assert.throws(()=>build(f),/quarantine_decision_required/);
});
test('incident-free stage requires no incident pin and does not authorize production',()=>{
 const document={schemaVersion:1,paused:true,restoreHold:false,fence:0,lease:null,intents:{},receipts:{}};
 assert.equal(stage({document,newPlanSha256:hash('fresh')}).incidentFree,true);
 assert.throws(()=>stage({document,newPlanSha256:hash('fresh'),protectedIncidentSha256:hash('invented')}),/unexpected_pin/);
});
function continuity(phase){
 const r=build(setupQuarantineFixture());const document=r.nextDocument;const original=Object.values(document.retiredSetupIncidents)[0];
 const plan={kind:'ltc-stage-only-acceptance',acceptanceId:'fresh-next',setupIncidentSha256:r.incidentSha256};const newPlanSha256=hash(plan);const fence=original.originalFence+2;const runId='accept-456-1';
 document.fence=fence;document.paused=phase!=='active';document.acceptance={schemaVersion:1,setupIncidentSha256:r.incidentSha256,plan,planSha256:newPlanSha256,fence,runId,status:phase==='completed'?'completed':'admitted'};
 document.lease=phase==='completed'?null:{runId,fence,expiresAt:999999};
 if(phase==='completed'){document.acceptance.completion={planSha256:newPlanSha256,fence};document.acceptance.completionSha256=hash(document.acceptance.completion)}
 return {document,phase,newPlanSha256,protectedIncidentSha256:r.incidentSha256};
}
test('new active/recovery/completed acceptance continuity stays bound to incident, new plan and next fence',()=>{
 for(const phase of ['active','recovery','completed']){const f=continuity(phase);assert.equal(stage(f).stageOnlyAllowed,true);assert.throws(()=>production(f.document));
 for(const mutate of [g=>g.document.acceptance.setupIncidentSha256=hash('other'),g=>g.document.acceptance.planSha256=hash('other'),g=>g.document.fence++,g=>g.document.acceptance.fence++,g=>g.document.acceptance.plan.changed=true,g=>g.document.paused=!g.document.paused]){const g=continuity(phase);mutate(g);assert.throws(()=>stage(g),undefined,phase)}}
});
test('old operation IDs or old plan payload cannot enter any new acceptance phase',()=>{
 for(const phase of ['active','recovery'])for(const useOldId of [false,true]){const f=continuity(phase);const old=Object.values(f.document.retiredSetupIncidents)[0];const operationId=useOldId?old.unknownStage.operationId:'new-operation';f.document.intents[operationId]={operationId,runId:f.document.acceptance.runId,fence:f.document.fence,status:'uncertain',payload:{kind:'vercel-stage',acceptancePlanSha256:useOldId?f.newPlanSha256:old.originalPlanSha256}};assert.throws(()=>stage(f),/lineage_forbidden/)}
});

test('conditional quarantine requires separate environment-only linked CLI proof and exact controller/manifest bindings',()=>{
 for(const mutate of [f=>delete f.isolation.linkedCliReadProof,f=>f.isolation.linkedCliReadProof.controllerImplementationSha256='d'.repeat(64),f=>f.isolation.linkedCliReadProof.linkedCliExistingReadVerified=false,f=>f.isolation.linkedCliReadProof.countsAsStageAcceptance=true,f=>f.isolation.linkedCliReadProof.recordCount=2,f=>f.isolation.linkedCliReadProof.previousManifestSha256=hash('other'),f=>f.isolation.linkedCliReadProof.deploymentSha256=hash(JSON.stringify(f.document.acceptance.plan.previousDeployment)),f=>f.isolation.linkedCliReadProof.cliVersion='61.1.0',f=>f.isolation.linkedCliReadProof.authTransport='token-argument',f=>f.isolation.linkedCliReadProof.runId=f.decision.origin.runId,f=>f.isolation.linkedCliReadProof.runId=f.decision.decisionRunId,f=>f.isolation.linkedCliReadProof.attempt='0',f=>f.isolation.linkedCliReadProofSha256=hash('wrong')]){
  const f=setupQuarantineFixture();mutate(f);repin(f);assert.throws(()=>build(f),/quarantine_linked_read_proof_required/);
 }
});
test('rehashed linked proof cannot authorize excluded CLI/version/controller/production claims',()=>{
 for(const patch of [{countsAsStageAcceptance:true},{authTransport:'token-argument'},{cliVersion:'61.1.0'},{controllerImplementationSha256:'d'.repeat(64)},{runId:'123'},{runId:'124'},{previousManifestSha256:hash('wrong')}]){
  const f=setupQuarantineFixture();Object.assign(f.isolation.linkedCliReadProof,patch);f.isolation.linkedCliReadProofSha256=hash(f.isolation.linkedCliReadProof);repin(f);assert.throws(()=>build(f),/quarantine_linked_read_proof_required/);
 }
});
