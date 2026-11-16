import {createHash} from 'node:crypto';
import {inspectMarketingPng,planCloudNewsroomV2MarketingAssets} from './cloud-newsroom-v2-marketing-assets.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
// Match Python json.dumps(sort_keys=True,separators=(',',':'),ensure_ascii=True).
export function rendererInputSha256(metadata){
 const sorted=x=>Array.isArray(x)?x.map(sorted):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])])):x;
 return hash(JSON.stringify(sorted(metadata)).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')));
}
const fail=m=>{throw Error(m);};
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const plain=(s,n)=>typeof s==='string'&&s.trim().length>0&&s.length<=n&&!/[<>\x00-\x1f\x7f]/.test(s);
const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&u.href===s;}catch{return false;}};
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
function fresh(s,now){const t=Date.parse(s);return Number.isFinite(t)&&t<=now&&now-t<=86400000;}
function blobChecked(record,blobs){if(!['web_tool_extraction','raw_origin_bytes'].includes(record.representation))fail('evidence-representation-required');const b=blobs.get(record.evidenceSha256);if(!(b instanceof Uint8Array)||!sha(record.evidenceSha256)||hash(b)!==record.evidenceSha256)fail('independent-evidence-bytes-required');return new TextDecoder().decode(b);}
function publicArtifactUrl(m,role){
 const declared=m.artifacts.find(a=>a.role===role);
 const suffix=role==='pdf'?'edition.pdf':role==='html'?'reader.html':role==='cover'?(declared.mimeType==='image/png'?'cover.png':null):({'image/png':'promo.png','image/jpeg':'promo.jpg','image/webp':'promo.webp'}[declared.mimeType]);
 if(!suffix)fail('unsupported-artifact-mime');
 return 'https://ltcmagazine.org/magazine/daily/'+m.editionDate+'/r'+m.revision+'/'+suffix;
}
function identity(receipt,proof,outline,now){
 const m=receipt?.validation?.manifest,p=receipt?.publication;
 if(receipt?.status!=='accepted-receipt'||receipt?.errors?.length!==0||receipt.validation?.status!=='validated-description'||m?.generation!=='cloud-newsroom-v2'||m.kind!=='daily'||!Number.isSafeInteger(m.revision)||m.revision<1||!/^\d{4}-\d{2}-\d{2}$/.test(m.editionDate))fail('accepted-daily-required');
 const id=`${m.editionDate}-r${m.revision}`,page=`/conversations/editions/${m.editionDate}${m.revision===1?'':`-r${m.revision}`}/`,url='https://ltcmagazine.org'+page;
 if(p?.registryId!==id||p.page!==page||p.canonicalUrl!==url||receipt.artifacts?.length!==4||m.artifacts?.length!==4)fail('edition-identity');
 for(const role of ['pdf','html','cover','promo']){
  const a=receipt.artifacts.filter(x=>x.role===role),d=m.artifacts.filter(x=>x.role===role);if(a.length!==1||d.length!==1)fail('artifact-role');
  if(a[0].verification!=='actual-local-file-bytes'||a[0].editionId!==m.editionId||a[0].revision!==m.revision||!sha(a[0].sha256)||!Number.isSafeInteger(a[0].bytes)||a[0].bytes<1||!['path','sha256','bytes'].every(k=>a[0][k]===d[0][k]))fail('artifact-identity');
 }
 const pdf=receipt.artifacts.find(x=>x.role==='pdf'),reader=receipt.artifacts.find(x=>x.role==='html');
 if(reader.htmlSafety?.status!=='accepted-inert-subset'||reader.htmlSafety.profile!=='ltc-inert-html-v1'||reader.htmlSafety.sanitized!==false||reader.htmlSafety.resourceFetchesAllowed!==false)fail('reader-profile');
 if(proof?.kind!=='independent-public-readback'||proof.issueId!==id||proof.canonicalUrl!==url||proof.httpStatus!==200||!fresh(proof.checkedAt,now)||!Array.isArray(proof.artifacts)||proof.artifacts.length!==4)fail('published-readback-required');
 for(const a of receipt.artifacts){const b=proof.artifacts.filter(x=>x.role===a.role);if(b.length!==1||b[0].sha256!==a.sha256||b[0].bytes!==a.bytes||b[0].httpStatus!==200||b[0].url!==publicArtifactUrl(m,a.role))fail('published-artifact-mismatch');}
 if(!Array.isArray(outline)||!outline.length)fail('trusted-outline-required');const used=new Set();
 for(const s of outline){if(!/^\d+(?:\.\d+)*$/.test(s.nodePath)||s.fragment!==`story-${id}-${s.nodePath.replaceAll('.','-')}`||!sha(s.contentSha256)||s.readerSha256!==reader.sha256||used.has(s.fragment))fail('outline-binding');used.add(s.fragment);}
 return {m,id,url,pdf,reader};
}
/** Pure preparation. All receipts, outlines, evidence maps, and publication proof
 * must be supplied by the independent coordinator, never producer self-attestation.
 * Batch bound is NOT a coverage cap. Missing evidence stays explicitly in backlog.
 */
export function prepareV2StoryCovers({receipt,publicationProof,trustedOutline,editorialSelections,sourceEvidence,tagEvidence,evidenceBlobs,existingInventory,now=Date.now(),batchSize=2}){
 if(!Number.isFinite(now)||![editorialSelections,sourceEvidence,tagEvidence,evidenceBlobs,existingInventory].every(x=>x instanceof Map)||!Number.isInteger(batchSize)||batchSize<1||batchSize>2)fail('trusted-inputs');
 const {m,id,url,pdf,reader}=identity(receipt,publicationProof,trustedOutline,now);const covers=[],backlog=[],coveredStoryIds=[];
 for(const s of trustedOutline){
  const destination=`public/magazine/${id}/marketing/${s.fragment}.png`,prior=existingInventory.get(destination);
  if(prior){if(prior.binding?.issueId!==id||prior.binding.storyId!==s.fragment||prior.binding.contentSha256!==s.contentSha256||prior.binding.readerSha256!==reader.sha256||prior.binding.pdfSha256!==pdf.sha256||!sha(prior.sha256)||!Number.isSafeInteger(prior.bytes)||prior.bytes<1)fail('inventory-identity');coveredStoryIds.push(s.fragment);continue;}
  const e=editorialSelections.get(s.fragment),v=sourceEvidence.get(s.fragment);
  if(!e||!v){backlog.push({storyId:s.fragment,reason:!e?'editorial-selection-missing':'source-evidence-missing'});continue;}
  if(!plain(e.title,48)||!plain(e.subtitle,68)||!plain(e.claim,145)||!plain(e.alt,900)||!['live','testnet','planned','in_build','unverified'].includes(e.stage)||!['orange','blue'].includes(e.theme))fail('invalid-editorial-selection');
  if(v.verified!==true||v.contentSha256!==s.contentSha256||v.readerSha256!==reader.sha256||v.claim!==e.claim||v.stage!==e.stage||!same(v.sourceIds,e.sourceIds)||!Array.isArray(v.sourceIds)||!v.sourceIds.length||!Array.isArray(v.sourceUrls)||v.sourceUrls.length!==v.sourceIds.length||!v.sourceUrls.every(https)||!fresh(v.checkedAt,now))fail('source-evidence-binding');blobChecked(v,evidenceBlobs);
  if(!Array.isArray(e.tags)||e.tags.length>3)fail('tag-limit');const tags=[],seen=new Set();
  for(const key of e.tags){const t=tagEvidence.get(key);if(!t||t.verified!==true||!['X','Instagram'].includes(t.platform)||!/^@[A-Za-z0-9_.]{1,30}$/.test(t.handle)||key!==`${t.platform}:${t.handle}`||seen.has(key)||!https(t.officialSourceUrl)||!https(t.linkedTarget)||!fresh(t.checkedAt,now))fail('tag-evidence-binding');
   const u=new URL(t.linkedTarget),hosts=t.platform==='X'?['x.com','twitter.com','www.x.com','www.twitter.com']:['instagram.com','www.instagram.com'];
   if(!hosts.includes(u.hostname)||u.pathname.replace(/^\/|\/$/g,'').toLowerCase()!==t.handle.slice(1).toLowerCase()||!blobChecked(t,evidenceBlobs).includes(t.linkedTarget))fail('tag-outbound-link');
   seen.add(key);tags.push(Object.fromEntries(['platform','handle','officialSourceUrl','linkedTarget','evidenceSha256','checkedAt'].map(k=>[k,t[k]])));
  }
  if(covers.length===batchSize){backlog.push({storyId:s.fragment,reason:'next-bounded-batch'});continue;}
  const checkedDate=v.checkedAt.slice(0,10);
  if(tags.some(t=>t.checkedAt.slice(0,10)!==checkedDate))fail('renderer-evidence-date-mismatch');
  const binding={kind:'canonical_daily_published_readback',issue_id:id,edition_revision:m.revision,canonical_story_url:url+'#'+s.fragment,content_sha256:s.contentSha256,reader_sha256:reader.sha256,pdf_sha256:pdf.sha256};
  const refs=[...v.sourceUrls.map(sourceUrl=>({url:sourceUrl,record:v})),...tags.map(t=>({url:t.officialSourceUrl,record:tagEvidence.get(`${t.platform}:${t.handle}`)}))];
  const evidenceFiles=new Map();for(const ref of refs)evidenceFiles.set(ref.record.evidenceSha256,Buffer.from(evidenceBlobs.get(ref.record.evidenceSha256)).toString('base64'));
  const rendererEvidence={schema:1,checked_date:checkedDate,provenance:'Coordinator-supplied independent retrieval evidence; byte integrity only, never publication authority.',binding,sources:refs.map(({url,record})=>({url,representation:record.representation,file:'evidence/'+record.evidenceSha256+'.bin',sha256:record.evidenceSha256,checked_date:checkedDate})),claims:{[s.fragment]:{claim:e.claim,stage:e.stage,source_urls:v.sourceUrls}},tags:tags.map(t=>({platform:t.platform,handle:t.handle,official_source_url:t.officialSourceUrl,linked_target:t.linkedTarget}))};
  const rendererEvidenceJson=JSON.stringify(rendererEvidence);
  covers.push({storyId:s.fragment,fragment:s.fragment,nodePath:s.nodePath,contentSha256:s.contentSha256,readerSha256:reader.sha256,pdfSha256:pdf.sha256,canonicalStoryUrl:url+'#'+s.fragment,claim:e.claim,sourceIds:[...e.sourceIds],tags,sourceEvidenceSha256:v.evidenceSha256,rendererEvidenceJson,evidenceFiles:[...evidenceFiles].map(([sha256,base64])=>({relativePath:'evidence/'+sha256+'.bin',sha256,base64})),coverMetadata:{story_key:s.fragment,title:e.title,subtitle:e.subtitle,claim:e.claim,stage:e.stage,theme:e.theme,alt:e.alt,edition_date:m.editionDate,checked_date:checkedDate,event_date:e.eventDate??null,publication_date:e.publicationDate??null,sources:v.sourceUrls.map(url=>({url,primary:true,supports_claim:true,checked_date:checkedDate})),tags:tags.map(t=>({platform:t.platform,handle:t.handle,official_source_url:t.officialSourceUrl,linked_target:t.linkedTarget,outbound_link_verified:true,checked_date:checkedDate})),verification:{human_or_agent_reviewed:true,claim_supported:true},evidence_sha256:hash(rendererEvidenceJson),binding:{kind:'canonical_daily_published_readback',issue_id:id,edition_revision:m.revision,canonical_story_url:url+'#'+s.fragment,content_sha256:s.contentSha256,reader_sha256:reader.sha256,pdf_sha256:pdf.sha256},publishAllowed:false},plannedDestination:destination});
 }
 return freeze({status:'nonpublishing-v2-cover-preparation',issueId:id,covers,backlog,coveredStoryIds,coverageComplete:coveredStoryIds.length===trustedOutline.length,publishAllowed:false,operational:false,effects:[],rendererCompatibility:'isolated-renderer-with-canonical-daily-binding-support'});
}
/** Build exact existing asset-planner envelope after rendering; no copies/writes. */
export function bindRenderedV2Assets({preparation,renderedByStory,receipt,trustedOutline,sourceEvidence,tagEvidence,existingInventory}){
 if(preparation?.status!=='nonpublishing-v2-cover-preparation'||preparation.publishAllowed!==false||!(renderedByStory instanceof Map)||!preparation.covers.length)fail('preparation-required');
 const observedAssets=new Map(),stories=preparation.covers.map(c=>{
  const r=renderedByStory.get(c.storyId);if(!r||r.visualQa!=='passed'||r.inputMetadataSha256!==rendererInputSha256(c.coverMetadata))fail('render-provenance-required');
  const a=inspectMarketingPng(r.bytes),path=`covers/${c.storyId}.png`;observedAssets.set(path,r.bytes);
  return {storyId:c.storyId,fragment:c.fragment,nodePath:c.nodePath,contentSha256:c.contentSha256,readerSha256:c.readerSha256,pdfSha256:c.pdfSha256,canonicalStoryUrl:c.canonicalStoryUrl,claim:c.claim,sourceIds:c.sourceIds,tags:c.tags,asset:{path,sha256:a.sha256,bytes:a.bytes,altText:c.coverMetadata.alt,aiAssisted:true}};
 });
 const envelope={schemaVersion:1,kind:'canonicaldaily-marketing-assets',issueId:preparation.issueId,stories};
 const admission=planCloudNewsroomV2MarketingAssets({receipt,trustedOutline,envelope,observedAssets,sourceEvidence,tagEvidence,existingInventory});
 return {envelope,observedAssets,admission,publishAllowed:false,effects:[]};
}
