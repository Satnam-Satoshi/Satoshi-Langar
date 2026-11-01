import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { TARGET, verifyImplementation, builtManifest, builtOutputManifest, readReviewedMigrationConfiguration, safeFailure } from './cloud-ltc-release.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
import { createReadOnlyReleaseClients } from './cloud-ltc-reconcile.mjs';
import { downloadEvidence, restoreArtifactEvidence, createDriveEvidenceProvider, preallocateEvidenceIds } from './cloud-ltc-evidence.mjs';
import { createAcceptanceLinkedClient } from './cloud-ltc-acceptance.mjs';
import { createControlledVercelMutation } from './cloud-ltc-promotion-runtime.mjs';
import { assertVercelProjectPolicy, assertVercelDeploymentIdentity } from './cloud-ltc-release-providers.mjs';
import { assertReviewedMigrationAcceptance } from './cloud-ltc-migration-gate.mjs';
import { validateStagedContinuationReview } from './cloud-ltc-staged-continuation-policy.mjs';
import { continueReviewedStagedDaily } from './cloud-ltc-staged-continuation.mjs';
import { TICKER_RULES, tickerFreshness } from './collect-ltc.mjs';
import { marketPricesResponse } from './lib/market-price-service.mjs';
import { validateSnapshot, editionDate } from './prepare-ltc-edition.mjs';
import { isRoutineData } from './lib/ltc-routine-data.mjs';
import { verifyPublicDomains } from './cloud-ltc-release.mjs';
const check=(value,code)=>{if(!value)throw Error(code);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=value=>sha(JSON.stringify(value));

const safeContinuationCodes=new Set(["controlled_vercel_write_uncertain","staged_continuation_already_claimed", "staged_continuation_arguments_required", "staged_continuation_candidate_changed", "staged_continuation_checkpoint_changed", "staged_continuation_checkpoint_readback_changed", "staged_continuation_claim_readback_changed", "staged_continuation_controller_changed", "staged_continuation_displayed_ticker_expired", "staged_continuation_download_unknown", "staged_continuation_effect_outside_scope", "staged_continuation_evidence_changed", "staged_continuation_evidence_proof_changed", "staged_continuation_finite_authority_required", "staged_continuation_full_restore_required", "staged_continuation_git_changed", "staged_continuation_historical_guard_changed", "staged_continuation_history_changed", "staged_continuation_intent_set_changed", "staged_continuation_issue_date_expired", "staged_continuation_lease_changed", "staged_continuation_live_prices_unavailable", "staged_continuation_origin_not_completed", "staged_continuation_origin_required", "staged_continuation_owner_required", "staged_continuation_previous_pointer_changed", "staged_continuation_private_config_changed", "staged_continuation_project_changed", "staged_continuation_provenance_changed", "staged_continuation_receipt_changed", "staged_continuation_restore_required", "staged_continuation_restored_artifact_changed", "staged_continuation_restored_binding_changed", "staged_continuation_restored_context_changed", "staged_continuation_review_expired", "staged_continuation_review_pin_required", "staged_continuation_review_required", "staged_continuation_scope_required", "staged_continuation_snapshot_changed", "staged_continuation_source_changed", "staged_continuation_source_controls_changed", "staged_continuation_source_snapshot_invalid", "staged_continuation_stage_changed", "staged_continuation_stage_proof_changed", "staged_continuation_state_required", "staged_continuation_unconfirmed_intent", "staged_continuation_unknown_changed"]);
export function safeStagedContinuationFailure(error){const code=typeof error?.message==='string'?error.message:'';if(safeContinuationCodes.has(code))return code;const safe=safeFailure(error);return safe==='release_failed_details_withheld'?'staged_continuation_details_withheld':safe;}

export async function verifyHistoricalStagedArtifacts({destination,review}){
  const source=await builtManifest(path.join(destination,'source')),manifest=await builtManifest(path.join(destination,'static')),output=await builtOutputManifest(path.join(destination,'build-output'));
  check(hash(source)===review.sourceManifestSha256&&hash(manifest)===review.artifactManifestSha256&&hash(output)===review.buildOutputSha256&&hash(await builtManifest(path.join(destination,'build-output/static')))===review.artifactManifestSha256,'staged_continuation_restored_artifact_changed');
  // Compute the historical guard over explicit restored source files; execute
  // none of that code and never create a Git checkout inside the artifact.
  const guard=createHash('sha256');for(const file of source.map(record=>record.file).sort()){if(isRoutineData(file))continue;guard.update(file+'\0');guard.update(await readFile(path.join(destination,'source',file)));guard.update('\0');}
  check(guard.digest('hex')===review.artifactImplementationSha256,'staged_continuation_historical_guard_changed');
  const json=async file=>JSON.parse(await readFile(path.join(destination,'evidence',file),'utf8'));
  const savedManifest=await json('artifact-manifest.json'),previous=await json('rollback-manifest.json'),plan=await json('source-operation-plan.json');
  check(hash(savedManifest)===review.artifactManifestSha256&&previous.deployment===review.previousDeployment&&hash(previous.manifest)===review.previousPublicManifestSha256&&plan.source===review.origin.sourceBefore&&plan.commit===review.artifactSource&&plan.editionId===review.editionId,'staged_continuation_restored_context_changed');
  const publicationProvenance={editionSha256:sha(await readFile(path.join(destination,`source/content/ltc/${review.editionId}.json`))),sourceDeskSha256:sha(await readFile(path.join(destination,'source/content/ltc-newsroom-selections/latest.json'))),dailyGraphicSha256:sha(await readFile(path.join(destination,`source/public/magazine/daily/${review.editionId}/social.png`)))};
  check(hash(publicationProvenance)===hash(review.publicationProvenance)&&manifest.some(record=>record.file===`magazine/daily/${review.editionId}/social.png`&&record.sha256===publicationProvenance.dailyGraphicSha256),'staged_continuation_provenance_changed');
  return{manifest,previousManifest:previous.manifest,publicationProvenance};
}

export function assertImmutableDisplayedTickers(edition,now){for(const brief of edition.briefs.filter(brief=>brief.desk==='Market snapshot'))check(tickerFreshness(brief.effectiveAt,now)==='dated-observation','staged_continuation_displayed_ticker_expired');}
export async function verifyRestoredStagedArtifacts({destination,review,promotionFreshness=false,now=new Date().toISOString()}){
  const verified=await verifyHistoricalStagedArtifacts({destination,review});
  check(editionDate(now)===review.editionId.slice(0,10),'staged_continuation_issue_date_expired');
  const sourceJSON=async file=>JSON.parse(await readFile(path.join(destination,'source',file),'utf8'));
  let normalized;try{normalized=validateSnapshot(await sourceJSON('public/data/ltc-snapshot.json'),await sourceJSON('config/ltc-sources.json'),await sourceJSON('config/ltc-publication.json'),now,review.editionId.slice(0,10));}catch{throw Error('staged_continuation_source_snapshot_invalid');}
  if(promotionFreshness){const edition=await sourceJSON(`content/ltc/${review.editionId}.json`);assertImmutableDisplayedTickers(edition,now);const displayed=new Set(edition.briefs.filter(brief=>brief.desk==='Market snapshot').flatMap(brief=>brief.sourceIds));for(const source of normalized.filter(source=>displayed.has(source.id)&&Object.hasOwn(TICKER_RULES,source.parserVersion))){check(tickerFreshness(source.sourceAsOf,now)==='dated-observation','staged_continuation_displayed_ticker_expired');}}

  return verified;
}

export async function restoreHistoricalStagedArtifact({pinned,review,evidenceConfig,directory,token,fetchImpl=fetch,save=async()=>{}}){
  const bundles=[];for(const intent of pinned.evidence){const p=intent.payload,result=await downloadEvidence({...p,length:p.bytes,operationId:intent.operationId,payloadSha256:intent.payloadSha256},{config:{...evidenceConfig,fileId:p.fileId},getAccessToken:token,fetcher:fetchImpl});check(result?.bundle,'staged_continuation_download_unknown');bundles.push(result.bundle);await save({restoredBundleCount:bundles.length});}
  const destination=path.join(directory,'restored-artifact');const restored=await restoreArtifactEvidence(bundles,{directory:destination,expectedManifestSha256:review.artifactPackageManifestSha256});
  check(['source','static','build-output','evidence'].every(scope=>restored.scopes[scope]>0),'staged_continuation_full_restore_required');
  const verified=await verifyHistoricalStagedArtifacts({destination,review});return{...verified,destination,restored};
}

export async function createStagedContinuationRuntime({env,review,configuration,state,evidenceConfig,directory,root,save,fetchImpl=fetch}){
  const clients=createReadOnlyReleaseClients({env,fetcher:fetchImpl});
  check(configuration&&evidenceConfig.folderId===review.bindings.folderId&&evidenceConfig.ownerPermissionId===review.bindings.ownerPermissionId&&configuration.pins.stagePins.bindings.websiteDocumentId===review.bindings.websiteDocumentId&&configuration.pins.stagePins.bindings.folderId===review.bindings.folderId&&configuration.pins.stagePins.bindings.ownerPermissionId===review.bindings.ownerPermissionId,'staged_continuation_private_config_changed');
  const linked=createAcceptanceLinkedClient({env,vercel:clients.vercel,directory,report:async value=>save({safeCliFailure:value})});await linked.verifyVersion();
  const token=()=>withGoogleCloudAuthorization({env,fetchImpl},access=>access.LTC_GOOGLE_ACCESS_TOKEN);
  const bridge=createControlledVercelMutation({env,review:{stagePins:{candidateDeployment:review.candidateDeployment,previousDeployment:review.previousDeployment}},fetchImpl});
  const vercel=clients.vercel;
  const verifyProject=async()=>{const project=await vercel(`/v9/projects/${TARGET.project}`);assertVercelProjectPolicy(project,TARGET);check(project.name==='https-github-com-satnam-satoshi-satoshi-langar'&&!project.rollingRelease&&Array.isArray(project.crons?.definitions)&&project.crons.definitions.length===0,'staged_continuation_project_changed');};
  const verifyLiveMarkets=async()=>{const response=await marketPricesResponse(new Request('https://read-only.invalid/api/market-prices'),{fetcher:fetchImpl});const value=await response.json();check(response.status===200&&value.status==='fresh'&&value.quotes?.length===2&&value.quotes.every(q=>q.status==='fresh'),'staged_continuation_live_prices_unavailable');return{checkedAt:value.checkedAt,sha256:hash(value),newCollectionForEdition:false};};
  let reviewCandidateUrl,promotionVerifier;
  return{...clients,verifyLiveMarkets,reportProviderFailure:async error=>save({providerFailure:safeStagedContinuationFailure(error)}),now:Date.now,evidenceConfig,token,fetchImpl,allocate:preallocateEvidenceIds,providerFactory:createDriveEvidenceProvider,save,
    mutate:async args=>{try{if(args[0]==='promote'){check(promotionVerifier,'staged_continuation_restore_required');await promotionVerifier();}return await bridge(args,{candidate:review.candidateDeployment,previous:review.previousDeployment,candidateUrl:reviewCandidateUrl});}catch(error){try{await save({providerFailure:safeStagedContinuationFailure(error)});}catch{}throw error;}},
    async verifyControllerAndPolicy(){
      await verifyImplementation(root,review.controllerImplementationSha256);
      check(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()===review.controllerSource,'staged_continuation_controller_changed');
      execFileSync('git',['merge-base','--is-ancestor',review.artifactSource,review.controllerSource],{cwd:root,stdio:'ignore'});
      const ref=await clients.github(`/git/ref/heads/${review.scope.branch}`),file=await clients.github(`/contents/config/ltc-publication.json?ref=${encodeURIComponent(review.scope.branch)}`),policy=JSON.parse(Buffer.from(file.content,'base64'));
      check(ref.object?.sha===review.controllerSource&&hash(policy)===review.sourcePolicySha256&&policy.policyId==='bounded-daily-v1'&&policy.enabled===true&&policy.paused===false,'staged_continuation_source_controls_changed');
      const current=await state.inspect();check(hash(current.unresolvedSetupIncident)===review.originalUnknownRawSha256,'staged_continuation_unknown_changed');assertReviewedMigrationAcceptance({document:current,configuration,currentControllerImplementationSha256:review.controllerImplementationSha256});await verifyProject();
    },
    async verifyProjectAndPointers(){await verifyProject();for(const domain of TARGET.domains){const deployment=await vercel(`/v13/deployments/${new URL(domain).hostname}`);assertVercelDeploymentIdentity(deployment,TARGET);check(deployment.id===review.previousDeployment,'staged_continuation_previous_pointer_changed');}},
    async restore(pinned){
      const {destination}=await restoreHistoricalStagedArtifact({pinned,review,evidenceConfig,directory,token,fetchImpl,save});
      const verified=await verifyRestoredStagedArtifacts({destination,review});
      reviewCandidateUrl=pinned.candidateUrl;
      promotionVerifier=async()=>{await verifyLiveMarkets();await verifyRestoredStagedArtifacts({destination,review,promotionFreshness:true});};return{...verified,verify:()=>verifyRestoredStagedArtifacts({destination,review}),verifyPromotion:promotionVerifier};
    },
    async verifyProtected(deployment,manifest){const actual=await vercel(`/v13/deployments/${deployment.id}`);assertVercelDeploymentIdentity(actual,TARGET);check(actual.id===review.candidateDeployment&&actual.meta?.ltcOperationId===review.stageOperationId&&actual.meta.ltcSourceCommit===review.artifactSource&&actual.meta.ltcBuildOutputSha256===review.buildOutputSha256&&actual.meta.ltcPayloadSha256===hash({kind:'vercel-stage',editionId:review.editionId,artifactPackageManifestSha256:review.artifactPackageManifestSha256,commit:review.artifactSource,buildOutputSha256:review.buildOutputSha256,artifactManifestSha256:review.artifactManifestSha256}),'staged_continuation_candidate_changed');await linked.readProtected(deployment,manifest,manifest);},
    verifyPublic:verifyPublicDomains,
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let writeFailure;Promise.resolve().then(async()=>{
  const options={};for(let n=2;n<process.argv.length;n+=2){const key={'--review-file':'review','--state-config':'website','--evidence-config':'evidence','--receipt':'receipt'}[process.argv[n]];check(key&&!options[key]&&process.argv[n+1],'staged_continuation_arguments_required');options[key]=process.argv[n+1];}check(['review','website','evidence','receipt'].every(key=>options[key]),'staged_continuation_arguments_required');
  const env=process.env,root=process.cwd();await verifyImplementation(root,env.LTC_ACCEPTED_IMPLEMENTATION_SHA256);
  const json=async file=>JSON.parse(await readFile(file,'utf8')),review=await json(options.review);validateStagedContinuationReview({env,review});
  check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===review.controllerSource,'staged_continuation_controller_changed');
  const configuration=readReviewedMigrationConfiguration(env);check(configuration,'migration_acceptance_pending');
  const config=await json(options.website),evidenceConfig=await json(options.evidence);check(config.documentId===review.bindings.websiteDocumentId&&config.folderId===review.bindings.folderId&&(config.ledgerKey??'website')==='website','staged_continuation_private_config_changed');
  const google=await createGoogleStateRuntime({config,env}),state=new DurableCloudState(google.stateAdapter,'website'),directory=await mkdtemp(path.join(tmpdir(),'ltc-staged-continuation-'));
  const receipt={mode:'finite-staged-daily-continuation',status:'starting',directory,originalEffectsReissued:false,routineActivationAuthorized:false};await writeFile(options.receipt,JSON.stringify(receipt)+'\n',{flag:'wx',mode:0o600});const save=async update=>{Object.assign(receipt,update);await writeFile(options.receipt,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});};writeFailure=async failure=>save({failure,failurePhase:receipt.heldAfterPhase??receipt.status,status:receipt.status==='held-paused'?'held-paused':'withheld'});
  const dependencies=await createStagedContinuationRuntime({env,review,configuration,state,evidenceConfig,directory,root,save});const result=await continueReviewedStagedDaily({env,state,review,dependencies});await save({...result,source:review.artifactSource,edition:review.editionId,publicationPerformed:result.published});console.log(JSON.stringify(result));
}).catch(async error=>{const code=safeStagedContinuationFailure(error);try{await writeFailure?.(code);}catch{}console.error('staged_daily_continuation_withheld_or_held: '+code);process.exitCode=1;});}
