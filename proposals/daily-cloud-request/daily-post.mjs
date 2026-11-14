import {REPO} from './daily-request.mjs';
// Fixed target and body. No arbitrary URL, ref, action or acceptance mode accepted.
export function dailyPost({token,fetchImpl=fetch}){
 if(typeof token!=='string'||!token)throw Error('token_required');
 return async()=>{
  const r=await fetchImpl(`https://api.github.com/repos/${REPO}/actions/workflows/ltc-daily-publication.yml/dispatches`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json'},body:JSON.stringify({ref:'main',inputs:{dry_run:'false',acceptance_probe:'false',bootstrap_previous_manifest:'false',acceptance_mode:'none'}})});
  return r.status===204;
 };
}
