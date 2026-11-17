/** Dormant one-shot promotion composed with actual independent read-only QA. */
import {createHash} from 'node:crypto';
import {createReleaseQa} from '../release-qa.mjs';
import {createFirestorePromotionQaJournal} from '../firestore-promotion-qa-journal.mjs';
import {createQaProofArchive} from '../qa-proof-archive.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
function canonical(v){let n=0;function walk(x,d=0){if(++n>3000||d>12)throw Error('bounded_identity');if(x===null||typeof x==='boolean'||Number.isSafeInteger(x))return x;if(typeof x==='string'&&x.length<=3000)return x;if(Array.isArray(x)&&x.length<=100)return x.map(z=>walk(z,d+1));if(x&&Object.getPrototypeOf(x)===Object.prototype)return Object.fromEntries(Object.keys(x).sort().map(k=>[k,walk(x[k],d+1)]));throw Error('invalid_identity');}return JSON.stringify(walk(v));}
const instant=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s?Date.parse(s):NaN;
const hold=reason=>({status:'held',reason,publicationVerified:false});
export function createVercelPromotion({plan:given,vercel,read,journal,loadApproval,clock,networkEnabled=false,promotionEnabled=false,archiveConfig=null,timeoutMs=30000}={}){
 const plan=structuredClone(given);canonical(plan);
 if(typeof networkEnabled!=='boolean'||typeof promotionEnabled!=='boolean'||[journal?.read,journal?.cas,loadApproval,clock].some(x=>typeof x!=='function')||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('independent_promotion_boundary_required');
 const qa=()=>createReleaseQa({plan,vercel,read,clock,networkEnabled,timeoutMs:Math.min(10000,timeoutMs)});qa();
 const identity=Object.freeze({projectId:plan.projectId,teamId:plan.teamId,repository:'Satnam-Satoshi/Satoshi-Langar',branch:plan.branch,candidateDeploymentId:plan.deploymentId,sourceCommit:plan.sourceCommit,manifestSha256:digest(canonical(plan.artifacts)),planSha256:digest(canonical(plan)),expectedBaselineDeploymentId:plan.expectedBaselineDeploymentId,domains:[...plan.domains]});
 const key=digest(canonical(identity));let busy=false,latched=false;
 if(archiveConfig!==null)for(const v of [archiveConfig,archiveConfig.store,archiveConfig.drive])if(!v||Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).length!==Object.keys(v).length||Object.values(Object.getOwnPropertyDescriptors(v)).some(p=>p.get||p.set||!p.enumerable))throw Error('plain_archive_boundary_required');
 const archiveBoundary=archiveConfig===null?null:{store:{...archiveConfig.store,claim:structuredClone(archiveConfig.store.claim)},drive:{...archiveConfig.drive}};
 async function run(readOnly){
  if(!networkEnabled||!readOnly&&!promotionEnabled)return hold('promotion_disabled');if(!readOnly&&!archiveBoundary)return hold('concrete_qa_archive_required');if(busy||latched&&!readOnly)return hold('busy_or_uncertain_instance');busy=true;const controller=new AbortController();let timer,attempted=false;
  const active=()=>{if(controller.signal.aborted)throw Error('expired');};
  try{return await Promise.race([(async()=>{
   let state=await journal.read({key});active();const exact=(o,ks)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===[...ks].sort().join('|');
   function valid(s){if(!exact(s,['version','record']))return false;if(s.record===null)return s.version===0;const r=s.record;return exact(r,['key','identity','phase','approvalReference','previewQaSha256'])&&((s.version===1&&r.phase==='attempting')||(s.version===2&&r.phase==='acknowledged'))&&r.key===key&&canonical(r.identity)===canonical(identity)&&typeof r.approvalReference==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(r.approvalReference)&&/^[a-f0-9]{64}$/.test(r.previewQaSha256??'');}
   if(!valid(state))return hold('authoritative_promotion_journal_required');
   async function save(record){active();const next={version:state.version+1,record};const ack=await journal.cas({key,expectedVersion:state.version,next});active();if(ack?.applied!==true)throw Error('cas_uncertain');const observed=await journal.read({key});active();if(!valid(observed)||canonical(observed)!==canonical(next))throw Error('journal_readback');state=observed;}
   function stageIdentity(stage,finalPreviewProofSha256=null){return {promotionKey:key,attemptingRecordSha256:digest(canonical({...state.record,phase:'attempting'})),stage,planSha256:identity.planSha256,sourceCommit:identity.sourceCommit,manifestSha256:identity.manifestSha256,candidateDeploymentId:identity.candidateDeploymentId,projectId:identity.projectId,teamId:identity.teamId,domains:identity.domains,expectedBaselineDeploymentId:identity.expectedBaselineDeploymentId,finalPreviewProofSha256};}
   function stageJournal(stage,finalHash=null){if(!archiveBoundary)throw Error('archive_boundary');return createFirestorePromotionQaJournal({...archiveBoundary.store,identity:stageIdentity(stage,finalHash),clock,mutationEnabled:!readOnly});}
   async function archiveProof(stage,proof,finalHash=null){
    const store=stageJournal(stage,finalHash);let frozen=await store.read();active();
    if(!frozen){if(readOnly||!proof)return null;if(!await store.freeze(canonical(proof)))throw Error('qa_freeze_conflict');active();frozen=await store.read();active();}
    const retained=JSON.parse(frozen.proofJson);if(stage==='final-preview'&&proof&&canonical(proof)!==frozen.proofJson)throw Error('final_qa_changed');
    const helper=createQaProofArchive({store:archiveBoundary.store,drive:archiveBoundary.drive,binding:{phase:retained.phase,projectId:identity.projectId,sourceCommit:identity.sourceCommit,candidateDeploymentId:identity.candidateDeploymentId,planSha256:identity.planSha256,manifestSha256:identity.manifestSha256},proofJson:frozen.proofJson,clock,networkEnabled:true,mutationsEnabled:!readOnly});
    const archived=readOnly||frozen.version===2?await helper.readback():await helper.advance();active();if(archived.status!=='qa-proof-archived'||archived.receipt.sha256!==digest(frozen.proofJson)||archived.receipt.bytes!==Buffer.byteLength(frozen.proofJson)||frozen.receipt&&canonical(frozen.receipt)!==canonical(archived.receipt))return null;
    if(frozen.version===1&&!readOnly){if(!await store.archive(frozen.proofJson,archived.receipt))throw Error('qa_archive_phase_conflict');active();frozen=await store.read();active();}
    const at=instant(clock());if(!Number.isFinite(at)||at<instant(archived.checkedAt)||at<instant(retained.checkedAt)||typeof archived.fresh!=='boolean')throw Error('qa_archive_clock');
    return {proof:retained,sha256:digest(frozen.proofJson),bytes:Buffer.byteLength(frozen.proofJson),durableComplete:frozen.version===2,fresh:archived.fresh&&at<instant(retained.expiresAt),checkedAt:archived.checkedAt};
   }
   async function reconcile(){
    const observed=await qa().reconcileProduction();active();if(observed.status!=='production-readback-observed')return {...hold('promotion_pending_or_unverified_no_retry'),providerRequestAttempted:attempted};
    const pending=()=>({status:'both-domain-readback-observed-archive-pending',proof:observed,providerRequestAttempted:attempted,publicationVerified:false,reconciliationOnly:true,completionRecorded:false});
    if(!archiveBoundary)return pending();
    try{const final=await archiveProof('final-preview',null);if(!final?.durableComplete)return pending();const archived=await archiveProof('public-readback',observed,final.sha256);if(!archived?.durableComplete)return pending();const at=instant(clock());if(!Number.isFinite(at)||at<instant(archived.checkedAt)||at<instant(observed.checkedAt))throw Error('public_clock');return {status:observed.fresh&&archived.fresh&&at<instant(archived.proof.expiresAt)?'both-domain-readback-archived':'both-domain-readback-archived-stale-evidence',proof:archived.proof,publicQaSha256:archived.sha256,finalPreviewQaSha256:final.sha256,providerRequestAttempted:attempted,publicationVerified:false,reconciliationOnly:true,completionRecorded:true};}catch(e){if(['public_clock','qa_archive_clock'].includes(e?.message))return hold('public_archive_clock_invalid_or_backward');return pending();}
   }
   // Identity persists through expiry; no new provider writes on either resumed phase.
   if(state.record!==null)return await reconcile();if(readOnly)return hold('no_promotion_intent');
   const approval=await loadApproval({action:'promote-exact-deployment',identity,key});active();
   const approved=(t=instant(clock()))=>{return Number.isFinite(t)&&approval?.action==='promote-exact-deployment'&&typeof approval.reference==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(approval.reference)&&canonical(approval.identity)===canonical(identity)&&instant(approval.notBefore)<=t&&instant(approval.expiresAt)>t;};
   if(!approved())return hold('exact_promotion_approval_required');
   const verification=qa();let proof=await verification.verifyPreview();active();
   function freshProof(t=instant(clock())){return Number.isFinite(t)&&proof?.status==='preview-qa-verified'&&proof.fresh===true&&proof.reconciliationOnly===false&&proof.candidateDeploymentId===identity.candidateDeploymentId&&proof.sourceCommit===identity.sourceCommit&&proof.projectId===identity.projectId&&proof.manifestSha256===identity.manifestSha256&&proof.planSha256===identity.planSha256&&proof.expectedBaselineDeploymentId===identity.expectedBaselineDeploymentId&&instant(proof.checkedAt)<=t&&instant(proof.expiresAt)>t&&proof.baselineObservation?.deploymentId===identity.expectedBaselineDeploymentId&&canonical(proof.baselineObservation.domains)===canonical(identity.domains)&&instant(proof.baselineObservation.expiresAt)>t;}
   if(!approved()||!freshProof())return hold('fresh_actual_preview_qa_and_baseline_required');
   const secret=await vercel.resolveSecret({reference:vercel.secretReference,purpose:'vercel-approved-exact-promotion'});active();if(typeof secret!=='string'||secret.length<8||secret.length>4096||/\s/.test(secret))return hold('credential_unavailable');
   if(!approved()||!freshProof())return hold('approval_or_qa_expired');await save({key,identity,phase:'attempting',approvalReference:approval.reference,previewQaSha256:digest(canonical(proof))});
   // Recompute actual provider/bytes/baseline reads after durable intent, before POST.
   proof=await verification.verifyPreview();active();if(!approved()||!freshProof())return hold('preaction_qa_or_approval_changed_no_retry');
   const finalArchive=await archiveProof('final-preview',proof);active();const control=await stageJournal('final-preview').observeControl();active();const finalAt=instant(clock());if(!control||control.owner!==archiveBoundary.store.claim.owner||control.fence!==archiveBoundary.store.claim.fence||!Number.isFinite(instant(control.checkedAt))||instant(control.checkedAt)>finalAt||!(instant(control.expiresAt)>finalAt)||!finalArchive?.durableComplete||!finalArchive.fresh||!Number.isFinite(finalAt)||finalAt<instant(finalArchive.checkedAt)||finalAt<instant(proof.checkedAt)||!approved(finalAt)||!freshProof(finalAt))return hold('final_qa_archive_or_approval_expired_no_retry');
   const url=`https://api.vercel.com/v10/projects/${plan.projectId}/promote/${plan.deploymentId}?teamId=${plan.teamId}`;attempted=true;const r=await vercel.fetch(url,{method:'POST',redirect:'manual',signal:controller.signal,headers:{Authorization:`Bearer ${secret}`}});active();
   if(r.url!==url||r.redirected||![201,202].includes(r.status))throw Error('unknown_promotion');
   // Acknowledgment body is irrelevant; do not expose provider data or claim publication.
   await r.body?.cancel?.().catch(()=>{});await save({...state.record,phase:'acknowledged'});return await reconcile();
  })(),new Promise((_,no)=>{timer=setTimeout(()=>{controller.abort();no(Error('expired'));},timeoutMs);})]);
  }catch{latched=true;controller.abort();return {...hold('uncertain_promotion_no_retry'),providerRequestAttempted:attempted};}finally{clearTimeout(timer);busy=false;}
 }
 return Object.freeze({advance:()=>run(false),reconcile:()=>run(true)});
}
