import test from 'node:test';
import assert from 'node:assert/strict';
import {receiptHash as hash} from './cloud-ltc-acceptance-proof.mjs';
import {stagedContinuationFixture} from './lib/test-staged-continuation-fixture.mjs';
import {validateStageRetirementReview,validateStageRetirementSnapshot} from './cloud-ltc-stage-retirement-policy.mjs';
function fixture(){
 const f=stagedContinuationFixture();f.now=Date.parse('2026-11-01T12:00:00Z');
 f.review.kind='founder-approved-staged-daily-archive-retirement';f.review.approvedAt='2026-11-01T11:00:00Z';f.review.expiresAt='2026-11-02T11:00:00Z';
 for(const key of ['allProjectProductionAliasesApproved','firstPromotionOnly','rollbackOnConfirmedPromotionVerificationFailure'])delete f.review[key];
 Object.assign(f.review,{historicalMigrationConfigurationSha256:'a'.repeat(64),archiveOnly:true,archiveExactlyOne:true,authorizePublication:false,authorizeRoutineActivation:false,pauseAfter:true,preserveOriginalUnknown:true,allowNewFencedClaim:true,pruneOnlyOriginalFence:true,requireFreshNextDay:true});
 const rebind=()=>{f.review.snapshotSha256=hash(f.document);f.env.LTC_STAGE_RETIREMENT_REVIEW_SHA256=hash(f.review);};f.rebind=rebind;rebind();return f;
}
test('historical source bytes are eligible only for finite archive retirement, with no promotion flags or current-price assertion',()=>{
 const f=fixture(),before=JSON.stringify(f),authority=validateStageRetirementReview(f),snapshot=validateStageRetirementSnapshot(f);
 assert.equal(authority.archiveOnly,true);assert.equal(authority.publicationAuthorized,false);assert.equal(snapshot.knownConfirmedOperationCount,47);assert.equal(snapshot.evidence.length,40);assert.equal(snapshot.promotionAuthorized,false);assert.equal(snapshot.routineActivationAuthorized,false);assert.equal(snapshot.editionId,'2026-10-31-r1');assert.equal(JSON.stringify(f),before);
});
test('all finite archival restrictions are independently required; continuation/promotion authority is rejected',()=>{
 for(const key of ['archiveOnly','archiveExactlyOne','pauseAfter','preserveOriginalUnknown','allowNewFencedClaim','pruneOnlyOriginalFence','requireFreshNextDay']){const f=fixture();f.review[key]=false;f.rebind();assert.throws(()=>validateStageRetirementReview(f));}
 for(const key of ['authorizePublication','authorizeRoutineActivation','allProjectProductionAliasesApproved','firstPromotionOnly','rollbackOnConfirmedPromotionVerificationFailure']){const f=fixture();f.review[key]=true;f.rebind();assert.throws(()=>validateStageRetirementReview(f));}
 const f=fixture();f.review.kind='founder-approved-staged-daily-continuation';f.rebind();assert.throws(()=>validateStageRetirementReview(f));
});
test('owner, source/controller separation, protected pin, expiry and target scope remain exact',()=>{
 for(const change of [f=>{delete f.review.historicalMigrationConfigurationSha256;f.rebind();},f=>f.env.GITHUB_ACTOR_ID='2',f=>f.env.GITHUB_EVENT_NAME='schedule',f=>f.env.LTC_CLOUD_PUBLISH='true',f=>f.env.LTC_STAGE_RETIREMENT_REVIEW_SHA256='0'.repeat(64),f=>f.env.LTC_ACCEPTANCE_SOURCE_COMMIT=f.review.controllerSource,f=>f.env.LTC_ACCEPTANCE_FENCE='7',f=>{f.review.expiresAt='2026-11-03T11:00:00Z';f.rebind();},f=>{f.review.expiresAt='2026-11-01T12:00:00Z';f.rebind();},f=>{f.review.scope.domains.reverse();f.rebind();},f=>{f.review.controllerImplementationSha256=f.review.artifactImplementationSha256;f.rebind();}]){const f=fixture();change(f);assert.throws(()=>validateStageRetirementReview(f));}
});
test('exact 47 confirmed no-promotion snapshot and UNKNOWN are mandatory even after repinning changed snapshot',()=>{
 for(const change of [f=>f.document.intents['stage-fixture'].status='uncertain',f=>f.document.intents['stage-fixture'].payload.kind='vercel-promote',f=>f.document.intents['stage-fixture'].proof.proof.deployment='dpl_Other',f=>delete f.document.intents['evidence-0'],f=>f.document.lease.runId='gha-100-2',f=>f.document.unresolvedSetupIncident.accepted=true,f=>f.document.restoreHold=true]){const f=fixture();change(f);f.rebind();assert.throws(()=>validateStageRetirementSnapshot(f));}
});
test('existing retirement, continuation or latest-release fiction cannot be overwritten',()=>{
 for(const key of ['stagedDailyRetirement','stagedDailyContinuation','latestRelease']){const f=fixture();f.document[key]={status:'already-admitted'};f.rebind();assert.throws(()=>validateStageRetirementSnapshot(f),/already_started/);}
});
test('expired original lease is accepted; raw receipt/private evidence mutations are not',()=>{
 const f=fixture();assert(f.document.lease.expiresAt<f.now);assert.equal(validateStageRetirementSnapshot(f).fence,6);
 for(const change of [g=>g.document.receipts['stage-fixture'].receipt.proof.proof.url='other.vercel.app',g=>g.document.intents['evidence-0'].proof.proof.ownerOnly=false,g=>g.document.retiredSetupIncidents[Object.keys(g.document.retiredSetupIncidents)[0]].accepted=true]){const g=fixture();change(g);g.rebind();assert.throws(()=>validateStageRetirementSnapshot(g));}
});
