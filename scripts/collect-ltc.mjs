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
  'https://api.github.com/repos/litecoin-project/litecoin/releases/latest',
  'https://api.github.com/repos/lightningnetwork/lnd/releases/latest',
  'https://www.strategy.com/notes',
  'https://coinshares.com/etp/physical-bitcoin/',
  'https://www.sec.gov/newsroom/press-releases',
  'https://www.litecoinregister.com/',
  'https://api.exchange.coinbase.com/products/BTC-USD/ticker',
  'https://api.exchange.coinbase.com/products/LTC-USD/ticker',
]);

// A URL alone is insufficient: the source identity, parser and age policy must agree.
export const SOURCE_RULES = Object.freeze({
  'ibit-holdings': { url: 'https://www.ishares.com/us/products/333011/ishares-bitcoin-trust-etf/latest-holdings.csv', parser: 'ibit-csv-v1', kind: 'primary', maxAgeDays: 4 },
  'bitcoin-core': { url: 'https://api.github.com/repos/bitcoin/bitcoin/releases/latest', parser: 'github-release-v1', kind: 'primary', maxAgeDays: null },
  'litecoin-core': { url: 'https://api.github.com/repos/litecoin-project/litecoin/releases/latest', parser: 'github-litecoin-release-v1', kind: 'primary', maxAgeDays: null },
  'lnd': { url: 'https://api.github.com/repos/lightningnetwork/lnd/releases/latest', parser: 'github-lnd-release-v1', kind: 'primary', maxAgeDays: null },
  'strategy-notes': { url: 'https://www.strategy.com/notes', parser: 'source-check-v1', kind: 'primary', maxAgeDays: null },
  'coinshares-bitc': { url: 'https://coinshares.com/etp/physical-bitcoin/', parser: 'source-check-v1', kind: 'primary', maxAgeDays: null },
  'sec-news': { url: 'https://www.sec.gov/newsroom/press-releases', parser: 'source-check-v1', kind: 'primary', maxAgeDays: null },
  'litecoin-register': { url: 'https://www.litecoinregister.com/', parser: 'source-check-v1', kind: 'secondary', maxAgeDays: null },
  'coinbase-btc-usd': { url: 'https://api.exchange.coinbase.com/products/BTC-USD/ticker', parser: 'coinbase-btc-ticker-v1', kind: 'primary', maxAgeDays: 0 },
  'coinbase-ltc-usd': { url: 'https://api.exchange.coinbase.com/products/LTC-USD/ticker', parser: 'coinbase-ltc-ticker-v1', kind: 'primary', maxAgeDays: 0 },
});

export const TICKER_RULES = Object.freeze({
  'coinbase-btc-ticker-v1': { asset: 'BTC', product: 'BTC-USD', metric: 'btc_usd_last_trade' },
  'coinbase-ltc-ticker-v1': { asset: 'LTC', product: 'LTC-USD', metric: 'ltc_usd_last_trade' },
});

export function tickerFreshness(asOf, now) {
  const age = Date.parse(now) - Date.parse(asOf);
  if (!Number.isFinite(age) || age < 0) return 'invalid';
  return age > 2 * 3_600_000 ? 'stale' : 'dated-observation';
}

export function parseTicker(text, now, parser) {
  const rule = TICKER_RULES[parser];
  const item = JSON.parse(text);
  if (!rule || !Number.isSafeInteger(item.trade_id) || item.trade_id <= 0 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(item.time ?? '') || !Number.isFinite(Date.parse(item.time))) throw new Error('invalid_ticker');
  const sourceAsOf = new Date(item.time).toISOString();
  if (sourceAsOf.slice(0, 19) !== item.time.slice(0, 19) || Date.parse(sourceAsOf) > Date.parse(now)) throw new Error('invalid_source_date');
  for (const field of ['price', 'bid', 'ask', 'size', 'volume']) {
    if (typeof item[field] !== 'string' || !/^\d{1,12}(?:\.\d{1,18})?$/.test(item[field]) || decimal(item[field]) !== item[field]) throw new Error('invalid_ticker');
  }
  if (Number(item.price) <= 0 || Number(item.bid) <= 0 || Number(item.ask) <= 0 || Number(item.bid) > Number(item.ask) || Number(item.size) <= 0) throw new Error('invalid_ticker');
  return { sourceAsOf, observations: [{ metric: rule.metric, label: `${rule.asset}/USD last trade · Coinbase Exchange`, value: item.price, unit: 'USD', effectiveAt: sourceAsOf, timePrecision: 'second', classification: 'venue-reported' }] };
}

export const RELEASE_RULES = Object.freeze({
  'github-release-v1': { repository: 'bitcoin/bitcoin', name: 'Bitcoin Core', pattern: /^v\d+\.\d+(?:\.\d+)?$/ },
  'github-litecoin-release-v1': { repository: 'litecoin-project/litecoin', name: 'Litecoin Core', pattern: /^v\d+\.\d+\.\d+(?:\.\d+)?$/ },
  // LND's official stable channel uses a beta suffix. GitHub prereleases and RC tags still fail.
  'github-lnd-release-v1': { repository: 'lightningnetwork/lnd', name: 'LND', pattern: /^v\d+\.\d+\.\d+-beta$/ },
});

export function validateSourceIdentity(source) {
  const rule = Object.hasOwn(SOURCE_RULES, source?.id) ? SOURCE_RULES[source.id] : null;
  if (!rule || source.url !== rule.url || source.parser !== rule.parser || source.kind !== rule.kind || source.maxAgeDays !== rule.maxAgeDays) throw new Error('invalid_source_identity');
}

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

export function parseRelease(text, now, parser = 'github-release-v1') {
  const rule = RELEASE_RULES[parser];
  const item = JSON.parse(text);
  if (!rule || item.draft !== false || item.prerelease !== false || !rule.pattern.test(item.tag_name ?? '') || item.html_url !== `https://github.com/${rule.repository}/releases/tag/${item.tag_name}`) throw new Error('wrong_release');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(item.published_at ?? '') || !Number.isFinite(Date.parse(item.published_at)) || new Date(item.published_at).toISOString().slice(0, 19) !== item.published_at.slice(0, 19) || Date.parse(item.published_at) > Date.parse(now)) throw new Error('invalid_source_date');
  return { sourceAsOf: item.published_at, observations: [{ metric: 'software_release', label: `${rule.name} latest returned release`, value: item.tag_name, unit: 'version', effectiveAt: item.published_at, timePrecision: 'second', classification: 'upstream-release' }] };
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
  const clock = typeof now === 'function' ? now : () => now;
  const base = { id: source.id, title: source.title, url: source.url, kind: source.kind, parserVersion: source.parser, checkedAt: clock(), status: 'unavailable', httpStatus: null, sourceAsOf: null, sourceSha256: null, freshness: 'unknown', observations: null, errorCode: null };
  let status = null;
  try {
    if (!ALLOWED_URLS.has(source.url)) throw new Error('url_not_allowlisted');
    validateSourceIdentity(source);
    const response = await fetcher(source.url, { redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': 'SatnamSatoshi-LTC/1.0 (+https://github.com/Satnam-Satoshi/Satoshi-Langar)', Accept: Object.hasOwn(RELEASE_RULES, source.parser) || Object.hasOwn(TICKER_RULES, source.parser) ? 'application/json' : 'text/csv,text/plain,text/html;q=0.8' } });
    status = response.status;
    if (!response.ok) throw new Error('http_failure');
    const contentType = response.headers.get('content-type') || '';
    if (!/(text\/(csv|plain|html)|application\/(json|octet-stream))/.test(contentType)) throw new Error('unexpected_content_type');
    const text = await boundedText(response);
    if (/cf-chl-|challenge-platform|<title[^>]*>\s*(?:Access Denied|Just a moment)/i.test(text)) throw new Error('source_challenge');
    const checkedAt = clock();
    const ticker = Object.hasOwn(TICKER_RULES, source.parser);
    const parsed = source.parser === 'ibit-csv-v1' ? parseIbit(text, checkedAt) : Object.hasOwn(RELEASE_RULES, source.parser) ? parseRelease(text, checkedAt, source.parser) : ticker ? parseTicker(text, checkedAt, source.parser) : { sourceAsOf: null, observations: null };
    return { ...base, ...parsed, checkedAt, httpStatus: status, status: parsed.observations ? 'collected' : 'reference-retrieved', sourceSha256: createHash('sha256').update(text).digest('hex'), freshness: ticker ? tickerFreshness(parsed.sourceAsOf, checkedAt) : freshness(parsed.sourceAsOf, checkedAt, source.maxAgeDays) };
  } catch (error) {
    const safeErrors = new Set(['url_not_allowlisted','invalid_source_identity','http_failure','response_too_large','empty_response','unexpected_content_type','source_challenge','malformed_csv','invalid_decimal','missing_source_date','invalid_source_date','wrong_product','missing_columns','wrong_asset','impossible_quantity','wrong_release','invalid_ticker']);
    return { ...base, httpStatus: status, errorCode: safeErrors.has(error.message) ? error.message : 'transport_or_parse_failure' };
  }
}

export async function collectSnapshot(config, { now, fetcher = fetch } = {}) {
  const clock = now === undefined ? () => new Date().toISOString() : () => now;
  if (!Number.isFinite(Date.parse(clock()))) throw new Error('invalid_run_time');
  if (!Array.isArray(config.sources) || config.sources.length === 0 || config.sources.length > ALLOWED_URLS.size || new Set(config.sources.map(source => source.id)).size !== config.sources.length) throw new Error('invalid_source_registry');
  config.sources.forEach(validateSourceIdentity);
  const collected = await Promise.all(config.sources.map(source => collectSource(source, clock, fetcher)));
  const generatedAt = clock();
  // This is the completion time of the batch check, not a market observation time.
  const sources = collected.map(source => ({ ...source, checkedAt: generatedAt, freshness: source.sourceAsOf ? (Object.hasOwn(TICKER_RULES, source.parserVersion) ? tickerFreshness(source.sourceAsOf, generatedAt) : freshness(source.sourceAsOf, generatedAt, SOURCE_RULES[source.id].maxAgeDays)) : 'unknown' }));
  return { schemaVersion: 1, publication: 'Lunch Time Conversations', generatedAt, timezone: 'America/New_York', scheduleStatus: 'collection-only; scheduler is separate', editorialStatus: 'automated-source-check', coverage: 'Coinbase Exchange BTC/USD and LTC/USD last-trade snapshots, IBIT holdings and official Bitcoin Core, Litecoin Core and LND releases; other sources are reference availability checks. No global price, ETF flow or mNAV calculation.', sourceCount: sources.length, failureCount: sources.filter(source => source.status === 'unavailable').length, sources };
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
