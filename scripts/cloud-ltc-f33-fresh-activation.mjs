import { randomUUID } from 'node:crypto';
import { f33Digest, proposeF33FreshAdmission } from './cloud-ltc-f33-fresh-admission.mjs';
import { decodeStateEnvelope, encodeStateEnvelope } from './cloud-ltc-state-envelope.mjs';
import { createNativeFreshActivationAuthority } from './cloud-ltc-native-fresh-activation-authority.mjs';

const check = (value, code) => { if (!value) throw Error(`f33_activation_${code}`); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function verifyFinishedF33Receipt(receipt, snapshot, configuration) {
  const request = receipt?.request, result = receipt?.result;
  check(f33Digest(receipt) === configuration.completionReceiptSha256 && receipt.kind === 'f33-recovery-reservation' && receipt.status === 'finished', 'receipt_binding');
  check(request?.incident === 'gha-43608206507-1/fence33' && request.action === 'retire-paused-only' &&
    request.proposedStateSha256 === configuration.snapshotSha256 && result?.status === 'verified-paused-retirement' &&
    result.nonce === request.nonce && result.envelopeSha256 === f33Digest(request.envelope) &&
    request.envelopeSha256 === result.envelopeSha256 && result.publicationPerformed === false &&
    result.retryAllowed === false && result.barrierReleaseAllowed === false, 'receipt_outcome');
  check(same(decodeStateEnvelope(request.envelope, 'website'), snapshot), 'receipt_snapshot');
  return true;
}

// Executable orchestration, NOT a command-line production installation. Provider
// adapters and exclusion verifier are trusted reviewed capabilities, not JSON.
// acquireExclusion must prove old revisions cannot run with mutating credentials,
// not merely that no runner was active at a sampled instant. It must also hold the
// shared concurrency group and preserve local-writer stop through the sole CAS.
// This function deliberately has no permissive default for that requirement.
export async function executeF33FreshActivation({configuration, native, token}, {
  clock = Date.now, fetchImpl = fetch, verifyImplementation, acquireExclusion,
  readState, readFinishedReceipt, verifyPublicBaseline, compareAndSwapExact,
  readRawEnvelope, saveResult,
}) {
  for (const fn of [verifyImplementation, acquireExclusion, readState, readFinishedReceipt,
    verifyPublicBaseline, compareAndSwapExact, readRawEnvelope, saveResult]) check(typeof fn === 'function', 'adapter_required');
  const c = structuredClone(configuration);
  check(native.runId === c.ownerRunId && native.sourceSha === c.sourceCommit &&
    native.executedSourceSha === c.sourceCommit && native.expectedAdmissionSha256 === f33Digest(c), 'native_binding');
  // Reviewed bytes checked before any service credential usage by these adapters.
  await verifyImplementation(c.implementationSha256, c.sourceCommit);
  const authorize = createNativeFreshActivationAuthority({config:native,token,fetchImpl,clock});
  const snapshot = await readState();
  check(typeof snapshot.version === 'string' && snapshot.version.length > 0, 'revision');
  const candidate = proposeF33FreshAdmission(snapshot.value, c);
  verifyFinishedF33Receipt(await readFinishedReceipt(), snapshot.value, c);
  await verifyPublicBaseline(c.previousDeployment, snapshot.value.latestRelease);
  const binding = Object.freeze({incident:'gha-43608206507-1/fence33',action:'admit-fresh-website-only',
    admissionSha256:f33Digest(c),expectedRevision:snapshot.version,expectedSnapshotSha256:f33Digest(snapshot.value),
    nonce:randomUUID(),proposedStateSha256:f33Digest(candidate)});
  const authority = await authorize(null, binding);
  const exclusion = await acquireExclusion({binding,configuration:c});
  check(exclusion && typeof exclusion.assertHeld === 'function', 'exclusion_required');
  const guard = () => {
    check(authority.assertValid(binding) === true && exclusion.assertHeld(binding) === true, 'authority_lost');
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(clock()));
    check(today === c.publicationDate, 'date_changed');
  };
  guard();
  const current = await readState();
  check(current.version === snapshot.version && same(current.value,snapshot.value), 'snapshot_changed');
  verifyFinishedF33Receipt(await readFinishedReceipt(), current.value, c);
  await verifyPublicBaseline(c.previousDeployment, current.value.latestRelease);
  guard();
  const envelope = encodeStateEnvelope('website',candidate,binding.nonce);
  let sends=0;
  const beforeSend = () => { check(++sends===1,'duplicate_send'); guard(); };
  try { await compareAndSwapExact({binding,envelope,candidate,configuration:c},{beforeSend}); }
  catch { /* A lost response is resolved only by exact nonce-bearing readback. */ }
  let status=sends===0?'admission-write-not-attempted':'admission-outcome-uncertain';
  try {
    guard(); const observed=await readRawEnvelope(); guard();
    if(sends===1 && observed.raw===envelope && typeof observed.revision==='string' && observed.revision!==binding.expectedRevision)
      status='fresh-website-admission-verified';
  } catch { /* Never retry or infer no-write from the old state. */ }
  const result={status,nonce:binding.nonce,admissionSha256:f33Digest(c),publicationPerformed:false,
    retryAllowed:false,writeAttempted:sends>0,oldGenerationBanned:true,unknownAccepted:false,barrierReleaseAllowed:false};
  // A verified admission still does not lift the external stop. The reviewed
  // fresh publisher must be installed and bound before the workflow ends it.
  try { await saveResult(result); } catch { return {...result,status:'admission-result-retention-uncertain'}; }
  return result;
}
