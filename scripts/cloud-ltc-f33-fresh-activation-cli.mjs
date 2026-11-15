import {writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import path from 'node:path';import {pathToFileURL} from 'node:url';
import {f33Digest} from './cloud-ltc-f33-fresh-admission.mjs';
import {executeF33FreshActivation} from './cloud-ltc-f33-fresh-activation.mjs';
import {createF33FreshProvider} from './cloud-ltc-f33-fresh-provider.mjs';
import {createWorkflowExclusion} from './cloud-ltc-f33-workflow-exclusion.mjs';
import {apiClients,verifyImplementation,verifyPublicDomains,TARGET} from './cloud-ltc-release.mjs';
import {loadPreviousReleaseManifest} from './cloud-ltc-production.mjs';
import {assertVercelProjectPolicy,assertVercelDeploymentIdentity} from './cloud-ltc-release-providers.mjs';
const check=(v,c)=>{if(!v)throw Error('fresh_activation_cli_'+c);};
export async function runFreshActivation({env=process.env,root=process.cwd()}={}){
 check(env.LTC_F33_ACTIVATION_ENABLED==='true'&&env.GITHUB_REPOSITORY==='Satnam-Satoshi/Satoshi-Langar'&&
  env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_RUN_ATTEMPT==='1'&&env.GITHUB_EVENT_NAME==='workflow_dispatch','context');
 await verifyImplementation(root,env.LTC_ACCEPTED_IMPLEMENTATION_SHA256);
 const input=JSON.parse(env.LTC_F33_ACTIVATION_REVIEW_JSON??'null');
 check(input&&f33Digest(input)===env.LTC_F33_ACTIVATION_REVIEW_SHA256,'review');
 const source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 check(input.admission.sourceCommit===source&&input.admission.implementationSha256===env.LTC_ACCEPTED_IMPLEMENTATION_SHA256,'source');
 const exclusionConfig={...input.exclusion,runId:env.GITHUB_RUN_ID,workflowSha:env.GITHUB_SHA,sourceSha:source,
  workflowPath:'.github/workflows/ltc-f33-fresh-activation.yml'};
 const configuration={...input.admission,ownerRunId:env.GITHUB_RUN_ID,ownerAttempt:1,writerExclusionSha256:f33Digest(exclusionConfig)};
 const native={runId:env.GITHUB_RUN_ID,workflowSha:env.GITHUB_SHA,sourceSha:source,executedSourceSha:source,environmentId:27323462394,
  workflowPath:exclusionConfig.workflowPath,expectedAdmissionSha256:f33Digest(configuration)};
 const provider=await createF33FreshProvider({...input,env});
 const {github,vercel}=apiClients(env);let localStop=false;
 const barrier=createWorkflowExclusion({config:exclusionConfig,readGitHub:s=>github('/'+s),assertLocalStop:()=>localStop});
 const acquireExclusion=async binding=>{
  const snapshot=await provider.readState(),r=snapshot.value?.f33Retirement;
  localStop=exclusionConfig.ownerMaintainsLocalStop===true&&r&&f33Digest(r)===configuration.retirementSha256&&
    r.evidence?.controls?.localPublisherDisabled===true&&r.evidence.controls.otherWritersStopped===true&&
    r.evidence.controls.writerEvidenceSha256===exclusionConfig.localStopEvidenceSha256;
  return barrier.acquire(binding);
 };
 const verifyPublicPointers=async(expected)=>{
  const project=await vercel(`/v9/projects/${TARGET.project}`);assertVercelProjectPolicy(project,TARGET);
  for(const domain of TARGET.domains){const deployment=await vercel(`/v13/deployments/${new URL(domain).hostname}`);assertVercelDeploymentIdentity(deployment,TARGET);check(deployment.id===expected,'public_changed');}
 };
 const verifyPublicBaseline=async(expected)=>{
  await verifyPublicPointers(expected);
  const manifest=await loadPreviousReleaseManifest({state:{inspect:async()=>(await provider.readState()).value},evidenceConfig:input.evidenceConfig,env});
  await verifyPublicDomains(manifest);
 };
 const saveResult=async result=>writeFile(path.join(env.RUNNER_TEMP,'ltc-f33-fresh-activation-result.json'),JSON.stringify({...result,configuration})+'\n',{mode:0o600,flag:'wx'});
 return executeF33FreshActivation({configuration,native,token:env.GITHUB_TOKEN},{...provider,verifyImplementation:(digest,sha)=>{check(sha===source,'source');return verifyImplementation(root,digest);},
  acquireExclusion,verifyPublicBaseline,verifyPublicPointers,saveResult});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 check(process.argv.length===2,'arguments');Promise.resolve().then(()=>runFreshActivation()).then(r=>{console.log(JSON.stringify(r));if(r.status!=='fresh-website-admission-verified')process.exitCode=1;},()=>{console.error('fresh_activation_withheld');process.exitCode=1;});
}
