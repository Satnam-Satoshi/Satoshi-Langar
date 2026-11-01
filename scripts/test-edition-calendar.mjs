import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicationDays, publicationMonths, calendarWeeks, publicationUpdates } from '../app/data/edition-calendar.ts';

const record = (date, revision = 1) => ({ date, revision, id: `${date}-r${revision}` });

test('older corrections stay under their date and cannot replace the newest issue', () => {
  const records = [record('2026-10-02', 2), record('2026-10-03'), record('2026-10-02', 10), record('2026-10-02')];
  const original = structuredClone(records);
  const days = publicationDays(records);
  assert.deepEqual(days.map(day => day.date), ['2026-10-03', '2026-10-02']);
  assert.equal(days[0].latest.id, '2026-10-03-r1');
  assert.deepEqual(days[1].revisions.map(item => item.revision), [10, 2, 1]);
  assert.deepEqual(records, original);
});

test('month and year boundaries preserve one date entry with every revision', () => {
  const months = publicationMonths(publicationDays([record('2026-12-31'), record('2027-01-01'), record('2026-12-31', 2), record('2026-01-01')]));
  assert.deepEqual(months.map(item => item.month), ['2027-01', '2026-12', '2026-01']);
  assert.equal(months[1].days.length, 1);
  assert.equal(months[1].days[0].revisions.length, 2);
});

test('calendar weekday alignment and leap years remain stable across time zones', () => {
  assert.deepEqual(calendarWeeks('2026-10')[0], [null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
  assert.equal(calendarWeeks('2028-02').flat().filter(Boolean).length, 29);
  assert.equal(calendarWeeks('2027-02').flat().filter(Boolean).length, 28);
  assert.equal(calendarWeeks('2026-02')[0][0], '2026-02-01');
  assert.equal(calendarWeeks('2026-10').flat().filter(Boolean).at(-1), '2026-10-31');
  assert.throws(() => calendarWeeks('2026-13'), /YYYY-MM/);
});

test('empty archives produce no fabricated days or months', () => {
  assert.deepEqual(publicationDays([]), []);
  assert.deepEqual(publicationMonths([]), []);
});

test('RSS publication clock advances for a correction to an older date', () => {
  const updates = publicationUpdates([
    { ...record('2026-10-03'), publishedAt: '2026-10-03T14:00:00Z' },
    { ...record('2026-10-02', 2), publishedAt: '2026-10-03T16:00:00Z' },
  ]);
  assert.equal(updates[0].id, '2026-10-02-r2');
  assert.equal(publicationDays(updates)[0].latest.id, '2026-10-03-r1');
});
