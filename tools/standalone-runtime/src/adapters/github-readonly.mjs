/** Direct fixed-repository Git reads. No writes, activation or publication proof. */
import {createHash} from 'node:crypto';
export const GITHUB_REPOSITORY='Satnam-Satoshi/Satoshi-Langar';
const BASE=`https://api.github.com/repos/${GITHUB_REPOSITORY}/git/`;
const oid=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
const hash=(algo,b)=>createHash(algo).update(b).digest('hex');
const objectHash=(type,b)=>hash('sha1',Buffer.concat([Buffer.from(`${type} ${b.length}\0`),b]));
const hold=reason=>({status:'held',reason,publicationVerified:false,mutationsPerformed:false});
export function createGitHubReadOnly({fetch:transport,resolveSecret,secretReference,branch,networkEnabled=false,timeoutMs=10000}={}){
 if(typeof transport!=='function'||typeof networkEnabled!=='boolean'||typeof branch!=='string'||branch.length>200||!branch.split('/').every(x=>/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(x)&&!x.includes('..')&&!x.endsWith('.lock')&&!x.endsWith('.'))||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw Error('invalid_boundary');
 if(secretReference!==undefined&&(typeof resolveSecret!=='function'||typeof secretReference!=='string'||!secretReference||secretReference.length>500))throw Error('invalid_secret_reference');
 let stopped=false,busy=false;
 async function read(kind,sha){
  if(!networkEnabled)return hold('network_disabled');if(stopped)return hold('previous_read_requires_review');if(busy)return hold('concurrent_read_denied');
  if(kind!=='branch'&&!oid(sha))return hold('invalid_object_id');
  busy=true;const controller=new AbortController();let timer;
  const endpoint=kind==='branch'?`ref/heads/${branch.split('/').map(encodeURIComponent).join('/')}`:`${kind}s/${sha}`,url=BASE+endpoint;
  try{return await Promise.race([(async()=>{
   const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'};
   if(secretReference!==undefined){const secret=await resolveSecret({reference:secretReference,purpose:'github-contents-read-only'});if(typeof secret!=='string'||secret.length<8||secret.length>4096||/\s/.test(secret))throw Error('secret_unavailable');headers.Authorization=`Bearer ${secret}`;}
   if(controller.signal.aborted)throw Error('timeout');
   const r=await transport(url,{method:'GET',headers,redirect:'manual',signal:controller.signal});if(controller.signal.aborted)throw Error('timeout');
   if(r.url!==url||r.redirected||r.status!==200)throw Error('http_or_redirect_hold');
   const remaining=r.headers.get('x-ratelimit-remaining');if(!/^\d{1,10}$/.test(remaining??'')||Number(remaining)<1)throw Error('rate_limit_hold');
   const max=kind==='blob'?3_000_000:2_000_000,length=r.headers.get('content-length');if(!/^application\/json(?:;|$)/i.test(r.headers.get('content-type')??'')||length!==null&&(!/^\d+$/.test(length)||Number(length)>max))throw Error('response_bounds');
   const reader=r.body?.getReader();if(!reader)throw Error('response_bounds');let n=0;const chunks=[];try{for(;;){const v=await reader.read();if(v.done)break;if(!(v.value instanceof Uint8Array)||(n+=v.value.length)>max)throw Error('response_bounds');chunks.push(v.value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
   const raw=Buffer.concat(chunks),d=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));let result;
   if(!d||Array.isArray(d)||typeof d!=='object')throw Error('identity_mismatch');
   if(kind==='branch'){
    if(d.ref!==`refs/heads/${branch}`||d.url!==BASE+`refs/heads/${branch}`||d.object?.type!=='commit'||!oid(d.object.sha)||d.object.url!==BASE+'commits/'+d.object.sha)throw Error('identity_mismatch');
    result={branch,commit:d.object.sha,objectBytesVerified:false};
   }else{
    if(d.sha!==sha||d.url!==url)throw Error('identity_mismatch');
    if(kind==='blob'){
     if(d.encoding!=='base64'||typeof d.content!=='string'||!Number.isSafeInteger(d.size)||d.size<0||d.size>2_000_000||!/^[A-Za-z0-9+/=\r\n]*$/.test(d.content))throw Error('blob_encoding');
     const encoded=d.content.replace(/[\r\n]/g,''),bytes=Buffer.from(encoded,'base64');if(bytes.toString('base64')!==encoded||bytes.length!==d.size||objectHash('blob',bytes)!==sha)throw Error('blob_hash_mismatch');
     result={sha,bytes,sha256:hash('sha256',bytes),objectBytesVerified:true};
    }else if(kind==='tree'){
     if(d.truncated!==false||!Array.isArray(d.tree)||d.tree.length>10000)throw Error('tree_incomplete');const names=new Set();
     const rows=d.tree.map(e=>{if(typeof e.path!=='string'||Buffer.byteLength(e.path)>255||!e.path||/[\/\\\x00-\x1f\x7f]/.test(e.path)||['.','..'].includes(e.path)||names.has(e.path)||!oid(e.sha)||!['100644','100755','040000'].includes(e.mode)||e.type!==(e.mode==='040000'?'tree':'blob')||e.url!==BASE+`${e.type}s/${e.sha}`||e.type==='blob'&&(!Number.isSafeInteger(e.size)||e.size<0||e.size>32*1024*1024))throw Error('unsafe_tree');names.add(e.path);return e;});
     rows.sort((a,b)=>Buffer.compare(Buffer.from(a.path+(a.type==='tree'?'/':'')),Buffer.from(b.path+(b.type==='tree'?'/':''))));
     const bytes=Buffer.concat(rows.map(e=>Buffer.concat([Buffer.from(`${e.mode==='040000'?'40000':e.mode} ${e.path}\0`),Buffer.from(e.sha,'hex')])));if(objectHash('tree',bytes)!==sha)throw Error('tree_hash_mismatch');
     result={sha,entries:rows.map(({path,mode,type,sha,size})=>({path,mode,type,sha,...(size===undefined?{}:{size})})),objectBytesVerified:true,recursive:false};
    }else{
     if(!oid(d.tree?.sha)||d.tree.url!==BASE+'trees/'+d.tree.sha||!Array.isArray(d.parents)||d.parents.length>32||d.parents.some(p=>!oid(p.sha)||p.url!==BASE+'commits/'+p.sha)||typeof d.message!=='string'||d.message.length>100000)throw Error('commit_shape');
     // REST JSON is not the exact serialized signed commit object. Do not reconstruct or attest its hash.
     result={sha,tree:d.tree.sha,parents:d.parents.map(p=>p.sha),objectBytesVerified:false,identityAuthority:'github-rest-response-not-raw-commit-hash'};
    }
   }
   return {status:'read',repository:GITHUB_REPOSITORY,...result,responseSha256:hash('sha256',raw),rateRemaining:Number(remaining),publicationVerified:false,mutationsPerformed:false};
  })(),new Promise((_,no)=>{timer=setTimeout(()=>{controller.abort();no(Error('timeout'));},timeoutMs);})]);
  }catch(e){stopped=true;controller.abort();return hold(['http_or_redirect_hold','rate_limit_hold','response_bounds','identity_mismatch','blob_encoding','blob_hash_mismatch','tree_incomplete','unsafe_tree','tree_hash_mismatch','commit_shape','timeout','secret_unavailable'].includes(e?.message)?e.message:'read_failed_no_retry');}finally{clearTimeout(timer);busy=false;}
 }
 return Object.freeze({readBranch:()=>read('branch'),readCommit:sha=>read('commit',sha),readTree:sha=>read('tree',sha),readBlob:sha=>read('blob',sha)});
}
