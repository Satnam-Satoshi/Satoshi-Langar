import {prepareF33Retirement,f33Hash} from './cloud-ltc-f33-retirement-plan.mjs';
const check=(v,c)=>{if(!v)throw Error('f33_bridge_'+c);};
const clone=v=>structuredClone(v);
// Read-only bridge. Functions must be authenticated runtime readers, never
// caller-provided JSON assertions. In particular controls are NOT synthesized.
export async function readF33PlannerInputs({config,expectedSourceHead,expectedCurrentMain,readState,collectFull,readOrigin,readVerifiedControls,clock=Date.now}){
 const c=clone(config);check(/^[a-f0-9]{40}$/.test(expectedSourceHead??'')&&/^[a-f0-9]{40}$/.test(expectedCurrentMain??''),'source_pins');
 for(const f of[readState,collectFull,readOrigin,readVerifiedControls,clock])check(typeof f==='function','reader');
 const started=clock();check(Number.isFinite(started),'clock');
 const initial=clone(await readState());const full=clone(await collectFull());
 check(full?.status==='full-read-only-evidence-complete'&&full.casAuthorized===false&&full.writerBarrierVerified===false&&full.stateChanged===false&&full.retryAuthorized===false&&full.currentSource===expectedCurrentMain&&full.snapshotVersion===initial.version&&full.snapshotSha256===f33Hash(initial.value),'collection_binding');
 const origin=clone(await readOrigin()),controls=clone(await readVerifiedControls());
 check(controls?.sourceHead===expectedSourceHead&&typeof controls.observedAt==='string'&&typeof origin?.observedAt==='string','verified_reader_metadata');
 const after=clone(await readState());check(after.version===initial.version&&f33Hash(after.value)===f33Hash(initial.value),'snapshot_changed');
 const now=clock();check(Number.isFinite(now)&&now>=started&&now-started<=300000,'clock');const d=initial.value,uncertain=Object.values(d.intents??{}).find(r=>r.fence===33&&r.status==='uncertain');
 check(uncertain&&full.uncertain?.operationId===uncertain.operationId&&full.uncertain.observed==='unknown'&&full.uncertain.proof===null&&full.uncertain.diagnostic?.reason==='not-found'&&full.uncertain.diagnostic.httpStatus===404,'unknown_observation_not_404');
 check(c.folderId===uncertain.payload.folderId&&typeof c.ownerPermissionId==='string','resource_binding');
 const review={schemaVersion:1,kind:'f33-retirement-proposal',authorization:'proposal-only',authorizePublication:false,authorizeReplay:false,authorizeUnpause:false,repository:'Satnam-Satoshi/Satoshi-Langar',ledgerKey:'website',snapshotVersion:initial.version,snapshotSha256:f33Hash(d),latestReleaseSha256:f33Hash(d.latestRelease),archiveHeadSha256:f33Hash(d.archiveHead),workflowHead:origin.head_sha,sourceHead:expectedSourceHead,sourcePolicySha256:controls.sourcePolicySha256,folderId:c.folderId,ownerPermissionId:c.ownerPermissionId,uncertainFileId:uncertain.payload.fileId,expectedDeployment:d.latestRelease?.deployment};
 // Fullcollector guards the entire observation window; retain actual captured
 // timestamps, never restamp older evidence to extend its validity. If the
 // collector lacks an uncertain timestamp, use this read-window START (older
 // than the observation), not the completion time. This only tightens freshness.
 check(typeof full.publicBaseline?.observedAt==='string','collection_timestamp');
 const evidence={origin,controls,publicBaseline:full.publicBaseline,confirmedReadbacks:full.confirmedReadbacks,unknownObservation:{observedAt:full.uncertain.observedAt??new Date(started).toISOString(),operationId:uncertain.operationId,payloadSha256:uncertain.payloadSha256,fileId:uncertain.payload.fileId,observed:'unknown',diagnostic:'evidence_known_file_not_found',snapshotSha256:review.snapshotSha256}};
 const expectedReviewSha256=f33Hash(review),inputs={snapshot:d,snapshotVersion:initial.version,review,expectedReviewSha256,evidence,now};
 prepareF33Retirement(inputs);return inputs;
}
