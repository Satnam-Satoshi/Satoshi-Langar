import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, stat, symlink, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { build } from 'esbuild';

async function loadModule(entryPoint) {
  const result = await build({ entryPoints: [entryPoint], bundle: true, platform: 'node', format: 'esm', target: 'node22', write: false, logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const { buildDailyFeed, savedCoverEnclosure, escapeFeedXml } = await loadModule('app/data/daily-feed.ts');
const route = await loadModule('app/conversations/daily.xml/route.ts');
const editions = JSON.parse(await readFile('content/ltc/index.json', 'utf8'));
const itemIds = xml => [...xml.matchAll(/<guid isPermaLink="false">([^<]+)<\/guid>/g)].map(match => match[1]);
const record = (date, revision, publishedAt) => ({ ...structuredClone(editions[0]), id: `${date}-r${revision}`, date, revision, publishedAt, presentation: undefined, corrections: [] });

test('static daily route contains exactly archived daily publication events with stable existing IDs', async () => {
  assert.equal(route.dynamic, 'force-static');
  const response = await route.GET();
  assert.equal(response.headers.get('content-type'), 'application/rss+xml; charset=utf-8');
  const xml = await response.text();
  assert.equal(xml, await (await route.GET()).text(), 'Repeated builds must not introduce wall-clock changes');
  const expected = [...editions].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || b.date.localeCompare(a.date) || b.revision - a.revision).map(edition => `ltc:edition:${edition.id}`);
  assert.deepEqual(itemIds(xml), expected);
  assert.equal((xml.match(/<item>/g) || []).length, expected.length);
  assert.ok(xml.includes('href="https://ltcmagazine.org/conversations/daily.xml"'));
  assert.ok(!xml.includes('ltc:feature:'));
  assert.ok(!xml.includes('[Editorial preview]'));
  for (const edition of editions) assert.ok(xml.includes(`https://ltcmagazine.org/conversations/editions/${edition.id}/`));
});

test('a correction to an older date is a separate newest publication event without changing its predecessor', async () => {
  const records = [record('2026-10-05', 1, '2026-10-05T10:00:00Z'), record('2026-10-04', 1, '2026-10-04T10:00:00Z'), record('2026-10-04', 2, '2026-10-05T12:00:00Z')];
  records[2].corrections = [{ reason: 'Correct a source label', correctsEditionId: '2026-10-04-r1' }];
  const original = structuredClone(records);
  const xml = await buildDailyFeed(records);
  assert.deepEqual(itemIds(xml), ['ltc:edition:2026-10-04-r2', 'ltc:edition:2026-10-05-r1', 'ltc:edition:2026-10-04-r1']);
  assert.match(xml, /<lastBuildDate>Mon, 05 Oct 2026 12:00:00 GMT<\/lastBuildDate>/);
  assert.ok(xml.includes('[Correction] 2026-10-04'));
  assert.ok(xml.includes('Correction to 2026-10-04-r1: Correct a source label'));
  assert.deepEqual(records, original);
});

test('descriptions retain source dates, gaps, AI attribution and review labels while escaping XML', async () => {
  const edition = record('2026-10-05', 1, '2026-10-05T10:00:00Z');
  edition.title = 'A & B <news> "quoted"';
  edition.dek = "O'Hara > note\u0001 🪷";
  edition.coverageGaps = ['Source <missing> & unavailable'];
  edition.sources = [{ ...edition.sources[0], title: 'Primary & official', sourceAsOf: null }];
  const xml = await buildDailyFeed([edition]);
  assert.ok(xml.includes('A &amp; B &lt;news&gt; &quot;quoted&quot;'));
  assert.ok(xml.includes('O&apos;Hara &gt; note 🪷'));
  assert.ok(xml.includes('Coverage gaps: Source &lt;missing&gt; &amp; unavailable'));
  assert.ok(xml.includes(`AI attribution: ${edition.byline}`));
  assert.ok(xml.includes(`Human review: ${edition.humanReview}`));
  assert.ok(xml.includes(`Edition date: ${edition.date} (${edition.timezone})`));
  assert.ok(xml.includes(`checked ${edition.sources[0].checkedAt}; source as of not supplied`));
  assert.ok(xml.includes('Cover enclosure: no saved image attached'));
  assert.ok(!xml.includes('<enclosure'));
  assert.ok(!xml.includes('\u0001'));
  assert.equal(escapeFeedXml('\ud800\ufffe\uffff'), '');
});

test('enclosure refers to the exact saved cover with its actual file bytes and MIME type', async () => {
  const edition = editions.find(item => item.presentation?.artDirection?.coverAsset);
  assert.ok(edition, 'The archive has a saved flagship cover');
  const cover = await savedCoverEnclosure(edition, path.resolve('public'));
  const asset = edition.presentation.artDirection.coverAsset;
  assert.equal(cover.url, `https://ltcmagazine.org/magazine/${asset}`);
  assert.equal(cover.length, (await stat(path.join('public/magazine', asset))).size);
  assert.equal(cover.type, 'image/jpeg');
  const xml = await buildDailyFeed([edition]);
  assert.ok(xml.includes(`<enclosure url="${cover.url}" length="${cover.length}" type="${cover.type}"/>`));
});

test('invalid or missing declared covers fail closed, including MIME mismatches and symlink escapes', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ltc-daily-feed-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const magazine = path.join(directory, 'public/magazine');
  await mkdir(magazine, { recursive: true });
  await writeFile(path.join(magazine, 'wrong.jpg'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]));
  await writeFile(path.join(directory, 'outside.jpg'), Buffer.from([255, 216, 255, 1, 2, 3]));
  await symlink(path.join(directory, 'outside.jpg'), path.join(magazine, 'linked.jpg'));
  for (const coverAsset of ['../outside.jpg', 'https://example.org/cover.jpg', 'missing.jpg', 'wrong.jpg', 'linked.jpg']) {
    const edition = { ...record('2026-10-05', 1, '2026-10-05T10:00:00Z'), presentation: { artDirection: { coverAsset } } };
    await assert.rejects(buildDailyFeed([edition], path.join(directory, 'public')), undefined, coverAsset);
  }
});

test('empty archives create no invented events or build timestamp and invalid publications fail', async () => {
  const xml = await buildDailyFeed([]);
  assert.deepEqual(itemIds(xml), []);
  assert.ok(!xml.includes('<lastBuildDate>'));
  await assert.rejects(buildDailyFeed([{ ...record('2026-10-05', 1, 'bad'), status: 'published' }]), /timestamp/);
  await assert.rejects(buildDailyFeed([{ ...record('2026-10-05', 1, '2026-10-05T10:00:00Z'), status: 'draft' }]), /edition/);
});
