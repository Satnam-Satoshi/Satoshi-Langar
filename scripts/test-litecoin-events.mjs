import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eventStatus, eventDateLabel, groupEvents, validateEvents } from './lib/litecoin-events.mjs';

const directory = JSON.parse(readFileSync(new URL('../content/litecoin-events.json', import.meta.url)));
test('verified snapshot has exactly the two independently checked upcoming events', () => {
  validateEvents(directory);
  assert.equal(directory.checkedOn, '2026-11-18');
  const groups = groupEvents(directory.events, directory.checkedOn);
  assert.deepEqual(groups.upcoming.map(event => event.id), ['nym-community-call-2631', 'cryptocon-sydney-2026']);
  assert.deepEqual(groups.past, []);
  assert.equal(groups.upcoming[0].startTime, '14:00');
  assert.equal(groups.upcoming[0].endDate, null);
  assert.equal(groups.upcoming[1].startDate, '2026-11-28');
  assert.equal(groups.upcoming[1].endDate, '2026-11-29');
  assert.equal(groups.upcoming[1].startTime, null);
  assert.equal(groups.upcoming[1].timeZone, 'Australia/Sydney');
});
test('calendar boundaries move past gatherings out of upcoming without inventing live or end times', () => {
  const [call, sydney] = directory.events;
  assert.equal(eventStatus(call, '2026-11-19'), 'Scheduled today');
  assert.equal(eventStatus(call, '2026-11-20'), 'Past');
  assert.equal(eventStatus(sydney, '2026-11-28'), 'Scheduled today');
  assert.equal(eventStatus(sydney, '2026-11-29'), 'Scheduled today');
  assert.equal(eventStatus(sydney, '2026-11-30'), 'Past');
  assert.equal(groupEvents(directory.events, '2026-11-20').upcoming.length, 1);
  assert.equal(groupEvents(directory.events, '2026-11-30').upcoming.length, 0);
  assert.equal(groupEvents(directory.events, '2026-11-30').past.length, 2);
  assert.deepEqual(groupEvents([], directory.checkedOn), { upcoming: [], past: [] });
});
test('date ranges and timezone conversion preserve the published calendar information', () => {
  assert.equal(eventDateLabel(directory.events[0]), '19 November 2026');
  assert.equal(eventDateLabel(directory.events[1]), '28–29 November 2026');
  assert.equal(eventDateLabel({startDate:'2026-11-30',endDate:'2026-12-01'}), '30 November 2026 – 1 December 2026');
  const ny = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/New_York', hour:'2-digit', minute:'2-digit', timeZoneName:'short' }).format(new Date('2026-11-19T14:00:00Z'));
  assert.match(ny, /^09:00 (?:GMT-5|EST)$/);
  const syd = new Intl.DateTimeFormat('en-GB', { timeZone:'Australia/Sydney', hour:'2-digit', minute:'2-digit', timeZoneName:'longOffset' }).format(new Date('2026-11-28T00:00:00Z'));
  assert.match(syd, /^11:00 GMT\+11:00$/);
});
test('updates fail closed for malformed dates, zones, sources and duplicate ids', () => {
  for (const mutate of [d=>d.events[0].startDate='2026-02-30',d=>d.events[0].endDate='2026-11-18',d=>d.events[0].timeZone='Fake/Zone',d=>d.events[0].organizerUrl='https://example.invalid/',d=>d.events[0].sources[0].url='javascript:alert(1)',d=>d.events.push(d.events[0])]) {
    const copy = structuredClone(directory); mutate(copy); assert.throws(()=>validateEvents(copy));
  }
  validateEvents({...directory, events: []});
});
