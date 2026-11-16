/** Executable cooperative coordinator, adapter-injected and imports-free.
 * Caller supplies authenticated state, provider adapters, reviewed admission,
 * approval scope and QA. CAS fences cooperating writers, NOT provider owners or
 * manual changes. Tests are mocked; this module alone proves no live operation.
 */
export const COORDINATOR_NAMESPACE='cloud-newsroom-v2';
export const MAX_COORDINATOR_STATE_BYTES=24*1024;
// Rolling latest pointer, not a separate append-only ledger. The Git CAS adapter
// must preserve prior versions as commits; monotonic dates fence older replays.
const boundedState=s=>new TextEncoder().encode(JSON.stringify(s)).byteLength<=MAX_COORDINATOR_STATE_BYTES;
const validDate=d=>typeof d==='string'&&/^\d{4}-\d\d-\d\d$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
const hex=(v,n)=>typeof v==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(v);
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>JSON.parse(JSON.stringify(v));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const stamp=v=>typeof v==='string'?Date.parse(v):NaN;
const domains=v=>Array.isArray(v)&&v.length===2&&new Set(v).size===2&&v.every(x=>typeof x==='string'&&/^[a-z0-9.-]+$/.test(x))?[...v].sort():null;
const safePhase=p=>['claimed','preview-recorded','qa-passed'].includes(p);
/** Normalize trusted pipeline outputs, never a producer-provided identity mapping.
 * observed is coordinator-observed Git/receipt fingerprint metadata; evaluatorInput
 * is the EXACT input whose receipt/tree the actual evaluator checked. This pure
 * helper cannot authenticate supplied objects or compute Git/receipt digests.
 * v2 artifactSha256 is the PDF byte SHA256; pdfSha256 makes that binding explicit.
 */
export function normalizeCloudNewsroomV2CoordinatorRequest({receipt,evaluation,evaluatorInput,observed,owner,runId}={}){
 const reject=()=>{throw Error('bound_actual_receipt_and_evaluation_required');};
 const p=evaluation?.proposal,m=receipt?.validation?.manifest;
 if(receipt?.status!=='accepted-receipt'||receipt.errors?.length!==0||receipt.operational!==false||receipt.effects?.length!==0||receipt.validation?.status!=='validated-description'||receipt.validation.errors?.length!==0||!m||evaluation?.status!=='eligible-for-preview-review'||evaluation.errors?.length!==0||evaluation.effects?.length!==0||evaluation.promotionAuthorized!==false||!p||!evaluatorInput||!same(evaluatorInput.receipt,receipt)||!same(observed?.receipt,receipt))reject();
 if(!hex(p.candidateCommit,40)||p.candidateCommit!==evaluatorInput.candidateCommit||p.candidateCommit!==observed.candidateCommit||!hex(observed.candidateTreeGitSha,40)||!hex(observed.receiptSha256,64)||!hex(observed.reviewDigest,64)||p.reviewedSourceCommit!==m.sourceCommit||p.issueId!==`${m.editionDate}-r${m.revision}`||receipt.publication?.registryId!==p.issueId||p.nextStep!=='independent-preview-review-only'||!Number.isFinite(stamp(p.expiresAt)))reject();
 if(observed.repository!=='Satnam-Satoshi/Satoshi-Langar'||observed.branch!=='agent/cloud-newsroom-v2-20261116'||observed.projectId!=='prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx'||!Array.isArray(evaluatorInput.candidateTree)||!Array.isArray(p.artifactPaths)||p.artifactPaths.length!==4||new Set(p.artifactPaths).size!==4||receipt.artifacts?.length!==4||m.artifacts?.length!==4)reject();
 const base=`public/magazine/daily/${m.editionDate}/r${m.revision}/`;
 for(const role of ['pdf','html','cover','promo']){
  const aa=receipt.artifacts.filter(a=>a.role===role),dd=m.artifacts.filter(a=>a.role===role);if(aa.length!==1||dd.length!==1)reject();const a=aa[0],d=dd[0];
  const suffix=role==='pdf'?'edition.pdf':role==='html'?'reader.html':role==='cover'?'cover.png':{'image/png':'promo.png','image/jpeg':'promo.jpg','image/webp':'promo.webp'}[d.mimeType];
  const destination=base+suffix,entries=evaluatorInput.candidateTree.filter(e=>e.path===destination);if(!suffix||entries.length!==1||!p.artifactPaths.includes(destination))reject();const e=entries[0];
  if(a.verification!=='actual-local-file-bytes'||!hex(a.sha256,64)||!Number.isSafeInteger(a.bytes)||a.bytes<1||a.path!==d.path||a.editionId!==m.editionId||a.revision!==m.revision||a.sha256!==d.sha256||a.bytes!==d.bytes||e.mode!=='100644'||e.sha256!==a.sha256||e.bytes!==a.bytes)reject();
 }
 const pdf=receipt.artifacts.find(a=>a.role==='pdf');
 const identity={candidateCommit:p.candidateCommit,candidateTreeGitSha:observed.candidateTreeGitSha,receiptSha256:observed.receiptSha256,reviewDigest:observed.reviewDigest,artifactSha256:pdf.sha256,pdfSha256:pdf.sha256,reviewedCodeCommit:p.reviewedSourceCommit,branch:observed.branch};
 return {owner,runId,editionDate:m.editionDate,repository:observed.repository,projectId:observed.projectId,...identity,admission:{status:'eligible-for-preview-review',...identity,expiresAt:p.expiresAt}};
}
export function createCloudNewsroomV2Coordinator(adapters){
 if(!adapters?.state?.read||!adapters.state.cas||!adapters.provider?.createPreview||!adapters.provider.getDeployment||!adapters.provider.getDomainDeployment||!adapters.provider.promote||!adapters.qa?.verify||!adapters.qa.verifyPublic||!adapters.clock)throw Error('explicit_adapters_required');
 return Object.freeze({advance:async function(request){
  const result=(status,reason,extra={})=>({status,reason,...extra,namespace:COORDINATOR_NAMESPACE,cooperativeOnly:true,limitations:['Provider owner/manual writes are not fenced by this coordinator.','Adapter authentication, durable CAS and independent QA/approval remain external responsibilities.']});
  let record,s,now;
  try{
   now=stamp(await adapters.clock());if(!Number.isFinite(now))return result('hold','invalid_clock');
   record=await adapters.state.read(COORDINATOR_NAMESPACE);s=clone(record?.value);
   if(!obj(s)||!boundedState(s)||s.schemaVersion!==1||s.generation!==COORDINATOR_NAMESPACE||s.enabled!==true||s.previewEnabled!==true||s.emergencyStop!==false||s.oldWritersDisabled!==true)return result('hold','disabled_or_emergency_stop');
   if(!hex(s.approvedCodeCommit,40)||!domains(s.domains)||s.projectId!=='prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx'||s.repository!=='Satnam-Satoshi/Satoshi-Langar'||s.branch!=='agent/cloud-newsroom-v2-20261116'||!Number.isSafeInteger(s.fence)||s.fence<0||!Array.isArray(s.completed)||s.completed.length>1||s.completed.some(c=>!obj(c)||!validDate(c.editionDate)||!hex(c.pdfSha256,64)))return result('hold','invalid_trusted_state');
   if(!obj(request)||typeof request.owner!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(request.owner)||typeof request.runId!=='string'||!request.runId||!hex(request.candidateCommit,40)||!hex(request.artifactSha256,64)||!hex(request.pdfSha256,64)||request.reviewedCodeCommit!==s.approvedCodeCommit||!validDate(request.editionDate)||request.repository!==s.repository||request.branch!==s.branch||request.projectId!==s.projectId||!hex(request.candidateTreeGitSha,40)||!hex(request.receiptSha256,64)||!hex(request.reviewDigest,64))return result('hold','candidate_identity_or_review_pin_mismatch');
   const admission=request.admission;
   if(admission?.status!=='eligible-for-preview-review'||admission.candidateCommit!==request.candidateCommit||admission.artifactSha256!==request.artifactSha256||admission.pdfSha256!==request.pdfSha256||admission.reviewedCodeCommit!==s.approvedCodeCommit||admission.candidateTreeGitSha!==request.candidateTreeGitSha||admission.receiptSha256!==request.receiptSha256||admission.reviewDigest!==request.reviewDigest||admission.branch!==s.branch||!(stamp(admission.expiresAt)>now))return result('hold','fresh_external_admission_required');
   const latest=s.completed[0];
   if(latest&&request.editionDate<=latest.editionDate)return result(request.editionDate===latest.editionDate&&request.pdfSha256===latest.pdfSha256?'duplicate-no-op':'hold','monotonic_completed_date_fence');
   const save=async next=>{if(!boundedState(next))throw Error('coordinator_state_size_limit');const written=await adapters.state.cas(COORDINATOR_NAMESPACE,record.version,next);if(written?.ok!==true)throw Error('cas_conflict');const observed=await adapters.state.read(COORDINATOR_NAMESPACE);if(observed?.version!==written.version||!same(observed.value,next))throw Error('cas_readback_mismatch');record=observed;s=clone(observed.value);};
   const live=async()=>{const latest=await adapters.state.read(COORDINATOR_NAMESPACE);const time=stamp(await adapters.clock());if(latest?.version!==record.version||!same(latest.value,s)||latest.value.lease?.owner!==request.owner||latest.value.lease?.fence!==s.fence||latest.value.run?.owner!==request.owner||latest.value.run?.runId!==request.runId||latest.value.emergencyStop!==false||latest.value.enabled!==true||latest.value.previewEnabled!==true||latest.value.approvedCodeCommit!==s.approvedCodeCommit||!Number.isFinite(time)||!(stamp(s.lease?.expiresAt)>time))throw Error('live_state_or_lease_changed');now=time;};
   const grantFor=(run,fence,leaseExpiry)=>{
    const end=Math.min(stamp(leaseExpiry),stamp(admission.expiresAt),now+900000);
    if(!(end>now))throw Error('preview_grant_expired');
    return {schemaVersion:1,generation:COORDINATOR_NAMESPACE,kind:'preview-admission',mode:'cooperative-preview-only',productionAuthorized:false,promotionAuthorized:false,repository:s.repository,branch:s.branch,projectId:s.projectId,candidateCommit:run.candidateCommit,candidateTreeGitSha:run.candidateTreeGitSha,approvedCodeCommit:s.approvedCodeCommit,receiptSha256:run.receiptSha256,reviewDigest:run.reviewDigest,owner:request.owner,fence,notBefore:new Date(now).toISOString(),expiresAt:new Date(end).toISOString()};
   };
   let run=s.run;
   if(run&&(run.runId!==request.runId||run.owner!==request.owner||run.editionDate!==request.editionDate||run.candidateCommit!==request.candidateCommit||run.artifactSha256!==request.artifactSha256||run.pdfSha256!==request.pdfSha256||run.reviewedCodeCommit!==s.approvedCodeCommit||run.repository!==s.repository||run.projectId!==s.projectId||run.branch!==s.branch||run.candidateTreeGitSha!==request.candidateTreeGitSha||run.receiptSha256!==request.receiptSha256||run.reviewDigest!==request.reviewDigest||!same(run.domains,domains(s.domains))))return result('hold','active_run_conflict');
   if(!run){
    if(s.lease)return result('hold','existing_lease_requires_reconciliation');
    if(!obj(s.expectedDomains)||s.domains.some(d=>typeof s.expectedDomains[d]!=='string'||!s.expectedDomains[d]))return result('hold','expected_domain_baseline_required');
    run={runId:request.runId,owner:request.owner,reviewedCodeCommit:s.approvedCodeCommit,repository:s.repository,branch:s.branch,projectId:s.projectId,candidateTreeGitSha:request.candidateTreeGitSha,receiptSha256:request.receiptSha256,reviewDigest:request.reviewDigest,domains:domains(s.domains),editionDate:request.editionDate,candidateCommit:request.candidateCommit,artifactSha256:request.artifactSha256,pdfSha256:request.pdfSha256,phase:'claimed',expectedDomains:clone(s.expectedDomains)};
    await save({...s,fence:s.fence+1,lease:{owner:request.owner,fence:s.fence+1,expiresAt:new Date(now+120000).toISOString()},run});
   }else if(!s.lease||s.lease.owner!==request.owner||s.lease.fence!==s.fence)return result('hold','lease_identity_mismatch');
   else if(!(stamp(s.lease.expiresAt)>now)){
    if(!safePhase(run.phase)&&!['promotion-intent','public-qa-pending'].includes(run.phase))return result('hold','expired_lease_uncertain_effect_requires_reconciliation');
    const nextFence=s.fence+1,expiresAt=new Date(now+120000).toISOString();
    const previewGrant=['claimed','promotion-intent','public-qa-pending'].includes(run.phase)?null:grantFor(run,nextFence,expiresAt);
    await save({...s,fence:nextFence,lease:{owner:request.owner,fence:nextFence,expiresAt},previewGrant,run:{...run,fence:nextFence}});
   }
   await live();run=s.run;
   if(run.phase==='claimed'){
    const previewGrant=grantFor(run,s.fence,s.lease.expiresAt);
    await save({...s,previewGrant,run:{...run,phase:'create-intent',intentAt:new Date(now).toISOString(),fence:s.fence}});await live();
    let deployment;try{deployment=await adapters.provider.createPreview({repository:s.repository,branch:s.branch,projectId:s.projectId,sourceCommit:run.candidateCommit,target:'preview',production:false,runId:run.runId,fence:s.fence,artifactSha256:run.artifactSha256});}catch{return result('hold','create_result_uncertain_no_retry');}
    if(typeof deployment?.id!=='string'||!deployment.id)return result('hold','create_result_missing_id_no_retry');
    await save({...s,run:{...s.run,phase:'preview-recorded',deploymentId:deployment.id}});
    return result('awaiting-preview','preview_created',{deploymentId:deployment.id});
   }
   if(run.phase==='create-intent')return result('hold','create_intent_requires_provider_reconciliation_no_retry');
   if(['promotion-intent','public-qa-pending'].includes(run.phase)){
    const actual={};for(const d of s.domains)actual[d]=await adapters.provider.getDomainDeployment({domain:d,projectId:s.projectId});
    await live();if(s.domains.some(d=>actual[d]?.deploymentId!==run.deploymentId||actual[d]?.projectId!==s.projectId))return result('hold','promotion_uncertain_or_partial_no_retry',{deploymentId:run.deploymentId});
    if(run.phase==='promotion-intent'){
     await save({...s,previewGrant:null,run:{...run,phase:'public-qa-pending'}});run=s.run;
    }
    await live();
    const publicQa=await adapters.qa.verifyPublic({deploymentId:run.deploymentId,sourceCommit:run.candidateCommit,artifactSha256:run.artifactSha256,pdfSha256:run.pdfSha256,projectId:s.projectId,domains:[...s.domains],editionDate:run.editionDate});
    await live();
    const observations=publicQa?.domainObservations;
    if(publicQa?.passed!==true||publicQa.deploymentId!==run.deploymentId||publicQa.sourceCommit!==run.candidateCommit||publicQa.artifactSha256!==run.artifactSha256||publicQa.pdfSha256!==run.pdfSha256||publicQa.projectId!==s.projectId||!same(domains(publicQa.domains),domains(s.domains))||!(stamp(publicQa.checkedAt)>=stamp(run.promotionIntentAt))||stamp(publicQa.checkedAt)>now||!(stamp(publicQa.expiresAt)>now)||!Array.isArray(observations)||observations.length!==2||!same(domains(observations.map(o=>o?.domain)),domains(s.domains))||observations.some(o=>o.routesPassed!==true||o.pdfBytesPassed!==true||o.pdfSha256!==run.pdfSha256))return result('hold','public_route_or_pdf_qa_failed_or_unbound',{deploymentId:run.deploymentId});
    // Domain aliases may have changed while public content was being checked.
    for(const domain of s.domains){const current=await adapters.provider.getDomainDeployment({domain,projectId:s.projectId});if(current?.deploymentId!==run.deploymentId||current?.projectId!==s.projectId)return result('hold','public_qa_domain_changed');}
    await live();if(!(stamp(publicQa.expiresAt)>now))return result('hold','public_qa_expired');
    const done={editionDate:run.editionDate,artifactSha256:run.artifactSha256,pdfSha256:run.pdfSha256,candidateCommit:run.candidateCommit,deploymentId:run.deploymentId,publicQa:{passed:true,checkedAt:publicQa.checkedAt,expiresAt:publicQa.expiresAt,domains:domains(s.domains),pdfSha256:run.pdfSha256}};
    await save({...s,completed:[done],expectedDomains:Object.fromEntries(s.domains.map(d=>[d,run.deploymentId])),run:null,lease:null,previewGrant:null});
    return result('published-verified','both_domains_and_public_artifacts_verified',done);
   }
   if(!['preview-recorded','qa-passed'].includes(run.phase))return result('hold','unknown_run_phase');
   const deployment=await adapters.provider.getDeployment({deploymentId:run.deploymentId,projectId:s.projectId});
   if(deployment?.id!==run.deploymentId||deployment.projectId!==s.projectId||deployment.sourceCommit!==run.candidateCommit||deployment.repository!==s.repository||deployment.target!=='preview')return result('hold','preview_identity_mismatch');
   if(deployment.status!=='READY')return result(['ERROR','CANCELED'].includes(deployment.status)?'hold':'awaiting-preview','preview_not_ready',{deploymentId:run.deploymentId});
   if(run.phase==='preview-recorded'){
    const qa=await adapters.qa.verify({deploymentId:run.deploymentId,sourceCommit:run.candidateCommit,artifactSha256:run.artifactSha256,pdfSha256:run.pdfSha256,projectId:s.projectId});await live();
    if(qa?.passed!==true||qa.deploymentId!==run.deploymentId||qa.sourceCommit!==run.candidateCommit||qa.artifactSha256!==run.artifactSha256||qa.pdfSha256!==run.pdfSha256||qa.projectId!==s.projectId||!(stamp(qa.expiresAt)>now))return result('hold','independent_qa_failed_or_unbound');
    await save({...s,run:{...run,phase:'qa-passed',qa:{passed:true,deploymentId:qa.deploymentId,sourceCommit:qa.sourceCommit,artifactSha256:qa.artifactSha256,pdfSha256:qa.pdfSha256,projectId:qa.projectId,expiresAt:qa.expiresAt}}});return result('preview-verified','awaiting_publication_authority',{deploymentId:run.deploymentId});
   }
   if(!(stamp(run.qa?.expiresAt)>now))return result('hold','qa_expired');
   const approval=request.approval;
   if(s.publicationEnabled!==true||approval?.approved!==true||approval.projectId!==s.projectId||approval.deploymentId!==run.deploymentId||approval.sourceCommit!==run.candidateCommit||approval.artifactSha256!==run.artifactSha256||approval.pdfSha256!==run.pdfSha256||!same(domains(approval.domains),domains(s.domains))||!(stamp(approval.expiresAt)>now))return result('hold','explicit_both_domain_publication_approval_required');
   for(const domain of s.domains){const actual=await adapters.provider.getDomainDeployment({domain,projectId:s.projectId});if(actual?.deploymentId!==run.expectedDomains[domain]||actual?.projectId!==s.projectId)return result('hold','production_baseline_changed');}
   await live();if(!(stamp(run.qa.expiresAt)>now)||!(stamp(approval.expiresAt)>now))return result('hold','qa_or_approval_expired');
   await save({...s,run:{...run,phase:'promotion-intent',promotionIntentAt:new Date(now).toISOString(),approval:{approved:true,projectId:approval.projectId,deploymentId:approval.deploymentId,sourceCommit:approval.sourceCommit,artifactSha256:approval.artifactSha256,pdfSha256:approval.pdfSha256,domains:domains(approval.domains),expiresAt:approval.expiresAt},fence:s.fence}});await live();
   try{await adapters.provider.promote({deploymentId:run.deploymentId,projectId:s.projectId,domains:[...s.domains],sourceCommit:run.candidateCommit,expectedDomains:clone(run.expectedDomains),fence:s.fence,runId:run.runId});}catch{return result('awaiting-reconciliation','promotion_result_uncertain_no_retry',{deploymentId:run.deploymentId});}
   return result('awaiting-reconciliation','promotion_requested_verify_domains',{deploymentId:run.deploymentId});
  }catch{return result('hold','adapter_cas_or_live_state_failure');}
 }});
}
