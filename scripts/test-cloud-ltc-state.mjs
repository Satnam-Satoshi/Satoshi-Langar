import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DurableCloudState, MemoryStateAdapter, PrivateGitHubStateAdapter } from './cloud-ltc-state.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const payload = hash('exact release manifest');
const evidence = hash('verified service readback');
const setup = () => {
  let now = 1000;
  const adapter = new MemoryStateAdapter();
  const state = new DurableCloudState(adapter, 'website', { clock: () => now });
  return { adapter, state, advance: milliseconds => { now += milliseconds; } };
};

test('new storage defaults paused and concurrent acquisitions yield exactly one writer', async () => {
  const { state } = setup();
  await assert.rejects(state.acquire('run-a'), /publication_paused/);
  await state.setPaused(false);
  const attempts = await Promise.allSettled([state.acquire('run-a'), state.acquire('run-b')]);
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(attempts.filter(result => result.status === 'rejected').length, 1);
  assert.match(attempts.find(result => result.status === 'rejected').reason.message, /state_conflict|lease_held/);
});

test('concurrent authorization of the same operation allows one effect and requires readback after ambiguity', async () => {
  const { state } = setup(); await state.setPaused(false);
  const lease = await state.acquire('run-a');
  await state.intend(lease, 'promote-20261007', payload);
  const attempts = await Promise.allSettled([state.assertMayMutate(lease, 'promote-20261007'), state.assertMayMutate(lease, 'promote-20261007')]);
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
  await assert.rejects(state.assertMayMutate(lease, 'promote-20261007'), /reconciliation_required/);
  await assert.rejects(state.release(lease), /reconciliation_required/);
  await state.reconcile('promote-20261007', 'confirmed', evidence);
  await state.release(lease);
  const next = await state.acquire('run-b');
  assert.ok(next.fence > lease.fence);
  await assert.rejects(state.renew(lease), /lease_fenced/);
  await assert.rejects(state.intend(next, 'promote-20261007', hash('different bytes')), /idempotency_conflict/);
  await assert.rejects(state.assertMayMutate(next, 'promote-20261007'), /reconciliation_required/);
});

test('pause blocks in-flight publication and renewal but permits service readback and release', async () => {
  const { state } = setup(); await state.setPaused(false);
  const lease = await state.acquire('run-a'); await state.intend(lease, 'candidate', payload);
  await state.setPaused(true);
  await assert.rejects(state.assertMayMutate(lease, 'candidate'), /publication_paused/);
  await assert.rejects(state.renew(lease), /publication_paused/);
  await state.reconcile('candidate', 'not-applied', evidence);
  await state.release(lease);
});

test('expired leases are never stolen and recovery requires pause plus reconciled intentions', async () => {
  const { state, advance } = setup(); await state.setPaused(false);
  const lease = await state.acquire('run-a', 1000); await state.intend(lease, 'candidate', payload);
  advance(1001);
  await assert.rejects(state.acquire('run-b'), /lease_held/);
  await assert.rejects(state.renew(lease), /lease_expired/);
  await assert.rejects(state.recoverExpiredLease(lease.fence, evidence), /recovery_requires_pause/);
  await state.setPaused(true);
  await assert.rejects(state.recoverExpiredLease(lease.fence, evidence), /reconciliation_required/);
  await state.reconcile('candidate', 'not-applied', evidence);
  await state.recoverExpiredLease(lease.fence, evidence);
  await state.setPaused(false);
  const next = await state.acquire('run-b'); assert.equal(next.fence, lease.fence + 1);
});

test('immutable receipts and verified backup restore preserve history and hold publication', async () => {
  const { state } = setup(); await state.setPaused(false);
  const lease = await state.acquire('run-a'); await state.intend(lease, 'candidate', payload);
  await state.assertMayMutate(lease, 'candidate'); await state.reconcile('candidate', 'confirmed', evidence);
  await assert.rejects(state.reconcile('candidate', 'not-applied', evidence), /immutable_receipt_changed/);
  await assert.rejects(state.reconcile('candidate', 'confirmed', hash('changed receipt')), /immutable_receipt_changed/);
  const backup = await state.backup();
  const restored = new DurableCloudState(new MemoryStateAdapter(), 'website');
  await assert.rejects(restored.restore({ ...backup, bytes: backup.bytes + ' ' }), /invalid_backup/);
  await restored.restore(backup);
  assert.deepEqual((await restored.inspect()).receipts, (await state.inspect()).receipts);
  await assert.rejects(restored.acquire('run-b'), /publication_paused/);
  await assert.rejects(restored.setPaused(false), /restore_acceptance_required/);
  await assert.rejects(restored.restore(backup), /state_conflict/);
  const corrupt = JSON.parse(backup.bytes); corrupt.receipts.candidate.receipt.payloadSha256 = hash('corrupt');
  const bytes = JSON.stringify(corrupt);
  await assert.rejects(new DurableCloudState(new MemoryStateAdapter(), 'website').restore({ ...backup, bytes, sha256: hash(bytes) }), /invalid_receipt/);
});

test('private GitHub adapter refuses public storage and uses file SHA conditional writes', async () => {
  const calls = [];
  const adapter = new PrivateGitHubStateAdapter({ repository: 'owner/ltc-private', branch: 'main', request: async (method, url, body) => {
    calls.push({ method, url, body });
    if (url === '/repos/owner/ltc-private') return { status: 200, body: { private: true, full_name: 'owner/ltc-private' } };
    if (method === 'GET') return { status: 200, body: { sha: 'file-sha', encoding: 'base64', content: Buffer.from('{"saved":true}').toString('base64') } };
    return { status: 200, body: { content: { sha: 'new-sha' } } };
  } });
  assert.deepEqual(await adapter.read('website'), { value: { saved: true }, version: 'file-sha' });
  assert.equal(await adapter.conditionalWrite('website', { saved: 'next' }, 'file-sha'), 'new-sha');
  assert.equal(calls.at(-1).body.sha, 'file-sha'); assert.equal(calls.at(-1).body.branch, 'main');
  const publicAdapter = new PrivateGitHubStateAdapter({ repository: 'owner/public', branch: 'main', request: async () => ({ status: 200, body: { private: false, full_name: 'owner/public' } }) });
  await assert.rejects(publicAdapter.read('website'), /private_storage_required/);
});

test('GitHub CAS conflicts and uncertain writes fail closed', async () => {
  for (const status of [409, 422, 500]) {
    const adapter = new PrivateGitHubStateAdapter({ repository: 'owner/private', branch: 'main', request: async (_, url) => url === '/repos/owner/private' ? { status: 200, body: { private: true, full_name: 'owner/private' } } : { status } });
    await assert.rejects(adapter.conditionalWrite('website', {}, null), status === 500 ? /storage_write_uncertain/ : /state_conflict/);
  }
});

test('restored clean ledger needs explicit restore acceptance and remains paused afterwards', async () => {
  const { state } = setup(); const backup = await state.backup();
  const restored = new DurableCloudState(new MemoryStateAdapter(), 'website');
  await restored.restore(backup); await restored.acceptRestoredState(evidence);
  assert.equal((await restored.inspect()).paused, true);
  await restored.setPaused(false); await restored.acquire('run-after-restore');
});
test('provider request failures conceal details and mark writes uncertain', async () => {
  const adapter = new PrivateGitHubStateAdapter({ repository: 'owner/private', branch: 'main', request: async (_, url) => {
    if (url === '/repos/owner/private') return { status: 200, body: { private: true, full_name: 'owner/private' } };
    throw Error('provider token=must-never-surface');
  } });
  await assert.rejects(adapter.read('website'), error => error.message === 'storage_read_failed');
  await assert.rejects(adapter.conditionalWrite('website', {}, null), error => error.message === 'storage_write_uncertain');
});
