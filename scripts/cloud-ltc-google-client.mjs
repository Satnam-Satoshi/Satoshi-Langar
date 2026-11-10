import { decodeStateEnvelope, MAX_STORED_STATE_CHARACTERS, MAX_DOCS_RESPONSE_BYTES } from './cloud-ltc-state-envelope.mjs';

// Credential-owning transport for the selected existing private resources only.
// No OAuth initiation, refresh, credential-file discovery, resource creation or write retries.
// Access token lifetime/refresh is the protected runtime's responsibility.
const check = (condition, code) => { if (!condition) throw new Error(code); };
const idPattern = /^[A-Za-z0-9_-]{5,200}$/;
const metadataFields = 'id,mimeType,trashed,ownedByMe,shared,parents,driveId,capabilities(canEdit),permissions(id,type,role)';
const plain = value => value && Object.getPrototypeOf(value) === Object.prototype;

const retryableReadStatuses = new Set([429, 500, 502, 503, 504]);
const readResources = new Set(['drive-metadata', 'docs-document']);
const readPhases = new Set(['headers', 'body', 'invalid-response', 'oauth-refresh', 'oauth-credentials', 'oauth-scope']);
export class GoogleStateReadFailure extends Error {
  constructor(resource, phase) {
    super('storage_read_failed');
    const validPhase = readPhases.has(phase) || /^http-[2-5]\d{2}$/.test(phase);
    Object.defineProperty(this, 'diagnostic', { value: readResources.has(resource) && validPhase ? `${resource}/${phase}` : null });
  }
}

class BodyReadInterrupted extends Error {}
async function readJson(response) {
  check(response.headers.get('content-type')?.toLowerCase().includes('application/json'), 'invalid_google_response');
  const declared = response.headers.get('content-length');
  check(declared === null || (/^\d+$/.test(declared) && Number(declared) <= MAX_DOCS_RESPONSE_BYTES), 'invalid_google_response');
  check(response.body && typeof response.body.getReader === 'function', 'invalid_google_response');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      let chunk;
      try { chunk = await reader.read(); }
      catch { throw new BodyReadInterrupted(); }
      if (chunk.done) break;
      total += chunk.value.byteLength;
      check(total <= MAX_DOCS_RESPONSE_BYTES, 'invalid_google_response');
      chunks.push(chunk.value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  check(plain(result), 'invalid_google_response');
  return result;
}

export function validateCloudStateConfig(config) {
  check(plain(config) && ['documentId,folderId,provider,publicationEnabled,schemaVersion', 'documentId,folderId,ledgerKey,provider,publicationEnabled,schemaVersion'].includes(Object.keys(config).sort().join(',')) && ['website', 'social'].includes(config.ledgerKey ?? 'website') && config.schemaVersion === 1 && config.provider === 'google-docs' && config.publicationEnabled === false && idPattern.test(config.folderId ?? '') && idPattern.test(config.documentId ?? '') && config.folderId !== config.documentId, 'invalid_cloud_state_configuration');
  return Object.freeze({ ...config });
}

export function createGoogleStateClient({ config, env = process.env, fetchImpl = fetch, allowWrites = false, timeoutMs = 30_000, beforeWrite = () => {}, assertAccessUsable = () => {}, onUnauthorized = () => {}, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const selected = validateCloudStateConfig(config);
  const accessToken = env.LTC_GOOGLE_ACCESS_TOKEN;
  check(typeof accessToken === 'string' && /^[A-Za-z0-9._~+\/-]{16,8192}={0,2}$/.test(accessToken), 'google_access_token_required');
  check(typeof fetchImpl === 'function' && typeof beforeWrite === 'function' && typeof assertAccessUsable === 'function' && typeof onUnauthorized === 'function' && typeof sleep === 'function' && typeof allowWrites === 'boolean' && Number.isInteger(timeoutMs) && timeoutMs >= 100 && timeoutMs <= 30_000, 'invalid_google_transport_configuration');

  async function request(url, resource, method = 'GET', body) {
    const write = method === 'POST';
    const attempts = write ? 1 : 3;
    const failure = phase => write ? new Error('storage_write_uncertain') : new GoogleStateReadFailure(resource, phase);
    for (let attempt = 1; attempt <= attempts; attempt++) {
      let response;
      check(assertAccessUsable() === undefined, 'invalid_google_transport_configuration');
      // Keep the final authorization boundary immediately before the sole POST.
      if (write) check(beforeWrite() === undefined, 'invalid_google_write_guard');
      try {
        response = await fetchImpl(url, {
          method, redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...(write ? { 'Content-Type': 'application/json' } : {}) },
          ...(write ? { body: JSON.stringify(body) } : {}),
        });
      } catch {
        if (attempt === attempts) throw failure('headers');
        await sleep(250 * attempt);
        continue;
      }
      if (!Number.isInteger(response?.status) || response.status < 200 || response.status > 599 || response.redirected) {
        throw failure('invalid-response');
      }
      if (response.status === 401) onUnauthorized();
      if (response.status >= 300) {
        // Never ingest a provider error body, which may contain request data.
        await response.body?.cancel?.().catch(() => {});
        if (!write && retryableReadStatuses.has(response.status) && attempt < attempts) {
          await sleep(250 * attempt);
          continue;
        }
        return { status: response.status, body: null };
      }
      try {
        return { status: response.status, body: await readJson(response) };
      } catch (error) {
        if (!(error instanceof BodyReadInterrupted)) throw failure('invalid-response');
        if (attempt === attempts) throw failure('body');
        await sleep(250 * attempt);
      }
    }
  }
  function selectedId(id, documentOnly = false) {
    check(id === selected.documentId || (!documentOnly && id === selected.folderId), 'unselected_google_resource');
    return encodeURIComponent(id);
  }
  let privateResourcesVerified = false;
  const client = {
    async getFileMetadata(id) {
      return request(`https://www.googleapis.com/drive/v3/files/${selectedId(id)}?fields=${encodeURIComponent(metadataFields)}`, 'drive-metadata');
    },
    async getDocument(id, options) {
      check(plain(options) && Object.keys(options).sort().join(',') === 'includeTabsContent,suggestionsViewMode' && options.includeTabsContent === true && options.suggestionsViewMode === 'SUGGESTIONS_INLINE', 'invalid_google_document_request');
      return request(`https://docs.googleapis.com/v1/documents/${selectedId(id, true)}?includeTabsContent=true&suggestionsViewMode=SUGGESTIONS_INLINE`, 'docs-document');
    },
    async batchUpdateDocument(id, body) {
      selectedId(id, true);
      check(allowWrites, 'google_state_writes_disabled');
      validateStateBatch(body, selected.ledgerKey ?? 'website');
      check(privateResourcesVerified, 'google_resources_unverified');
      return request(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(id)}:batchUpdate`, 'docs-document', 'POST', body);
    },
    async verifySelectedResources() {
      const folder = await client.getFileMetadata(selected.folderId);
      check(folder.status === 200 && folder.body?.id === selected.folderId && folder.body.mimeType === 'application/vnd.google-apps.folder' && folder.body.trashed === false && folder.body.ownedByMe === true && folder.body.shared === false && !folder.body.driveId && folder.body.capabilities?.canEdit === true && Array.isArray(folder.body.permissions) && folder.body.permissions.length === 1 && folder.body.permissions[0].type === 'user' && folder.body.permissions[0].role === 'owner', 'private_storage_required');
      const document = await client.getFileMetadata(selected.documentId);
      check(document.status === 200 && document.body?.id === selected.documentId && document.body.mimeType === 'application/vnd.google-apps.document' && document.body.trashed === false && document.body.ownedByMe === true && document.body.shared === false && !document.body.driveId && document.body.capabilities?.canEdit === true && Array.isArray(document.body.parents) && document.body.parents.length === 1 && document.body.parents[0] === selected.folderId && Array.isArray(document.body.permissions) && document.body.permissions.length === 1 && document.body.permissions[0].type === 'user' && document.body.permissions[0].role === 'owner', 'private_storage_required');
      privateResourcesVerified = true;
      return { verified: true, provider: 'google-docs' };
    },
  };
  return Object.freeze(client); // Token is closure-only; no serialization accessor.
}

function validateStateBatch(body, ledgerKey) {
  check(plain(body) && Object.keys(body).sort().join(',') === 'requests,writeControl' && plain(body.writeControl) && Object.keys(body.writeControl).join(',') === 'requiredRevisionId' && typeof body.writeControl.requiredRevisionId === 'string' && body.writeControl.requiredRevisionId.length > 0 && body.writeControl.requiredRevisionId.length <= 2048 && Array.isArray(body.requests) && [1, 2].includes(body.requests.length), 'invalid_google_state_batch');
  const insert = body.requests.at(-1)?.insertText;
  check(plain(insert) && Object.keys(body.requests.at(-1)).join(',') === 'insertText' && Object.keys(insert).sort().join(',') === 'location,text' && plain(insert.location) && Object.keys(insert.location).sort().join(',') === 'index,tabId' && insert.location.index === 1 && typeof insert.location.tabId === 'string' && insert.location.tabId.length > 0 && typeof insert.text === 'string' && insert.text.length <= MAX_STORED_STATE_CHARACTERS && !insert.text.includes('\n'), 'invalid_google_state_batch');
  try { decodeStateEnvelope(insert.text, ledgerKey); }
  catch { throw new Error('invalid_google_state_batch'); }
  if (body.requests.length === 2) {
    const remove = body.requests[0]?.deleteContentRange;
    check(plain(remove) && Object.keys(body.requests[0]).join(',') === 'deleteContentRange' && Object.keys(remove).join(',') === 'range' && plain(remove.range) && Object.keys(remove.range).sort().join(',') === 'endIndex,startIndex,tabId' && remove.range.startIndex === 1 && Number.isSafeInteger(remove.range.endIndex) && remove.range.endIndex > 1 && remove.range.endIndex <= MAX_STORED_STATE_CHARACTERS + 1 && remove.range.tabId === insert.location.tabId, 'invalid_google_state_batch');
  }
}
