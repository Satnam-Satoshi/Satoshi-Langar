import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const REPO='Satnam-Satoshi/Satoshi-Langar', OWNER=268053325, BRANCH='agent/wall-street-20261011';
const TITLE='[LTC cloud request] software plan';
export function validate(event, fresh, branchSha, attempt='1') {
  const user=u=>u?.id===OWNER && u?.login==='Satnam-Satoshi' && u?.type==='User';
  if(attempt!=='1'||event.action!=='opened'||event.repository?.full_name!==REPO||!user(event.sender)) throw Error('event_not_authorized');
  const old=event.issue;
  if(!old||old.pull_request||!Number.isSafeInteger(old.number)||!user(old.user)||old.author_association!=='OWNER')throw Error('issue_not_authorized');
  if(!fresh||fresh.id!==old.id||fresh.number!==old.number||fresh.pull_request||fresh.state!=='open'||!user(fresh.user)||fresh.author_association!=='OWNER')throw Error('live_issue_not_authorized');
  if(old.title!==TITLE||fresh.title!==TITLE||fresh.body!==old.body||fresh.created_at!==fresh.updated_at||old.created_at!==old.updated_at)throw Error('request_changed');
  if(typeof fresh.body!=='string'||Buffer.byteLength(fresh.body)>512)throw Error('request_size');
  let request;try{request=JSON.parse(fresh.body);}catch{throw Error('request_json');}
  if(!request||Array.isArray(request)||Object.keys(request).sort().join(',')!=='implementation_sha256,source_commit')throw Error('request_keys');
  if(!/^[a-f0-9]{40}$/.test(request.source_commit)||!/^[a-f0-9]{64}$/.test(request.implementation_sha256))throw Error('request_identity');
  if(request.source_commit!==branchSha)throw Error('source_not_current');
  return {workflow:'ltc-software-release.yml',ref:'main',inputs:{...request,publish:'false'}};
}
export async function run(env=process.env, fetchImpl=fetch) {
  if(env.GITHUB_REPOSITORY!==REPO||env.GITHUB_EVENT_NAME!=='issues'||env.GITHUB_REF!=='refs/heads/main')throw Error('context_not_authorized');
  const event=JSON.parse(readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
  if(event.sender?.id!==OWNER||event.action!=='opened'||!Number.isSafeInteger(event.issue?.number))throw Error('event_not_authorized');
  const base='https://api.github.com/repos/'+REPO;
  const headers={Authorization:'Bearer '+env.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'};
  const get=async path=>{const res=await fetchImpl(base+path,{headers,redirect:'error'});if(!res.ok)throw Error('read_failed');return res.json();};
  const fresh=await get('/issues/'+event.issue.number);
  const branch=await get('/git/ref/heads/'+BRANCH);
  const request=validate(event,fresh,branch.object?.sha,env.GITHUB_RUN_ATTEMPT);
  // One request, no automatic retry. Ambiguous delivery requires manual reconciliation.
  const response=await fetchImpl(base+'/actions/workflows/'+request.workflow+'/dispatches',{method:'POST',headers:{...headers,'Content-Type':'application/json'},redirect:'error',body:JSON.stringify({ref:request.ref,inputs:request.inputs})});
  if(!response.ok)throw Error('dispatch_not_confirmed');
  console.log('Credential-free software plan dispatch accepted; no publication requested.');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)run().catch(()=>{console.error('Request rejected or dispatch not confirmed; inspect this run before any new request.');process.exitCode=1;});
