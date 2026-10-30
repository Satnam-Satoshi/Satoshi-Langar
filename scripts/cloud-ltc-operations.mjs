import { createHash } from 'node:crypto';
import { DurableCloudState } from './cloud-ltc-state.mjs';

// Reviewed provider seams only; no credentials, network client or production wiring.
// Provider readback must verify service-specific identities/content, not echo input.
const check = (condition, code) => { if (!condition) throw new Error(code); };
const digest = value => createHash('sha256').update(value).digest('hex');
const validId = value => /^[a-z0-9][a-z0-9_-]{0,79}$/.test(value ?? '');
function encode(value) {
  let bytes;
  try { bytes = JSON.stringify(value); } catch { throw new Error('invalid_operation_payload'); }
  check(typeof bytes === 'string' && Buffer.byteLength(bytes) <= 128_000, 'invalid_operation_payload');
  // Reject values whose serialization silently changes them (undefined, NaN, etc).
  function inspect(item) {
    check(item !== undefined && typeof item !== 'function' && typeof item !== 'symbol' && typeof item !== 'bigint', 'invalid_operation_payload');
    if (typeof item === 'number') check(Number.isFinite(item), 'invalid_operation_payload');
    if (item && typeof item === 'object') {
      check(Array.isArray(item) || Object.getPrototypeOf(item) === Object.prototype || Object.getPrototypeOf(item) === null, 'invalid_operation_payload');
      for (const nested of Object.values(item)) inspect(nested);
    }
  }
  inspect(value); return bytes;
}
export class ReleaseOperationCoordinator {
  constructor({state,lease}) {
    check(state instanceof DurableCloudState && validId(lease?.runId) && Number.isSafeInteger(lease.fence), 'invalid_operation_configuration');
    this.state = state; this.lease = lease;
  }
  #context(operationId, payload) {
    check(validId(operationId), 'invalid_operation_id');
    return {operationId, payload:structuredClone(payload), payloadSha256:digest(encode(payload))};
  }
  async execute({operationId,payload,provider}) {
    const context = this.#context(operationId,payload);
    check(provider && typeof provider.apply === 'function' && typeof provider.readback === 'function', 'invalid_operation_configuration');
    const intent = await this.state.intend(this.lease,operationId,context.payloadSha256,context.payload);
    // A terminal receipt never permits another effect with this operation ID.
    if (['confirmed','not-applied'].includes(intent.status)) return {status:intent.status,evidenceSha256:intent.evidenceSha256,appliedNow:false};
    check(intent.status === 'pending', 'operation_reconciliation_required');
    // Writes uncertainty durably BEFORE calling provider. Concurrent calls can
    // authorize at most one effect; crash after this point requires readback.
    await this.state.assertMayMutate(this.lease,operationId);
    try { await provider.apply({...structuredClone(context), fence:this.lease.fence}); }
    catch { throw new Error('operation_outcome_uncertain'); }
    return {...await this.reconcile({operationId,payload,provider}),appliedNow:true};
  }
  async reconcile({operationId,payload,provider}) {
    const context = this.#context(operationId,payload);
    check(provider && typeof provider.readback === 'function', 'invalid_operation_configuration');
    const document = await this.state.inspect(); const intent = document.intents[operationId];
    check(intent && intent.payloadSha256 === context.payloadSha256, 'idempotency_conflict');
    if (['confirmed','not-applied'].includes(intent.status)) return {status:intent.status,evidenceSha256:intent.evidenceSha256,appliedNow:false};
    // Pending means authorization was never durably granted. Only uncertain
    // operations have possibly crossed the external-effect boundary.
    check(intent.status === 'uncertain', 'operation_reconciliation_required');
    let result;
    try { result = await provider.readback(structuredClone(context)); }
    catch { throw new Error('operation_outcome_uncertain'); }
    check(result?.operationId === operationId && result.payloadSha256 === context.payloadSha256, 'operation_readback_invalid');
    check(['applied','not-applied','unknown'].includes(result.status), 'operation_readback_invalid');
    if (result.status === 'unknown') throw new Error('operation_outcome_uncertain');
    // Absence is not proof that a timed-out request cannot later complete.
    // A provider must establish definitive non-application before terminalizing.
    check(result.status !== 'not-applied' || result.definitive === true, 'operation_readback_invalid');
    check(result.proof && typeof result.proof === 'object' && !Array.isArray(result.proof) && Object.keys(result.proof).length > 0, 'operation_readback_invalid');
    const proof = {operationId,payloadSha256:context.payloadSha256,status:result.status,proof:result.proof};
    const evidenceSha256 = digest(encode(proof));
    const status = result.status === 'applied' ? 'confirmed' : 'not-applied';
    await this.state.reconcile(operationId,status,evidenceSha256,proof);
    return {status,evidenceSha256,proof,appliedNow:false};
  }
}
// Deliberately narrow sequential release plan. No rollback or mutation retry is
// invented here; each needs its own explicit operation and verified provider.
export async function runBoundedReleaseOperations(coordinator, steps) {
  const kinds = ['source','evidence','stage','promote'];
  check(coordinator instanceof ReleaseOperationCoordinator && Array.isArray(steps) && steps.length === kinds.length && steps.every((step,i) => step.kind === kinds[i]) && new Set(steps.map(step=>step.operationId)).size === steps.length, 'invalid_release_operation_plan');
  const receipts = [];
  for (const step of steps) {
    const receipt = await coordinator.execute(step);
    check(receipt.status === 'confirmed', 'release_operation_not_confirmed');
    receipts.push({kind:step.kind,operationId:step.operationId,...receipt});
  }
  return receipts;
}
