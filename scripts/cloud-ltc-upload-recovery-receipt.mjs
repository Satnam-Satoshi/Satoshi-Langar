import { writeFile } from 'node:fs/promises';

// Literal codes only: never serialize a provider exception, URL, stack, cause,
// credential, review payload or arbitrary error message into the safe summary.
const codes = new Set([
  'upload_recovery_review_expired', 'upload_recovery_review_pin_mismatch',
  'upload_recovery_review_required', 'upload_recovery_origin_required',
  'upload_recovery_generation_required', 'upload_recovery_revision_changed',
  'upload_recovery_snapshot_changed', 'upload_recovery_private_binding_changed',
  'upload_recovery_configuration_required', 'upload_recovery_public_baseline_required',
  'upload_recovery_non_archive_intents', 'upload_recovery_nonterminal_shape_changed',
  'upload_recovery_pending_has_receipt', 'upload_recovery_confirmed_proof_required',
  'upload_recovery_history_conflict', 'upload_recovery_stale_proof',
  'upload_recovery_origin_not_completed', 'upload_recovery_writers_not_stopped',
  'upload_recovery_public_baseline_changed', 'upload_recovery_confirmed_readback_changed',
  'upload_recovery_replay_pin_required', 'upload_recovery_replay_changed',
  'upload_recovery_controller_changed', 'upload_recovery_source_changed',
  'upload_recovery_policy_stop_required', 'upload_recovery_writer_inventory_incomplete',
  'upload_recovery_other_writer_active', 'upload_recovery_local_writer_proof_required',
  'upload_recovery_confirmed_readback_unavailable', 'upload_recovery_origin_changed',
  'upload_recovery_write_guard_unarmed', 'upload_recovery_guard_already_armed',
  'upload_recovery_write_outcome_uncertain', 'private_storage_required',
  'invalid_cloud_state_configuration', 'invalid_storage_configuration',
  'invalid_state_document', 'state_capacity_exceeded', 'storage_read_failed',
  'storage_write_uncertain', 'state_conflict', 'provider_read_unavailable',
]);
const phases = new Set(['private-resource-preflight', 'controller-verification', 'state-post-attempted', 'receipt-finalization']);

export function sanitizedUploadRecoveryFailure(error) {
  try {
    const descriptor = error && typeof error === 'object' ? Object.getOwnPropertyDescriptor(error, 'message') : null;
    const code = descriptor?.value;
    if (typeof code === 'string' && codes.has(code)) return code;
  } catch {} // Even a hostile Proxy must not replace the original failure.
  return 'unclassified_recovery_failure';
}

// Local receipt writes only. No retries of the supplied operation, no provider
// effects, and no changes to recovery admission, freshness or CAS predicates.
export async function withUploadRecoveryReceipt({ receipt, reviewSha256 }, operation) {
  await writeFile(receipt, JSON.stringify({ status: 'started', reviewSha256 }) + '\n', { flag: 'wx', mode: 0o600 });
  let failurePhase = 'private-resource-preflight';
  let statePostAttempted = false;
  const diagnostic = Object.freeze({
    phase(value) { if (phases.has(value)) failurePhase = value; },
    beforeStatePost() { statePostAttempted = true; failurePhase = 'state-post-attempted'; },
  });
  try {
    const result = await operation(diagnostic);
    failurePhase = 'receipt-finalization';
    await writeFile(receipt, JSON.stringify(result) + '\n', { mode: 0o600 });
    return result;
  } catch (error) {
    const failure = { status: 'failed', reviewSha256, failure: sanitizedUploadRecoveryFailure(error),
      failurePhase, statePostAttempted, stateChanged: statePostAttempted ? null : false,
      stateOutcome: statePostAttempted ? 'requires-independent-readback' : 'no-state-post-attempted',
      publicationPerformed: false, effectsReissued: false };
    // A local disk failure must not hide the original error or trigger a second
    // recovery call. A started-only receipt remains conservatively unresolved.
    try { await writeFile(receipt, JSON.stringify(failure) + '\n', { mode: 0o600 }); } catch {}
    throw error;
  }
}
