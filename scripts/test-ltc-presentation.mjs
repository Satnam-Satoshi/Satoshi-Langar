import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACK_PAGE_EXERCISES, COVER_MOTIFS, buildPresentation, validatePresentation } from './lib/ltc-presentation.mjs';

const briefs = [
  { id: 'test-price', headline: 'A venue-reported price, with its timestamp', sourceIds: ['test-venue'] },
  { id: 'test-holdings', headline: 'The issuer’s dated holdings record', sourceIds: ['test-issuer'] },
  { id: 'test-release', headline: 'The upstream release record', sourceIds: ['test-repository'] },
];
const build = date => buildPresentation({ date, briefs });

test('same issue date produces reproducible covers, back pages and reading order without mutating briefs', () => {
  const before = structuredClone(briefs);
  assert.deepEqual(build('2026-10-02'), build('2026-10-02'));
  assert.deepEqual(briefs, before);
  assert.match(build('2026-10-02').cover.subtitle, /A venue-reported price, with its timestamp/);
  assert.equal(validatePresentation(build('2026-10-02'), { date: '2026-10-02', briefs }), true);
});
test('successive dates rotate seven compositions, preserve unique seeds and offer 21 original exercises', () => {
  const dates = Array.from({ length: 31 }, (_, index) => `2026-10-${String(index + 1).padStart(2, '0')}`);
  const presentations = dates.map(build);
  assert.equal(new Set(presentations.map(item => item.cover.seed)).size, 31);
  assert.deepEqual(new Set(presentations.slice(0, 7).map(item => item.cover.motif)), new Set(COVER_MOTIFS));
  assert.equal(new Set(presentations.slice(0, 21).map(item => item.backPage.practice)).size, 21);
  assert.equal(BACK_PAGE_EXERCISES.length, 21);
  for (let index = 1; index < presentations.length; index++) {
    assert.notEqual(presentations[index].cover.motif, presentations[index - 1].cover.motif);
    assert.notEqual(presentations[index].cover.title, presentations[index - 1].cover.title);
    assert.notEqual(presentations[index].backPage.prompt, presentations[index - 1].backPage.prompt);
  }
  for (const presentation of presentations) assert.deepEqual([...presentation.readingOrder].sort(), briefs.map(item => item.id).sort());
});
test('daily variation uses actual calendar days through month, leap-day and year boundaries', () => {
  for (const [before, after] of [['2026-12-31', '2027-01-01'], ['2028-02-28', '2028-02-29'], ['2028-02-29', '2028-03-01']]) {
    assert.notEqual(build(before).cover.motif, build(after).cover.motif);
    assert.notEqual(build(before).cover.seed, build(after).cover.seed);
  }
  assert.throws(() => build('2026-02-29'), /invalid_presentation_date/);
});
test('missing back page, wrong-date seed, unknown treatment and omitted or duplicated briefs fail closed', () => {
  const base = build('2026-10-02');
  const validate = value => validatePresentation(value, { date: '2026-10-02', briefs });
  for (const key of ['title', 'prompt', 'practice', 'closingLine']) {
    const broken = structuredClone(base); broken.backPage[key] = '';
    assert.throws(() => validate(broken), /incomplete_back_page/);
  }
  const wrongDate = structuredClone(base); wrongDate.cover.seed = build('2026-10-03').cover.seed;
  assert.throws(() => validate(wrongDate), /presentation_date_seed_mismatch/);
  const unknown = structuredClone(base); unknown.cover.motif = 'remote-illustration';
  assert.throws(() => validate(unknown), /unknown_presentation_treatment/);
  assert.throws(() => validate({ ...base, readingOrder: ['test-price', 'test-price', 'test-release'] }), /invalid_presentation_reading_order/);
  assert.throws(() => validate({ ...base, readingOrder: ['test-price'] }), /invalid_presentation_reading_order/);
  assert.throws(() => buildPresentation({ date: '2026-10-02', briefs: [] }), /presentation_requires_unique_briefs/);
});
