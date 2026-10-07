import { createHash } from 'node:crypto';

// Fixed public source identities; request targets cannot be supplied by feed content.
export const COMMUNITY_SOURCES = Object.freeze([
  Object.freeze({ id: 'litecoin-foundation-news', sourceName: 'Litecoin Foundation news', url: 'https://litecoin.com/news/rss.xml', format: 'rss', origin: 'https://litecoin.com', channelUrl: 'https://litecoin.com/news', classification: 'official-foundation-headline' }),
  Object.freeze({ id: 'litecoin-foundation-nexus', sourceName: 'Litecoin Foundation · Nexus releases', url: 'https://api.github.com/repos/litecoin-foundation/nexus/releases?per_page=10', format: 'github-releases', origin: 'https://github.com', classification: 'official-software-release' }),
]);
export const COMMUNITY_LIMITS = Object.freeze({ maximumBytes: 2_000_000, timeoutMs: 15_000, historyDays: 90, itemsPerSource: 1, maximumSnapshotAgeHours: 24 });
const DAY = 86_400_000;
const ERRORS = new Set(['http_403', 'http_429', 'http_failure', 'redirect_denied', 'response_too_large', 'empty_response', 'unexpected_content_type', 'invalid_utf8', 'malformed_xml', 'unsupported_xml', 'invalid_feed_identity', 'invalid_title', 'invalid_record_url', 'invalid_source_date', 'duplicate_record', 'malformed_json', 'invalid_release', 'timeout', 'transport_failure', 'deferred_by_operator']);
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const sha256 = value => createHash('sha256').update(value).digest('hex');
const instant = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...expected].sort().join(',');

const validXmlCharacter = code => code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 0xD7FF) || (code >= 0xE000 && code <= 0xFFFD) || (code >= 0x10000 && code <= 0x10FFFF);

function xmlText(value) {
  assert(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(value), 'malformed_xml');
  const named = { amp: '&', lt: '<', gt: '>', apos: "'", quot: '"' };
  // XML predefined and numeric entities only. No DTD, remote entities or HTML execution.
  return value.replace(/&([^;]*);|&/g, (token, entity) => {
    assert(entity !== undefined, 'malformed_xml');
    if (Object.hasOwn(named, entity)) return named[entity];
    assert(/^#(?:[0-9]+|x[0-9A-Fa-f]+)$/.test(entity), 'unsupported_xml');
    const code = entity[1] === 'x' ? Number.parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    assert(Number.isSafeInteger(code) && validXmlCharacter(code), 'malformed_xml');
    return String.fromCodePoint(code);
  });
}

// Small strict RSS XML reader: balanced structure, literal CDATA, no DTD/PI execution.
// It never creates a DOM, resolves a URL, or treats source text as instructions.
function parseXml(input) {
  assert(typeof input === 'string' && Buffer.byteLength(input) <= COMMUNITY_LIMITS.maximumBytes, 'response_too_large');
  for (const character of input) assert(validXmlCharacter(character.codePointAt(0)), 'malformed_xml');
  let xml = input.replace(/^\uFEFF/, '');
  if (xml.startsWith('<?xml')) {
    const declaration = /^<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']utf-8["'])?(?:\s+standalone=["'](?:yes|no)["'])?\s*\?>/i.exec(xml);
    assert(declaration, 'unsupported_xml'); xml = xml.slice(declaration[0].length);
  }
  const document = { name: '#document', children: [], text: '', attrs: {} };
  const stack = [document]; let offset = 0; let count = 0;
  const append = text => { stack.at(-1).text += text; };
  while (offset < xml.length) {
    if (xml.startsWith('<!--', offset)) {
      const end = xml.indexOf('-->', offset + 4);
      assert(end >= 0 && !xml.slice(offset + 4, end).includes('--'), 'malformed_xml'); offset = end + 3; continue;
    }
    if (xml.startsWith('<![CDATA[', offset)) {
      const end = xml.indexOf(']]>', offset + 9);
      assert(end >= 0 && stack.length > 1, 'malformed_xml'); append(xml.slice(offset + 9, end)); offset = end + 3; continue;
    }
    if (xml[offset] !== '<') {
      const end = xml.indexOf('<', offset); const text = xml.slice(offset, end < 0 ? undefined : end);
      assert(!text.includes(']]>'), 'malformed_xml'); append(xmlText(text)); offset = end < 0 ? xml.length : end; continue;
    }
    assert(!xml.startsWith('<!', offset) && !xml.startsWith('<?', offset), 'unsupported_xml');
    const close = /^<\/([A-Za-z_][\w.:-]*)\s*>/.exec(xml.slice(offset));
    if (close) {
      assert(stack.length > 1 && stack.at(-1).name === close[1], 'malformed_xml'); stack.pop(); offset += close[0].length; continue;
    }
    const open = /^<([A-Za-z_][\w.:-]*)/.exec(xml.slice(offset));
    assert(open, 'malformed_xml');
    assert(!['script', 'iframe', 'object', 'embed', 'style'].includes(open[1].toLowerCase()), 'unsupported_xml');
    offset += open[0].length;
    const attrs = {}; let selfClosing = false;
    while (true) {
      const whitespace = /^\s*/.exec(xml.slice(offset))[0]; offset += whitespace.length;
      if (xml.startsWith('/>', offset)) { selfClosing = true; offset += 2; break; }
      if (xml[offset] === '>') { offset++; break; }
      assert(whitespace.length > 0, 'malformed_xml');
      const attribute = /^([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/.exec(xml.slice(offset));
      assert(attribute && !Object.hasOwn(attrs, attribute[1]) && Object.keys(attrs).length < 40, 'malformed_xml');
      Object.defineProperty(attrs, attribute[1], { value: xmlText(attribute[2] ?? attribute[3]), enumerable: true });
      offset += attribute[0].length;
    }
    const node = { name: open[1], attrs, text: '', children: [] };
    assert(++count <= 10_000 && stack.length < 24, 'malformed_xml');
    stack.at(-1).children.push(node); if (!selfClosing) stack.push(node);
  }
  assert(stack.length === 1 && !document.text.trim() && document.children.length === 1, 'malformed_xml');
  return document.children[0];
}

function one(parent, name) {
  const found = parent.children.filter(child => child.name === name);
  assert(found.length === 1, 'malformed_xml'); return found[0];
}
function leaf(parent, name) {
  const node = one(parent, name); assert(node.children.length === 0, 'malformed_xml'); return node.text.trim();
}
function titleText(title) {
  assert(typeof title === 'string', 'invalid_title');
  const normalized = title.replace(/\s+/gu, ' ').trim();
  assert(normalized.length > 0 && normalized.length <= 600 && normalized.split(/\s+/u).length <= 25 && !/[<>\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(normalized), 'invalid_title');
  return normalized;
}

function recordUrl(value, source) {
  assert(typeof value === 'string' && value.length < 1000 && !/[\s\\%?#]/u.test(value), 'invalid_record_url');
  let url; try { url = new URL(value); } catch { throw new Error('invalid_record_url'); }
  const path = source.format === 'rss' ? /^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*$/ : /^\/litecoin-foundation\/nexus\/releases\/tag\/v\d+\.\d+\.\d+(?:\.\d+)?$/;
  assert(url.protocol === 'https:' && url.origin === source.origin && !url.username && !url.password && !url.port && path.test(url.pathname) && value === url.href, 'invalid_record_url');
  return value;
}
const recordId = (source, url) => `${source.id}-${sha256(url).slice(0, 20)}`;
function item(source, title, url, publishedAt) {
  return { id: recordId(source, url), sourceId: source.id, sourceName: source.sourceName, title: titleText(title), url: recordUrl(url, source), publishedAt, summaryClassification: source.classification };
}

function rssDate(value, now) {
  const match = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) (GMT|UT|[+-]\d{4})$/.exec(value);
  assert(match, 'invalid_source_date');
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[3]);
  const wall = new Date(Date.UTC(Number(match[4]), month, Number(match[2]), Number(match[5]), Number(match[6]), Number(match[7])));
  assert(wall.getUTCFullYear() === Number(match[4]) && wall.getUTCMonth() === month && wall.getUTCDate() === Number(match[2]) && Number(match[5]) < 24 && Number(match[6]) < 60 && Number(match[7]) < 60 && ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][wall.getUTCDay()] === match[1], 'invalid_source_date');
  const zone = match[8]; let minutes = 0;
  if (/^[+-]/.test(zone)) {
    assert(Number(zone.slice(1, 3)) <= 14 && Number(zone.slice(3)) < 60 && (Number(zone.slice(1, 3)) < 14 || zone.slice(3) === '00'), 'invalid_source_date');
    minutes = (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3))) * (zone[0] === '+' ? 1 : -1);
  }
  const publishedAt = new Date(wall.getTime() - minutes * 60_000).toISOString();
  assert(instant(now) && Date.parse(publishedAt) <= Date.parse(now), 'invalid_source_date');
  return publishedAt;
}

export function parseCommunityFeed(input, sourceId, now) {
  const source = COMMUNITY_SOURCES.find(entry => entry.id === sourceId);
  assert(source && instant(now), 'invalid_feed_identity');
  assert(typeof input === 'string' && Buffer.byteLength(input) <= COMMUNITY_LIMITS.maximumBytes, 'response_too_large');
  let records;
  if (source.format === 'rss') {
    const rss = parseXml(input);
    assert(rss.name === 'rss' && rss.attrs.version === '2.0' && rss.children.length === 1 && !rss.text.trim(), 'invalid_feed_identity');
    const channel = one(rss, 'channel');
    // The fixed HTTPS transport and exact channel link bind source identity. The
    // publisher may vary its feed title, which is never imported as our branding.
    assert(leaf(channel, 'link') === source.channelUrl && !channel.text.trim(), 'invalid_feed_identity');
    titleText(leaf(channel, 'title'));
    const entries = channel.children.filter(node => node.name === 'item');
    assert(entries.length <= 1000, 'malformed_xml');
    records = entries.map(entry => {
      assert(!entry.text.trim(), 'malformed_xml');
      return item(source, leaf(entry, 'title'), leaf(entry, 'link'), rssDate(leaf(entry, 'pubDate'), now));
    });
  } else {
    let releases; try { releases = JSON.parse(input); } catch { throw new Error('malformed_json'); }
    assert(Array.isArray(releases) && releases.length <= 10, 'invalid_release');
    const ids = new Set();
    records = releases.flatMap(release => {
      assert(release && typeof release === 'object' && Number.isSafeInteger(release.id) && release.id > 0 && !ids.has(release.id) && typeof release.draft === 'boolean' && typeof release.prerelease === 'boolean', 'invalid_release');
      ids.add(release.id);
      // Drafts/prereleases are not stable announcements. Never import their body.
      if (release.draft || release.prerelease) return [];
      assert(typeof release.tag_name === 'string' && /^v\d+\.\d+\.\d+(?:\.\d+)?$/.test(release.tag_name), 'invalid_release');
      assert(release.html_url === `${source.origin}/litecoin-foundation/nexus/releases/tag/${release.tag_name}`, 'invalid_record_url');
      assert(release.url === `https://api.github.com/repos/litecoin-foundation/nexus/releases/${release.id}`, 'invalid_feed_identity');
      assert(instant(release.published_at) && Date.parse(release.published_at) <= Date.parse(now), 'invalid_source_date');
      // A deterministic version title avoids importing marketing claims or body text.
      return [item(source, `Nexus ${release.tag_name}`, release.html_url, new Date(release.published_at).toISOString())];
    });
  }
  assert(new Set(records.map(record => record.url)).size === records.length, 'duplicate_record');
  return records.filter(record => Date.parse(now) - Date.parse(record.publishedAt) <= COMMUNITY_LIMITS.historyDays * DAY)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.url.localeCompare(b.url)).slice(0, COMMUNITY_LIMITS.itemsPerSource);
}

async function boundedBody(response) {
  const length = response.headers.get('content-length');
  assert(length === null || (/^\d+$/.test(length) && Number(length) <= COMMUNITY_LIMITS.maximumBytes), 'response_too_large');
  assert(response.body, 'empty_response');
  let size = 0; const chunks = [];
  for await (const chunk of response.body) { size += chunk.byteLength; assert(size <= COMMUNITY_LIMITS.maximumBytes, 'response_too_large'); chunks.push(chunk); }
  assert(size > 0, 'empty_response'); return Buffer.concat(chunks);
}

async function collectSource(source, clock, fetcher, onEvidence) {
  const base = { id: source.id, sourceName: source.sourceName, url: source.url, status: 'unavailable', checkedAt: clock(), sha256: null, errorCode: null };
  const controller = new AbortController(); let timer; let evidence;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, COMMUNITY_LIMITS.timeoutMs); });
  let result;
  try {
    result = await Promise.race([timeout, (async () => {
      const response = await fetcher(source.url, { redirect: 'error', signal: controller.signal, headers: { Accept: source.format === 'rss' ? 'application/rss+xml,application/xml,text/xml' : 'application/vnd.github+json', 'User-Agent': 'SatnamSatoshi-LTC/1.0 (+https://github.com/Satnam-Satoshi/Satoshi-Langar)' } });
      assert(!response.redirected && (!response.url || response.url === source.url) && !(response.status >= 300 && response.status < 400), 'redirect_denied');
      assert(response.ok, response.status === 403 ? 'http_403' : response.status === 429 ? 'http_429' : 'http_failure');
      const type = response.headers.get('content-type') ?? '';
      assert((source.format === 'rss' ? /^(?:application\/(?:rss\+xml|xml)|text\/xml)(?:\s*;|$)/i : /^application\/(?:json|vnd\.github\+json)(?:\s*;|$)/i).test(type), 'unexpected_content_type');
      const bytes = await boundedBody(response); base.sha256 = sha256(bytes);
      evidence = { sourceId: source.id, checkedAt: clock(), bytes, sha256: base.sha256 };
      let text; try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new Error('invalid_utf8'); }
      return { source: { ...base, status: 'collected', checkedAt: clock() }, items: parseCommunityFeed(text, source.id, clock()) };
    })()]);
  } catch (error) {
    result = { source: { ...base, checkedAt: clock(), errorCode: controller.signal.aborted || error.name === 'AbortError' || error.name === 'TimeoutError' ? 'timeout' : ERRORS.has(error.message) ? error.message : 'transport_failure' }, items: [] };
  } finally { clearTimeout(timer); controller.abort(); }
  // A storage failure aborts the caller: never silently claim evidence was saved.
  if (onEvidence && evidence) await onEvidence(evidence);
  return result;
}

export async function collectCommunity({ now, fetcher = fetch, onEvidence, deferFoundation = false } = {}) {
  const clock = now === undefined ? () => new Date().toISOString() : () => now;
  assert(instant(clock()), 'invalid_run_time');
  assert(typeof deferFoundation === 'boolean', 'invalid_defer_flag');
  const results = await Promise.all(COMMUNITY_SOURCES.map(source => deferFoundation && source.format === 'rss' ? { source: { id: source.id, sourceName: source.sourceName, url: source.url, status: 'unavailable', checkedAt: null, sha256: null, errorCode: 'deferred_by_operator' }, items: [] } : collectSource(source, clock, fetcher, onEvidence)));
  const collectedAt = clock();
  const snapshot = { schemaVersion: 1, collectedAt, sourceStatus: results.map(result => result.source), items: results.flatMap(result => result.items).filter(record => Date.parse(collectedAt) - Date.parse(record.publishedAt) <= COMMUNITY_LIMITS.historyDays * DAY).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.url.localeCompare(b.url)) };
  return validateCommunitySnapshot(snapshot, { now: collectedAt });
}

export function validateCommunitySnapshot(snapshot, { now = new Date().toISOString() } = {}) {
  assert(instant(now) && keys(snapshot, ['schemaVersion', 'collectedAt', 'sourceStatus', 'items']) && snapshot.schemaVersion === 1 && instant(snapshot.collectedAt), 'invalid_community_snapshot');
  const elapsed = Date.parse(now) - Date.parse(snapshot.collectedAt);
  assert(elapsed >= 0 && elapsed <= COMMUNITY_LIMITS.maximumSnapshotAgeHours * 3_600_000, 'stale_or_future_community_snapshot');
  assert(Array.isArray(snapshot.sourceStatus) && snapshot.sourceStatus.length === COMMUNITY_SOURCES.length && new Set(snapshot.sourceStatus.map(source => source?.id)).size === COMMUNITY_SOURCES.length, 'invalid_community_registry');
  for (const source of snapshot.sourceStatus) {
    const rule = COMMUNITY_SOURCES.find(record => record.id === source?.id);
    assert(rule && keys(source, ['id', 'sourceName', 'url', 'status', 'checkedAt', 'sha256', 'errorCode']) && source.sourceName === rule.sourceName && source.url === rule.url, 'invalid_community_source_identity');
    assert(source.errorCode === 'deferred_by_operator' ? rule.format === 'rss' && source.checkedAt === null && source.sha256 === null && source.status === 'unavailable' : instant(source.checkedAt) && Date.parse(source.checkedAt) <= Date.parse(snapshot.collectedAt) && Date.parse(snapshot.collectedAt) - Date.parse(source.checkedAt) <= COMMUNITY_LIMITS.timeoutMs * 2, 'invalid_community_checked_at');
    assert(source.sha256 === null || (typeof source.sha256 === 'string' && /^[a-f0-9]{64}$/.test(source.sha256)), 'invalid_community_hash');
    assert(source.status === 'collected' ? source.sha256 !== null && source.errorCode === null : source.status === 'unavailable' && ERRORS.has(source.errorCode), 'invalid_community_status');
  }
  assert(Array.isArray(snapshot.items) && snapshot.items.length <= COMMUNITY_SOURCES.length * COMMUNITY_LIMITS.itemsPerSource && new Set(snapshot.items.map(record => record?.id)).size === snapshot.items.length && new Set(snapshot.items.map(record => record?.url)).size === snapshot.items.length, 'invalid_community_items');
  let previous = Infinity;
  for (const record of snapshot.items) {
    assert(keys(record, ['id', 'sourceId', 'sourceName', 'title', 'url', 'publishedAt', 'summaryClassification']), 'invalid_community_item');
    const rule = COMMUNITY_SOURCES.find(source => source.id === record.sourceId);
    const source = snapshot.sourceStatus.find(source => source.id === record.sourceId);
    assert(rule && source?.status === 'collected' && record.sourceName === rule.sourceName && record.summaryClassification === rule.classification && snapshot.items.filter(item => item.sourceId === record.sourceId).length <= COMMUNITY_LIMITS.itemsPerSource, 'invalid_community_item');
    assert(record.id === recordId(rule, recordUrl(record.url, rule)) && record.title === titleText(record.title) && instant(record.publishedAt), 'invalid_community_item');
    if (rule.format === 'github-releases') assert(record.title === `Nexus ${new URL(record.url).pathname.split('/').at(-1)}`, 'invalid_community_item');
    const published = Date.parse(record.publishedAt);
    assert(published <= Date.parse(source.checkedAt) && Date.parse(snapshot.collectedAt) - published <= COMMUNITY_LIMITS.historyDays * DAY && published <= previous, 'invalid_community_publication_date'); previous = published;
  }
  return snapshot;
}
