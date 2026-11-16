/** Preview-only composition. Run reviewed code, with independently owned trust,
 * Git observations and connector callbacks. No ambient MCP, credentials, provider
 * environment or producer schedule is invented here. Returned admissionCapture
 * is private working evidence, not safe to publish wholesale.
 */
import {createHash} from 'node:crypto';
import {ingestCloudNewsroomV2Bundle} from './cloud-newsroom-v2-ingest.mjs';
import {createCloudNewsroomV2CandidateTransport} from './cloud-newsroom-v2-candidate-transport.mjs';
import {createPrivatePhaseJournal} from './cloud-newsroom-v2-private-journal.mjs';
import {evaluateCloudNewsroomV2DataAdmission} from './cloud-newsroom-v2-data-admission.mjs';
import {normalizeCloudNewsroomV2CoordinatorRequest,createCloudNewsroomV2Coordinator} from './cloud-newsroom-v2-coordinator.mjs';
import {observeCloudNewsroomV2GitCandidate} from './cloud-newsroom-v2-admission-wrapper.mjs';
import {V2_CONNECTOR_SCOPE as S} from './cloud-newsroom-v2-connector-adapters.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const clone=x=>structuredClone(x);
// Same bounded envelope levels as candidate transport: structuredContent or the
// first parseable text JSON, one optional result wrapper, then fetch.content JSON.
function fetchedRef(r){
 if(r?.isError)throw Error('connector_error');
 let p=r?.structuredContent;
 if(!p)for(const b of r?.content??[])if(b.type==='text'){try{p=JSON.parse(b.text);break;}catch{}}
 if(p?.error||!p)throw Error('unknown_connector_result');
 p=p.result??p;
 if(p?.error||typeof p?.content!=='string')throw Error('fetch_json_required');
 return JSON.parse(p.content);
}

/** loadTrust({runId}) -> {expectedProducer,existingDailyIssues,
 * trustedSourcePolicies,trustedEvidence,baseline,admissionTrust,reviewDigest}.
 * observeCandidate({candidateCommit,candidateTreeGitSha,priorCommit}) -> actual
 * complete Git-object observations {candidateCommit,candidateTreeGitSha,
 * priorCommit,candidateParents,candidateTree,candidateRegistryText,priorTree,
 * currentRegistryText}. This is NOT a candidate-supplied attestation.
 * prepareCandidateObservation is an OPTIONAL explicitly authorized local isolated
 * checkout materialization callback. It must not move a remote ref. No implicit
 * fetch/checkout occurs; repoRoot alone cannot materialize an unreferenced commit.
 * Reconcile never invokes this callback.
 * journal is {root,inventory}, consumed by existing private phase journal.
 * gitTools/readArtifact use candidate-transport's exact callback signatures.
 */
export function createCloudNewsroomV2PublicationRunner({clock,loadTrust,gitTools,readArtifact,journal,observeCandidate,repoRoot,prepareCandidateObservation,coordinatorAdapters,permissions={}}={}){
 if(typeof clock!=='function'||typeof loadTrust!=='function')throw Error('independent_clock_and_trust_required');
 const flags=Object.freeze({stageObjects:permissions.stageObjects===true,updateSourceRef:permissions.updateSourceRef===true,createPreview:permissions.createPreview===true});
 if((flags.updateSourceRef||flags.createPreview)&&!flags.stageObjects)throw Error('staging_permission_required');
 if(flags.createPreview&&!flags.updateSourceRef)throw Error('source_ref_permission_required');
 let observationRoot=repoRoot;
 const observer=observeCandidate??((repoRoot||prepareCandidateObservation)?args=>({...observeCloudNewsroomV2GitCandidate({repoRoot:observationRoot,repository:S.repository,branch:S.branch,...args}),priorCommit:args.priorCommit}):undefined);
 let phaseJournal,busy=false;
 const advance=async({runId,owner,bundle}={})=>{
  let phase='ingestion';
  const result=(status,extra={})=>({status,phase,...extra,promotionAuthorized:false,producerInvoked:false});
  try{
   if(!/^[A-Za-z0-9_-]{1,80}$/.test(runId??''))throw Error('run_id_required');
   const trust=clone(await loadTrust({runId}));
   const now=await clock();
   const receipt=await ingestCloudNewsroomV2Bundle({bundleRoot:bundle?.bundleRoot,manifest:clone(bundle?.manifest),now,expectedProducer:trust.expectedProducer,existingDailyIssues:trust.existingDailyIssues,trustedSourcePolicies:trust.trustedSourcePolicies,trustedEvidence:trust.trustedEvidence});
   if(receipt.status!=='accepted-receipt')return result('hold',{receipt});
   const receiptSha256=digest(Buffer.from(JSON.stringify(receipt)));
   phase='transport';
   if(flags.stageObjects&&!phaseJournal)phaseJournal=await createPrivatePhaseJournal(journal?.root,journal?.inventory);
   const inertJournal={read:async()=>{throw Error('journal_disabled');},cas:async()=>{throw Error('journal_disabled');}};
   const transport=createCloudNewsroomV2CandidateTransport({tools:gitTools,readArtifact,journal:phaseJournal??inertJournal,clock,allowMutations:flags.stageObjects,allowRefUpdate:flags.updateSourceRef});
   const transportInput={runId,receipt,baseline:trust.baseline};
   let transported=await transport.advance(transportInput);
   if(!['candidate-verified-awaiting-admission','candidate-source-verified'].includes(transported.status))return result(transported.status,{receipt,transport:transported});
   phase='admission';
   if(typeof observer!=='function')return result('hold',{reason:'independent_git_object_observer_required',transport:transported});
   if(prepareCandidateObservation!==undefined){
    if(typeof prepareCandidateObservation!=='function')throw Error('explicit_materialization_callback_required');
    const prepared=await prepareCandidateObservation({candidateCommit:transported.candidateCommit,candidateTreeGitSha:transported.candidateTree,priorCommit:trust.baseline.commitSha,repository:S.repository,branch:S.branch});
    if(!observeCandidate){if(typeof prepared?.repoRoot!=='string')throw Error('materialized_repo_root_required');observationRoot=prepared.repoRoot;}
   }
   const o=clone(await observer({candidateCommit:transported.candidateCommit,candidateTreeGitSha:transported.candidateTree,priorCommit:trust.baseline.commitSha}));
   if(o.candidateCommit!==transported.candidateCommit||o.candidateTreeGitSha!==transported.candidateTree||o.priorCommit!==trust.baseline.commitSha||trust.admissionTrust?.priorCommit!==o.priorCommit||o.currentRegistryText!==trust.baseline.registryText)throw Error('git_observation_identity_mismatch');
   const evaluatorInput={now:await clock(),candidateCommit:o.candidateCommit,candidateParents:o.candidateParents,candidateTree:o.candidateTree,candidateRegistryText:o.candidateRegistryText,receipt};
   const evaluatorTrust={...trust.admissionTrust,priorTree:o.priorTree,currentRegistryText:o.currentRegistryText,trustedSourcePolicies:trust.trustedSourcePolicies,trustedEvidence:trust.trustedEvidence};
   const evaluation=evaluateCloudNewsroomV2DataAdmission(evaluatorInput,evaluatorTrust);
   const admissionCapture={evaluatorInput,evaluatorTrust,evaluation};
   if(evaluation.status!=='eligible-for-preview-review')return result('hold',{admissionCapture});
   const request=normalizeCloudNewsroomV2CoordinatorRequest({receipt,evaluation,evaluatorInput,observed:{receipt,receiptSha256,reviewDigest:trust.reviewDigest,candidateCommit:o.candidateCommit,candidateTreeGitSha:o.candidateTreeGitSha,repository:S.repository,branch:S.branch,projectId:S.projectId},owner,runId});
   if(transported.status!=='candidate-source-verified'){
    if(!flags.updateSourceRef)return result('admitted-awaiting-source-ref-permission',{admissionCapture,request});
    phase='source-ref';transported=await transport.advance({...transportInput,admission:evaluation});
    // Even an apparently successful write is independently reconciled next turn.
    return result(transported.status,{transport:transported,admissionCapture,request});
   }
   if(!flags.createPreview)return result('admitted-awaiting-preview-permission',{admissionCapture,request});
   phase='coordinator';
   if(!coordinatorAdapters)throw Error('explicit_coordinator_adapters_required');
   const adapters={...coordinatorAdapters,clock,provider:{...coordinatorAdapters.provider,promote:async()=>{throw Error('runner_promotion_permanently_disabled');}}};
   // Never forward a caller approval. Existing coordinator owns durable uncertainty,
   // grant visibility, exact provider checks, QA and archive sequencing.
   const coordination=await createCloudNewsroomV2Coordinator(adapters).advance(request);
   return result(coordination.status,{coordination,admissionCapture,request});
  }catch{return result('hold',{reason:'runner_input_observation_or_io_failure_no_automatic_retry'});}
 };
 // A trusted saved admissionCapture/request is required. Never use a fresh bundle
 // to infer which uncertain effect happened. This path reads only and does not
 // complete durable phases, renew leases, archive, retry creation or claim QA.
 const reconcile=async({runId,owner}={})=>{
  const finish=(status,extra={})=>({status,phase:'read-only-reconciliation',...extra,effects:[],promotionAuthorized:false,producerInvoked:false,freshnessClaim:false});
  try{
   const t=clone(await loadTrust({runId})),saved=t.reconciliation;
   if(!saved||saved.request?.runId!==runId||saved.request?.owner!==owner)throw Error('saved_identity_required');
   const {request:r,admissionCapture:c}=saved,receipt=c?.evaluatorInput?.receipt;
   const normalized=normalizeCloudNewsroomV2CoordinatorRequest({receipt,evaluation:c?.evaluation,evaluatorInput:c?.evaluatorInput,observed:{receipt,receiptSha256:digest(Buffer.from(JSON.stringify(receipt))),reviewDigest:t.reviewDigest,candidateCommit:r.candidateCommit,candidateTreeGitSha:r.candidateTreeGitSha,repository:S.repository,branch:S.branch,projectId:S.projectId},owner,runId});
   if(JSON.stringify(normalized)!==JSON.stringify(r)||t.baseline.commitSha!==c.evaluation.proposal.priorCommit||typeof observer!=='function')throw Error('saved_binding_mismatch');
   const now=Date.parse(await clock());if(!Number.isFinite(now))throw Error('clock_required');
   const o=await observer({candidateCommit:r.candidateCommit,candidateTreeGitSha:r.candidateTreeGitSha,priorCommit:t.baseline.commitSha});
   if(o.candidateCommit!==r.candidateCommit||o.candidateTreeGitSha!==r.candidateTreeGitSha||JSON.stringify(o.candidateTree)!==JSON.stringify(c.evaluatorInput.candidateTree)||o.candidateRegistryText!==c.evaluatorInput.candidateRegistryText)throw Error('candidate_observation_changed');
   const raw=await gitTools.githubFetch({url:`https://api.github.com/repos/${S.repository}/git/ref/heads/${S.branch}`});
   const ref=fetchedRef(raw);
   if(ref?.ref!==`refs/heads/${S.branch}`||ref.object?.type!=='commit'||![''+r.candidateCommit,t.baseline.commitSha].includes(ref.object.sha))throw Error('ref_drift_or_unknown');
   let preview=null;
   if(coordinatorAdapters?.state?.read){
    const state=(await coordinatorAdapters.state.read('cloud-newsroom-v2'))?.value;
    if(state?.schemaVersion!==1||state.generation!=='cloud-newsroom-v2'||state.repository!==S.repository||state.branch!==S.branch||state.projectId!==S.projectId)throw Error('state_identity_unknown');
    const run=state.run;
    if(run){
     for(const k of ['runId','owner','reviewedCodeCommit','repository','branch','projectId','editionDate','candidateCommit','candidateTreeGitSha','receiptSha256','reviewDigest','artifactSha256','pdfSha256'])if(run[k]!==r[k])throw Error('run_identity_changed');
     if(run.deploymentId){
      const d=await coordinatorAdapters.provider.getDeployment({deploymentId:run.deploymentId,projectId:S.projectId});
      if(d.id!==run.deploymentId||d.sourceCommit!==r.candidateCommit||d.projectId!==S.projectId||d.repository!==S.repository||d.target!=='preview')throw Error('deployment_identity_changed');
      preview={deploymentId:d.id,status:d.status,sourceCommit:d.sourceCommit};
     }else preview={status:'no_recorded_deployment_id_no_discovery_or_retry'};
    }
   }
   return finish('read-only-effect-observed',{sourceEvidenceStale:!(Date.parse(r.admission.expiresAt)>now),sourceRef:ref.object.sha===r.candidateCommit?'candidate-observed':'prior-observed-uncertain-effect-not-retried',preview,durableStateUpdated:false});
  }catch{return finish('hold',{reason:'trusted_saved_identity_or_readback_unavailable_no_retry'});}
 };
 const serialized=fn=>async input=>{
  if(busy)return {status:'hold',reason:'runner_call_in_progress',effects:[],promotionAuthorized:false};
  busy=true;try{return await fn(input);}finally{busy=false;}
 };
 return Object.freeze({advance:serialized(advance),reconcile:serialized(reconcile)});
}
