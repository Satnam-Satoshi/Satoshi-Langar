import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { TARGET, verifyImplementation, verifyPublicDomains, acceptedSourceConfig } from './cloud-ltc-release.mjs';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { createReadOnlyReleaseClients } from './cloud-ltc-reconcile.mjs';
import { assertVercelProjectPolicy, assertVercelDeploymentIdentity } from './cloud-ltc-release-providers.mjs';
const check=(value,code)=>{if(!value)throw Error(code);};
const digest=value=>/^[a-f0-9]{64}$/.test(value??'');
const sha=value=>/^[a-f0-9]{40}$/.test(value??'');
const id=value=>/^[1-9]\d{0,29}$/.test(value??'');

export function validatePreEffectRecoveryReview({env,review,now=Date.now()}){
 check(env.GITHUB_ACTIONS==='true'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_REPOSITORY===TARGET.repository&&env.GITHUB_ACTOR_ID==='268053325'&&env.LTC_ACCEPTANCE_ENVIRONMENT==='ltc-production'&&env.LTC_ACCEPTANCE_MANUAL==='true'&&env.LTC_CLOUD_PUBLISH==='false'&&id(env.GITHUB_RUN_ID)&&id(env.GITHUB_RUN_ATTEMPT),'pre_effect_owner_context_required');
 check(review?.schemaVersion===1&&review.kind==='founder-approved-pre-effect-lease-retirement'&&review.approved===true&&review.actorId==='268053325'&&Number.isFinite(Date.parse(review.approvedAt))&&Date.parse(review.approvedAt)<=now&&digest(review.controllerImplementationSha256)&&review.controllerImplementationSha256===env.LTC_ACCEPTED_IMPLEMENTATION_SHA256&&sha(review.controllerSource)&&review.zeroCurrentFenceIntentsRequired===true&&review.pausedAfter===true&&review.authorizePublication===false&&digest(review.snapshotSha256)&&digest(review.sourcePolicySha256)&&digest(review.previousPublicManifestSha256)&&review.scope?.repository===TARGET.repository&&review.scope.project===TARGET.project&&review.scope.team===TARGET.team&&JSON.stringify(review.scope.domains)===JSON.stringify(TARGET.domains),'pre_effect_review_required');
 check(digest(env.LTC_PRE_EFFECT_RECOVERY_REVIEW_SHA256)&&hash(review)===env.LTC_PRE_EFFECT_RECOVERY_REVIEW_SHA256,'pre_effect_review_pin_mismatch');
 const origin=review.origin;
 check(origin&&id(origin.runId)&&id(origin.attempt)&&sha(origin.source)&&sha(origin.workflowHead)&&Number.isSafeInteger(origin.fence)&&origin.fence>0&&origin.runId!==env.GITHUB_RUN_ID&&env.LTC_ACCEPTANCE_FENCE===String(origin.fence)&&env.LTC_ACCEPTANCE_SOURCE_COMMIT===origin.source&&/^dpl_[A-Za-z0-9]+$/.test(review.previousDeployment??'')&&review.bindings?.websiteDocumentId&&review.bindings.folderId,'pre_effect_origin_pin_required');
 return review;
}

export async function retireReviewedPreEffectLease({env,state,review,previousManifest,dependencies}){
 const now=dependencies.now?.()??Date.now();validatePreEffectRecoveryReview({env,review,now});
 check(state instanceof DurableCloudState&&state.key==='website','pre_effect_state_required');
 const snapshot=await state.adapter.read('website');
 const document=await new DurableCloudState({read:async()=>snapshot},'website').inspect();
 check(hash(document)===review.snapshotSha256&&document.fence===review.origin.fence&&document.lease?.fence===review.origin.fence&&document.lease.runId===`gha-${review.origin.runId}-${review.origin.attempt}`&&!document.restoreHold,'pre_effect_snapshot_changed');
 check(Object.values(document.intents).every(intent=>intent.fence!==review.origin.fence&&intent.runId!==document.lease.runId&&['confirmed','not-applied'].includes(intent.status))&&Object.values(document.receipts).every(record=>record.receipt?.fence!==review.origin.fence&&record.receipt?.runId!==document.lease.runId),'pre_effect_current_intents_present');
 check(Array.isArray(previousManifest)&&previousManifest.length>0&&previousManifest.every(record=>typeof record.file==='string'&&digest(record.sha256))&&hash(previousManifest)===review.previousPublicManifestSha256,'pre_effect_public_manifest_changed');
 const baseline=document.latestRelease??document.migrationActivation;
 check(baseline&&(baseline.deployment??baseline.publicDeployment)===review.previousDeployment&&(baseline.artifactManifestSha256??baseline.publicManifestSha256)===review.previousPublicManifestSha256,'pre_effect_public_baseline_changed');
 const origin=await dependencies.github(`/actions/runs/${review.origin.runId}/attempts/${review.origin.attempt}`);
 check(String(origin.id)===review.origin.runId&&String(origin.run_attempt)===review.origin.attempt&&origin.status==='completed'&&['failure','cancelled','timed_out'].includes(origin.conclusion)&&origin.event==='workflow_dispatch'&&origin.head_branch==='main'&&origin.head_sha===review.origin.workflowHead&&origin.repository?.full_name===TARGET.repository&&origin.path==='.github/workflows/ltc-daily-publication.yml'&&String(origin.actor?.id)==='268053325','pre_effect_origin_not_completed');
 await dependencies.sourceControlCheck({originalSource:review.origin.source,controllerSource:review.controllerSource});
 const project=await dependencies.vercel(`/v9/projects/${TARGET.project}`);assertVercelProjectPolicy(project,TARGET);
 check(project.name==='https-github-com-satnam-satoshi-satoshi-langar'&&!project.rollingRelease&&Array.isArray(project.crons?.definitions)&&project.crons.definitions.length===0,'pre_effect_project_changed');
 for(const domain of TARGET.domains){const deployment=await dependencies.vercel(`/v13/deployments/${new URL(domain).hostname}`);assertVercelDeploymentIdentity(deployment,TARGET);check(deployment.id===review.previousDeployment,'pre_effect_public_pointer_changed');}
 await dependencies.verifyPublic(previousManifest);
 const next=structuredClone(document),history=next.preEffectLeaseRetirements??[];
 check(Array.isArray(history)&&history.length<16,'pre_effect_history_capacity');
 const receipt={schemaVersion:1,reviewSha256:hash(review),original:structuredClone(review.origin),controllerSource:review.controllerSource,controllerImplementationSha256:review.controllerImplementationSha256,completedBy:{runId:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT},snapshotSha256:review.snapshotSha256,originalLease:structuredClone(document.lease),originalPaused:document.paused,previousDeployment:review.previousDeployment,previousPublicManifestSha256:review.previousPublicManifestSha256,verifiedAt:new Date(now).toISOString(),outcome:'pre-effect-lease-retired-paused',currentFenceIntents:0,publicationAuthorized:false,effectsReissued:false};
 next.paused=true;next.lease=null;next.preEffectLeaseRetirements=[...history,receipt];
 await new DurableCloudState({read:async()=>({value:next})},'website').inspect();
 await state.adapter.conditionalWrite('website',next,snapshot.version); // Exactly one CAS, never retry an ambiguous write.
 check(hash((await state.adapter.read('website')).value)===hash(next),'pre_effect_readback_mismatch');
 const result={mode:'pre-effect-lease-retirement',status:receipt.outcome,receiptSha256:hash(receipt),retiredFence:document.fence,paused:true,publicationAuthorized:false,effectsReissued:false};
 await dependencies.save(result);return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 // No top-level await: this controller imports the release module's exports.
 Promise.resolve().then(async()=>{
  const options={};for(let n=2;n<process.argv.length;n+=2){const key={'--review':'review','--state-config':'state','--previous-manifest':'previous','--receipt':'receipt'}[process.argv[n]];check(key&&!options[key]&&process.argv[n+1],'invalid_pre_effect_arguments');options[key]=process.argv[n+1];}check(['review','state','previous','receipt'].every(key=>options[key]),'invalid_pre_effect_arguments');
  const env=process.env;await verifyImplementation(process.cwd(),env.LTC_ACCEPTED_IMPLEMENTATION_SHA256);
  const json=async file=>JSON.parse(await readFile(file,'utf8'));const review=await json(options.review);validatePreEffectRecoveryReview({env,review});
  const accepted=acceptedSourceConfig(await json('config/ltc-cloud-source.json')),head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  check(head===review.controllerSource,'pre_effect_controller_source_changed');
  execFileSync('git',['merge-base','--is-ancestor',review.origin.source,head],{stdio:'ignore'});
  const config=await json(options.state);check(config.documentId===review.bindings.websiteDocumentId&&config.folderId===review.bindings.folderId&&(config.ledgerKey??'website')==='website','pre_effect_private_resource_changed');
  const runtime=await createGoogleStateRuntime({config,env}),clients=createReadOnlyReleaseClients({env});
  const result=await retireReviewedPreEffectLease({env,state:new DurableCloudState(runtime.stateAdapter,'website'),review,previousManifest:await json(options.previous),dependencies:{...clients,verifyPublic:verifyPublicDomains,save:async value=>writeFile(options.receipt,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600}),sourceControlCheck:async({originalSource,controllerSource})=>{
   await verifyImplementation(process.cwd(),env.LTC_ACCEPTED_IMPLEMENTATION_SHA256);execFileSync('git',['merge-base','--is-ancestor',originalSource,controllerSource],{stdio:'ignore'});
   const ref=await clients.github(`/git/ref/heads/${accepted.branch}`),policy=await clients.github(`/contents/config/ltc-publication.json?ref=${encodeURIComponent(accepted.branch)}`);
   const value=JSON.parse(Buffer.from(policy.content,'base64'));
   check(ref.object?.sha===controllerSource&&hash(value)===review.sourcePolicySha256&&value.policyId==='bounded-daily-v1'&&typeof value.enabled==='boolean'&&typeof value.paused==='boolean','pre_effect_source_controls_changed');
  }}});console.log(JSON.stringify(result));
 }).catch(()=>{console.error('pre_effect_lease_retirement_withheld');process.exitCode=1;});
}
