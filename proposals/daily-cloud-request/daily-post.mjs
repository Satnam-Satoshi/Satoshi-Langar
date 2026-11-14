import {REPO} from './daily-request.mjs';
// Fixed target and body. No arbitrary URL, ref, action or acceptance mode accepted.
export function dailyPost({token,fetchImpl=fetch,verifyTarget,clock=Date.now}){
 if(typeof verifyTarget!=='function')throw Error('target_verifier_required');
 if(typeof token!=='string'||!token)throw Error('token_required');
 return async admission=>{
  if(await verifyTarget()!==true)throw Error('target_workflow_unverified');
  const now=clock(),date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  if(!Number.isFinite(admission?.expiresAt)||now>=admission.expiresAt||!Number.isFinite(admission.observedAt)||now<admission.observedAt||now-admission.observedAt>60000||admission.date!==date)throw Error('admission_expired_before_post');
  const r=await fetchImpl(`https://api.github.com/repos/${REPO}/actions/workflows/ltc-daily-publication.yml/dispatches`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json'},body:JSON.stringify({ref:'main',inputs:{dry_run:'false',acceptance_probe:'false',bootstrap_previous_manifest:'false',acceptance_mode:'none'}})});
  return r.status===204;
 };
}
