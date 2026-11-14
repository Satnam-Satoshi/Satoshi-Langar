import {createHash} from 'node:crypto';
import {validateBootstrapInvocation} from './cloud-ltc-bootstrap-invocation-admission.mjs';
const repo='Satnam-Satoshi/Satoshi-Langar';
const check=(v,c)=>{if(!v)throw Error('bootstrap_github_'+c);};
const digest=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v);
const hash=v=>createHash('sha256').update(v).digest('hex');
// Config must come from reviewed workflow/protected pin configuration; token is
// separately provisioned read-only. This module cannot prove token permissions.
export function createGitHubBootstrapPinReader({config,token,fetchImpl=fetch,clock=Date.now,timeoutMs=10000}){
 check(config&&digest(config.pinCommitSha,40)&&digest(config.pinSha256,64)&&digest(config.sourceManifestSha256,64)&&/^[1-9][0-9]{0,19}$/.test(config.runId)&&digest(config.executedSourceSha,40),'config');
 check(typeof token==='string'&&token.length>0&&typeof fetchImpl==='function'&&typeof clock==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=10&&timeoutMs<=30000,'config');
 const c=Object.freeze({...config}),fetcher=fetchImpl;
 async function get(suffix){
  const controller=new AbortController();let timer,reader;
  try{
   const pending=(async()=>{const response=await fetcher(`https://api.github.com/repos/${repo}/${suffix}`,{method:'GET',redirect:'error',cache:'no-store',signal:controller.signal,headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json'}});
    check(response.status===200&&!response.redirected,'response');check(/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??''),'type');
    reader=response.body?.getReader();check(reader,'body');let size=0;const chunks=[];
    for(;;){const {done,value}=await reader.read();check(!controller.signal.aborted,'timeout');if(done)break;size+=value.byteLength;check(size<=131072,'size');chunks.push(Buffer.from(value));}
    const bytes=Buffer.concat(chunks),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);return JSON.parse(text);
   })();
   return await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},timeoutMs);})]);
  }catch{throw Error('bootstrap_github_read_unconfirmed');}finally{clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{});}
 }
 return async function readVerifiedAdmission(){
  const started=clock();check(Number.isFinite(started),'clock');
  const file=await get(`contents/bootstrap-admission.json?ref=${c.pinCommitSha}`);
  check(file?.type==='file'&&file.path==='bootstrap-admission.json'&&file.encoding==='base64'&&typeof file.content==='string'&&digest(file.sha,40),'pin_file');
  const b64=file.content.replace(/\n/g,'');check(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64),'base64');
  const bytes=Buffer.from(b64,'base64');check(bytes.length===file.size&&bytes.length<=16384&&hash(bytes)===c.pinSha256,'pin_bytes');
  const gitHash=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');check(gitHash===file.sha,'blob_hash');
  const pin=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));check(pin?.sourceManifestSha256===c.sourceManifestSha256,'manifest');
  const run=await get(`actions/runs/${c.runId}`);
  const jobs=await get(`actions/runs/${c.runId}/attempts/1/jobs?per_page=100`);
  check(jobs?.total_count===1&&Array.isArray(jobs.jobs)&&jobs.jobs.length===1,'jobs');const job=jobs.jobs[0];
  check(String(job.run_id)===c.runId&&job.run_attempt===1&&job.head_sha===c.workflowSha&&job.name==='create-private-receipt-once'&&job.status==='in_progress','job');
  check(String(run.id)===c.runId&&run.repository?.full_name===repo&&run.head_branch==='main'&&run.path===c.workflowPath,'run');
  const observed={id:String(run.id),attempt:run.run_attempt,repository:run.repository.full_name,event:run.event,headSha:run.head_sha,workflowSha:run.head_sha,executedSourceSha:c.executedSourceSha,workflowPath:run.path,ref:'refs/heads/main',status:run.status,jobName:job.name,jobAttempt:job.run_attempt};
  const review={repository:repo,sourceSha:c.sourceSha,workflowSha:c.workflowSha,workflowPath:c.workflowPath,bootstrapBodySha256:c.bootstrapBodySha256,bootstrapKey:c.bootstrapKey};
  const now=clock();check(Number.isFinite(now)&&now>=started&&now-started<=30000,'stale');validateBootstrapInvocation({pin,run:observed,review,now});
  return Object.freeze({bootstrapBodySha256:pin.bootstrapBodySha256,bootstrapKey:pin.bootstrapKey,runId:c.runId,observedAt:started,expiresAt:Math.min(pin.expiresAt,started+30000),pinCommitSha:c.pinCommitSha,pinSha256:c.pinSha256});
 };
}
// Explicit bounded model: latch survives this process only. Exact run attempt1
// and reviewed one-entrypoint job prevent permitted reruns; not durable CAS.
export function createBoundedOneInvocationAdmission({readVerifiedAdmission,clock=Date.now}){
 check(typeof readVerifiedAdmission==='function'&&typeof clock==='function','adapter');let consumed=false;
 return async function oneInvocationAdmission(binding){
  check(!consumed,'already_invoked');consumed=true;
  const frozen=Object.freeze({...binding}),proof=Object.freeze({...await readVerifiedAdmission()});
  const assertInvocation=next=>{check(next?.action==='create-one-private-receipt-document'&&next.bodySha256===proof.bootstrapBodySha256&&next.bootstrapKey===proof.bootstrapKey&&JSON.stringify(next)===JSON.stringify(frozen),'binding');const now=clock();check(Number.isFinite(now)&&now>=proof.observedAt&&now<proof.expiresAt,'expired');return true;};
  assertInvocation(frozen);
  return Object.freeze({assertInvocation,admissionMode:'bounded-single-invocation',exactlyOnceGuaranteed:false});
 };
}
