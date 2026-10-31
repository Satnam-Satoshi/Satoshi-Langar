import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleStateClient, validateCloudStateConfig } from './cloud-ltc-google-client.mjs';
import { GoogleDocsStateAdapter } from './cloud-ltc-docs-state.mjs';
const config = { schemaVersion: 1, provider: 'google-docs', publicationEnabled: false, folderId: 'fixture-folder', documentId: 'fixture-document' };
const env = { LTC_GOOGLE_ACCESS_TOKEN: 'fixture-token-for-unit-tests-only' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const metadata = id => ({ id, mimeType: id === config.folderId ? 'application/vnd.google-apps.folder' : 'application/vnd.google-apps.document', trashed: false, ownedByMe: true, shared: false, parents: id === config.documentId ? [config.folderId] : ['parent-folder'], capabilities: { canEdit: true }, permissions: [{ id: 'owner', type: 'user', role: 'owner' }] });
const document = (text = '', rev = 'revision-1') => ({ documentId: config.documentId, revisionId: rev, tabs: [{ tabProperties: { tabId: 'tab-1' }, documentTab: { body: { content: [{ sectionBreak: {}, endIndex: 1 }, { startIndex: 1, endIndex: text.length + 2, paragraph: { elements: [{ startIndex: 1, endIndex: text.length + 2, textRun: { content: text + '\n' } }] } }] } } }] });
const options = { includeTabsContent: true, suggestionsViewMode: 'SUGGESTIONS_INLINE' };
const batch = { requests: [{ insertText: { location: { index: 1, tabId: 'tab-1' }, text: JSON.stringify({ schemaVersion: 1, key: 'website', value: { schemaVersion: 1 } }) } }], writeControl: { requiredRevisionId: 'revision-1' } };

test('explicit reviewed configuration and environment-only token are mandatory', () => {
  for (const changed of [{ folderId: null }, { documentId: null }, { documentId: config.folderId }, { folderId: '../folder' }, { publicationEnabled: true }, { extra: true }]) assert.throws(() => validateCloudStateConfig({ ...config, ...changed }), /invalid_cloud_state_configuration/);
  for (const token of [undefined, '', 'short', 'valid-length-but\nheader-injection']) assert.throws(() => createGoogleStateClient({ config, env: { LTC_GOOGLE_ACCESS_TOKEN: token } }), /google_access_token_required/);
});

test('fixed Google hosts, exact selected resources, raw metadata fields and token-closure transport', async () => {
  const calls = [];
  const client = createGoogleStateClient({ config, env, fetchImpl: async (url, request) => { calls.push({ url, request }); return json(metadata(new URL(url).pathname.split('/').at(-1))); } });
  assert.deepEqual(await client.getFileMetadata(config.documentId), { status: 200, body: metadata(config.documentId) });
  assert.equal(calls[0].request.headers.Authorization, `Bearer ${env.LTC_GOOGLE_ACCESS_TOKEN}`);
  assert.equal(calls[0].request.redirect, 'error');
  assert.equal(new URL(calls[0].url).origin, 'https://www.googleapis.com');
  for (const field of ['ownedByMe', 'trashed', 'capabilities(canEdit)', 'permissions(id,type,role)']) assert.ok(new URL(calls[0].url).searchParams.get('fields').includes(field));
  assert.ok(!JSON.stringify(client).includes(env.LTC_GOOGLE_ACCESS_TOKEN));
  for (const id of ['unselected-doc', 'https://evil.example/', '../document']) await assert.rejects(client.getFileMetadata(id), /unselected_google_resource/);
  await assert.rejects(client.getDocument(config.folderId, options), /unselected_google_resource/);
  assert.equal(calls.length, 1);
});

test('selected personal folder and document privacy are verified with raw metadata, never inferred', async () => {
  const client = createGoogleStateClient({ config, env, fetchImpl: async url => json(metadata(new URL(url).pathname.split('/').at(-1))) });
  assert.deepEqual(await client.verifySelectedResources(), { verified: true, provider: 'google-docs' });
  for (const change of [{ shared: true }, { ownedByMe: false }, { trashed: true }, { driveId: 'shared-drive' }, { capabilities: {} }, { permissions: [{ type: 'user', role: 'owner' }, { type: 'anyone', role: 'reader' }] }]) {
    const bad = createGoogleStateClient({ config, env, fetchImpl: async url => json({ ...metadata(new URL(url).pathname.split('/').at(-1)), ...change }) });
    await assert.rejects(bad.verifySelectedResources(), /private_storage_required/);
  }
});

test('raw Docs tabs and revision CAS response are compatible with actual state adapter', async () => {
  const calls = [];
  const client = createGoogleStateClient({ config, env, allowWrites: true, fetchImpl: async (url, request) => {
    calls.push({ url, request });
    if (url.includes('/drive/v3/files/')) return json(metadata(new URL(url).pathname.split('/').at(-1)));
    if (request.method === 'POST') return json({ documentId: config.documentId, writeControl: { requiredRevisionId: 'revision-2' } });
    return json(document());
  } });
  await client.verifySelectedResources();
  const adapter = new GoogleDocsStateAdapter({ ...config, client });
  assert.deepEqual(await adapter.read('website'), { value: null, version: null });
  assert.equal(await adapter.conditionalWrite('website', { saved: true }, null), 'revision-2');
  const sent = JSON.parse(calls.at(-1).request.body);
  assert.deepEqual(sent.writeControl, { requiredRevisionId: 'revision-1' });
  assert.equal(calls.at(-1).url, 'https://docs.googleapis.com/v1/documents/fixture-document:batchUpdate');
  const get = calls.find(call => call.url.includes('includeTabsContent'));
  assert.equal(new URL(get.url).searchParams.get('suggestionsViewMode'), 'SUGGESTIONS_INLINE');
});

test('write opt-in, strict CAS and ledger-only request boundaries reject before transport', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return json({}); };
  const disabled = createGoogleStateClient({ config, env, fetchImpl });
  await assert.rejects(disabled.batchUpdateDocument(config.documentId, batch), /google_state_writes_disabled/);
  const enabled = createGoogleStateClient({ config, env, allowWrites: true, fetchImpl });
  for (const body of [{ ...batch, writeControl: { targetRevisionId: 'merge-is-forbidden' } }, { ...batch, requests: [{ replaceAllText: {} }] }, { ...batch, requests: [{ insertText: { ...batch.requests[0].insertText, text: 'non-ledger prose' } }] }, { ...batch, requests: [{ ...batch.requests[0], extra: true }] }]) await assert.rejects(enabled.batchUpdateDocument(config.documentId, body), /invalid_google_state_batch/);
  await assert.rejects(enabled.getDocument(config.documentId, { ...options, fields: 'body' }), /invalid_google_document_request/);
  await assert.rejects(enabled.batchUpdateDocument(config.documentId, batch), /google_resources_unverified/);
  assert.equal(calls, 0);
});

test('non-success statuses retain status without provider text and no automatic retries', async () => {
  for (const status of [400, 401, 403, 404, 409, 429, 500]) {
    let calls = 0; let preparing = true;
    const client = createGoogleStateClient({ config, env, allowWrites: true, fetchImpl: async (url, request) => { calls++; if (request.method === 'GET' && url.includes('/drive/v3/files/') && preparing) return json(metadata(new URL(url).pathname.split('/').at(-1))); return json({ error: `private ${env.LTC_GOOGLE_ACCESS_TOKEN}` }, status); } });
    await client.verifySelectedResources(); preparing = false; calls = 0;
    assert.deepEqual(await client.getFileMetadata(config.documentId), { status, body: null });
    assert.deepEqual(await client.batchUpdateDocument(config.documentId, batch), { status, body: null });
    assert.equal(calls, 2);
  }
});

test('timeouts, malformed/oversized/redirected responses sanitize failures and writes remain uncertain', async () => {
  const providers = [
    async () => { throw Error(`provider details ${env.LTC_GOOGLE_ACCESS_TOKEN}`); },
    async () => new Response('not-json', { headers: { 'content-type': 'application/json' } }),
    async () => new Response('html-login', { headers: { 'content-type': 'text/html' } }),
    async () => new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '1100001' } }),
    async () => json({ huge: 'x'.repeat(1_100_001) }),
    async () => ({ status: 200, redirected: true }),
  ];
  for (const fetchImpl of providers) {
    let preparing = true;
    const client = createGoogleStateClient({ config, env, allowWrites: true, fetchImpl: async (url, request) => preparing ? json(metadata(new URL(url).pathname.split('/').at(-1))) : fetchImpl(url, request) });
    await client.verifySelectedResources(); preparing = false;
    await assert.rejects(client.getFileMetadata(config.documentId), error => error.message === 'storage_read_failed');
    await assert.rejects(client.batchUpdateDocument(config.documentId, batch), error => error.message === 'storage_write_uncertain');
  }
});

test('explicit social ledger namespace is compatible but cannot edit a website ledger or arbitrary key', async () => {
  const calls = [];
  const client = createGoogleStateClient({ config: { ...config, ledgerKey: 'social' }, env, allowWrites: true, fetchImpl: async (url, request) => {
    calls.push({ url, request });
    if (url.includes('/drive/v3/files/')) return json(metadata(new URL(url).pathname.split('/').at(-1)));
    return json({ documentId: config.documentId, writeControl: { requiredRevisionId: 'revision-social-2' } });
  } });
  await client.verifySelectedResources();
  const socialBatch = structuredClone(batch); socialBatch.requests[0].insertText.text = JSON.stringify({ schemaVersion: 1, key: 'social', value: { kind: 'ltc-cloud-social' } });
  await client.batchUpdateDocument(config.documentId, socialBatch);
  assert.equal(JSON.parse(calls.at(-1).request.body).requests[0].insertText.text, socialBatch.requests[0].insertText.text);
  await assert.rejects(client.batchUpdateDocument(config.documentId, batch), /invalid_google_state_batch/);
  assert.throws(() => createGoogleStateClient({ config: { ...config, ledgerKey: 'unknown' }, env }), /invalid_cloud_state_configuration/);
});
