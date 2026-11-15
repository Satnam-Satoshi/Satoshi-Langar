import {createHash} from 'node:crypto';
import {validateWriterWindow} from './cloud-ltc-f33-writer-barrier.mjs';
const repo='Satnam-Satoshi/Satoshi-Langar', policy='config/ltc-publication.json';
const statuses=['queued','in_progress','waiting','pending','requested'];
const check=(v,c)=>{if(!v)throw Error('f33_readers_'+c);};
const hash=v=>createHash('sha256').update(v).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
// Workflow flags are resolved by the reviewed native-owner-approved workflow,
// not queried with new variable permissions. This is a cooperative writer window.
export function createRetirementReaders({config,token,cloudPublish,softwareReleaseEnabled,fetchImpl=fetch,clock=Date.now,timeoutMs=10000}){
 const c=freeze(structuredClone(config));
 check(typeof token==='string'&&token.length>0&&typeof fetchImpl==='function'&&typeof clock==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=10&&timeoutMs<=30000,'config');
 check(/^[a-f0-9]{40}$/.test(c.workflowSha??'')&&/^[a-f0-9]{40}$/.test(c.sourceSha??''),'pins');
 check(cloudPublish==='false'&&softwareReleaseEnabled==='false','publication_enabled');
 const paths=new Set(['git/ref/heads/main','git/ref/heads/agent/wall-street-20261011','actions/runs/43608206507',`contents/.github/workflows?ref=${c.workflowSha}`,`contents/${policy}?ref=${c.sourceSha}`,...statuses.map(s=>`actions/runs?status=${s}&per_page=100`)]);
 async function readGithub(endpoint){
  check(paths.has(endpoint),'endpoint');const controller=new AbortController();let timer,reader;
  try{
   return await Promise.race([(async()=>{
    const r=await fetchImpl(`https://api.github.com/repos/${repo}/${endpoint}`,{method:'GET',redirect:'error',cache:'no-store',signal:controller.signal,headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json'}});
    check(r.status===200&&!r.redirected&&/^application\/json(?:\s*;|$)/i.test(r.headers.get('content-type')??''),'response');
    reader=r.body?.getReader();check(reader,'body');const chunks=[];let size=0;
    for(;;){const {done,value}=await reader.read();check(!controller.signal.aborted,'timeout');if(done)break;size+=value.byteLength;check(size<=1048576,'size');chunks.push(Buffer.from(value));}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
   })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},timeoutMs);})]);
  }catch{throw Error('f33_readers_transport_unconfirmed');}finally{clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{});}
 }
 const fresh=start=>{const now=clock();check(Number.isFinite(start)&&Number.isFinite(now)&&now>=start&&now-start<30000,'stale');return now;};
 async function readOrigin(){const start=clock();const r=await readGithub('actions/runs/43608206507');fresh(start);check(String(r?.id)==='43608206507'&&r.run_attempt===1&&r.repository?.full_name===repo&&r.status==='completed'&&r.conclusion==='failure'&&r.event==='workflow_dispatch'&&r.head_branch==='main'&&r.path==='.github/workflows/ltc-daily-publication.yml'&&/^[a-f0-9]{40}$/.test(r.head_sha??''),'origin');return {...r,repository:repo,observedAt:new Date(start).toISOString()};}
 async function readVerifiedControls(){
  const start=clock();check(Number.isFinite(start),'clock');
  const main=await readGithub('git/ref/heads/main'),source=await readGithub('git/ref/heads/agent/wall-street-20261011');
  const files=await readGithub(`contents/.github/workflows?ref=${c.workflowSha}`);
  check(Array.isArray(files)&&files.length>0&&files.length<1000,'workflows');
  const manifest={};for(const f of [...files].sort((a,b)=>String(a.path)<String(b.path)?-1:String(a.path)>String(b.path)?1:0)){check(f.type==='file'&&/^\.github\/workflows\/[a-zA-Z0-9_-]+\.ya?ml$/.test(f.path)&&/^[a-f0-9]{40}$/.test(f.sha)&&!Object.hasOwn(manifest,f.path),'workflow_entry');manifest[f.path]=f.sha;}
  // Own workflow is bound by native approval + exact main commit, not a circular self hash.
  const others={...manifest};delete others['.github/workflows/ltc-f33-paused-retirement.yml'];
  check(Object.hasOwn(manifest,'.github/workflows/ltc-f33-paused-retirement.yml')&&hash(JSON.stringify(others))===c.workflowInventorySha256,'workflow_inventory');
  const file=await readGithub(`contents/${policy}?ref=${c.sourceSha}`);
  check(file?.type==='file'&&file.path===policy&&file.encoding==='base64'&&typeof file.content==='string'&&/^[A-Za-z0-9+/=\r\n]+$/.test(file.content),'policy');
  const b=Buffer.from(file.content.replace(/[\r\n]/g,''),'base64');check(b.length<=262144&&file.size===b.length&&b.toString('base64')===file.content.replace(/[\r\n]/g,'')&&createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex')===file.sha&&hash(b)===c.sourcePolicySha256,'policy_hash');
  check(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b))?.paused===true,'policy_paused');
  const inventory=[];for(const status of statuses)inventory.push({status,...await readGithub(`actions/runs?status=${status}&per_page=100`)});
  fresh(start);validateWriterWindow({config:c,main,source,inventory,now:start});
  return {repository:repo,observedAt:new Date(start).toISOString(),sourceHead:c.sourceSha,sourcePolicySha256:c.sourcePolicySha256,cloudPublicationEnabled:false,localPublisherDisabled:true,otherWritersStopped:true,activeWriterCount:0,writerEvidenceSha256:hash(JSON.stringify({main,source,manifest,inventory,localMaintenance:c.localMaintenance,flags:{cloudPublish,softwareReleaseEnabled}}))};
 }
 return Object.freeze({readGithub,readOrigin,readVerifiedControls});
}
