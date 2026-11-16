import { checkTrustedSourcePolicies } from './cloud-newsroom-v2-source-policy.mjs';
/** Pure data-diff boundary. NEVER deployment/promotion admission or an effect runner.
 * The second argument is supplied by the trusted coordinator, NOT by a candidate
 * bundle. Caller must independently bind full trees/registry bytes/receipt to
 * provider observations. This module does not authenticate those observations,
 * fence provider writes, inspect HTML scripts, render files, or access a network.
 */
import { createHash } from 'node:crypto';
import { validatePdfRegistry } from './lib/ltc-pdf-registry.mjs';
import { projectReceiptToPdfRegistry } from './lib/ltc-pdf-receipt.mjs';
export const PDF_REGISTRY_PATH = 'content/ltc-pdf/issues.json';
const roles = ['pdf', 'html', 'cover', 'promo'];
const scalar=v=>['string','boolean','number'].includes(typeof v)&&(typeof v!=='number'||Number.isFinite(v))&&(typeof v!=='string'||v.trim().length>0);
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const match = (r, v) => typeof v === 'string' && r.test(v);
const sha = v => match(/^[a-f0-9]{64}$/, v), commit = v => match(/^[a-f0-9]{40}$/, v);
const day = v => match(/^\d{4}-\d{2}-\d{2}$/, v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
const time = v => typeof v === 'string' && day(v.slice(0,10)) && Number(v.slice(11,13)) < 24 && Number(v.slice(14,16)) < 60 && Number(v.slice(17,19)) < 60 && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(v) ? Date.parse(v) : NaN;
const sourceTime = v => day(v) ? Date.parse(v+'T00:00:00Z') : time(v);
const canonical = v => Array.isArray(v) ? '['+v.map(canonical).join(',')+']' : obj(v) ? '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}' : JSON.stringify(v);
const equal = (a,b) => canonical(a) === canonical(b);
const digest = s => createHash('sha256').update(s).digest('hex');
const freeze = v => { if (obj(v)||Array.isArray(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const sameEntry = (a,b) => !!a && !!b && a.mode === b.mode && a.sha256 === b.sha256 && a.bytes === b.bytes;
function nyDay(ms) { const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(ms).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`; }
function safePath(p) { return typeof p === 'string' && p.length <= 500 && /^[a-zA-Z0-9_./@+\[\]-]+$/.test(p) && !p.startsWith('/') && p.split('/').every(x=>x!==''&&x!=='.'&&x!=='..'&&x.toLowerCase()!=='.git'); }
function treeMap(entries, label, fail) {
  const map=new Map(), folded=new Set();
  if(!Array.isArray(entries)||entries.length===0){fail(`invalid_${label}_tree`);return map;}
  for(const e of entries){
    if(!obj(e)||!safePath(e.path)||e.mode!=='100644'||!sha(e.sha256)||!Number.isSafeInteger(e.bytes)||e.bytes<0){fail(`invalid_${label}_entry`);continue;}
    if(map.has(e.path)||folded.has(e.path.toLowerCase())){fail(`duplicate_${label}_path`);continue;}
    map.set(e.path,e);folded.add(e.path.toLowerCase());
  }
  for(const p of map.keys()){const parts=p.split('/');for(let i=1;i<parts.length;i++)if(map.has(parts.slice(0,i).join('/')))fail(`${label}_file_directory_collision`);}
  return map;
}
function parseRegistry(text, tree, label, legacyRouteIds, fail) {
  if(typeof text!=='string'||Buffer.byteLength(text)>1024*1024){fail(`invalid_${label}_registry_text`);return null;}
  const entry=tree.get(PDF_REGISTRY_PATH);
  if(!entry||entry.sha256!==digest(text)||entry.bytes!==Buffer.byteLength(text)){fail(`${label}_registry_tree_mismatch`);return null;}
  try{const raw=JSON.parse(text);if(!obj(raw)||Object.keys(raw).sort().join(',')!=='current,issues,schemaVersion')throw Error();return validatePdfRegistry(raw,{legacyRouteIds});}
  catch{fail(`invalid_${label}_registry`);return null;}
}
/** input={now,candidateCommit,candidateParents,candidateTree,candidateRegistryText,receipt}
 * trusted={priorCommit,priorTree,currentRegistryText,legacyRouteIds,priorArtifactInventory,
 * review:{sourceCommit,implementationCommit,implementationSha256,notBefore,expiresAt,invariantTree}}
 * Trees are complete file inventories with content SHA256+byte counts+Git mode,
 * NOT Git blob SHA1. Prior artifact inventory is externally trusted accepted-v2
 * receipt history: exactly4 roles per issue, each with issueId/path/mode/hash/bytes.
 */
export function evaluateCloudNewsroomV2DataAdmission(input, trusted) {
  const errors=[],fail=code=>{if(!errors.includes(code))errors.push(code);};
  const finish=proposal=>freeze({status:errors.length?'blocked':'eligible-for-preview-review',errors,proposal:errors.length?null:proposal,effects:[],promotionAuthorized:false,
    limitations:['Trusted pin, inventory, complete trees and ingestion receipt require independent caller authentication and provider binding.','Provider fencing and action-time production comparison are absent. This is not deployment or promotion permission.','Artifact content/rendering and HTML active-content review remain separate preview requirements.']});
  if(!obj(input)||!obj(trusted)||!obj(trusted.review)){fail('external_trust_context_required');return finish(null);}
  const review=trusted.review,now=time(input.now),from=time(review.notBefore),until=time(review.expiresAt);
  if(!Number.isFinite(now)||!Number.isFinite(from)||!Number.isFinite(until)||from>now||until<=now||until<=from)fail('review_window_invalid_or_expired');
  if(!commit(review.sourceCommit)||!commit(review.implementationCommit)||!sha(review.implementationSha256))fail('invalid_reviewed_code_pin');
  if(!commit(trusted.priorCommit)||!commit(input.candidateCommit)||input.candidateCommit===trusted.priorCommit||!Array.isArray(input.candidateParents)||input.candidateParents.length!==1||input.candidateParents[0]!==trusted.priorCommit)fail('candidate_parent_or_commit_mismatch');
  if(!Array.isArray(trusted.legacyRouteIds)||trusted.legacyRouteIds.some(x=>typeof x!=='string'))fail('trusted_legacy_route_inventory_required');
  const prior=treeMap(trusted.priorTree,'prior',fail),candidate=treeMap(input.candidateTree,'candidate',fail),invariants=treeMap(review.invariantTree,'invariant',fail);
  const current=parseRegistry(trusted.currentRegistryText,prior,'prior',trusted.legacyRouteIds??[],fail),next=parseRegistry(input.candidateRegistryText,candidate,'candidate',trusted.legacyRouteIds??[],fail);
  const inventory=trusted.priorArtifactInventory,exempt=new Map();
  if(!Array.isArray(inventory))fail('trusted_prior_artifact_inventory_required');
  else if(current){
    const groups=new Map();
    for(const e of inventory){
      const issue=obj(e)?current.issues.find(x=>x.id===e.issueId):null;
      if(!issue||!roles.includes(e.role)||e.mode!=='100644'||!sha(e.sha256)||!Number.isSafeInteger(e.bytes)||e.bytes<1){fail('invalid_trusted_artifact_inventory');continue;}
      const base=`public/magazine/daily/${issue.date}/r${issue.revision}/`,suffix=e.role==='pdf'?'edition.pdf':e.role==='html'?'reader.html':e.role==='cover'?'cover.png':typeof e.path==='string'&&/^promo\.(png|jpg|webp)$/.test(e.path.slice(base.length))?e.path.slice(base.length):null;
      if(!suffix||e.path!==base+suffix||issue.pdf!==('/'+base.slice(7)+'edition.pdf')||issue.cover!==('/'+base.slice(7)+'cover.png')){fail('artifact_inventory_not_canonical_issue_paths');continue;}
      const group=groups.get(e.issueId)??new Set();if(group.has(e.role)||exempt.has(e.path))fail('duplicate_trusted_artifact_inventory');group.add(e.role);groups.set(e.issueId,group);exempt.set(e.path,e);
      if(!sameEntry(e,prior.get(e.path)))fail('prior_artifact_inventory_tree_mismatch');
      if(e.role==='pdf'&&(e.sha256!==issue.sha256||e.bytes!==issue.bytes)||e.role==='cover'&&(e.sha256!==issue.coverSha256||e.bytes!==issue.coverBytes))fail('prior_artifact_inventory_registry_mismatch');
    }
    for(const group of groups.values())if(group.size!==4)fail('incomplete_prior_artifact_inventory');
  }
  // Baseline code/assets remain pinned. Only independently inventoried NEW-v2
  // prior assets are excluded, so daily appends never broaden the code allowlist.
  const requiredInvariants=[...prior.keys()].filter(p=>p!==PDF_REGISTRY_PATH&&!exempt.has(p)).sort();
  if(!equal([...invariants.keys()].sort(),requiredInvariants))fail('invariant_tree_coverage_mismatch');
  for(const [p,e]of invariants)if(!sameEntry(e,prior.get(p))||!sameEntry(e,candidate.get(p)))fail('reviewed_invariant_changed');
  for(const [p,e]of prior){if(!candidate.has(p))fail('prior_path_deleted');else if(p!==PDF_REGISTRY_PATH&&!sameEntry(e,candidate.get(p)))fail('prior_file_or_mode_mutated');}
  if(current)for(const issue of current.issues)for(const [p,hash,bytes]of [[issue.pdf,issue.sha256,issue.bytes],[issue.cover,issue.coverSha256,issue.coverBytes]]){
    const entry=prior.get('public'+p);if(!entry||entry.sha256!==hash||entry.bytes!==bytes)fail('prior_registered_asset_tree_mismatch');
  }
  const receipt=input.receipt,m=receipt?.validation?.manifest;
  for(const error of checkTrustedSourcePolicies({sources:m?.sources,now:input.now,trustedSourcePolicies:trusted.trustedSourcePolicies,trustedEvidence:trusted.trustedEvidence}).errors)fail(error);
  const html=Array.isArray(receipt?.artifacts)?receipt.artifacts.filter(a=>a?.role==='html'):[],h=html[0]?.htmlSafety;
  if(html.length!==1||html[0]?.verification!=='actual-local-file-bytes'||!obj(h)||Object.keys(h).sort().join(',')!=='profile,resourceFetchesAllowed,sanitized,status'||h.status!=='accepted-inert-subset'||h.profile!=='ltc-inert-html-v1'||h.sanitized!==false||h.resourceFetchesAllowed!==false)fail('verified_inert_html_profile_required');
  if(!obj(receipt)||receipt.status!=='accepted-receipt'||receipt.operational!==false||!Array.isArray(receipt.effects)||receipt.effects.length||!Array.isArray(receipt.errors)||receipt.errors.length||receipt.validation?.status!=='validated-description'||!m||!Array.isArray(receipt.validation.errors)||receipt.validation.errors.length)fail('accepted_ingestion_receipt_required');
  if(!m||m.sourceCommit!==review.sourceCommit||m.implementationCommit!==review.implementationCommit||m.implementationSha256!==review.implementationSha256)fail('receipt_reviewed_pin_mismatch');
  if(!m||!day(m.editionDate)||Number.isFinite(now)&&m.editionDate!==nyDay(now)||!Number.isFinite(time(m.preparedAt))||time(m.preparedAt)>now)fail('receipt_edition_clock_mismatch');
  if(!Array.isArray(m?.sources)||!m.sources.length)fail('receipt_source_evidence_required');
  else for(const s of m.sources){
    const checked=time(s?.retrievedAt),age=s?.maxRetrievalAgeSeconds;
    if(!obj(s)||!Number.isFinite(checked)||checked>now||!Number.isSafeInteger(age)||age<=0||age>86400||now-checked>age*1000)fail('receipt_evidence_expired');
    if(!['verified','unavailable'].includes(s?.status)||!['current','historical'].includes(s?.classification)||s.status==='verified'&&(s.claimVerified!==true||!scalar(s.value))||s.status==='unavailable'&&s.value!==null)fail('receipt_unsupported_source_value');
    for(const field of ['publishedAt','eventAt','effectiveAt'])if(s?.[field]!==null&&(!Number.isFinite(sourceTime(s?.[field]))||sourceTime(s[field])>now||sourceTime(s[field])>checked))fail('receipt_source_date_invalid');
    if(s?.classification==='historical'&&(s.label!=='Dated historical observation; not current'||s.effectiveAt===null))fail('receipt_historical_label_invalid');
    if(s?.status==='verified'&&s.classification==='current'){
      const at=sourceTime(s.effectiveAt),max=s.maxEffectiveAgeSeconds;
      if(!Number.isFinite(at)||at>now||!Number.isSafeInteger(max)||max<=0||max>86400||now-at>max*1000)fail('receipt_current_value_stale');
    }
  }
  let projection;
  if(current&&next&&m){try{
    projection=projectReceiptToPdfRegistry(current,receipt);
    if(current.issues.some(x=>x.id===projection.issue.id))fail('existing_daily_identity_not_new');
    if(next.issues.length!==current.issues.length+1||!equal(next,projection.registry))fail('registry_not_exact_append_only_projection');
    for(const old of current.issues)if(!equal(old,next.issues.find(x=>x.id===old.id)))fail('historical_registry_record_mutated');
    const allowed=new Map(projection.assetCopies.map(a=>[a.destination,a]));
    if(allowed.size!==4||projection.assetCopies.length!==4)fail('exactly_four_new_artifacts_required');
    const added=[...candidate.keys()].filter(p=>!prior.has(p)).sort();
    if(!equal(added,[...allowed.keys()].sort()))fail('candidate_addition_allowlist_mismatch');
    for(const [p,a]of allowed){const actual=candidate.get(p);if(prior.has(p)||!actual||actual.mode!=='100644'||actual.sha256!==a.sha256||actual.bytes!==a.bytes)fail('new_artifact_tree_mismatch');}
  }catch{fail('receipt_registry_projection_failed');}}
  return finish({candidateCommit:input.candidateCommit,priorCommit:trusted.priorCommit,reviewedSourceCommit:review.sourceCommit,expiresAt:review.expiresAt,registryPath:PDF_REGISTRY_PATH,
    registrySha256:candidate.get(PDF_REGISTRY_PATH)?.sha256,issueId:projection?.issue.id,artifactPaths:projection?.assetCopies.map(x=>x.destination)??[],nextStep:'independent-preview-review-only'});
}
