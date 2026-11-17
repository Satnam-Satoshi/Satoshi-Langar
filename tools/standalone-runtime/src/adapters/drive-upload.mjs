/** Dormant one-shot multipart upload. Durable intent before HTTP; unknown never retried. */
import {createHash} from 'node:crypto';
import {planDriveArchiveUpload} from './drive-archive.mjs';
const URL='https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id%2Cversion';
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(x);
const hash=x=>createHash('sha256').update(x).digest('hex');
function canonical(value){let n=0;function walk(x,d=0){if(++n>100||d>8)throw Error('bounded_record_required');if(x===null||typeof x==='boolean'||Number.isSafeInteger(x))return x;if(typeof x==='string'&&x.length<=2000)return x;if(x&&Object.getPrototypeOf(x)===Object.prototype)return Object.fromEntries(Object.keys(x).sort().map(k=>[k,walk(x[k],d+1)]));throw Error('invalid_record');}return JSON.stringify(walk(value));}
const hold=reason=>({status:'held',reason,publicationVerified:false});
const time=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x?Date.parse(x):NaN;
export function createDriveUpload({fetch:transport,resolveSecret,secretReference,folderId,ownerPermissionId,journal,preflight,verifyReadback,loadApproval,clock=()=>new Date().toISOString(),networkEnabled=false,mutationsEnabled=false,timeoutMs=30000}={}){
 if(!id(folderId)||!id(ownerPermissionId)||typeof secretReference!=='string'||!secretReference||secretReference.length>500||[transport,resolveSecret,journal?.read,journal?.cas,preflight,verifyReadback,loadApproval,clock].some(x=>typeof x!=='function')||typeof networkEnabled!=='boolean'||typeof mutationsEnabled!=='boolean'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('invalid_independent_boundary');
 let busy=false,latched=false;
 return Object.freeze({async advance({bytes,mimeType}={}){
  if(!networkEnabled||!mutationsEnabled)return hold('effects_disabled');if(busy||latched)return hold('busy_or_uncertain_instance');busy=true;let timer,attempted=false;const controller=new AbortController();
  const active=()=>{if(controller.signal.aborted)throw Error('operation_expired');};
  try{return await Promise.race([(async()=>{
   const plan=planDriveArchiveUpload({bytes,mimeType});if(plan.status!=='upload-plan-only'||plan.bytes>5_000_000)return hold('bounded_artifact_required');const copy=Buffer.from(bytes);
   const identity={folderId,ownerPermissionId,name:plan.name,mimeType,bytes:copy.length,sha256:hash(copy)};if(identity.sha256!==plan.sha256)return hold('artifact_changed');const key=hash(canonical(identity));
   let state=await journal.read({key});active();
   function valid(s){return s&&Number.isSafeInteger(s.version)&&s.version>=0&&s.version<Number.MAX_SAFE_INTEGER-3&&Object.hasOwn(s,'record')&&(s.record===null||s.record.key===key&&canonical(s.record.identity)===canonical(identity)&&['attempting','readback-pending','verified'].includes(s.record.phase));}
   if(!valid(state))return hold('authoritative_journal_required');
   async function save(record){active();const next={version:state.version+1,record};const result=await journal.cas({key,expectedVersion:state.version,next});active();if(result?.applied!==true)throw Error('journal_uncertain');const seen=await journal.read({key});active();if(canonical(seen)!==canonical(next))throw Error('journal_readback_mismatch');state=seen;}
   async function verify(){const r=state.record;if(!id(r.fileId)||!/^[1-9][0-9]{0,19}$/.test(r.fileVersion??''))return hold('known_file_identity_required');const proof=await verifyReadback({...identity,fileId:r.fileId,version:r.fileVersion});active();if(proof?.status!=='existing-archive-readback-verified'||proof.fileId!==r.fileId||proof.folderId!==folderId||proof.version!==r.fileVersion||proof.sha256!==identity.sha256||proof.bytes!==identity.bytes||proof.mimeType!==mimeType||proof.ownerOnlyObserved!==true||proof.atomic!==false||proof.worm!==false) return hold('readback_not_verified');if(r.phase!=='verified')await save({...r,phase:'verified'});return {status:'archive-readback-verified',fileId:r.fileId,version:r.fileVersion,sha256:identity.sha256,bytes:identity.bytes,uploadAttempted:attempted,publicationVerified:false,atomic:false,worm:false};}
   if(state.record?.phase==='attempting')return hold('uncertain_upload_manual_reconciliation_required');
   if(state.record?.phase==='readback-pending'||state.record?.phase==='verified')return await verify();
   const approval=await loadApproval({identity,key});active();
   function approved(){const now=time(clock());return Number.isFinite(now)&&approval?.action==='create-private-drive-artifact'&&id(approval.reference)&&canonical(approval.identity)===canonical(identity)&&time(approval.notBefore)<=now&&time(approval.expiresAt)>now;}
   if(!approved())return hold('exact_approval_required');
   const p=await preflight();active();if(p?.status!=='folder-preflight-observed'||p.folderId!==folderId||p.ownerPermissionId!==ownerPermissionId||p.ownerOnlyObserved!==true||p.atomic!==false||p.worm!==false)return hold('folder_preflight_required');
   const token=await resolveSecret({reference:secretReference,purpose:'drive-approved-single-upload'});active();if(typeof token!=='string'||token.length<8||token.length>4096||/\s/.test(token))return hold('credential_unavailable');
   const boundary='ltc_'+identity.sha256;if(copy.includes(Buffer.from(boundary)))return hold('multipart_boundary_collision');
   const body=Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:identity.name,mimeType,parents:[folderId]})}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),copy,Buffer.from(`\r\n--${boundary}--\r\n`)]);
   if(!approved())return hold('approval_expired');await save({key,identity,phase:'attempting',approvalReference:approval.reference});active();if(!approved())return hold('approval_expired_after_intent');
   attempted=true;const response=await transport(URL,{method:'POST',redirect:'manual',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,'Content-Type':`multipart/related; boundary=${boundary}`},body});active();if(response.url!==URL||response.redirected||response.status!==200||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??''))throw Error('uncertain_upload');
   const reader=response.body?.getReader();if(!reader)throw Error('uncertain_upload');let total=0;const parts=[];try{for(;;){const x=await reader.read();active();if(x.done)break;if(!(x.value instanceof Uint8Array)||(total+=x.value.length)>65536)throw Error('uncertain_upload');parts.push(x.value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
   const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));if(!id(result.id)||!/^[1-9][0-9]{0,19}$/.test(result.version??''))throw Error('uncertain_upload');
   await save({...state.record,phase:'readback-pending',fileId:result.id,fileVersion:result.version});return await verify();
  })(),new Promise((_,no)=>{timer=setTimeout(()=>{controller.abort();no(Error('operation_expired'));},timeoutMs);})]);
  }catch{latched=true;controller.abort();return {...hold('uncertain_operation_no_retry'),uploadAttempted:attempted};}finally{clearTimeout(timer);busy=false;}
 }});
}
