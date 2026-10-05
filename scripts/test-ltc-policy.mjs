import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { collectPolicy, parsePolicyFeed, POLICY_LIMITS, POLICY_SOURCES, policyRecordSummary, validatePolicySnapshot } from './lib/ltc-policy.mjs';

const now = '2026-10-05T15:00:00.000Z';
const dates = ['Thu, 01 Oct 2026 12:16:07 -0400', 'Thu, 24 Sep 2026 14:46:00 +0000', 'Tue, 22 Sep 2026 20:38:00 +0000'];
const urlFor = (source, index = 0) => source.id.startsWith('sec') ? `${source.origin}/newsroom/press-releases/2026-${100 - index}-record-title` : `${source.origin}/PressRoom/PressReleases/${9306 - index}-26`;
const entry = (source, { index = 0, date = dates[index], title = 'Agency &amp; market &#8217; &#x2014; record', url = urlFor(source, index), extra = '' } = {}) => `<item><title>${title}</title><link>${url}</link><description>&lt;p&gt;Untrusted description; not imported.&lt;/p&gt;</description><pubDate>${date}</pubDate>${extra}</item>`;
const feed = (source, entries = entry(source)) => `<?xml version="1.0" encoding="utf-8"?><rss xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0" xml:base="${source.origin}/"><channel><title>Press Releases</title><link>${source.origin}/</link><description/>${entries}</channel></rss>`;
const response = (text, options = {}) => new Response(text, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', ...options.headers }, ...Object.fromEntries(Object.entries(options).filter(([key]) => key !== 'headers')) });
const goodFetcher = async url => response(feed(POLICY_SOURCES.find(source => source.url === url)));
const copy = value => structuredClone(value);

test('accepts both fixed official identities, entity decoding, source dates and original neutral summary', async () => {
  const snapshot = await collectPolicy({ now, fetcher: goodFetcher });
  assert.equal(validatePolicySnapshot(snapshot, { now }), snapshot);
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.sources.length, 2);
  for (const source of snapshot.sources) {
    assert.equal(source.status, 'collected'); assert.equal(source.items.length, 1);
    assert.equal(source.items[0].title, 'Agency & market ’ — record');
    assert.equal(source.items[0].publishedAt, '2026-10-01T16:16:07.000Z');
    assert.notEqual(source.items[0].publishedAt, source.checkedAt);
    assert.equal(source.items[0].classification, 'official-press-release');
    assert.match(policyRecordSummary(source, source.items[0]), /official RSS timestamp 2026-10-01T16:16:07\.000Z/);
    assert.equal(source.sha256, createHash('sha256').update(feed(POLICY_SOURCES.find(item => item.id === source.id))).digest('hex'));
    assert.ok(!JSON.stringify(source).includes('Untrusted description'));
  }
  assert.deepEqual(snapshot, await collectPolicy({ now, fetcher: goodFetcher }));
});

test('request targets and transport options are fixed and bounded', async () => {
  const calls = [];
  await collectPolicy({ now, fetcher: async (url, options) => {
    calls.push(url); assert.equal(options.redirect, 'error'); assert.ok(options.signal instanceof AbortSignal);
    assert.match(options.headers['User-Agent'], /^SatnamSatoshi-LTC\//);
    assert.equal(options.headers.Accept, 'application/rss+xml,application/xml,text/xml');
    return goodFetcher(url);
  } });
  assert.deepEqual(calls.sort(), POLICY_SOURCES.map(source => source.url).sort());
  assert.equal(POLICY_LIMITS.maximumBytes, 2_000_000); assert.equal(POLICY_LIMITS.timeoutMs, 15_000);
});

test('sorts newest first, chooses at most two records, and excludes history older than 30 elapsed days', () => {
  const source = POLICY_SOURCES[0];
  const records = parsePolicyFeed(feed(source, entry(source, { index: 2 }) + entry(source) + entry(source, { index: 1 })), source.id, now);
  assert.deepEqual(records.map(record => record.url), [urlFor(source), urlFor(source, 1)]);
  const old = entry(source, { date: 'Fri, 04 Sep 2026 15:00:00 +0000' });
  assert.deepEqual(parsePolicyFeed(feed(source, old), source.id, now), []);
  const boundary = entry(source, { date: 'Sat, 05 Sep 2026 15:00:00 +0000' });
  assert.equal(parsePolicyFeed(feed(source, boundary), source.id, now).length, 1);
  assert.equal(parsePolicyFeed(feed(source, boundary), source.id, '2026-10-05T15:00:00.001Z').length, 0);
});

test('rejects impossible, future, ambiguous and wrong-weekday publication dates', () => {
  const source = POLICY_SOURCES[0];
  for (const date of ['Tue, 06 Oct 2026 15:00:00 +0000', 'Mon, 05 Oct 2026 15:00:01 +0000', 'Mon, 31 Feb 2026 10:00:00 +0000', 'Thu, 01 Oct 2026 24:00:00 +0000', 'Thu, 01 Oct 2026 12:60:00 +0000', 'Thu, 01 Oct 2026 12:00:60 +0000', 'Thu, 01 Oct 2026 12:00:00 +1460', 'Fri, 01 Oct 2026 12:00:00 +0000', '2026-10-01', 'Thu, 01 Oct 2026 12:00:00 EST', 'today']) {
    assert.throws(() => parsePolicyFeed(feed(source, entry(source, { date })), source.id, now), /invalid_source_date/, date);
  }
});

test('requires exact government origin and recognized record paths without URL tricks', () => {
  for (const source of POLICY_SOURCES) {
    for (const url of [urlFor(source).replace('https:', 'http:'), urlFor(source).replace('.gov', '.gov.evil.example'), urlFor(source).replace('www.', 'www.sec.gov@www.'), `${urlFor(source)}?url=https://evil.example`, `${urlFor(source)}#claim`, `${source.origin}/unrelated`, `${source.origin}:443${new URL(urlFor(source)).pathname}`, urlFor(source).replace('https://', 'https:\\'), urlFor(source).replace('record-title', '%72ecord-title')].filter(url => url !== urlFor(source))) {
      assert.throws(() => parsePolicyFeed(feed(source, entry(source, { url })), source.id, now), /invalid_record_url/, url);
    }
    assert.throws(() => parsePolicyFeed(feed(source).replace(`<link>${source.origin}/</link>`, '<link>https://example.com/</link>'), source.id, now), /invalid_feed_identity/);
  }
  assert.throws(() => parsePolicyFeed(feed(POLICY_SOURCES[0]), 'unrecognized', now), /invalid_feed_identity/);
});

test('strict XML rejects malformed structures, duplicate fields, DTD/entities, scripts and unsafe titles', () => {
  const source = POLICY_SOURCES[1]; const original = feed(source);
  for (const xml of [original.replace('</item>', '</wrong>'), original.replace('</rss>', ''), original + '<rss/>', original.replace('<description/>', '<description>'), original.replace('<item>', '<item><title>Second title</title>'), original.replace('<rss ', '<rss version="2.0" '), original.replace('<item>', '<item><script>alert(1)</script>'), original.replace('<item>', '<item><?external instruction?>'), original.replace('<item>', '<!DOCTYPE item [<!ENTITY a SYSTEM "file:///etc/passwd">]><item>'), original.replace('Agency &amp;', 'Agency &bogus;'), original.replace('Agency &amp;', 'Agency &#0;'), original.replace('Agency &amp;', 'Agency &raw'), original.replace('Agency &amp;', 'Agency &#xD800;'), original.replace('<description/>', '<description><![CDATA[\u0000]]></description>')]) {
    assert.throws(() => parsePolicyFeed(xml, source.id, now), /malformed_xml|unsupported_xml|invalid_feed_identity/);
  }
  for (const title of ['&lt;script&gt;alert(1)&lt;/script&gt;', '<![CDATA[<img src=x onerror=alert(1)>]]>', '', 'a'.repeat(601)]) {
    assert.throws(() => parsePolicyFeed(feed(source, entry(source, { title })), source.id, now), /invalid_title/);
  }
  assert.equal(parsePolicyFeed(feed(source, entry(source, { title: '<![CDATA[Agency & market]]>' })), source.id, now)[0].title, 'Agency & market');
});

test('duplicate record URLs fail the whole feed', () => {
  const source = POLICY_SOURCES[0];
  assert.throws(() => parsePolicyFeed(feed(source, entry(source) + entry(source)), source.id, now), /duplicate_record/);
});

test('403 is unavailable with no workaround or records, and errors reveal no transport details', async () => {
  let calls = 0;
  const snapshot = await collectPolicy({ now, fetcher: async () => { calls++; return response('Access denied', { status: 403 }); } });
  assert.equal(calls, POLICY_SOURCES.length);
  for (const source of snapshot.sources) assert.deepEqual({ status: source.status, sha256: source.sha256, errorCode: source.errorCode, items: source.items }, { status: 'unavailable', sha256: null, errorCode: 'http_403', items: [] });
  const failure = await collectPolicy({ now, fetcher: async () => { throw new Error('private credentials and internal details'); } });
  assert.ok(failure.sources.every(source => source.errorCode === 'transport_failure'));
  assert.ok(!JSON.stringify(failure).includes('private credentials'));
});

test('rejects redirects, HTML, oversized responses, empty bodies, invalid UTF-8 and aborted requests', async () => {
  const cases = [
    [() => response('', { status: 302, headers: { location: 'https://evil.example/' } }), 'redirect_denied'],
    [() => response('<html>not RSS</html>', { headers: { 'content-type': 'text/html' } }), 'unexpected_content_type'],
    [() => response('x', { headers: { 'content-length': '2000001' } }), 'response_too_large'],
    [() => response('x'.repeat(2_000_001)), 'response_too_large'],
    [() => response(''), 'empty_response'],
    [() => response(new Uint8Array([0xC3, 0x28])), 'invalid_utf8'],
    [() => { throw new DOMException('aborted', 'AbortError'); }, 'timeout'],
    [() => { const result = response('x'); Object.defineProperty(result, 'url', { value: 'https://evil.example/' }); return result; }, 'redirect_denied'],
  ];
  for (const [make, code] of cases) {
    const snapshot = await collectPolicy({ now, fetcher: async () => make() });
    assert.ok(snapshot.sources.every(source => source.status === 'unavailable' && source.errorCode === code && source.items.length === 0), code);
  }
});

test('malformed/future feed data fails closed and keeps only the raw-body hash', async () => {
  const snapshot = await collectPolicy({ now, fetcher: async url => response(feed(POLICY_SOURCES.find(source => source.url === url), entry(POLICY_SOURCES.find(source => source.url === url), { date: 'Tue, 06 Oct 2026 15:00:00 +0000' }))) });
  for (const source of snapshot.sources) { assert.equal(source.status, 'unavailable'); assert.equal(source.errorCode, 'invalid_source_date'); assert.equal(source.items.length, 0); assert.match(source.sha256, /^[a-f0-9]{64}$/); }
});

test('snapshot validator rejects source substitution, extra content, inconsistent states and fabricated dates', async () => {
  const original = await collectPolicy({ now, fetcher: goodFetcher });
  const modifications = [
    snapshot => { snapshot.schemaVersion = 2; },
    snapshot => { snapshot.sources.pop(); },
    snapshot => { snapshot.sources[1] = snapshot.sources[0]; },
    snapshot => { snapshot.sources[0].url = 'https://example.com/rss'; },
    snapshot => { snapshot.sources[0].title = 'Fake'; },
    snapshot => { snapshot.sources[0].checkedAt = '2026-10-05T15:00:01.000Z'; },
    snapshot => { snapshot.sources[0].sha256 = '123'; },
    snapshot => { snapshot.sources[0].status = 'unavailable'; },
    snapshot => { snapshot.sources[0].errorCode = 'http_403'; },
    snapshot => { snapshot.sources[0].items[0].title = '<img onerror=alert(1)>'; },
    snapshot => { snapshot.sources[0].items[0].summary = 'Unvalidated arbitrary claim'; },
    snapshot => { snapshot.sources[0].items[0].classification = 'legal-ruling'; },
    snapshot => { snapshot.sources[0].items[0].id = 'fabricated'; },
    snapshot => { snapshot.sources[0].items[0].publishedAt = '2026-10-06T00:00:00.000Z'; },
    snapshot => { snapshot.sources[0].items[0].publishedAt = '2026-02-30T00:00:00.000Z'; },
    snapshot => { snapshot.sources[0].items[0].publishedAt = '2026-09-04T15:00:00.000Z'; },
    snapshot => { snapshot.sources[0].items.push(snapshot.sources[0].items[0]); },
  ];
  for (const modify of modifications) { const snapshot = copy(original); modify(snapshot); assert.throws(() => validatePolicySnapshot(snapshot, { now })); }
  assert.throws(() => validatePolicySnapshot(original, { now: '2026-10-06T15:00:00.001Z' }), /stale_or_future_policy_snapshot/);
  assert.throws(() => validatePolicySnapshot(original, { now: '2026-10-05T14:59:59.999Z' }), /stale_or_future_policy_snapshot/);
});
