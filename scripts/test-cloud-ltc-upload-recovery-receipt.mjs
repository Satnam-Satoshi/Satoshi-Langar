import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { withUploadRecoveryReceipt, sanitizedUploadRecoveryFailure } from './cloud-ltc-upload-recovery-receipt.mjs';

async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'recovery-diagnostic-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const receipt = path.join(dir, 'receipt.json');
  return { receipt, reviewSha256: 'a'.repeat(64) };
}
test('controller expiry records a literal failure with no state POST and rethrows the original error', async t => {
  const f = await fixture(t), error = Error('upload_recovery_review_expired'); let calls = 0;
  await assert.rejects(withUploadRecoveryReceipt(f, async diagnostic => {
    calls++; diagnostic.phase('controller-verification'); throw error;
  }), e => e === error);
  const r = JSON.parse(await readFile(f.receipt));
  assert.equal(calls, 1); assert.equal(r.status, 'failed');
  assert.equal(r.failure, 'upload_recovery_review_expired');
  assert.equal(r.failurePhase, 'controller-verification');
  assert.equal(r.statePostAttempted, false); assert.equal(r.stateChanged, false);
  assert.equal((await stat(f.receipt)).mode & 0o777, 0o600);
});
test('post boundary remains uncertain on lost response and operation is never retried', async t => {
  const f = await fixture(t); let posts = 0;
  await assert.rejects(withUploadRecoveryReceipt(f, async diagnostic => {
    diagnostic.beforeStatePost(); posts++; throw Error('storage_write_uncertain');
  }), /storage_write_uncertain/);
  const r = JSON.parse(await readFile(f.receipt));
  assert.equal(posts, 1); assert.equal(r.statePostAttempted, true);
  assert.equal(r.stateChanged, null); assert.equal(r.stateOutcome, 'requires-independent-readback');
  assert.equal(r.effectsReissued, false); assert.equal(r.publicationPerformed, false);
});
test('provider errors, stacks, payloads and accessor messages never leak into diagnostics', async t => {
  const f = await fixture(t); const error = Error('Bearer PRIVATE https://private.example/review?secret=PRIVATE');
  error.cause = { privateReview: 'PRIVATE' };
  await assert.rejects(withUploadRecoveryReceipt(f, async () => { throw error; }), e => e === error);
  const raw = await readFile(f.receipt, 'utf8');
  assert.equal(raw.includes('PRIVATE'), false); assert.equal(raw.includes('https:'), false);
  assert.equal(JSON.parse(raw).failure, 'unclassified_recovery_failure');
  assert.equal(sanitizedUploadRecoveryFailure({ get message() { throw Error('must not execute'); } }), 'unclassified_recovery_failure');
  assert.equal(sanitizedUploadRecoveryFailure(Error('upload_recovery_secret_PRIVATE')), 'unclassified_recovery_failure');
});
test('success receipt is unchanged and an existing receipt prevents any operation', async t => {
  const f = await fixture(t), result = { status: 'recovered-paused', stateSha256: 'b'.repeat(64), publicationPerformed: false };
  assert.deepEqual(await withUploadRecoveryReceipt(f, async () => result), result);
  assert.deepEqual(JSON.parse(await readFile(f.receipt)), result);
  let called = false;
  await assert.rejects(withUploadRecoveryReceipt(f, async () => { called = true; }), { code: 'EEXIST' });
  assert.equal(called, false); assert.deepEqual(JSON.parse(await readFile(f.receipt)), result);
});
