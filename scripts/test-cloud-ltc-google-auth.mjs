import test from 'node:test';
import assert from 'node:assert/strict';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
const env = { LTC_GOOGLE_CLIENT_ID: '123456789012-ownerclient.apps.googleusercontent.com', LTC_GOOGLE_CLIENT_SECRET: 'test-secret-value-only', LTC_GOOGLE_REFRESH_TOKEN: 'test-refresh-value-only' };
const data = { access_token: 'test-access-token-only', token_type: 'Bearer', expires_in: 3600, scope: 'https://www.googleapis.com/auth/drive.file' };
const response = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
test('fixed supported refresh destination, no retry, only scoped access downstream', async () => {
  let calls = 0; let result;
  await withGoogleCloudAuthorization({env, fetchImpl: async (url, options) => {
    calls++; assert.equal(url, 'https://oauth2.googleapis.com/token'); assert.equal(options.redirect, 'error'); assert.equal(options.method, 'POST');
    const body = new URLSearchParams(options.body); assert.equal(body.get('grant_type'), 'refresh_token'); assert.equal(body.get('refresh_token'), env.LTC_GOOGLE_REFRESH_TOKEN);
    return response(data);
  }}, access => { result = access; assert.deepEqual(Object.keys(access), ['LTC_GOOGLE_ACCESS_TOKEN']); assert.equal(Object.isFrozen(access), true); });
  assert.equal(calls, 1); assert.equal(result.LTC_GOOGLE_ACCESS_TOKEN, data.access_token); assert.equal(env.LTC_GOOGLE_ACCESS_TOKEN, undefined);
});
test('absent credentials stop before network or callback', async () => {
  await assert.rejects(withGoogleCloudAuthorization({env:{},fetchImpl:()=>assert.fail()},()=>assert.fail()), /google_refresh_credentials_required/);
});
test('invalid grant and provider diagnostics are redacted without retry', async () => {
  let calls = 0;
  await assert.rejects(withGoogleCloudAuthorization({env,fetchImpl:async()=>{ calls++; return new Response('private provider diagnostic '+env.LTC_GOOGLE_REFRESH_TOKEN,{status:400}); }},()=>assert.fail()), /^Error: google_refresh_failed$/);
  assert.equal(calls,1);
});
test('broader scope, malformed tokens, overlong or truncated JSON never reach state', async () => {
  for (const value of [{...data,scope:'https://www.googleapis.com/auth/drive'}, {...data,expires_in:0}, {...data,access_token:'bad token'}, {...data,token_type:'Other'}, {...data,extra:'x'.repeat(17000)}]) {
    await assert.rejects(withGoogleCloudAuthorization({env,fetchImpl:async()=>response(value)},()=>assert.fail()), /google_refresh_(failed|scope_mismatch)/);
  }
  await assert.rejects(withGoogleCloudAuthorization({env,fetchImpl:async()=>new Response('{', {headers:{'content-type':'application/json'}})},()=>assert.fail()), /google_refresh_failed/);
});
test('network failure is sanitized; downstream state failures remain distinguishable', async () => {
  await assert.rejects(withGoogleCloudAuthorization({env,fetchImpl:async()=>{throw Error(env.LTC_GOOGLE_CLIENT_SECRET);}},()=>assert.fail()), /^Error: google_refresh_failed$/);
  await assert.rejects(withGoogleCloudAuthorization({env,fetchImpl:async()=>response(data)},()=>{throw Error('state_lease_conflict');}), /state_lease_conflict/);
});
