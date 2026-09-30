import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const OUTPUT = path.join(root, 'public/data/ltc-snapshot.json');
const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 15_000;
// Exact public endpoints. Changing config alone cannot introduce a new network target.
export const ALLOWED_URLS = new Set([
  'https://www.ishares.com/us/products/333011/ishares-bitcoin-trust-etf/latest-holdings.csv',
  'https://api.github.com/repos/bitcoin/bitcoin/releases/latest',
  'https://www.strategy.com/notes',
  'https://coinshares.com/etp/physical-bitcoin/',
  'https://www.sec.gov/newsroom/press-releases',
  'https://www.litecoinregister.com/',
]);

export function csvRows(text) {
  const rows = []; let row = []; let value = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n')) {
      row.push(value.replace(/\r$/, '')); value = '';
      if (char === '\n') { rows.push(row); row = []; }
    } else value += char;
  }
  if (quoted) throw new Error('malformed_csv');
  if (value || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

export function decimal(value) {
  if (typeof value !== 'string' || !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value.trim())) throw new Error('invalid_decimal');
  const result = value.trim().replaceAll(',', '');
  if (!Number.isFinite(Number(result)) || Number(result) < 0) throw new Error('invalid_decimal');
  return result;
}

export function sourceDate(value, now) {
  const match = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4})$/.exec(value?.trim() ?? '');
  if (!match) throw new Error('missing_source_date');
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[1]) + 1;
  const day = `${match[3]}-${String(month).padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  if (!Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day || day > now.slice(0, 10)) throw new Error('invalid_source_date');
  return day;
}

export function freshness(asOf, now, maxAgeDays = 4) {
  if (!asOf) return 'unknown';
  const age = (Date.parse(now.slice(0, 10)) - Date.parse(asOf.slice(0, 10))) / 86_400_000;
  if (!Number.isFinite(age) || age < 0) return 'invalid';
  if (maxAgeDays === null) return 'dated-event';
  return age > maxAgeDays ? 'stale' : 'dated-observation';
}

export function parseIbit(text, now) {
  if (!text.replace(/^\uFEFF/, '').startsWith('iShares Bitcoin Trust ETF')) throw new Error('wrong_product');
  const rows = csvRows(text.replace(/^\uFEFF/, ''));
  const dateRow = rows.find(row => row[0]?.trim() === 'Fund Holdings as of');
  const asOf = sourceDate(dateRow?.[1], now);
  const headerAt = rows.findIndex(row => row[0] === 'Ticker' && row.includes('Quantity'));
  if (headerAt < 0) throw new Error('missing_columns');
  const header = rows[headerAt];
  const currencyAt = header.indexOf('Market Currency');
  const nameAt = header.indexOf('Name');
  if (currencyAt < 0 || nameAt < 0) throw new Error('missing_columns');
  const bitcoins = rows.slice(headerAt + 1).filter(row => row[0] === 'BTC');
  if (bitcoins.length !== 1 || bitcoins[0][currencyAt] !== 'BTC' || bitcoins[0][nameAt] !== 'BITCOIN') throw new Error('wrong_asset');
  const quantity = decimal(bitcoins[0][header.indexOf('Quantity')]);
  if (Number(quantity) > 21_000_000) throw new Error('impossible_quantity');
  const shares = decimal(rows.find(row => row[0] === 'Shares Outstanding')?.[1]);
  return { sourceAsOf: asOf, observations: [
    { metric: 'fund_btc_quantity', label: 'IBIT reported BTC holdings', value: quantity, unit: 'BTC', effectiveAt: asOf, timePrecision: 'date', classification: 'issuer-reported' },
    { metric: 'fund_shares_outstanding', label: 'IBIT shares outstanding', value: shares, unit: 'shares', effectiveAt: asOf, timePrecision: 'date', classification: 'issuer-reported' },
  ] };
}

export function parseRelease(text, now) {
  const item = JSON.parse(text);
  if (item.draft || item.prerelease || !/^v\d+\.\d+(?:\.\d+)?$/.test(item.tag_name ?? '') || item.html_url !== `https://github.com/bitcoin/bitcoin/releases/tag/${item.tag_name}`) throw new Error('wrong_release');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(item.published_at ?? '') || !Number.isFinite(Date.parse(item.published_at)) || Date.parse(item.published_at) > Date.parse(now)) throw new Error('invalid_source_date');
  return { sourceAsOf: item.published_at, observations: [{ metric: 'software_release', label: 'Bitcoin Core latest returned release', value: item.tag_name, unit: 'version', effectiveAt: item.published_at, timePrecision: 'second', classification: 'upstream-release' }] };
}

async function boundedText(response) {
  if (Number(response.headers.get('content-length') || 0) > MAX_BYTES) throw new Error('response_too_large');
  if (!response.body) throw new Error('empty_response');
  let size = 0; const chunks = [];
  for await (const part of response.body) {
    size += part.byteLength;
    if (size > MAX_BYTES) throw new Error('response_too_large');
    chunks.push(part);
  }
  if (!size) throw new Error('empty_response');
  return Buffer.concat(chunks).toString('utf8');
}

export async function collectSource(source, now, fetcher = fetch) {
  const base = { id: source.id, title: source.title, url: source.url, kind: source.kind, parserVersion: source.parser, checkedAt: now, status: 'unavailable', httpStatus: null, sourceAsOf: null, sourceSha256: null, freshness: 'unknown', observations: null, errorCode: null };
  let status = null;
  try {
    if (!ALLOWED_URLS.has(source.url)) throw new Error('url_not_allowlisted');
    const response = await fetcher(source.url, { redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': 'SatnamSatoshi-LTC/1.0 (+https://github.com/Satnam-Satoshi/Satoshi-Langar)', Accept: source.parser === 'github-release-v1' ? 'application/json' : 'text/csv,text/plain,text/html;q=0.8' } });
    status = response.status;
    if (!response.ok) throw new Error('http_failure');
    const contentType = response.headers.get('content-type') || '';
    if (!/(text\/(csv|plain|html)|application\/(json|octet-stream))/.test(contentType)) throw new Error('unexpected_content_type');
    const text = await boundedText(response);
    if (/cf-chl-|challenge-platform|<title[^>]*>\s*(?:Access Denied|Just a moment)/i.test(text)) throw new Error('source_challenge');
    const parsed = source.parser === 'ibit-csv-v1' ? parseIbit(text, now) : source.parser === 'github-release-v1' ? parseRelease(text, now) : { sourceAsOf: null, observations: null };
    return { ...base, ...parsed, httpStatus: status, status: parsed.observations ? 'collected' : 'reference-retrieved', sourceSha256: createHash('sha256').update(text).digest('hex'), freshness: freshness(parsed.sourceAsOf, now, source.maxAgeDays) };
  } catch (error) {
    const safeErrors = new Set(['url_not_allowlisted','http_failure','response_too_large','empty_response','unexpected_content_type','source_challenge','malformed_csv','invalid_decimal','missing_source_date','invalid_source_date','wrong_product','missing_columns','wrong_asset','impossible_quantity','wrong_release']);
    return { ...base, httpStatus: status, errorCode: safeErrors.has(error.message) ? error.message : 'transport_or_parse_failure' };
  }
}

export async function collectSnapshot(config, { now = new Date().toISOString(), fetcher = fetch } = {}) {
  if (!Number.isFinite(Date.parse(now))) throw new Error('invalid_run_time');
  if (!Array.isArray(config.sources) || config.sources.length > ALLOWED_URLS.size || new Set(config.sources.map(source => source.id)).size !== config.sources.length) throw new Error('invalid_source_registry');
  const sources = await Promise.all(config.sources.map(source => collectSource(source, now, fetcher)));
  return { schemaVersion: 1, publication: 'Lunch Time Conversations', generatedAt: now, timezone: 'America/New_York', scheduleStatus: 'not-scheduled', editorialStatus: 'automated-source-check', coverage: 'IBIT holdings and Bitcoin Core release parser; other sources are reference availability checks. No ETF flow or mNAV calculation.', sourceCount: sources.length, failureCount: sources.filter(source => source.status === 'unavailable').length, sources };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--stdout')) throw new Error('Usage: node scripts/collect-ltc.mjs [--stdout]');
  const config = JSON.parse(await readFile(path.join(root, 'config/ltc-sources.json'), 'utf8'));
  const snapshot = await collectSnapshot(config);
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (args.includes('--stdout')) process.stdout.write(serialized);
  else {
    await mkdir(path.dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, serialized);
    console.log(`LTC snapshot written: ${snapshot.sourceCount} source checks; ${snapshot.failureCount} unavailable. No publication or scheduler activated.`);
  }
  // A monitor must distinguish total collection failure from a successful refresh.
  if (snapshot.failureCount === snapshot.sourceCount) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
