import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertSoftwareBaseline, validateSoftwareReview, assertSoftwareContext, assertSoftwarePublicData, softwareCheckpointFields, softwareHash, validateSoftwareApiReadback, assertSoftwarePromotionWindow } from './lib/ltc-software-release.mjs';
import { assertSoftwareActionsContext, verifySoftwareVisualQa } from './cloud-ltc-software-release.mjs';
import { dailyPublicationFixture } from './lib/test-daily-publication-fixture.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { assertDailyPublicationAvailable, DailyPublicationComplete } from './cloud-ltc-daily-admission.mjs';
import { followupFixture } from './lib/test-routine-followup-fixture.mjs';
import { routineFixture } from './lib/test-routine-retirement-fixture.mjs';
import { retireRoutineFollowupUploads } from './cloud-ltc-routine-followup-retirement.mjs';
import { retireRoutineUploads, completeRoutineRetirementFresh } from './cloud-ltc-routine-retirement.mjs';
import { acceptRoutineRetirement, captureRoutineRetirementBinding } from './cloud-ltc-routine-retirement-proof.mjs';
const now=Date.parse('2026-11-04T14:00:00Z');
function fixture(){
 const document=dailyPublicationFixture();document.latestRelease.publicationProvenance={editionSha256:'e'.repeat(64),sourceDeskSha256:'f'.repeat(64),dailyGraphicSha256:'a'.repeat(64)};
 const manifest=[{file:'data/ltc-editions/index.json',sha256:'b'.repeat(64)}],buildOutput=[{file:'config.json',sha256:'b'.repeat(64)}];
 const options={source:'a'.repeat(40),implementationSha256:'b'.repeat(64),manifest,buildOutput,changedPaths:['app/page.tsx'],document,now,target:{repository:'fixture'}};
 const review={schemaVersion:1,kind:'reviewed-software-only-release',approved:true,actorId:'268053325',approvalId:'fixture-software',approvedAt:'2026-11-04T13:00:00Z',expiresAt:'2026-11-04T15:00:00Z',source:options.source,implementationSha256:options.implementationSha256,target:options.target,priorReleaseSha256:softwareHash(document.latestRelease),previousDeployment:document.latestRelease.deployment,rollbackManifestSha256:document.latestRelease.artifactManifestSha256,artifactManifestSha256:softwareHash(manifest),buildOutputSha256:softwareHash(buildOutput),preserveDailyPublication:true,rollbackOnConfirmedVerificationFailure:true,expiryScope:'admission-and-first-promotion',rollbackAfterExpiryWithinLease:true,visualQaRunId:'1234',allowedChangedPaths:options.changedPaths};
 return{document,options,review};
}
test('software review binds exact checkpoint, artifact, source and bounded manual scope',()=>{
 const f=fixture(),context=validateSoftwareReview(f.review,f.options);
 assert.equal(context.dailyVerifiedAt,f.document.latestRelease.verifiedAt);
 assert.doesNotThrow(()=>assertSoftwareContext(f.document,context,now));
 for(const field of ['source','implementationSha256','priorReleaseSha256','previousDeployment','rollbackManifestSha256','artifactManifestSha256','buildOutputSha256'])assert.throws(()=>validateSoftwareReview({...f.review,[field]:'wrong'},f.options));
 for(const mutate of [r=>r.approved=false,r=>r.actorId='someone-else',r=>r.expiresAt='2026-11-04T12:00:00Z',r=>r.allowedChangedPaths=['app/layout.tsx'],r=>r.visualQaRunId='',r=>r.preserveDailyPublication=false]){const r=structuredClone(f.review);mutate(r);assert.throws(()=>validateSoftwareReview(r,f.options));}
});
test('daily data additions/deletions/mode changes are forbidden even when named in review',()=>{
 for(const file of ['content/ltc/2026-11-03-r1.json','public/magazine/daily/2026-11-03-r1/social.png','content/daily-features/2026-11-03.json','public/data/ltc-editions/index.json']){const f=fixture();f.options.changedPaths=[file];f.review.allowedChangedPaths=[file];assert.throws(()=>validateSoftwareReview(f.review,f.options),/software_daily_content_changed/);}
 const records=[{file:'data/ltc-editions/index.json',sha256:'a'.repeat(64)}];
 assert.doesNotThrow(()=>assertSoftwarePublicData(records,[...records,{file:'index.html',sha256:'b'.repeat(64)}]));
 for(const changed of [[],[{...records[0],sha256:'b'.repeat(64)}],[...records,{file:'magazine/daily/new/social.png',sha256:'a'.repeat(64)}]])assert.throws(()=>assertSoftwarePublicData(records,changed));
});
test('software cannot satisfy pending first-proof or recovery gates',()=>{
 for(const key of ['nextFreshGeneration','routineUploadRetirement','routineUploadFollowupRetirement']){const f=fixture();f.document[key]={status:'manual-admitted'};assert.throws(()=>assertSoftwareBaseline(f.document,now),/software_recovery_gate_active/);}
 for(const key of ['paused','restoreHold']){const f=fixture();f.document[key]=true;assert.throws(()=>assertSoftwareBaseline(f.document,now));}
});

// Build both recovery histories through the real pure/in-memory transition
// helpers. No production journal, external services or protected pins are used.
async function recoveredBaseline(followup = true) {
 const f = await (followup ? followupFixture() : routineFixture());
 await (followup ? retireRoutineFollowupUploads : retireRoutineUploads)({env:f.env,state:f.state,review:f.review,dependencies:f.dependencies});
 let snapshot = await f.adapter.read('website'), d = snapshot.value;
 const recordKey = followup ? 'routineUploadFollowupRetirement' : 'routineUploadRetirement';
 const pinPrefix = followup ? 'LTC_ROUTINE_FOLLOWUP' : 'LTC_ROUTINE_RETIREMENT';
 const env = {...f.env,LTC_ACCEPTANCE_MODE:'activate-cloud',[`${pinPrefix}_COMPLETION_SHA256`]:d[recordKey].completionSha256,GITHUB_RUN_ID:'900103'};
 acceptRoutineRetirement(d,{env}); d.paused = false;
 const publication = {...env,LTC_ACCEPTANCE_MODE:undefined,GITHUB_RUN_ID:'900104'};
 const binding = captureRoutineRetirementBinding(d,{env:publication});
 d.fence = 16; d.lease = {runId:'gha-900104-1',fence:16,expiresAt:Date.now()+60000};
 const id = 'summary-'+'6'.repeat(64), intent = structuredClone(d.intents['summary-previous']);
 intent.operationId=id; intent.runId=d.lease.runId; intent.fence=16;
 intent.payload={kind:'drive-evidence',role:'release-summary',archivedStateSha256:'7'.repeat(64),fileId:intent.payload.fileId,folderId:intent.payload.folderId,sha256:'6'.repeat(64),bytes:intent.payload.bytes};
 intent.payloadSha256=softwareHash(intent.payload);
 intent.proof={operationId:id,payloadSha256:intent.payloadSha256,status:'applied',proof:{...intent.proof.proof,sha256:'6'.repeat(64)}};
 intent.evidenceSha256=softwareHash(intent.proof);
 d.intents={[id]:intent}; d.receipts={[id]:{receipt:intent,sha256:softwareHash(intent)}};
 d.latestRelease={source:'5'.repeat(40),deployment:'dpl_NewFixture',summary:{operationId:id,sha256:'6'.repeat(64),archivedStateSha256:'7'.repeat(64),fileId:intent.payload.fileId,folderId:intent.payload.folderId,length:intent.payload.bytes,payloadSha256:intent.payloadSha256}};
 d.archiveHead={schemaVersion:1,summaryOperationId:id,summaryFileId:intent.payload.fileId,summaryFolderId:intent.payload.folderId,summarySha256:'6'.repeat(64),backupSha256:'7'.repeat(64),archiveProofSha256:intent.evidenceSha256,previousArchiveSha256:softwareHash(f.document.archiveHead),archivedIntentCount:4,archivedReceiptCount:4};
 await f.adapter.conditionalWrite('website',d,snapshot.version);
 assert.equal(await completeRoutineRetirementFresh({state:f.state,lease:d.lease},{env:publication,uploadQuarantineBinding:{routineRetirementBinding:binding}}),true);
 d = await f.state.inspect();
 const accepted = {...env,GITHUB_RUN_ID:'900105',[`${pinPrefix}_FRESH_PROOF_SHA256`]:d[recordKey].freshProofSha256};
 acceptRoutineRetirement(d,{env:accepted});
 // A later valid daily checkpoint may advance while recovery proofs stay fixed.
 const daily = fixture().document;
 for (const key of ['paused','restoreHold','lease','intents','receipts','latestRelease','archiveHead']) d[key] = structuredClone(daily[key]);
 return {document:d,env:{...accepted,GITHUB_EVENT_NAME:'schedule'}};
}

test('verified follow-up delegates historical manual marker without modifying history or independent pins',async()=>{
 const {document,env} = await recoveredBaseline(), before = softwareHash(document);
 assert.equal(document.routineUploadRetirement.status,'manual-admitted');
 assert.equal(document.routineUploadFollowupRetirement.status,'routine-enabled');
 assert.doesNotThrow(()=>assertSoftwareBaseline(document,now));
 assert.equal(softwareHash(document),before);
 assert.doesNotThrow(()=>captureRoutineRetirementBinding(document,{env}));
 for (const pin of ['LTC_ROUTINE_RETIREMENT_COMPLETION_SHA256','LTC_ROUTINE_FOLLOWUP_COMPLETION_SHA256','LTC_ROUTINE_FOLLOWUP_FRESH_PROOF_SHA256']) {
  assert.throws(()=>captureRoutineRetirementBinding(document,{env:{...env,[pin]:'0'.repeat(64)}}));
 }
});

test('software rejects incomplete, forged, missing or altered recovery-chain evidence',async()=>{
 const {document} = await recoveredBaseline();
 for (const mutate of [
  d=>delete d.routineUploadFollowupRetirement,
  d=>delete d.routineUploadRetirement,
  d=>d.routineUploadFollowupRetirement={status:'routine-enabled'},
  d=>d.routineUploadFollowupRetirement.status='retired-paused',
  d=>d.routineUploadFollowupRetirement.status='manual-admitted',
  d=>d.routineUploadFollowupRetirement.status='fresh-checkpoint-complete',
  d=>d.routineUploadRetirement.status='routine-enabled',
  d=>d.routineUploadRetirement.completionSha256='0'.repeat(64),
  d=>d.routineUploadFollowupRetirement.review.authorizePriorManualRecordDelegation=false,
  d=>d.routineUploadFollowupRetirement.originalRows.pop(),
  d=>d.routineUploadFollowupRetirement.freshProof.summaryReceiptSnapshot.sha256='0'.repeat(64),
  d=>d.routineUploadFollowupRetirement.routineAcceptedBy.freshProofSha256='0'.repeat(64),
  d=>d.nextFreshGeneration.status='manual-admitted',
 ]) {
  const changed=structuredClone(document); mutate(changed);
  assert.throws(()=>assertSoftwareBaseline(changed,now));
 }
});

test('standalone completed retirement remains valid but a status-only marker is insufficient',async()=>{
 const {document} = await recoveredBaseline(false), before = softwareHash(document);
 assert.doesNotThrow(()=>assertSoftwareBaseline(document,now));
 assert.equal(softwareHash(document),before);
 document.routineUploadRetirement={status:'routine-enabled'};
 assert.throws(()=>assertSoftwareBaseline(document,now));
});
test('inherited daily clock remains unchanged across repeated software releases and midnight',()=>{
 const f=fixture(),context=validateSoftwareReview(f.review,f.options);
 for(const verified of ['2026-11-04T14:00:00Z','2026-11-05T05:01:00Z']){
  const fields=softwareCheckpointFields(context,verified);
  assert.equal(fields.verifiedAt,f.document.latestRelease.verifiedAt);
  const doc=structuredClone(f.document);Object.assign(doc.latestRelease,fields);
  assert.doesNotThrow(()=>assertDailyPublicationAvailable(doc,'2026-11-04'));
  assert.throws(()=>assertDailyPublicationAvailable(doc,'2026-11-03'),DailyPublicationComplete);
 }
 assert.throws(()=>assertSoftwareContext({...f.document,latestRelease:{...f.document.latestRelease,verifiedAt:'2026-11-04T12:00:00Z'}},context,now),/software_baseline_changed/);
});
test('software and daily admission share a single fencing lease; stale checkpoint cannot enter',async()=>{
 const f=fixture(),adapter=new MemoryStateAdapter();await adapter.conditionalWrite('website',f.document,null);
 const state=new DurableCloudState(adapter,'website',{clock:()=>now}),context=validateSoftwareReview(f.review,f.options);
 await state.acquire('software-100-1',3600000,d=>assertSoftwareContext(d,context,now));
 await assert.rejects(state.acquire('gha-100-1',3600000,d=>assertDailyPublicationAvailable(d,'2026-11-04'), '2026-11-04'),/lease_held/);
});
test('software publication accepts only exact founder manual workflow context',()=>{
 const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Satnam-Satoshi/Satoshi-Langar',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_ACTOR_ID:'268053325',GITHUB_WORKFLOW_REF:'Satnam-Satoshi/Satoshi-Langar/.github/workflows/ltc-software-release.yml@refs/heads/main',LTC_SOFTWARE_RELEASE_ENABLED:'true',LTC_CLOUD_PUBLISH:'true',GITHUB_RUN_ID:'1',GITHUB_RUN_ATTEMPT:'1'};
 assert.doesNotThrow(()=>assertSoftwareActionsContext(env));
 for(const field of Object.keys(env))assert.throws(()=>assertSoftwareActionsContext({...env,[field]:'wrong'}));
});
test('visual QA must be successful on exact repository, head, workflow and non-expired artifact',async()=>{
 const source='a'.repeat(40),run={id:1234,head_sha:source,repository:{full_name:'Satnam-Satoshi/Satoshi-Langar'},head_repository:{full_name:'Satnam-Satoshi/Satoshi-Langar'},path:'.github/workflows/site-visual-qa.yml',status:'completed',conclusion:'success'};
 const artifacts={total_count:1,artifacts:[{name:`site-visual-qa-${source}`,expired:false,workflow_run:{head_sha:source}}]};
 const github=async path=>path.includes('/artifacts')?artifacts:run;
 await verifySoftwareVisualQa(github,'1234',source);
 run.head_sha='b'.repeat(40);await assert.rejects(verifySoftwareVisualQa(github,'1234',source));run.head_sha=source;
 artifacts.artifacts[0].expired=true;await assert.rejects(verifySoftwareVisualQa(github,'1234',source));
});
test('API smoke requires JSON handler responses, accepting explicit upstream-unavailable but never static 404',()=>{
 const raw=(status,body,type='application/json')=>`HTTP/2 ${status}\r\nContent-Type: ${type}\r\n\r\n${JSON.stringify(body)}`;
 assert.equal(validateSoftwareApiReadback(raw(200,{schemaVersion:1,status:'partial',checkedAt:'2026-11-04T14:00:00Z'})).status,'partial');
 assert.equal(validateSoftwareApiReadback(raw(503,{schemaVersion:1,status:'unavailable',checkedAt:'2026-11-04T14:00:00Z'})).status,'unavailable');
 for(const value of [raw(404,{}),raw(200,{},'text/html'),raw(503,{schemaVersion:1,status:'fresh',checkedAt:'2026-11-04T14:00:00Z'})])assert.throws(()=>validateSoftwareApiReadback(value));
});
test('manual template stays unscheduled and shares release lock with read-only GitHub permissions',()=>{
 const text=readFileSync(new URL('../ops/ltc-software-release-workflow.yml',import.meta.url),'utf8');
 assert.match(text,/workflow_dispatch:/);assert.doesNotMatch(text,/schedule:|cron:/);
 assert.match(text,/group: ltc-production-publication\s+cancel-in-progress: false/);
 assert.match(text,/contents: read\s+actions: read/);assert.doesNotMatch(text,/contents: write/);
 assert.match(text,/LTC_STATE_FOLDER_ID: \$\{\{ vars.LTC_STATE_FOLDER_ID \}\}/);
 assert.match(text,/LTC_SOFTWARE_RELEASE_REVIEW_SHA256/);assert.match(text,/environment: ltc-production/);
 const visual=readFileSync(new URL('../.github/workflows/site-visual-qa.yml',import.meta.url),'utf8');
 assert.match(visual,/playwright@1\.56\.1/);assert.match(visual,/chromium webkit/);
 assert.match(visual,/test-auth-browser\.mjs/);assert.match(visual,/site-visual-qa-\$\{\{ env.SOURCE_SHA \}\}/);
 assert.doesNotMatch(visual,/secrets\./);
});

test('review expires for new promotion, not for already-authorized bounded rollback cleanup',()=>{
 const f=fixture();assert.doesNotThrow(()=>assertSoftwarePromotionWindow(f.review,now));
 assert.throws(()=>assertSoftwarePromotionWindow(f.review,Date.parse(f.review.expiresAt)),/software_review_expired/);
 const context=validateSoftwareReview(f.review,f.options);
 assert.doesNotThrow(()=>assertSoftwareContext(f.document,context,Date.parse(f.review.expiresAt)+1000));
 const code=readFileSync(new URL('./cloud-ltc-software-release.mjs',import.meta.url),'utf8');
 assert.match(code,/assertPromotionFreshness: \(document, now\) => \{ assertSoftwarePromotionWindow\(review, now\); assertSoftwareContext\(document, softwareRelease, now\); \}/);
});

 test('expired review cannot acquire a lease after delayed remote preflight',async()=>{
 const f=fixture(),adapter=new MemoryStateAdapter();await adapter.conditionalWrite('website',f.document,null);
 const expired=Date.parse(f.review.expiresAt),state=new DurableCloudState(adapter,'website',{clock:()=>expired});
 await assert.rejects(state.acquire('software-expired-1',3600000,()=>assertSoftwarePromotionWindow(f.review,state.clock())),/software_review_expired/);
 assert.equal((await state.inspect()).lease, f.document.lease);
 const code=readFileSync(new URL('./cloud-ltc-software-release.mjs',import.meta.url),'utf8');
 assert.match(code,/state\.acquire\([\s\S]*?document => \{\s*assertSoftwarePromotionWindow\(review, state\.clock\(\)\)/);
});

test('visual acceptance also requires repeated full deployment manifests to agree',()=>{
 const visual=readFileSync(new URL('../.github/workflows/site-visual-qa.yml',import.meta.url),'utf8');
 assert.match(visual,/Require repeated builds to produce identical deployment bytes/);
 assert.match(visual,/assert\.deepEqual\(await builtOutputManifest\('\.vercel\/output'\)/);
 const config=readFileSync(new URL('../next.config.ts',import.meta.url),'utf8');assert.match(config,/cssChunking: false/);
});
