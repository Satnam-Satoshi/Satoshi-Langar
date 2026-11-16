/** Executable cooperative coordinator, adapter-injected and imports-free.
 * Caller supplies authenticated state, provider adapters, reviewed admission,
 * approval scope and QA. CAS fences cooperating writers, NOT provider owners or
 * manual changes. Tests are mocked; this module alone proves no live operation.
 */
export const COORDINATOR_NAMESPACE='cloud-newsroom-v2';
const hex=(v,n)=>typeof v==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(v);
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>JSON.parse(JSON.stringify(v));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const stamp=v=>typeof v==='string'?Date.parse(v):NaN;
const domains=v=>Array.isArray(v)&&v.length===2&&new Set(v).size===2&&v.every(x=>typeof x==='string'&&/^[a-z0-9.-]+$/.test(x))?[...v].sort():null;
const safePhase=p=>['claimed','preview-recorded','qa-passed'].includes(p);
export function createCloudNewsroomV2Coordinator(adapters){
 if(!adapters?.state?.read||!adapters.state.cas||!adapters.provider?.createPreview||!adapters.provider.getDeployment||!adapters.provider.getDomainDeployment||!adapters.provider.promote||!adapters.qa?.verify||!adapters.clock)throw Error('explicit_adapters_required');
 return Object.freeze({advance:async function(request){
  const result=(status,reason,extra={})=>({status,reason,...extra,namespace:COORDINATOR_NAMESPACE,cooperativeOnly:true,limitations:['Provider owner/manual writes are not fenced by this coordinator.','Adapter authentication, durable CAS and independent QA/approval remain external responsibilities.']});
  let record,s,now;
  try{
   now=stamp(await adapters.clock());if(!Number.isFinite(now))return result('hold','invalid_clock');
   record=await adapters.state.read(COORDINATOR_NAMESPACE);s=clone(record?.value);
   if(!obj(s)||s.schemaVersion!==1||s.generation!==COORDINATOR_NAMESPACE||s.enabled!==true||s.previewEnabled!==true||s.emergencyStop!==false||s.oldWritersDisabled!==true)return result('hold','disabled_or_emergency_stop');
   if(!hex(s.approvedCodeCommit,40)||!domains(s.domains)||s.projectId!=='prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx'||s.repository!=='Satnam-Satoshi/Satoshi-Langar'||s.branch!=='agent/cloud-newsroom-v2-20261116'||!Number.isSafeInteger(s.fence)||s.fence<0||!Array.isArray(s.completed))return result('hold','invalid_trusted_state');
   if(!obj(request)||typeof request.owner!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(request.owner)||typeof request.runId!=='string'||!request.runId||!hex(request.candidateCommit,40)||!hex(request.artifactSha256,64)||request.reviewedCodeCommit!==s.approvedCodeCommit||!/^\d{4}-\d\d-\d\d$/.test(request.editionDate)||request.repository!==s.repository||request.branch!==s.branch||request.projectId!==s.projectId||!hex(request.candidateTreeGitSha,40)||!hex(request.receiptSha256,64)||!hex(request.reviewDigest,64))return result('hold','candidate_identity_or_review_pin_mismatch');
   const admission=request.admission;
   if(admission?.status!=='eligible-for-preview-review'||admission.candidateCommit!==request.candidateCommit||admission.artifactSha256!==request.artifactSha256||admission.reviewedCodeCommit!==s.approvedCodeCommit||admission.candidateTreeGitSha!==request.candidateTreeGitSha||admission.receiptSha256!==request.receiptSha256||admission.reviewDigest!==request.reviewDigest||admission.branch!==s.branch||!(stamp(admission.expiresAt)>now))return result('hold','fresh_external_admission_required');
   const completed=s.completed.filter(x=>x.editionDate===request.editionDate);
   if(completed.length)return result(completed.some(x=>x.artifactSha256===request.artifactSha256)?'duplicate-no-op':'hold','daily_identity_already_recorded');
   const save=async next=>{const written=await adapters.state.cas(COORDINATOR_NAMESPACE,record.version,next);if(written?.ok!==true)throw Error('cas_conflict');const observed=await adapters.state.read(COORDINATOR_NAMESPACE);if(observed?.version!==written.version||!same(observed.value,next))throw Error('cas_readback_mismatch');record=observed;s=clone(observed.value);};
   const live=async()=>{const latest=await adapters.state.read(COORDINATOR_NAMESPACE);const time=stamp(await adapters.clock());if(latest?.version!==record.version||!same(latest.value,s)||latest.value.lease?.owner!==request.owner||latest.value.lease?.fence!==s.fence||latest.value.run?.owner!==request.owner||latest.value.run?.runId!==request.runId||latest.value.emergencyStop!==false||latest.value.enabled!==true||latest.value.previewEnabled!==true||latest.value.approvedCodeCommit!==s.approvedCodeCommit||!Number.isFinite(time)||!(stamp(s.lease?.expiresAt)>time))throw Error('live_state_or_lease_changed');now=time;};
   const grantFor=(run,fence,leaseExpiry)=>{
    const end=Math.min(stamp(leaseExpiry),stamp(admission.expiresAt),now+900000);
    if(!(end>now))throw Error('preview_grant_expired');
    return {schemaVersion:1,generation:COORDINATOR_NAMESPACE,kind:'preview-admission',mode:'cooperative-preview-only',productionAuthorized:false,promotionAuthorized:false,repository:s.repository,branch:s.branch,projectId:s.projectId,candidateCommit:run.candidateCommit,candidateTreeGitSha:run.candidateTreeGitSha,approvedCodeCommit:s.approvedCodeCommit,receiptSha256:run.receiptSha256,reviewDigest:run.reviewDigest,owner:request.owner,fence,notBefore:new Date(now).toISOString(),expiresAt:new Date(end).toISOString()};
   };
   let run=s.run;
   if(run&&(run.runId!==request.runId||run.owner!==request.owner||run.editionDate!==request.editionDate||run.candidateCommit!==request.candidateCommit||run.artifactSha256!==request.artifactSha256||run.reviewedCodeCommit!==s.approvedCodeCommit||run.repository!==s.repository||run.projectId!==s.projectId||run.branch!==s.branch||run.candidateTreeGitSha!==request.candidateTreeGitSha||run.receiptSha256!==request.receiptSha256||run.reviewDigest!==request.reviewDigest||!same(run.domains,domains(s.domains))))return result('hold','active_run_conflict');
   if(!run){
    if(s.lease)return result('hold','existing_lease_requires_reconciliation');
    if(!obj(s.expectedDomains)||s.domains.some(d=>typeof s.expectedDomains[d]!=='string'||!s.expectedDomains[d]))return result('hold','expected_domain_baseline_required');
    run={runId:request.runId,owner:request.owner,reviewedCodeCommit:s.approvedCodeCommit,repository:s.repository,branch:s.branch,projectId:s.projectId,candidateTreeGitSha:request.candidateTreeGitSha,receiptSha256:request.receiptSha256,reviewDigest:request.reviewDigest,domains:domains(s.domains),editionDate:request.editionDate,candidateCommit:request.candidateCommit,artifactSha256:request.artifactSha256,phase:'claimed',expectedDomains:clone(s.expectedDomains)};
    await save({...s,fence:s.fence+1,lease:{owner:request.owner,fence:s.fence+1,expiresAt:new Date(now+120000).toISOString()},run});
   }else if(!s.lease||s.lease.owner!==request.owner||s.lease.fence!==s.fence)return result('hold','lease_identity_mismatch');
   else if(!(stamp(s.lease.expiresAt)>now)){
    if(!safePhase(run.phase))return result('hold','expired_lease_uncertain_effect_requires_reconciliation');
    const nextFence=s.fence+1,expiresAt=new Date(now+120000).toISOString();
    const previewGrant=run.phase==='claimed'?null:grantFor(run,nextFence,expiresAt);
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
   if(run.phase==='promotion-intent'){
    const actual={};for(const d of s.domains)actual[d]=await adapters.provider.getDomainDeployment({domain:d,projectId:s.projectId});
    await live();if(s.domains.some(d=>actual[d]?.deploymentId!==run.deploymentId||actual[d]?.projectId!==s.projectId))return result('hold','promotion_uncertain_or_partial_no_retry',{deploymentId:run.deploymentId});
    const done={editionDate:run.editionDate,artifactSha256:run.artifactSha256,candidateCommit:run.candidateCommit,deploymentId:run.deploymentId};
    await save({...s,completed:[...s.completed,done],expectedDomains:Object.fromEntries(s.domains.map(d=>[d,run.deploymentId])),run:null,lease:null,previewGrant:null});
    return result('published-verified','both_domains_verified',done);
   }
   if(!['preview-recorded','qa-passed'].includes(run.phase))return result('hold','unknown_run_phase');
   const deployment=await adapters.provider.getDeployment({deploymentId:run.deploymentId,projectId:s.projectId});
   if(deployment?.id!==run.deploymentId||deployment.projectId!==s.projectId||deployment.sourceCommit!==run.candidateCommit||deployment.repository!==s.repository||deployment.target!=='preview')return result('hold','preview_identity_mismatch');
   if(deployment.status!=='READY')return result(['ERROR','CANCELED'].includes(deployment.status)?'hold':'awaiting-preview','preview_not_ready',{deploymentId:run.deploymentId});
   if(run.phase==='preview-recorded'){
    const qa=await adapters.qa.verify({deploymentId:run.deploymentId,sourceCommit:run.candidateCommit,artifactSha256:run.artifactSha256,projectId:s.projectId});await live();
    if(qa?.passed!==true||qa.deploymentId!==run.deploymentId||qa.sourceCommit!==run.candidateCommit||qa.artifactSha256!==run.artifactSha256||qa.projectId!==s.projectId||!(stamp(qa.expiresAt)>now))return result('hold','independent_qa_failed_or_unbound');
    await save({...s,run:{...run,phase:'qa-passed',qa}});return result('preview-verified','awaiting_publication_authority',{deploymentId:run.deploymentId});
   }
   if(!(stamp(run.qa?.expiresAt)>now))return result('hold','qa_expired');
   const approval=request.approval;
   if(s.publicationEnabled!==true||approval?.approved!==true||approval.projectId!==s.projectId||approval.deploymentId!==run.deploymentId||approval.sourceCommit!==run.candidateCommit||approval.artifactSha256!==run.artifactSha256||!same(domains(approval.domains),domains(s.domains))||!(stamp(approval.expiresAt)>now))return result('hold','explicit_both_domain_publication_approval_required');
   for(const domain of s.domains){const actual=await adapters.provider.getDomainDeployment({domain,projectId:s.projectId});if(actual?.deploymentId!==run.expectedDomains[domain]||actual?.projectId!==s.projectId)return result('hold','production_baseline_changed');}
   await live();if(!(stamp(run.qa.expiresAt)>now)||!(stamp(approval.expiresAt)>now))return result('hold','qa_or_approval_expired');
   await save({...s,run:{...run,phase:'promotion-intent',promotionIntentAt:new Date(now).toISOString(),approval:clone(approval),fence:s.fence}});await live();
   try{await adapters.provider.promote({deploymentId:run.deploymentId,projectId:s.projectId,domains:[...s.domains],sourceCommit:run.candidateCommit,expectedDomains:clone(run.expectedDomains),fence:s.fence,runId:run.runId});}catch{return result('awaiting-reconciliation','promotion_result_uncertain_no_retry',{deploymentId:run.deploymentId});}
   return result('awaiting-reconciliation','promotion_requested_verify_domains',{deploymentId:run.deploymentId});
  }catch{return result('hold','adapter_cas_or_live_state_failure');}
 }});
}
