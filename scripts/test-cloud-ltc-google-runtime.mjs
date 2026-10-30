import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
const config = { schemaVersion: 1, provider: 'google-docs', publicationEnabled: false, folderId: 'fixture-folder', documentId: 'fixture-ledger' };
const json = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
const meta = id => ({ id, mimeType: id === config.folderId ? 'application/vnd.google-apps.folder' : 'application/vnd.google-apps.document', trashed: false, ownedByMe: true, shared: false, parents: [config.folderId], capabilities: { canEdit: true }, permissions: [{ type: 'user', role: 'owner' }] });
const blank = { documentId: config.documentId, revisionId: 'revision-1', tabs: [{ tabProperties: { tabId: 'only-tab' }, documentTab: { body: { content: [{ endIndex: 1, sectionBreak: {} }, { startIndex: 1, endIndex: 2, paragraph: { elements: [{ startIndex: 1, endIndex: 2, textRun: { content: '\n' } }] } }] } } }] };
test('production startup uses refreshed short-lived clients and verifies selected privacy before every write', async () => {
  let refreshes = 0; const calls = [];
  const runtime = await createGoogleStateRuntime({ config, env: {}, authorize: async (_, use) => { refreshes++; return use({ LTC_GOOGLE_ACCESS_TOKEN: `fixture-refreshed-token-number-${refreshes}` }); }, fetchImpl: async (url, request) => {
    calls.push({ url, request });
    if (url.includes('/drive/v3/files/')) return json(meta(new URL(url).pathname.split('/').at(-1)));
    if (request.method === 'POST') return json({ documentId: config.documentId, writeControl: { requiredRevisionId: 'revision-2' } });
    return json(blank);
  } });
  assert.deepEqual(await runtime.stateAdapter.read('website'), { value: null, version: null });
  await runtime.stateAdapter.conditionalWrite('website', { example: true }, null);
  const post = calls.findIndex(call => call.request.method === 'POST');
  assert.ok(post > 1); assert.ok(calls[post - 2].url.includes(config.folderId)); assert.ok(calls[post - 1].url.includes(config.documentId));
  const distinct = new Set(calls.map(call => call.request.headers.Authorization));
  assert.equal(distinct.size, refreshes); assert.ok(refreshes >= 6);
});
test('startup fails closed when refresh authorization or resource privacy is unavailable', async () => {
  let requests = 0;
  await assert.rejects(createGoogleStateRuntime({ config, env: {}, authorize: async () => { throw Error('google_refresh_credentials_required'); }, fetchImpl: async () => { requests++; } }), /google_refresh_credentials_required/);
  assert.equal(requests, 0);
  await assert.rejects(createGoogleStateRuntime({ config, env: {}, authorize: async (_, use) => use({ LTC_GOOGLE_ACCESS_TOKEN: 'fixture-token-for-tests' }), fetchImpl: async url => json({ ...meta(new URL(url).pathname.split('/').at(-1)), shared: true }) }), /private_storage_required/);
});
