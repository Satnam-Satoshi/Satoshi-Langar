import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScopedGoogleAuthorization } from './cloud-ltc-google-auth.mjs';

test('production evidence paths use bounded scoped authorization, not one refresh per request', async () => {
  const source = await readFile(new URL('./cloud-ltc-production.mjs', import.meta.url), 'utf8');
  assert.equal((source.match(/createScopedGoogleAuthorization\(\{ env, fetchImpl \}\)/g) || []).length, 2);
  assert.doesNotMatch(source, /withGoogleCloudAuthorization/);
  let now = 0, calls = 0;
  const authorize = async (_, use) => { calls++; return use({LTC_GOOGLE_ACCESS_TOKEN:'fake-access-token'},3600); };
  const cached = createScopedGoogleAuthorization({env:{},authorize,clock:()=>now});
  const token = () => cached(access => access.LTC_GOOGLE_ACCESS_TOKEN);
  await Promise.all(Array.from({length:500},token));
  assert.equal(calls,1);
  now=299999; await token(); assert.equal(calls,1);
  now=300000; await token(); assert.equal(calls,2);
});

test('failed evidence authorization is not cached and scope/token checks are not bypassed', async () => {
  let calls=0;
  const cached=createScopedGoogleAuthorization({env:{},authorize:async()=>{calls++;throw Error('google_refresh_failed');}});
  for(let i=0;i<2;i++) await assert.rejects(cached(a=>a.LTC_GOOGLE_ACCESS_TOKEN),/google_refresh_failed/);
  assert.equal(calls,2);
});
