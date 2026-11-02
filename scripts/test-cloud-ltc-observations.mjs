import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkObservations } from './check-ltc-observations.mjs';
import { SOURCES, validateBuilderNews } from './collect-ltc-builder-news.mjs';
const json = async file => JSON.parse(await readFile(new URL('../' + file, import.meta.url), 'utf8'));
const notebook = await json('content/ltc-newsroom/latest.json');
const input = { snapshot: notebook.baseSnapshot, intelligence: notebook.intelligence, policyRecords: notebook.policyRecords, registry: await json('config/ltc-sources.json'), policy: await json('config/ltc-publication.json'), now: notebook.preparedAt, builders: { schemaVersion: 1, classification: 'Bounded primary-publisher watch', checkedAt: notebook.preparedAt, sources: SOURCES.map(source => ({ ...source, checkedAt: notebook.preparedAt, status: 'unavailable', stories: [], gaps: ['Source unavailable.'] })) } };
test('pre-write observation gate validates the full real notebook while preserving explicit builder gaps', () => {
  const before = JSON.stringify(input); assert.deepEqual(checkObservations(input), { valid: true, date: notebook.date }); assert.equal(JSON.stringify(input), before);
});
test('stale, future or forged observations withhold before any features/edition output', () => {
  assert.throws(() => checkObservations({ ...input, now: new Date(Date.parse(input.now) + 24 * 60 * 60 * 1000 + 1).toISOString() }));
  const future = structuredClone(input); future.builders.checkedAt = '2099-01-01T00:00:00Z'; assert.throws(() => checkObservations(future));
  const bad = structuredClone(input); bad.builders.sources[0].index = 'https://unapproved.example/'; assert.throws(() => checkObservations(bad));
});

test('controlled next-day and later clocks cannot make a future builder check valid', () => {
  for (const delta of [24 * 60 * 60 * 1000, 3650 * 24 * 60 * 60 * 1000]) {
    const shifted = structuredClone(input);
    shifted.now = new Date(Date.parse(input.now) + delta).toISOString();
    shifted.builders.checkedAt = new Date(Date.parse(shifted.now) + 1).toISOString();
    for (const source of shifted.builders.sources) source.checkedAt = shifted.builders.checkedAt;
    const before = JSON.stringify(shifted);
    assert.throws(() => validateBuilderNews(shifted.builders, { now: shifted.now }));
    assert.throws(() => checkObservations(shifted));
    assert.equal(JSON.stringify(shifted), before);
  }
});
