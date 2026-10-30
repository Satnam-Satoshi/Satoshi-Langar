import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { ReleaseOperationCoordinator, runBoundedReleaseOperations } from './cloud-ltc-operations.mjs';
const check = (condition, code) => { if (!condition) throw new Error(code); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// An isolated local rehearsal, never a production provider or durable backup.
// Its memory ledger and file effects cannot be selected by publish admission.
export async function rehearseReleaseOperations({ directory, source, editionId, manifest, evidence, clock = Date.now }) {
  check(path.isAbsolute(directory) && /^[a-f0-9]{40}$/.test(source ?? '') && /^\d{4}-\d{2}-\d{2}-r[1-9]\d?$/.test(editionId ?? '') && Array.isArray(manifest) && manifest.length > 0 && manifest.every(record => typeof record.file === 'string' && /^[a-f0-9]{64}$/.test(record.sha256 ?? '')) && Array.isArray(evidence) && evidence.length === 4 && new Set(evidence.map(record => record.kind)).size === 4 && evidence.every(record => ['base', 'intelligence', 'policy', 'community'].includes(record.kind) && /^[a-f0-9]{64}$/.test(record.sha256 ?? '')), 'invalid_operation_rehearsal');
  await mkdir(directory, { mode: 0o700 }); // Existing rehearsal directory is an error, never reused.
  const state = new DurableCloudState(new MemoryStateAdapter(), 'website', { clock });
  await state.setPaused(false);
  const lease = await state.acquire('local-rehearsal', 3_600_000);
  const coordinator = new ReleaseOperationCoordinator({ state, lease });
  const artifactManifestSha256 = hash(JSON.stringify(manifest));
  const evidenceManifestSha256 = hash(JSON.stringify(evidence));
  const kinds = ['source', 'evidence', 'stage', 'promote'];
  const payloads = [
    { source, editionId, artifactManifestSha256 },
    { source, editionId, evidenceManifestSha256 },
    { source, editionId, artifactManifestSha256 },
    { source, editionId, artifactManifestSha256, domains: ['satnamsatoshi.com', 'ltcmagazine.org'] },
  ];
  const steps = kinds.map((kind, index) => {
    const operationId = `rehearsal-${kind}-${editionId}`;
    const file = path.join(directory, `${kind}.json`);
    return { kind, operationId, payload: payloads[index], provider: {
      async apply(context) {
        // Only a private local simulation record is created. No GitHub/Google/Vercel call.
        await writeFile(file, JSON.stringify({ simulation: true, kind, ...context }), { flag: 'wx', mode: 0o600 });
      },
      async readback(context) {
        const bytes = await readFile(file);
        const saved = JSON.parse(bytes);
        check(saved.simulation === true && saved.kind === kind && saved.operationId === context.operationId && saved.payloadSha256 === context.payloadSha256 && saved.fence === lease.fence && hash(JSON.stringify(saved.payload)) === context.payloadSha256, 'operation_rehearsal_mismatch');
        return { operationId, payloadSha256: context.payloadSha256, status: 'applied', proof: { simulation: true, kind, localRecordSha256: hash(bytes) } };
      },
    } };
  });
  const receipts = await runBoundedReleaseOperations(coordinator, steps);
  await state.release(lease);
  const backup = await state.backup();
  await writeFile(path.join(directory, 'ledger-backup.json'), JSON.stringify(backup), { flag: 'wx', mode: 0o600 });
  const restored = new DurableCloudState(new MemoryStateAdapter(), 'website', { clock });
  await restored.restore(backup);
  const readback = await restored.inspect();
  check(readback.paused && readback.restoreHold && Object.keys(readback.receipts).length === kinds.length, 'operation_rehearsal_mismatch');
  return { simulation: true, storage: 'isolated-memory-and-local-files', providerAuthorizationVerified: false, publicationEnabled: false, status: 'local-contract-rehearsal-passed', kinds, receipts: receipts.map(({ kind, operationId, evidenceSha256 }) => ({ kind, operationId, evidenceSha256 })), backupSha256: backup.sha256, restoredPaused: true };
}
