import {createHash} from 'node:crypto';
import {assertSetupIncidentsForStage} from './cloud-ltc-setup-quarantine.mjs';
const check=(condition,code)=>{if(!condition)throw Error(code)};
export const receiptHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const hash=value=>/^[a-f0-9]{64}$/.test(value??'');
const commit=value=>/^[a-f0-9]{40}$/.test(value??'');
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,160}$/.test(value);
const run=value=>typeof value==='string'&&/^[1-9]\d*$/.test(value);
const terminal=value=>['confirmed','not-applied'].includes(value);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const plain=value=>value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype;
const target={repository:'Satnam-Satoshi/Satoshi-Langar',project:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',team:'team_yc5ZBvCbWT2M7iGyj3vQDOzk',domains:['https://satnamsatoshi.com','https://ltcmagazine.org']};
const deployment=value=>/^dpl_[A-Za-z0-9]+$/.test(value??'');
const bindings=['repository','project','team','domains','folderId','websiteDocumentId','socialDocumentId','ownerPermissionId'];
const manifests=['sourceManifestSha256','staticManifestSha256','buildOutputSha256','artifactPackageManifestSha256','previousPublicManifestSha256'];
// Human owner: Satnam Satoshi. Pure, read-only stage proof validation; no API,
// credential or write authority. Inputs require independently approved protected
// pins and authenticated private-state readback. Fail closed on any mismatch.
// A current controller's separate approval never rewrites historical evidence.
export function validateStageAcceptanceReceipt({document,pins,currentControllerImplementationSha256}) {
  let size;try{size=JSON.stringify(document).length}catch{throw Error('stage_receipt_state_invalid')}
  check(size<=900000,'stage_receipt_state_invalid');
  check(plain(pins)&&['planSha256','completionSha256','testedImplementationSha256','completionControllerImplementationSha256','currentControllerImplementationSha256'].every(key=>hash(pins[key]))&&commit(pins.source)&&plain(pins.bindings)&&plain(pins.origin)&&plain(pins.completedBy)&&deployment(pins.candidateDeployment)&&deployment(pins.previousDeployment)&&pins.candidateDeployment!==pins.previousDeployment&&Number.isSafeInteger(pins.fence)&&pins.fence>0,'stage_receipt_pins_required');
  check(hash(currentControllerImplementationSha256)&&currentControllerImplementationSha256===pins.currentControllerImplementationSha256,'stage_receipt_controller_mismatch');
  check(plain(document)&&document.schemaVersion===1&&document.paused===true&&document.restoreHold===false&&document.lease===null&&Number.isSafeInteger(document.fence)&&document.fence>0&&plain(document.intents)&&plain(document.receipts),'stage_receipt_state_invalid');
  const acceptance=document.acceptance;const plan=acceptance?.plan;const completion=acceptance?.completion;
  check(acceptance?.schemaVersion===1&&acceptance.status==='completed'&&plan&&completion,'stage_receipt_completion_missing');
  check(plan.schemaVersion===1&&plan.kind==='ltc-stage-only-acceptance'&&/^[a-z0-9][a-z0-9_-]{0,47}$/.test(plan.acceptanceId??'')&&/^\d{4}-\d{2}-\d{2}-r[1-9]\d*$/.test(plan.editionId??'')&&Array.isArray(plan.executablePaths)&&plan.executablePaths.every(file=>typeof file==='string'&&/^(source|build-output)\//.test(file)&&!file.split('/').some(part=>!part||part==='.'||part==='..')&&!file.includes('\\'))&&commit(plan.source)&&plan.source===pins.source&&plan.implementationSha256===pins.testedImplementationSha256&&manifests.every(key=>hash(plan[key]))&&Number.isInteger(plan.bundleCount)&&plan.bundleCount>0&&plan.bundleCount<=64&&/^dpl_[A-Za-z0-9]+$/.test(plan.previousDeployment??''),'stage_receipt_plan_invalid');
  check(bindings.every(key=>same(plan[key],pins.bindings[key]))&&Object.entries(target).every(([key,value])=>same(plan[key],value))&&['folderId','websiteDocumentId','socialDocumentId','ownerPermissionId'].every(key=>id(plan[key]))&&new Set([plan.folderId,plan.websiteDocumentId,plan.socialDocumentId]).size===3&&plan.previousDeployment===pins.previousDeployment,'stage_receipt_binding_mismatch');
  check(receiptHash(plan)===pins.planSha256&&acceptance.planSha256===pins.planSha256&&completion.planSha256===pins.planSha256,'stage_receipt_plan_hash_mismatch');
  check(completion.schemaVersion===1&&completion.outcome==='stage-verified'&&completion.source===plan.source&&completion.implementationSha256===plan.implementationSha256&&completion.controllerImplementationSha256===pins.completionControllerImplementationSha256,'stage_receipt_completion_invalid');
  check(Number.isSafeInteger(acceptance.fence)&&acceptance.fence>0&&acceptance.fence===document.fence&&completion.fence===acceptance.fence&&acceptance.fence===pins.fence,'stage_receipt_fence_mismatch');
  check(run(completion.origin?.runId)&&run(completion.origin?.attempt)&&same(completion.origin,pins.origin)&&acceptance.runId===`accept-${completion.origin.runId}-${completion.origin.attempt}`,'stage_receipt_origin_mismatch');
  const by=completion.completedBy;
  check(run(by?.runId)&&run(by?.attempt)&&same(by,pins.completedBy)&&['stage-only','stage-only-recovery'].includes(by.mode)&&(by.mode==='stage-only'?by.runId===completion.origin.runId&&by.attempt===completion.origin.attempt&&completion.controllerImplementationSha256===plan.implementationSha256:by.runId!==completion.origin.runId),'stage_receipt_completing_run_mismatch');
  const verification=completion.verification;
  check(verification&&['fullRestoreVerified','publicBaselineVerified','publicUnchangedVerified','protectedStageVerified'].every(key=>verification[key]===true)&&manifests.every(key=>verification[key]===plan[key])&&receiptHash(verification)===completion.verificationSha256,'stage_receipt_verification_invalid');
  check(receiptHash(completion)===acceptance.completionSha256&&acceptance.completionSha256===pins.completionSha256,'stage_receipt_completion_hash_mismatch');
  for(const [operationId,intent] of Object.entries(document.intents)) {
    check(intent&&intent.operationId===operationId&&Number.isSafeInteger(intent.fence)&&intent.fence>0&&intent.fence<=document.fence&&terminal(intent.status)&&hash(intent.payloadSha256)&&hash(intent.evidenceSha256),'stage_receipt_intent_invalid');
    check(intent.payload&&receiptHash(intent.payload)===intent.payloadSha256&&intent.proof&&receiptHash(intent.proof)===intent.evidenceSha256,'stage_receipt_proof_invalid');
    const receipt=document.receipts[operationId];check(receipt&&same(receipt.receipt,intent)&&receiptHash(intent)===receipt.sha256,'stage_receipt_receipt_invalid');
  }
  check(Object.keys(document.receipts).every(key=>Object.hasOwn(document.intents,key)),'stage_receipt_receipt_invalid');
  const intents=Object.values(document.intents).filter(intent=>intent.fence===acceptance.fence).sort((a,b)=>a.operationId.localeCompare(b.operationId));
  const prefix=`accept-${pins.planSha256.slice(0,24)}`;
  check(intents.length===plan.bundleCount+1&&intents.every(intent=>intent.runId===acceptance.runId&&intent.status==='confirmed'&&intent.payload.acceptancePlanSha256===pins.planSha256&&intent.payload.artifactPackageManifestSha256===plan.artifactPackageManifestSha256),'stage_receipt_intent_set_invalid');
  const stage=intents.find(intent=>intent.operationId===`${prefix}-stage`);
  check(stage&&same(stage.payload,{kind:'vercel-stage',acceptancePlanSha256:pins.planSha256,editionId:plan.editionId,artifactPackageManifestSha256:plan.artifactPackageManifestSha256,commit:plan.source,buildOutputSha256:plan.buildOutputSha256,artifactManifestSha256:plan.staticManifestSha256}),'stage_receipt_stage_invalid');
  const appliedProof=intent=>{
    const envelope=intent.proof;
    check(plain(envelope)&&envelope.operationId===intent.operationId&&envelope.payloadSha256===intent.payloadSha256&&envelope.status==='applied'&&plain(envelope.proof),'stage_receipt_applied_proof_invalid');
    return envelope.proof;
  };
  const stageLeaf=appliedProof(stage);
  check(stageLeaf.kind==='vercel-stage'&&stageLeaf.deployment===pins.candidateDeployment&&typeof stageLeaf.url==='string'&&/^[a-z0-9-]+\.vercel\.app$/.test(stageLeaf.url)&&stageLeaf.source===plan.source&&stageLeaf.buildOutputSha256===plan.buildOutputSha256&&stageLeaf.artifactManifestSha256===plan.staticManifestSha256,'stage_receipt_stage_proof_invalid');
  const evidence=intents.filter(intent=>intent.payload.kind==='drive-evidence').sort((a,b)=>a.payload.artifactBundleIndex-b.payload.artifactBundleIndex);
  check(evidence.length===plan.bundleCount&&new Set(evidence.map(intent=>intent.payload.fileId)).size===evidence.length&&evidence.every((intent,index)=>intent.operationId===`${prefix}-e${index}`&&intent.payload.role==='acceptance-artifacts'&&intent.payload.artifactBundleIndex===index&&intent.payload.artifactBundleCount===plan.bundleCount&&intent.payload.folderId===plan.folderId&&id(intent.payload.fileId)&&hash(intent.payload.sha256)&&Number.isInteger(intent.payload.bytes)&&intent.payload.bytes>0&&intent.payload.bytes<=3_500_000),'stage_receipt_evidence_invalid');
  for(const intent of evidence){const leaf=appliedProof(intent),payload=intent.payload;check(leaf.fileId===payload.fileId&&leaf.folderId===payload.folderId&&leaf.sha256===payload.sha256&&leaf.length===payload.bytes&&leaf.ownerPermissionId===plan.ownerPermissionId&&leaf.ownerOnly===true&&leaf.downloadVerified===true,'stage_receipt_evidence_proof_invalid');}
  const terminalProof=intents.map(intent=>({operationId:intent.operationId,payloadSha256:intent.payloadSha256,status:intent.status,evidenceSha256:intent.evidenceSha256,receiptSha256:document.receipts[intent.operationId].sha256}));
  check(receiptHash(terminalProof)===completion.terminalProofSha256,'stage_receipt_terminal_proof_mismatch');
  const incidentPin=pins.setupIncidentSha256;
  check((incidentPin===undefined&&plan.setupIncidentSha256===undefined&&acceptance.setupIncidentSha256===undefined)||(hash(incidentPin)&&plan.setupIncidentSha256===incidentPin&&acceptance.setupIncidentSha256===incidentPin),'stage_receipt_incident_binding_mismatch');
  assertSetupIncidentsForStage({document,protectedIncidentSha256:incidentPin,newPlanSha256:pins.planSha256,phase:'completed'});
  return Object.freeze({stageOnlyVerified:true,productionAuthorized:false,promotionAuthorized:false,rollbackVerified:false,planSha256:pins.planSha256,completionSha256:pins.completionSha256,candidateDeployment:pins.candidateDeployment,candidateUrl:stageLeaf.url,previousDeployment:pins.previousDeployment,source:plan.source,fence:acceptance.fence,setupIncidentSha256:incidentPin??null,testedImplementationSha256:plan.implementationSha256,completionControllerImplementationSha256:completion.controllerImplementationSha256,currentControllerImplementationSha256,...Object.fromEntries(manifests.map(key=>[key,plan[key]]))});
}
