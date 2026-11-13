import { createHash } from 'node:crypto';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { validateStagedContinuationReview, validateStagedContinuationSnapshot } from './cloud-ltc-staged-continuation-policy.mjs';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { finishConfirmedStagedRelease } from './cloud-ltc-production.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
const check=(value,code)=>{if(!value)throw Error(code);};

export async function continueReviewedStagedDaily({env,state,review,dependencies}){
  const now=()=>dependencies.now?.()??Date.now();
  validateStagedContinuationReview({env,review,now:now()});
  check(state instanceof DurableCloudState&&state.key==='website','staged_continuation_state_required');
  const original=await state.adapter.read('website');
  const document=await new DurableCloudState({read:async()=>original},'website').inspect();
  const pinned=validateStagedContinuationSnapshot({document,review});
  await dependencies.save({status:'checking-completed-origin'});
  const origin=await dependencies.github(`/actions/runs/${review.origin.runId}/attempts/${review.origin.attempt}`);
  check(String(origin.id)===review.origin.runId&&String(origin.run_attempt)===review.origin.attempt&&origin.status==='completed'&&origin.conclusion==='failure'&&origin.event==='workflow_dispatch'&&origin.head_branch==='main'&&origin.head_sha===review.origin.workflowHead&&origin.repository?.full_name===TARGET.repository&&origin.path==='.github/workflows/ltc-daily-publication.yml'&&String(origin.actor?.id)==='268053325','staged_continuation_origin_not_completed');
  await dependencies.verifyControllerAndPolicy();
  await dependencies.verifyProjectAndPointers();
  await dependencies.save({status:'restoring-existing-private-artifact'});
  const restored=await dependencies.restore(pinned);
  check(hash(restored.manifest)===review.artifactManifestSha256&&hash(restored.previousManifest)===review.previousPublicManifestSha256&&hash(restored.publicationProvenance)===hash(review.publicationProvenance),'staged_continuation_restored_binding_changed');
  await dependencies.save({status:'checking-full-protected-existing-candidate'});
  await dependencies.verifyProtected({id:pinned.candidateDeployment,url:pinned.candidateUrl},restored.manifest);
  await dependencies.save({status:'checking-previous-public-baseline'});
  await dependencies.verifyPublic(restored.previousManifest);
  await dependencies.verifyProjectAndPointers();
  await dependencies.save({status:'checking-live-market-read'});
  const liveMarketRead=await dependencies.verifyLiveMarkets();
  await restored.verifyPromotion(); // Reject a known expired candidate before ANY claim CAS.
  validateStagedContinuationReview({env,review,now:now()});
  await dependencies.verifyControllerAndPolicy();
  // Explicit owner claim fences the completed origin even after old expiry.
  // A new real operator/run owns a NEW fence; original lease/history stay saved.
  const next=structuredClone(document),lease={runId:`gha-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`,fence:document.fence+1,expiresAt:now()+3600000};
  check(!next.stagedDailyContinuation,'staged_continuation_already_claimed');
  const context={schemaVersion:1,reviewSha256:hash(review),origin:structuredClone(review.origin),originalLease:structuredClone(document.lease),artifactSource:review.artifactSource,artifactImplementationSha256:review.artifactImplementationSha256,stageOperationId:review.stageOperationId,artifactPackageManifestSha256:review.artifactPackageManifestSha256,controllerSource:review.controllerSource,controllerImplementationSha256:review.controllerImplementationSha256,operator:{runId:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT,fence:lease.fence},liveMarketRead};
  next.fence=lease.fence;next.lease=lease;next.paused=false;
  next.stagedDailyContinuation={schemaVersion:1,status:'claimed',review:structuredClone(review),reviewSha256:hash(review),originalSnapshotSha256:review.snapshotSha256,context,claimedAt:new Date(now()).toISOString()};
  await new DurableCloudState({read:async()=>({value:next})},'website').inspect();
  await dependencies.save({status:'claiming-new-fence',originalFence:document.fence,fence:lease.fence});
  await state.adapter.conditionalWrite('website',next,original.version); // One claim CAS, no retry/lease stealing.
  const unchangedMetadata=value=>{const copy=structuredClone(value);for(const key of['fence','lease','paused','intents','receipts','stagedDailyContinuation','latestRelease','archiveHead'])delete copy[key];return hash(copy);};
  const retainedHistoryUnchanged=value=>unchangedMetadata(value)===unchangedMetadata(document)&&hash(value.unresolvedSetupIncident)===review.originalUnknownRawSha256&&hash(value.retiredSetupIncidents??null)===hash(document.retiredSetupIncidents??null)&&hash(value.preEffectLeaseRetirements??null)===hash(document.preEffectLeaseRetirements??null)&&hash(value.acceptance??null)===hash(document.acceptance??null)&&hash(value.promotionAcceptance??null)===hash(document.promotionAcceptance??null);
  const suffix=createHash('sha256').update(review.candidateDeployment).digest('hex').slice(0,40),promoteId=`promote-${suffix}`,rollbackId=`rollback-${suffix}`;
  const promotePayload={kind:'vercel-promote',editionId:review.editionId,artifactPackageManifestSha256:review.artifactPackageManifestSha256,artifactManifestSha256:review.artifactManifestSha256,deployment:review.candidateDeployment,previous:review.previousDeployment,commit:review.artifactSource};
  const rollbackPayload={kind:'vercel-rollback',artifactPackageManifestSha256:review.artifactPackageManifestSha256,failed:review.candidateDeployment,restore:review.previousDeployment,commit:review.artifactSource,previousManifestSha256:review.previousPublicManifestSha256};
  const originalIds=Object.keys(document.intents).sort(),keys=value=>Object.keys(value).sort().join('\0');
  const verifyNewRow=(value,id,payload)=>{
    const item=value.intents[id];check(item&&item.operationId===id&&item.runId===lease.runId&&item.fence===lease.fence&&['pending','uncertain','confirmed'].includes(item.status)&&hash(item.payload)===hash(payload)&&item.payloadSha256===hash(payload),'staged_continuation_effect_outside_scope');
    if(item.status==='confirmed'){const receipt=value.receipts[id];check(item.proof?.operationId===id&&item.proof.payloadSha256===item.payloadSha256&&item.proof.status==='applied'&&item.evidenceSha256===hash(item.proof)&&receipt?.sha256===hash(item)&&hash(receipt.receipt)===hash(item),'staged_continuation_effect_outside_scope');}
    else check(!Object.hasOwn(value.receipts,id),'staged_continuation_effect_outside_scope');
    return item;
  };
  const verifyExactPreSummary=(value,successOnly=false)=>{
    check(retainedHistoryUnchanged(value)&&value.latestRelease===undefined&&hash(value.archiveHead??null)===hash(document.archiveHead??null)&&hash(value.stagedDailyContinuation)===hash(next.stagedDailyContinuation),'staged_continuation_history_changed');
    for(const id of originalIds)check(Object.hasOwn(value.intents,id)&&Object.hasOwn(value.receipts,id)&&hash(value.intents[id])===hash(document.intents[id])&&hash(value.receipts[id])===hash(document.receipts[id]),'staged_continuation_history_changed');
    const added=Object.keys(value.intents).filter(id=>!Object.hasOwn(document.intents,id));
    check(added.every(id=>id===promoteId||(!successOnly&&id===rollbackId))&&(!successOnly||added.length===1&&added[0]===promoteId),'staged_continuation_effect_outside_scope');
    const expectedReceiptIds=[...originalIds];
    if(added.includes(promoteId)){const item=verifyNewRow(value,promoteId,promotePayload);if(item.status==='confirmed'){expectedReceiptIds.push(promoteId);check(hash(item.proof.proof)===hash({kind:'vercel-promote',pointers:TARGET.domains.map(domain=>({domain,deployment:review.candidateDeployment})),previous:review.previousDeployment,deployment:review.candidateDeployment}),'staged_continuation_effect_outside_scope');}else check(!successOnly,'staged_continuation_effect_outside_scope');}
    if(added.includes(rollbackId)){check(value.intents[promoteId]?.status==='confirmed','staged_continuation_effect_outside_scope');const item=verifyNewRow(value,rollbackId,rollbackPayload);if(item.status==='confirmed')expectedReceiptIds.push(rollbackId);}
    check(keys(value.receipts)===expectedReceiptIds.sort().join('\0'),'staged_continuation_effect_outside_scope');
  };
  const beforeMutation=async commit=>{
    try {
    check(commit===review.artifactSource,'staged_continuation_source_changed');
    const current=await state.inspect();verifyExactPreSummary(current);

    validateStagedContinuationReview({env,review,now:now()});
    await state.renew(lease,3600000);
    await dependencies.verifyControllerAndPolicy();
    await restored.verify();
    if(Object.values(current.intents).some(i=>i.fence===lease.fence&&i.payload.kind==='vercel-promote'&&i.status==='uncertain'))await restored.verifyPromotion();
    } catch(error) { try { await dependencies.reportProviderFailure?.(error); } catch {} throw error; }
  };
  const oldReceipts=Object.values(document.intents).filter(i=>i.fence===review.origin.fence).map(i=>({operationId:i.operationId,payload:structuredClone(i.payload),status:'confirmed',evidenceSha256:i.evidenceSha256,proof:structuredClone(i.proof),appliedNow:false}));
  const completeCheckpoint=async({summaryId,summaryPayload,backup,publicVerifiedAt})=>{
    const archived=JSON.parse(backup.bytes);verifyExactPreSummary(archived,true);
    const current=await state.adapter.read('website'),value=current.value;
    await new DurableCloudState({read:async()=>current},'website').inspect();
    check(retainedHistoryUnchanged(value)&&hash(value.stagedDailyContinuation?.context)===hash(context)&&Object.keys(value.intents).length===1&&Object.keys(value.receipts).length===1&&value.intents[summaryId]?.fence===lease.fence&&value.intents[summaryId]?.runId===lease.runId&&value.lease?.runId===lease.runId&&value.lease.fence===lease.fence&&value.stagedDailyContinuation?.reviewSha256===hash(review)&&Object.values(value.intents).every(i=>i.status==='confirmed')&&value.latestRelease?.summary?.operationId===summaryId&&hash(value.latestRelease.continuation)===hash(context),'staged_continuation_checkpoint_changed');
    const expectedLatest={source:review.artifactSource,editionId:review.editionId,verifiedAt:publicVerifiedAt,deployment:review.candidateDeployment,publicationProvenance:review.publicationProvenance,artifactManifestSha256:review.artifactManifestSha256,artifactPackageManifestSha256:review.artifactPackageManifestSha256,continuation:context,summary:{archivedStateSha256:backup.sha256,operationId:summaryId,payloadSha256:hash(summaryPayload),fileId:summaryPayload.fileId,folderId:summaryPayload.folderId,sha256:summaryPayload.sha256,length:summaryPayload.bytes}};
    check(hash(value.latestRelease)===hash(expectedLatest)&&hash(value.stagedDailyContinuation)===hash(next.stagedDailyContinuation),'staged_continuation_checkpoint_changed');
    const summary=verifyNewRow(value,summaryId,summaryPayload),remote=summary.proof.proof;
    check(summaryId===`summary-${summaryPayload.sha256}`&&summary.status==='confirmed'&&summaryPayload.kind==='drive-evidence'&&summaryPayload.role==='release-summary'&&summaryPayload.archivedStateSha256===backup.sha256&&summaryPayload.folderId===review.bindings.folderId&&remote.ownerOnly===true&&remote.downloadVerified===true&&remote.ownerPermissionId===review.bindings.ownerPermissionId&&remote.fileId===summaryPayload.fileId&&remote.folderId===summaryPayload.folderId&&remote.sha256===summaryPayload.sha256&&remote.length===summaryPayload.bytes&&value.archiveHead?.archivedIntentCount===originalIds.length+1&&value.archiveHead.archivedReceiptCount===originalIds.length+1&&value.archiveHead.summaryOperationId===summaryId&&value.archiveHead.backupSha256===backup.sha256,'staged_continuation_checkpoint_changed');
    const completion={schemaVersion:1,outcome:'existing-stage-publication-completed-paused',reviewSha256:hash(review),contextSha256:hash(context),originalSnapshotSha256:review.snapshotSha256,artifactSource:review.artifactSource,artifactImplementationSha256:review.artifactImplementationSha256,controllerSource:review.controllerSource,controllerImplementationSha256:review.controllerImplementationSha256,completedBy:context.operator,deployment:review.candidateDeployment,artifactManifestSha256:review.artifactManifestSha256,artifactPackageManifestSha256:review.artifactPackageManifestSha256,summaryOperationId:summaryId,summaryFileId:summaryPayload.fileId,summarySha256:summaryPayload.sha256,archivedStateSha256:backup.sha256,publicVerifiedAt,originalEffectsReissued:false,routineActivationAuthorized:false};
    const terminal=structuredClone(value);terminal.paused=true;terminal.lease=null;terminal.stagedDailyContinuation.status='completed';terminal.stagedDailyContinuation.completion=completion;terminal.stagedDailyContinuation.completionSha256=hash(completion);
    await new DurableCloudState({read:async()=>({value:terminal})},'website').inspect();
    await state.adapter.conditionalWrite('website',terminal,current.version);
    check(hash((await state.adapter.read('website')).value)===hash(terminal),'staged_continuation_checkpoint_readback_changed');
    await dependencies.save({status:completion.outcome,completionSha256:hash(completion),fence:lease.fence,paused:true,leaseRetired:true,routineActivationAuthorized:false});
  };
  let result,heldAfterPhase;
  const saveReceipt=async update=>{if(update.status)heldAfterPhase=update.status;await dependencies.save(update);};
  try {
  check(hash((await state.adapter.read('website')).value)===hash(next),'staged_continuation_claim_readback_changed');
  await dependencies.save({mode:'finite-staged-daily-continuation',status:'claimed-new-fence',originalFence:document.fence,fence:lease.fence,reviewSha256:hash(review),effectsReissued:false,routineActivationAuthorized:false});
    result=await finishConfirmedStagedRelease({admission:{state,lease},editionId:review.editionId,releaseCommit:review.artifactSource,candidate:{deployment:pinned.candidateDeployment,url:pinned.candidateUrl},previousDeployment:review.previousDeployment,manifest:restored.manifest,rollbackManifest:restored.previousManifest,artifactPackageManifestSha256:review.artifactPackageManifestSha256,publicationProvenance:review.publicationProvenance,target:TARGET,vercel:dependencies.vercel,cli:dependencies.mutate,beforeMutation,verifyProtected:dependencies.verifyProtected,verifyPublic:dependencies.verifyPublic,evidenceConfig:dependencies.evidenceConfig,allocate:dependencies.allocate,providerFactory:dependencies.providerFactory,token:dependencies.token,operationReceipts:oldReceipts,saveReceipt,fetchImpl:dependencies.fetchImpl,continuation:context,completeCheckpoint,beforeSummary:async()=>verifyExactPreSummary(await state.inspect(),true),verifyBackup:async backup=>verifyExactPreSummary(JSON.parse(backup.bytes),true)});
  } catch(error) {
    // Pause only the proven claimed operator; never clear uncertain effects or
    // a lease, retry a mutation, or claim success after ambiguous checkpoint.
    try { const held=await state.adapter.read('website');if(held.value?.lease?.runId===lease.runId&&held.value.lease.fence===lease.fence&&held.value.stagedDailyContinuation?.reviewSha256===hash(review)){const value=structuredClone(held.value);value.paused=true;value.stagedDailyContinuation.status='held';await state.adapter.conditionalWrite('website',value,held.version);await dependencies.save({status:'held-paused',heldAfterPhase,fence:lease.fence,leaseRetired:false,originalEffectsReissued:false,routineActivationAuthorized:false});} } catch {}
    throw error;
  }
  return{mode:'finite-staged-daily-continuation',status:'existing-stage-publication-completed-paused',published:result.published,releaseCommit:review.artifactSource,candidateDeployment:review.candidateDeployment,originalFence:review.origin.fence,fence:lease.fence,paused:true,leaseRetired:true,originalEffectsReissued:false,routineActivationAuthorized:false};
}
