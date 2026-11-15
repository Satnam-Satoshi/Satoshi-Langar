import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAIN_URL, litecoinChainResponse } from './lib/litecoin-chain-service.mjs';
import handler from './functions/litecoin-chain.mjs';
const now = Date.parse('2026-10-15T20:00:00Z');
const hash = 'a'.repeat(64);
const chain = { name: 'LTC.main', height: 3190000, hash, time: new Date(now - 10000).toISOString() };
const block = { height: chain.height, hash, time: new Date(now - 180000).toISOString() };
const req = (method = 'GET', query = '') => new Request(`https://example.org/api/litecoin-chain${query}`, { method });
function fixture(c = chain, b = block) {
  let calls = 0;
  return async (url, options) => {
    assert.equal(url, calls++ === 0 ? CHAIN_URL : `${CHAIN_URL}/blocks/${hash}?txstart=1&limit=1`);
    assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    assert.equal(options.headers.authorization, undefined);
    return Response.json(calls === 1 ? c : b);
  };
}
const run = (fetcher, request = req(), extra = {}) => litecoinChainResponse(request, { fetcher, clock: () => now, ...extra });
test('fixed URLs, separate provider and fetch times, actual block time and bounded CDN cache', async () => {
  const result = await run(fixture());
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(data.height, chain.height); assert.equal(data.observedAt, chain.time);
  assert.equal(data.blockTimestamp, block.time); assert.equal(data.checkedAt, new Date(now).toISOString());
  assert.equal(data.observationAgeSeconds, 10); assert.equal(data.blockAgeSeconds, 180);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.headers.get('vercel-cdn-cache-control'), 'public, max-age=60');
});
test('invalid chain, height, hash, stale/future provider time fail closed', async () => {
  for (const change of [{ name: 'BTC.main' }, { height: 0 }, { height: 1.5 }, { height: Number.MAX_SAFE_INTEGER + 1 }, { hash: '../' }, { time: 'no' }, { time: new Date(now - 1200001).toISOString() }, { time: new Date(now + 60001).toISOString() }]) {
    assert.equal((await run(fixture({ ...chain, ...change }))).status, 503);
  }
});
test('second read failure or mismatched block never returns partial or extrapolated height', async () => {
  for (const change of [{ hash: 'b'.repeat(64) }, { height: chain.height - 1 }, { time: new Date(now - 7200001).toISOString() }, { time: new Date(now + 60001).toISOString() }]) {
    assert.equal((await run(fixture(chain, { ...block, ...change }))).status, 503);
  }
  let calls = 0;
  const response = await run(async () => ++calls === 1 ? Response.json(chain) : new Response('', { status: 429 }));
  assert.equal(response.status, 503); assert.equal((await response.json()).height, undefined);
  assert.equal(response.headers.get('vercel-cdn-cache-control'), 'no-store');
});
test('oversized announced and streamed bodies, malformed JSON and timeout fail closed', async () => {
  for (const fetcher of [
    async () => new Response('{}', { headers: { 'content-length': '100001' } }),
    async () => new Response(' '.repeat(100001)),
    async () => new Response('{broken'),
    async () => new Promise(() => {}),
  ]) assert.equal((await run(fetcher, req(), { timeoutMs: 15 })).status, 503);
});
test('query and non-read methods do not access source; HEAD has no body', async () => {
  const noFetch = async () => { throw new Error('must not fetch'); };
  assert.equal((await run(noFetch, req('POST'))).status, 405);
  assert.equal((await run(noFetch, req('GET', '?url=https://evil.invalid'))).status, 400);
  const head = await run(fixture(), req('HEAD'));
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
});
test('Node wrapper preserves HTTP rejection status and headers', async () => {
  const headers = {};
  const res = { setHeader(name, value) { headers[name] = value; }, end(body) { this.body = body; } };
  await handler({ method: 'POST', url: '/api/litecoin-chain' }, res);
  assert.equal(res.statusCode, 405); assert.equal(headers.allow, 'GET, HEAD');
  assert.equal(JSON.parse(res.body).reason, 'method_not_allowed');
});
test('provider observation is revalidated after collection and cannot be relabelled checked now', async () => {
  const times = [now, now, now, now + 1200000];
  const result = await run(fixture(), req(), { clock: () => times.shift() ?? now + 1200000 });
  assert.equal(result.status, 503);
});
test('body read hangs and redirects fail within deadline', async () => {
  const hanging = new ReadableStream({ start() {} });
  assert.equal((await run(async () => new Response(hanging), req(), { timeoutMs: 15 })).status, 503);
  assert.equal((await run(async () => Response.redirect('https://evil.invalid'))).status, 503);
});
