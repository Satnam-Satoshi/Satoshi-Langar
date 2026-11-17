/** Read-only retrieval and untrusted extraction. No editorial/publication authority. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {request} from 'node:https';
import {lookup} from 'node:dns/promises';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {extractCloudNewsroomV2CoreRelease} from './sources/core-release.mjs';
const registry=JSON.parse(await readFile(new URL('./sources/registry.json',import.meta.url),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
export const SOURCE_REGISTRY_SHA256=hash(JSON.stringify(registry));
export const SOURCE_IDS=Object.freeze(registry.sources.map(s=>s.id));
const MAX=2_000_000;
async function boundedRead(transport,url){let timer;const controller=new AbortController();try{return await Promise.race([Promise.resolve().then(()=>transport.read({url,signal:controller.signal})),new Promise((_,no)=>{timer=setTimeout(()=>{controller.abort();no(Error('timeout'));},15000);})]);}finally{clearTimeout(timer);}}
function instant(s){if(typeof s!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s)||new Date(Date.parse(s)).toISOString()!==s.replace(/Z$/,s.includes('.')?'Z':'.000Z'))throw Error('invalid_clock');return Date.parse(s);}
export function isPublicIPv4(s){if(typeof s!=='string'||!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(s))return false;const a=s.split('.').map(Number);if(a.some((v,i)=>v>255||String(v)!==s.split('.')[i]))return false;const [x,y,z]=a;return !(x===0||x===10||x===127||x>=224||x===169&&y===254||x===172&&y>=16&&y<=31||x===192&&(y===168||y===0||y===2)||x===100&&y>=64&&y<=127||x===198&&(y===18||y===19||y===51&&z===100)||x===203&&y===0&&z===113);}
// Fixed DNS result is passed into TLS socket lookup; no proxy, redirects, cookies or credentials.
export function createPublicHttpsTransport({resolve=lookup}={}){return {read:async({url,signal})=>{
 if(signal?.aborted)throw Error('aborted');
 if(!registry.sources.some(s=>s.url===url))throw Error('unregistered_url');
 const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)throw Error('unsafe_url');
 let timer,req,expired=false,onAbort;const abort=new Promise((_,no)=>{onAbort=()=>{expired=true;req?.destroy();no(Error('aborted'));};signal?.addEventListener('abort',onAbort,{once:true});});const work=(async()=>{const addresses=await resolve(u.hostname,{all:true,family:4});if(!Array.isArray(addresses)||!addresses.length||addresses.length>32||addresses.some(a=>a.family!==4||!isPublicIPv4(a.address)))throw Error('nonpublic_dns');
 if(expired)throw Error('timeout');return await new Promise((yes,no)=>{req=request(u,{method:'GET',signal,agent:false,family:4,lookup:(_h,opts,cb)=>opts.all?cb(null,[addresses[0]]):cb(null,addresses[0].address,4),headers:{Accept:'text/html,application/json','User-Agent':'LTC-Standalone-Research/0.1'}},r=>{let size=0;const chunks=[];if(r.statusCode!==200){r.destroy();return yes({status:r.statusCode,url,contentType:'',bytes:new Uint8Array()});}if(r.headers['content-encoding']&&r.headers['content-encoding']!=='identity'){r.destroy();return no(Error('encoded_response'));}r.on('data',b=>{size+=b.length;if(size>MAX)r.destroy(Error('byte_limit'));else chunks.push(b);});r.on('error',no);r.on('end',()=>yes({status:r.statusCode,url,contentType:r.headers['content-type']??'',bytes:Buffer.concat(chunks)}));});req.on('error',no);req.end();});})();
 try{return await Promise.race([work,abort,new Promise((_,no)=>{timer=setTimeout(()=>{expired=true;req?.destroy();no(Error('timeout'));},15000);})]);}finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);if(expired)work.then(()=>req?.destroy(),()=>{});}
 }};}
function html(raw,observation,source){return new Promise(resolve=>{const child=execFile('/usr/bin/python3',['-I',fileURLToPath(new URL('./sources/html_evidence.py',import.meta.url))],{timeout:5000,maxBuffer:2_000_000,env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8'}},(error,stdout)=>{try{const result=JSON.parse(stdout);resolve(result);}catch{resolve({status:'gap',reason:'html_parser_unavailable',publishable:false});}});child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({rawBase64:Buffer.from(raw).toString('base64'),observation,registeredSource:source}));});}
export function createSourceCollector({networkEnabled=false,transport,clock=()=>new Date().toISOString()}={}){
 if(typeof networkEnabled!=='boolean')throw Error('explicit_boolean_required');
 return {async collect({previousCoreRelease=null}={}){
 const observations=[],extractions=[],evidence=[];let total=0;
 for(const source of registry.sources){
  if(!networkEnabled){observations.push({sourceId:source.id,url:source.url,status:'disabled'});extractions.push({sourceId:source.id,status:'gap',reason:'network_disabled',publishable:false});continue;}
  let checkedAt;try{checkedAt=clock();const start=instant(checkedAt);if(!transport||typeof transport.read!=='function')throw Error('transport_missing');
   const r=await boundedRead(transport,source.url);const finishedAt=clock(),end=instant(finishedAt);if(end<start||end-start>15000)throw Error('retrieval_deadline');
   if(r?.url!==source.url||r.status!==200)throw Error('http_or_redirect_hold');
   if(!(r.bytes instanceof Uint8Array)||r.bytes.length<1||r.bytes.length>MAX||total+r.bytes.length>16_000_000)throw Error('byte_limit');total+=r.bytes.length;
   if(typeof r.contentType!=='string'||!/^(?:text\/html|application\/json)(?:\s*;\s*charset=utf-8)?$/i.test(r.contentType))throw Error('unsupported_media');
   const sha256=hash(r.bytes),locator=`evidence/${source.id}-${sha256}`;
   const observation={sourceId:source.id,url:source.url,status:'retrieved-uninterpreted',httpStatus:200,contentType:r.contentType,bytes:r.bytes.length,sha256,checkedAt,finishedAt,retrievalExpiresAt:new Date(start+Math.min(source.maxCheckAgeHours??24,24)*3600000).toISOString(),sourceEffectiveAt:null};
   observations.push(observation);evidence.push({sourceId:source.id,locator,sha256,bytes:Buffer.from(r.bytes)});
   try{const result=source.id==='core'?extractCloudNewsroomV2CoreRelease({rawBytes:r.bytes,observation,now:finishedAt,previousRelease:previousCoreRelease}):/^text\/html/i.test(r.contentType)?await html(r.bytes,observation,source):{status:'gap',reason:'semantic_parser_not_implemented',publishable:false};
   extractions.push({sourceId:source.id,...result});}catch{extractions.push({sourceId:source.id,status:'gap',reason:'extraction_failed',claimVerified:false,publishable:false});}
  }catch(error){const reason=['invalid_clock','transport_missing','retrieval_deadline','http_or_redirect_hold','byte_limit','unsupported_media','nonpublic_dns','unregistered_url','unsafe_url','timeout','aborted','encoded_response'].includes(error?.message)?error.message:'retrieval_unavailable_or_unsupported';observations.push({sourceId:source.id,url:source.url,checkedAt,status:'gap',reason});extractions.push({sourceId:source.id,status:'gap',reason,publishable:false});}
 }
 return {registrySha256:SOURCE_REGISTRY_SHA256,observations,extractions,evidence,networkRequestsEnabled:networkEnabled,claimVerified:false,publishable:false,ecosystemCoverageComplete:false,publicationExecuted:false};
 }};
}
