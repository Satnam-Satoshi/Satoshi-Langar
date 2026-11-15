const repo='Satnam-Satoshi/Satoshi-Langar';
const gate='ltc-receipt-owner-approval';
const check=(v,c)=>{if(!v)throw Error('bootstrap_native_'+c);};
const sha=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v);
export function validateNativeBootstrapApproval({config:c,run,jobs,approvals,now}){
 check(c&&/^[1-9][0-9]{0,19}$/.test(c.runId)&&sha(c.workflowSha,40)&&sha(c.sourceSha,40)&&c.executedSourceSha===c.sourceSha&&Number.isSafeInteger(c.environmentId)&&c.environmentId>0,'config');
 check(c.workflowPath==='.github/workflows/ltc-readonly-recovery.yml','path');
 check(Number.isFinite(now),'clock');
 check(String(run?.id)===c.runId&&run.run_attempt===1&&run.repository?.full_name===repo&&run.event==='workflow_dispatch'&&run.head_branch==='main'&&run.head_sha===c.workflowSha&&run.path===c.workflowPath&&run.status==='in_progress','run');
 check(jobs?.total_count===2&&Array.isArray(jobs.jobs)&&jobs.jobs.length===2,'jobs');
 const gateJob=jobs.jobs.find(j=>j.name==='owner-approval');
 const createJob=jobs.jobs.find(j=>j.name==='inspect-private-recovery-once');
 check(gateJob&&createJob&&gateJob.id!==createJob.id,'job_names');
 for(const j of jobs.jobs)check(String(j.run_id)===c.runId&&j.run_attempt===1&&j.head_sha===c.workflowSha,'job_binding');
 check(gateJob.status==='completed'&&gateJob.conclusion==='success'&&createJob.status==='in_progress'&&createJob.conclusion===null,'job_status');
 check(Array.isArray(approvals)&&approvals.length>0&&approvals.length<=20,'reviews');
 const relevant=approvals.filter(a=>Array.isArray(a?.environments)&&a.environments.some(e=>e.name===gate||e.id===c.environmentId));
 check(relevant.length===1,'review_conflict');
 const a=relevant[0];
 check(a.state==='approved'&&a.user?.id===268053325&&a.user.type==='User'&&a.environments.length===1&&a.environments[0].name===gate&&a.environments[0].id===c.environmentId,'owner_approval');
 return Object.freeze({runId:c.runId,observedAt:now,expiresAt:now+300000});
}
// Trusted reviewed workflow verifies checkout/manifest before constructing this
// reader. API evidence does not independently prove executed source or settings.
export function createNativeInspectionApprovalReader({config,token,fetchImpl=fetch,clock=Date.now,timeoutMs=10000}){
 check(typeof token==='string'&&token.length>0&&typeof fetchImpl==='function'&&typeof clock==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=10&&timeoutMs<=30000,'config');
 const c=Object.freeze({...config}),fetcher=fetchImpl;
 check(/^[1-9][0-9]{0,19}$/.test(c.runId),'run_id');
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
  const run=await get(`actions/runs/${c.runId}`);
  const jobs=await get(`actions/runs/${c.runId}/attempts/1/jobs?per_page=100`);
  const approvals=await get(`actions/runs/${c.runId}/approvals`);
  const ended=clock();check(Number.isFinite(ended)&&ended>=started&&ended-started<30000,'stale');
  return validateNativeBootstrapApproval({config:c,run,jobs,approvals,now:started});
 };
}
