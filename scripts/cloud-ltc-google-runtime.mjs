import { createGoogleStateClient, validateCloudStateConfig } from './cloud-ltc-google-client.mjs';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
import { GoogleDocsStateAdapter } from './cloud-ltc-docs-state.mjs';

// All refresh credentials stay in the protected caller's environment. Each raw
// provider operation receives a newly authorized short-lived client; a long build
// cannot silently reuse a captured, expired access token. Reads and writes use the
// same configured refresh identity and exact resource privacy checks.
export async function createGoogleStateRuntime({ config, env = process.env, fetchImpl = fetch, authorize = withGoogleCloudAuthorization }) {
  const selected = validateCloudStateConfig(config);
  const call = (method, args) => authorize({ env, fetchImpl }, async access => {
    const raw = createGoogleStateClient({ config: selected, env: access, fetchImpl, allowWrites: method === 'batchUpdateDocument' });
    if (method === 'batchUpdateDocument') await raw.verifySelectedResources();
    return raw[method](...args);
  });
  const client = Object.freeze({
    getFileMetadata: (...args) => call('getFileMetadata', args),
    getDocument: (...args) => call('getDocument', args),
    batchUpdateDocument: (...args) => call('batchUpdateDocument', args),
    verifySelectedResources: () => call('verifySelectedResources', []),
  });
  await client.verifySelectedResources();
  return { client, stateAdapter: new GoogleDocsStateAdapter({ ...selected, client }) };
}
