import {readFile,lstat,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';import {pathToFileURL} from 'node:url';
const check=(v,c)=>{if(!v)throw Error('retirement_cli_'+c);};
const hash=v=>createHash('sha256').update(v).digest('hex');
export const RETIREMENT_SOURCE_FILES=Object.freeze(["scripts/cloud-ltc-acceptance-proof.mjs", "scripts/cloud-ltc-acceptance.mjs", "scripts/cloud-ltc-artifacts.mjs", "scripts/cloud-ltc-daily-admission.mjs", "scripts/cloud-ltc-docs-state.mjs", "scripts/cloud-ltc-evidence.mjs", "scripts/cloud-ltc-f33-evidence-bridge.mjs", "scripts/cloud-ltc-f33-executor.mjs", "scripts/cloud-ltc-f33-full-readonly.mjs", "scripts/cloud-ltc-f33-integrated-execution.mjs", "scripts/cloud-ltc-f33-provider-adapters.mjs", "scripts/cloud-ltc-f33-readonly.mjs", "scripts/cloud-ltc-f33-retirement-cli.mjs", "scripts/cloud-ltc-f33-retirement-plan.mjs", "scripts/cloud-ltc-f33-retirement-readers.mjs", "scripts/cloud-ltc-f33-retirement-record.mjs", "scripts/cloud-ltc-f33-writer-barrier.mjs", "scripts/cloud-ltc-f33-stop-attestation.mjs", "scripts/cloud-ltc-generation.mjs", "scripts/cloud-ltc-google-auth.mjs", "scripts/cloud-ltc-google-client.mjs", "scripts/cloud-ltc-google-runtime.mjs", "scripts/cloud-ltc-migration-gate.mjs", "scripts/cloud-ltc-native-retirement-authority.mjs", "scripts/cloud-ltc-operations.mjs", "scripts/cloud-ltc-production.mjs", "scripts/cloud-ltc-promotion-runtime.mjs", "scripts/cloud-ltc-receipt-provenance-lookup.mjs", "scripts/cloud-ltc-receipt-provenance.mjs", "scripts/cloud-ltc-reconcile.mjs", "scripts/cloud-ltc-recovery-doc-parser.mjs", "scripts/cloud-ltc-rehearsal.mjs", "scripts/cloud-ltc-release-providers.mjs", "scripts/cloud-ltc-release.mjs", "scripts/cloud-ltc-routine-followup-proof.mjs", "scripts/cloud-ltc-routine-followup-retirement.mjs", "scripts/cloud-ltc-routine-retirement-proof.mjs", "scripts/cloud-ltc-routine-retirement.mjs", "scripts/cloud-ltc-routine-summary-proof.mjs", "scripts/cloud-ltc-setup-quarantine-runner.mjs", "scripts/cloud-ltc-setup-quarantine.mjs", "scripts/cloud-ltc-state-envelope.mjs", "scripts/cloud-ltc-state.mjs", "scripts/cloud-ltc-upload-quarantine-proof.mjs", "scripts/collect-ltc.mjs", "scripts/lib/ltc-coverage.mjs", "scripts/lib/ltc-flagship-record.mjs", "scripts/lib/ltc-intelligence.mjs", "scripts/lib/ltc-policy.mjs", "scripts/lib/ltc-presentation.mjs", "scripts/lib/ltc-routine-data.mjs", "scripts/lib/ltc-software-release.mjs", "scripts/prepare-ltc-edition.mjs"]);
export async function verifyRetirementSource({root,config:c,read=readFile,gitHead=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}){
 check(c.github.sourceSha===gitHead()&&c.github.executedSourceSha===c.github.sourceSha,'source');
 check(RETIREMENT_SOURCE_FILES.length>0&&Object.keys(c.sourceManifest??{}).sort().join('|')===[...RETIREMENT_SOURCE_FILES].sort().join('|')&&hash(JSON.stringify(c.sourceManifest))===c.sourceManifestSha256,'manifest');for(const f of RETIREMENT_SOURCE_FILES)check(hash(await read(path.join(root,f)))===c.sourceManifest[f],'source_bytes');
}
export async function runF33RetirementCli({env=process.env,root=process.cwd(),read=readFile,stat=lstat,write=writeFile,gitHead=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),fetchImpl=fetch,clock=Date.now,waitForStop=false}={}){
 check(env.GITHUB_RUN_ATTEMPT==='1'&&path.isAbsolute(env.RUNNER_TEMP??''),'runtime');
 if(waitForStop){
  // Public pins only. This step receives no target identifiers/provider credentials.
  const github={runId:env.GITHUB_RUN_ID,workflowSha:env.WORKFLOW_SHA,sourceSha:env.SOURCE_SHA,executedSourceSha:env.SOURCE_SHA,environmentId:27323462394,workflowPath:'.github/workflows/ltc-f33-paused-retirement.yml'};
  await verifyRetirementSource({root,config:{github,sourceManifest:JSON.parse(env.SOURCE_MANIFEST_JSON),sourceManifestSha256:env.SOURCE_MANIFEST_SHA256},read,gitHead});
  const {createNativeRetirementApprovalReader}=await import('./cloud-ltc-native-retirement-authority.mjs');
  const {createStopAttestationReader}=await import('./cloud-ltc-f33-stop-attestation.mjs');
  const readAdmission=createNativeRetirementApprovalReader({config:github,token:env.GITHUB_TOKEN,fetchImpl,clock});
  const proof=await createStopAttestationReader({config:github,readAdmission,token:env.GITHUB_TOKEN,fetchImpl,clock}).wait();
  await write(path.join(env.RUNNER_TEMP,'ltc-f33-stop-attestation.json'),JSON.stringify(proof),{flag:'wx',mode:0o600});
  return {status:'fresh-stop-observed',publicationPerformed:false,retryAllowed:false};
 }
 const file=path.join(env.RUNNER_TEMP,'ltc-f33-retirement-private.json'),info=await stat(file);check(info.isFile()&&!info.isSymbolicLink()&&(info.mode&0o077)===0,'private_config');
 const c=JSON.parse(await read(file,'utf8'));check(c.github.runId===env.GITHUB_RUN_ID&&c.github.sourceSha===gitHead()&&c.github.executedSourceSha===c.github.sourceSha,'source');
 await verifyRetirementSource({root,config:c,read,gitHead});
 const {createNativeRetirementApprovalReader,createNativeRetirementAuthority}=await import('./cloud-ltc-native-retirement-authority.mjs');
 const {createBoundedWriterBarrier}=await import('./cloud-ltc-f33-writer-barrier.mjs');
 const {createRetirementReaders}=await import('./cloud-ltc-f33-retirement-readers.mjs');
 const {createReceiptLookup}=await import('./cloud-ltc-receipt-provenance-lookup.mjs');
 const {createGoogleStateRuntime}=await import('./cloud-ltc-google-runtime.mjs');
 const {inspectionReadOnlyFetch}=await import('./cloud-ltc-f33-readonly.mjs');
 const {createFullReadOnlyProviders,reconcileF33FullReadOnly}=await import('./cloud-ltc-f33-full-readonly.mjs');
 const {readF33PlannerInputs}=await import('./cloud-ltc-f33-evidence-bridge.mjs');
 const {executeIntegratedF33}=await import('./cloud-ltc-f33-integrated-execution.mjs');
 const nativeOptions={config:c.github,token:env.GITHUB_TOKEN,fetchImpl,clock};
 const readAdmission=createNativeRetirementApprovalReader(nativeOptions);
 const {createStopAttestationReader,withStopRevalidation}=await import('./cloud-ltc-f33-stop-attestation.mjs');
 const {createF33ProviderAdapters}=await import('./cloud-ltc-f33-provider-adapters.mjs');
 const stopReader=createStopAttestationReader({config:c.github,readAdmission,token:env.GITHUB_TOKEN,fetchImpl,clock});
 const stopFile=path.join(env.RUNNER_TEMP,'ltc-f33-stop-attestation.json');
 const stopInfo=await stat(stopFile);check(stopInfo.isFile()&&!stopInfo.isSymbolicLink()&&(stopInfo.mode&0o077)===0,'private_stop');
 const stop=JSON.parse(await read(stopFile,'utf8'));await stopReader.revalidate(stop);
 check(!Object.hasOwn(c.barrier,'localMaintenance'),'embedded_stop_forbidden');c.barrier.localMaintenance=stop.localMaintenance;
 const admission=await readAdmission();
 const assertInspection=()=>{const now=clock();check(now>=admission.observedAt&&now<admission.expiresAt,'admission_expired');return true;};assertInspection();
 const googleEnv={LTC_GOOGLE_CLIENT_ID:env.LTC_GOOGLE_CLIENT_ID,LTC_GOOGLE_CLIENT_SECRET:env.LTC_GOOGLE_CLIENT_SECRET,LTC_GOOGLE_REFRESH_TOKEN:env.LTC_GOOGLE_REFRESH_TOKEN};
 check(c.lookup.identitySource==='protected-publisher-credential'&&!Object.hasOwn(c.lookup,'publisherClientId')&&c.lookup.folderId===c.state.folderId&&c.lookup.folderId===c.incident.folderId&&c.lookup.ownerPermissionId===c.incident.ownerPermissionId&&c.state.ledgerKey==='website'&&c.state.publicationEnabled===false,'resources');
 const readFetch=inspectionReadOnlyFetch(fetchImpl),receipt=await createReceiptLookup({config:{...c.lookup,publisherClientId:googleEnv.LTC_GOOGLE_CLIENT_ID},env:googleEnv,fetchImpl:readFetch,clock}).lookup();check(receipt.status==='verified-existing-private-receipt'&&receipt.retryCreateAllowed===false,'receipt');
 const runtime=await createGoogleStateRuntime({config:c.state,env:googleEnv,fetchImpl:readFetch,beforeWrite:()=>{throw Error('retirement_read_only');}}),readState=()=>runtime.stateAdapter.read('website');
 check(c.barrier.runId===c.github.runId&&c.barrier.workflowSha===c.github.workflowSha,'barrier_binding');
 const readers=createRetirementReaders({config:c.barrier,token:env.GITHUB_TOKEN,fetchImpl,clock,cloudPublish:env.LTC_CLOUD_PUBLISH,softwareReleaseEnabled:env.LTC_SOFTWARE_RELEASE_ENABLED});
 const providers=createFullReadOnlyProviders({config:c.incident,env:{...googleEnv,GITHUB_TOKEN:env.GITHUB_TOKEN,VERCEL_TOKEN:env.VERCEL_TOKEN},fetchImpl});
 let full;const collectFull=async()=>{if(!full)full=await reconcileF33FullReadOnly({config:c.incident,expectedCurrentSource:c.github.workflowSha,readState,...providers,assertInspection,clock});assertInspection();return full;};
 const readInputs=()=>readF33PlannerInputs({config:c.incident,expectedSourceHead:c.barrier.sourceSha,expectedCurrentMain:c.github.workflowSha,readState,collectFull,readOrigin:readers.readOrigin,readVerifiedControls:readers.readVerifiedControls,clock});
 const first=await readInputs();
 const barrier=createBoundedWriterBarrier({config:c.barrier,readGithub:readers.readGithub,clock});
 const authorizeOwner=createNativeRetirementAuthority({...nativeOptions,config:{...c.github,expectedReviewSha256:first.expectedReviewSha256}});
 const result=await executeIntegratedF33({review:first.review,expectedReviewSha256:first.expectedReviewSha256,authorizationToken:null},{now:clock,readVerifiedInputs:async()=>{const next=await readInputs();check(next.expectedReviewSha256===first.expectedReviewSha256,'review_changed');return next;},authorizeOwner,acquireBarrier:barrier.acquireBarrier,providerFactory:withStopRevalidation(createF33ProviderAdapters,()=>stopReader.revalidate(stop),barrier.revoke),providerOptions:{ledgerConfig:c.state,receiptConfig:{...c.state,documentId:receipt.documentId},ownerPermissionId:c.incident.ownerPermissionId,env:googleEnv,fetchImpl}});
 try{await write(path.join(env.RUNNER_TEMP,'ltc-f33-retirement-result.json'),JSON.stringify(result)+'\n',{flag:'wx',mode:0o600});}catch{return{status:'private-result-retention-uncertain',publicationPerformed:false,retryAllowed:false,barrierReleaseAllowed:false};}
 return {status:result.status,publicationPerformed:false,retryAllowed:false,barrierReleaseAllowed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{check(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--wait-stop'),'arguments');const r=await runF33RetirementCli({waitForStop:process.argv[2]==='--wait-stop'});console.log(JSON.stringify(r));if(!['verified-paused-retirement','fresh-stop-observed'].includes(r.status))process.exitCode=1;}catch{console.error('paused_retirement_blocked');process.exitCode=1;}}
