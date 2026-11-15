import {safeDiagnosticCode,safeHttpCode} from './cloud-ltc-safe-diagnostics.mjs';
const repo='Satnam-Satoshi/Satoshi-Langar';
const gate='ltc-receipt-owner-approval';
const check=(v,c)=>{if(!v)throw Error('retirement_native_'+c);};
const sha=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v);
export function validateNativeRetirementApproval({config:c,run,jobs,approvals,now}){
 check(c&&/^[1-9][0-9]{0,19}$/.test(c.runId)&&sha(c.workflowSha,40)&&sha(c.sourceSha,40)&&c.executedSourceSha===c.sourceSha&&c.environmentId===27323462394,'config');
 check(c.workflowPath==='.github/workflows/ltc-f33-paused-retirement.yml','path');
 check(Number.isFinite(now),'clock');
 check(String(run?.id)===c.runId&&run.run_attempt===1&&run.repository?.full_name===repo&&run.event==='workflow_dispatch'&&run.head_branch==='main'&&run.head_sha===c.workflowSha&&run.path===c.workflowPath&&run.status==='in_progress','run');
 check(jobs?.total_count===2&&Array.isArray(jobs.jobs)&&jobs.jobs.length===2,'jobs');
 const gateJob=jobs.jobs.find(j=>j.name==='owner-approval');
 const createJob=jobs.jobs.find(j=>j.name==='retire-private-recovery-once');
 check(gateJob&&createJob&&gateJob.id!==createJob.id,'job_names');
 for(const j of jobs.jobs)check(String(j.run_id)===c.runId&&j.run_attempt===1&&j.head_sha===c.workflowSha,'job_binding');
 check(gateJob.status==='completed'&&gateJob.conclusion==='success'&&createJob.status==='in_progress'&&createJob.conclusion===null,'job_status');
 check(Array.isArray(approvals)&&approvals.length>0&&approvals.length<=20,'reviews');
 const relevant=approvals.filter(a=>Array.isArray(a?.environments)&&a.environments.some(e=>e.name===gate||e.id===c.environmentId));
 check(relevant.length===1,'review_conflict');
 const a=relevant[0];
 check(a.state==='approved'&&a.user?.id===268053325&&a.user.type==='User'&&a.environments.length===1&&a.environments[0].name===gate&&a.environments[0].id===c.environmentId,'owner_approval');
 const stopSteps=(createJob.steps??[]).filter(s=>s.name==='Wait for post-approval fresh writer-stop evidence');const stopStep=stopSteps.length===1?stopSteps[0]:null;
 const pending=stopSteps.length===0||['queued','pending'].includes(stopStep?.status)&&stopStep.started_at===null&&stopStep.conclusion===null;
 const ready=stopStep&&(stopStep.status==='in_progress'&&stopStep.conclusion===null||stopStep.status==='completed'&&stopStep.conclusion==='success')&&Number.isFinite(Date.parse(stopStep.started_at));
 return Object.freeze({stopStepReadiness:pending?'pending':ready?'ready':'invalid',stopStepStartedAt:ready?Date.parse(stopStep.started_at):NaN,runId:c.runId,productionJobId:createJob.id,productionJobStartedAt:Date.parse(createJob.started_at),observedAt:now,expiresAt:now+300000});
}
// Trusted reviewed workflow verifies checkout/manifest before constructing this
// reader. API evidence does not independently prove executed source or settings.
export function createNativeRetirementApprovalReader({config,token,fetchImpl=fetch,clock=Date.now,timeoutMs=10000,trace=()=>{}}){
 check(typeof token==='string'&&token.length>0&&typeof fetchImpl==='function'&&typeof clock==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=10&&timeoutMs<=30000,'config');
 const c=Object.freeze({...config}),fetcher=fetchImpl;
 check(/^[1-9][0-9]{0,19}$/.test(c.runId),'run_id');
 async function get(suffix,stage){
  trace(stage);
  const controller=new AbortController();let timer,reader;
  try{
   const pending=(async()=>{const response=await fetcher(`https://api.github.com/repos/${repo}/${suffix}`,{method:'GET',redirect:'error',cache:'no-store',signal:controller.signal,headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json'}});
    if(response.status!==200)throw Error(safeHttpCode('retirement_native',response.status));check(!response.redirected,'response');check(/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??''),'type');
    reader=response.body?.getReader();check(reader,'body');let size=0;const chunks=[];
    for(;;){const {done,value}=await reader.read();check(!controller.signal.aborted,'timeout');if(done)break;size+=value.byteLength;check(size<=131072,'size');chunks.push(Buffer.from(value));}
    const bytes=Buffer.concat(chunks),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);return JSON.parse(text);
   })();
   return await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('retirement_native_timeout'));},timeoutMs);})]);
  }catch(error){const code=safeDiagnosticCode(error);throw Error(code==='unclassified'?'retirement_github_read_unconfirmed':code);}finally{clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{});}
 }
 return async function readVerifiedAdmission(){
  const started=clock();check(Number.isFinite(started),'clock');
  const run=await get(`actions/runs/${c.runId}`,'native_run_read');
  const jobs=await get(`actions/runs/${c.runId}/attempts/1/jobs?per_page=100`,'native_jobs_read');
  const approvals=await get(`actions/runs/${c.runId}/approvals`,'native_approvals_read');
  const ended=clock();check(Number.isFinite(ended)&&ended>=started&&ended-started<30000,'stale');
  trace('native_validating');const result=validateNativeRetirementApproval({config:c,run,jobs,approvals,now:started});trace('native_verified');return result;
 };
}

// Native owner approval of this distinct write-scoped workflow is the authority.
// The ignored token parameter is compatibility only; data never authorizes writes.
export function createNativeRetirementAuthority(options){
 const c=Object.freeze({...options.config}),clock=options.clock??Date.now;
 check(sha(c.expectedReviewSha256,64),'review_pin');
 const read=createNativeRetirementApprovalReader({...options,config:c,clock});
 const keys=['incident','action','reviewSha256','expectedRevision','expectedSnapshotSha256','nonce','proposedStateSha256','proposalStateSha256'].sort();
 function canonical(b){
  check(b&&Object.keys(b).sort().join('|')===keys.join('|'),'binding_fields');
  check(b.incident==='gha-43608206507-1/fence33'&&b.action==='retire-paused-only'&&b.reviewSha256===c.expectedReviewSha256,'scope');
  check(typeof b.expectedRevision==='string'&&b.expectedRevision.length>0&&b.expectedRevision.length<=2048&&
   sha(b.expectedSnapshotSha256,64)&&sha(b.proposedStateSha256,64)&&sha(b.proposalStateSha256,64)&&
   typeof b.nonce==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(b.nonce),'binding');
  return JSON.stringify(keys.map(k=>[k,b[k]]));
 }
 return async function authorizeOwner(_ignoredToken,binding){
  const pin=canonical(binding),approval=await read();
  const assertValid=next=>{const now=clock();check(Number.isFinite(now)&&now>=approval.observedAt&&now<approval.expiresAt,'expired');check(canonical(next)===pin,'binding_changed');return true;};
  assertValid(binding);
  return Object.freeze({assertValid});
 };
}
