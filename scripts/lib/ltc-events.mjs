import { createHash } from 'node:crypto';

// Curated editions, not an open web crawler. New events or changed claims need review.
export const EVENT_SOURCES = Object.freeze([
  { id: 'planb-lugano-2026', name: 'Plan ₿ Forum', url: 'https://planb.lugano.ch/planb-forum/', start: '2026-10-23', end: '2026-10-24', timeZone: 'Europe/Zurich', region: 'Europe', location: 'Lugano, Switzerland', venue: 'Convention Centre / Palazzo dei Congressi, Villa Ciani and Ex-Asilo Ciani', parser: 'planb-heading-v1' },
  { id: 'bitcoin-amsterdam-2026', name: 'Bitcoin Amsterdam', url: 'https://www.bitcoin.amsterdam/', start: '2026-11-05', end: '2026-11-06', timeZone: 'Europe/Amsterdam', region: 'Europe', location: 'Halfweg, Netherlands · Amsterdam area', venue: 'SugarFactory, Kristalpromenade 7, 1165 PD Halfweg', parser: 'organizer-event-v1', schemaName: 'Bitcoin Amsterdam', organizer: 'BTC Inc.', organizerURL: 'https://www.bitcoin.amsterdam', venues: ['SugarFactory'], locality: 'Halfweg', country: 'NL' },
  { id: 'bitcoin-korea-2026', name: 'Bitcoin Korea Conference', url: 'https://www.bitcoinkoreaconference.com/en', start: '2026-11-07', end: '2026-11-08', timeZone: 'Asia/Seoul', region: 'Asia', location: 'Seoul, South Korea', venue: 'COEX, Korea Federation of Banks and Community House Masil · consult the organizer for each day’s venue', parser: 'organizer-event-v1', schemaName: 'Bitcoin Korea Conference - COEX', organizer: 'Bitcoin Korea Conference', organizerURL: 'https://www.bitcoinkoreaconference.com', venues: ['COEX', 'Korea Federation of Banks', 'Community House Masil'], locality: 'Seoul', country: 'KR' },
].map(Object.freeze));
const DAY = 86_400_000;
export function localDate(value, timeZone = 'America/New_York') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
export function eventPhase(event, now) {
  const date = localDate(now, event.timeZone);
  return date > event.end ? 'past' : date >= event.start ? 'ongoing' : 'upcoming';
}
function claims(source) {
  return Object.fromEntries(['id','name','url','start','end','timeZone','region','location','venue'].map(key => [key, source[key]]));
}
function requireThat(ok, message = 'organizer_contract_changed') { if (!ok) throw Error(message); }
function plain(value) { return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim(); }
export function confirmEvent(source, html) {
  requireThat(EVENT_SOURCES.some(item => item === source), 'unreviewed_event');
  requireThat(typeof html === 'string' && Buffer.byteLength(html) <= 2_000_000, 'source_too_large');
  requireThat(!/cf-chl-|challenge-platform|<title[^>]*>\s*(?:Access Denied|Just a moment)/i.test(html), 'source_challenge');
  if (source.parser === 'planb-heading-v1') {
    const headings = [...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)].map(match => plain(match[1]));
    requireThat(headings.includes('PLAN ₿ FORUM, 23-24 OCTOBER 2026, LUGANO'));
    const visible = plain(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ''));
    requireThat(['Convention Centre', 'Palazzo dei Congressi', 'Villa Ciani', 'Ex-Asilo Ciani'].every(name => visible.includes(name)));
  } else {
    const documents = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(match => JSON.parse(match[1]));
    // Only the top-level Event contract is accepted, not unrelated nested offers/events.
    const events = documents.flatMap(value => Array.isArray(value) ? value : [value]).filter(value => value?.['@type'] === 'Event');
    requireThat(events.length === 1);
    const event = events[0];
    requireThat(event.name === source.schemaName && event.organizer?.name === source.organizer && event.organizer?.url === source.organizerURL);
    requireThat(event.eventStatus === 'https://schema.org/EventScheduled');
    for (const [key, expected] of [['startDate', source.start], ['endDate', source.end]]) {
      const value = event[key];
      requireThat(typeof value === 'string' && (value === expected || (value.startsWith(expected + 'T') && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(value) && localDate(value, source.timeZone) === expected)));
    }
    const venues = Array.isArray(event.location) ? event.location : [event.location];
    requireThat(venues.length === source.venues.length && new Set(venues.map(venue => venue?.name)).size === venues.length);
    requireThat(venues.every(venue => venue?.['@type'] === 'Place' && source.venues.includes(venue.name) && venue.address?.addressLocality === source.locality && venue.address?.addressCountry === source.country));
    if (source.id === 'bitcoin-amsterdam-2026') requireThat(venues[0].address.streetAddress === 'Kristalpromenade 7' && venues[0].address.postalCode.replace(/\s/g, '') === '1165PD');
  }
  return claims(source);
}
function iso(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }
export function validateEvents(snapshot, { now = new Date().toISOString(), maxAgeMs = 3 * 3_600_000 } = {}) {
  requireThat(snapshot?.schemaVersion === 1 && snapshot.parserVersion === 'ltc-events-v1' && iso(snapshot.checkedAt) && Date.parse(snapshot.checkedAt) <= Date.parse(now) && Date.parse(now) - Date.parse(snapshot.checkedAt) <= maxAgeMs, 'invalid_event_check_time');
  requireThat(snapshot.asOf === localDate(snapshot.checkedAt) && snapshot.timeZone === 'America/New_York' && snapshot.events?.length === EVENT_SOURCES.length, 'invalid_event_snapshot');
  for (const [index, source] of EVENT_SOURCES.entries()) {
    const row = snapshot.events[index];
    requireThat(Object.entries(claims(source)).every(([key, value]) => row?.[key] === value), 'unreviewed_event_claim');
    requireThat(row.checkedAt === snapshot.checkedAt && row.phase === eventPhase(source, snapshot.checkedAt), 'invalid_event_phase');
    requireThat(['confirmed','unavailable'].includes(row.checkStatus), 'invalid_event_status');
    if (row.lastConfirmedAt !== null) requireThat(iso(row.lastConfirmedAt) && row.lastConfirmedAt <= row.checkedAt && /^[a-f0-9]{64}$/.test(row.confirmedSourceSha256), 'invalid_event_provenance');
    else requireThat(row.confirmedSourceSha256 === null && row.checkStatus === 'unavailable', 'invalid_event_provenance');
    if (row.checkStatus === 'confirmed') requireThat(row.lastConfirmedAt === row.checkedAt && row.httpStatus === 200 && row.errorCode === null, 'invalid_event_confirmation');
    else requireThat(['http_failure','transport_failure','source_too_large','source_challenge','organizer_contract_changed'].includes(row.errorCode) && (row.httpStatus === null || Number.isInteger(row.httpStatus)), 'invalid_event_failure');
  }
  return snapshot;
}
export async function collectEvents({ now = () => new Date().toISOString(), fetcher = fetch, previous = null, saveEvidence = async () => {} } = {}) {
  if (previous) validateEvents(previous, { now: now(), maxAgeMs: Infinity });
  const checks = await Promise.all(EVENT_SOURCES.map(async source => {
    let httpStatus = null;
    try {
      const response = await fetcher(source.url, { redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { Accept: 'text/html', 'User-Agent': 'LTC-Magazine-source-check/1.0' } });
      httpStatus = response.status;
      requireThat(response.ok && httpStatus === 200 && !response.redirected, 'http_failure');
      requireThat(Number(response.headers.get('content-length') || 0) <= 2_000_000, 'source_too_large');
      requireThat(response.body && /text\/html/i.test(response.headers.get('content-type') || ''), 'organizer_contract_changed');
      let length = 0; const parts = [];
      for await (const part of response.body) { length += part.byteLength; requireThat(length <= 2_000_000, 'source_too_large'); parts.push(part); }
      const bytes = Buffer.concat(parts), html = bytes.toString('utf8');
      await saveEvidence(source.id, bytes);
      confirmEvent(source, html);
      return { checkStatus: 'confirmed', httpStatus, sha256: createHash('sha256').update(bytes).digest('hex'), errorCode: null };
    } catch (error) {
      const safe = ['http_failure','source_too_large','source_challenge','organizer_contract_changed'];
      return { checkStatus: 'unavailable', httpStatus, errorCode: safe.includes(error.message) ? error.message : httpStatus === null ? 'transport_failure' : 'organizer_contract_changed' };
    }
  }));
  const checkedAt = now();
  const snapshot = { schemaVersion: 1, parserVersion: 'ltc-events-v1', checkedAt, asOf: localDate(checkedAt), timeZone: 'America/New_York', events: EVENT_SOURCES.map((source, index) => {
    const check = checks[index], prior = previous?.events[index];
    return { ...claims(source), phase: eventPhase(source, checkedAt), checkedAt, checkStatus: check.checkStatus, httpStatus: check.httpStatus, lastConfirmedAt: check.checkStatus === 'confirmed' ? checkedAt : prior?.lastConfirmedAt ?? null, confirmedSourceSha256: check.checkStatus === 'confirmed' ? check.sha256 : prior?.confirmedSourceSha256 ?? null, errorCode: check.errorCode };
  }) };
  return validateEvents(snapshot, { now: checkedAt });
}
