/** Dormant one-shot promotion composed with actual independent read-only QA. */
import {createHash} from 'node:crypto';
import {createReleaseQa} from '../release-qa.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
function canonical(v){let n=0;function walk(x,d=0){if(++n>3000||d>12)throw Error('bounded_identity');if(x===null||typeof x==='boolean'||Number.isSafeInteger(x))return x;if(typeof x==='string'&&x.length<=3000)return x;if(Array.isArray(x)&&x.length<=100)return x.map(z=>walk(z,d+1));if(x&&Object.getPrototypeOf(x)===Object.prototype)return Object.fromEntries(Object.keys(x).sort().map(k=>[k,walk(x[k],d+1)]));throw Error('invalid_identity');}return JSON.stringify(walk(v));}
const instant=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s?Date.parse(s):NaN;
const hold=reason=>({status:'held',reason,publicationVerified:false});
export function createVercelPromotion({plan:given,vercel,read,journal,loadApproval,clock,networkEnabled=false,promotionEnabled=false,timeoutMs=30000}={}){
 const plan=structuredClone(given);canonical(plan);
 if(typeof networkEnabled!=='boolean'||typeof promotionEnabled!=='boolean'||[journal?.read,journal?.cas,loadApproval,clock].some(x=>typeof x!=='function')||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('independent_promotion_boundary_required');
 const qa=()=>createReleaseQa({plan,vercel,read,clock,networkEnabled,timeoutMs:Math.min(10000,timeoutMs)});qa();
 const identity=Object.freeze({projectId:plan.projectId,teamId:plan.teamId,repository:'Satnam-Satoshi/Satoshi-Langar',branch:plan.branch,candidateDeploymentId:plan.deploymentId,sourceCommit:plan.sourceCommit,manifestSha256:digest(canonical(plan.artifacts)),planSha256:digest(canonical(plan)),expectedBaselineDeploymentId:plan.expectedBaselineDeploymentId,domains:[...plan.domains]});
 const key=digest(canonical(identity));let busy=false,latched=false;
 return Object.freeze({async advance(){
  if(!networkEnabled||!promotionEnabled)return hold('promotion_disabled');if(busy||latched)return hold('busy_or_uncertain_instance');busy=true;const controller=new AbortController();let timer,attempted=false;
  const active=()=>{if(controller.signal.aborted)throw Error('expired');};
  try{return await Promise.race([(async()=>{
   let state=await journal.read({key});active();const exact=(o,ks)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===[...ks].sort().join('|');
   function valid(s){if(!exact(s,['version','record']))return false;if(s.record===null)return s.version===0;const r=s.record;return exact(r,['key','identity','phase','approvalReference','previewQaSha256'])&&((s.version===1&&r.phase==='attempting')||(s.version===2&&r.phase==='acknowledged'))&&r.key===key&&canonical(r.identity)===canonical(identity)&&typeof r.approvalReference==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(r.approvalReference)&&/^[a-f0-9]{64}$/.test(r.previewQaSha256??'');}
   if(!valid(state))return hold('authoritative_promotion_journal_required');
   async function save(record){active();const next={version:state.version+1,record};const ack=await journal.cas({key,expectedVersion:state.version,next});active();if(ack?.applied!==true)throw Error('cas_uncertain');const observed=await journal.read({key});active();if(!valid(observed)||canonical(observed)!==canonical(next))throw Error('journal_readback');state=observed;}
   async function reconcile(){const proof=await qa().reconcileProduction();active();if(proof.status!=='production-readback-observed')return {...hold('promotion_pending_or_unverified_no_retry'),providerRequestAttempted:attempted};return {status:proof.fresh?'both-domain-readback-observed':'both-domain-readback-observed-stale-evidence',proof,providerRequestAttempted:attempted,publicationVerified:false,reconciliationOnly:true};}
   // Identity persists through expiry; no new provider writes on either resumed phase.
   if(state.record!==null)return await reconcile();
   const approval=await loadApproval({action:'promote-exact-deployment',identity,key});active();
   const approved=()=>{const t=instant(clock());return Number.isFinite(t)&&approval?.action==='promote-exact-deployment'&&typeof approval.reference==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(approval.reference)&&canonical(approval.identity)===canonical(identity)&&instant(approval.notBefore)<=t&&instant(approval.expiresAt)>t;};
   if(!approved())return hold('exact_promotion_approval_required');
   const verification=qa();let proof=await verification.verifyPreview();active();
   function freshProof(){const t=instant(clock());return Number.isFinite(t)&&proof?.status==='preview-qa-verified'&&proof.fresh===true&&proof.reconciliationOnly===false&&proof.candidateDeploymentId===identity.candidateDeploymentId&&proof.sourceCommit===identity.sourceCommit&&proof.projectId===identity.projectId&&proof.manifestSha256===identity.manifestSha256&&proof.planSha256===identity.planSha256&&proof.expectedBaselineDeploymentId===identity.expectedBaselineDeploymentId&&instant(proof.checkedAt)<=t&&instant(proof.expiresAt)>t&&proof.baselineObservation?.deploymentId===identity.expectedBaselineDeploymentId&&canonical(proof.baselineObservation.domains)===canonical(identity.domains)&&instant(proof.baselineObservation.expiresAt)>t;}
   if(!approved()||!freshProof())return hold('fresh_actual_preview_qa_and_baseline_required');
   const secret=await vercel.resolveSecret({reference:vercel.secretReference,purpose:'vercel-approved-exact-promotion'});active();if(typeof secret!=='string'||secret.length<8||secret.length>4096||/\s/.test(secret))return hold('credential_unavailable');
   if(!approved()||!freshProof())return hold('approval_or_qa_expired');await save({key,identity,phase:'attempting',approvalReference:approval.reference,previewQaSha256:digest(canonical(proof))});
   // Recompute actual provider/bytes/baseline reads after durable intent, before POST.
   proof=await verification.verifyPreview();active();if(!approved()||!freshProof())return hold('preaction_qa_or_approval_changed_no_retry');
   const url=`https://api.vercel.com/v10/projects/${plan.projectId}/promote/${plan.deploymentId}?teamId=${plan.teamId}`;attempted=true;const r=await vercel.fetch(url,{method:'POST',redirect:'manual',signal:controller.signal,headers:{Authorization:`Bearer ${secret}`}});active();
   if(r.url!==url||r.redirected||![201,202].includes(r.status))throw Error('unknown_promotion');
   // Acknowledgment body is irrelevant; do not expose provider data or claim publication.
   await r.body?.cancel?.().catch(()=>{});await save({...state.record,phase:'acknowledged'});return await reconcile();
  })(),new Promise((_,no)=>{timer=setTimeout(()=>{controller.abort();no(Error('expired'));},timeoutMs);})]);
  }catch{latched=true;controller.abort();return {...hold('uncertain_promotion_no_retry'),providerRequestAttempted:attempted};}finally{clearTimeout(timer);busy=false;}
 }});
}
