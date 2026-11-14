import { createHash } from 'node:crypto';

// These are the RSS links published by the agencies, not configurable fetch targets.
export const POLICY_SOURCES = Object.freeze([
  Object.freeze({ id: 'sec-press-releases', title: 'SEC press releases', url: 'https://www.sec.gov/news/pressreleases.rss', origin: 'https://www.sec.gov', agency: 'SEC', path: /^\/newsroom\/press-releases\/\d{4}-\d{1,4}-[a-z0-9]+(?:-[a-z0-9]+)*$/ }),
  Object.freeze({ id: 'cftc-press-releases', title: 'CFTC general press releases', url: 'https://www.cftc.gov/RSS/RSSGP/rssgp.xml', origin: 'https://www.cftc.gov', agency: 'CFTC', path: /^\/PressRoom\/PressReleases\/\d{4,5}-\d{2}$/ }),
]);
export const POLICY_LIMITS = Object.freeze({ maximumBytes: 2_000_000, timeoutMs: 15_000, historyDays: 30, itemsPerSource: 2, maximumSnapshotAgeHours: 24 });
const DAY = 86_400_000;
const CLASSIFICATION = 'official-press-release';
const ERROR_CODES = new Set(['http_403', 'http_failure', 'redirect_denied', 'response_too_large', 'empty_response', 'unexpected_content_type', 'invalid_utf8', 'malformed_xml', 'unsupported_xml', 'invalid_feed_identity', 'invalid_title', 'invalid_record_url', 'invalid_source_date', 'duplicate_record', 'timeout', 'transport_failure']);
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
  assert(typeof input === 'string' && Buffer.byteLength(input) <= POLICY_LIMITS.maximumBytes, 'response_too_large');
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
  assert(normalized.length > 0 && normalized.length <= 600 && !/[<>\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(normalized), 'invalid_title');
  return normalized;
}
function recordUrl(value, source) {
  assert(typeof value === 'string' && value.length < 1000 && !/[\s\\%?#]/u.test(value), 'invalid_record_url');
  let url; try { url = new URL(value); } catch { throw new Error('invalid_record_url'); }
  assert(url.origin === source.origin && url.protocol === 'https:' && !url.username && !url.password && !url.port && source.path.test(url.pathname) && url.href === value, 'invalid_record_url');
  return url.href;
}
const recordId = (source, url) => `${source.id}-${sha256(url).slice(0, 20)}`;

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

export function parsePolicyFeed(xml, sourceId, now) {
  const source = POLICY_SOURCES.find(item => item.id === sourceId);
  assert(source && instant(now), 'invalid_feed_identity');
  const rss = parseXml(xml);
  assert(rss.name === 'rss' && rss.attrs.version === '2.0' && (!rss.attrs['xml:base'] || rss.attrs['xml:base'] === `${source.origin}/`) && rss.children.length === 1 && !rss.text.trim(), 'invalid_feed_identity');
  const channel = one(rss, 'channel');
  assert(leaf(channel, 'title') === 'Press Releases' && leaf(channel, 'link') === `${source.origin}/` && !channel.text.trim(), 'invalid_feed_identity');
  const entries = channel.children.filter(node => node.name === 'item');
  assert(entries.length <= 1000, 'malformed_xml');
  const records = entries.map(entry => {
    assert(!entry.text.trim(), 'malformed_xml');
    const url = recordUrl(leaf(entry, 'link'), source);
    return { id: recordId(source, url), title: titleText(leaf(entry, 'title')), url, publishedAt: rssDate(leaf(entry, 'pubDate'), now), classification: CLASSIFICATION };
  });
  assert(new Set(records.map(item => item.url)).size === records.length, 'duplicate_record');
  return records.filter(item => Date.parse(now) - Date.parse(item.publishedAt) <= POLICY_LIMITS.historyDays * DAY)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.url.localeCompare(b.url)).slice(0, POLICY_LIMITS.itemsPerSource);
}

async function boundedBody(response) {
  const length = response.headers.get('content-length');
  assert(length === null || (/^\d+$/.test(length) && Number(length) <= POLICY_LIMITS.maximumBytes), 'response_too_large');
  assert(response.body, 'empty_response');
  let size = 0; const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.byteLength; assert(size <= POLICY_LIMITS.maximumBytes, 'response_too_large'); chunks.push(chunk);
  }
  assert(size > 0, 'empty_response'); return Buffer.concat(chunks);
}

async function collectSource(source, clock, fetcher) {
  const base = { id: source.id, title: source.title, url: source.url, status: 'unavailable', checkedAt: clock(), sha256: null, errorCode: null, items: [] };
  const controller = new AbortController(); let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, POLICY_LIMITS.timeoutMs); });
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetcher(source.url, { redirect: 'error', signal: controller.signal, headers: { Accept: 'application/rss+xml,application/xml,text/xml', 'User-Agent': 'SatnamSatoshi-LTC/1.0 (+https://github.com/Satnam-Satoshi/Satoshi-Langar)' } });
      assert(!response.redirected && (!response.url || response.url === source.url) && !(response.status >= 300 && response.status < 400), 'redirect_denied');
      assert(response.ok, response.status === 403 ? 'http_403' : 'http_failure');
      assert(/^(?:application\/(?:rss\+xml|xml)|text\/xml)(?:\s*;|$)/i.test(response.headers.get('content-type') ?? ''), 'unexpected_content_type');
      const bytes = await boundedBody(response); base.sha256 = sha256(bytes);
      let xml; try { xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new Error('invalid_utf8'); }
      const checkedAt = clock();
      return { ...base, status: 'collected', checkedAt, items: parsePolicyFeed(xml, source.id, checkedAt) };
    })()]);
  } catch (error) {
    return { ...base, checkedAt: clock(), errorCode: controller.signal.aborted || error.name === 'AbortError' || error.name === 'TimeoutError' ? 'timeout' : ERROR_CODES.has(error.message) ? error.message : 'transport_failure' };
  } finally { clearTimeout(timer); controller.abort(); }
}

export async function collectPolicy({ now, fetcher = fetch } = {}) {
  const clock = now === undefined ? () => new Date().toISOString() : () => now;
  assert(instant(clock()), 'invalid_run_time');
  const sources = await Promise.all(POLICY_SOURCES.map(source => collectSource(source, clock, fetcher)));
  const snapshot = { schemaVersion: 1, collectedAt: clock(), sources };
  for (const source of sources) source.items = source.items.filter(item => Date.parse(snapshot.collectedAt) - Date.parse(item.publishedAt) <= POLICY_LIMITS.historyDays * DAY);
  validatePolicySnapshot(snapshot, { now: snapshot.collectedAt }); return snapshot;
}

export function validatePolicySnapshot(snapshot, { now = new Date().toISOString() } = {}) {
  assert(instant(now) && keys(snapshot, ['schemaVersion', 'collectedAt', 'sources']) && snapshot.schemaVersion === 1 && instant(snapshot.collectedAt), 'invalid_policy_snapshot');
  const elapsed = Date.parse(now) - Date.parse(snapshot.collectedAt);
  assert(elapsed >= 0 && elapsed <= POLICY_LIMITS.maximumSnapshotAgeHours * 3_600_000, 'stale_or_future_policy_snapshot');
  assert(Array.isArray(snapshot.sources) && snapshot.sources.length === POLICY_SOURCES.length && new Set(snapshot.sources.map(source => source?.id)).size === POLICY_SOURCES.length, 'invalid_policy_registry');
  for (const source of snapshot.sources) {
    const rule = POLICY_SOURCES.find(item => item.id === source?.id);
    assert(rule && keys(source, ['id', 'title', 'url', 'status', 'checkedAt', 'sha256', 'errorCode', 'items']) && source.title === rule.title && source.url === rule.url, 'invalid_policy_source_identity');
    assert(instant(source.checkedAt) && Date.parse(source.checkedAt) <= Date.parse(snapshot.collectedAt) && Date.parse(snapshot.collectedAt) - Date.parse(source.checkedAt) <= POLICY_LIMITS.timeoutMs * 2, 'invalid_policy_checked_at');
    assert(Array.isArray(source.items) && source.items.length <= POLICY_LIMITS.itemsPerSource && new Set(source.items.map(item => item?.id)).size === source.items.length && new Set(source.items.map(item => item?.url)).size === source.items.length, 'invalid_policy_items');
    assert(source.sha256 === null || (typeof source.sha256 === 'string' && /^[a-f0-9]{64}$/.test(source.sha256)), 'invalid_policy_hash');
    assert(source.status === 'collected' ? source.sha256 !== null && source.errorCode === null : source.status === 'unavailable' && source.items.length === 0 && ERROR_CODES.has(source.errorCode), 'invalid_policy_status');
    let previous = Infinity;
    for (const item of source.items) {
      assert(keys(item, ['id', 'title', 'url', 'publishedAt', 'classification']) && item.classification === CLASSIFICATION, 'invalid_policy_item');
      const url = recordUrl(item.url, rule);
      assert(item.id === recordId(rule, url) && item.title === titleText(item.title) && instant(item.publishedAt), 'invalid_policy_item');
      const published = Date.parse(item.publishedAt);
      assert(published <= Date.parse(source.checkedAt) && Date.parse(snapshot.collectedAt) - published <= POLICY_LIMITS.historyDays * DAY && published <= previous, 'invalid_policy_publication_date'); previous = published;
    }
  }
  return snapshot;
}

// Use as plain text in the consuming renderer. This does not paraphrase legal holdings.
export function policyRecordSummary(source, item) {
  const rule = POLICY_SOURCES.find(record => record.id === source?.id && record.url === source.url);
  assert(rule && item?.classification === CLASSIFICATION && instant(item.publishedAt) && item.id === recordId(rule, recordUrl(item.url, rule)), 'invalid_policy_item');
  return `${rule.agency} published a press release with the official RSS timestamp ${item.publishedAt}. The headline and linked record are attributed to the agency.`;
}
