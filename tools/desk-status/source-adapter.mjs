/** Draft source adapter, not a fact verifier or publication observer. No IO. */
import {buildDeskStatus} from './desk-status.mjs';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export const DESK_SOURCE_PATHS=Object.freeze({moon:'content/specials/litecoin-to-the-moon-r4.json',explore:'content/specials/ecosystem-nov16-web.json',register:'content/research/litecoin-distribution-latest.json',treasury:'app/treasury/page.tsx',registry:'content/ltc-pdf/issues.json'});
const pipeline=[['Source registry','Historical registry; new LTC sources are dated separately','Documented'],['Primary-source policy','Required for material claims','Documented'],['Classification model','Fact · estimate · interpretation','Prepared'],['Public daily dataset','Awaiting ingestion verification','Not live']];
/** inputs must be read from a pinned source snapshot; publication/current records
 * are independently normalized observations, never inferred from source prose. */
export function adaptExistingDesks({now,moon,explore,register,treasurySource,registry,sourceCommit,publicationProof=null,publicationRecords={},currentObservations=[],sourcePolicies}={}){
 if(!/^[a-f0-9]{40}$/.test(sourceCommit??''))throw Error('pinned-source-commit-required');
 if(!moon||moon.id!=='litecoin-to-the-moon-r4'||!Array.isArray(moon.sources)||!Array.isArray(explore)||!register||register.schemaVersion!==1)throw Error('unsupported-source-shape');
 if(typeof treasurySource!=='string'||!pipeline.every(row=>row.every(text=>treasurySource.includes(JSON.stringify(text)))))throw Error('treasury-pipeline-changed-review-required');
 if(!Array.isArray(currentObservations)||currentObservations.length>25)throw Error('bounded-current-observations-required');
 if(currentObservations.length&&(!sourcePolicies||typeof sourcePolicies!=='object'||Array.isArray(sourcePolicies)))throw Error('mandatory-independent-current-policy-map');
 const validDate=v=>{if(typeof v!=='string')return false;const d=v.slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)return false;if(v===d)return d<=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(v)&&Number.isFinite(Date.parse(v))&&Date.parse(v)<=Date.parse(now);};
 const publication=(id,href)=>{const p=publicationRecords[id];if(!p)return {};if(p.sourceCommit!==sourceCommit||p.href!==href||p.status!=='published'||!validDate(p.publishedAt))throw Error('unbound-desk-publication-record');return {publicationStatus:'published',publishedAt:p.publishedAt};};
 const cards=[
  {id:'explore-special',href:'/conversations/specials/2026-11-16-ecosystem/',evidenceKind:'historical'},
  {id:'moon-r4',href:'/conversations/specials/litecoin-to-the-moon/',reportingDate:moon.researchThrough,preparedAt:moon.preparedAt,evidenceKind:'historical'},
  {id:'register-snapshot',href:'/treasury/#register-checkpoint',asOf:register.asOf,checkedAt:register.collectedAt,evidenceKind:'historical'},
  {id:'treasury-pipeline',href:'/treasury/#readiness-title',publicationStatus:'prepared',evidenceKind:'historical'}
 ].map(c=>c.id==='treasury-pipeline'?c:({...c,...publication(c.id,c.href)}));
 const policies={};for(const o of currentObservations){
  if(!o||!/^current-[a-z0-9-]+$/.test(o.id??''))throw Error('separate-current-observation-identity-required');
  const p=sourcePolicies[o.id];if(!p||p.sourceId!==o.sourceId||p.url!==o.url||!Number.isSafeInteger(p.maxAgeSeconds)||p.maxAgeSeconds<1||p.maxAgeSeconds>86400||typeof p.expiresAt!=='string')throw Error('exact-current-source-policy-required');
  // Explicit allowlisted fields: no source-supplied publication status or max age.
  cards.push({id:o.id,href:o.href,asOf:o.asOf,checkedAt:o.checkedAt,eventAt:o.eventAt,evidenceKind:'current',maxAgeSeconds:p.maxAgeSeconds,...publication(o.id,o.href)});
  policies[o.id]={expiresAt:p.expiresAt};
 }
 const status=buildDeskStatus({now,cards,registry,publicationProof,registryProvenance:{sourceCommit},sourcePolicies:policies});
 return freeze({schemaVersion:1,sourceCommit,status,
  sourceRecords:{moon:structuredClone(moon.sources),explore:explore.map(c=>({id:c.id,status:c.status??null,sources:structuredClone(c.sources??[])})),register:structuredClone(register)},
  displayContext:{explore:{historicalAnchor:'#nov16-field-notes',reportingDate:null,label:'Dated ecosystem special; source-specific dates retained',dateGap:'No structured edition reporting date in source JSON; do not parse prose or infer from route.'},moon:{researchThrough:moon.researchThrough,preparedAt:moon.preparedAt,publicationUnknown:!publicationRecords['moon-r4'],limits:structuredClone(moon.limits??[])},register:{label:'Saved historical Register snapshot',asOf:register.asOf,checkedAt:register.collectedAt,runtimeFeedVerified:false,limits:['Mixed observation dates; custody and ownership may overlap.','Saved snapshot does not verify the separate runtime feed.']},treasury:{pipeline:structuredClone(pipeline),pagePublication:publication('treasury-pipeline','/treasury/#readiness-title'),liveDatasetVerified:false}},
  effects:[],publishable:false});
}
