import { createGoogleStateClient, validateCloudStateConfig } from './cloud-ltc-google-client.mjs';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
import { GoogleDocsStateAdapter, GoogleStateWriteNotAttempted } from './cloud-ltc-docs-state.mjs';

// All refresh credentials stay in the protected caller's environment. Each raw
// provider operation receives a newly authorized short-lived client; a long build
// cannot silently reuse a captured, expired access token. Reads and writes use the
// same configured refresh identity and exact resource privacy checks.
export async function createGoogleStateRuntime({ config, env = process.env, fetchImpl = fetch, authorize = withGoogleCloudAuthorization, beforeWrite = () => {} }) {
  const selected = validateCloudStateConfig(config);
  const call = async (method, args) => {
    const isWrite = method === 'batchUpdateDocument';
    let postMayHaveStarted = false;
    try {
      return await authorize({ env, fetchImpl }, async access => {
        const raw = createGoogleStateClient({
          config: selected, env: access, fetchImpl, allowWrites: isWrite,
          beforeWrite: () => {
            const result = beforeWrite();
            if (result === undefined) postMayHaveStarted = true;
            return result;
          },
        });
        if (isWrite) await raw.verifySelectedResources();
        return raw[method](...args);
      });
    } catch (error) {
      if (isWrite && !postMayHaveStarted) throw new GoogleStateWriteNotAttempted();
      throw error;
    }
  };
  const client = Object.freeze({
    getFileMetadata: (...args) => call('getFileMetadata', args),
    getDocument: (...args) => call('getDocument', args),
    batchUpdateDocument: (...args) => call('batchUpdateDocument', args),
    verifySelectedResources: () => call('verifySelectedResources', []),
  });
  await client.verifySelectedResources();
  return { client, stateAdapter: new GoogleDocsStateAdapter({ ...selected, client }) };
}
