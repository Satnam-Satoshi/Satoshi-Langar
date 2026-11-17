/** Pure nonpublishing adapter. Independent coordinator supplies raw verification inputs
 * and semantic-review inventory; source freshness is not event novelty or publication. */
import {SOURCE_AGE_CEILINGS} from '../../scripts/cloud-newsroom-v2-source-policy.mjs';
import {compileCoverage,bytesDigest} from '../../scripts/cloud-newsroom-v2-coverage.mjs';
import {planDeskRevisionAppend,deskDataSha256} from '../desk-status/desk-revisions.mjs';
const fail=m=>{throw new Error('Desk coverage: '+m);};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
// Strict UTC only. Compare instants without rewriting immutable original strings.
const utc=v=>{if(typeof v!=='string')return NaN;const m=/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,3}))?Z$/.exec(v);if(!m)return NaN;const canonical=m[1]+'.'+(m[2]??'').padEnd(3,'0')+'Z',n=Date.parse(canonical);return Number.isFinite(n)&&new Date(n).toISOString()===canonical?n:NaN;};
const time=(v,at,label)=>{const n=utc(v);if(!Number.isFinite(n)||n>at)fail(label);return n;};
const sameInstant=(a,b)=>Number.isFinite(utc(a))&&utc(a)===utc(b);
const sameObservation=(a,b,kind)=>kind==='historical'&&/^\d{4}-\d\d-\d\d$/.test(a??'')&&a===b?true:sameInstant(a,b);
const index=(rows,key,label)=>{if(!Array.isArray(rows))fail(label);const out=new Map();for(const r of rows){const k=r?.[key];if(typeof k!=='string'||!k||out.has(k))fail(label);out.set(k,r);}return out;};
const route=v=>typeof v==='string'&&/^\/[a-zA-Z0-9_/-]*$/.test(v)&&!v.includes('//')&&!v.split('/').includes('..');
export function compileDeskCoverage({coverageInput,module,expectedModuleDigest,sourcePolicies={},evidenceInventory=[],publicationReports=[],deskRoutes={}}={}) {
 if(coverageInput?.registry?.generation!=='cloud-newsroom-v2')fail('production-shaped registry required');
 const coverage=compileCoverage(coverageInput),at=Date.parse(coverage.evaluatedAt),registry=coverageInput.registry;
 // Reuse the append-only module validator with no append; no freshness authority from a no-op.
 planDeskRevisionAppend({now:coverage.evaluatedAt,registry,trustedRegistrySha256:deskDataSha256(registry),prior:module,trustedPriorSha256:expectedModuleDigest,proposed:[],evidenceInventory:[]});
 const declarations=new Map(registry.sources.map(s=>[s.id,s])),sources=new Map(coverage.sources.map(s=>[s.id,s])),desks=new Set(coverage.desks.map(d=>d.id));
 const extractionById=new Map(coverageInput.extractions.sources.map(e=>[e.id,e]));
 const inventory=index(evidenceInventory,'sourceId','duplicate/invalid inventory');for(const id of inventory.keys())if(!sources.has(id))fail('unknown inventory source');
 const records=index(module.records,'id','duplicate record'),reports=index(publicationReports,'recordId','duplicate/invalid publication report');
 if(!sourcePolicies||typeof sourcePolicies!=='object'||Array.isArray(sourcePolicies)||Object.keys(sourcePolicies).some(id=>!sources.has(id)))fail('source policy map');
 if(!deskRoutes||typeof deskRoutes!=='object'||Array.isArray(deskRoutes))fail('route map');
 for(const [id,value] of Object.entries(deskRoutes))if(!desks.has(id)||!route(value))fail('unknown desk/invalid route');
 for(const p of reports.values()){
  const r=records.get(p.recordId);if(!r||p.recordSha256!==deskDataSha256(r)||p.state!=='published'||typeof p.receiptId!=='string'||!p.receiptId.trim()||!route(p.route)||p.route!==deskRoutes[r.deskId])fail('publication report binding');
  if(time(p.reportedAt,at,'publication report date')<time(r.preparedAt,at,'preparation date'))fail('publication before preparation');
 }
 const recordRows=module.records.map(r=>{
  const prepared=time(r.preparedAt,at,'record preparation date');if(r.kind==='historical'&&/^\d{4}-\d\d-\d\d$/.test(r.asOf)){if(!Number.isFinite(Date.parse(r.asOf))||new Date(r.asOf).toISOString().slice(0,10)!==r.asOf||r.asOf>r.preparedAt.slice(0,10))fail('historical record date');}else time(r.asOf,prepared,'record observation date');
  const payloadDigest=deskDataSha256(r.payload),recordSha256=deskDataSha256(r);
  const evidence=r.evidence.map(ref=>{
   const s=sources.get(ref.sourceId),decl=declarations.get(ref.sourceId),e=inventory.get(ref.sourceId),proof=s.evidence,extraction=extractionById.get(ref.sourceId);
   const gaps=[];let recordPolicyExpiresAt=null;
   const p=sourcePolicies[ref.sourceId],ceiling=SOURCE_AGE_CEILINGS[p?.metricKind];
   const cap=v=>Number.isSafeInteger(v)&&v>0&&v<=ceiling;
   if(!p||!ceiling||p.sourceId!==ref.sourceId||p.url!==decl.url||p.kind!==r.kind||p.metricKind!==e?.metricKind||!cap(p.maxRetrievalAgeSeconds)||(r.kind==='current'?!cap(p.maxEffectiveAgeSeconds):p.maxEffectiveAgeSeconds!==null)||['parserId','parserVersion','publisherId'].some(k=>p[k]!==ref[k]))gaps.push('independent-source-policy-not-bound');
   else { const expiry=time(p.expiresAt,Infinity,'source policy expiry'); const deadline=Math.min(expiry,Date.parse(ref.retrievedAt)+p.maxRetrievalAgeSeconds*1000,...(r.kind==='current'?[Date.parse(r.asOf)+p.maxEffectiveAgeSeconds*1000]:[])); recordPolicyExpiresAt=new Date(deadline).toISOString();if(deadline<=at)gaps.push('record-source-policy-expired'); } 
   if(s.status!=='verified-current')gaps.push('source-'+s.status);
   if(!proof||proof.contentDigest!==ref.sha256||proof.materialDigest!==ref.materialDigest||!sameInstant(proof.observedAt,r.asOf)||!sameInstant(proof.retrievedAt,ref.retrievedAt)||ref.url!==decl.url)gaps.push('original-observation-not-bound');
   if(!e||!proof||e.url!==decl.url||e.sha256!==ref.sha256||!(e.bytes instanceof Uint8Array)||bytesDigest(e.bytes)!==ref.sha256||e.reviewedDataSha256!==payloadDigest||e.kind!==r.kind||!sameObservation(e.asOf,r.asOf,r.kind)||!sameInstant(e.retrievedAt,proof.retrievedAt)||e.materialDigest!==proof.materialDigest)gaps.push('independent-semantic-review-not-bound');
   if(!extraction||['parserId','parserVersion','publisherId','evidenceLocator'].some(k=>ref[k]!==extraction[k]||ref[k]!==e?.[k]))gaps.push('original-parser-provenance-not-bound');
   if(proof&&Date.parse(proof.verifiedAt)>prepared)gaps.push('verification-postdates-preparation');
   return {sourceId:ref.sourceId,sourceCheckStatus:s.status,recordEvidenceBinding:gaps.some(g=>g!=='source-verified-stale')?'incomplete':'bound',effectiveExpiresAt:proof?.effectiveExpiresAt??null,recordPolicyExpiresAt,contentDigest:ref.sha256,materialDigest:proof?.materialDigest??null,gaps};
  });
  const gaps=evidence.flatMap(e=>e.gaps.map(reason=>({sourceId:e.sourceId,reason})));
  const currentEvidence=evidence.length>0&&evidence.every(e=>e.gaps.length===0);
  return {id:r.id,deskId:r.deskId,revision:r.revision,recordSha256,payloadDigest,asOf:r.asOf,preparedAt:r.preparedAt,kind:r.kind,
   sourceEvidenceState:currentEvidence?'current-bound-source-checks':'source-evidence-gaps',
   reportingClassification:r.kind==='historical'?'historical-record':currentEvidence?'current-observation-prepared':'current-observation-with-gaps',
   eventNovelty:'not-assessed',publicationState:reports.has(r.id)?'published-reported':'prepared-not-published',publicationVerified:false,
   route:deskRoutes[r.deskId]??null,routeBindingState:deskRoutes[r.deskId]?'declared-not-render-verified':'unbound',renderedRefreshVerified:false,
   gaps:[...gaps,...(!deskRoutes[r.deskId]?[{sourceId:null,reason:'route-binding-missing'}]:[]),{sourceId:null,reason:'independent-rendered-publication-evidence-missing'}],evidence};
 });
 const sourceRows=coverage.sources.map(s=>({...s,recordIds:recordRows.filter(r=>r.evidence.some(e=>e.sourceId===s.id)).map(r=>r.id),unhandledRecordGap:!recordRows.some(r=>r.evidence.some(e=>e.sourceId===s.id))}));
 const deskRows=coverage.desks.map(d=>{
  const own=recordRows.filter(r=>r.deskId===d.id),ownSources=sourceRows.filter(s=>s.deskId===d.id);
  return {id:d.id,sourceCheckStatus:d.status,sourceIds:[...d.sourceIds],recordIds:own.map(r=>r.id),
   gaps:[...ownSources.filter(s=>s.status!=='verified-current').map(s=>({sourceId:s.id,reason:'source-'+s.status})),...ownSources.filter(s=>s.unhandledRecordGap).map(s=>({sourceId:s.id,reason:'no-desk-record-binding'})),...(!own.length?[{sourceId:null,reason:'no-prepared-desk-record'}]:[])],
   recordGaps:own.flatMap(r=>r.gaps.map(g=>({recordId:r.id,...g}))),publicationVerified:false,renderedRefreshVerified:false};
 });
 return freeze({schemaVersion:1,mode:'desk-record-coverage-plan',evaluatedAt:coverage.evaluatedAt,registryDigest:coverage.registryDigest,moduleSha256:deskDataSha256(module),sources:sourceRows,desks:deskRows,records:recordRows,stories:coverage.stories,wholeSiteFreshnessVerified:false,operational:false,publishAllowed:false,effects:[]});
}
