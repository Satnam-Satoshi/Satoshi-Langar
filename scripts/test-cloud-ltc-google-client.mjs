import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleStateClient, validateCloudStateConfig } from './cloud-ltc-google-client.mjs';
import { safeFailure } from './cloud-ltc-release.mjs';
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

test('non-success statuses retain status without provider text; only retryable GETs repeat', async () => {
  for (const status of [400, 401, 403, 404, 409, 429, 500]) {
    let calls = 0; let preparing = true;
    const client = createGoogleStateClient({ config, env, allowWrites: true, sleep: async () => {}, fetchImpl: async (url, request) => { calls++; if (request.method === 'GET' && url.includes('/drive/v3/files/') && preparing) return json(metadata(new URL(url).pathname.split('/').at(-1))); return json({ error: `private ${env.LTC_GOOGLE_ACCESS_TOKEN}` }, status); } });
    await client.verifySelectedResources(); preparing = false; calls = 0;
    assert.deepEqual(await client.getFileMetadata(config.documentId), { status, body: null });
    assert.deepEqual(await client.batchUpdateDocument(config.documentId, batch), { status, body: null });
    assert.equal(calls, [429, 500].includes(status) ? 4 : 2);
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


test('GET transport failures and selected retryable statuses are bounded to three requests', async () => {
  for (const failure of ['network',429,500,502,503,504]) {
    let calls=0;const delays=[];
    const client=createGoogleStateClient({config,env,sleep:async ms=>delays.push(ms),fetchImpl:async()=>{
      calls++;if(calls===3)return json(document());
      if(failure==='network')throw Error('transport unavailable');return json({},failure);
    }});
    assert.equal((await client.getDocument(config.documentId,options)).status,200);
    assert.equal(calls,3);assert.deepEqual(delays,[250,500]);
  }
});

test('exhausted GET transport retries stop; errors remain sanitized', async () => {
  for (const failure of ['network',429,500,502,503,504]) {
    let calls=0;const delays=[];
    const client=createGoogleStateClient({config,env,sleep:async ms=>delays.push(ms),fetchImpl:async()=>{
      calls++;if(failure==='network')throw Error('private provider diagnostic');return json({},failure);
    }});
    if(failure==='network')await assert.rejects(client.getDocument(config.documentId,options),error=>error.message==='storage_read_failed');
    else assert.deepEqual(await client.getDocument(config.documentId,options),{status:failure,body:null});
    assert.equal(calls,3);assert.deepEqual(delays,[250,500]);
  }
});

test('GET authorization, other statuses and schema failures never retry', async () => {
  for(const response of [()=>json({},401),()=>json({},403),()=>json({},400),()=>json({},404),()=>new Response('not json',{headers:{'content-type':'application/json'}}),()=>json([])]) {
    let calls=0,sleeps=0;
    const client=createGoogleStateClient({config,env,sleep:async()=>{sleeps++;},fetchImpl:async()=>{calls++;return response();}});
    await client.getDocument(config.documentId,options).catch(error=>assert.equal(error.message,'storage_read_failed'));
    assert.equal(calls,1);assert.equal(sleeps,0);
  }
});

test('POST timeouts and retryable HTTP statuses are never repeated', async () => {
  for(const failure of ['network',429,500,502,503,504]) {
    let writes=0,sleeps=0;
    const client=createGoogleStateClient({config,env,allowWrites:true,sleep:async()=>{sleeps++;},fetchImpl:async(url,request)=>{
      if(request.method==='GET')return json(metadata(new URL(url).pathname.split('/').at(-1)));
      writes++;if(failure==='network')throw Error('private');return json({},failure);
    }});
    await client.verifySelectedResources();
    if(failure==='network')await assert.rejects(client.batchUpdateDocument(config.documentId,batch),/storage_write_uncertain/);
    else assert.deepEqual(await client.batchUpdateDocument(config.documentId,batch),{status:failure,body:null});
    assert.equal(writes,1);assert.equal(sleeps,0);
  }
});

import {createGoogleStateRuntime} from './cloud-ltc-google-runtime.mjs';
for (const delayAt of ['oauth','ledger-read','privacy-read']) {
  test(`synchronous write boundary blocks expiry during ${delayAt} with zero POSTs`,async()=>{
    let expired=false,armed=false,posts=0;
    const runtime=await createGoogleStateRuntime({config,env,
      authorize:async(_options,callback)=>{if(armed&&delayAt==='oauth')expired=true;return callback(env);},
      beforeWrite:()=>{assert.equal(armed,true);if(expired)throw Error('review_expired');},
      fetchImpl:async(url,request)=>{
        if(request.method==='POST'){posts++;return json({documentId:config.documentId,writeControl:{requiredRevisionId:'revision-2'}});}
        if(url.includes('/drive/v3/files/')){
          if(armed&&delayAt==='privacy-read')expired=true;
          return json(metadata(new URL(url).pathname.split('/').at(-1)));
        }
        if(armed&&delayAt==='ledger-read')expired=true;
        return json(document());
      }});
    armed=true;
    await assert.rejects(runtime.stateAdapter.conditionalWrite('website',{saved:true},null),/storage_write_not_attempted/);
    assert.equal(posts,0);
  });
}
test('async write guards are rejected without sending a POST',async()=>{
 let posts=0;
 const client=createGoogleStateClient({config,env,allowWrites:true,beforeWrite:()=>Promise.resolve(),fetchImpl:async(url,request)=>{
   if(request.method==='POST')posts++;
   return json(metadata(new URL(url).pathname.split('/').at(-1)));
 }});
 await client.verifySelectedResources();await assert.rejects(client.batchUpdateDocument(config.documentId,batch),/invalid_google_write_guard/);assert.equal(posts,0);
});

function interruptedBody() {
  return new Response(new ReadableStream({
    start(controller) { controller.error(new Error('private provider stream failure')); },
  }), { headers: { 'content-type': 'application/json' } });
}

test('GET headers, HTTP status and body interruption share one three-attempt budget', async () => {
  const delays = [];
  let calls = 0;
  const client = createGoogleStateClient({ config, env, sleep: async delay => delays.push(delay), fetchImpl: async () => {
    calls++;
    if (calls === 1) throw new Error('private transport details');
    if (calls === 2) return json({}, 500);
    if (calls === 3) return interruptedBody();
    throw new Error('unexpected fourth attempt');
  } });
  await assert.rejects(client.getDocument(config.documentId, options), error => safeFailure(error) === 'storage_read_failed (docs-document/body)');
  assert.equal(calls, 3);
  assert.deepEqual(delays, [250, 500]);
});

test('interrupted GET body recovers while an interrupted POST body remains uncertain after one POST', async () => {
  let reads = 0;
  let writes = 0;
  const client = createGoogleStateClient({ config, env, allowWrites: true, sleep: async () => {}, fetchImpl: async (url, request) => {
    if (request.method === 'POST') { writes++; return interruptedBody(); }
    if (url.includes('/drive/v3/files/')) return json(metadata(new URL(url).pathname.split('/').at(-1)));
    return ++reads === 1 ? interruptedBody() : json(document());
  } });
  await client.verifySelectedResources();
  assert.equal((await client.getDocument(config.documentId, options)).status, 200);
  assert.equal(reads, 2);
  await assert.rejects(client.batchUpdateDocument(config.documentId, batch), /storage_write_uncertain/);
  assert.equal(writes, 1);
});

test('adapter diagnostics distinguish HTTP, invalid responses and privacy failure without provider data', async () => {
  for (const [response, expected] of [
    [() => json({ private: env.LTC_GOOGLE_ACCESS_TOKEN }, 401), 'storage_read_failed (drive-metadata/http-401)'],
    [() => json([], 200), 'storage_read_failed (drive-metadata/invalid-response)'],
    [() => json({ ...metadata(config.documentId), shared: true }), 'private_storage_required'],
    [() => new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '1100001' } }), 'storage_read_failed (drive-metadata/invalid-response)'],
  ]) {
    let calls = 0;
    const client = createGoogleStateClient({ config, env, fetchImpl: async () => { calls++; return response(); } });
    const adapter = new GoogleDocsStateAdapter({ ...config, client });
    await assert.rejects(adapter.read('website'), error => safeFailure(error) === expected);
    assert.equal(calls, 1);
  }
});

test('OAuth transport failure is classified safely at ledger read without retrying token POST', async () => {
  let tokenPosts = 0;
  let providerGets = 0;
  let now = 0;
  const oauthEnv = {
    LTC_GOOGLE_CLIENT_ID: 'fixture-client-id.apps.googleusercontent.com',
    LTC_GOOGLE_CLIENT_SECRET: 'fixture-secret-please-do-not-log',
    LTC_GOOGLE_REFRESH_TOKEN: 'fixture-refresh-please-do-not-log',
  };
  const runtime = await createGoogleStateRuntime({ config, env: oauthEnv, clock: () => now, fetchImpl: async (url, request) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      assert.equal(request.method, 'POST');
      if (++tokenPosts > 1) throw new Error(oauthEnv.LTC_GOOGLE_REFRESH_TOKEN);
      return json({ token_type: 'Bearer', access_token: env.LTC_GOOGLE_ACCESS_TOKEN, expires_in: 3600 });
    }
    providerGets++;
    return json(metadata(new URL(url).pathname.split('/').at(-1)));
  } });
  now = 300_000;
  await assert.rejects(runtime.stateAdapter.read('website'), error => safeFailure(error) === 'storage_read_failed (drive-metadata/oauth-refresh)');
  assert.equal(tokenPosts, 2);
  assert.equal(providerGets, 2);
});
