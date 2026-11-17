/** Dormant source→review-bound article→local DRAFT artifacts. No model or publisher. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createSourceCollector,SOURCE_REGISTRY_SHA256} from './source-collector.mjs';
import {buildArticleDraft} from './article-builder.mjs';
import {prepareLocalArtifacts} from './local-render-dispatcher.mjs';
const fixedRegistry=JSON.parse(await readFile(new URL('./sources/registry.json',import.meta.url),'utf8')).sources;
const sha=b=>createHash('sha256').update(b).digest('hex');
const time=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?Date.parse(s):NaN;
/** editorial inputs MUST originate from independent trusted review, not transport
 * content/extractions. This function cannot establish who authored those reviews. */
async function pipeline({issue,editorial,trustedCollectorRegistrySha256,transport,clock=()=>new Date().toISOString(),networkEnabled=false,renderEnabled=false,workRoot}={},retained=null){
 if(typeof networkEnabled!=='boolean'||typeof renderEnabled!=='boolean'||typeof clock!=='function')throw Error('explicit-pipeline-flags-and-clock-required');
 if(trustedCollectorRegistrySha256!==SOURCE_REGISTRY_SHA256)throw Error('reviewed-collector-registry-pin-required');
 if(!issue||Object.keys(issue).sort().join(',')!=='date,id,title'||!/^\d{4}-\d{2}-\d{2}$/.test(issue.date)||new Date(issue.date).toISOString().slice(0,10)!==issue.date||!new RegExp('^'+issue.date+'-r[1-9][0-9]*$').test(issue.id)||typeof issue.title!=='string'||!issue.title||issue.title.length>140||/[<>\x00-\x1f]/.test(issue.title))throw Error('dated-draft-issue-required');
 // Snapshot caller trust before any untrusted async retrieval can mutate it.
 const selected=structuredClone(issue),trusted=structuredClone(editorial);
 if(!trusted||!(trusted.reviews instanceof Map)||!Array.isArray(trusted.registry)||!Array.isArray(trusted.facts)||!Array.isArray(trusted.stories)||trusted.stories.some(s=>s.id?.startsWith('pipeline-gap-')))throw Error('independent-editorial-inputs-required');
 const collection=retained?validateRetainedCollection(retained.collection,retained.trustedCollectionSha256):await createSourceCollector({networkEnabled,transport,clock}).collect();
 const now=clock(),at=time(now);if(!Number.isFinite(at))throw Error('pipeline-clock');
 const observations=new Map(collection.observations.map(o=>[o.sourceId,o])),extractions=new Map(collection.extractions.map(e=>[e.sourceId,e]));
 const evidence=new Map(),boundReviews=new Map(trusted.reviews),bindingGaps=[];
 for(const fact of trusted.facts){
  const source=trusted.registry.find(s=>s.id===fact.sourceId),o=observations.get(fact.sourceId),x=extractions.get(fact.sourceId),rows=collection.evidence.filter(e=>e.sourceId===fact.sourceId&&e.sha256===fact.evidenceSha256&&e.locator===fact.evidenceLocator),review=trusted.reviews.get(fact.id);
  let reason=null;
  if(!source||!o||o.status!=='retrieved-uninterpreted'||o.url!==source.url||o.httpStatus!==200)reason='collection-source-or-success-missing';
  else if(!Number.isFinite(time(o.checkedAt))||time(o.checkedAt)>at||time(o.finishedAt)<time(o.checkedAt)||time(o.finishedAt)>at||!(time(o.retrievalExpiresAt)>at))reason='collection-retrieval-expired-or-invalid';
  else if(rows.length!==1||!(rows[0].bytes instanceof Uint8Array)||sha(rows[0].bytes)!==o.sha256||o.sha256!==fact.evidenceSha256||rows[0].bytes.length!==o.bytes)reason='collection-actual-evidence-mismatch';
  else if(fact.retrievedAt!==o.checkedAt||review?.retrievedAt!==o.checkedAt||review?.evidenceLocator!==rows[0].locator||review?.evidenceSha256!==o.sha256)reason='collection-review-retrieval-binding-missing';
  else if(!x||!['candidate-for-review','candidate-for-independent-read'].includes(x.status)||x.parser?.id!==source.parserId||x.parser?.version!==source.parserVersion||x.sourceId!==source.id||x.sourceUrl!==source.url||x.snapshotSha256!==o.sha256||x.retrievedAt!==o.checkedAt)reason='collection-parser-identity-or-extraction-gap';
  if(reason){boundReviews.delete(fact.id);bindingGaps.push({factId:fact.id,sourceId:fact.sourceId,reason});}else evidence.set(o.sha256,rows[0].bytes.slice());
 }
 const draft=buildArticleDraft({...trusted,now,reviews:boundReviews,evidence});
 const collectionGaps=collection.extractions.filter(x=>x.status==='gap').map(x=>({sourceId:x.sourceId,reason:x.reason}));
 const renderGaps=[...collectionGaps.map(g=>({reason:`Source ${g.sourceId}: ${g.reason}`})),...bindingGaps.map(g=>({reason:`Fact ${g.factId}: ${g.reason}`})),...draft.unassignedFacts.map(g=>({reason:`Unassigned fact ${g.id}: ${g.reason}`})),...draft.sourceCoverage.filter(g=>g.status!=='evidence-bound-draft').map(g=>({reason:`Source ${g.sourceId}: coverage not established`}))];
 const renderStories=structuredClone(draft.stories);
 for(let i=0;i<renderGaps.length;i+=50)renderStories.push({id:`pipeline-gap-${i/50}`,title:'DRAFT: collection and assignment gaps',publishable:false,claimApproved:false,facts:[],gaps:renderGaps.slice(i,i+50)});
 const rendererInput={schemaVersion:1,issueId:selected.id,issueDate:selected.date,title:selected.title,draft:{...structuredClone(draft),stories:renderStories},sourceUrls:Object.fromEntries(trusted.registry.map(s=>[s.id,s.url]))};
 const base={issue:selected,collection,draft,bindingGaps,collectionGaps,rendererInput,publishable:false,claimApproved:false,ecosystemCoverageComplete:false,publicationExecuted:false,modelRequestAttempted:false};
 if(!renderEnabled)return {...base,status:'draft-prepared-render-disabled',render:{status:'disabled',renderAttempted:false,publicationExecuted:false}};
 if(renderStories.length<1||renderStories.length>20||renderStories.reduce((n,s)=>n+s.facts.length,0)>100||renderGaps.some(g=>g.reason.length>200))return {...base,status:'held-render-schema-capacity',render:{status:'not-attempted',renderAttempted:false,publicationExecuted:false}};
 const deadline=Math.min(...draft.stories.flatMap(s=>s.facts.map(f=>time(observations.get(f.sourceId).retrievalExpiresAt))),draft.expiresAt===null?Infinity:time(draft.expiresAt));
 const before=time(clock());if(!Number.isFinite(before)||before<at||deadline<=before)return {...base,status:'held-draft-expired-before-render',render:{status:'not-attempted',renderAttempted:false,publicationExecuted:false}};
 const render=await prepareLocalArtifacts({input:rendererInput,workRoot,executeEnabled:true});
 const after=time(clock());if(!Number.isFinite(after)||after<before||deadline<=after)return {...base,status:'held-draft-expired-after-render',render,preparationExpired:true};
 return {...base,status:render.status==='local-draft-artifacts-byte-verified'?'draft-artifacts-prepared-for-review':'held-local-draft-render',render,preparationExpired:false};
}

// A capture fingerprint must be retained independently of any subsequently supplied
// bundle/reviewer. It binds the exact captured bytes and clocks, NOT source truth.
function collectionDigest(collection){
 if(!collection||!Array.isArray(collection.evidence)||collection.evidence.length>100)throw Error('captured-evidence-required');
 let total=0;const evidence=collection.evidence.map(e=>{if(!(e.bytes instanceof Uint8Array)||!e.bytes.length||e.bytes.length>2000000||(total+=e.bytes.length)>16000000)throw Error('captured-evidence-byte-bound');return {...e,bytes:Buffer.from(e.bytes).toString('base64')};});
 const serialized=JSON.stringify({...collection,evidence});if(serialized.length>24000000)throw Error('captured-bundle-bound');return sha(serialized);
}
function validateRetainedCollection(collection,expected){
 const c=structuredClone(collection);
 if(typeof expected!=='string'||!/^[a-f0-9]{64}$/.test(expected)||collectionDigest(c)!==expected||c.registrySha256!==SOURCE_REGISTRY_SHA256||c.publishable!==false||c.claimVerified!==false||c.publicationExecuted!==false||c.ecosystemCoverageComplete!==false||!Array.isArray(c.observations)||!Array.isArray(c.extractions)||c.observations.length!==fixedRegistry.length||c.extractions.length!==fixedRegistry.length)throw Error('trusted-captured-bundle-binding-required');
 for(const source of fixedRegistry){const rows=c.observations.filter(o=>o.sourceId===source.id),extractions=c.extractions.filter(e=>e.sourceId===source.id);if(rows.length!==1||extractions.length!==1||rows[0].url!==source.url)throw Error('captured-source-registry-mismatch');}
 const seen=new Set();for(const e of c.evidence){const o=c.observations.find(o=>o.sourceId===e.sourceId);if(seen.has(e.sourceId)||!o||o.status!=='retrieved-uninterpreted'||o.httpStatus!==200||e.sha256!==sha(e.bytes)||e.sha256!==o.sha256||o.bytes!==e.bytes.length||e.locator!==`evidence/${e.sourceId}-${e.sha256}`)throw Error('captured-actual-evidence-mismatch');seen.add(e.sourceId);}
 if(c.observations.some(o=>o.status==='retrieved-uninterpreted'&&!seen.has(o.sourceId)))throw Error('captured-evidence-missing');return c;
}
/** First phase: capture only. Caller retains collectionSha256 independently, then
 * performs semantic review against these exact bytes/clocks. Never approves facts. */
export async function collectEditorialEvidence({networkEnabled=false,transport,clock=()=>new Date().toISOString()}={}){
 const collection=await createSourceCollector({networkEnabled,transport,clock}).collect();
 return {collection,collectionSha256:collectionDigest(collection),publishable:false,claimApproved:false,publicationExecuted:false};
}
/** Second phase: no retrieval. Reviews can be authored after the actual captured
 * retrieval, without predicting or manufacturing clocks. Pin is independently held. */
export async function prepareEditorialFromCollection({collection,trustedCollectionSha256,...options}={}){
 if(options.networkEnabled===true||options.transport!==undefined)throw Error('retained-preparation-never-retrieves');
 return pipeline({...options,networkEnabled:false},{collection,trustedCollectionSha256});
}
/** Convenience prebound path, appropriate for fixtures/already agreed observations;
 * fresh unknown retrieval requires the explicit two-phase review workflow above. */
export async function runEditorialPipeline(options){return pipeline(options);}
