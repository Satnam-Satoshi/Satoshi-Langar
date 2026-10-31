import test from 'node:test';
import assert from 'node:assert/strict';
import { probePrivateGoogleFolder } from './cloud-ltc-access-probe.mjs';
const env = { LTC_STATE_FOLDER_ID: 'selected-folder-id', LTC_GOOGLE_CLIENT_ID: 'fixture-client-123.apps.googleusercontent.com', LTC_GOOGLE_CLIENT_SECRET: 'fixture-secret-never-real', LTC_GOOGLE_REFRESH_TOKEN: 'fixture-refresh-never-real' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const authorized = () => json({ token_type: 'Bearer', expires_in: 3600, scope: 'https://www.googleapis.com/auth/drive.file', access_token: 'fixture-access-token-only' });
test('protected folder probe performs only OAuth refresh plus exact selected-folder GET, no resource creation', async () => {
  const calls = [];
  const receipt = await probePrivateGoogleFolder({ env, fetchImpl: async (url, options) => {
    calls.push({ url, options }); if (url === 'https://oauth2.googleapis.com/token') return authorized();
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.ok(url.startsWith('https://www.googleapis.com/drive/v3/files/' + env.LTC_STATE_FOLDER_ID + '?'));
    return json({ id: env.LTC_STATE_FOLDER_ID, mimeType: 'application/vnd.google-apps.folder', trashed: false, ownedByMe: true, shared: false, capabilities: { canEdit: true }, permissions: [{ type: 'user', role: 'owner' }] });
  } });
  assert.equal(calls.length, 2); assert.equal(receipt.folderPrivateVerified, true); assert.equal(receipt.writesPerformed, false);
  assert.ok(!JSON.stringify(receipt).includes(env.LTC_STATE_FOLDER_ID)); assert.ok(!JSON.stringify(receipt).includes(env.LTC_GOOGLE_REFRESH_TOKEN));
});
test('disabled service, denied access and unproved privacy are different safe outcomes', async () => {
  for (const [status, body, reason] of [[403, { error: { details: [{ reason: 'SERVICE_DISABLED' }], message: 'private provider project details' } }, 'provider-api-disabled'], [403, { error: {} }, 'provider-access-denied'], [200, { id: env.LTC_STATE_FOLDER_ID, shared: true }, 'private-ownership-unproven']]) {
    const receipt = await probePrivateGoogleFolder({ env, fetchImpl: async url => url === 'https://oauth2.googleapis.com/token' ? authorized() : json(body, status) });
    assert.equal(receipt.folderPrivateVerified, false); assert.equal(receipt.reason, reason); assert.ok(!JSON.stringify(receipt).includes('private provider project details'));
  }
});
