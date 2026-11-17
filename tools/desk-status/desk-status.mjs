/** Display-only model. Independently trusted adapters supply dates/publication
 * observations; this code cannot verify research or authorize publication. */
import {validatePdfRegistry,pdfIssuePage} from '../../scripts/lib/ltc-pdf-registry.mjs';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const instant=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&day(v.slice(0,10))&&Number.isFinite(Date.parse(v))?Date.parse(v):NaN;
const nyDay=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
const fields=['reportingDate','eventAt','asOf','checkedAt','preparedAt','publishedAt'];
const safeHref=v=>typeof v==='string'&&/^\/[a-zA-Z0-9_/#.-]*$/.test(v)&&!v.includes('//')&&!v.split('/').includes('..');
function cardModel(card,at,today,sourcePolicy){
 const dates=Object.fromEntries(fields.map(k=>[k,card[k]??null]));
 const result=(status,reason)=>({id:card.id,href:safeHref(card.href)?card.href:null,status,reason,dates,sourcePolicyExpiresAt:sourcePolicy?.expiresAt??null,reportingLabel:dates.reportingDate===null?'Reporting date unavailable':`Reporting dated ${dates.reportingDate}`,labels:fields.filter(k=>dates[k]!==null).map(k=>({kind:k,text:`${{reportingDate:'Reporting dated',eventAt:'Event',asOf:'Observation effective',checkedAt:'Source checked',preparedAt:'Prepared',publishedAt:'Published'}[k]}: ${dates[k]}`})),claimVerified:false});
 if(typeof card.id!=='string'||!card.id||!safeHref(card.href))return result('withheld','invalid-card-identity');
 for(const k of fields){const v=dates[k];if(v===null)continue;if(!day(v)&&!Number.isFinite(instant(v)))return result('withheld','invalid-date:'+k);if(day(v)?v>today:instant(v)>at)return result('withheld','future-date:'+k);}
 if(card.publicationStatus==='prepared')return result('prepared-not-published','preparation-is-not-publication');
 if(card.publicationStatus!=='published'||dates.publishedAt===null)return result('publication-unknown','published-evidence-required');
 if(card.evidenceKind==='historical')return result('historical-record','a-new-check-does-not-change-the-original-observation-date');
 if(card.evidenceKind!=='current'||!Number.isSafeInteger(card.maxAgeSeconds)||card.maxAgeSeconds<1||card.maxAgeSeconds>86400)return result('freshness-unknown','explicit-bounded-current-source-policy-required');
 if(sourcePolicy!==undefined&&(!sourcePolicy||typeof sourcePolicy!=='object'||Array.isArray(sourcePolicy)||!Object.hasOwn(sourcePolicy,'expiresAt')||!Number.isFinite(instant(sourcePolicy.expiresAt))))return result('withheld','invalid-independent-source-deadline');
 const checked=instant(dates.checkedAt),effective=instant(dates.asOf);
 if(!Number.isFinite(checked)||!Number.isFinite(effective))return result('freshness-unknown','exact-check-and-effective-times-required');
 if(effective>checked)return result('withheld','observation-after-source-check');
 if(sourcePolicy&&instant(sourcePolicy.expiresAt)<=checked)return result('withheld','source-deadline-not-after-check');
 if(sourcePolicy&&instant(sourcePolicy.expiresAt)<=at)return result('stale-observation','independent-source-deadline-expired');
 if(at-checked>=card.maxAgeSeconds*1000||at-effective>=card.maxAgeSeconds*1000)return result('stale-observation','new-source-evidence-needed-not-a-date-relabel');
 return result('recently-checked-observation','date-and-policy-only-not-independent-fact-verification');
}
export function buildDeskStatus({now,cards=[],registry,publicationProof=null,registryProvenance=null,sourcePolicies={}}={}){
 const at=instant(now);if(!Number.isFinite(at))throw Error('injected-valid-clock-required');if(!Array.isArray(cards)||cards.length>100)throw Error('bounded-cards-required');
 const today=nyDay(at),ids=new Set();for(const c of cards){if(!c||typeof c!=='object'||ids.has(c.id))throw Error('invalid-or-duplicate-card');ids.add(c.id);}
 if(!sourcePolicies||typeof sourcePolicies!=='object'||Array.isArray(sourcePolicies))throw Error('independent-source-policy-map-required');
 const items=cards.map(c=>cardModel(c,at,today,sourcePolicies[c.id]));let latestIssue=null,latestIssueReason='published-registry-proof-required';
 try{
  const r=validatePdfRegistry(structuredClone(registry)),i=r.issues.find(i=>i.id===r.current),checked=instant(publicationProof?.observedAt);
  if(!i||i.date>today||i.preparedDate>today)latestIssueReason='future-registry-edition';
  else if(publicationProof?.status==='published'&&publicationProof.route===pdfIssuePage(i)&&/^[a-f0-9]{40}$/.test(publicationProof.sourceCommit??'')&&registryProvenance?.sourceCommit===publicationProof.sourceCommit&&/^dpl_[A-Za-z0-9_-]+$/.test(publicationProof.deploymentId??'')&&Array.isArray(publicationProof.domainObservations)&&publicationProof.domainObservations.length===2&&new Set(publicationProof.domainObservations.map(o=>o.domain)).size===2&&publicationProof.domainObservations.every(o=>['ltcmagazine.org','satnamsatoshi.com'].includes(o.domain)&&o.verified===true&&o.sourceCommit===publicationProof.sourceCommit&&o.deploymentId===publicationProof.deploymentId&&o.route===pdfIssuePage(i)&&o.pdfSha256===i.sha256)&&publicationProof.currentId===i.id&&publicationProof.pdfSha256===i.sha256&&Number.isFinite(checked)&&checked<=at&&nyDay(checked)>=i.date&&nyDay(checked)>=i.preparedDate){
   latestIssue={id:i.id,date:i.date,revision:i.revision,title:i.title,href:pdfIssuePage(i),pdf:i.pdf,sha256:i.sha256,publicationObservedAt:publicationProof.observedAt,label:at-checked<300000?'Latest verified published issue':'Last verified published issue',verificationLabel:`Publication checked ${publicationProof.observedAt}`,freshResearchClaim:false};latestIssueReason=null;
  }
 }catch{latestIssueReason='invalid-or-missing-registry';}
 return freeze({schemaVersion:1,asOf:now,timezone:'America/New_York',items,latestIssue,latestIssueReason,reviewBacklog:items.filter(i=>['stale-observation','freshness-unknown','publication-unknown','withheld'].includes(i.status)).map(i=>({id:i.id,reason:i.reason,action:i.status==='withheld'?'inspect-source-metadata':'check-independent-evidence',automaticRewriteAllowed:false})),effects:[],publicationAuthorized:false});
}
