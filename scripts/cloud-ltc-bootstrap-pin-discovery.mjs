import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateBootstrapInvocation} from './cloud-ltc-bootstrap-invocation-admission.mjs';
import {verifyBootstrapSource} from './cloud-ltc-receipt-bootstrap-cli.mjs';
const repo='Satnam-Satoshi/Satoshi-Langar',check=(v,c)=>{if(!v)throw Error('bootstrap_discovery_'+c);};
const sha=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v),hash=b=>createHash('sha256').update(b).digest('hex');
export async function discoverBootstrapPin({review:input,runId,token,fetchImpl=fetch,clock=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),maxWaitMs=300000,pollMs=10000}){
 const review=structuredClone(input);
 check(/^[1-9][0-9]{0,19}$/.test(runId)&&typeof token==='string'&&token.length>0&&sha(review.sourceSha,40)&&sha(review.workflowSha,40)&&sha(review.sourceManifestSha256,64),'config');
 check(Number.isInteger(maxWaitMs)&&maxWaitMs>0&&maxWaitMs<=300000&&Number.isInteger(pollMs)&&pollMs>=10&&pollMs<=30000,'bounds');
 const started=clock();check(Number.isFinite(started),'clock');
 const time=()=>{const n=clock();check(Number.isFinite(n)&&n>=started&&n-started<maxWaitMs,'deadline');return n;};
 async function get(suffix,{missing=false}={}){
  time();const controller=new AbortController();let timer,reader;
  try{return await Promise.race([(async()=>{const r=await fetchImpl(`https://api.github.com/repos/${repo}/${suffix}`,{method:'GET',redirect:'error',cache:'no-store',signal:controller.signal,headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json'}});
   check(!r.redirected,'redirect');if(missing&&r.status===404)return null;check(r.status===200&&/^application\/json(?:\s*;|$)/i.test(r.headers.get('content-type')??''),'response');reader=r.body?.getReader();check(reader,'body');let size=0;const chunks=[];for(;;){const x=await reader.read();check(!controller.signal.aborted,'timeout');if(x.done)break;size+=x.value.byteLength;check(size<=131072,'size');chunks.push(Buffer.from(x.value));}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
  })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},Math.min(10000,maxWaitMs-(clock()-started)));})]);}
  catch{throw Error('bootstrap_discovery_read_unconfirmed');}finally{clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{});}
 }
 const run=await get(`actions/runs/${runId}`);
 check(String(run.id)===runId&&run.run_attempt===1&&run.repository?.full_name===repo&&run.head_branch==='main'&&run.head_sha===review.workflowSha&&run.path===review.workflowPath&&run.event==='workflow_dispatch'&&run.status==='in_progress','run');
 for(let attempt=0;attempt<30;attempt++){
  time();const ref=await get('git/ref/heads/main');check(ref?.ref==='refs/heads/main'&&ref.object?.type==='commit'&&sha(ref.object.sha,40),'main_ref');
  const commit=ref.object.sha,file=await get(`contents/bootstrap-admission.json?ref=${commit}`,{missing:true});
  if(file){
   check(file.type==='file'&&file.path==='bootstrap-admission.json'&&file.encoding==='base64'&&typeof file.content==='string'&&sha(file.sha,40),'pin_file');
   const b64=file.content.replace(/\n/g,'');check(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64),'base64');const bytes=Buffer.from(b64,'base64');check(bytes.length<=16384&&bytes.length===file.size&&createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')===file.sha,'pin_bytes');
   const pin=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));check(pin?.schemaVersion===1&&/^[1-9][0-9]{0,19}$/.test(pin.runId)&&pin.runAttempt===1,'pin_shape');
   if(pin.runId===runId){
    check(pin.sourceManifestSha256===review.sourceManifestSha256,'manifest');
    validateBootstrapInvocation({pin,review:{...review,repository:repo},now:time(),run:{id:runId,attempt:run.run_attempt,repository:repo,event:run.event,headSha:run.head_sha,workflowSha:run.head_sha,executedSourceSha:review.sourceSha,workflowPath:run.path,ref:'refs/heads/main',status:run.status,jobName:'create-private-receipt-once',jobAttempt:1}});
    return Object.freeze({pinCommitSha:commit,pinSha256:hash(bytes),sourceManifestSha256:review.sourceManifestSha256,runId,executedSourceSha:review.sourceSha,sourceSha:review.sourceSha,workflowSha:review.workflowSha,workflowPath:review.workflowPath,bootstrapBodySha256:review.bootstrapBodySha256,bootstrapKey:review.bootstrapKey});
   }
  }
  check(attempt<29,'poll_limit');time();await sleep(Math.min(pollMs,maxWaitMs-(clock()-started)));
 }
 throw Error('bootstrap_discovery_poll_limit');
}
export async function prepareBootstrapPrivateConfig({env=process.env,root=process.cwd(),fetchImpl=fetch,write=writeFile,verifySource=verifyBootstrapSource,discover=discoverBootstrapPin}={}){
 check(path.isAbsolute(env.RUNNER_TEMP??'')&&env.GITHUB_RUN_ATTEMPT==='1','runtime');
 // Setup must not receive Google credentials at all.
 check(!env.LTC_GOOGLE_CLIENT_ID&&!env.LTC_GOOGLE_CLIENT_SECRET&&!env.LTC_GOOGLE_REFRESH_TOKEN&&!env.LTC_GOOGLE_ACCESS_TOKEN,'google_credentials_in_setup');
 const review=JSON.parse(env.LTC_BOOTSTRAP_REVIEW_JSON),publisher=JSON.parse(env.LTC_BOOTSTRAP_PRIVATE_TARGET_JSON);
 check(publisher.bootstrapKey===review.bootstrapKey,'marker');
 const body={name:'LTC private recovery receipt',mimeType:'application/vnd.google-apps.document',parents:[publisher.folderId],appProperties:{ltcReceiptBootstrap:publisher.bootstrapKey}};
 check(hash(JSON.stringify(body))===review.bootstrapBodySha256,'body_binding');
 const config={github:{sourceSha:review.sourceSha},publisher,sourceManifest:review.sourceManifest,sourceManifestSha256:review.sourceManifestSha256};
 await verifySource({root,config});
 config.github=await discover({review,runId:env.GITHUB_RUN_ID,token:env.GITHUB_TOKEN,fetchImpl});
 await write(path.join(env.RUNNER_TEMP,'ltc-receipt-bootstrap-private.json'),JSON.stringify(config)+'\n',{flag:'wx',mode:0o600});
 return Object.freeze({status:'pin-config-prepared',creationPerformed:false});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{check(process.argv.length===2,'arguments');console.log(JSON.stringify(await prepareBootstrapPrivateConfig()));}
 catch{console.error('receipt_bootstrap_setup_blocked');process.exitCode=1;}
}
