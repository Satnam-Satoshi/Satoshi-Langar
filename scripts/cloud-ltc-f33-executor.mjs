import { createF33RetirementCandidate } from './cloud-ltc-f33-retirement-record.mjs';
import { randomUUID } from 'node:crypto';
import { prepareF33Retirement, f33Hash } from './cloud-ltc-f33-retirement-plan.mjs';
import { encodeStateEnvelope } from './cloud-ltc-state-envelope.mjs';

// Isolated orchestration only. No CLI, credentials, real adapters or production
// wiring. Injected adapters are TRUSTED capabilities, not user-supplied data.
// Owner: Founder. Mission: one paused retirement, never publication/replay.
// A boolean in JSON cannot grant authority. Production adapters must authenticate
// owner consent, verify providers, enforce a continuous all-writer barrier and
// lineage ban, and durably reserve the singleton incident receipt atomically.
const check = (ok, code) => { if (!ok) throw Error(`f33_executor_${code}`); };
const freeze = value => { if (value && typeof value === 'object') { for (const v of Object.values(value)) freeze(v); Object.freeze(value); } return value; };
export async function executeF33Retirement({ review, expectedReviewSha256, authorizationToken }, adapters) {
  for (const name of ['now','readVerifiedInputs','authorizeOwner','acquireBarrier','reserveReceipt','compareAndSwap','readEnvelope','finishReceipt']) check(typeof adapters?.[name] === 'function', 'adapter_missing');
  const pinnedReview = freeze(structuredClone(review));
  const inputs = await adapters.readVerifiedInputs();
  const plan = prepareF33Retirement({ ...inputs, review:pinnedReview, expectedReviewSha256, now:adapters.now() });
  const nonce = randomUUID();
  const scope = freeze({ incident:'gha-43608206507-1/fence33', action:'retire-paused-only', reviewSha256:expectedReviewSha256,
    expectedRevision:plan.expectedRevision, expectedSnapshotSha256:plan.expectedSnapshotSha256, nonce });
  // Barrier capability acquisition must not silently change external settings.
  // Its implementation requires independently authorized persistent exclusion.
  const barrier = await adapters.acquireBarrier(scope);
  check(barrier && typeof barrier.assertHeld === 'function', 'barrier');
  const assertBarrier = barrier.assertHeld.bind(barrier);
  check(assertBarrier(scope) === true, 'barrier_lost');
  const fresh = freeze(structuredClone(await adapters.readVerifiedInputs()));
  const finalCandidate = createF33RetirementCandidate({ ...fresh, review:pinnedReview, expectedReviewSha256, now:adapters.now() });
  const binding = freeze({ ...scope, proposedStateSha256:finalCandidate.stateSha256, proposalStateSha256:finalCandidate.proposalStateSha256 });
  // Consent is bound to the FINAL candidate, after refreshed observation times.
  const authority = await adapters.authorizeOwner(authorizationToken, binding);
  check(authority && typeof authority.assertValid === 'function', 'authority');
  const assertAuthority = authority.assertValid.bind(authority);
  const guard = () => {
    check(assertAuthority(binding) === true, 'authority_lost');
    check(assertBarrier(scope) === true, 'barrier_lost');
    // Revalidate freshness after every wait, especially immediately before POST.
    const current = createF33RetirementCandidate({ ...fresh, review:pinnedReview, expectedReviewSha256, now:adapters.now() });
    check(current.stateSha256 === binding.proposedStateSha256, 'plan_changed');
  };
  guard();
  const envelope = encodeStateEnvelope('website', finalCandidate.state, nonce);
  const request = freeze({ ...binding, envelope, envelopeSha256:f33Hash(envelope) });
  // Adapter must reserve once PER INCIDENT, across processes/crashes/nonce.
  // Failure/unknown reservation leaves a permanent stop, never a retry here.
  const receipt = await adapters.reserveReceipt(request);
  check(receipt && typeof receipt.assertReserved === 'function', 'receipt');
  const assertReserved = receipt.assertReserved.bind(receipt);
  const finalGuard = () => { guard(); check(assertReserved(request) === true, 'reservation_lost'); };
  finalGuard();
  let guardCalls = 0;
  // Adapter MUST execute this synchronously after credentials/privacy awaits,
  // immediately before its only transport send. It must never retry internally.
  const beforeSend = () => { check(++guardCalls === 1, 'duplicate_send'); finalGuard(); };
  let outcome;
  try { await adapters.compareAndSwap(request, { beforeSend }); }
  catch { /* Provider raw failures never escape; exact readback is required. */ }
  try {
    finalGuard();
    const observed = await adapters.readEnvelope(request);
    finalGuard();
    outcome = guardCalls === 1 && observed?.raw === envelope && typeof observed.revision === 'string' && observed.revision.length > 0 && observed.revision !== request.expectedRevision
      ? 'verified-paused-retirement' : 'outcome-uncertain';
  } catch { outcome = 'outcome-uncertain'; }
  // Even original-state readback stays uncertain: a delayed CAS can still land.
  // No retries, no automatic barrier release, no publication or unpause.
  const result = freeze({ status:outcome, nonce, envelopeSha256:request.envelopeSha256, publicationPerformed:false, retryAllowed:false, barrierReleaseAllowed:false });
  try { await adapters.finishReceipt(receipt, result); }
  catch { return freeze({ ...result, status:'receipt-finalization-uncertain' }); }
  return result;
}
