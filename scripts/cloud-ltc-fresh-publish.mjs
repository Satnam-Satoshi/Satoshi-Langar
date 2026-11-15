import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';import path from 'node:path';
import {f33Digest} from './cloud-ltc-f33-fresh-admission.mjs';
import {createWorkflowExclusion} from './cloud-ltc-f33-workflow-exclusion.mjs';
import {createGoogleStateRuntime} from './cloud-ltc-google-runtime.mjs';
import {apiClients,runRelease,verifyImplementation} from './cloud-ltc-release.mjs';
const check=(v,c)=>{if(!v)throw Error('fresh_publisher_'+c);};
export async function runFreshPublisher({env=process.env,root=process.cwd(),dryRun=false}={}){
 check(env.GITHUB_REPOSITORY==='Satnam-Satoshi/Satoshi-Langar'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_RUN_ATTEMPT==='1','context');
 check(dryRun||env.LTC_FRESH_PUBLISH_ENABLED==='true','disabled');
 await verifyImplementation(root,env.LTC_ACCEPTED_IMPLEMENTATION_SHA256);
 const receipt=path.join(env.RUNNER_TEMP,'ltc-fresh-receipt.json');
 if(dryRun)return runRelease({publish:false,root,receipt,expected:env.LTC_ACCEPTED_IMPLEMENTATION_SHA256},env);
 const input=JSON.parse(env.LTC_F33_FRESH_RUNTIME_JSON??'null');
 check(input && f33Digest(input)===env.LTC_F33_FRESH_RUNTIME_SHA256,'review');
 const admission=input.admission;
 check(f33Digest(admission)===env.LTC_F33_FRESH_ADMISSION_SHA256&&admission.implementationSha256===env.LTC_ACCEPTED_IMPLEMENTATION_SHA256,'admission');
 const source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const config={...input.exclusion,runId:env.GITHUB_RUN_ID,workflowSha:env.GITHUB_SHA,sourceSha:source,
  workflowPath:'.github/workflows/ltc-fresh-daily-publication.yml'};
 check(config.newWorkflows.some(w=>w.id===config.workflowId&&w.path===config.workflowPath),'new_workflow');
 const {github}=apiClients(env);let localStop=false,proof;
 const barrier=createWorkflowExclusion({config,readGitHub:s=>github('/'+s),assertLocalStop:()=>localStop});
 const runtime=await createGoogleStateRuntime({config:input.ledgerConfig,env,f33Admission:admission,beforeWrite:()=>{check(proof&&Date.now()<proof.expiresAt&&localStop,'exclusion_expired');}});
 const verify=async()=>{
  const {value}=await runtime.stateAdapter.read('website'),r=value?.f33Retirement;
  check(r&&f33Digest(r)===admission.retirementSha256&&value.f33FreshAdmission?.configurationSha256===f33Digest(admission),'ledger_binding');
  // Durable owner-maintains-stop instruction is part of the protected cutover
  // review; the original observed stop evidence is retained verbatim, not redated.
  localStop=input.ownerMaintainsLocalStop===true&&r.evidence?.controls?.localPublisherDisabled===true&&
    r.evidence.controls.otherWritersStopped===true&&r.evidence.controls.writerEvidenceSha256===input.localStopEvidenceSha256;
  proof=await barrier.refresh();
 };
 await verify();
 const originalWrite=runtime.stateAdapter.conditionalWrite.bind(runtime.stateAdapter);
 runtime.stateAdapter.conditionalWrite=async(...args)=>{if(!proof||Date.now()>proof.expiresAt-60000)await verify();return originalWrite(...args);};
 const stateFile=path.join(env.RUNNER_TEMP,'ltc-fresh-state.json'),evidenceFile=path.join(env.RUNNER_TEMP,'ltc-fresh-evidence.json');
 await writeFile(stateFile,JSON.stringify(input.ledgerConfig),{mode:0o600,flag:'wx'});
 await writeFile(evidenceFile,JSON.stringify(input.evidenceConfig),{mode:0o600,flag:'wx'});
 return runRelease({publish:true,root,receipt,expected:env.LTC_ACCEPTED_IMPLEMENTATION_SHA256,stateConfig:stateFile,evidenceConfig:evidenceFile},
  {...env,LTC_CLOUD_PUBLISH:'true'}, {beforeProviderMutation:verify,createStateRuntime:async()=>runtime});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 check(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--dry-run'),'arguments');
 Promise.resolve().then(()=>runFreshPublisher({dryRun:process.argv[2]==='--dry-run'})).then(r=>console.log(JSON.stringify({status:r.status,published:r.published,edition:r.edition})),()=>{console.error('fresh_publisher_withheld');process.exitCode=1;});
}
