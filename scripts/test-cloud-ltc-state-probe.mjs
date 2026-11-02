import test from 'node:test';
import assert from 'node:assert/strict';
import { probeConfiguredState } from './cloud-ltc-state-probe.mjs';
const config = { schemaVersion: 1, provider: 'google-docs', publicationEnabled: false, folderId: 'selected-folder', documentId: 'selected-ledger' };
const env = { LTC_GOOGLE_ACCESS_TOKEN: 'unit-test-fixture-token-only' };
const reply = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
const metadata = id => ({ id, mimeType: id === config.folderId ? 'application/vnd.google-apps.folder' : 'application/vnd.google-apps.document', trashed: false, ownedByMe: true, shared: false, capabilities: { canEdit: true }, permissions: [{ type: 'user', role: 'owner' }], parents: [config.folderId] });
const blank = { documentId: config.documentId, revisionId: 'opaque-revision', tabs: [{ tabProperties: { tabId: 'only-tab' }, documentTab: { body: { content: [{ endIndex: 1, sectionBreak: {} }, { startIndex: 1, endIndex: 2, paragraph: { elements: [{ startIndex: 1, endIndex: 2, textRun: { content: '\n' } }] } }] } } }] };
test('supported REST probe verifies provisioned private resources and adapter shape with GET only', async () => {
  const calls = [];
  const result = await probeConfiguredState({ config, env, fetchImpl: async (url, request) => {
    calls.push({ url, request });
    assert.equal(request.method, 'GET');
    if (url.includes('/drive/v3/files/')) return reply(metadata(new URL(url).pathname.split('/').at(-1)));
    return reply(blank);
  } });
  assert.equal(result.ledgerInitialized, false); assert.equal(result.paused, true);
  assert.equal(result.writesPerformed, false); assert.equal(result.publicationEnabled, false);
  assert.equal(result.credentialRefreshVerified, false);
  assert.ok(calls.length > 2);
});
test('probe never initializes a missing ledger or falls back when cloud authorization is absent', async () => {
  let calls = 0;
  await assert.rejects(probeConfiguredState({ config, env: {}, fetchImpl: async () => { calls++; } }), /google_access_token_required/);
  assert.equal(calls, 0);
  await assert.rejects(probeConfiguredState({ config, env, fetchImpl: async (url, request) => {
    calls++; assert.equal(request.method, 'GET');
    return new Response(null, { status: 404 });
  } }), /private_storage_required/);
});
