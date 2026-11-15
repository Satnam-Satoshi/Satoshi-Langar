import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { rehearseReleaseOperations } from './cloud-ltc-rehearsal.mjs';
import { assertMigrationAcceptance, requireDurableAdapter } from './cloud-ltc-release.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const input = {
  source: 'a'.repeat(40), editionId: '2026-10-30-r1',
  manifest: [{ file: 'index.html', sha256: hash('html bytes') }],
  evidence: ['base', 'intelligence', 'policy', 'community'].map(kind => ({ kind, sha256: hash(kind) })),
};
test('runner rehearsal uses real coordinator/state contracts and only local simulation effects', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'ltc-operation-test-'));
  const directory = path.join(scratch, 'rehearsal');
  try {
    const result = await rehearseReleaseOperations({ ...input, directory });
    assert.equal(result.simulation, true); assert.equal(result.publicationEnabled, false);
    assert.equal(result.providerAuthorizationVerified, false); assert.equal(result.restoredPaused, true);
    assert.deepEqual(result.kinds, ['source', 'evidence', 'stage', 'promote']);
    assert.equal(result.receipts.length, 4);
    assert.deepEqual((await readdir(directory)).sort(), ['evidence.json', 'ledger-backup.json', 'promote.json', 'source.json', 'stage.json']);
    const backup = JSON.parse(await readFile(path.join(directory, 'ledger-backup.json'), 'utf8'));
    assert.equal(hash(backup.bytes), result.backupSha256);
    const state = JSON.parse(backup.bytes);
    assert.equal(state.lease, null);
    assert.ok(Object.values(state.intents).every(intent => intent.status === 'confirmed'));
    for (const kind of result.kinds) {
      const record = JSON.parse(await readFile(path.join(directory, `${kind}.json`), 'utf8'));
      assert.equal(record.simulation, true); assert.equal(record.fence, 1);
      assert.equal(record.payload.source, input.source);
    }
    // Rehearsal cannot authorize publication or be reused as a production ledger.
    assert.throws(() => assertMigrationAcceptance(), /migration_acceptance_pending/);
    assert.throws(() => requireDurableAdapter(state), /durable_adapter_required/);
    await assert.rejects(rehearseReleaseOperations({ ...input, directory }), { code: 'EEXIST' });
  } finally { await rm(scratch, { recursive: true, force: true }); }
});
test('incomplete evidence and ambiguous paths cannot start operation rehearsal', async () => {
  await assert.rejects(rehearseReleaseOperations({ ...input, directory: 'relative/path' }), /invalid_operation_rehearsal/);
  await assert.rejects(rehearseReleaseOperations({ ...input, directory: '/unused-fixture', evidence: input.evidence.slice(0, 3) }), /invalid_operation_rehearsal/);
});
