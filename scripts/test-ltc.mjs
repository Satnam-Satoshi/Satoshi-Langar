import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { collectSource, collectSnapshot, decimal, freshness, parseIbit, parseRelease, sourceDate } from './collect-ltc.mjs';

const now = '2026-09-30T06:10:26.000Z';
const csv = '\uFEFFiShares Bitcoin Trust ETF\nFund Holdings as of,"Sep 28, 2026"\nShares Outstanding,"1,412,720,000.00"\n\nTicker,Name,Quantity,Market Currency\n"BTC","BITCOIN","800,535.28920","BTC"\n"USD","USD CASH","22,646.77000","USD"\n';
const config = JSON.parse(await readFile(new URL('../config/ltc-sources.json', import.meta.url), 'utf8'));
const ibit = config.sources.find(source => source.id === 'ibit-holdings');
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
check('CSV preamble, BOM, commas, native precision, and cash exclusion', () => {
  const parsed = parseIbit(csv, now);
  assert.equal(parsed.sourceAsOf, '2026-09-28');
  assert.deepEqual(parsed.observations.map(item => item.value), ['800535.28920', '1412720000.00']);
  assert.equal(parsed.observations[0].effectiveAt, '2026-09-28');
});
check('wrong product, duplicate asset, missing header and future dates rejected', () => {
  assert.throws(() => parseIbit(csv.replace('iShares Bitcoin Trust ETF', 'Unrelated fund'), now));
  assert.throws(() => parseIbit(`${csv}"BTC","BITCOIN","5","BTC"\n`, now));
  assert.throws(() => parseIbit(csv.replace('Quantity', 'Changed quantity'), now));
  assert.throws(() => parseIbit(csv.replace('Sep 28', 'Oct 28'), now));
  assert.throws(() => sourceDate('Feb 31, 2026', now));
  assert.throws(() => parseIbit('<html>Access denied</html>', now));
});
check('decimal values reject negative, malformed and non-finite input; keep zero', () => {
  for (const value of ['-1', '1,2', 'NaN', '', '1e99']) assert.throws(() => decimal(value));
  assert.equal(decimal('0.00000'), '0.00000');
});
check('date freshness preserves old observations and does not reward retrieval', () => {
  assert.equal(freshness('2026-09-28', now, 4), 'dated-observation');
  assert.equal(freshness('2026-06-30', now, 4), 'stale');
  assert.equal(freshness(null, now, 4), 'unknown');
  assert.equal(freshness('2026-10-01', now, 4), 'invalid');
  assert.equal(freshness('2026-07-08T09:14:15Z', now, null), 'dated-event');
});
check('release identity and publication time are required', () => {
  const release = { tag_name: 'v31.1', html_url: 'https://github.com/bitcoin/bitcoin/releases/tag/v31.1', published_at: '2026-07-08T09:14:15Z', draft: false, prerelease: false };
  assert.equal(parseRelease(JSON.stringify(release), now).observations[0].value, 'v31.1');
  assert.throws(() => parseRelease(JSON.stringify({ ...release, html_url: 'https://example.com/' }), now));
  assert.throws(() => parseRelease(JSON.stringify({ ...release, published_at: 'tomorrow' }), now));
  assert.throws(() => parseRelease(JSON.stringify({ ...release, published_at: '2026-02-30T09:14:15Z' }), now), /invalid_source_date/);
});
check('Litecoin and LND have exact repositories and explicit beta handling', () => {
  const common = { draft: false, prerelease: false, published_at: '2026-09-28T09:14:15Z' };
  const litecoin = { ...common, tag_name: 'v0.21.5.8', html_url: 'https://github.com/litecoin-project/litecoin/releases/tag/v0.21.5.8' };
  const lnd = { ...common, tag_name: 'v0.21.4-beta', html_url: 'https://github.com/lightningnetwork/lnd/releases/tag/v0.21.4-beta' };
  assert.equal(parseRelease(JSON.stringify(litecoin), now, 'github-litecoin-release-v1').observations[0].value, 'v0.21.5.8');
  assert.equal(parseRelease(JSON.stringify(lnd), now, 'github-lnd-release-v1').observations[0].value, 'v0.21.4-beta');
  assert.throws(() => parseRelease(JSON.stringify(lnd), now, 'github-release-v1'), /wrong_release/);
  for (const changed of [{ ...lnd, prerelease: true }, { ...lnd, draft: true }, { ...lnd, tag_name: 'v0.21.4-beta.rc1' }, { ...lnd, html_url: 'https://github.com/other/lnd/releases/tag/v0.21.4-beta' }]) assert.throws(() => parseRelease(JSON.stringify(changed), now, 'github-lnd-release-v1'), /wrong_release/);
});
const ok = await collectSource(ibit, now, async () => new Response(csv, { headers: { 'content-type': 'text/csv' } }));
assert.equal(ok.status, 'collected'); assert.equal(ok.sourceAsOf, '2026-09-28'); assert.equal(ok.sourceSha256.length, 64); checks++;
for (const response of [new Response('denied', { status: 403 }), new Response('<title>Just a moment</title>', { headers: { 'content-type': 'text/html' } }), new Response(csv, { headers: { 'content-type': 'text/csv', 'content-length': '2000001' } })]) {
  const result = await collectSource(ibit, now, async () => response);
  assert.equal(result.status, 'unavailable'); assert.equal(result.observations, null); assert.equal(result.sourceAsOf, null); assert.equal(result.sourceSha256, null); checks++;
}
const denied = await collectSource({ ...ibit, url: 'http://127.0.0.1/private' }, now, async () => { throw new Error('must not fetch'); });
assert.equal(denied.errorCode, 'url_not_allowlisted'); checks++;
const failed = await collectSnapshot(config, { now, fetcher: async () => { throw new Error('private internal details'); } });
assert.equal(failed.failureCount, config.sources.length); assert.ok(failed.sources.every(source => source.observations === null && source.errorCode === 'transport_or_parse_failure')); assert.ok(!JSON.stringify(failed).includes('private internal')); checks++;
const first = await collectSnapshot({ sources: [ibit] }, { now, fetcher: async () => new Response(csv, { headers: { 'content-type': 'text/csv' } }) });
const second = await collectSnapshot({ sources: [ibit] }, { now, fetcher: async () => new Response(csv, { headers: { 'content-type': 'text/csv' } }) });
assert.deepEqual(first, second); checks++;
console.log(`PASS ${checks} LTC collector checks; no network or credentials used.`);
