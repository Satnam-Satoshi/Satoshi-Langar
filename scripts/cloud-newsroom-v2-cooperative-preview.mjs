/** Cooperative preview admission, NOT an independent signature or promotion grant.
 * The private coordinator's reviewed code pin and subsequent promotion checks are
 * authoritative. A repo writer can modify public state. This only admits a build.
 * Not wired into vercel.json; no production or scheduling effect.
 */
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {readCloudPreviewGrant,permitsCloudPreviewGrant} from './cloud-newsroom-v2-preview-grant.mjs';
export function planCooperativePreviewGrant({admission,candidateTreeGitSha,receiptSha256,reviewDigest,owner,fence,now}){
 const p=admission?.proposal;
 if(admission?.status!=='eligible-for-preview-review'||admission.errors?.length!==0||admission.promotionAuthorized!==false||admission.effects?.length!==0||!p||!Number.isSafeInteger(now))throw Error('verified_coordinator_admission_required');
 const end=Math.min(now+15*60_000,Date.parse(p.expiresAt));if(!Number.isFinite(end)||end<=now)throw Error('expired_coordinator_review');
 const grant={schemaVersion:1,generation:'cloud-newsroom-v2',kind:'preview-admission',mode:'cooperative-preview-only',productionAuthorized:false,promotionAuthorized:false,repository:'Satnam-Satoshi/Satoshi-Langar',branch:'agent/cloud-newsroom-v2-20261116',projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',candidateCommit:p.candidateCommit,candidateTreeGitSha,approvedCodeCommit:p.reviewedSourceCommit,receiptSha256,reviewDigest,owner,fence,notBefore:new Date(now).toISOString(),expiresAt:new Date(end).toISOString()};
 const env={VERCEL_PROJECT_ID:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_GIT_REPO_OWNER:'Satnam-Satoshi',VERCEL_GIT_REPO_SLUG:'Satoshi-Langar',VERCEL_GIT_COMMIT_REF:grant.branch,VERCEL_GIT_COMMIT_SHA:grant.candidateCommit};
 if(!permitsCloudPreviewGrant(grant,env,{head:grant.candidateCommit,tree:candidateTreeGitSha},now))throw Error('invalid_preview_grant_plan');
 return {status:'cooperative-preview-grant-plan',grant,effects:[],promotionAuthorized:false,independentAuthorization:false};
}
export async function evaluateCooperativePreview({env,git,now,fetcher}){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_TARGET_ENV!=='preview')return false;
 try{const state=await readCloudPreviewGrant(fetcher),g=state.previewGrant; if(state.schemaVersion!==1||state.generation!=='cloud-newsroom-v2'||state.enabled!==true||state.emergencyStop!==false||state.previewEnabled!==true||state.fence!==state.lease?.fence||!g||state.lease?.owner!==g.owner||state.lease?.fence!==g.fence||typeof state.lease?.expiresAt!=='string'||!Number.isFinite(Date.parse(state.lease.expiresAt))||Date.parse(state.lease.expiresAt)<=now)return false;return g.mode==='cooperative-preview-only'&&g.promotionAuthorized===false&&permitsCloudPreviewGrant(g,env,{head:git('HEAD'),tree:git('HEAD^{tree}')},now);}catch{return false;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const allow=await evaluateCooperativePreview({env:process.env,now:Date.now(),git:ref=>execFileSync('git',['rev-parse',ref],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()});
 console.log(allow?'ALLOW_V2_COOPERATIVE_PREVIEW':'SKIP_V2_COOPERATIVE_PREVIEW');
}
