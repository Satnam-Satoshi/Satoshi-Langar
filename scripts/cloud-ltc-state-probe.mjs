import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createGoogleStateClient, validateCloudStateConfig } from './cloud-ltc-google-client.mjs';
import { GoogleDocsStateAdapter } from './cloud-ltc-docs-state.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';

// Explicit read-only probe of provisioned resources; never initializes/unpauses a ledger.
export async function probeConfiguredState({ config, env = process.env, fetchImpl = fetch }) {
  const selected = validateCloudStateConfig(config);
  const client = createGoogleStateClient({ config: selected, env, fetchImpl });
  await client.verifySelectedResources();
  const adapter = new GoogleDocsStateAdapter({ ...selected, client });
  const snapshot = await adapter.read('website');
  const state = new DurableCloudState(adapter, 'website');
  // Validation uses raw state schema/receipt checks. No write or lease acquisition.
  const document = await state.inspect();
  return {
    schemaVersion: 1, mode: 'read-only-cloud-state-probe', publicationEnabled: false,
    provider: 'google-docs', privateResourcesVerified: true, ledgerInitialized: snapshot.value !== null,
    paused: document.paused, restoreHold: document.restoreHold, leaseHeld: document.lease !== null,
    unresolvedIntents: Object.values(document.intents).filter(intent => !['confirmed', 'not-applied'].includes(intent.status)).length,
    writesPerformed: false, credentialRefreshVerified: false,
  };
}
function parseArguments(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = { '--config': 'config', '--receipt': 'receipt' }[args[index]];
    if (!key || result[key] || !args[index + 1] || args[index + 1].startsWith('--')) throw Error('invalid_probe_arguments');
    result[key] = path.resolve(args[index + 1]);
  }
  if (!result.config || !result.receipt || result.config === result.receipt) throw Error('invalid_probe_arguments');
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    let config; try { config = JSON.parse(await readFile(options.config, 'utf8')); } catch { throw Error('invalid_cloud_state_configuration'); }
    const receipt = await probeConfiguredState({ config });
    await writeFile(options.receipt, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ mode: receipt.mode, publicationEnabled: false, writesPerformed: false, status: 'read-only-probe-passed' }));
  } catch (error) {
    const allowed = new Set(['invalid_probe_arguments', 'invalid_cloud_state_configuration', 'google_access_token_required', 'invalid_google_transport_configuration', 'private_storage_required', 'storage_read_failed', 'invalid_state_document', 'invalid_receipt', 'state_capacity_exceeded']);
    console.error(allowed.has(error?.message) ? error.message : 'cloud_state_probe_failed'); process.exitCode = 1;
  }
}
