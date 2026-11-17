import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,openSync,closeSync,unlinkSync,existsSync,fsyncSync} from 'node:fs';
const hash=x=>createHash('sha256').update(typeof x==='string'||x instanceof Uint8Array?x:JSON.stringify(x)).digest('hex');
const fail=x=>{throw Error(x);};
const clone=x=>JSON.parse(JSON.stringify(x));
const platforms=['X','Instagram'];
// Exact public hosting boundary; no normalization of attacker-supplied spellings.
function canonicalPublicUrl(value,kind){
 if(typeof value!=='string'||value.length>2048||/[\s\\%]/.test(value))return false;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='ltcmagazine.org'||u.username||u.password||u.port||u.search||u.href!==value||!value.startsWith('https://ltcmagazine.org/'))return false;
 if(!/^\/[A-Za-z0-9_./-]+$/.test(u.pathname)||u.pathname.includes('//')||u.pathname.split('/').some(p=>p==='.'||p==='..'))return false;
 if(kind==='media')return u.pathname.startsWith('/magazine/')&&u.pathname.endsWith('.png')&&!u.hash;
 return u.pathname.startsWith('/conversations/')&&u.pathname.endsWith('/')&&(!u.hash||/^#[A-Za-z0-9_-]+$/.test(u.hash));
 }catch{return false;}
}
const key=(s,p)=>`${s.issueId}|${s.storyId}|${s.contentSha256}|${p}`;
const date=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const fresh=(at,now)=>Number.isFinite(Date.parse(at))&&Date.parse(at)<=now&&now-Date.parse(at)<=60000;
export function reconcileBacklog(previous,stories){
 const state=previous?clone(previous):{schema:1,revision:0,entries:[],effects:[],operational:false};
 if(state.schema!==1||state.operational!==false||new Set(state.entries.map(e=>e.key)).size!==state.entries.length)fail('invalid-backlog');
 const seen=new Set();
 for(const s of stories){if(!s.issueId||!s.storyId||!/^[a-f0-9]{64}$/.test(s.contentSha256))fail('story-identity');for(const p of platforms){const k=key(s,p);if(seen.has(k))fail('duplicate-story');seen.add(k);if(!state.entries.some(e=>e.key===k))state.entries.push({key:k,issueId:s.issueId,storyId:s.storyId,contentSha256:s.contentSha256,platform:p,status:'pending',reason:'awaiting-verified-package'});}}
 // Never discard omitted, superseded, held, or previously sent stories.
 for(const e of state.entries)if(!seen.has(e.key)&&['pending','held'].includes(e.status)){e.status='held';e.reason='not-in-current-outline-review-required';}
 state.revision++;return state;
}
/** Pure root review composition. Does not call Buffer, approve itself or mark anything sent. */
export function compose(state,{packages,queue,controls,slots,evidenceBlobs=new Map(),now=Date.now(),limit=2}){
 if(!(packages instanceof Map)||!Number.isInteger(limit)||limit<1||limit>2)fail('inputs');
 const next=clone(state),requests=[],blocked=[];
 const block=(e,reason)=>{e.reason=reason;blocked.push({key:e.key,reason});};
 if(!queue||!Array.isArray(queue.posts)||!fresh(queue.checkedAt,now)||!queue.complete) return {state:next,requests,blocked:[{reason:'fresh-complete-queue-required'}],effects:[]};
 for(const p of queue.posts){
  if(!platforms.includes(p.platform)||!p.channelId||p.channelId!==controls?.channels?.[p.platform]?.id||!Number.isFinite(Date.parse(p.dueAt??p.sentAt)))return {state:next,requests,blocked:[{reason:'invalid-queue-record-reconcile'}],effects:[]};
 }
 for(const e of next.entries){
  if(e.status!=='pending')continue;
  if(requests.length>=limit){block(e,'next-bounded-batch');continue;}
  if(!controls||controls.writer!=='root'||!controls.authorityRef||!fresh(controls.checkedAt,now)||!controls.enabled||controls.paused||controls.websitePaused&&!(controls.exception?.issueIds?.includes(e.issueId)&&Number.isFinite(Date.parse(controls.exception?.expiresAt))&&Date.parse(controls.exception.expiresAt)>now&&Number.isFinite(Date.parse(controls.exception?.startsAt))&&Date.parse(controls.exception.startsAt)<=now&&controls.exception.authorityRef===controls.authorityRef)){block(e,'root-authority-or-stop');continue;}
  if(next.entries.some(r=>r.status==='uncertain'&&r.platform===e.platform)){block(e,'unresolved-platform-attempt');continue;}
  if(queue.posts.some(p=>p.key===e.key)){block(e,'existing-buffer-record-reconcile');continue;}
  const p=packages.get(e.key);
  if(!p||p.key!==e.key||p.contentSha256!==e.contentSha256||p.issueId!==e.issueId||p.storyId!==e.storyId||p.platform!==e.platform||!canonicalPublicUrl(p.storyUrl,'story')||!p.text?.includes(p.storyUrl)||p.contentHash!==hash(p.text)){block(e,'verified-package-required');continue;}
  if(p.review?.contentHash!==p.contentHash||p.review?.status!=='approved'||!fresh(p.review?.checkedAt,now)||!Number.isFinite(Date.parse(p.review?.expiresAt))||Date.parse(p.review.expiresAt)<=now||!(evidenceBlobs.get(p.review?.sourceSnapshotSha256) instanceof Uint8Array)||hash(evidenceBlobs.get(p.review.sourceSnapshotSha256))!==p.review.sourceSnapshotSha256||!p.review?.evidenceRef||!p.review?.sourceSnapshotSha256||p.asset?.qa!=='passed'||p.asset?.httpStatus!==200||!fresh(p.asset?.checkedAt,now)||!canonicalPublicUrl(p.asset?.url,'media')||! /^[a-f0-9]{64}$/.test(p.asset?.sha256)||p.asset?.bytes<1||p.asset?.width!==1080||p.asset?.height!==1350){block(e,'review-or-live-media-required');continue;}
  const mentions=p.text.match(/@[A-Za-z0-9_.]+/g)??[];
  if(mentions.length>3||(p.text.match(/#[\p{L}\p{N}_]+/gu)??[]).length>3||mentions.some(h=>!p.tags?.some(t=>t.handle===h&&t.platform===e.platform&&t.evidenceSha256&&t.officialSourceUrl&&t.linkedTarget&&fresh(t.checkedAt,now)&&p.review.tagEvidenceHashes?.includes(t.evidenceSha256)&&evidenceBlobs.get(t.evidenceSha256) instanceof Uint8Array&&hash(evidenceBlobs.get(t.evidenceSha256))===t.evidenceSha256&&new TextDecoder().decode(evidenceBlobs.get(t.evidenceSha256)).includes(t.linkedTarget)&&(()=>{try{const u=new URL(t.linkedTarget);return u.protocol==='https:'&&(e.platform==='X'?['x.com','twitter.com']:['instagram.com']).includes(u.hostname)&&u.pathname.replace(/^\/|\/$/g,'').toLowerCase()===h.slice(1).toLowerCase();}catch{return false;}})()))||mentions.length&&!controls.allowVerifiedTags){block(e,'tags-not-authorized-or-verified');continue;}
  // All story promotions are routine invitations. Never relabel as policy to evade cadence.
  const channel=controls.channels?.[e.platform];if(!channel?.id||channel?.verifiedIdentity!==(e.platform==='X'?'Ltcmagazineorg':'ltcmagazine')){block(e,'channel-identity');continue;}
  const slot=slots?.find(t=>Date.parse(t)>now&&Date.parse(t)<Date.parse(p.review.expiresAt)&&(!controls.websitePaused||Date.parse(t)<Date.parse(controls.exception.expiresAt))&&!queue.posts.some(p=>p.platform===e.platform&&date(p.dueAt??p.sentAt)===date(t))&&!next.entries.some(r=>r.platform===e.platform&&['reserved','uncertain','scheduled','published'].includes(r.status)&&r.dueAt&&date(r.dueAt)===date(t)));
  if(!slot){block(e,'cadence-no-slot');continue;}
  const request={channelId:channel.id,schedulingType:'automatic',mode:'customScheduled',dueAt:slot,text:p.text,assets:[{image:{url:p.asset.url,metadata:{altText:p.asset.alt}}}],metadata:e.platform==='X'?{twitter:{isAiGenerated:true}}:{instagram:{type:'post',shouldShareToFeed:true,isAiGenerated:true}}};
  const requestHash=hash(request);Object.assign(e,{status:'reserved',reason:'root-review-required',dueAt:slot,requestHash,contentHash:p.contentHash,assetSha256:p.asset.sha256,authorityRef:controls.authorityRef});requests.push({key:e.key,requestHash,request,executeAllowed:false});
 }
 next.revision++;return {state:next,requests,blocked,effects:[],operational:false};
}
export function recordAttempt(state,k,requestHash){const n=clone(state),e=n.entries.find(e=>e.key===k);if(!e||e.status!=='reserved'||e.requestHash!==requestHash)fail('reservation-required');e.status='uncertain';e.reason='reconcile-before-any-retry';n.revision++;return n;}
export function reconcileReceipt(state,k,receipt){const n=clone(state),e=n.entries.find(e=>e.key===k);if(!e||!['uncertain','scheduled'].includes(e.status))fail('attempt-required');if(!receipt||receipt.requestHash!==e.requestHash||!receipt.postId||(e.postId&&receipt.postId!==e.postId)||receipt.contentHash!==e.contentHash||receipt.dueAt!==e.dueAt||!['scheduled','published'].includes(receipt.status))fail('exact-readback-required');if(receipt.status==='published'&&!/^https:\/\//.test(receipt.publicUrl??''))fail('public-readback-required');Object.assign(e,{status:receipt.status,postId:receipt.postId,reason:'verified-readback',...(receipt.publicUrl?{publicUrl:receipt.publicUrl}:{})});n.revision++;return n;}
/** Local nonproduction journal only. Caller selects isolated path; compare-and-swap fails closed.
 * Lock leftovers require manual inspection, never automatic stale-lock removal. */
export function persistPrivate(path,state,expectedRevision,{bootstrap=null,now=Date.now()}={}){
 if(!state||state.schema!==1||state.operational!==false||!Array.isArray(state.effects)||state.effects.length||!Number.isSafeInteger(state.revision)||state.revision<1||!Array.isArray(state.entries)||state.entries.length>10000||JSON.stringify(state).length>10*1024*1024||new Set(state.entries.map(e=>e.key)).size!==state.entries.length||state.entries.some(e=>!e||typeof e.key!=='string'||!e.key||e.key.length>1000||!platforms.includes(e.platform)||!['pending','held','reserved','uncertain','scheduled','published'].includes(e.status)))fail('invalid-journal-state');
 if(expectedRevision!==null&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<1||state.revision<=expectedRevision))fail('strict-revision-progression-required');
 const lock=path+'.lock',fd=openSync(lock,'wx');let tmp;
 try{const old=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null;if(!old&&(expectedRevision!==null||bootstrap?.priorState!=='independently-verified-never-created'||bootstrap?.path!==path||!bootstrap?.authorityRef||!fresh(bootstrap?.checkedAt,now)))fail('verified-bootstrap-required');if((old?.revision??null)!==expectedRevision)fail('journal-conflict');tmp=path+'.new';const out=openSync(tmp,'wx',0o600);try{writeFileSync(out,JSON.stringify(state,null,2));fsyncSync(out);}finally{closeSync(out);}renameSync(tmp,path);tmp=null;const parent=openSync(dirname(path),'r');try{fsyncSync(parent);}finally{closeSync(parent);}return {sha256:hash(readFileSync(path,'utf8')),durability:'local-file-and-directory-fsync',externalDurable:false};}finally{closeSync(fd);unlinkSync(lock);}
}
export {hash};
