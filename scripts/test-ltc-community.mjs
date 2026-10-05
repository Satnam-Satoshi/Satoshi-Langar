import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { collectCommunity, COMMUNITY_LIMITS, COMMUNITY_SOURCES, parseCommunityFeed, validateCommunitySnapshot } from './lib/ltc-community.mjs';

const now = '2026-10-05T17:00:00.000Z';
const foundation = COMMUNITY_SOURCES[0]; const nexus = COMMUNITY_SOURCES[1];
const rssItem = ({ title = 'Foundation &amp; community update', date = 'Mon, 05 Oct 2026 10:00:00 -0400', slug = 'community-update', extra = '' } = {}) => `<item><title>${title}</title><link>https://litecoin.com/news/${slug}</link><pubDate>${date}</pubDate><description><![CDATA[Article body is not imported.]]></description>${extra}</item>`;
const rss = (entries = rssItem()) => `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>Litecoin News</title><link>https://litecoin.com/news</link><description>Official source</description>${entries}</channel></rss>`;
const release = (overrides = {}) => ({ id: 365719868, name: '<script>untrusted promotional name</script>', tag_name: 'v1.3.3', html_url: 'https://github.com/litecoin-foundation/nexus/releases/tag/v1.3.3', url: 'https://api.github.com/repos/litecoin-foundation/nexus/releases/365719868', published_at: '2026-08-05T18:21:31Z', draft: false, prerelease: false, body: 'Untrusted body with claims', ...overrides });
const response = (text, type = 'application/rss+xml', status = 200, extra = {}) => new Response(text, { status, headers: { 'content-type': type, ...extra } });
const goodFetcher = async url => url === foundation.url ? response(rss()) : response(JSON.stringify([release()]), 'application/json');

test('official headline and generated release label retain source dates, identity, classifications and hashes', async () => {
  const snapshot = await collectCommunity({ now, fetcher: goodFetcher });
  assert.equal(validateCommunitySnapshot(snapshot, { now }), snapshot);
  assert.equal(snapshot.sourceStatus.length, 2); assert.equal(snapshot.items.length, 2);
  assert.equal(snapshot.items[0].publishedAt, '2026-10-05T14:00:00.000Z');
  assert.equal(snapshot.items[0].title, 'Foundation & community update');
  assert.equal(snapshot.items[1].title, 'Nexus v1.3.3');
  assert.equal(snapshot.items[1].publishedAt, '2026-08-05T18:21:31.000Z');
  assert.equal(snapshot.items[1].summaryClassification, 'official-software-release');
  assert.equal(snapshot.sourceStatus[0].sha256, createHash('sha256').update(rss()).digest('hex'));
  assert.ok(!JSON.stringify(snapshot).includes('Untrusted'));
});

test('only the two fixed endpoints are fetched, once, with no redirects or credentials', async () => {
  const calls = [];
  await collectCommunity({ now, fetcher: async (url, options) => { calls.push(url); assert.equal(options.redirect, 'error'); assert.ok(options.signal instanceof AbortSignal); assert.ok(!options.headers.Authorization); return goodFetcher(url); } });
  assert.deepEqual(calls, COMMUNITY_SOURCES.map(source => source.url));
  assert.equal(COMMUNITY_LIMITS.itemsPerSource, 1); assert.equal(COMMUNITY_LIMITS.timeoutMs, 15000);
});

test('selects one latest item, excludes older than 90 days, and limits headline quotation to 25 words', () => {
  const records = parseCommunityFeed(rss(rssItem({ date: 'Sun, 04 Oct 2026 12:00:00 +0000', slug: 'older' }) + rssItem()), foundation.id, now);
  assert.equal(records.length, 1); assert.match(records[0].url, /community-update$/);
  assert.equal(parseCommunityFeed(rss(rssItem({ date: 'Mon, 07 Jul 2025 17:00:00 GMT' })), foundation.id, now).length, 0);
  assert.equal(parseCommunityFeed(rss(rssItem({ title: Array(25).fill('word').join(' ') })), foundation.id, now).length, 1);
  assert.throws(() => parseCommunityFeed(rss(rssItem({ title: Array(26).fill('word').join(' ') })), foundation.id, now), /invalid_title/);
});

test('rejects impossible, future and timezone-ambiguous publication dates', () => {
  for (const date of ['Tue, 06 Oct 2026 00:00:00 +0000', 'Tue, 31 Feb 2026 10:00:00 +0000', 'Mon, 05 Oct 2026 12:00:00 EST', 'Tue, 05 Oct 2026 12:00:00 GMT', 'Mon, 05 Oct 2026 24:00:00 GMT', 'Mon, 05 Oct 2026 12:00:00 +1460']) assert.throws(() => parseCommunityFeed(rss(rssItem({ date })), foundation.id, now), /invalid_source_date/);
  for (const published_at of ['2026-10-06T00:00:00Z', '2026-02-30T00:00:00Z', '2026-08-05', 'today']) assert.throws(() => parseCommunityFeed(JSON.stringify([release({ published_at })]), nexus.id, now), /invalid_source_date/);
});

test('RSS identity and article URLs must be exact; source instructions and active markup are never executed', () => {
  for (const bad of [rss().replace('https://litecoin.com/news</link>', 'https://example.com/news</link>'), rss().replace('https://litecoin.com/news/community-update', 'https://litecoin.com.evil.example/news/community-update'), rss().replace('https://litecoin.com/news/community-update', 'https://litecoin.com/news/community-update#fake'), rss().replace('https://litecoin.com/news/community-update', 'https://litecoin.com:443/news/community-update'), rss().replace('<item>', '<item><title>duplicate</title>'), rss().replace('</item>', '</bad>'), rss().replace('<item>', '<!DOCTYPE item [<!ENTITY x SYSTEM "file:///secret">]><item>'), rss().replace('<item>', '<item><script>attack()</script>'), rss(rssItem({ title: '&lt;img onerror=alert(1)&gt;' }))]) assert.throws(() => parseCommunityFeed(bad, foundation.id, now));
  assert.throws(() => parseCommunityFeed(rss(rssItem() + rssItem()), foundation.id, now), /duplicate_record/);
});

test('GitHub stable releases require exact repository, release ID/tag, and exclude prereleases and drafts', () => {
  assert.deepEqual(parseCommunityFeed(JSON.stringify([release({ draft: true }), release({ id: 2, prerelease: true })]), nexus.id, now), []);
  for (const overrides of [{ id: -1 }, { draft: 'false' }, { prerelease: null }, { html_url: 'https://github.com/attacker/nexus/releases/tag/v1.3.3' }, { url: 'https://api.github.com/repos/attacker/nexus/releases/365719868' }, { tag_name: '../../attack' }, { tag_name: 'v1.3.4' }]) assert.throws(() => parseCommunityFeed(JSON.stringify([release(overrides)]), nexus.id, now));
  assert.throws(() => parseCommunityFeed(JSON.stringify([release(), release()]), nexus.id, now), /invalid_release/);
  assert.throws(() => parseCommunityFeed('{}', nexus.id, now), /invalid_release/);
  assert.throws(() => parseCommunityFeed('{broken', nexus.id, now), /malformed_json/);
});

test('403 and 429 fail closed without alternate URLs, retry or previous records', async () => {
  for (const status of [403, 429]) {
    let calls = 0;
    const snapshot = await collectCommunity({ now, fetcher: async () => { calls++; return response('Unavailable', 'text/html', status); } });
    assert.equal(calls, 2); assert.deepEqual(snapshot.items, []);
    assert.ok(snapshot.sourceStatus.every(source => source.status === 'unavailable' && source.errorCode === `http_${status}` && source.sha256 === null));
  }
});

test('deferred Foundation request has no fabricated check time and makes only the Nexus request', async () => {
  const calls = [];
  const snapshot = await collectCommunity({ now, deferFoundation: true, fetcher: async url => { calls.push(url); return goodFetcher(url); } });
  assert.deepEqual(calls, [nexus.url]);
  assert.equal(snapshot.sourceStatus[0].checkedAt, null); assert.equal(snapshot.sourceStatus[0].errorCode, 'deferred_by_operator');
  assert.equal(snapshot.items.length, 1);
});

test('transport controls reject redirects, size overflow, HTML, invalid UTF8, empties and abortions', async () => {
  const cases = [
    [() => response('', 'application/rss+xml', 302, { location: 'https://example.com/' }), 'redirect_denied'],
    [() => response('HTML', 'text/html'), 'unexpected_content_type'],
    [() => response('x', 'application/rss+xml', 200, { 'content-length': '2000001' }), 'response_too_large'],
    [() => response('x'.repeat(2_000_001)), 'response_too_large'],
    [() => response(''), 'empty_response'],
    [() => response(new Uint8Array([0xC3, 0x28])), 'invalid_utf8'],
    [() => { throw new DOMException('aborted', 'AbortError'); }, 'timeout'],
    [() => { throw new Error('private raw transport message'); }, 'transport_failure'],
  ];
  for (const [make, code] of cases) {
    const snapshot = await collectCommunity({ now, fetcher: async url => url === foundation.url ? make() : goodFetcher(url) });
    assert.equal(snapshot.sourceStatus[0].errorCode, code); assert.ok(!JSON.stringify(snapshot).includes('private raw'));
  }
});

test('raw evidence is provided before parse acceptance and storage failure aborts instead of silently losing provenance', async () => {
  const evidence = [];
  const snapshot = await collectCommunity({ now, fetcher: async url => url === foundation.url ? response('broken') : goodFetcher(url), onEvidence: async record => evidence.push(record) });
  assert.equal(snapshot.sourceStatus[0].status, 'unavailable'); assert.equal(evidence.length, 2);
  for (const record of evidence) assert.equal(record.sha256, createHash('sha256').update(record.bytes).digest('hex'));
  await assert.rejects(collectCommunity({ now, fetcher: goodFetcher, onEvidence: async () => { throw new Error('evidence_write_failed'); } }), /evidence_write_failed/);
});

test('snapshot rejects tampering, unavailable-source records, changed timestamps and unknown extra fields', async () => {
  const original = await collectCommunity({ now, fetcher: goodFetcher });
  const mutations = [
    s => { s.schemaVersion = 2; }, s => { s.sourceStatus.pop(); }, s => { s.sourceStatus[1] = s.sourceStatus[0]; },
    s => { s.sourceStatus[0].url = 'https://attacker.example/rss'; }, s => { s.sourceStatus[0].sha256 = 'bad'; },
    s => { s.sourceStatus[0].checkedAt = null; }, s => { s.sourceStatus[0].checkedAt = '2026-10-05T17:01:00Z'; },
    s => { s.sourceStatus[0].status = 'unavailable'; s.sourceStatus[0].errorCode = 'http_403'; },
    s => { s.items[0].id = 'invented'; }, s => { s.items[0].sourceName = 'Someone else'; },
    s => { s.items[0].publishedAt = '2026-10-06T00:00:00Z'; }, s => { s.items[0].title = '<script>bad</script>'; },
    s => { s.items[0].summaryClassification = 'independent-verification'; }, s => { s.items[0].summary = 'unverified narrative'; },
    s => { s.items.push(s.items[0]); }, s => { s.items.reverse(); }, s => { s.items[1].title = 'Marketing claim'; },
  ];
  for (const change of mutations) { const s = structuredClone(original); change(s); assert.throws(() => validateCommunitySnapshot(s, { now })); }
  assert.throws(() => validateCommunitySnapshot(original, { now: '2026-10-06T17:00:00.001Z' }), /stale_or_future/);
  assert.throws(() => validateCommunitySnapshot(original, { now: '2026-10-05T16:59:59.999Z' }), /stale_or_future/);
});
