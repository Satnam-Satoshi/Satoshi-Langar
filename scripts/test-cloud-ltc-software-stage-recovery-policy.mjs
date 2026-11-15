import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSoftwareStageRecovery, softwareRecoveryHash as hash } from './cloud-ltc-software-stage-recovery-policy.mjs';
import { validateSoftwareReview } from './lib/ltc-software-release.mjs';
import { dailyPublicationFixture } from './lib/test-daily-publication-fixture.mjs';
import { releaseGeneration } from './cloud-ltc-generation.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
const hex = digit => digit.repeat(64);
import { softwareRecoveryFixture as fixture } from './lib/test-software-recovery-fixture.mjs';
const repin=f=>{f.review.snapshotSha256=hash(f.document);f.review.stageIntentSha256=hash(f.document.intents[f.review.stageOperationId]);f.env.LTC_SOFTWARE_STAGE_RECOVERY_REVIEW_SHA256=hash(f.review);};
test('existing uncertain software stage and all42 archived parts validate without granting an effect or changing history',()=>{
 const f=fixture(),before=hash(f),result=validateSoftwareStageRecovery(f);assert.equal(hash(f),before);
 assert.equal(result.artifactPartCount,42);assert.equal(result.stageReconciliationRequired,true);assert.equal(result.originalDailyVerifiedAt,f.document.latestRelease.verifiedAt);
 for(const key of ['mutationAuthorized','archiveRestoreVerified','protectedBytesVerified','apiHandlersVerified'])assert.equal(result[key],false);
 assert.notEqual(result.artifactSource,result.controllerSource);
});
test('new independent approval is required; expired original is validated only as historical scope',()=>{
 const f=fixture();assert(Date.parse(f.originalReview.expiresAt)<f.now);assert.doesNotThrow(()=>validateSoftwareStageRecovery(f));
 for(const mutate of [f=>f.env.GITHUB_EVENT_NAME='schedule',f=>f.env.GITHUB_RUN_ATTEMPT='2',f=>f.env.GITHUB_ACTOR_ID='2',f=>f.env.GITHUB_SHA='0'.repeat(40),f=>f.env.LTC_CLOUD_PUBLISH='true',f=>f.env.LTC_ACCEPTED_IMPLEMENTATION_SHA256=hex('0'),f=>f.review.approved=false,f=>f.review.expiresAt='2026-11-04T15:59:59Z',f=>f.review.noRedeploy=false,f=>f.review.authorizeRoutineActivation=true]){const x=fixture();mutate(x);x.env.LTC_SOFTWARE_STAGE_RECOVERY_REVIEW_SHA256=hash(x.review);assert.throws(()=>validateSoftwareStageRecovery(x));}
});
test('completed exact software origin and finite exact lease required',()=>{
 for(const mutate of [f=>f.originRun.status='in_progress',f=>f.originRun.path='.github/workflows/ltc-daily-publication.yml',f=>f.originRun.head_sha='0'.repeat(40),f=>f.originRun.actor.id=1,f=>f.originRun.updated_at='2026-11-04T18:00:00Z',f=>f.document.lease.expiresAt=Infinity,f=>f.document.lease.runId='gha-900001-1',f=>f.document.lease.fence++,f=>f.document.restoreHold=true,f=>f.document.lease.publicationDate='2026-11-04']){const f=fixture();mutate(f);repin(f);assert.throws(()=>validateSoftwareStageRecovery(f));}
});
test('snapshot/context/review/manifests bind exact existing baseline, never recomputed daily content',()=>{
 for(const mutate of [f=>f.document.latestRelease.verifiedAt='2026-11-04T12:00:00Z',f=>delete f.document.latestRelease,f=>f.document.newHistoricalMarker=true,f=>f.originalContext={...f.originalContext,dailyVerifiedAt:'2026-11-04T12:00:00Z'},f=>f.originalReview.source='f'.repeat(40),f=>f.manifest[0].sha256=hex('0'),f=>f.buildOutput[0].file='wrong',f=>f.changedPaths=['content/ltc/2026-11-04-r1.json']]){const f=fixture();mutate(f);assert.throws(()=>validateSoftwareStageRecovery(f));}
 const f=fixture();f.document.paused=true;f.review.originalPaused=true;repin(f);assert.doesNotThrow(()=>validateSoftwareStageRecovery(f));assert.equal(f.document.paused,true);
});
test('even repinned snapshots cannot hide wrong evidence sets, claims, receipts or extra effects',()=>{
 for(const mutate of [
  f=>delete f.document.intents['archive-0'],f=>delete f.document.receipts['archive-0'],f=>f.document.receipts.orphan={},
  f=>f.document.intents['archive-0'].status='uncertain',f=>f.document.intents['archive-0'].proof.proof.ownerOnly=false,
  f=>f.document.intents['archive-0'].runId='other',f=>f.document.intents['stage-fixture'].status='confirmed',
  f=>f.document.intents['stage-fixture'].payload.kind='vercel-promote',f=>f.document.intents['stage-fixture'].fence=26,
  f=>f.document.intents['stage-fixture'].proof={},f=>f.document.receipts['stage-fixture']={},f=>f.document.softwareStageRecovery={status:'claimed'},
 ]){const f=fixture();mutate(f);repin(f);assert.throws(()=>validateSoftwareStageRecovery(f));}
});
test('internally re-signed archive evidence must still have exact indexes, unique files, generation and owner',()=>{
 for(const mutate of [p=>p.artifactBundleIndex=1,p=>p.artifactBundleCount=41,p=>p.role='release-summary',p=>p.fileId='fixture_part_1',p=>p.generation='f27-'+'0'.repeat(16),p=>p.folderId='wrong_folder',p=>p.bytes=3500001]){
  const f=fixture(),i=f.document.intents['archive-0'];mutate(i.payload);i.payloadSha256=hash(i.payload);i.proof.payloadSha256=i.payloadSha256;
  Object.assign(i.proof.proof,{fileId:i.payload.fileId,folderId:i.payload.folderId,length:i.payload.bytes});i.evidenceSha256=hash(i.proof);f.document.receipts[i.operationId]={receipt:structuredClone(i),sha256:hash(i)};repin(f);assert.throws(()=>validateSoftwareStageRecovery(f));
 }
});

test('finite unexpired original lease needs completed origin and explicitly approved new-fence claim',()=>{
 const f=fixture();f.document.lease.expiresAt=f.now+3600000;repin(f);const before=hash(f.document);
 assert.doesNotThrow(()=>validateSoftwareStageRecovery(f));assert.equal(hash(f.document),before);
 for(const mutate of [x=>x.originRun.status='in_progress',x=>x.originRun.status='queued',x=>x.review.allowNewFencedClaim=false,x=>x.review.approved=false]){
  const x=structuredClone(f);mutate(x);repin(x);assert.throws(()=>validateSoftwareStageRecovery(x));
 }
});
test('archive count respects the existing 64-part package/restore bound',()=>{
 const f=fixture();f.review.artifactPartCount=65;repin(f);assert.throws(()=>validateSoftwareStageRecovery(f),/software_recovery_scope_required/);
});
