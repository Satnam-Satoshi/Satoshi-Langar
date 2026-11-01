import {validateStagedContinuationSnapshot} from './cloud-ltc-staged-continuation-policy.mjs';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
const check=(value,code)=>{if(!value)throw Error(code);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const commit=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,160}$/.test(value);
const run=value=>typeof value==='string'&&/^[1-9]\d{0,29}$/.test(value);
const plain=value=>value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype;
const target={repository:'Satnam-Satoshi/Satoshi-Langar',project:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',team:'team_yc5ZBvCbWT2M7iGyj3vQDOzk',domains:['https://satnamsatoshi.com','https://ltcmagazine.org']};
const hashes=['snapshotSha256','artifactManifestSha256','buildOutputSha256','artifactPackageManifestSha256','sourceManifestSha256','previousPublicManifestSha256','originalUnknownRawSha256','sourcePolicySha256','historicalMigrationConfigurationSha256'];
// Founder-owned archive-only exception. Source dates and bytes remain historical;
// this pure policy never authorizes promotion, publication or routine activation.
export function validateStageRetirementReview({env,review,now=Date.now()}){
 check(env.GITHUB_ACTIONS==='true'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_REPOSITORY===target.repository&&env.GITHUB_ACTOR_ID==='268053325'&&env.LTC_ACCEPTANCE_MANUAL==='true'&&env.LTC_ACCEPTANCE_ENVIRONMENT==='ltc-production'&&env.LTC_CLOUD_PUBLISH==='false'&&run(env.GITHUB_RUN_ID)&&run(env.GITHUB_RUN_ATTEMPT),'stage_retirement_owner_required');
 check(plain(review)&&Buffer.byteLength(JSON.stringify(review))<=65536&&review.schemaVersion===1&&review.kind==='founder-approved-staged-daily-archive-retirement'&&review.approved===true&&review.actorId==='268053325'&&commit(review.controllerSource)&&digest(review.controllerImplementationSha256)&&review.controllerImplementationSha256===env.LTC_ACCEPTED_IMPLEMENTATION_SHA256&&commit(review.artifactSource)&&digest(review.artifactImplementationSha256)&&hashes.every(key=>digest(review[key])),'stage_retirement_review_required');
 const approved=Date.parse(review.approvedAt),expires=Date.parse(review.expiresAt);
 check(Number.isFinite(approved)&&Number.isFinite(expires)&&approved<=now&&now<expires&&expires>approved&&expires-approved<=86400000,'stage_retirement_review_expired');
 check(digest(env.LTC_STAGE_RETIREMENT_REVIEW_SHA256)&&hash(review)===env.LTC_STAGE_RETIREMENT_REVIEW_SHA256,'stage_retirement_review_pin_required');
 check(plain(review.scope)&&Object.entries(target).every(([key,value])=>same(review.scope[key],value))&&/^agent\/[a-z0-9][a-z0-9/-]{0,150}$/.test(review.scope.branch??'')&&!review.scope.branch.includes('..')&&plain(review.bindings)&&['folderId','websiteDocumentId','ownerPermissionId'].every(key=>id(review.bindings[key]))&&review.bindings.folderId!==review.bindings.websiteDocumentId,'stage_retirement_scope_required');
 const origin=review.origin;
 check(plain(origin)&&run(origin.runId)&&run(origin.attempt)&&origin.runId!==env.GITHUB_RUN_ID&&commit(origin.workflowHead)&&commit(origin.sourceBefore)&&Number.isSafeInteger(origin.fence)&&origin.fence>0&&env.LTC_ACCEPTANCE_SOURCE_COMMIT===review.artifactSource&&env.LTC_ACCEPTANCE_FENCE===String(origin.fence),'stage_retirement_origin_required');
 check(/^dpl_[A-Za-z0-9]+$/.test(review.candidateDeployment??'')&&/^dpl_[A-Za-z0-9]+$/.test(review.previousDeployment??'')&&review.candidateDeployment!==review.previousDeployment&&/^[a-z0-9][a-z0-9_-]{0,79}$/.test(review.stageOperationId??'')&&/^\d{4}-\d{2}-\d{2}-r[1-9]\d*$/.test(review.editionId??'')&&plain(review.publicationProvenance)&&['editionSha256','sourceDeskSha256','dailyGraphicSha256'].every(key=>digest(review.publicationProvenance[key]))&&review.archiveOnly===true&&review.archiveExactlyOne===true&&review.authorizePublication===false&&review.authorizeRoutineActivation===false&&review.pauseAfter===true&&review.preserveOriginalUnknown===true&&review.allowNewFencedClaim===true&&review.pruneOnlyOriginalFence===true&&review.requireFreshNextDay===true&&review.allProjectProductionAliasesApproved!==true&&review.firstPromotionOnly!==true&&review.rollbackOnConfirmedPromotionVerificationFailure!==true,'stage_retirement_finite_authority_required');
 return Object.freeze({reviewSha256:hash(review),artifactSource:review.artifactSource,controllerSource:review.controllerSource,archiveOnly:true,publicationAuthorized:false,routineActivationAuthorized:false});
}

export function validateStageRetirementSnapshot({document,review}){
 check(document&&document.latestRelease===undefined&&!document.stagedDailyContinuation&&!document.stagedDailyRetirement&&!document.stageRetirement,'stage_retirement_already_started');
 const validated=validateStagedContinuationSnapshot({document,review});
 return Object.freeze({...validated,archiveOnly:true,publicationAuthorized:false,promotionAuthorized:false,routineActivationAuthorized:false});
}
