// Native-gated, categorical read-only readiness check. No credentials or private
// document contents leave the runner; no mutation API is permitted by transport.
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {verifyImplementation} from './cloud-ltc-release.mjs';
import {createF33FreshProvider} from './cloud-ltc-f33-fresh-provider.mjs';
import {preflightFreshPublication} from './cloud-ltc-f33-fresh-preflight.mjs';
import {f33Digest} from './cloud-ltc-f33-fresh-admission.mjs';
const check=(v,c)=>{if(!v)throw Error(c);};
export function readonlyGoogleTransport(fetchImpl=fetch){return async(url,options={})=>{
 const u=new URL(url),method=(options.method??'GET').toUpperCase();
 const token=u.href==='https://oauth2.googleapis.com/token'&&method==='POST';
 const read=u.protocol==='https:'&&['www.googleapis.com','docs.googleapis.com'].includes(u.hostname)&&method==='GET';
 check(!u.username&&!u.password&&!u.hash&&(token||read),'mutation_transport_denied');
 return fetchImpl(url,{...options,redirect:'error'});
};}
export async function runReadOnlyPreflight({env=process.env,root=process.cwd(),fetchImpl=fetch,verify=verifyImplementation,providerFactory=createF33FreshProvider,preflight=preflightFreshPublication,git=argv=>execFileSync('git',argv,{cwd:root,encoding:'utf8'}).trim(),now=Date.now()}={}){
 let phase='context';
 try{
 check(env.GITHUB_REPOSITORY==='Satnam-Satoshi/Satoshi-Langar'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_ACTOR_ID==='268053325'&&env.GITHUB_RUN_ATTEMPT==='1'&&env.LTC_F33_PREFLIGHT_MODE==='read-only-preflight','context');
 phase='implementation';await verify(root,env.LTC_ACCEPTED_IMPLEMENTATION_SHA256);
 phase='protected-review';check(env.LTC_F33_ACTIVATION_REVIEW_JSON&&env.LTC_F33_ACTIVATION_REVIEW_SHA256,'missing');
 const input=JSON.parse(env.LTC_F33_ACTIVATION_REVIEW_JSON);check(f33Digest(input)===env.LTC_F33_ACTIVATION_REVIEW_SHA256,'binding');
 const source=git(['rev-parse','HEAD']);check(input.admission?.sourceCommit===source&&input.admission.implementationSha256===env.LTC_ACCEPTED_IMPLEMENTATION_SHA256,'source');
 phase='protected-migration';check(env.LTC_MIGRATION_ACCEPTANCE_JSON&&env.LTC_MIGRATION_ACCEPTANCE_SHA256,'missing');
 const migration=JSON.parse(env.LTC_MIGRATION_ACCEPTANCE_JSON);check(f33Digest(migration)===env.LTC_MIGRATION_ACCEPTANCE_SHA256,'binding');
 phase='selected-private-read';const {readState,readFinishedReceipt}=await providerFactory({...input,env,fetchImpl:readonlyGoogleTransport(fetchImpl)});
 const snapshot=await readState(),receipt=await readFinishedReceipt();
 phase='publication-controls';const policy=JSON.parse(await readFile(path.join(root,'config/ltc-publication.json'),'utf8'));
 // Do not invent or rewrite admission fields, independent pins or policy values.
 phase='exact-real-bundle';preflight({snapshot:snapshot.value,receipt,admission:input.admission,migration,policy,env,now});
 return {status:'read-only-preflight-passed',publicationPerformed:false,providerWrites:0,activationAuthorized:false};
 }catch{return {status:'read-only-preflight-blocked',phase,publicationPerformed:false,providerWrites:0,activationAuthorized:false};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 runReadOnlyPreflight().then(r=>{console.log(JSON.stringify(r));if(r.status!=='read-only-preflight-passed')process.exitCode=1;},()=>{console.error('read-only-preflight-failed');process.exitCode=1;});
}
