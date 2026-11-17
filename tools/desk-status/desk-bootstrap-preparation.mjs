/** Separate bootstrap preparation only. A supplied review record is not user
 * approval and this function cannot authorize writes or activate a publisher. */
import {createHash} from 'node:crypto';
import {DESK_MODULE_PATH,deskTreeInventorySha256} from './desk-data-admission.mjs';
const empty='{"records":[],"schemaVersion":1}';
const sha=b=>createHash('sha256').update(b).digest('hex');
const clock=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,19)===s.slice(0,19)?Date.parse(s):NaN;
export function prepareDeskBootstrap({now,observation,reviewedEmptyModuleBytes,independentReview}={}){
 const fail=m=>{throw Error('Desk bootstrap: '+m);},at=clock(now),review=independentReview;
 if(!Number.isFinite(at)||!review||review.scope!=='prepare-empty-desk-module-only'||!/^review-[a-z0-9-]{1,100}$/.test(review.id??'')||!Number.isFinite(clock(review.notBefore))||!Number.isFinite(clock(review.expiresAt))||clock(review.notBefore)>at||clock(review.expiresAt)<=at)fail('bounded independent preparation review required');
 if(!(reviewedEmptyModuleBytes instanceof Uint8Array)||reviewedEmptyModuleBytes.length!==Buffer.byteLength(empty)||!Buffer.from(reviewedEmptyModuleBytes).equals(Buffer.from(empty))||review.moduleSha256!==sha(reviewedEmptyModuleBytes))fail('exact reviewed canonical empty module required');
 if(!/^[a-f0-9]{40}$/.test(review.sourceCommit??'')||!/^[a-f0-9]{40}$/.test(review.treeGitSha??'')||observation?.sourceCommit!==review.sourceCommit||observation?.treeGitSha!==review.treeGitSha||deskTreeInventorySha256(observation.entries)!==review.inventorySha256)fail('independent prior observation binding');
 let last='';for(const e of observation.entries){if(e.path<=last||e.path.startsWith('/')||e.path.includes('\\')||/[\x00-\x1f\x7f]/.test(e.path)||e.path.split('/').some(p=>!p||p==='.'||p==='..')||!['100644','100755'].includes(e.mode))fail('unsafe complete inventory');last=e.path;if(e.path===DESK_MODULE_PATH)fail('module already exists; use append admission');if(e.path.startsWith(DESK_MODULE_PATH+'/')||DESK_MODULE_PATH.startsWith(e.path+'/'))fail('file/directory conflict');}
 const candidateEntries=[...structuredClone(observation.entries),{path:DESK_MODULE_PATH,mode:'100644',bytes:Buffer.byteLength(empty),sha256:sha(empty)}].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 return {status:'bootstrap-preparation-only',path:DESK_MODULE_PATH,moduleJson:empty,moduleSha256:sha(empty),candidateEntries,candidateInventorySha256:deskTreeInventorySha256(candidateEntries),expiresAt:new Date(Math.min(clock(review.expiresAt),at+300000)).toISOString(),reviewId:review.id,gitTreeCreated:false,effects:[],writeAuthorized:false,publicationAuthorized:false};
}
