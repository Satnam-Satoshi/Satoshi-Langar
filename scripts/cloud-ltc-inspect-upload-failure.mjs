import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DurableCloudState} from './cloud-ltc-state.mjs';
import {inspectPersistedOperations,createReadOnlyReleaseClients} from './cloud-ltc-reconcile.mjs';
import {createGoogleStateRuntime} from './cloud-ltc-google-runtime.mjs';
import {withGoogleCloudAuthorization} from './cloud-ltc-google-auth.mjs';
import {receiptHash as hash} from './cloud-ltc-acceptance-proof.mjs';
import {TARGET,verifyImplementation,acceptedSourceConfig} from './cloud-ltc-release.mjs';
const check=(value,code)=>{if(!value)throw Error(code);};
const digest=value=>/^[a-f0-9]{64}$/.test(value??'');
export function validateUploadInspectionContext(env){
 check(env.GITHUB_ACTIONS==='true'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_REPOSITORY===TARGET.repository&&env.GITHUB_ACTOR_ID==='268053325'&&env.LTC_ACCEPTANCE_ENVIRONMENT==='ltc-production'&&env.LTC_ACCEPTANCE_MANUAL==='true'&&env.LTC_ACCEPTANCE_MODE==='inspect-upload-failure'&&env.LTC_CLOUD_PUBLISH==='false','upload_inspection_manual_context_required');
 check(digest(env.LTC_ACCEPTED_IMPLEMENTATION_SHA256)&&digest(env.LTC_ACCEPTANCE_PLAN_SHA256)&&/^[a-f0-9]{40}$/.test(env.LTC_ACCEPTANCE_SOURCE_COMMIT??'')&&/^[1-9]\d*$/.test(env.LTC_ACCEPTANCE_FENCE??'')&&/^gha-[1-9]\d*-[1-9]\d*@[a-f0-9]{40}$/.test(env.LTC_ACCEPTANCE_ID??'')&&/^[1-9]\d*$/.test(env.GITHUB_RUN_ID??'')&&/^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT??'')&&env.LTC_ACCEPTANCE_ID?.split('@')[0]!==`gha-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`,'upload_inspection_exact_origin_required');
 check(Number.isSafeInteger(Number(env.LTC_ACCEPTANCE_FENCE))&&Number(env.LTC_ACCEPTANCE_FENCE)>0,'upload_inspection_exact_origin_required');
 for(const key of ['LTC_CLOUD_SOCIAL_PUBLISH','LTC_SOCIAL_CLOUD_PUBLISH','LTC_SOCIAL_PUBLISH'])check(env[key]===undefined||env[key]==='false','upload_inspection_social_gate_required');
}
/** Restrict every Google service request to GET. OAuth refresh is the sole POST. */
export function readOnlyGoogleFetch(fetcher){return(url,options={})=>{const u=new URL(url),method=options.method??'GET';check((method==='GET'&&((u.origin==='https://www.googleapis.com'&&u.pathname.startsWith('/drive/v3/files/'))||(u.origin==='https://docs.googleapis.com'&&/^\/v1\/documents\/[A-Za-z0-9_-]+$/.test(u.pathname))))||(method==='POST'&&u.href==='https://oauth2.googleapis.com/token'),'upload_inspection_transport_read_only');return fetcher(url,options);};}
export async function inspectFailedArtifactUploads({env,adapter,evidenceConfig,github,getAccessToken,fetcher,now=Date.now()}){
 validateUploadInspectionContext(env);
 const initial=await adapter.read('website');check(typeof initial.version==='string'&&initial.version.length>0,'upload_inspection_revision_required');
 const document=await new DurableCloudState({read:async()=>initial},'website').inspect(),fence=Number(env.LTC_ACCEPTANCE_FENCE),lease=document.lease;
 check(hash(document)===env.LTC_ACCEPTANCE_PLAN_SHA256&&document.paused===true&&document.restoreHold===false&&document.fence===fence&&lease?.fence===fence&&lease.runId===env.LTC_ACCEPTANCE_ID.split('@')[0]&&!document.latestRelease&&document.nextFreshGeneration?.status==='pending-first-proof'&&document.nextFreshGeneration.routineEnabled===false&&document.stagedDailyRetirement?.context?.controllerSource===env.LTC_ACCEPTANCE_SOURCE_COMMIT,'upload_inspection_snapshot_changed');
 const current=Object.values(document.intents).filter(i=>i.fence===fence),uncertain=current.filter(i=>i.status==='uncertain');
 check(current.length>0&&current.length<=64&&uncertain.length===1&&Object.values(document.intents).every(i=>i.fence===fence||['confirmed','not-applied'].includes(i.status)),'upload_inspection_operation_scope_changed');
 const index=uncertain[0].payload?.artifactBundleIndex;
 check(current.every(i=>i.runId===lease.runId&&i.payload?.kind==='drive-evidence'&&i.payload.role==='release-artifacts'&&i.payload.folderId===evidenceConfig.folderId&&i.payload.artifactBundleCount===current.length&&i.payload.artifactPackageManifestSha256===uncertain[0].payload.artifactPackageManifestSha256&&i.payload.generation===uncertain[0].payload.generation&&i.payloadSha256===hash(i.payload)&&Number.isInteger(i.payload.artifactBundleIndex)&&i.payload.artifactBundleIndex>=0&&i.payload.artifactBundleIndex<current.length&&i.status===(i.payload.artifactBundleIndex<index?'confirmed':i.payload.artifactBundleIndex===index?'uncertain':'pending'))&&new Set(current.map(i=>i.payload.artifactBundleIndex)).size===current.length,'upload_inspection_operation_scope_changed');
 const [,runId,attempt]=lease.runId.split('-'),origin=await github(`/actions/runs/${runId}/attempts/${attempt}`);
 check(String(origin.id)===runId&&String(origin.run_attempt)===attempt&&origin.status==='completed'&&['failure','cancelled','timed_out'].includes(origin.conclusion)&&origin.event==='workflow_dispatch'&&origin.head_branch==='main'&&origin.head_sha===env.LTC_ACCEPTANCE_ID.split('@')[1]&&origin.repository?.full_name===TARGET.repository&&origin.path==='.github/workflows/ltc-daily-publication.yml'&&String(origin.actor?.id)==='268053325'&&Number.isFinite(Date.parse(origin.updated_at))&&Date.parse(origin.updated_at)<=now,'upload_inspection_origin_not_failed');
 const forbidden=async()=>{throw Error('upload_inspection_unexpected_provider');};
 const result=await inspectPersistedOperations({state:new DurableCloudState({read:async()=>initial},'website'),github:forbidden,vercel:forbidden,evidenceConfig,getAccessToken,fetcher:readOnlyGoogleFetch(fetcher),directory:'/unused-read-only-upload-inspection',readProtected:forbidden,readPublic:forbidden});
 check(result.results.length===current.filter(i=>i.status!=='confirmed').length&&result.results.filter(i=>i.observed==='not-authorized').length===current.filter(i=>i.status==='pending').length&&result.results.filter(i=>i.durableStatus==='uncertain').length===1,'upload_inspection_result_scope_changed');
 const after=await adapter.read('website');check(after.version===initial.version&&hash(after.value)===hash(document),'upload_inspection_concurrent_state_change');
 return{...result,mode:'inspect-upload-failure',status:'read-only-upload-inspection-complete',snapshotSha256:hash(document),fence,origin:{runId,attempt},observedAt:new Date(now).toISOString(),uncertain:result.results.filter(i=>i.durableStatus==='uncertain'),pendingNotAuthorized:current.filter(i=>i.status==='pending').length,confirmedRetained:current.filter(i=>i.status==='confirmed').length,paused:true,leaseHeld:true,stateChanged:false,effectsReissued:false,publicationPerformed:false,routineEnabled:false};
}
export async function runUploadInspection(options,env=process.env,deps={}){
 validateUploadInspectionContext(env);
 const root=options.root??process.cwd(),verify=deps.verifyImplementation??verifyImplementation;
 await verify(root,env.LTC_ACCEPTED_IMPLEMENTATION_SHA256); // BEFORE config, runtime or credentials.
 const git=deps.git??(args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim());
 git(['merge-base','--is-ancestor',env.LTC_ACCEPTANCE_SOURCE_COMMIT,'HEAD']);
 const read=deps.read??(async file=>JSON.parse(await readFile(file,'utf8'))),selected=acceptedSourceConfig(await read(path.join(root,'config/ltc-cloud-source.json')));
 check(selected.repository===TARGET.repository&&selected.branch===env.LTC_SOURCE_BRANCH,'upload_inspection_source_changed');
 const config=await read(options.stateConfig),evidenceConfig=await read(options.evidenceConfig);
 check((config.ledgerKey??'website')==='website'&&config.folderId===evidenceConfig.folderId,'upload_inspection_resources_changed');
 const fetcher=readOnlyGoogleFetch(deps.fetcher??fetch),runtime=await(deps.runtime??createGoogleStateRuntime)({config,env,fetchImpl:fetcher}),clients=createReadOnlyReleaseClients({env,fetcher:deps.fetcher??fetch});
 const result=await inspectFailedArtifactUploads({env,adapter:{read:key=>runtime.stateAdapter.read(key)},evidenceConfig,github:deps.github??clients.github,getAccessToken:()=>withGoogleCloudAuthorization({env,fetchImpl:fetcher},access=>access.LTC_GOOGLE_ACCESS_TOKEN),fetcher});
 await(deps.save??(value=>writeFile(options.receipt,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600})))(result);
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)Promise.resolve().then(async()=>{
 const options={};for(let n=2;n<process.argv.length;n+=2){const key={'--state-config':'stateConfig','--evidence-config':'evidenceConfig','--receipt':'receipt'}[process.argv[n]];check(key&&!options[key]&&process.argv[n+1],'upload_inspection_arguments_required');options[key]=path.resolve(process.argv[n+1]);}check(Object.keys(options).length===3&&new Set(Object.values(options)).size===3,'upload_inspection_arguments_required');
 const result=await runUploadInspection(options);console.log(JSON.stringify({mode:result.mode,status:result.status,fence:result.fence,observed:result.uncertain[0].observed,diagnostic:result.uncertain[0].diagnostic,pendingNotAuthorized:result.pendingNotAuthorized,stateChanged:false,effectsReissued:false,publicationPerformed:false,paused:true,leaseHeld:true}));
}).catch(()=>{console.error('upload_failure_read_only_inspection_withheld');process.exitCode=1;});
