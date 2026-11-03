import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { collectSnapshot } from './collect-ltc.mjs';
import { editionDate, prepareEdition, publishEdition, readEditionArchive } from './prepare-ltc-edition.mjs';

const now = '2026-10-03T00:12:42.491Z';
const later = '2026-10-03T00:22:42.491Z';
const registry = JSON.parse(await readFile(new URL('../config/ltc-sources.json', import.meta.url), 'utf8'));
const policy = JSON.parse(await readFile(new URL('../config/ltc-publication.json', import.meta.url), 'utf8'));
const csv = 'iShares Bitcoin Trust ETF\nFund Holdings as of,"Oct 1, 2026"\nShares Outstanding,"1,414,760,000.00"\nTicker,Name,Quantity,Market Currency\nBTC,BITCOIN,"803,343.05410",BTC\n';
const release = { tag_name: 'v31.1', html_url: 'https://github.com/bitcoin/bitcoin/releases/tag/v31.1', published_at: '2026-07-08T09:14:15Z', draft: false, prerelease: false };
const snapshot = await collectSnapshot(registry, { now, fetcher: async url => {
  if (url.includes('api.exchange.coinbase.com')) {
    const price = url.includes('BTC-USD') ? '65000.1200' : '89.1200';
    return new Response(JSON.stringify({ trade_id: 123456, price, bid: price, ask: price, size: '0.01', volume: '100.00', time: '2026-10-03T00:10:00Z' }), { headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('ishares.com')) return new Response(csv, { headers: { 'content-type': 'text/csv' } });
  if (url.includes('/litecoin-project/')) return new Response(JSON.stringify({ ...release, tag_name: 'v0.21.5.8', html_url: 'https://github.com/litecoin-project/litecoin/releases/tag/v0.21.5.8', published_at: '2026-08-27T21:59:49Z' }), { headers: { 'content-type': 'application/json' } });
  if (url.includes('/lightningnetwork/')) return new Response(JSON.stringify({ ...release, tag_name: 'v0.21.4-beta', html_url: 'https://github.com/lightningnetwork/lnd/releases/tag/v0.21.4-beta', published_at: '2026-10-01T15:00:00Z' }), { headers: { 'content-type': 'application/json' } });
  if (url.includes('api.github.com')) return new Response(JSON.stringify(release), { headers: { 'content-type': 'application/json' } });
  if (url.includes('strategy.com') || url.includes('sec.gov')) return new Response('Denied', { status: 403 });
  return new Response('<html>Reference</html>', { headers: { 'content-type': 'text/html' } });
} });
const clone = value => structuredClone(value);
const prepare = (value = snapshot, opts = {}) => prepareEdition(value, registry, policy, { now: later, ...opts });
const alter = fn => { const changed = clone(snapshot); fn(changed); return changed; };

test('local issue date observes New York midnight and daylight saving', () => {
  assert.equal(editionDate(now), '2026-10-02');
  assert.equal(editionDate('2026-11-03T04:59:59Z'), '2026-11-02');
  assert.equal(editionDate('2026-11-03T05:00:00Z'), '2026-11-03');
});
test('prepared briefing preserves exact values, source dates and missing desks', () => {
  const edition = prepare();
  assert.equal(edition.id, '2026-10-02-r1');
  assert.equal(edition.humanReview, 'Not individually reviewed by a human editor');
  assert.equal(edition.sources[0].observations[0].value, '803343.05410');
  assert.equal(edition.sources[0].sourceAsOf, '2026-10-01');
  assert.equal(edition.sources[0].checkedAt, now);
  assert.equal(edition.sourceSnapshotSha256.length, 64);
  assert.equal(edition.briefs.length, 6);
  assert.match(edition.briefs.find(item => item.id === 'ibit-holdings').paragraphs.join(' '), /not ETF flows/);
  assert.match(edition.briefs.find(item => item.id === 'bitcoin-core-release').paragraphs.join(' '), /not present the release as today/);
  assert.equal(edition.title, edition.presentation.cover.title);
  assert.ok(edition.coverageGaps.some(text => text.includes('HTTP 403')));
  assert.ok(edition.coverageGaps.some(text => text.includes('reference page retrieved only')));
  assert.deepEqual(prepare(), edition);
});
test('paused policy and expanded policy limits fail closed', () => {
  assert.throws(() => prepareEdition(snapshot, registry, { ...policy, paused: true }, { now: later }), /publication_paused/);
  assert.throws(() => prepareEdition(snapshot, registry, { ...policy, maximumObservationAgeDays: 365 }, { now: later }), /invalid_publication_limits/);
});
test('all stale, future and stale retrieval timestamps cannot create an edition', () => {
  assert.throws(() => prepare(snapshot, { now: '2026-10-04T00:12:43Z' }), /snapshot_too_old/);
  assert.throws(() => prepare(snapshot, { now: '2026-10-02T00:12:42Z' }), /future_or_invalid_snapshot/);
  assert.throws(() => prepare(alter(s => {
    s.sources[0].sourceAsOf = '2026-09-20'; s.sources[0].freshness = 'stale';
    s.sources[0].observations.forEach(item => { item.effectiveAt = '2026-09-20'; });
    s.sources[3].sourceAsOf = '2026-09-20T15:00:00Z';
    s.sources[3].observations[0].effectiveAt = '2026-09-20T15:00:00Z';
    s.sources.filter(source => source.id.startsWith('coinbase-')).forEach(source => { source.sourceAsOf = '2026-10-02T20:00:00.000Z'; source.observations[0].effectiveAt = source.sourceAsOf; source.freshness = 'stale'; });
  })), /no_fresh_primary_observation/);
  assert.throws(() => prepare(alter(s => { s.sources[0].sourceAsOf = '2026-10-04'; })), /invalid_effective_date/);
  assert.throws(() => prepare(alter(s => { s.sources[1].sourceAsOf = '2026-02-30T09:14:15Z'; })), /invalid_effective_date/);
});
test('source identity, precision, duplicate source, fake reference metric and hash must agree', () => {
  assert.throws(() => prepare(alter(s => { s.sources[0].url = 'https://example.com/'; })), /changed_source_identity/);
  assert.throws(() => prepare(alter(s => { s.sources[0].kind = 'secondary'; })), /changed_source_identity/);
  assert.throws(() => prepare(alter(s => { s.sources[0].observations[0].unit = 'USD'; })), /invalid_ibit_units/);
  assert.throws(() => prepare(alter(s => { s.sources[0].observations[0].value = '1e6'; })), /invalid_decimal/);
  assert.throws(() => prepare(alter(s => { s.sources[0].observations[0].value = '21000001'; })), /impossible_quantity/);
  assert.throws(() => prepare(alter(s => { s.sources[1] = clone(s.sources[0]); })), /duplicate_snapshot_source/);
  assert.throws(() => prepare(alter(s => { s.sources.find(item => item.id === 'coinshares-bitc').status = 'collected'; })), /reference_cannot_be_metric/);
  assert.throws(() => prepare(alter(s => { s.sources[0].sourceSha256 = 'unverified'; })), /invalid_success_record/);
  assert.throws(() => prepare(alter(s => { s.failureCount = 0; })), /inconsistent_failure_count/);
});
test('zero is a sourced value and missing is never converted to zero', () => {
  const zero = prepare(alter(s => { s.sources[0].observations[0].value = '0.00000'; }));
  assert.match(zero.briefs.find(item => item.id === 'ibit-holdings').paragraphs[0], /0\.00000 BTC/);
  assert.throws(() => prepare(alter(s => { s.sources[0].observations[0].value = null; })), /invalid_decimal/);
});
test('last-trade samples retain exact venue prices and age at the two-hour boundary', () => {
  const edition = prepare();
  const price = edition.briefs.find(item => item.id === 'coinbase-btc-usd');
  assert.match(price.headline, /\$65,000\.1200/);
  assert.match(price.paragraphs.join(' '), /one exchange’s sampled last trade/);
  assert.equal(edition.sources.find(item => item.id === price.id).observations[0].classification, 'venue-reported');
  const exactBoundary = prepare(snapshot, { now: '2026-10-03T02:10:00.000Z' });
  assert.ok(exactBoundary.briefs.some(item => item.id === price.id));
  const expired = prepare(snapshot, { now: '2026-10-03T02:10:00.001Z' });
  assert.ok(!expired.briefs.some(item => item.id.startsWith('coinbase-')));
  assert.equal(expired.sources.find(item => item.id === price.id).freshness, 'stale');
  assert.ok(expired.coverageGaps.some(gap => gap.includes('more than two hours old')));
  assert.ok(!expired.presentation.cover.subtitle.includes('$65,000'));
  assert.throws(() => prepare(alter(s => { s.sources.find(item => item.id === price.id).observations[0].metric = 'ltc_usd_last_trade'; })), /invalid_ticker_units/);
  assert.throws(() => prepare(alter(s => { s.sources.find(item => item.id === price.id).observations[0].value = '0'; })), /invalid_ticker_value/);
});
test('a fresh last trade can satisfy the primary gate across UTC midnight; stale quotes cannot', () => {
  const onlyQuotesFresh = alter(s => {
    s.sources[0].sourceAsOf = '2026-09-20'; s.sources[0].freshness = 'stale';
    s.sources[0].observations.forEach(item => { item.effectiveAt = '2026-09-20'; });
    s.sources[3].sourceAsOf = '2026-09-20T15:00:00Z'; s.sources[3].observations[0].effectiveAt = s.sources[3].sourceAsOf;
    s.sources.filter(source => source.id.startsWith('coinbase-')).forEach(source => { source.sourceAsOf = '2026-10-02T23:55:00.000Z'; source.observations[0].effectiveAt = source.sourceAsOf; });
  });
  assert.ok(prepare(onlyQuotesFresh).briefs.some(item => item.id === 'coinbase-btc-usd'));
  assert.throws(() => prepare(onlyQuotesFresh, { now: '2026-10-03T02:00:00.000Z' }), /no_fresh_primary_observation/);
  const unavailable = alter(s => {
    const source = s.sources.find(item => item.id === 'coinbase-ltc-usd');
    Object.assign(source, { status: 'unavailable', httpStatus: 503, observations: null, sourceAsOf: null, sourceSha256: null, errorCode: 'http_failure', freshness: 'unknown' }); s.failureCount++;
  });
  const prepared = prepare(unavailable);
  assert.ok(!prepared.briefs.some(item => item.id === 'coinbase-ltc-usd'));
  assert.equal(prepared.sources.find(item => item.id === 'coinbase-ltc-usd').freshness, 'unknown');
});
test('all failed checks or reference-only availability cannot satisfy primary observation gate', () => {
  const failed = alter(s => {
    s.failureCount = registry.sources.length;
    s.sources.forEach(source => Object.assign(source, { status: 'unavailable', httpStatus: 403, observations: null, sourceAsOf: null, sourceSha256: null, errorCode: 'http_failure', freshness: 'unknown' }));
  });
  assert.throws(() => prepare(failed), /no_fresh_primary_observation/);
});
test('financial observation ages at publication, even within the snapshot retrieval window', () => {
  const updated = alter(s => {
    s.generatedAt = '2026-10-02T14:05:00Z';
    s.sources.forEach(source => { source.checkedAt = s.generatedAt; });
    s.sources[0].sourceAsOf = '2026-09-28';
    s.sources[0].observations.forEach(item => { item.effectiveAt = '2026-09-28'; });
    s.sources[3].sourceAsOf = '2026-10-02T14:00:00Z';
    s.sources[3].observations[0].effectiveAt = '2026-10-02T14:00:00Z';
    s.sources.filter(source => source.id.startsWith('coinbase-')).forEach(source => { source.sourceAsOf = '2026-10-02T14:00:00.000Z'; source.observations[0].effectiveAt = source.sourceAsOf; });
  });
  const edition = prepare(updated, { now: '2026-10-03T14:00:00Z' });
  assert.equal(edition.sources[0].freshness, 'stale');
  assert.ok(!edition.briefs.some(brief => brief.id === 'ibit-holdings'));
  assert.ok(edition.coverageGaps.some(gap => gap.includes('four-calendar-day')));
});
test('next-day correction preserves target issue date and records current publication time', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ltc-correction-'));
  try {
    const first = prepare();
    await publishEdition(first, { directory, policy });
    const corrected = prepare(snapshot, { now: '2026-10-03T14:00:00Z', revision: 2, issueDate: '2026-10-02', correctionReason: 'Clarify the exact source date in the release record.', correctsEditionId: first.id });
    assert.equal(corrected.id, '2026-10-02-r2');
    assert.equal(corrected.date, first.date);
    assert.equal(corrected.publishedAt, '2026-10-03T14:00:00Z');
    assert.equal((await publishEdition(corrected, { directory, policy })).status, 'published-locally');
    assert.equal((await publishEdition(first, { directory, policy })).id, corrected.id);
    assert.equal((await readEditionArchive(directory)).length, 2);
    assert.throws(() => prepare(snapshot, { issueDate: '2026-10-01' }), /invalid_correction_date/);
    assert.throws(() => prepare(snapshot, { revision: 2, issueDate: '2026-10-03' }), /invalid_correction_date/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('immutable daily archive is idempotent, corrections preserve history, lock prevents races', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ltc-edition-'));
  try {
    const first = prepare();
    assert.equal((await publishEdition(first, { directory, policy })).status, 'published-locally');
    const original = await readFile(path.join(directory, `${first.id}.json`), 'utf8');
    const changed = prepare(alter(s => { s.sources[0].observations[0].value = '800000.00'; }));
    assert.equal((await publishEdition(changed, { directory, policy })).status, 'unchanged');
    assert.equal(await readFile(path.join(directory, `${first.id}.json`), 'utf8'), original);
    assert.throws(() => prepare(snapshot, { revision: 2 }), /correction_requires_reason/);
    const corrected = prepare(snapshot, { revision: 2, correctionReason: 'Correct an explicitly reviewed source record.', correctsEditionId: first.id });
    assert.equal((await publishEdition(corrected, { directory, policy })).status, 'published-locally');
    assert.equal((await readEditionArchive(directory)).length, 2);
    assert.equal(JSON.parse(await readFile(path.join(directory, 'index.json'), 'utf8'))[0].id, corrected.id);
    assert.equal(await readFile(path.join(directory, `${first.id}.json`), 'utf8'), original);
    await writeFile(path.join(directory, '.publish-lock'), 'busy');
    await assert.rejects(() => publishEdition(first, { directory, policy }), /publication_already_running/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('new publication requires complete design while legacy archived records remain byte-identical', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ltc-legacy-'));
  try {
    const prepared = prepare();
    const missingDesign = { ...prepared }; delete missingDesign.presentation;
    await assert.rejects(() => publishEdition(missingDesign, { directory, policy }), /invalid_presentation/);
    const legacyBytes = `${JSON.stringify(missingDesign, null, 2)}\n`;
    await writeFile(path.join(directory, `${missingDesign.id}.json`), legacyBytes);
    const records = await readEditionArchive(directory);
    assert.equal(records[0].presentation, undefined);
    assert.equal((await publishEdition(prepared, { directory, policy })).status, 'unchanged');
    assert.equal(await readFile(path.join(directory, `${missingDesign.id}.json`), 'utf8'), legacyBytes);
    const correction = prepare(snapshot, { revision: 2, correctionReason: 'Add the explicitly requested dated cover and sampled prices.', correctsEditionId: prepared.id });
    await publishEdition(correction, { directory, policy });
    assert.ok((await readEditionArchive(directory))[0].presentation);
    assert.equal(await readFile(path.join(directory, `${missingDesign.id}.json`), 'utf8'), legacyBytes);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
