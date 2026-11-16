/** Pure coordinator policy check. Maps MUST be authenticated external observations,
 * not fields copied from the producer manifest. Does not fetch/parse source files. */
export const SOURCE_AGE_CEILINGS=Object.freeze({'venue-quote':7200,morpho:900,chain:1200,'primary-current':86400});
export const sourcePolicyKey=s=>JSON.stringify([s.id,s.url,s.metricKind]);
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const token=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
const clock=v=>{if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v))return NaN;const t=Date.parse(v);return Number.isFinite(t)&&new Date(t).toISOString().slice(0,19)===v.slice(0,19)?t:NaN;};
const path=v=>typeof v==='string'&&/^evidence\/[A-Za-z0-9_./-]+$/.test(v)&&v.split('/').every(x=>x&&x!=='.'&&x!=='..');
export function checkTrustedSourcePolicies({sources,now,trustedSourcePolicies,trustedEvidence}={}){
 const errors=[],fail=x=>{if(!errors.includes(x))errors.push(x);};
 let at;try{at=clock(now);}catch{at=NaN;}
 if(!Number.isFinite(at)||!Array.isArray(sources)||!sources.length||!object(trustedSourcePolicies)||!object(trustedEvidence))return {status:'hold',errors:['external_source_policy_and_evidence_required']};
 for(const s of sources){try{
  if(!object(s)){fail('invalid_source');continue;}
  const key=sourcePolicyKey(s),p=Object.hasOwn(trustedSourcePolicies,key)?trustedSourcePolicies[key]:null,e=Object.hasOwn(trustedEvidence,key)?trustedEvidence[key]:null,ceiling=SOURCE_AGE_CEILINGS[s.metricKind];
  if(!object(p)||!ceiling||!['current','historical'].includes(p.classification)||p.classification!==s.classification){fail('unknown_or_mismatched_source_policy');continue;}
  try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||u.href!==s.url)throw Error();}catch{fail('invalid_policy_source_url');}
  if(!token(p.publisherId)||!token(p.parserId)||!token(p.parserVersion)||p.publisherId!==s.publisherId||p.parserId!==s.parserId||p.parserVersion!==s.parserVersion)fail('source_parser_or_publisher_policy_mismatch');
  const cap=p.maxRetrievalAgeSeconds,declared=s.maxRetrievalAgeSeconds;
  if(!Number.isSafeInteger(cap)||cap<1||cap>ceiling||!Number.isSafeInteger(declared)||declared<1||declared>cap)fail('source_age_cap_exceeded');
  if(p.classification==='historical'){
   if(p.maxEffectiveAgeSeconds!==null||s.maxEffectiveAgeSeconds!==null||s.label!=='Dated historical observation; not current'||s.effectiveAt===null||s.status!=='verified')fail('explicit_historical_policy_required');
  }else{
   const effectiveCap=p.maxEffectiveAgeSeconds;
   if(!Number.isSafeInteger(effectiveCap)||effectiveCap<1||effectiveCap>ceiling)fail('source_age_cap_exceeded');
   if(s.status==='unavailable' ? s.maxEffectiveAgeSeconds!==null : !Number.isSafeInteger(s.maxEffectiveAgeSeconds)||s.maxEffectiveAgeSeconds<1||s.maxEffectiveAgeSeconds>effectiveCap)fail('source_age_cap_exceeded');
  }
  const retrieved=clock(s.retrievedAt),effective=typeof s.effectiveAt==='string'&&/^\d{4}-\d\d-\d\d$/.test(s.effectiveAt)?Date.parse(s.effectiveAt+'T00:00:00Z'):clock(s.effectiveAt);
  if(!Number.isFinite(retrieved)||retrieved>at||at-retrieved>p.maxRetrievalAgeSeconds*1000)fail('source_retrieval_stale');
  if(s.status==='verified'&&p.classification==='current'&&(!Number.isFinite(effective)||effective>at||at-effective>p.maxEffectiveAgeSeconds*1000))fail('source_effective_value_stale');
  if(!object(e)||!object(s.evidence)||s.evidence.retrievedAt!==s.retrievedAt||e.retrievedAt!==s.retrievedAt||e.publisherId!==p.publisherId||e.parserId!==p.parserId||e.parserVersion!==p.parserVersion||e.url!==s.url||e.sourceId!==s.id){fail('external_source_evidence_mismatch');continue;}
  if(s.status==='unavailable'){
   if(s.classification!=='current'||s.value!==null||s.claimVerified!==false||s.effectiveAt!==null||s.snapshotSha256!==null||s.evidence.kind!=='fetch-attempt'||e.kind!=='fetch-attempt'||e.attempted!==true||!token(s.evidence.attemptId)||s.evidence.attemptId!==e.attemptId||!['network-error','http-error','timeout'].includes(s.evidence.outcome)||s.evidence.outcome!==e.outcome||['sha256','path'].some(k=>Object.hasOwn(s.evidence,k))||['snapshotSha256','bytesObserved','path'].some(k=>Object.hasOwn(e,k)))fail('unavailable_fetch_attempt_evidence_required');
  }else if(s.status!=='verified'||s.claimVerified!==true||s.evidence.kind!=='snapshot'||e.kind!=='snapshot'||e.bytesObserved!==true||!hash(s.snapshotSha256)||!path(s.evidence.path)||s.evidence.sha256!==s.snapshotSha256||e.snapshotSha256!==s.snapshotSha256||e.path!==s.evidence.path)fail('external_source_evidence_mismatch');

 }catch{fail('malformed_source_policy_evidence');}}
 return {status:errors.length?'hold':'trusted-source-evidence-matched',errors};
}
