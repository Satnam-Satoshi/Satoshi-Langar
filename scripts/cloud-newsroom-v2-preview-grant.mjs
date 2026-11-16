/** Provider-side preview gate backed by a separately issued short-lived grant.
 * Does not issue grants or authorize production. Repository/account writers can
 * change this code/state; independent coordinator review is the trust boundary.
 */
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {verify,createPublicKey} from 'node:crypto';
// Not activated: a separately approved cloud signer and reviewed public key are required.
export const TRUSTED_GRANT_PUBLIC_KEY = null;
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
export function verifySignedPreviewGrant(envelope,trustedPublicKey){
 try{
  if(!trustedPublicKey||envelope?.algorithm!=='Ed25519'||!envelope.payload||typeof envelope.signature!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(envelope.signature))return null;
  const signature=Buffer.from(envelope.signature,'base64');
  if(signature.length!==64||signature.toString('base64')!==envelope.signature)return null;
  const key=createPublicKey(trustedPublicKey);if(key.asymmetricKeyType!=='ed25519')return null;
  return verify(null,Buffer.from(canonical(envelope.payload)),key,signature)?envelope.payload:null;
 }catch{return null;}
}
export const PREVIEW_GRANT_URL='https://raw.githubusercontent.com/Satnam-Satoshi/Satoshi-Langar/refs/heads/agent/cloud-newsroom-v2-state/state/cloud-newsroom-v2.json';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
export function permitsCloudPreviewGrant(grant,env,observed,now){
 try{
  if(env.VERCEL_PROJECT_ID!=='prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx'||env.VERCEL_ENV!=='preview'||env.VERCEL_TARGET_ENV!=='preview'||env.VERCEL_GIT_REPO_OWNER!=='Satnam-Satoshi'||env.VERCEL_GIT_REPO_SLUG!=='Satoshi-Langar'||env.VERCEL_GIT_COMMIT_REF!=='agent/cloud-newsroom-v2-20261116')return false;
  if(!Number.isSafeInteger(now)||!grant||grant.schemaVersion!==1||grant.generation!=='cloud-newsroom-v2'||grant.kind!=='preview-admission'||grant.productionAuthorized!==false)return false;
  if(grant.repository!=='Satnam-Satoshi/Satoshi-Langar'||grant.branch!==env.VERCEL_GIT_COMMIT_REF||grant.projectId!=='prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx')return false;
  if(!SHA.test(grant.candidateCommit??'')||!SHA.test(grant.candidateTreeGitSha??'')||!SHA.test(grant.approvedCodeCommit??'')||!DIGEST.test(grant.receiptSha256??'')||!DIGEST.test(grant.reviewDigest??''))return false;
  if(grant.candidateCommit!==env.VERCEL_GIT_COMMIT_SHA||grant.candidateCommit!==observed.head||grant.candidateTreeGitSha!==observed.tree)return false;
  if(!Number.isSafeInteger(grant.fence)||grant.fence<1||typeof grant.owner!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(grant.owner))return false;
  const starts=Date.parse(grant.notBefore),ends=Date.parse(grant.expiresAt);
  if(!Number.isFinite(starts)||!Number.isFinite(ends)||ends<=starts||ends-starts>15*60_000||now<starts||now>=ends)return false;
  return true;
 }catch{return false;}
}
export async function readCloudPreviewGrant(fetcher=fetch){
 const r=await fetcher(PREVIEW_GRANT_URL,{redirect:'manual',signal:AbortSignal.timeout(5000),headers:{accept:'application/json','cache-control':'no-cache'}});
 if(r.status!==200||!r.body||Number(r.headers.get('content-length')??0)>32768)throw Error('preview-grant-unavailable');
 const reader=r.body.getReader(),chunks=[];let size=0;
 try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768)throw Error('preview-grant-oversize');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function evaluateCloudPreviewGrant({env,git,now,fetcher,trustedPublicKey}){
 // Do not fetch state for production or unknown callers.
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_TARGET_ENV!=='preview')return false;
 try{const payload=verifySignedPreviewGrant(await readCloudPreviewGrant(fetcher),trustedPublicKey);return payload!==null&&permitsCloudPreviewGrant(payload,env,{head:git('HEAD'),tree:git('HEAD^{tree}')},now);}catch{return false;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const allow=await evaluateCloudPreviewGrant({env:process.env,now:Date.now(),trustedPublicKey:TRUSTED_GRANT_PUBLIC_KEY,git:ref=>execFileSync('git',['rev-parse',ref],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()});
 console.log(allow?'ALLOW_V2_GRANTED_PREVIEW':'SKIP_V2_GRANTED_PREVIEW');
}
