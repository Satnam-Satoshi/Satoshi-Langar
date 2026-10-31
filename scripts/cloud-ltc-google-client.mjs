// Credential-owning transport for the selected existing private resources only.
// No OAuth initiation, refresh, credential-file discovery, resource creation or retries.
// Access token lifetime/refresh is the protected runtime's responsibility.
const check = (condition, code) => { if (!condition) throw new Error(code); };
const idPattern = /^[A-Za-z0-9_-]{5,200}$/;
const metadataFields = 'id,mimeType,trashed,ownedByMe,shared,parents,driveId,capabilities(canEdit),permissions(id,type,role)';
const plain = value => value && Object.getPrototypeOf(value) === Object.prototype;

export function validateCloudStateConfig(config) {
  check(plain(config) && ['documentId,folderId,provider,publicationEnabled,schemaVersion', 'documentId,folderId,ledgerKey,provider,publicationEnabled,schemaVersion'].includes(Object.keys(config).sort().join(',')) && ['website', 'social'].includes(config.ledgerKey ?? 'website') && config.schemaVersion === 1 && config.provider === 'google-docs' && config.publicationEnabled === false && idPattern.test(config.folderId ?? '') && idPattern.test(config.documentId ?? '') && config.folderId !== config.documentId, 'invalid_cloud_state_configuration');
  return Object.freeze({ ...config });
}

export function createGoogleStateClient({ config, env = process.env, fetchImpl = fetch, allowWrites = false, timeoutMs = 30_000 }) {
  const selected = validateCloudStateConfig(config);
  const accessToken = env.LTC_GOOGLE_ACCESS_TOKEN;
  check(typeof accessToken === 'string' && /^[A-Za-z0-9._~+\/-]{16,8192}={0,2}$/.test(accessToken), 'google_access_token_required');
  check(typeof fetchImpl === 'function' && typeof allowWrites === 'boolean' && Number.isInteger(timeoutMs) && timeoutMs >= 100 && timeoutMs <= 30_000, 'invalid_google_transport_configuration');

  async function request(url, method = 'GET', body) {
    const write = method === 'POST';
    let response;
    try {
      response = await fetchImpl(url, {
        method, redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...(write ? { 'Content-Type': 'application/json' } : {}) },
        ...(write ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new Error(write ? 'storage_write_uncertain' : 'storage_read_failed'); }
    check(Number.isInteger(response?.status) && response.status >= 200 && response.status <= 599 && !response.redirected, write ? 'storage_write_uncertain' : 'storage_read_failed');
    // Error responses are status-only. Provider diagnostics may contain request data.
    if (response.status >= 300) return { status: response.status, body: null };
    try {
      check(response.headers.get('content-type')?.toLowerCase().includes('application/json'), 'invalid_google_response');
      const declared = response.headers.get('content-length');
      check(declared === null || (/^\d+$/.test(declared) && Number(declared) <= 1_100_000), 'invalid_google_response');
      check(response.body && typeof response.body.getReader === 'function', 'invalid_google_response');
      const reader = response.body.getReader(); const chunks = []; let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          check(total <= 1_100_000, 'invalid_google_response');
          chunks.push(value);
        }
      } finally { await reader.cancel().catch(() => {}); }
      const raw = Buffer.concat(chunks).toString('utf8');
      const result = JSON.parse(raw);
      check(plain(result), 'invalid_google_response');
      return { status: response.status, body: result };
    } catch { throw new Error(write ? 'storage_write_uncertain' : 'storage_read_failed'); }
  }
  function selectedId(id, documentOnly = false) {
    check(id === selected.documentId || (!documentOnly && id === selected.folderId), 'unselected_google_resource');
    return encodeURIComponent(id);
  }
  let privateResourcesVerified = false;
  const client = {
    async getFileMetadata(id) {
      return request(`https://www.googleapis.com/drive/v3/files/${selectedId(id)}?fields=${encodeURIComponent(metadataFields)}`);
    },
    async getDocument(id, options) {
      check(plain(options) && Object.keys(options).sort().join(',') === 'includeTabsContent,suggestionsViewMode' && options.includeTabsContent === true && options.suggestionsViewMode === 'SUGGESTIONS_INLINE', 'invalid_google_document_request');
      return request(`https://docs.googleapis.com/v1/documents/${selectedId(id, true)}?includeTabsContent=true&suggestionsViewMode=SUGGESTIONS_INLINE`);
    },
    async batchUpdateDocument(id, body) {
      selectedId(id, true);
      check(allowWrites, 'google_state_writes_disabled');
      validateStateBatch(body, selected.ledgerKey ?? 'website');
      check(privateResourcesVerified, 'google_resources_unverified');
      return request(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(id)}:batchUpdate`, 'POST', body);
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
  check(plain(insert) && Object.keys(body.requests.at(-1)).join(',') === 'insertText' && Object.keys(insert).sort().join(',') === 'location,text' && plain(insert.location) && Object.keys(insert.location).sort().join(',') === 'index,tabId' && insert.location.index === 1 && typeof insert.location.tabId === 'string' && insert.location.tabId.length > 0 && typeof insert.text === 'string' && insert.text.length <= 900_000 && !insert.text.includes('\n'), 'invalid_google_state_batch');
  let envelope; try { envelope = JSON.parse(insert.text); } catch { throw new Error('invalid_google_state_batch'); }
  check(plain(envelope) && Object.keys(envelope).sort().join(',') === 'key,schemaVersion,value' && envelope.schemaVersion === 1 && envelope.key === ledgerKey && plain(envelope.value) && JSON.stringify(envelope) === insert.text, 'invalid_google_state_batch');
  if (body.requests.length === 2) {
    const remove = body.requests[0]?.deleteContentRange;
    check(plain(remove) && Object.keys(body.requests[0]).join(',') === 'deleteContentRange' && Object.keys(remove).join(',') === 'range' && plain(remove.range) && Object.keys(remove.range).sort().join(',') === 'endIndex,startIndex,tabId' && remove.range.startIndex === 1 && Number.isSafeInteger(remove.range.endIndex) && remove.range.endIndex > 1 && remove.range.endIndex <= 900_001 && remove.range.tabId === insert.location.tabId, 'invalid_google_state_batch');
  }
}
