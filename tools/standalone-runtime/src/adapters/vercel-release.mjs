/** One-shot direct preview creation. Promotion intentionally has no HTTP path yet. */
import {createHash} from 'node:crypto';
import {createVercelReadOnly} from './vercel-readonly.mjs';
const REPO='Satnam-Satoshi/Satoshi-Langar',REPO_ID=1181242402;
const hex=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x),sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x),dpl=x=>typeof x==='string'&&/^dpl_[A-Za-z0-9]{1,100}$/.test(x);
function canon(x){let count=0;function walk(v,depth=0){if(++count>100||depth>8)throw Error('state_bounds');if(v===null||typeof v==='boolean'||Number.isSafeInteger(v))return v;if(typeof v==='string'&&v.length<=2000)return v;if(v&&Object.getPrototypeOf(v)===Object.prototype)return Object.fromEntries(Object.keys(v).sort().map(k=>[k,walk(v[k],depth+1)]));throw Error('state_shape');}return JSON.stringify(walk(x));}
const clockTime=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s?Date.parse(s):NaN;
const hold=reason=>({status:'held',reason,publicationVerified:false});
export function createVercelRelease({fetch:transport,resolveSecret,secretReference,projectId,projectName,teamId,branch,sourceCommit,manifestSha256,journal,loadApproval,loadSourceAdmission,clock=()=>new Date().toISOString(),networkEnabled=false,previewEnabled=false,timeoutMs=30000}={}){
 if(!hex(sourceCommit)||!sha(manifestSha256)||typeof projectName!=='string'||!/^[a-z0-9][a-z0-9-]{0,99}$/.test(projectName)||typeof networkEnabled!=='boolean'||typeof previewEnabled!=='boolean'||[journal?.read,journal?.cas,loadApproval,loadSourceAdmission,clock].some(x=>typeof x!=='function')||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('independent_release_boundary_required');
 const readOptions={fetch:transport,resolveSecret,secretReference,projectId,teamId,expectedBranch:branch,readEnabled:networkEnabled,timeoutMs:Math.min(timeoutMs,10000)};createVercelReadOnly(readOptions);
 const identity=Object.freeze({repository:REPO,repositoryId:REPO_ID,projectId,projectName,teamId,branch,sourceCommit,manifestSha256});const key=createHash('sha256').update(canon(identity)).digest('hex');let busy=false,latched=false;
 async function advancePreview(){
  if(!networkEnabled||!previewEnabled)return hold('preview_disabled');if(busy||latched)return hold('busy_or_uncertain_instance');busy=true;let timer,attempted=false;const controller=new AbortController(),active=()=>{if(controller.signal.aborted)throw Error('expired');};
  try{return await Promise.race([(async()=>{
   let s=await journal.read({key});active();const exact=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
   function validState(v){
    if(!exact(v,['version','record']))return false;
    if(v.record===null)return v.version===0;
    const r=v.record,created=r?.phase==='created';
    if(!exact(r,created?['key','identity','phase','approvalReference','reviewDigest','deploymentId']:['key','identity','phase','approvalReference','reviewDigest']))return false;
    return v.version===(created?2:1)&&(created||r.phase==='attempting')&&r.key===key&&canon(r.identity)===canon(identity)&&typeof r.approvalReference==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(r.approvalReference)&&sha(r.reviewDigest)&&(!created||dpl(r.deploymentId));
   }
   if(!validState(s))return hold('authoritative_journal_required');
   async function save(record){active();const next={version:s.version+1,record};const ack=await journal.cas({key,expectedVersion:s.version,next});active();if(ack?.applied!==true)throw Error('cas_uncertain');const seen=await journal.read({key});active();if(!validState(seen)||canon(seen)!==canon(next))throw Error('journal_readback');s=seen;}
   async function reconcile(){if(!dpl(s.record.deploymentId))return hold('durable_deployment_identity_required');const observed=await createVercelReadOnly(readOptions).getDeployment({deploymentId:s.record.deploymentId,expectedCommit:sourceCommit});active();if(observed.status!=='deployment-observed'||observed.target!==null)return hold('preview_source_or_target_mismatch');return {status:'preview-deployment-observed',deploymentId:observed.deploymentId,sourceCommit,manifestSha256,readyState:observed.readyState,providerRequestAttempted:attempted,publicationVerified:false,qaVerified:false};}
   if(s.record?.phase==='attempting')return hold('unknown_create_manual_reconciliation_required');if(s.record?.phase==='created')return await reconcile();
   const approval=await loadApproval({action:'create-preview',identity,key});active();const admission=await loadSourceAdmission({identity});active();
   function fresh(){const now=clockTime(clock());return Number.isFinite(now)&&approval?.action==='create-preview'&&typeof approval.reference==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(approval.reference)&&canon(approval.identity)===canon(identity)&&clockTime(approval.notBefore)<=now&&clockTime(approval.expiresAt)>now&&admission?.status==='eligible-for-preview-review'&&canon(admission.identity)===canon(identity)&&clockTime(admission.checkedAt)<=now&&clockTime(admission.expiresAt)>now&&sha(admission.reviewDigest);}
   if(!fresh())return hold('independent_approval_and_admission_required');const token=await resolveSecret({reference:secretReference,purpose:'vercel-approved-preview-create'});active();if(typeof token!=='string'||token.length<8||token.length>4096||/\s/.test(token))return hold('credential_unavailable');
   if(!fresh())return hold('approval_or_admission_expired');await save({key,identity,phase:'attempting',approvalReference:approval.reference,reviewDigest:admission.reviewDigest});active();if(!fresh())return hold('approval_or_admission_expired_after_intent');
   const url=`https://api.vercel.com/v13/deployments?teamId=${teamId}`;attempted=true;const r=await transport(url,{method:'POST',redirect:'manual',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({name:projectName,project:projectId,gitSource:{type:'github',ref:branch,repoId:REPO_ID,sha:sourceCommit}})});active();
   if(r.url!==url||r.redirected||r.status!==200||!/^application\/json(?:;|$)/i.test(r.headers.get('content-type')??''))throw Error('unknown_create');const reader=r.body?.getReader();if(!reader)throw Error('unknown_create');let size=0;const chunks=[];try{for(;;){const v=await reader.read();active();if(v.done)break;if(!(v.value instanceof Uint8Array)||(size+=v.value.length)>2_000_000)throw Error('unknown_create');chunks.push(v.value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
   const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));if(!dpl(data.id))throw Error('unknown_create');await save({...s.record,phase:'created',deploymentId:data.id});return await reconcile();
  })(),new Promise((_,no)=>{timer=setTimeout(()=>{controller.abort();no(Error('expired'));},timeoutMs);})]);
  }catch{latched=true;controller.abort();return {...hold('uncertain_operation_no_retry'),providerRequestAttempted:attempted};}finally{clearTimeout(timer);busy=false;}
 }
 return Object.freeze({advancePreview,promote:async()=>({...hold('production_gate_not_composed'),providerRequestAttempted:false}),promotionPlan:()=>({status:'nonexecuting-promotion-contract',projectId,teamId,sourceCommit,manifestSha256,repository:REPO,domains:['ltcmagazine.org','satnamsatoshi.com'],requires:['durable-promotion-intent','independent-bound-preview-qa','fresh-source-policy','exact-owner-approval','expected-live-domain-comparison','post-promotion-public-byte-qa'],writeAuthorized:false,publicationVerified:false})});
}
