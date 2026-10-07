import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildCoverage, validateCoverage } from './lib/ltc-coverage.mjs';
import { collectSnapshot } from './collect-ltc.mjs';
import { prepareEdition } from './prepare-ltc-edition.mjs';

const catalog = JSON.parse(await readFile(new URL('../content/ltc-desks.json', import.meta.url), 'utf8'));
const mapping = JSON.parse(await readFile(new URL('../config/ltc-coverage.json', import.meta.url), 'utf8'));
const registry = JSON.parse(await readFile(new URL('../config/ltc-sources.json', import.meta.url), 'utf8'));
const policy = JSON.parse(await readFile(new URL('../config/ltc-publication.json', import.meta.url), 'utf8'));
const generatedAt = '2026-10-04T18:00:00Z';
// Fixtures have a fixed review clock; future editorial updates must not time-travel these tests.
catalog.updatedAt = '2026-10-04T16:50:36Z';
catalog.desks.forEach(desk => { desk.reviewedAt = '2026-10-04'; });
const sources = registry.sources.map(source => ({ id: source.id, checkedAt: '2026-10-04T17:59:00Z', sourceAsOf: null, status: 'reference-retrieved', freshness: 'unknown', observations: null }));
function setSource(id, patch) { Object.assign(sources.find(source => source.id === id), patch); }
setSource('coinbase-btc-usd', { status: 'collected', freshness: 'dated-observation', sourceAsOf: '2026-10-04T17:58:00Z', observations: [{ metric: 'btc_usd_last_trade', label: 'BTC/USD last trade · Coinbase Exchange' }] });
setSource('ibit-holdings', { status: 'collected', freshness: 'dated-observation', sourceAsOf: '2026-10-02', observations: [{ metric: 'fund_btc_quantity', label: 'IBIT reported BTC holdings' }, { metric: 'fund_shares_outstanding', label: 'IBIT shares outstanding' }] });
setSource('bitcoin-core', { status: 'collected', freshness: 'dated-event', sourceAsOf: '2026-07-08T09:14:15Z', observations: [{ metric: 'software_release', label: 'Bitcoin Core latest returned release' }] });
setSource('strategy-notes', { status: 'unavailable' });
setSource('sec-news', { status: 'unavailable' });
const inputs = () => structuredClone({ catalog, mapping, sources, generatedAt });
const build = patch => buildCoverage({ ...inputs(), ...patch });

test('every reference page is represented once, with truthful scoped evidence classes', () => {
  const manifest = build();
  assert.deepEqual(manifest.pages.map(page => page.page), Array.from({ length: 29 }, (_, index) => index + 1));
  assert.equal(manifest.pages.find(page => page.deskId === 'market-opening').status, 'sampled-observations');
  assert.equal(manifest.pages.find(page => page.deskId === 'bitcoin-core').status, 'dated-upstream-record');
  assert.equal(manifest.pages.find(page => page.deskId === 'circle-arc').status, 'reference-only');
  assert.equal(manifest.pages.find(page => page.deskId === 'sec-cftc').status, 'not-monitored');
  assert.equal(manifest.pages.filter(page => page.status === 'edition-design').length, 4);
  const flows = manifest.pages.find(page => page.deskId === 'bitcoin-etf-flows');
  assert.match(flows.summary, /IBIT reported BTC holdings/);
  assert.match(flows.summary, /do not validate every field/);
  assert.match(flows.context.limits, /No fresh ETF net-flow/);
  assert.equal(validateCoverage(manifest, { sources, generatedAt }), true);
});

test('unqueried educational references never acquire a collection timestamp or fake metric', () => {
  const page = build().pages.find(page => page.deskId === 'wrapped-assets');
  assert.equal(page.status, 'reference-only');
  assert.deepEqual(page.sourceChecks, []);
  assert.ok(page.sources.length > 0);
  assert.ok(page.sources.every(source => !Object.hasOwn(source, 'checkedAt')));
  assert.match(page.summary, /not queried/);
  assert.equal(page.context.reviewedAt, '2026-10-04');
  assert.equal(Object.hasOwn(page, 'metrics'), false);
});

test('a stale financial observation is not upgraded by recent collection; absent values stay absent', () => {
  const changed = inputs();
  changed.sources.find(source => source.id === 'ibit-holdings').freshness = 'stale';
  const page = buildCoverage(changed).pages.find(page => page.deskId === 'bitcoin-etf-flows');
  assert.equal(page.status, 'not-monitored');
  assert.match(page.summary, /missing, never zero/);
  assert.equal(page.sourceChecks[0].sourceAsOf, '2026-10-02');
  assert.equal(Object.hasOwn(page.sourceChecks[0], 'value'), false);
});

test('manifest is repeatable and holds independent archived context after catalog edits', () => {
  const original = inputs();
  const result = buildCoverage(original);
  const bytes = JSON.stringify(result);
  assert.deepEqual(result, build());
  original.catalog.desks[0].intro[0] = 'A later revised explanation.';
  original.catalog.desks[0].sources[0].url = 'https://example.com/new';
  original.mapping.pages[0].title = 'Later cover description';
  assert.equal(JSON.stringify(result), bytes);
  assert.notEqual(buildCoverage(original).catalogSha256, result.catalogSha256);
  const roundTrip = JSON.parse(bytes);
  assert.equal(validateCoverage(roundTrip, { sources, generatedAt }), true);
});

test('missing, duplicated, misordered and wrong-kind reference pages withhold coverage', () => {
  for (const change of [
    item => { item.mapping.pages.pop(); },
    item => { item.mapping.pages[28].page = 28; },
    item => { [item.mapping.pages[0], item.mapping.pages[1]] = [item.mapping.pages[1], item.mapping.pages[0]]; },
    item => { item.mapping.pages[0].kind = 'sourcebook'; },
  ]) { const changed = inputs(); change(changed); assert.throws(() => buildCoverage(changed), /coverage/); }
});

test('unknown desks, collector identities, section citations and changed evidence fail closed', () => {
  for (const change of [
    item => { item.mapping.pages[2].deskId = 'invented'; },
    item => { item.catalog.desks[0].collectorSourceIds.push('invented'); },
    item => { item.catalog.desks[0].sections[0].sourceIds.push('invented'); },
    item => { item.catalog.desks[0].referencePages = [4]; },
    item => { item.catalog.desks.push(structuredClone(item.catalog.desks[0])); },
  ]) { const changed = inputs(); change(changed); assert.throws(() => buildCoverage(changed), /coverage/); }
  const manifest = build();
  manifest.pages.find(page => page.deskId === 'circle-arc').status = 'sampled-observations';
  assert.throws(() => validateCoverage(manifest, { sources, generatedAt }), /inconsistent_coverage_status/);
});

test('dangerous source URLs and navigation schemes are rejected', () => {
  for (const url of ['javascript:alert(1)', 'http://example.com', '//example.com', 'https://user:password@example.com', 'https://example.com/ bad', 'data:text/html,no']) {
    const changed = inputs(); changed.catalog.desks[0].sources[0].url = url;
    assert.throws(() => buildCoverage(changed), /invalid_coverage_reference/);
  }
  for (const href of ['//example.com', 'javascript:alert(1)', '/conversations/../admin', 'https://example.com']) {
    const changed = inputs(); changed.mapping.pages[2].href = href;
    assert.throws(() => buildCoverage(changed), /invalid_coverage_page/);
  }
});

test('future review/catalog/check times and false reference checkedAt are rejected', () => {
  for (const change of [
    item => { item.catalog.updatedAt = '2026-10-05T00:00:00Z'; },
    item => { item.catalog.desks[0].reviewedAt = '2026-10-05'; },
    item => { item.sources[0].checkedAt = '2026-10-05T00:00:00Z'; },
    item => { item.catalog.desks[0].sources[0].checkedAt = generatedAt; },
  ]) { const changed = inputs(); change(changed); assert.throws(() => buildCoverage(changed), /coverage/); }
});

test('actual collector normalization integrates with edition preparation and immutable coverage', async () => {
  const json = payload => new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } });
  const sourceSnapshot = await collectSnapshot(registry, { now: generatedAt, fetcher: async url => {
    if (url.includes('api.exchange.coinbase.com')) return json({ trade_id: 7654321, price: '67000.1200', bid: '67000.00', ask: '67001.00', size: '0.01', volume: '100.00', time: '2026-10-04T17:59:00Z' });
    if (url.includes('ishares.com')) return new Response('iShares Bitcoin Trust ETF\nFund Holdings as of,"Oct 2, 2026"\nShares Outstanding,"1,414,760,000.00"\nTicker,Name,Quantity,Market Currency\nBTC,BITCOIN,"803,343.05410",BTC\n', { headers: { 'content-type': 'text/csv' } });
    const repo = url.includes('/litecoin-project/') ? ['litecoin-project/litecoin', 'v0.21.5.8'] : url.includes('/lightningnetwork/') ? ['lightningnetwork/lnd', 'v0.21.4-beta'] : ['bitcoin/bitcoin', 'v31.1'];
    if (url.includes('api.github.com')) return json({ tag_name: repo[1], html_url: `https://github.com/${repo[0]}/releases/tag/${repo[1]}`, published_at: '2026-10-01T15:00:00Z', draft: false, prerelease: false });
    if (url.includes('strategy.com') || url.includes('sec.gov')) return new Response('Denied', { status: 403 });
    return new Response('<html>Reference</html>', { headers: { 'content-type': 'text/html' } });
  } });
  const edition = prepareEdition(sourceSnapshot, registry, policy, { now: generatedAt, coverage: { catalog, mapping } });
  assert.equal(edition.coverage.pages.length, 29);
  const core = edition.coverage.pages.find(page => page.deskId === 'bitcoin-core');
  assert.equal(core.status, 'dated-upstream-record');
  assert.equal(core.sourceChecks[0].freshness, 'dated-event');
  assert.equal(core.sourceChecks[0].sourceAsOf, '2026-10-01T15:00:00Z');
  assert.equal(edition.coverage.pages.find(page => page.deskId === 'market-opening').status, 'sampled-observations');
  assert.equal(validateCoverage(edition.coverage, { sources: edition.sources, generatedAt: edition.preparedAt }), true);
});

test('historical reference tables preserve their actual universes, dates and conflicts', async () => {
  const reference = JSON.parse(await readFile(new URL('../content/ltc-reference-tables.json', import.meta.url), 'utf8'));
  assert.equal(reference.referenceDate, '2026-10-02');
  assert.equal(reference.pdfSha256, '3dfdd0ddfbdc53ab48932f0cb7560679cb3498adb4c24b3e517b712d0c524afe');
  assert.equal(reference.tables.length, 13);
  for (const table of reference.tables) {
    assert.ok(catalog.desks.some(desk => desk.id === table.deskId));
    assert.match(table.classification, /Historical.*not revalidated/);
    assert.ok(table.asOf.length && table.notes.length);
    assert.ok(table.rows.every(row => row.length === table.columns.length && row.every(cell => typeof cell === 'string' && cell.length)));
  }
  for (const [page, count] of [[3,5],[6,21],[8,21],[11,20],[12,11],[19,10],[20,2]]) assert.equal(reference.tables.find(table=>table.page===page).rows.length,count);
  assert.match(reference.tables.find(table=>table.page===8).notes.join(' '), /headline inconsistency/);
  assert.match(reference.tables.find(table=>table.page===19).notes.join(' '), /liquidity/i);
  for (const row of reference.tables.find(table=>table.page===20).rows) { assert.match(row[1], /^0x[a-fA-F0-9]{64}$/); assert.match(row[2], /^0x[a-fA-F0-9]{40}$/); }
});
