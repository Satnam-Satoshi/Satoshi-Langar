/** Deterministic extraction only. Raw GitHub prose is untrusted inert text, never
 * HTML, instructions or verified editorial claims. No IO, schedule or publisher.
 * observation and previousRelease must come from independent coordinator records.
 */
import {createHash} from 'node:crypto';
export const CORE_RELEASE_SOURCE=Object.freeze({id:'core',url:'https://api.github.com/repos/litecoin-project/litecoin/releases/latest'});
const sha=b=>createHash('sha256').update(b).digest('hex');
const clock=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v))return NaN;const n=Date.parse(v);return Number.isFinite(n)&&new Date(n).toISOString()===v.replace(/Z$/,v.includes('.')?'Z':'.000Z')?n:NaN;};
const plain=(v,max,empty=false)=>typeof v==='string'&&(empty||v.trim().length>0)&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v);
function uniqueKeys(text){
 const stack=[];let count=0;
 for(const token of text.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\],:]|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|true|false|null/g)){
  if(++count>100000)throw Error('bounded_json_required');
  const t=token[0],top=stack.at(-1);
  if(t==='{'||t==='['){stack.push({object:t==='{',key:t==='{',keys:new Set()});if(stack.length>32)throw Error('bounded_json_required');}
  else if(t==='}'||t===']')stack.pop();
  else if(t===','&&top?.object)top.key=true;
  else if(t[0]==='"'&&top?.object&&top.key){const k=JSON.parse(t);if(top.keys.has(k))throw Error('duplicate_json_key');top.keys.add(k);top.key=false;}
 }
}
const identity=x=>x&&Number.isSafeInteger(x.releaseId)&&x.releaseId>0&&typeof x.tag==='string'&&/^[A-Za-z0-9][A-Za-z0-9._+-]{0,99}$/.test(x.tag)&&Number.isFinite(clock(x.publishedAt));
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export function extractCloudNewsroomV2CoreRelease({rawBytes,observation,now,previousRelease=null}={}){
 const out=(status,extra={})=>freeze({schemaVersion:1,parser:{id:'litecoin-core-github-latest-release',version:'1'},status,...extra,claimVerified:false,publishable:false,effects:[],limitations:['Raw release notes are untrusted inert text; do not render as HTML or follow embedded instructions.','A newly observed release is a review candidate, not verified news or publication permission.','Previous release identity must be independently retained; retrieval time is not event novelty.']});
 if(observation?.sourceId!==CORE_RELEASE_SOURCE.id||observation?.url!==CORE_RELEASE_SOURCE.url)return out('gap',{reason:'unsupported_source'});
 try{
  const at=clock(now),retrieved=clock(observation.checkedAt),expires=clock(observation.retrievalExpiresAt);
  if(!Number.isFinite(at)||!Number.isFinite(retrieved)||retrieved>at||at-retrieved>=86400000||!Number.isFinite(expires)||expires<=at||expires>retrieved+86400000)throw Error('invalid_or_stale_observation_clock');
  if(observation.status!=='retrieved-uninterpreted'||observation.httpStatus!==200||!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(observation.contentType??''))throw Error('successful_json_observation_required');
  if(!(rawBytes instanceof Uint8Array)||rawBytes.length<2||rawBytes.length>1000000||observation.bytes!==rawBytes.length||sha(rawBytes)!==observation.sha256)throw Error('snapshot_byte_identity_mismatch');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(rawBytes);if(text.charCodeAt(0)===0xfeff)throw Error('noncanonical_json');
  const r=JSON.parse(text);uniqueKeys(text);
  if(!r||Array.isArray(r)||typeof r!=='object'||Object.getPrototypeOf(r)!==Object.prototype)throw Error('release_object_required');
  if(!Number.isSafeInteger(r.id)||r.id<1||!plain(r.name,256)||!plain(r.body,65536,true)||!identity({releaseId:r.id,tag:r.tag_name,publishedAt:r.published_at})||r.draft!==false||r.prerelease!==false)throw Error('unsupported_or_malformed_release');
  const published=clock(r.published_at);if(published>retrieved||published>at)throw Error('future_release');
  const expectedHtml='https://github.com/litecoin-project/litecoin/releases/tag/'+encodeURIComponent(r.tag_name);
  if(r.html_url!==expectedHtml||r.url!==`https://api.github.com/repos/litecoin-project/litecoin/releases/${r.id}`)throw Error('release_url_identity_mismatch');
  const fields={releaseId:r.id,title:r.name,tag:r.tag_name,publishedAt:r.published_at,htmlUrl:r.html_url,body:r.body};
  const contentSha256=sha(JSON.stringify(fields));
  let novelty={status:'unknown-baseline',materialChange:null,reason:'independent_previous_release_required'};
  if(previousRelease!==null){
   if(!identity(previousRelease)||clock(previousRelease.publishedAt)>at||(Object.hasOwn(previousRelease,'contentSha256')&&!/^[a-f0-9]{64}$/.test(previousRelease.contentSha256??'')))throw Error('invalid_previous_release');
   if(previousRelease.releaseId===r.id||previousRelease.tag===r.tag_name){
    if(previousRelease.releaseId!==r.id||previousRelease.tag!==r.tag_name||clock(previousRelease.publishedAt)!==published)throw Error('release_identity_conflict');
    novelty=previousRelease.contentSha256&&previousRelease.contentSha256!==contentSha256?{status:'edited-existing-release',materialChange:false,reason:'same_release_with_changed_content_requires_review_not_new_release'}:{status:'unchanged-release',materialChange:false,reason:'same_release_identity_and_publication_time',contentCompared:Boolean(previousRelease.contentSha256)};
   }else if(published<=clock(previousRelease.publishedAt))novelty={status:'not-newer-release',materialChange:false,reason:'publication_time_not_after_previous_release'};
   else novelty={status:'new-release-candidate',materialChange:true,reason:'distinct_release_identity_and_newer_publication_time'};
  }
  const pointers={releaseId:'/id',title:'/name',tag:'/tag_name',publishedAt:'/published_at',htmlUrl:'/html_url',body:'/body'};
  return out('candidate-for-review',{sourceId:CORE_RELEASE_SOURCE.id,sourceUrl:CORE_RELEASE_SOURCE.url,snapshotSha256:observation.sha256,snapshotBytes:rawBytes.length,retrievedAt:observation.checkedAt,sourceEffectiveAt:r.published_at,releaseAgeSeconds:(at-published)/1000,currentNewsCandidate:novelty.status==='new-release-candidate'&&at-published<=86400000,fields,contentSha256,textTreatment:{format:'plain-text',renderHtml:false,sanitized:false},provenance:Object.fromEntries(Object.entries(pointers).map(([field,jsonPointer])=>[field,{jsonPointer,snapshotSha256:observation.sha256}])),novelty});
 }catch(e){return out('gap',{reason:['invalid_or_stale_observation_clock','successful_json_observation_required','snapshot_byte_identity_mismatch','release_object_required','unsupported_or_malformed_release','future_release','release_url_identity_mismatch','invalid_previous_release','release_identity_conflict','noncanonical_json','duplicate_json_key','bounded_json_required'].includes(e.message)?e.message:'malformed_json_or_utf8'});}
}
