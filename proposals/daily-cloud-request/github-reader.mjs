import {createHash} from 'node:crypto';
import {REPO} from './daily-request.mjs';
const base=`https://api.github.com/repos/${REPO}`;
const active=['in_progress','queued','requested','waiting','pending'];
const sha=s=>/^[a-f0-9]{40}$/.test(s||'');
// Draft transport. Does not find/read credentials or execute requests on import.
export function githubReader({token,fetchImpl=fetch}){
 if(typeof token!=='string'||!token)throw Error('token_required');
 const get=async path=>{const r=await fetchImpl(base+path,{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'}});if(r.status!==200)throw Error('github_read_failed');const text=await r.text();if(Buffer.byteLength(text)>2000000)throw Error('response_too_large');return JSON.parse(text);};
 return Object.freeze({
  async verifyTarget(){
   const f=await get('/contents/.github/workflows/ltc-daily-publication.yml?ref=main');
   if(f.type!=='file'||f.path!=='.github/workflows/ltc-daily-publication.yml'||f.encoding!=='base64'||typeof f.content!=='string')throw Error('target_workflow_identity');
   const bytes=Buffer.from(f.content,'base64');
   if(createHash('sha256').update(bytes).digest('hex')!=='0a53edfb0e1a290362736e00f19b7aa9a31c870828ccdcd973c5e601cd235f79')throw Error('target_workflow_changed');
   return true;
  },
  async issue(number){if(!Number.isSafeInteger(number)||number<=0)throw Error('issue_number');return get(`/issues/${number}`);},
  async source(){const r=await get('/git/ref/heads/agent/wall-street-20261011');if(r.ref!=='refs/heads/agent/wall-street-20261011'||r.object?.type!=='commit'||!sha(r.object.sha))throw Error('source_identity');return r.object.sha;},
  async excludeProvenSelf(runs,context){
   if(!Array.isArray(runs)||!Number.isSafeInteger(context?.runId)||context.runId<=0||context.attempt!==1||!sha(context.workflowSha))throw Error('self_context');
   const self=await get(`/actions/runs/${context.runId}`);
   if(self.id!==context.runId||self.run_attempt!==1||self.repository?.full_name!==REPO||self.path!=='.github/workflows/ltc-daily-cloud-request.yml'||self.event!=='issues'||self.head_branch!=='main'||self.head_sha!==context.workflowSha||self.actor?.id!==268053325||!active.includes(self.status))throw Error('self_identity');
   if(runs.filter(r=>r.id===context.runId).length>1)throw Error('self_duplicate');
   return runs.filter(r=>r.id!==context.runId);
  },
  async activeRuns(){
   const found=new Map();
   for(const status of active){let expected,total=0;
    for(let page=1;page<=10;page++){
     const b=await get(`/actions/runs?status=${status}&per_page=100&page=${page}`);
     if(!Number.isSafeInteger(b.total_count)||b.total_count<0||b.total_count>=1000||!Array.isArray(b.workflow_runs)||b.workflow_runs.length>100)throw Error('run_listing_incomplete');
     if(expected!==undefined&&b.total_count!==expected)throw Error('run_listing_changed');expected=b.total_count;
     for(const r of b.workflow_runs){if(!Number.isSafeInteger(r.id)||r.id<=0||r.status!==status||r.repository?.full_name!==REPO)throw Error('run_identity');if(found.has(r.id))throw Error('run_listing_changed');found.set(r.id,r);total++;}
     if(total===expected)break;
     if(b.workflow_runs.length!==100||total>expected||page===10)throw Error('run_listing_incomplete');
    }
   }
   // Conservative: block on ALL repository active runs, not a fragile workflow allowlist.
   // Future active dispatcher must explicitly prove/exclude only its own run identity.
   return [...found.values()];
  }
 });
}
