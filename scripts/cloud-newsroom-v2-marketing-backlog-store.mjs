import {createHash} from 'node:crypto';
export const MARKETING_BACKLOG_SCOPE=Object.freeze({repository:'Satnam-Satoshi/Satoshi-Langar',branch:'agent/cloud-newsroom-v2-state',generation:'cloud-newsroom-v2-marketing-backlog',prefix:'state/marketing-backlog/',maxBytes:1048576});
const S=MARKETING_BACKLOG_SCOPE,hex=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const issue=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}-r[1-9]\d*$/.test(v)||new Date(v.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==v.slice(0,10))throw Error('invalid_backlog_issue');return v;};
const blob=text=>createHash('sha1').update(`blob ${new TextEncoder().encode(text).length}\0`).update(text).digest('hex');
function payload(result){if(result?.structuredContent)return result.structuredContent.result??result.structuredContent;const blocks=result?.content?.filter(b=>b.type==='text')??[];if(blocks.length!==1)throw Error('unknown_connector_result');try{const p=JSON.parse(blocks[0].text);return p.result??p;}catch{throw Error('unknown_connector_result');}}
const code=(result,p)=>result?.isError===true?(p?.error?.status??p?.error?.code??p?.status??p?.code??p?.error_code):null;
function safe(value,depth=0){
 if(depth>25)throw Error('backlog_depth_limit');if(value===null||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isSafeInteger(value)||value<0)throw Error('unsafe_backlog_number');return;}
 if(typeof value==='string'){if(value.length>10000||/[\u0000-\u001f\u007f]/.test(value)||/(?:libfile[_-]|file_[A-Za-z0-9]|libdir[_-]|Bearer\s|Basic\s|(?:cookie|token|password|secret)\s*[:=])/i.test(value))throw Error('private_backlog_value');for(const m of value.matchAll(/https?:\/\/[^\s"<>]+/g)){const u=new URL(m[0]);if(u.protocol!=='https:'||u.username||u.password||u.search||(u.hash&&!/^#story-\d{4}-\d{2}-\d{2}-r[1-9]\d*(?:-\d+)+$/.test(u.hash))||u.href!==m[0]||/^(?:drive\.google\.com|chatgpt\.com)$/.test(u.hostname))throw Error('private_backlog_url');}return;}
 if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype&&!Array.isArray(value))throw Error('nonplain_backlog_value');
 for(const [key,descriptor]of Object.entries(Object.getOwnPropertyDescriptors(value))){if(Array.isArray(value)&&key==='length')continue;if(!descriptor.enumerable||descriptor.get||descriptor.set||/token|cookie|authorization|secret|password|credential|buffer.?id|file.?id|locator|private|download.?url|channel.?id|post.?id/i.test(key))throw Error('private_backlog_field');safe(descriptor.value,depth+1);}
 if(Object.getOwnPropertySymbols(value).length||Array.isArray(value)&&Object.keys(value).length!==value.length)throw Error('noncanonical_backlog_value');
}
const keys=(v,allowed)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('backlog_unknown_field');};
const hash64=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function serialize(issueId,value){
 safe(value);keys(value,['schemaVersion','generation','binding','stories']);
 if(value.generation!==S.generation||value.binding?.issueId!==issueId||value.schemaVersion!==1)throw Error('backlog_identity_mismatch');
 const b=value.binding;keys(b,['issueId','pdfSha256','readerSha256','canonicalUrl','outlineSha256']);
 const [date,revision]=issueId.split('-r'),canonical=`https://ltcmagazine.org/conversations/editions/${date}${revision==='1'?'':`-r${revision}`}/`;
 if(!['pdfSha256','readerSha256','outlineSha256'].every(k=>hash64(b[k]))||b.canonicalUrl!==canonical)throw Error('backlog_binding_shape');
 if(!value.stories||Array.isArray(value.stories)||typeof value.stories!=='object'||Object.keys(value.stories).length>500)throw Error('backlog_story_limit');
 for(const [id,r]of Object.entries(value.stories)){
  keys(r,['storyId','nodePath','contentSha256','canonicalStoryUrl','stage','reason','inputSha256','sourceEvidenceSha256','tagsSha256','asset','posts','hostingProofSha256','hostedAt','preparationExpiresAt']);
  if(!/^\d+(?:\.\d+)*$/.test(r.nodePath)||id!==`story-${issueId}-${r.nodePath.replaceAll('.','-')}`||r.storyId!==id||!hash64(r.contentSha256)||r.canonicalStoryUrl!==canonical+'#'+id||!['waiting-evidence','ready-to-render','rendered','hosted'].includes(r.stage)||![null,'editorial-selection-missing','source-evidence-missing','next-bounded-batch','existing-asset-needs-verified-readback'].includes(r.reason)||!['inputSha256','sourceEvidenceSha256','tagsSha256'].every(k=>r[k]===null||hash64(r[k]))||r.hostingProofSha256!==undefined&&!hash64(r.hostingProofSha256))throw Error('backlog_story_shape');
  if(r.preparationExpiresAt===null?r.stage!=='waiting-evidence':typeof r.preparationExpiresAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(r.preparationExpiresAt)||!Number.isFinite(Date.parse(r.preparationExpiresAt)))throw Error('backlog_preparation_expiry');
  if(r.hostedAt!==undefined&&(typeof r.hostedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(r.hostedAt)||!Number.isFinite(Date.parse(r.hostedAt))))throw Error('backlog_hosted_timestamp');
  if(r.asset!==null){keys(r.asset,['path','sha256','bytes']);if(r.asset.path!==`/magazine/${issueId}/marketing/${id}.png`||!hash64(r.asset.sha256)||!Number.isSafeInteger(r.asset.bytes)||r.asset.bytes<1||r.asset.bytes>5*1024*1024)throw Error('backlog_asset_shape');}
  keys(r.posts,['X','Instagram']);for(const [platform,p]of Object.entries(r.posts)){
   keys(p,['status','idempotencyKey','channelSha256','messageSha256','policyApprovalSha256','attemptId','assetSha256','publicUrl','providerReceiptSha256']);
   if(!['external-intent','confirmed'].includes(p.status)||!['idempotencyKey','channelSha256','messageSha256','policyApprovalSha256','attemptId','assetSha256'].every(k=>hash64(p[k])))throw Error('backlog_post_shape');
   if(p.status==='confirmed'){const u=new URL(p.publicUrl);if(!hash64(p.providerReceiptSha256)||u.protocol!=='https:'||u.search||u.hash||u.username||u.password||u.port||(platform==='X'?!['x.com','twitter.com'].includes(u.hostname)||!/^\/[^/]+\/status\/\d+$/.test(u.pathname):u.hostname!=='www.instagram.com'||!/^\/(p|reel)\/[^/]+\/?$/.test(u.pathname)))throw Error('backlog_public_post_shape');}
   else if(p.publicUrl!==undefined||p.providerReceiptSha256!==undefined)throw Error('backlog_unconfirmed_post_fields');
  }
 }
 const text=JSON.stringify(value)+'\n';if(new TextEncoder().encode(text).length>S.maxBytes)throw Error('backlog_size_limit');return text;
}
/** Inject authenticated GitHub wrappers and a SEPARATE durable atomic inventory.
 * inventory.claimIssue(issueId) must persist ownership before returning created:true;
 * it must never recreate a missing entry after state loss. It is not this file.
 * No remote effects by default. No branch creation. Unknown writes are NOT retried;
 * callers must reconcile durable state before constructing a replacement adapter.
 */
export function createCloudNewsroomV2MarketingBacklogStore({tools,inventory,allowMutations=false}){
 if(!['githubFetchFile','githubCreateFile','githubUpdateFile'].every(k=>typeof tools?.[k]==='function')||typeof inventory?.claimIssue!=='function')throw Error('explicit_backlog_adapters_required');
 const tickets=new Set(),busy=new Set(),uncertain=new Set();const mutate=()=>{if(allowMutations!==true)throw Error('backlog_mutations_disabled');};
 const read=async issueId=>{issue(issueId);const r=await tools.githubFetchFile({repository_full_name:S.repository,ref:S.branch,path:S.prefix+issueId+'.json',encoding:'utf-8'}),p=payload(r),c=code(r,p);if(c===404||c==='NOT_FOUND')return{version:null,value:null};if(r?.isError||p.error||p.error_code||p.encoding!=='utf-8'||typeof p.content!=='string'||!hex(p.sha)||new TextEncoder().encode(p.content).length>S.maxBytes||blob(p.content)!==p.sha)throw Error('invalid_backlog_read');const value=JSON.parse(p.content);serialize(issueId,value);return{version:p.sha,value};};
 return Object.freeze({read,async claimIssue(issueId){issue(issueId);mutate();if(busy.has(issueId)||tickets.has(issueId)||uncertain.has(issueId))throw Error('backlog_issue_busy_or_uncertain');busy.add(issueId);try{const claimed=await inventory.claimIssue(issueId);if(typeof claimed?.created!=='boolean')throw Error('unknown_inventory_claim');if(claimed.created)tickets.add(issueId);return{created:claimed.created};}finally{busy.delete(issueId);}},async cas(issueId,version,value){
  issue(issueId);mutate();const content=serialize(issueId,value);if(version!==null&&!hex(version))throw Error('invalid_backlog_version');if(busy.has(issueId)||uncertain.has(issueId))throw Error('backlog_issue_busy_or_uncertain');if(version===null&&!tickets.has(issueId))throw Error('fresh_durable_claim_required');
  busy.add(issueId);if(version===null)tickets.delete(issueId);let attempted=false;
  try{
   const args={repository_full_name:S.repository,branch:S.branch,path:S.prefix+issueId+'.json',content,message:'Cloud newsroom v2 marketing backlog transition'};attempted=true;
   const r=await(version===null?tools.githubCreateFile(args):tools.githubUpdateFile({...args,sha:version})),p=payload(r),c=code(r,p);
   if(c===409||c==='CONFLICT')return{ok:false,version:null};
   if(r?.isError||p.error||p.error_code||!hex(p.commit_sha)||version!==null&&p.content_sha!==blob(content))throw Error('backlog_write_uncertain');
   const observed=await read(issueId);if(observed.version!==blob(content)||JSON.stringify(observed.value)+'\n'!==content)throw Error('backlog_write_readback_mismatch');
   return{ok:true,version:observed.version};
  }catch{if(attempted)uncertain.add(issueId);throw Error('backlog_write_unconfirmed_no_retry');}finally{busy.delete(issueId);}
 }});
}
