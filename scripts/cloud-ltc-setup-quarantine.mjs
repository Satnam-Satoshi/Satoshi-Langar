import {createHash} from 'node:crypto';
export const FOUNDER_ACTOR_ID = '268053325';
const check=(ok,code)=>{if(!ok)throw Error(code)};
export const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const digest=v=>/^[a-f0-9]{64}$/.test(v??'');
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,160}$/.test(v);
const run=v=>typeof v==='string'&&/^[1-9]\d*$/.test(v);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fresh=(at,now,max)=>Number.isFinite(Date.parse(at))&&Date.parse(at)<=now&&now-Date.parse(at)<=max;
// Pure incident-isolation proposal. Caller must use authenticated independent
// protected pins and a revision-CAS write; no API/credentials/mutation here.
export function buildOwnerQuarantinedSetupTransition({document,decision,isolation,archiveProof,now}) {
 check(document&&decision&&isolation&&archiveProof,'quarantine_inputs_required');
 const original=JSON.stringify(document);const originalHash=hash(original);
 check(Number.isFinite(now)&&Number.isFinite(Date.parse(decision.approvedAt))&&Date.parse(decision.approvedAt)<=now&&fresh(decision.preparedAt,now,5*60*1000)&&Buffer.byteLength(original)<=900000,'quarantine_state_invalid');
 check(decision.kind==='founder-approved-setup-stage-quarantine'&&decision.authority==='explicit-human-incident-approval'&&decision.event==='workflow_dispatch'&&decision.ref==='refs/heads/main'&&decision.founderActorId===FOUNDER_ACTOR_ID&&decision.actorId===FOUNDER_ACTOR_ID&&run(decision.decisionRunId)&&run(decision.decisionAttempt)&&digest(decision.controllerImplementationSha256)&&decision.productionAuthorized===false&&decision.recoveryAccepted===false,'quarantine_decision_required');
 check(digest(decision.originalStateSha256)&&decision.originalStateSha256===originalHash&&decision.protectedDecisionSha256===hash(decision.statement)&&decision.statement&&decision.statement.approved===true&&decision.statement.originalStateSha256===originalHash&&decision.statement.planSha256===decision.planSha256&&decision.statement.fence===decision.fence&&decision.statement.controllerImplementationSha256===decision.controllerImplementationSha256&&decision.statement.actorId===decision.actorId&&decision.statement.approvedAt===decision.approvedAt&&decision.statement.preparedAt===decision.preparedAt,'quarantine_decision_pin_mismatch');
 const a=document.acceptance;const plan=a?.plan;const lease=document.lease;
 check(document.schemaVersion===1&&document.paused===true&&document.restoreHold===false&&lease&&Number.isSafeInteger(document.fence)&&document.fence===decision.fence&&lease.fence===decision.fence&&a?.status==='admitted'&&a.schemaVersion===1&&a.fence===lease.fence&&a.runId===lease.runId&&!document.latestRelease&&!document.unresolvedSetupIncident&&!document.retiredSetupIncidents,'quarantine_scope_invalid');
 check(plan?.repository==='Satnam-Satoshi/Satoshi-Langar'&&plan.project==='prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx'&&plan.team==='team_yc5ZBvCbWT2M7iGyj3vQDOzk'&&same(plan.domains,['https://satnamsatoshi.com','https://ltcmagazine.org'])&&id(plan.folderId)&&id(plan.websiteDocumentId)&&id(plan.socialDocumentId)&&id(plan.ownerPermissionId)&&plan.kind==='ltc-stage-only-acceptance'&&plan.schemaVersion===1&&hash(plan)===decision.planSha256&&a.planSha256===decision.planSha256&&plan.source===decision.source&&/^[a-f0-9]{40}$/.test(decision.source??'')&&plan.implementationSha256===decision.testedImplementationSha256&&digest(plan.implementationSha256)&&plan.bundleCount===36,'quarantine_plan_mismatch');
 check(same(decision.statement.origin,decision.origin)&&run(decision.origin?.runId)&&run(decision.origin?.attempt)&&lease.runId===`accept-${decision.origin.runId}-${decision.origin.attempt}`&&decision.decisionRunId!==decision.origin.runId&&decision.originCompleted===true,'quarantine_origin_invalid');
 check(isolation.origin?.status==='completed'&&isolation.origin.runId===decision.origin.runId&&isolation.origin.attempt===decision.origin.attempt&&isolation.origin.repository===plan.repository&&isolation.origin.path==='.github/workflows/ltc-daily-publication.yml'&&isolation.origin.event==='workflow_dispatch'&&isolation.origin.headBranch==='main','quarantine_origin_invalid');
 check(fresh(isolation.checkedAt,now,5*60*1000)&&fresh(isolation.publicBaselineCheckedAt,now,5*60*1000)&&isolation.project===plan.project&&isolation.team===plan.team&&same(isolation.domains,plan.domains)&&isolation.previousDeployment===plan.previousDeployment&&isolation.publicManifestSha256===plan.previousPublicManifestSha256&&isolation.publicUnchanged===true&&isolation.socialPaused===true&&isolation.socialLease===null&&isolation.socialUnknownOperations===0,'quarantine_isolation_invalid');
 check(isolation.projectCronCount===0&&isolation.deployHookCount===0&&isolation.webhookCount===0&&isolation.integrationConfigurationCount===0&&isolation.buildOutputCronsAbsent===true&&isolation.vercelConfigCronsAbsent===true&&isolation.prebuiltOnly===true&&isolation.skipDomainOnly===true&&isolation.readOnlyFunctionCount===4&&isolation.allFunctionsReadOnly===true&&isolation.buildOutputSha256===plan.buildOutputSha256,'quarantine_isolation_invalid');
 const linked=isolation.linkedCliReadProof;
 check(linked&&linked.linkedCliExistingReadVerified===true&&linked.countsAsStageAcceptance===false&&linked.recordCount===3&&linked.previousManifestSha256===plan.previousPublicManifestSha256&&linked.deploymentSha256===hash(plan.previousDeployment)&&linked.cliVersion==='65.9.0'&&linked.authTransport==='environment-only'&&linked.controllerImplementationSha256===decision.controllerImplementationSha256&&run(linked.runId)&&run(linked.attempt)&&linked.runId!==decision.origin.runId&&linked.runId!==decision.decisionRunId&&isolation.linkedCliReadProofSha256===hash(linked),'quarantine_linked_read_proof_required');
 check(decision.protectedIsolationSha256===hash(isolation)&&decision.statement.isolationSha256===decision.protectedIsolationSha256,'quarantine_isolation_pin_mismatch');
 const intents=Object.values(document.intents??{});const receipts=document.receipts??{};const prefix=`accept-${decision.planSha256.slice(0,24)}`;
 check(Object.entries(document.intents).every(([key,value])=>key===value.operationId)&&intents.length===plan.bundleCount+1&&intents.every(i=>i.fence===lease.fence&&i.runId===lease.runId&&i.operationId.startsWith(prefix)&&i.payload&&hash(i.payload)===i.payloadSha256&&i.payload.acceptancePlanSha256===decision.planSha256&&i.payload.artifactPackageManifestSha256===plan.artifactPackageManifestSha256),'quarantine_effect_set_invalid');
 const stage=intents.filter(i=>i.payload.kind==='vercel-stage');const evidence=intents.filter(i=>i.payload.kind==='drive-evidence').sort((x,y)=>x.payload.artifactBundleIndex-y.payload.artifactBundleIndex);
 check(stage.length===1&&stage[0].operationId===`${prefix}-stage`&&stage[0].status==='uncertain'&&stage[0].evidenceSha256===null&&!Object.hasOwn(receipts,stage[0].operationId)&&same(stage[0].payload,{kind:'vercel-stage',acceptancePlanSha256:decision.planSha256,editionId:plan.editionId,artifactPackageManifestSha256:plan.artifactPackageManifestSha256,commit:plan.source,buildOutputSha256:plan.buildOutputSha256,artifactManifestSha256:plan.staticManifestSha256}),'quarantine_stage_invalid');
 check(evidence.length===plan.bundleCount&&new Set(evidence.map(i=>i.payload.fileId)).size===plan.bundleCount&&evidence.every((i,n)=>i.operationId===`${prefix}-e${n}`&&i.status==='confirmed'&&i.payload.role==='acceptance-artifacts'&&i.payload.folderId===plan.folderId&&i.payload.artifactBundleIndex===n&&i.payload.artifactBundleCount===plan.bundleCount&&id(i.payload.fileId)&&digest(i.payload.sha256)&&Number.isInteger(i.payload.bytes)&&i.payload.bytes>0&&i.proof&&hash(i.proof)===i.evidenceSha256&&receipts[i.operationId]&&same(receipts[i.operationId].receipt,i)&&receipts[i.operationId].sha256===hash(i))&&Object.keys(receipts).length===evidence.length,'quarantine_evidence_invalid');
 check(archiveProof.status==='verified-full-original-state'&&archiveProof.originalStateSha256===originalHash&&archiveProof.bytes===Buffer.byteLength(original)&&archiveProof.downloadedSha256===originalHash&&archiveProof.folderId===plan.folderId&&archiveProof.ownerPermissionId===plan.ownerPermissionId&&id(archiveProof.fileId)&&archiveProof.privateSingleOwner===true&&archiveProof.downloadVerified===true&&fresh(archiveProof.checkedAt,now,5*60*1000)&&decision.protectedArchiveProofSha256===hash(archiveProof)&&decision.statement.archiveProofSha256===decision.protectedArchiveProofSha256,'quarantine_archive_required');
 const incident={schemaVersion:1,kind:'quarantined-setup-stage-unknown',originalStateSha256:originalHash,originalStateBytes:Buffer.byteLength(original),archiveProof:structuredClone(archiveProof),decision:structuredClone(decision),isolationSha256:hash(isolation),originalPlanSha256:decision.planSha256,originalFence:lease.fence,originalRunId:lease.runId,unknownStage:structuredClone(stage[0]),bannedOperationIds:intents.map(i=>i.operationId).sort(),outcome:'UNKNOWN',accepted:false,productionAuthorized:false};
 const incidentSha256=hash(incident);const next={schemaVersion:1,paused:true,restoreHold:false,fence:document.fence+1,lease:null,intents:{},receipts:{},retiredSetupIncidents:{[incidentSha256]:incident},unresolvedSetupIncident:{incidentSha256,outcome:'UNKNOWN',accepted:false,productionAuthorized:false}};
 return {nextDocument:next,incidentSha256,productionAuthorized:false,recoveryAccepted:false};
}
// Incident policy only; other admission, source, proof and manual-authority gates
// remain mandatory. No incident is not itself acceptance or production approval.
export function assertSetupIncidentsForStage({document,protectedIncidentSha256,newPlanSha256,phase='initial'}) {
 check(document?.schemaVersion===1&&digest(newPlanSha256)&&['initial','active','recovery','completed'].includes(phase),'setup_incident_context_invalid');
 check(document.intents&&typeof document.intents==='object'&&!Array.isArray(document.intents)&&document.receipts&&typeof document.receipts==='object'&&!Array.isArray(document.receipts)&&(!document.retiredSetupIncidents||(typeof document.retiredSetupIncidents==='object'&&!Array.isArray(document.retiredSetupIncidents))),'setup_incident_state_invalid');
 const entries=Object.entries(document.retiredSetupIncidents??{});const visible=document.unresolvedSetupIncident;
 if(entries.length===0&&!visible){
  check(protectedIncidentSha256===undefined||protectedIncidentSha256===null,'setup_incident_unexpected_pin');
  return {stageOnlyAllowed:true,productionAuthorized:false,incidentFree:true,bannedOperationIds:[]};
 }
 check(digest(protectedIncidentSha256),'setup_incident_pin_required');
 check(entries.length===1&&entries[0][0]===protectedIncidentSha256&&hash(entries[0][1])===protectedIncidentSha256&&visible?.incidentSha256===protectedIncidentSha256&&visible.outcome==='UNKNOWN'&&visible.accepted===false&&visible.productionAuthorized===false,'setup_incident_unrecognized');
 const i=entries[0][1];
 check(i.kind==='quarantined-setup-stage-unknown'&&i.outcome==='UNKNOWN'&&i.accepted===false&&i.productionAuthorized===false&&i.unknownStage?.status==='uncertain'&&i.originalPlanSha256!==newPlanSha256&&i.originalPlanSha256.slice(0,24)!==newPlanSha256.slice(0,24)&&Number.isSafeInteger(i.originalFence)&&Array.isArray(i.bannedOperationIds)&&i.bannedOperationIds.includes(i.unknownStage.operationId),'setup_incident_lineage_forbidden');
 check(document.restoreHold===false,'setup_incident_state_invalid');
 const intents=Object.values(document.intents??{});
 if(phase==='initial'){
  check(document.paused===true&&document.lease===null&&document.fence===i.originalFence+1&&intents.length===0&&Object.keys(document.receipts??{}).length===0&&!document.acceptance,'setup_incident_state_invalid');
 }else{
  const a=document.acceptance;
  check(a?.schemaVersion===1&&a.setupIncidentSha256===protectedIncidentSha256&&a.planSha256===newPlanSha256&&hash(a.plan)===newPlanSha256&&a.fence===i.originalFence+2&&document.fence===a.fence&&typeof a.runId==='string'&&/^accept-[1-9]\d*-[1-9]\d*$/.test(a.runId),'setup_incident_continuity_invalid');
  check(intents.every(intent=>!i.bannedOperationIds.includes(intent.operationId)&&intent.fence===a.fence&&intent.runId===a.runId&&intent.payload?.acceptancePlanSha256===newPlanSha256&&['drive-evidence','vercel-stage'].includes(intent.payload.kind)),'setup_incident_lineage_forbidden');
  if(phase==='completed')check(document.paused===true&&document.lease===null&&a.status==='completed'&&a.completion?.planSha256===newPlanSha256&&a.completion?.fence===a.fence&&digest(a.completionSha256)&&hash(a.completion)===a.completionSha256&&intents.every(intent=>['confirmed','not-applied'].includes(intent.status)),'setup_incident_continuity_invalid');
  else check(a.status==='admitted'&&document.lease?.fence===a.fence&&document.lease?.runId===a.runId&&document.paused===(phase==='recovery'),'setup_incident_continuity_invalid');
 }
 return {stageOnlyAllowed:true,productionAuthorized:false,incidentSha256:protectedIncidentSha256,bannedOperationIds:[...i.bannedOperationIds],bannedPlanSha256:i.originalPlanSha256};
}
// This draft intentionally has no policy capable of authorizing production in
// the presence of unknown retired incidents. A future separate review is needed.
export function assertSetupIncidentsForProduction(document) {
 check(!document?.unresolvedSetupIncident&&Object.keys(document?.retiredSetupIncidents??{}).length===0,'production_quarantined_setup_incident');
 return {incidentFree:true,productionAuthorized:false};
}
