import { createHash } from 'node:crypto';
import { encodeStateEnvelope } from './cloud-ltc-state-envelope.mjs';

// Pure review artifact only. No I/O, runtime entrypoint, credentials, provider
// mutation, or authority to apply the proposed state. Human Owner: Founder.
// Mission: preserve the failed run's audit trail and propose fenced retirement.
// Emergency stop: every mismatch throws before a proposal is returned.
export const f33Hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const check = (ok, code) => { if (!ok) throw Error(`f33_${code}`); };
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const digest = v => /^[a-f0-9]{64}$/.test(v ?? '');
const commit = v => /^[a-f0-9]{40}$/.test(v ?? '');
const opaque = v => /^[A-Za-z0-9_-]{8,160}$/.test(v ?? '');
const run = 'gha-43608206507-1';
const repository = 'Satnam-Satoshi/Satoshi-Langar';
const generation = 'f33-7092158f2193ac73';
const packageHash = 'e83bf0e6aeb88e01f7fb49bfa5d602f5319a023971f6cfdfc0ffade7a1de4727';
const uncertainId = 'evidence-3f4c009e11e060fe0b51b84fa26e3cf6293a5c9a71c62dc43459f62ec37ca859';
function fresh(p, now) {
  const at = Date.parse(p?.observedAt);
  check(Number.isFinite(at) && at <= now && now-at <= 300000, 'stale_proof');
}
function receipt(row, receipts) {
  check(digest(row.evidenceSha256) && row.evidenceSha256 === f33Hash(row.proof) &&
    receipts[row.operationId]?.sha256 === f33Hash(row) && same(receipts[row.operationId].receipt,row), 'receipt_changed');
}
/** Inputs must come from independently verified reads; this function cannot
 * authenticate supplied observations. A future reviewed executor must re-read
 * every barrier and compare the exact monotonic revision immediately before CAS.
 */
export function prepareF33Retirement({ snapshot: input, snapshotVersion, review: requested, expectedReviewSha256, evidence: supplied, now }) {
  const document = structuredClone(input), review = structuredClone(requested), evidence = structuredClone(supplied);
  check(Number.isFinite(now) && digest(expectedReviewSha256) && f33Hash(review) === expectedReviewSha256, 'review_pin');
  check(review?.schemaVersion === 1 && review.kind === 'f33-retirement-proposal' && review.authorization === 'proposal-only' &&
    review.authorizePublication === false && review.authorizeReplay === false && review.authorizeUnpause === false &&
    review.repository === repository && review.ledgerKey === 'website', 'scope');
  check(typeof snapshotVersion === 'string' && snapshotVersion.length > 0 && snapshotVersion.length <= 2048 &&
    snapshotVersion === review.snapshotVersion && f33Hash(document) === review.snapshotSha256 &&
    f33Hash(document.latestRelease) === review.latestReleaseSha256 && f33Hash(document.archiveHead) === review.archiveHeadSha256 &&
    commit(review.workflowHead) && commit(review.sourceHead) && digest(review.sourcePolicySha256) && opaque(review.ownerPermissionId) && opaque(review.folderId) && opaque(review.uncertainFileId) && /^dpl_[A-Za-z0-9_-]{8,160}$/.test(review.expectedDeployment ?? ''), 'snapshot_pin');
  check(document.schemaVersion === 1 && document.paused === false && document.restoreHold === false &&
    document.fence === 33 && document.lease?.fence === 33 && document.lease.runId === run &&
    document.lease.publicationDate === '2026-11-14' && Number.isFinite(document.lease.expiresAt) && document.lease.expiresAt <= now &&
    !Object.hasOwn(document,'f33Retirement'), 'lease');
  check(document.latestRelease?.editionId === '2026-11-13-r1' && document.latestRelease.deployment === review.expectedDeployment &&
    document.latestRelease.source === '80f0227ba74da75163f8528a3a24a2db54b2da3e' &&
    document.archiveHead?.summaryOperationId === document.latestRelease.summary?.operationId && digest(document.latestRelease.artifactManifestSha256), 'baseline');
  check(document.intents && document.receipts && !Array.isArray(document.intents) && !Array.isArray(document.receipts), 'shape');
  const rows = Object.values(document.intents).filter(r => r.fence === 33).sort((a,b)=>a.payload?.artifactBundleIndex-b.payload?.artifactBundleIndex);
  check(rows.length === 51 && new Set(rows.map(r=>r.payload?.fileId)).size === 51, 'generation');
  for (const [key,row] of Object.entries(document.intents)) {
    check(row.operationId === key && row.payloadSha256 === f33Hash(row.payload), 'intent_binding');
    if (row.fence !== 33) { check(row.runId !== run && row.fence < 33 && ['confirmed','not-applied'].includes(row.status), 'other_intents'); receipt(row,document.receipts); }
  }
  for (const [index,row] of rows.entries()) {
    const p=row.payload;
    check(row.runId === run && row.status === (index<34?'confirmed':index===34?'uncertain':'pending') &&
      p?.kind === 'drive-evidence' && p.role === 'release-artifacts' && p.generation === generation &&
      p.artifactPackageManifestSha256 === packageHash && p.artifactBundleCount === 51 && p.artifactBundleIndex === index &&
      p.folderId === review.folderId && opaque(p.fileId) && digest(p.sha256) && Number.isSafeInteger(p.bytes) && p.bytes>0 && p.bytes<=3500000, 'generation');
    if(index<34) {
      receipt(row,document.receipts);
      const q=row.proof, remote=q?.proof;
      check(q.operationId===row.operationId && q.payloadSha256===row.payloadSha256 && q.status==='applied' &&
        remote?.fileId===p.fileId && remote.folderId===p.folderId && remote.sha256===p.sha256 && remote.length===p.bytes &&
        remote.ownerPermissionId===review.ownerPermissionId && remote.ownerOnly===true && remote.downloadVerified===true, 'confirmed_binding');
    } else check(row.evidenceSha256===null && !Object.hasOwn(row,'proof') && !Object.hasOwn(document.receipts,row.operationId), 'nonterminal_receipt');
  }
  check(Object.keys(document.receipts).every(k=>document.intents[k] && ['confirmed','not-applied'].includes(document.intents[k].status)), 'orphan_receipt');
  check(rows[34].operationId===uncertainId && rows[34].payload.fileId===review.uncertainFileId &&
    rows[34].payload.sha256==='048213a85dd7763cf42b2f600b8971ee429572dab325c711e6e1de9404f2bea5' && rows[34].payload.bytes===1253443, 'uncertain_binding');
  const {origin,controls,publicBaseline,confirmedReadbacks,unknownObservation}=evidence;
  for(const p of [origin,controls,publicBaseline,unknownObservation]) fresh(p,now);
  check(origin.repository===repository && String(origin.id)==='43608206507' && String(origin.run_attempt)==='1' &&
    origin.status==='completed' && origin.conclusion==='failure' && origin.head_branch==='main' && origin.head_sha===review.workflowHead &&
    origin.event==='workflow_dispatch' && origin.path==='.github/workflows/ltc-daily-publication.yml', 'origin');
  check(controls.repository===repository && controls.sourceHead===review.sourceHead && controls.sourcePolicySha256===review.sourcePolicySha256 &&
    controls.cloudPublicationEnabled===false && controls.localPublisherDisabled===true && controls.otherWritersStopped===true &&
    controls.activeWriterCount===0 && digest(controls.writerEvidenceSha256), 'writers');
  check(publicBaseline.artifactManifestSha256===document.latestRelease.artifactManifestSha256 && Number.isSafeInteger(publicBaseline.manifestCount) && publicBaseline.manifestCount>0 &&
    Array.isArray(publicBaseline.domains) && publicBaseline.domains.length===2 &&
    ['https://ltcmagazine.org','https://satnamsatoshi.com'].every(domain=>publicBaseline.domains.filter(p=>p.domain===domain &&
      p.deployment===document.latestRelease.deployment && p.allManifestBytesVerified===true && p.verifiedCount===publicBaseline.manifestCount).length===1), 'public_changed');
  check(Array.isArray(confirmedReadbacks) && confirmedReadbacks.length===34 && new Set(confirmedReadbacks.map(p=>p.operationId)).size===34, 'readbacks');
  for(const row of rows.slice(0,34)) {
    const p=confirmedReadbacks.find(p=>p.operationId===row.operationId); fresh(p,now);
    const {observedAt,operationId,payloadSha256,...proof}=p;
    check(payloadSha256===row.payloadSha256 && same(proof,row.proof.proof), 'readback_changed');
  }
  // Missing file is retained as UNKNOWN, never used to claim not-applied.
  check(unknownObservation.operationId===uncertainId && unknownObservation.payloadSha256===rows[34].payloadSha256 &&
    unknownObservation.fileId===rows[34].payload.fileId && unknownObservation.observed==='unknown' &&
    unknownObservation.diagnostic==='evidence_known_file_not_found' && unknownObservation.snapshotSha256===review.snapshotSha256, 'unknown_observation');
  const proposedState=structuredClone(document);
  for(const row of rows) { delete proposedState.intents[row.operationId]; delete proposedState.receipts[row.operationId]; }
  proposedState.paused=true; proposedState.fence=34; proposedState.lease=null;
  proposedState.f33Retirement={schemaVersion:1,status:'proposed-not-applied',originalFields:{paused:document.paused,fence:document.fence,lease:document.lease},originalSnapshotSha256:review.snapshotSha256,
    originalRows:rows,originalReceipts:Object.fromEntries(rows.filter(r=>Object.hasOwn(document.receipts,r.operationId)).map(r=>[r.operationId,document.receipts[r.operationId]])),review,reviewSha256:expectedReviewSha256,evidence,outcome:'UNKNOWN',unknownAccepted:false,
    requiresOldGenerationBan:true,effectsReissued:false,publicationPerformed:false};
  // Validate storage capacity before presenting a candidate. The archived delta
  // reconstructs the original exactly, without duplicating older audit history.
  encodeStateEnvelope('website',proposedState);
  const reconstructed=structuredClone(proposedState), archived=reconstructed.f33Retirement;
  delete reconstructed.f33Retirement;
  Object.assign(reconstructed,archived.originalFields);
  for(const row of archived.originalRows) reconstructed.intents[row.operationId]=row;
  Object.assign(reconstructed.receipts,archived.originalReceipts);
  check(same(reconstructed,document),'reconstruction');
  return {status:'proposal-only',applied:false,publicationPerformed:false,effectsReissued:false,authorizeUnpause:false,
    expectedRevision:snapshotVersion,expectedSnapshotSha256:review.snapshotSha256,proposedStateSha256:f33Hash(proposedState),proposedState};
}
