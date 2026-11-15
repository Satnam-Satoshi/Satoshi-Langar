import { prepareF33Retirement, f33Hash } from './cloud-ltc-f33-retirement-plan.mjs';
import { encodeStateEnvelope } from './cloud-ltc-state-envelope.mjs';
// Pure candidate schema. 'retired-paused' is desired ledger state, NOT a claim
// of applied CAS. Only authenticated invocation-bound readback confirms storage.
// No admission/re-enable authority. Ordinary writers still reject this record.
const check = (ok, code) => { if (!ok) throw Error(`f33_record_${code}`); };
function candidateFromPlan(plan) {
  const state = structuredClone(plan.proposedState);
  const record = state.f33Retirement;
  record.status = 'retired-paused';
  record.appliedRecordSchemaVersion = 1;
  record.proposalStateSha256 = plan.proposedStateSha256;
  encodeStateEnvelope('website', state);
  return { state, stateSha256:f33Hash(state), proposalStateSha256:plan.proposedStateSha256 };
}
export function createF33RetirementCandidate(inputs) {
  return candidateFromPlan(prepareF33Retirement(inputs));
}
export function validateF33RetirementCandidate(candidate, { expectedReviewSha256, expectedStateSha256, now }) {
  const state = structuredClone(candidate), r = state?.f33Retirement;
  check(r && r.status === 'retired-paused' && r.appliedRecordSchemaVersion === 1 &&
    r.reviewSha256 === expectedReviewSha256 && f33Hash(state) === expectedStateSha256, 'binding');
  check(state.paused === true && state.fence === 34 && state.lease === null &&
    r.outcome === 'UNKNOWN' && r.unknownAccepted === false && r.requiresOldGenerationBan === true &&
    r.effectsReissued === false && r.publicationPerformed === false, 'scope');
  check(Array.isArray(r.originalRows) && r.originalRows.length === 51 && r.originalReceipts && r.originalFields, 'archive');
  const original = structuredClone(state);
  delete original.f33Retirement;
  Object.assign(original, r.originalFields);
  for (const row of r.originalRows) {
    check(typeof row?.operationId === 'string' && !Object.hasOwn(original.intents,row.operationId), 'overlap');
    original.intents[row.operationId] = row;
  }
  for (const [key,value] of Object.entries(r.originalReceipts)) {
    check(!Object.hasOwn(original.receipts,key), 'overlap');
    original.receipts[key] = value;
  }
  check(f33Hash(original) === r.originalSnapshotSha256, 'original_hash');
  const plan = prepareF33Retirement({snapshot:original,snapshotVersion:r.review.snapshotVersion,review:r.review,expectedReviewSha256,evidence:r.evidence,now});
  const canonical = candidateFromPlan(plan);
  check(canonical.proposalStateSha256 === r.proposalStateSha256 && canonical.stateSha256 === expectedStateSha256 &&
    JSON.stringify(canonical.state) === JSON.stringify(state), 'canonical');
  return {valid:true,stateSha256:canonical.stateSha256,publicationAuthorized:false,unpauseAuthorized:false};
}
