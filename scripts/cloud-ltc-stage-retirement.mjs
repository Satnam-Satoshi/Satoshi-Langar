import { DurableCloudState } from './cloud-ltc-state.mjs';
import { ReleaseOperationCoordinator } from './cloud-ltc-operations.mjs';
import { packageEvidence, verifyEvidenceBundle } from './cloud-ltc-evidence.mjs';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { validateStageRetirementReview, validateStageRetirementSnapshot } from './cloud-ltc-stage-retirement-policy.mjs';
import { nextIssueDate } from './cloud-ltc-generation.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
const check=(value,code)=>{if(!value)throw Error(code);};
export async function archiveAndRetireStagedGeneration({env,state,review,dependencies}){
 let phase;const save=async update=>{if(update.status)phase=update.status;await dependencies.save(update);};
 const now=()=>dependencies.now?.()??Date.now();validateStageRetirementReview({env,review,now:now()});
 check(state instanceof DurableCloudState&&state.key==='website','stage_retirement_state_required');
 const original=await state.adapter.read('website'),document=await new DurableCloudState({read:async()=>original},'website').inspect(),pinned=validateStageRetirementSnapshot({document,review});
 check(document.nextFreshGeneration===undefined,'stage_retirement_generation_exists');
 await save({status:'checking-completed-original-run'});
 const run=await dependencies.github(`/actions/runs/${review.origin.runId}/attempts/${review.origin.attempt}`);
 check(String(run.id)===review.origin.runId&&String(run.run_attempt)===review.origin.attempt&&run.status==='completed'&&run.conclusion==='failure'&&run.event==='workflow_dispatch'&&run.head_branch==='main'&&run.head_sha===review.origin.workflowHead&&run.repository?.full_name===TARGET.repository&&run.path==='.github/workflows/ltc-daily-publication.yml'&&String(run.actor?.id)==='268053325','stage_retirement_origin_unavailable');
 await dependencies.verifyControllerAndPolicy();await dependencies.verifyPublicPointersAndCandidate();
 await save({status:'restoring-all-original-private-parts'});
 const restored=await dependencies.restore(pinned);
 check(hash(restored.manifest)===review.artifactManifestSha256&&hash(restored.previousManifest)===review.previousPublicManifestSha256&&hash(restored.publicationProvenance)===hash(review.publicationProvenance),'stage_retirement_restored_binding_changed');
 await save({status:'verifying-unchanged-accepted-public-bytes'});await dependencies.verifyPublic(restored.previousManifest);await dependencies.verifyPublicPointersAndCandidate();
 validateStageRetirementReview({env,review,now:now()});await dependencies.verifyControllerAndPolicy();
 const lease={runId:`gha-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`,fence:document.fence+1,expiresAt:now()+3600000};
 const context={schemaVersion:1,reviewSha256:hash(review),origin:structuredClone(review.origin),originalLease:structuredClone(document.lease),editionId:review.editionId,artifactSource:review.artifactSource,artifactImplementationSha256:review.artifactImplementationSha256,stage:structuredClone(pinned.stage),artifactPackageManifestSha256:review.artifactPackageManifestSha256,controllerSource:review.controllerSource,controllerImplementationSha256:review.controllerImplementationSha256,operator:{runId:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT,fence:lease.fence},archiveOnly:true,publicationAuthorized:false};
 const backup={schemaVersion:1,key:'website',bytes:JSON.stringify(document),sha256:review.snapshotSha256};
 const bundle=packageEvidence([{path:'staged-generation-ledger-backup.json',bytes:Buffer.from(JSON.stringify(backup))},{path:'staged-generation-retirement.json',bytes:Buffer.from(JSON.stringify(context))},{path:'historical-artifact-restoration.json',bytes:Buffer.from(JSON.stringify({artifactSource:review.artifactSource,artifactImplementationSha256:review.artifactImplementationSha256,sourceManifestSha256:review.sourceManifestSha256,artifactManifestSha256:review.artifactManifestSha256,buildOutputSha256:review.buildOutputSha256,artifactPackageManifestSha256:review.artifactPackageManifestSha256,publicationProvenance:review.publicationProvenance,privatePartCount:40,fullByteRestoreVerified:true,currentPublicationFreshnessVerified:false}))}]);
 const [fileId]=await dependencies.allocate({count:1,config:dependencies.evidenceConfig,getAccessToken:dependencies.token,fetcher:dependencies.fetchImpl});check(fileId,'stage_retirement_archive_id_required');
 const operationId=`retire-stage-${hash(review).slice(0,48)}`,payload={kind:'drive-evidence',role:'staged-generation-retirement',originalSnapshotSha256:review.snapshotSha256,artifactPackageManifestSha256:review.artifactPackageManifestSha256,fileId,folderId:review.bindings.folderId,sha256:bundle.sha256,bytes:bundle.length};
 const next=structuredClone(document);next.fence=lease.fence;next.lease=lease;next.paused=false;next.stagedDailyRetirement={schemaVersion:1,status:'claimed-archive-only',review:structuredClone(review),reviewSha256:hash(review),context,archiveOperationId:operationId,archivePayload:payload,claimedAt:new Date(now()).toISOString()};
 await new DurableCloudState({read:async()=>({value:next})},'website').inspect();await save({status:'claiming-archive-only-fence',fence:lease.fence});
 await state.adapter.conditionalWrite('website',next,original.version); // No automatic retry, no old lease stealing.
 const originalIds=Object.keys(document.intents),retiredIds=originalIds.filter(id=>document.intents[id].fence===review.origin.fence);
 const metadata=value=>{const copy=structuredClone(value);for(const key of['fence','lease','paused','intents','receipts','stagedDailyRetirement'])delete copy[key];return hash(copy);};
 const assertExactClaim=value=>{
  check(value.lease?.runId===lease.runId&&value.lease.fence===lease.fence&&value.fence===lease.fence&&metadata(value)===metadata(document)&&hash(value.stagedDailyRetirement)===hash(next.stagedDailyRetirement),'stage_retirement_claim_changed');
  check(Object.keys(value.intents).every(id=>originalIds.includes(id)||id===operationId)&&Object.keys(value.receipts).every(id=>originalIds.includes(id)||id===operationId),'stage_retirement_unexpected_operation');
  for(const id of originalIds)check(Object.hasOwn(value.intents,id)&&Object.hasOwn(value.receipts,id)&&hash(value.intents[id])===hash(document.intents[id])&&hash(value.receipts[id])===hash(document.receipts[id]),'stage_retirement_original_effect_changed');
 };
 try{
  check(hash((await state.adapter.read('website')).value)===hash(next),'stage_retirement_claim_readback_changed');
  const provider=dependencies.providerFactory({bundle,config:{...dependencies.evidenceConfig,fileId},getAccessToken:dependencies.token,fetcher:dependencies.fetchImpl});
  const guarded={readback:context=>provider.readback(context),apply:async context=>{validateStageRetirementReview({env,review,now:now()});assertExactClaim(await state.inspect());await dependencies.verifyControllerAndPolicy();await restored.verify();await dependencies.verifyPublicPointersAndCandidate();return provider.apply(context);}};
  await save({status:'uploading-one-private-retirement-archive'});
  const application=await new ReleaseOperationCoordinator({state,lease}).execute({operationId,payload,provider:guarded});check(application.appliedNow===true,'stage_retirement_archive_not_freshly_applied');
  await save({status:'verifying-archive-and-public-baseline'});
  const snapshot=await state.adapter.read('website'),value=snapshot.value;await new DurableCloudState({read:async()=>snapshot},'website').inspect();assertExactClaim(value);
  const intent=value.intents[operationId],receipt=value.receipts[operationId],proof=intent?.proof,leaf=proof?.proof;
  check(intent?.status==='confirmed'&&intent.runId===lease.runId&&intent.fence===lease.fence&&hash(intent.payload)===hash(payload)&&intent.payloadSha256===hash(payload)&&receipt?.sha256===hash(intent)&&hash(receipt.receipt)===hash(intent)&&intent.evidenceSha256===hash(proof)&&proof.operationId===operationId&&proof.payloadSha256===hash(payload)&&proof.status==='applied'&&leaf.ownerOnly===true&&leaf.downloadVerified===true&&leaf.ownerPermissionId===review.bindings.ownerPermissionId&&leaf.fileId===fileId&&leaf.folderId===review.bindings.folderId&&leaf.sha256===bundle.sha256&&leaf.length===bundle.length,'stage_retirement_archive_unverified');
  const saved=JSON.parse(verifyEvidenceBundle(bundle).bytes).files.find(file=>file.path==='staged-generation-ledger-backup.json');check(saved&&Buffer.from(saved.contentBase64,'base64').equals(Buffer.from(JSON.stringify(backup))),'stage_retirement_archive_snapshot_changed');
  await dependencies.verifyPublicPointersAndCandidate();await dependencies.verifyPublic(restored.previousManifest);await dependencies.verifyControllerAndPolicy();
  const terminal=structuredClone(value);for(const id of retiredIds){delete terminal.intents[id];delete terminal.receipts[id];}
  const completion={schemaVersion:1,outcome:'retired-archived-unpublished',reviewSha256:hash(review),originalSnapshotSha256:review.snapshotSha256,originalFence:review.origin.fence,newFence:lease.fence,originalLease:structuredClone(document.lease),retiredOperationCount:retiredIds.length,retiredReceiptCount:retiredIds.length,retiredOperationsSha256:hash(retiredIds.map(id=>({operationId:id,payloadSha256:document.intents[id].payloadSha256,evidenceSha256:document.intents[id].evidenceSha256,receiptSha256:document.receipts[id].sha256}))),archiveOperationId:operationId,archiveFileId:fileId,archiveFolderId:payload.folderId,archiveSha256:bundle.sha256,archiveLength:bundle.length,archivePayloadSha256:hash(payload),archiveProofSha256:intent.evidenceSha256,previousDeployment:review.previousDeployment,previousPublicManifestSha256:review.previousPublicManifestSha256,completedBy:context.operator,publicationPerformed:false,originalEffectsReissued:false,originalUnknownAccepted:false};
  terminal.paused=true;terminal.lease=null;terminal.stagedDailyRetirement.status='retired-archived-unpublished';terminal.stagedDailyRetirement.completion=completion;terminal.stagedDailyRetirement.completionSha256=hash(completion);terminal.stagedDailyRetirement.archiveIntentSnapshot=structuredClone(intent);terminal.stagedDailyRetirement.archiveReceiptSnapshot=structuredClone(receipt);terminal.stagedDailyRetirement.retiredOperationIds=retiredIds;
  terminal.nextFreshGeneration={schemaVersion:1,status:'pending-first-proof',retirementReviewSha256:hash(review),retirementCompletionSha256:hash(completion),notBeforeDate:nextIssueDate(review.editionId),originalEditionId:review.editionId,routineEnabled:false};
  await new DurableCloudState({read:async()=>({value:terminal})},'website').inspect();await save({status:'committing-archive-retirement'});await state.adapter.conditionalWrite('website',terminal,snapshot.version);
  check(hash((await state.adapter.read('website')).value)===hash(terminal),'stage_retirement_terminal_readback_changed');
  const result={mode:'archive-unpromoted-staged-generation',status:completion.outcome,completionSha256:hash(completion),archiveSha256:bundle.sha256,retiredOperationCount:retiredIds.length,fence:lease.fence,paused:true,leaseRetired:true,publicationPerformed:false,originalEffectsReissued:false,originalUnknownAccepted:false,nextFreshDate:terminal.nextFreshGeneration.notBeforeDate,routineEnabled:false};await save(result);return result;
 }catch(error){try{const held=await state.adapter.read('website');if(held.value?.lease?.runId===lease.runId&&held.value.lease.fence===lease.fence){const value=structuredClone(held.value);value.paused=true;value.stagedDailyRetirement.status='held-archive-only';await state.adapter.conditionalWrite('website',value,held.version);await save({status:'held-archive-only',heldAfterPhase:phase,paused:true,leaseRetired:false,publicationPerformed:false});}}catch{}throw error;}
}
