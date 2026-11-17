import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const instant=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,19)===v.slice(0,19)?Date.parse(v):NaN;
const held=reason=>({status:'held',reason,operational:false});
function sameState(a,b){
 const encode=(v,depth=0,budget={nodes:0,bytes:0})=>{if(++budget.nodes>300000||depth>12)throw Error('state comparison bound');if(v===null||typeof v==='boolean')return JSON.stringify(v);if(typeof v==='number'){if(!Number.isFinite(v))throw Error('invalid number');return JSON.stringify(v);}if(typeof v==='string'){budget.bytes+=Buffer.byteLength(v);if(v.length>16000||budget.bytes>16*1024*1024)throw Error('state byte bound');return JSON.stringify(v);}if(Array.isArray(v)){if(v.length>10000)throw Error('array bound');return '['+v.map(x=>encode(x,depth+1,budget)).join(',')+']';}if(v&&Object.getPrototypeOf(v)===Object.prototype){const keys=Object.keys(v).sort();if(keys.length>10000||keys.some(k=>k.length>500))throw Error('object bound');return '{'+keys.map(k=>JSON.stringify(k)+':'+encode(v[k],depth+1,budget)).join(',')+'}';}throw Error('JSON state required');};
 try{return encode(a)===encode(b);}catch{return false;}
}
function stateProblem(snapshot){
  if(snapshot?.schemaVersion!==1||snapshot?.generation!=='standalone-v1'||snapshot?.initialized!==true||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<1||!Number.isSafeInteger(snapshot.fence)||snapshot.fence<0||!snapshot.jobs||typeof snapshot.jobs!=='object'||Array.isArray(snapshot.jobs))return held('existing-authoritative-state-required');
  if(snapshot.revision>Number.MAX_SAFE_INTEGER-2||snapshot.fence>=Number.MAX_SAFE_INTEGER)return held('state-counter-exhausted');
  if(snapshot.lease!==undefined&&snapshot.lease!==null&&(!snapshot.lease||typeof snapshot.lease!=='object'||Array.isArray(snapshot.lease)||typeof snapshot.lease.owner!=='string'||!snapshot.lease.owner||snapshot.lease.owner.length>200||!Number.isSafeInteger(snapshot.lease.fence)||snapshot.lease.fence<1||snapshot.lease.fence!==snapshot.fence||Object.keys(snapshot.lease).sort().join('|')!=='expiresAt|fence|owner'||!Number.isFinite(instant(snapshot.lease.expiresAt))))return held('invalid-existing-lease');
  if(Object.keys(snapshot.jobs).length>10000)return held('state-job-bound');
  for(const [savedKey,saved] of Object.entries(snapshot.jobs)){
   if(!hash(savedKey)||!saved||typeof saved!=='object'||Array.isArray(saved)||!['intent','uncertain','acknowledged'].includes(saved.status)||!hash(saved.sourceSha256)||!hash(saved.artifactSha256)||!['prepare','stage','publish'].includes(saved.phase)||typeof saved.target!=='string'||!saved.target||saved.target.length>200||typeof saved.owner!=='string'||!saved.owner||saved.owner.length>200||!Number.isSafeInteger(saved.fence)||saved.fence<1||saved.fence>snapshot.fence||!Number.isFinite(instant(saved.createdAt))||typeof saved.approvalReference!=='string'||!saved.approvalReference||saved.approvalReference.length>500||!/^\d{4}-\d{2}-\d{2}$/.test(saved.editionDate??'')||!Number.isFinite(Date.parse(saved.editionDate))||new Date(saved.editionDate).toISOString().slice(0,10)!==saved.editionDate||savedKey!==sha(JSON.stringify([saved.editionDate,saved.target,saved.phase]))||saved.status==='acknowledged'&&(typeof saved.providerOperationId!=='string'||!saved.providerOperationId||saved.providerOperationId.length>500))return held('invalid-existing-job');
  }
  return null;
}
export const SOURCE_CAPS=Object.freeze({quote:7200,morpho:900,chain:1200,primary:86400});
/** Interfaces are independently authenticated deployment dependencies, not
 * implementations. No ambient credentials, network, state initialization or retry. */
export function createJobRunner({state,evidence,outbox,credentials,provider,clock}){
 return {async advance({config,job,approval,owner}={}){
  if(config?.effectsEnabled!==true||config?.deploymentEnabled!==true)return held('effects-disabled');
  if(!state?.read||!state?.cas||!evidence?.read||!outbox?.persist||!credentials?.checkReference||!provider?.execute||typeof clock!=='function')return held('required-adapter-missing');
  if(!job||!hash(job.artifactSha256)||!hash(job.sourceSha256)||!['prepare','stage','publish'].includes(job.phase)||typeof job.target!=='string'||!job.target||job.target.length>200||typeof owner!=='string'||!owner||owner.length>200||!/^\d{4}-\d{2}-\d{2}$/.test(job.editionDate??'')||!Number.isFinite(Date.parse(job.editionDate+'T00:00:00Z'))||new Date(job.editionDate).toISOString().slice(0,10)!==job.editionDate)return held('invalid-job');
  if(job.phase==='publish')return held('publication-QA-and-vendor-adapter-not-implemented');
  const now=instant(clock()),expires=instant(approval?.expiresAt);if(!Number.isFinite(now)||!Number.isFinite(expires)||expires<=now||instant(approval?.notBefore)>now||!Number.isFinite(instant(approval?.notBefore))||approval?.phase!==job.phase||approval?.target!==job.target||approval?.artifactSha256!==job.artifactSha256||approval?.sourceSha256!==job.sourceSha256||approval?.editionDate!==job.editionDate||typeof approval?.reference!=='string'||!approval.reference||approval.reference.length>500)return held('bound-approval-required');
  if(typeof config.credentialReference!=='string'||!config.credentialReference||!await credentials.checkReference({reference:config.credentialReference,target:job.target,phase:job.phase}))return held('credential-reference-unavailable');
  const key=sha(JSON.stringify([job.editionDate,job.target,job.phase]));let snapshot=await state.read();
  const problem=stateProblem(snapshot);if(problem)return problem;
  if(snapshot.emergencyStop!==false)return held('emergency-stop');const previous=snapshot.jobs[key];if(previous){if(['artifactSha256','sourceSha256','phase','target','editionDate'].some(field=>previous[field]!==job[field]))return held('same-edition-conflict');return {status:previous.status==='acknowledged'?'already-acknowledged':'reconciliation-required',key,operational:false};}
  if(snapshot.lease&&instant(snapshot.lease.expiresAt)>now)return held('lease-owned');
  // An expired lease does not establish safe takeover of uncertain work.
  if(Object.values(snapshot.jobs).some(j=>['intent','uncertain'].includes(j?.status)))return held('unresolved-effect-requires-reconciliation');
  const data=await evidence.read({sha256:job.sourceSha256});const cap=SOURCE_CAPS[data?.kind];if(!(data?.bytes instanceof Uint8Array)||data.bytes.length>4*1024*1024||!data.bytes.length||sha(data.bytes)!==job.sourceSha256||!cap||!Number.isSafeInteger(data.maxAgeSeconds)||data.maxAgeSeconds<1||data.maxAgeSeconds>cap)return held('verified-evidence-required');
  const retrieved=instant(data.retrievedAt),effective=instant(data.effectiveAt),policyDeadline=instant(data.expiresAt);const deadline=Math.min(retrieved+data.maxAgeSeconds*1000,effective+data.maxAgeSeconds*1000,policyDeadline,expires);if(!Number.isFinite(deadline)||effective>retrieved||retrieved>now||deadline<=now)return held('stale-or-invalid-evidence');
  const artifact=await evidence.read({sha256:job.artifactSha256});if(!(artifact?.bytes instanceof Uint8Array)||!artifact.bytes.length||artifact.bytes.length>32*1024*1024||sha(artifact.bytes)!==job.artifactSha256)return held('artifact-bytes-mismatch');
  const fence=snapshot.fence+1,lease={owner,fence,expiresAt:new Date(Math.min(deadline,now+120000)).toISOString()};const intent={status:'intent',artifactSha256:job.artifactSha256,sourceSha256:job.sourceSha256,phase:job.phase,target:job.target,editionDate:job.editionDate,owner,fence,approvalReference:approval.reference,createdAt:new Date(now).toISOString()};
  const next={...structuredClone(snapshot),revision:snapshot.revision+1,fence,lease,jobs:{...snapshot.jobs,[key]:intent}};
  if(!await state.cas({expectedRevision:snapshot.revision,next}))return held('state-conflict');
  // Durable outbox receipt must precede provider effects. Failure leaves intent for reconciliation.
  let receipt;try{receipt=await outbox.persist({key,fence,owner,intent});}catch{return {status:'reconciliation-required',key,reason:'outbox-outcome-unknown'};}
  if(receipt?.persisted!==true||receipt.key!==key||receipt.fence!==fence||receipt.intentSha256!==sha(JSON.stringify(intent)))return {status:'reconciliation-required',key,reason:'outbox-readback-required'};
  const live=await state.read(),at=instant(clock());if(stateProblem(live)||!sameState(live,next)||live?.revision!==next.revision||live?.emergencyStop!==false||live?.lease?.owner!==owner||live.lease.fence!==fence||live.jobs?.[key]?.status!=='intent'||!Number.isFinite(at)||at>=deadline||at>=instant(live.lease.expiresAt))return held('live-fence-stop-or-expiry');
  let result;try{result=await provider.execute({key,owner,fence,phase:job.phase,target:job.target,artifactSha256:job.artifactSha256,credentialReference:config.credentialReference});}catch{const uncertain={...live,revision:live.revision+1,jobs:{...live.jobs,[key]:{...intent,status:'uncertain'}}};await state.cas({expectedRevision:live.revision,next:uncertain}).catch(()=>false);return {status:'reconciliation-required',key,reason:'provider-outcome-unknown'};}
  if(result?.key!==key||result?.artifactSha256!==job.artifactSha256||typeof result?.providerOperationId!=='string'||!result.providerOperationId)return {status:'reconciliation-required',key,reason:'unbound-provider-acknowledgment'};
  const done={...live,revision:live.revision+1,lease:null,jobs:{...live.jobs,[key]:{...intent,status:'acknowledged',providerOperationId:result.providerOperationId}}};if(!await state.cas({expectedRevision:live.revision,next:done}))return {status:'reconciliation-required',key,reason:'acknowledgment-save-conflict'};
  return {status:'provider-acknowledged-not-publicly-verified',key,publicationVerified:false};
 }};
}
