// INACTIVE DRAFT. Requires explicit activation flag and exact reviewed runtime checkout.
import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {REPO} from './daily-request.mjs';import {githubReader} from './github-reader.mjs';import {dailyPost} from './daily-post.mjs';import {googleBindings} from './google-bindings.mjs';import {createDailyRequestRuntime} from './runtime.mjs';
const PIN='484c239c8d6eb48aeee37212fc85307a0f908195';
export async function main(env=process.env){
 if(env.LTC_DAILY_REQUEST_ENABLED!=='true'||env.LTC_CLOUD_PUBLISH!=='true')throw Error('entrypoint_not_enabled');
 if(env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_EVENT_NAME!=='issues'||env.GITHUB_ACTOR_ID!=='268053325'||env.GITHUB_RUN_ATTEMPT!=='1')throw Error('trusted_owner_context_required');
 const event=JSON.parse(readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
 if(event.action!=='opened'||event.sender?.id!==268053325||event.issue?.title!=='[LTC cloud request] daily publication')throw Error('event_not_authorized');
 const root=resolve('reviewed-runtime');
 const git=args=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 if(git(['rev-parse','HEAD'])!==PIN||git(['status','--porcelain=v1','--untracked-files=all']))throw Error('immutable_runtime_required');
 const module=async name=>import(pathToFileURL(resolve(root,'scripts',name)).href);
 const [{createGoogleStateRuntime},{DurableCloudState},{assertDailyPublicationAvailable,DailyPublicationComplete}]=await Promise.all([module('cloud-ltc-google-runtime.mjs'),module('cloud-ltc-state.mjs'),module('cloud-ltc-daily-admission.mjs')]);
 const bound=await googleBindings({folderId:env.LTC_STATE_FOLDER_ID,publicationDocumentId:env.LTC_STATE_DOCUMENT_ID,requestDocumentId:env.LTC_DAILY_REQUEST_DOCUMENT_ID,createGoogleStateRuntime,DurableCloudState,env,requestWritesAuthorized:true});
 const reader=githubReader({token:env.GITHUB_TOKEN});
 const self={runId:Number(env.GITHUB_RUN_ID),attempt:1,workflowSha:env.GITHUB_SHA};
 const service=createDailyRequestRuntime({...bound,reader,assertDailyPublicationAvailable,DailyPublicationComplete,post:dailyPost({token:env.GITHUB_TOKEN,verifyTarget:()=>reader.verifyTarget()}),excludeProvenSelf:runs=>reader.excludeProvenSelf(runs,self)});
 const result=await service.handle({event,context:{repository:REPO,ref:env.GITHUB_REF,event:env.GITHUB_EVENT_NAME,attempt:1}});
 console.log(JSON.stringify({status:result.status,posted:result.posted,publicationVerified:false}));
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('Cloud daily request withheld or uncertain. Inspect run and durable request record before another request.');process.exitCode=1;});
