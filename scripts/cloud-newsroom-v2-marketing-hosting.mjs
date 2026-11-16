/** Separate, nonpublishing marketing hosting boundary. Never widens daily admission.
 * All trusted inputs must be coordinator observations, not producer declarations.
 * Full-tree hashes describe actual candidate bytes supplied by the caller; this
 * module has no filesystem, network, Buffer, deployment or campaign effects.
 */
import {createHash} from 'node:crypto';
import {planCloudNewsroomV2MarketingAssets} from './cloud-newsroom-v2-marketing-assets.mjs';
export const MARKETING_HOSTING_MANIFEST_PATH='content/ltc-marketing/hosting.json';
export const MAX_MARKETING_HOSTING_MANIFEST_BYTES=2*1024*1024;
const hosts=['ltcmagazine.org','satnamsatoshi.com'];
export const MARKETING_SOURCE_MAX_AGE_MS=24*60*60*1000;
const hash=b=>createHash('sha256').update(b).digest('hex');
const hex=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v);
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const canon=v=>Array.isArray(v)?'['+v.map(canon).join(',')+']':obj(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}':JSON.stringify(v);
const eq=(a,b)=>canon(a)===canon(b);
const fail=reason=>{throw Error(reason);};
const exact=(o,fields)=>obj(o)&&Object.keys(o).sort().join(',')===[...fields].sort().join(',');
const instant=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,19)===v.slice(0,19)?Date.parse(v):NaN;
const plain=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n&&!/[<>\u0000-\u001f\u007f]/.test(v);
const freeze=v=>{if(obj(v)||Array.isArray(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const bindingFields=['issueId','storyId','contentSha256','readerSha256','pdfSha256'];
function priorManifest(text){
 if(text===null)return {schemaVersion:1,kind:'ltc-marketing-hosting',assets:[]};
 if(typeof text!=='string'||Buffer.byteLength(text)>MAX_MARKETING_HOSTING_MANIFEST_BYTES)fail('hosting_manifest_bounds');
 const m=JSON.parse(text);if(!exact(m,['schemaVersion','kind','assets'])||m.schemaVersion!==1||m.kind!=='ltc-marketing-hosting'||!Array.isArray(m.assets)||m.assets.length>4096)fail('invalid_hosting_manifest');
 const paths=new Set();
 for(const a of m.assets){
  if(!exact(a,['path','sha256','bytes','width','height','mimeType','altText','aiAssisted','binding','nodePath','canonicalStoryUrl','reviewedSourceCommit','publicationObservedSourceCommit','source'])||!exact(a.binding,bindingFields)||!/^\d{4}-\d\d-\d\d-r[1-9]\d*$/.test(a.binding.issueId)||!/^\d+(?:\.\d+)*$/.test(a.nodePath)||a.binding.storyId!==`story-${a.binding.issueId}-${a.nodePath.replaceAll('.','-')}`||a.path!==`public/magazine/${a.binding.issueId}/marketing/${a.binding.storyId}.png`||paths.has(a.path)||!['contentSha256','readerSha256','pdfSha256'].every(k=>hex(a.binding[k],64))||!hex(a.sha256,64)||!Number.isSafeInteger(a.bytes)||a.bytes<1||a.bytes>5*1024*1024||a.width!==1080||a.height!==1350||a.mimeType!=='image/png'||!plain(a.altText,1000)||typeof a.aiAssisted!=='boolean'||!hex(a.reviewedSourceCommit,40)||!hex(a.publicationObservedSourceCommit,40))fail('invalid_hosting_asset_record');
  const [date,rev]=a.binding.issueId.split('-r'),route=rev==='1'?date:a.binding.issueId;
  if(a.canonicalStoryUrl!==`https://ltcmagazine.org/conversations/editions/${route}/#${a.binding.storyId}`)fail('invalid_hosting_story_url');
  if(!exact(a.source,['claim','sourceIds','evidenceSha256','checkedAt'])||!plain(a.source.claim,500)||!Array.isArray(a.source.sourceIds)||!a.source.sourceIds.length||a.source.sourceIds.length>100||new Set(a.source.sourceIds).size!==a.source.sourceIds.length||a.source.sourceIds.some(x=>!plain(x,128))||!hex(a.source.evidenceSha256,64)||!Number.isFinite(instant(a.source.checkedAt)))fail('invalid_hosting_source_binding');
  paths.add(a.path);
 }
 return m;
}
function treeMap(entries){
 if(!Array.isArray(entries)||!entries.length||entries.length>30000)fail('full_tree_required');const map=new Map(),folded=new Set();
 for(const e of entries){if(!obj(e)||typeof e.path!=='string'||e.path.length>500||!/^[a-zA-Z0-9_./@+\[\]-]+$/.test(e.path)||e.path.startsWith('/')||e.path.split('/').some(x=>!x||x==='.'||x==='..'||x.toLowerCase()==='.git')||e.mode!=='100644'||!hex(e.sha256,64)||!Number.isSafeInteger(e.bytes)||e.bytes<0||map.has(e.path)||folded.has(e.path.toLowerCase()))fail('unsafe_or_duplicate_tree_entry');map.set(e.path,e);folded.add(e.path.toLowerCase());}
 for(const p of map.keys()){const parts=p.split('/');for(let i=1;i<parts.length;i++)if(map.has(parts.slice(0,i).join('/')))fail('tree_file_directory_collision');}return map;
}
function context(input,trusted){
 if(!obj(trusted)||!hex(trusted.priorCommit,40)||!hex(trusted.reviewedCodeCommit,40))fail('external_hosting_trust_required');const now=instant(input?.now),until=instant(trusted.expiresAt),p=trusted.publishedIssueProof;
 if(!Number.isFinite(now)||!(until>now))fail('hosting_review_expired_or_unbounded');
 const receipt=input?.marketing?.receipt,m=receipt?.validation?.manifest,publication=receipt?.publication,pdf=receipt?.artifacts?.find(a=>a.role==='pdf'),reader=receipt?.artifacts?.find(a=>a.role==='html');
 if(!p||p.status!=='published-verified'||p.issueId!==publication?.registryId||p.pdfSha256!==pdf?.sha256||p.readerSha256!==reader?.sha256||p.sourceCommit!==trusted.priorCommit||!Number.isFinite(instant(p.observedAt))||instant(p.observedAt)>now||now-instant(p.observedAt)>300000||!(instant(p.expiresAt)>now)||!Array.isArray(p.domains)||p.domains.length!==2||!eq(p.domains.map(d=>d.host).sort(),hosts))fail('fresh_actual_published_issue_proof_required');
 for(const d of p.domains)if(d.verified!==true||typeof d.deploymentId!=='string'||!/^dpl_[A-Za-z0-9]{1,100}$/.test(d.deploymentId)||d.pdfSha256!==pdf.sha256||d.readerSha256!==reader.sha256||d.sourceCommit!==trusted.priorCommit)fail('published_domain_bytes_or_source_mismatch');
 if(!hex(m?.sourceCommit,40))fail('receipt_reviewed_source_required');
 const prior=priorManifest(trusted.priorManifestText),tree=treeMap(trusted.priorTree),manifestEntry=tree.get(MARKETING_HOSTING_MANIFEST_PATH);
 if(trusted.priorManifestText===null?!!manifestEntry:!manifestEntry||manifestEntry.sha256!==hash(trusted.priorManifestText)||manifestEntry.bytes!==Buffer.byteLength(trusted.priorManifestText))fail('prior_manifest_tree_mismatch');
 for(const a of prior.assets){const e=tree.get(a.path);if(!e||e.sha256!==a.sha256||e.bytes!==a.bytes)fail('prior_marketing_asset_tree_mismatch');}
 return {now,until,p,receipt,m,publication,prior,tree};
}
/** marketing has the existing asset planner inputs except existingInventory:
 * inventory is derived only from the trusted prior hosting manifest.
 * Batches remain <=2 assets; caller-owned backlog advances until eligible stories
 * are exhausted. Bounds never truncate backlog or silently claim full coverage.
 */
export function planCloudNewsroomV2MarketingHosting(input,trusted){
 try{
  const c=context(input,trusted),inventory=new Map(c.prior.assets.map(a=>[a.path,{sha256:a.sha256,bytes:a.bytes,binding:a.binding}]));
  const plan=planCloudNewsroomV2MarketingAssets({...input.marketing,existingInventory:inventory}),records=[],newEvidenceDeadlines=[];
  for(const a of plan.assetCopies){
   const candidate=input.marketing.envelope.stories.find(s=>s.storyId===a.binding.storyId),story=input.marketing.trustedOutline.find(s=>s.fragment===a.binding.storyId),evidence=input.marketing.sourceEvidence.get(a.binding.storyId);
   if(!Number.isFinite(instant(evidence.checkedAt))||instant(evidence.checkedAt)>c.now)fail('future_marketing_source_check');
   const record={path:a.destination,sha256:a.sha256,bytes:a.bytes,width:a.width,height:a.height,mimeType:a.mimeType,altText:a.altText,aiAssisted:a.aiAssisted,binding:{...a.binding},nodePath:story.nodePath,canonicalStoryUrl:candidate.canonicalStoryUrl,reviewedSourceCommit:c.m.sourceCommit,publicationObservedSourceCommit:c.p.sourceCommit,source:{claim:candidate.claim,sourceIds:[...candidate.sourceIds],evidenceSha256:evidence.evidenceSha256,checkedAt:evidence.checkedAt}};
   const old=c.prior.assets.find(x=>x.path===record.path);
   // A later live deployment observation must not rewrite the archived record.
   if(old){const comparable={...record,publicationObservedSourceCommit:old.publicationObservedSourceCommit};if(!eq(old,comparable))fail('immutable_marketing_metadata_collision');}
   else{
    if(c.tree.has(record.path))fail('unregistered_existing_asset_requires_review');
    // Hosting is a new effect. Recheck the originating adapter's 24h source/tag
    // bounds, rather than relying on an earlier preparation pass. Never redate
    // immutable old records or impose this age rule on exact historical no-ops.
    const checks=[{kind:'source',record:evidence},...candidate.tags.map(tag=>({kind:'tag',record:input.marketing.tagEvidence.get(`${tag.platform}:${tag.handle}`)}))];
    for(const check of checks){
     const checked=instant(check.record?.checkedAt);let deadline=checked+MARKETING_SOURCE_MAX_AGE_MS;
     if(!Number.isFinite(checked)||checked>c.now)fail(`future_or_invalid_new_${check.kind}_evidence`);
     // Policy expiry is independent evidence metadata, never envelope authority.
     if(Object.hasOwn(check.record,'expiresAt')){const explicit=instant(check.record.expiresAt);if(!Number.isFinite(explicit)||explicit<=checked)fail(`invalid_new_${check.kind}_policy_expiry`);deadline=Math.min(deadline,explicit);}
     if(deadline<=c.now)fail(`stale_new_${check.kind}_evidence`);newEvidenceDeadlines.push(deadline);
    }
    records.push(record);
   }
  }
  records.sort((a,b)=>a.path.localeCompare(b.path));
  const manifest={...c.prior,assets:[...c.prior.assets,...records]},text=records.length?JSON.stringify(manifest,null,2)+'\n':trusted.priorManifestText;
  if(text!==null)priorManifest(text); // strict shape/count/byte bounds, no truncation
  const copies=plan.assetCopies.filter(a=>a.action==='copy-new').map(a=>({source:a.source,destination:a.destination,sha256:a.sha256,bytes:a.bytes,mode:'100644'}));
  return freeze({status:records.length?'marketing-hosting-manifest-plan':'marketing-hosting-no-op',manifestPath:MARKETING_HOSTING_MANIFEST_PATH,manifestText:text,manifestSha256:text===null?null:hash(text),manifestBytes:text===null?0:Buffer.byteLength(text),assetCopies:copies,issueId:c.publication.registryId,pdfSha256:c.receipt.artifacts.find(a=>a.role==='pdf').sha256,readerSha256:c.receipt.artifacts.find(a=>a.role==='html').sha256,remainingStoryIds:[...plan.remainingStoryIds],coverageComplete:plan.coverageComplete,expiresAt:new Date(Math.min(c.now+300000,c.until,instant(c.p.expiresAt),instant(c.p.observedAt)+300000,...newEvidenceDeadlines)).toISOString(),effects:[],publishAllowed:false,operational:false,tagAuthority:'none'});
 }catch(e){return freeze({status:'blocked',errors:[e.message],effects:[],publishAllowed:false,operational:false});}
}
/** Independent admission for a separate hosting candidate, NOT daily admission.
 * Candidate tree is a complete actual-byte SHA256 inventory (not Git SHA1 OIDs).
 * Success only admits independent preview review, never public hosting/promotion.
 */
export function evaluateCloudNewsroomV2MarketingHosting(input,trusted){
 try{
  const plan=planCloudNewsroomV2MarketingHosting(input,trusted);if(plan.status==='blocked')return plan;
  const before=treeMap(trusted.priorTree),after=treeMap(input.candidateTree);
  if(plan.status==='marketing-hosting-no-op'){
   if(!eq([...before.values()].sort((a,b)=>a.path.localeCompare(b.path)),[...after.values()].sort((a,b)=>a.path.localeCompare(b.path))))fail('no_op_candidate_mutated');
   return freeze({...plan,status:'marketing-hosting-no-op',promotionAuthorized:false});
  }
  if(!hex(input.candidateCommit,40)||input.candidateCommit===trusted.priorCommit||!eq(input.candidateParents,[trusted.priorCommit])||input.candidateManifestText!==plan.manifestText)fail('exact_hosting_candidate_required');
  const expected=new Map(plan.assetCopies.map(a=>[a.destination,{path:a.destination,mode:'100644',sha256:a.sha256,bytes:a.bytes}]));expected.set(plan.manifestPath,{path:plan.manifestPath,mode:'100644',sha256:plan.manifestSha256,bytes:plan.manifestBytes});
  for(const [path,old]of before){if(!after.has(path))fail('prior_path_deleted');if(path!==plan.manifestPath&&!eq(after.get(path),old))fail('code_archive_or_prior_asset_mutated');}
  for(const [path,e]of after){if(expected.has(path)){if(!eq(e,expected.get(path)))fail('hosted_asset_or_manifest_bytes_mismatch');}else if(!before.has(path))fail('unlisted_hosting_addition');}
  for(const path of expected.keys())if(!after.has(path))fail('required_hosting_output_missing');
  return freeze({status:'eligible-for-marketing-preview-review',proposal:{candidateCommit:input.candidateCommit,priorCommit:trusted.priorCommit,reviewedCodeCommit:trusted.reviewedCodeCommit,manifestPath:plan.manifestPath,manifestSha256:plan.manifestSha256,assetPaths:plan.assetCopies.map(a=>a.destination),issueId:plan.issueId,pdfSha256:plan.pdfSha256,readerSha256:plan.readerSha256,expiresAt:plan.expiresAt},remainingStoryIds:plan.remainingStoryIds,coverageComplete:plan.coverageComplete,effects:[],publishAllowed:false,promotionAuthorized:false,operational:false,tagAuthority:'none',limitations:['Trusted complete trees, publication readbacks, source evidence and reviewed code pin require external authentication.','Public image/route readback and separate promotion approval remain required. This does not authorize Buffer or tags.']});
 }catch(e){return freeze({status:'blocked',errors:[e.message],effects:[],publishAllowed:false,promotionAuthorized:false,operational:false});}
}
