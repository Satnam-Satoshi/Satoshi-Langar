import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
const config = { schemaVersion: 1, provider: 'google-docs', publicationEnabled: false, folderId: 'fixture-folder', documentId: 'fixture-ledger' };
const json = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
const meta = id => ({ id, mimeType: id === config.folderId ? 'application/vnd.google-apps.folder' : 'application/vnd.google-apps.document', trashed: false, ownedByMe: true, shared: false, parents: [config.folderId], capabilities: { canEdit: true }, permissions: [{ type: 'user', role: 'owner' }] });
const blank = { documentId: config.documentId, revisionId: 'revision-1', tabs: [{ tabProperties: { tabId: 'only-tab' }, documentTab: { body: { content: [{ endIndex: 1, sectionBreak: {} }, { startIndex: 1, endIndex: 2, paragraph: { elements: [{ startIndex: 1, endIndex: 2, textRun: { content: '\n' } }] } }] } } }] };
test('metadata-less injected authorization retains per-call behavior and privacy before every write', async () => {
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

test('one runtime reuses a single in-flight refresh and expires it conservatively from request start', async () => {
  let now = 0;
  let refreshes = 0;
  const observed = [];
  const runtime = await createGoogleStateRuntime({ config, clock: () => now, authorize: async (_options, use) => {
    const refresh = ++refreshes;
    await Promise.resolve();
    now += 1000;
    return use({ LTC_GOOGLE_ACCESS_TOKEN: `fixture-refreshed-token-number-${refresh}` }, 60);
  }, fetchImpl: async (url, request) => {
    observed.push(request.headers.Authorization);
    return url.includes('/drive/v3/files/') ? json(meta(new URL(url).pathname.split('/').at(-1))) : json(blank);
  } });
  await runtime.stateAdapter.read('website');
  assert.equal(refreshes, 1);
  now = 30_000;
  await Promise.all([runtime.stateAdapter.read('website'), runtime.stateAdapter.read('website')]);
  assert.equal(refreshes, 2);
  assert.equal(new Set(observed.slice(-4)).size, 1);
  assert.match(observed.at(-1), /number-2$/);
});

test('known 401 invalidates the grant for the next read and never repeats that request', async () => {
  let refreshes = 0;
  let metadataCalls = 0;
  let reject = false;
  const runtime = await createGoogleStateRuntime({ config, authorize: async (_options, use) => use({
    LTC_GOOGLE_ACCESS_TOKEN: `fixture-refreshed-token-number-${++refreshes}`,
  }, 3600), fetchImpl: async (url, request) => {
    if (!url.includes('/drive/v3/files/')) return json(blank);
    metadataCalls++;
    if (reject) {
      reject = false;
      assert.match(request.headers.Authorization, /number-1$/);
      return new Response('', { status: 401 });
    }
    return json(meta(new URL(url).pathname.split('/').at(-1)));
  } });
  reject = true;
  await assert.rejects(runtime.stateAdapter.read('website'), /storage_read_failed/);
  assert.equal(refreshes, 1);
  assert.equal(metadataCalls, 3);
  await runtime.stateAdapter.read('website');
  assert.equal(refreshes, 2);
  assert.equal(metadataCalls, 4);
});

test('expired grant during write privacy checks stops before the sole Docs POST', async () => {
  let now = 0;
  let metadataCalls = 0;
  let posts = 0;
  const runtime = await createGoogleStateRuntime({ config, clock: () => now, authorize: async (_options, use) => use({
    LTC_GOOGLE_ACCESS_TOKEN: 'fixture-access-token-for-runtime',
  }, 60), fetchImpl: async (url, request) => {
    if (request.method === 'POST') posts++;
    if (!url.includes('/drive/v3/files/')) return json(blank);
    if (++metadataCalls === 5) now = 60_000;
    return json(meta(new URL(url).pathname.split('/').at(-1)));
  } });
  // Startup makes two metadata calls, pre-write read makes one and privacy
  // checks make two. Expire the grant while the last privacy response arrives.
  await assert.rejects(runtime.stateAdapter.conditionalWrite('website', { saved: true }, null), /storage_write_not_attempted/);
  assert.equal(posts, 0);
});

test('known 401 on Docs POST invalidates access but never replays the write', async () => {
  let refreshes = 0;
  let posts = 0;
  const runtime = await createGoogleStateRuntime({ config, authorize: async (_options, use) => use({
    LTC_GOOGLE_ACCESS_TOKEN: `fixture-refreshed-token-number-${++refreshes}`,
  }, 3600), fetchImpl: async (url, request) => {
    if (request.method === 'POST') {
      posts++;
      assert.match(request.headers.Authorization, /number-1$/);
      return new Response('', { status: 401 });
    }
    if (posts) assert.match(request.headers.Authorization, /number-2$/);
    return url.includes('/drive/v3/files/') ? json(meta(new URL(url).pathname.split('/').at(-1))) : json(blank);
  } });
  await assert.rejects(runtime.stateAdapter.conditionalWrite('website', { saved: true }, null), /storage_write_uncertain/);
  assert.equal(posts, 1);
  assert.equal(refreshes, 2);
});
