import { createHash } from 'node:crypto';

export const INTELLIGENCE_VERSION = 'ltc-intelligence-v1';
export const MAX_RESPONSE_BYTES = 2_000_000;
export const REQUEST_TIMEOUT_MS = 15_000;
export const MARKET_MAX_AGE_SECONDS = 900;
export const NETWORK_MAX_AGE_SECONDS = 172_800;
const DAY = 86_400_000;
const MORPHO_ENDPOINT = 'https://api.morpho.org/graphql';
const NETWORK_ID = 'public-block-apis';
export const BLOCK_SOURCES = Object.freeze([
 Object.freeze({id:'bitcoin-blocks',asset:'BTC',base:'https://mempool.space/api',genesis:'000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'}),
 Object.freeze({id:'litecoin-blocks',asset:'LTC',base:'https://litecoinspace.org/api',genesis:'12a765e31ffd4059bada1e25190f6e98c99d9714d334efa41a195a7e7e04bfe2'}),
]);
export const MAX_BLOCK_PAGES = 160;
const MORPHO_ID = 'morpho-verified-markets';
const DECIMAL = /^(?:0|[1-9]\d{0,59})(?:\.\d{1,30})?$/;
const INTEGER = /^(?:0|[1-9]\d{0,59})$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^[0-9a-f]{64}$/;
const STATE_FIELDS = ['borrowApy', 'supplyApy', 'utilization', 'liquidityUsdc', 'supplyUsdc', 'borrowUsdc'];
const USDC = { 5042: '0x3600000000000000000000000000000000000000', 8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' };
const route = (routeId, marketId, chainId, chain, symbol, address, lltv, oracleAddress, irmAddress) => Object.freeze({ routeId, marketId, chainId, chain, collateral: Object.freeze({ symbol, address, decimals: 8 }), loan: Object.freeze({ symbol: 'USDC', address: USDC[chainId], decimals: 6 }), lltv, oracleAddress, irmAddress, sourceId: MORPHO_ID });
export const MARKET_ROUTES = Object.freeze([
  route('arc-cirbtc-1', '0xc2db905f174e5defcce01d321b09f15f78856a36a21b90cc7e1abbc29225815d', 5042, 'Arc', 'cirBTC', '0x171A4217b86A807A64eB94757Db6849fb4bDbAA0', '0.86', '0x2AA87fF48933Ce6aBA240BEE916Fc2e6Ec1e51Ab', '0xF02615d094Fc02fC031C35fe705e175aA4653f20'),
  route('arc-cirbtc-2', '0xabd1763943714b96b6590238d484a240019b4b842eb67fbcff7d96c081b7b566', 5042, 'Arc', 'cirBTC', '0x171A4217b86A807A64eB94757Db6849fb4bDbAA0', '0.86', '0x2DE8026f00061170e1297d438967752b6671dd1d', '0xF02615d094Fc02fC031C35fe705e175aA4653f20'),
  route('base-cbbtc', '0x9103c3b4e834476c9a62ea009ba2c884ee42e94e6e314a26f04d312434191836', 8453, 'Base', 'cbBTC', '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', '0.86', '0x663BECd10daE6C4A3Dcd89F1d76c1174199639B9', '0x46415998764C29aB2a25CbeA6254146D50D22687'),
  route('base-cbltc', '0x9125d0fa03c3137166df68bcc72283477830de2a4a5536512374c573ad4583c3', 8453, 'Base', 'cbLTC', '0xcb17C9Db87B595717C857a08468793f5bAb6445F', '0.625', '0x47f961E6653423A77b1EF8Fb680eE53bf7d8a00d', '0x46415998764C29aB2a25CbeA6254146D50D22687'),
]);
export const MORPHO_QUERY = `{ markets(first: 4, where: {chainId_in: [5042,8453], uniqueKey_in: ${JSON.stringify(MARKET_ROUTES.map(r => r.marketId))}}) { items { marketId lltv oracle { address } irmAddress chain { id } loanAsset { address symbol decimals chain { id } price { usd timestamp } } collateralAsset { address symbol decimals chain { id } price { usd timestamp } } state { timestamp supplyApy borrowApy liquidityAssets supplyAssets borrowAssets utilization } } } }`;
const MORPHO_BODY = JSON.stringify({ query: MORPHO_QUERY });
const UNITS = Object.freeze({ transactions: 'transactions', blocks: 'blocks', activeAddresses: 'addresses', feesNative: 'native coin', meanFeeNative: 'native coin per transaction' });
const NOTES = Object.freeze([
  'LTC Media sums explorer-reported base-chain transaction counts, including coinbase transactions, for blocks whose median time falls inside the completed UTC day. Transactions are not payments or unique people.',
  'The window uses block median time, not wall-clock arrival time or a rolling 24-hour provider statistic. Height and parent-hash continuity and both daily boundaries must pass before totals are accepted.',
  'Fee and active-address fields are unavailable from this block-summary adapter and remain null. Explorer records are not an independently operated full-node audit.',
  'Morpho APYs are variable annualized decimal fractions at the recorded state time, excluding incentive rewards. USDC supply APY is distinct from supplying wrapped collateral.',
  'Markets are four configured routes, not an exhaustive list or a recommendation. No position, wallet, signing or transaction endpoint is queried.',
  'Rate history can grow only from actual archived edition observations; missing days and stale rates are not interpolated.',
]);
const ATTRIBUTION = Object.freeze({ name: 'LTC Media calculations from mempool.space and Litecoin Space block records', url: 'https://mempool.space/docs/api/rest', litecoinUrl: 'https://litecoinspace.org/docs/api' });

function check(ok, message) { if (!ok) throw new Error(message); }
export function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function stamp(value) {
  check(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value), 'Invalid UTC timestamp');
  const ms = Date.parse(value);
  check(Number.isFinite(ms), 'Invalid UTC timestamp');
  const expected = value.replace(/(?:\.\d+)?Z$/, '');
  check(new Date(ms).toISOString().slice(0, 19) === expected, 'Impossible UTC timestamp');
  return ms;
}
function currentMs(now) { return now === undefined ? Date.now() : now instanceof Date ? stamp(now.toISOString()) : stamp(now); }
function iso(ms) { return new Date(ms).toISOString(); }
export function intelligenceDate(now) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(currentMs(now)));
  const p = Object.fromEntries(parts.map(v => [v.type, v.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function trim(value) { return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value; }
export function decimal(value, { integer = false, positive = false, max = null } = {}) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    check(Number.isFinite(value) && value >= 0 && (!integer || Number.isSafeInteger(value)), 'Invalid numeric value');
    value = String(value);
    if (/e/i.test(value)) {
      const [coefficient, power] = value.toLowerCase().split('e');
      const digits = coefficient.replace('.', '');
      const offset = (coefficient.indexOf('.') < 0 ? coefficient.length : coefficient.indexOf('.')) + Number(power);
      value = offset <= 0 ? `0.${'0'.repeat(-offset)}${digits}` : offset >= digits.length ? digits + '0'.repeat(offset - digits.length) : `${digits.slice(0, offset)}.${digits.slice(offset)}`;
    }
  }
  check(typeof value === 'string' && (integer ? INTEGER : DECIMAL).test(value), 'Malformed decimal');
  check(!positive || Number(value) > 0, 'Nonpositive decimal');
  check(max === null || Number(value) <= max, 'Decimal outside range');
  return trim(value);
}
export function divideDecimal(numerator, denominator, places = 12) {
  check(Number.isInteger(places) && places >= 1 && places <= 30, 'Invalid division precision');
  const n = decimal(numerator); const d = decimal(denominator);
  if (n === null || d === null || Number(d) === 0) return null;
  const [ni, nf = ''] = n.split('.'); const [di, df = ''] = d.split('.');
  const q = BigInt(ni + nf) * 10n ** BigInt(df.length + places) / (BigInt(di + df) * 10n ** BigInt(nf.length));
  const s = q.toString().padStart(places + 1, '0');
  return trim(`${s.slice(0, -places)}.${s.slice(-places)}`);
}
function tokenUnits(raw, decimals) {
  const n = decimal(raw, { integer: true }); if (n === null) return null;
  const s = n.padStart(decimals + 1, '0'); return trim(`${s.slice(0, -decimals)}.${s.slice(-decimals)}`);
}
function sameAddress(a, b) { return typeof a === 'string' && ADDRESS.test(a) && a.toLowerCase() === b.toLowerCase(); }
function utcWindow(start) { return { start: iso(start), end: iso(start + DAY), timezone: 'UTC', frequency: '1d' }; }
export function networkRequest(now) {
  const ms = currentMs(now); const end = Math.floor(ms / DAY) * DAY;
  return { requestedWindow: { start: iso(end - DAY), end: iso(end) } };
}
export function intelligenceRequests(now) { return [...BLOCK_SOURCES.map(s => ({ id:s.id, url:`${s.base}/blocks`, method:'GET', requestedWindow:networkRequest(now).requestedWindow })), { id: MORPHO_ID, url: MORPHO_ENDPOINT, method: 'POST', body: MORPHO_BODY }]; }
export function compareTransactions(assets) {
  const btc = assets.find(a => a.asset === 'BTC')?.transactions; const ltc = assets.find(a => a.asset === 'LTC')?.transactions;
  if (btc === null || ltc === null || btc === undefined || ltc === undefined) return { transactionRatioLtcToBtc: null, transactionDifferenceLtcMinusBtc: null };
  decimal(btc, { integer: true }); decimal(ltc, { integer: true });
  return { transactionRatioLtcToBtc: divideDecimal(ltc, btc), transactionDifferenceLtcMinusBtc: (BigInt(ltc) - BigInt(btc)).toString() };
}
function emptyNetworkAsset(asset) { return { asset, transactions:null, blocks:null, feesNative:null, meanFeeNative:null, activeAddresses:null, verification:null }; }
function missingNetwork(window) { return { status:'missing', sourceId:NETWORK_ID, sourceIds:BLOCK_SOURCES.map(s=>s.id), window, assets:BLOCK_SOURCES.map(s=>emptyNetworkAsset(s.asset)), comparison:compareTransactions([]), history:[], units:{...UNITS}, attribution:{...ATTRIBUTION}, gaps:['A complete common-day BTC/LTC comparison is unavailable.'] }; }
function validateBlockRecord(block, previous, ms) {
  check(block && typeof block.id==='string' && HASH.test(block.id) && typeof block.previousblockhash==='string' && HASH.test(block.previousblockhash) && Number.isSafeInteger(block.height) && block.height>0, 'Invalid block identity');
  check(Number.isSafeInteger(block.timestamp) && Number.isSafeInteger(block.mediantime) && block.mediantime>0 && block.mediantime<=block.timestamp && block.timestamp*1000<=ms, 'Invalid or future block time');
  check(Number.isSafeInteger(block.tx_count) && block.tx_count>=1 && block.tx_count<=10_000_000, 'Invalid block transaction count');
  if(previous) check(previous.height===block.height+1 && previous.previousblockhash===block.id && previous.mediantime>=block.mediantime, 'Discontinuous block range');
}
export function aggregateBlocks(blocks, { asset, window, now } = {}) {
  const ms=currentMs(now); const start=stamp(window.start); const end=stamp(window.end);
  check(['BTC','LTC'].includes(asset) && end-start===DAY && start%DAY===0 && end<=ms, 'Invalid block window');
  check(Array.isArray(blocks) && blocks.length>1 && blocks.length<=MAX_BLOCK_PAGES*10, 'Incomplete block range');
  let previous=null; const selected=[];
  for (const block of blocks) {
    validateBlockRecord(block, previous, ms);
    if(block.mediantime*1000>=start && block.mediantime*1000<end) selected.push(block);
    previous=block;
  }
  check(blocks[0].mediantime*1000>=end && blocks.at(-1).mediantime*1000<start, 'Missing daily boundary');
  const anchor=b=>({height:b.height,hash:b.id,medianTime:iso(b.mediantime*1000)});
  return {asset,transactions:selected.reduce((n,b)=>n+BigInt(b.tx_count),0n).toString(),blocks:String(selected.length),feesNative:null,meanFeeNative:null,activeAddresses:null,verification:{method:'median-time-past',scannedBlocks:blocks.length,tip:anchor(blocks[0]),lowerBoundary:anchor(blocks.at(-1)),firstBlock:selected.length?anchor(selected.at(-1)):null,lastBlock:selected.length?anchor(selected[0]):null}};
}
export function normalizeBlockNetwork(results, {now,window=utcWindow(stamp(networkRequest(now).requestedWindow.start))}={}) {
  const n=missingNetwork(window);
  n.assets=BLOCK_SOURCES.map(s=>results[s.id] || emptyNetworkAsset(s.asset));
  const complete=n.assets.every(a=>a.transactions!==null);
  n.status=complete ? (currentMs(now)-stamp(window.end)<=NETWORK_MAX_AGE_SECONDS*1000?'fresh':'stale') : n.assets.some(a=>a.transactions!==null)?'partial':'missing';
  n.comparison=compareTransactions(n.assets);
  n.gaps=complete?['Fees and active addresses are unavailable from the accepted block-summary records.']:['A complete common-day BTC/LTC comparison is unavailable.'];
  if(complete) n.history=[{window:n.window,assets:n.assets,comparison:n.comparison}];
  return n;
}
function freshStamp(timestamp, nowMs) {
  if (timestamp === null || timestamp === undefined) return { asOf: null, freshness: 'missing' };
  check(Number.isSafeInteger(timestamp) && timestamp > 0, 'Invalid source timestamp');
  check(timestamp * 1000 <= nowMs, 'Future source timestamp');
  return { asOf: iso(timestamp * 1000), freshness: nowMs - timestamp * 1000 <= MARKET_MAX_AGE_SECONDS * 1000 ? 'fresh' : 'stale' };
}
function blankState(freshness = 'missing', asOf = null) { return { asOf, freshness, borrowApy: null, supplyApy: null, utilization: null, liquidityUsdc: null, supplyUsdc: null, borrowUsdc: null }; }
function blankPrice(status = 'missing', asOf = null) { return { value: null, asOf, status, unit: 'USD' }; }
function missingMarket(r, reason = 'Market source unavailable.', status = 'missing') { return { ...r, status, state: blankState(status), prices: { collateralUsd: blankPrice(status), usdcUsd: blankPrice(status) }, gaps: [reason] }; }
function normalizePrice(price, nowMs) {
  const age = freshStamp(price?.timestamp, nowMs); const value = decimal(price?.usd, { positive: true });
  return { value: age.freshness === 'fresh' ? value : null, asOf: age.asOf, status: value === null && age.freshness === 'fresh' ? 'missing' : age.freshness, unit: 'USD' };
}
export function normalizeMorphoMarket(raw, expected, { now } = {}) {
  const ms = currentMs(now);
  if (!raw) return missingMarket(expected, 'Configured market was not returned.');
  check(raw.marketId === expected.marketId && raw.chain?.id === expected.chainId, 'Wrong market or chain');
  for (const [key, token] of [['loanAsset', expected.loan], ['collateralAsset', expected.collateral]]) {
    check(sameAddress(raw[key]?.address, token.address) && raw[key]?.symbol === token.symbol && raw[key]?.decimals === token.decimals && raw[key]?.chain?.id === expected.chainId, 'Wrong token identity or decimals');
  }
  check(tokenUnits(raw.lltv, 18) === expected.lltv, 'Wrong LLTV');
  check(sameAddress(raw.oracle?.address, expected.oracleAddress) && sameAddress(raw.irmAddress, expected.irmAddress), 'Wrong oracle or rate model');
  const age = freshStamp(raw.state?.timestamp, ms);
  const state = blankState(age.freshness, age.asOf); const gaps = [];
  if (age.freshness === 'fresh') {
    state.borrowApy = decimal(raw.state?.borrowApy, { max: 1000 }); state.supplyApy = decimal(raw.state?.supplyApy, { max: 1000 }); state.utilization = decimal(raw.state?.utilization, { max: 1 });
    state.liquidityUsdc = tokenUnits(raw.state?.liquidityAssets, 6); state.supplyUsdc = tokenUnits(raw.state?.supplyAssets, 6); state.borrowUsdc = tokenUnits(raw.state?.borrowAssets, 6);
    if (STATE_FIELDS.some(k => state[k] === null)) gaps.push('Some current state fields are unavailable.');
  } else gaps.push(age.freshness === 'stale' ? 'State is older than 15 minutes; rates and liquidity are withheld.' : 'State timestamp is unavailable; rates and liquidity are withheld.');
  const prices = { collateralUsd: normalizePrice(raw.collateralAsset?.price, ms), usdcUsd: normalizePrice(raw.loanAsset?.price, ms) };
  if (Object.values(prices).some(p => p.status !== 'fresh')) gaps.push('One or more token prices are unavailable or older than 15 minutes.');
  return { ...expected, status: state.freshness, state, prices, gaps };
}
export function normalizeMorpho(payload, { now } = {}) {
  check(payload && !payload.errors && Array.isArray(payload.data?.markets?.items) && payload.data.markets.items.length <= MARKET_ROUTES.length, 'Invalid Morpho response');
  const items = payload.data.markets.items; const keys = new Set();
  for (const item of items) {
    const key = `${item.chain?.id}:${item.marketId}`;
    check(!keys.has(key) && MARKET_ROUTES.some(r => r.marketId === item.marketId && r.chainId === item.chain?.id), 'Unexpected or duplicate market'); keys.add(key);
  }
  return MARKET_ROUTES.map(r => {
    const raw = items.find(item => item.marketId === r.marketId && item.chain?.id === r.chainId);
    try { return normalizeMorphoMarket(raw, r, { now }); } catch { return missingMarket(r, 'Market failed identity, value or timestamp validation.', 'invalid'); }
  });
}
function safeError(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'Request timed out.';
  if (error?.message === 'Response exceeded byte limit') return 'Response exceeded byte limit.';
  return 'Public source request or response validation failed.';
}
export async function readBoundedResponse(response, limit = MAX_RESPONSE_BYTES) {
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null && Number(contentLength) > limit) throw Error('Response exceeded byte limit');
  check(response.body, 'Missing response body');
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) throw Error('Response exceeded byte limit'); chunks.push(Buffer.from(value)); } } finally { await reader.cancel().catch(() => {}); }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}
async function fetchRecord(request, {now,fetchImpl,onEvidence,index=0}={}) {
  let raw=null; const record={url:request.url,retrievedAt:null,sha256:null,httpStatus:null};
  try {
    const response=await fetchImpl(request.url,{method:request.method||'GET',redirect:'error',headers:{Accept:'application/json',...(request.body?{'Content-Type':'application/json'}:{})},...(request.body?{body:request.body}:{}),signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
    check(!response.redirected && (response.url==='' || response.url===request.url),'Redirect refused'); record.httpStatus=response.status;
    raw=await readBoundedResponse(response); record.sha256=sha256(raw);
    if(response.status===429 || (response.status===503 && /rate limited/i.test(raw))) throw Error('Public block API rate limited.');
    check(response.ok && response.status===200,'Source HTTP failure');
  } catch(error) { record.error=error.message==='Public block API rate limited.'?error.message:safeError(error); }
  record.retrievedAt=now===undefined?new Date().toISOString():iso(currentMs(now));
  if(onEvidence) await onEvidence({source:{...record,id:request.id,index},raw});
  return {record,raw};
}
async function collectBlockSource(config,{now,fetchImpl,onEvidence,waitImpl,window}={}) {
  const source={id:config.id,url:`${config.base}/blocks`,method:'GET',parserVersion:INTELLIGENCE_VERSION,retrievedAt:iso(currentMs(now)),sha256:null,requestSha256:null,httpStatus:null,status:'failed',requestedWindow:{start:window.start,end:window.end},pages:[]};
  const get=async suffix=>{
    const url=`${config.base}${suffix}`;
    check(/^\/(?:blocks(?:\/\d+)?|block-height\/\d+)$/.test(suffix),'Unapproved block endpoint');
    if(source.pages.length) await waitImpl(1500);
    const {record,raw}=await fetchRecord({id:config.id,url},{now,fetchImpl,onEvidence,index:source.pages.length}); source.pages.push(record);
    source.retrievedAt=record.retrievedAt;source.httpStatus=record.httpStatus;
    if(record.error) throw Error(record.error);
    return raw;
  };
  let result=null;
  try {
    const genesis=await get('/block-height/0');check(genesis.trim()===config.genesis,'Wrong genesis');
    const blocks=[];
    for(let page=0;page<MAX_BLOCK_PAGES;page++) {
      const payload=JSON.parse(await get(page?`/blocks/${blocks.at(-1).height-1}`:'/blocks'));
      check(Array.isArray(payload) && payload.length===10,'Invalid block page');
      for(const rawBlock of payload) {
        const b={id:rawBlock?.id,previousblockhash:rawBlock?.previousblockhash,height:rawBlock?.height,timestamp:rawBlock?.timestamp,mediantime:rawBlock?.mediantime,tx_count:rawBlock?.tx_count};
        validateBlockRecord(b,blocks.at(-1),currentMs(now));blocks.push(b);
      }
      check(blocks[0].mediantime*1000>=stamp(window.end),'Incomplete upper daily boundary');
      if(blocks.at(-1)?.mediantime*1000<stamp(window.start)) break;
    }
    result=aggregateBlocks(blocks,{asset:config.asset,window,now:now===undefined?new Date().toISOString():now});
    check((await get(`/block-height/${blocks[0].height}`)).trim()===blocks[0].id,'Chain changed during collection');
    source.status='retrieved';
  } catch(error) {source.error=error.message==='Public block API rate limited.'?error.message:'Block source unavailable or failed range validation.';result=null;}
  source.sha256=source.pages.some(p=>p.sha256!==null)?sha256(JSON.stringify(source.pages.map(p=>p.sha256))):null;
  return {source,result};
}
export async function collectIntelligence({ now, fetchImpl = globalThis.fetch, onEvidence, deferredSources=[], waitImpl=ms=>new Promise(resolve=>setTimeout(resolve,ms)) } = {}) {
  const started=iso(currentMs(now));const window=utcWindow(stamp(networkRequest(started).requestedWindow.start)); const sources=[];const blockResults={};
  check(Array.isArray(deferredSources)&&deferredSources.every(id=>BLOCK_SOURCES.some(s=>s.id===id)), 'Invalid deferred source');
  for(const config of BLOCK_SOURCES) {
    if(deferredSources.includes(config.id)){sources.push({id:config.id,url:`${config.base}/blocks`,method:'GET',parserVersion:INTELLIGENCE_VERSION,retrievedAt:null,sha256:null,requestSha256:null,httpStatus:null,status:'deferred',requestedWindow:{start:window.start,end:window.end},pages:[],error:'Public block API rate limited earlier this run; no retry.'});continue;}
    const {source,result}=await collectBlockSource(config,{now,fetchImpl,onEvidence,waitImpl,window});sources.push(source);if(result)blockResults[config.id]=result;
  }
  // Fetch rates last, so the bounded block scan cannot age an earlier rate quote.
  const request={id:MORPHO_ID,url:MORPHO_ENDPOINT,method:'POST',body:MORPHO_BODY};
  const {record,raw}=await fetchRecord(request,{now,fetchImpl,onEvidence});
  const morpho={id:MORPHO_ID,url:MORPHO_ENDPOINT,method:'POST',parserVersion:INTELLIGENCE_VERSION,retrievedAt:record.retrievedAt,sha256:record.sha256,requestSha256:sha256(MORPHO_BODY),httpStatus:record.httpStatus,status:record.error?'failed':'retrieved',...(record.error?{error:record.error}:{})};
  let payload;try{payload=raw===null?null:JSON.parse(raw);}catch{morpho.status='invalid';morpho.error='Market response structure validation failed.';}
  sources.push(morpho);
  const collectedAt=now===undefined?new Date().toISOString():started;
  return buildIntelligence({collectedAt,sources,blockResults,morphoPayload:payload,window});
}
export function buildIntelligence({collectedAt,sources,blockResults={},morphoPayload,window=utcWindow(stamp(networkRequest(collectedAt).requestedWindow.start))}) {
  stamp(collectedAt); const copiedSources=structuredClone(sources); const morpho=copiedSources.find(s=>s.id===MORPHO_ID);
  const network=normalizeBlockNetwork(blockResults,{now:collectedAt,window});let markets=MARKET_ROUTES.map(r=>missingMarket(r));
  if(morpho?.status==='retrieved') {try {markets=normalizeMorpho(morphoPayload,{now:collectedAt});}catch{morpho.status='invalid';morpho.error='Market response structure validation failed.';markets=MARKET_ROUTES.map(r=>missingMarket(r,morpho.error,'invalid'));}}
  return {schemaVersion:1,parserVersion:INTELLIGENCE_VERSION,collectedAt,evaluatedAt:collectedAt,asOfDate:intelligenceDate(collectedAt),timeZone:'America/New_York',network,markets,sources:copiedSources,notes:[...NOTES],gaps:[...(network.status!=='fresh'?['A fresh common network comparison is unavailable.']:[]),...(markets.some(m=>m.status!=='fresh'||m.gaps.length>0)?['Some configured Morpho fields are unavailable or stale.']:[])]};
}
const canonical = value => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
function equal(a, b, message) { check(canonical(a) === canonical(b), message); }
function allowedKeys(object, keys) { check(object && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).every(k => keys.includes(k)), 'Unexpected intelligence fields'); }
function validateSource(source,request,collectedMs) {
  allowedKeys(source,['id','url','method','parserVersion','retrievedAt','sha256','requestSha256','httpStatus','status','requestedWindow','error','pages']);
  check(source.id===request.id && source.url===request.url && source.method===request.method && source.parserVersion===INTELLIGENCE_VERSION,'Wrong intelligence source registry');
  check(source.requestSha256===(request.body?sha256(request.body):null),'Wrong source request digest');
  if(request.requestedWindow) equal(source.requestedWindow,request.requestedWindow,'Wrong source window');
  if(source.status==='deferred'){check(BLOCK_SOURCES.some(s=>s.id===source.id)&&source.retrievedAt===null&&source.sha256===null&&source.httpStatus===null&&source.pages?.length===0&&source.error==='Public block API rate limited earlier this run; no retry.','Invalid deferred source');return;}
  const fetched=stamp(source.retrievedAt);check(fetched<=collectedMs && collectedMs-fetched<=3_600_000,'Invalid intelligence retrieval timestamp');
  check(['retrieved','failed','invalid'].includes(source.status),'Invalid source status');
  check(source.sha256===null || (typeof source.sha256==='string' && HASH.test(source.sha256)),'Invalid source digest');
  check(source.httpStatus===null || (Number.isInteger(source.httpStatus) && source.httpStatus>=100 && source.httpStatus<=599),'Invalid HTTP status');
  if(source.status==='retrieved') check(source.sha256 && source.httpStatus===200 && source.error===undefined,'Unverified source marked retrieved');
  if(source.error!==undefined) check(['Request timed out.','Response exceeded byte limit.','Public source request or response validation failed.','Market response structure validation failed.','Block source unavailable or failed range validation.','Public block API rate limited.'].includes(source.error),'Unexpected source error text');
  if(source.id!==MORPHO_ID) {
    const cfg=BLOCK_SOURCES.find(s=>s.id===source.id);check(Array.isArray(source.pages) && source.pages.length>=1 && source.pages.length<=MAX_BLOCK_PAGES+2,'Invalid block evidence');
    let previous=0;
    for(const page of source.pages) {allowedKeys(page,['url','retrievedAt','sha256','httpStatus','error']);const suffix=page.url?.slice(cfg.base.length);check(page.url?.startsWith(cfg.base) && /^\/(?:blocks(?:\/\d+)?|block-height\/\d+)$/.test(suffix),'Unapproved block evidence URL');const at=stamp(page.retrievedAt);check(at>=previous && at<=fetched && collectedMs-at<=3_600_000,'Invalid block evidence time');previous=at;check(page.sha256===null || HASH.test(page.sha256),'Invalid block evidence hash');check(page.httpStatus===null || (Number.isInteger(page.httpStatus) && page.httpStatus>=100 && page.httpStatus<=599),'Invalid block evidence status');if(page.error!==undefined)check(['Request timed out.','Response exceeded byte limit.','Public source request or response validation failed.','Public block API rate limited.'].includes(page.error),'Unexpected block error text');if(source.status==='retrieved')check(page.httpStatus===200 && page.sha256 && !page.error,'Unverified block page');}
    equal(source.sha256,source.pages.some(p=>p.sha256!==null)?sha256(JSON.stringify(source.pages.map(p=>p.sha256))):null,'Wrong block evidence digest');
    check(source.pages[0].url===`${cfg.base}/block-height/0`,'Missing chain identity evidence');
  } else check(source.pages===undefined,'Unexpected Morpho pages');
}
function validateNetworkAsset(a,index,window,sources) {
  allowedKeys(a,['asset','transactions','blocks','feesNative','meanFeeNative','activeAddresses','verification']);
  const cfg=BLOCK_SOURCES[index];check(a.asset===cfg.asset,'Wrong network asset');
  for(const key of ['transactions','blocks'])check(decimal(a[key],{integer:true})===a[key],'Invalid network count');
  check(a.feesNative===null && a.meanFeeNative===null && a.activeAddresses===null,'Unmeasured network fields');
  if(a.transactions===null) {equal(a,emptyNetworkAsset(cfg.asset),'Incomplete missing network record');return;}
  check(sources[index].status==='retrieved' && a.blocks!==null && BigInt(a.transactions)>=BigInt(a.blocks),'Network values without verified source');
  const v=a.verification;allowedKeys(v,['method','scannedBlocks','tip','lowerBoundary','firstBlock','lastBlock']);check(v.method==='median-time-past' && Number.isSafeInteger(v.scannedBlocks) && v.scannedBlocks>=2 && v.scannedBlocks<=MAX_BLOCK_PAGES*10,'Invalid network verification');
  for(const anchor of [v.tip,v.lowerBoundary,v.firstBlock,v.lastBlock].filter(Boolean)) {allowedKeys(anchor,['height','hash','medianTime']);check(Number.isSafeInteger(anchor.height)&&anchor.height>0&&HASH.test(anchor.hash),'Invalid block anchor');check(stamp(anchor.medianTime)<=stamp(sources[index].retrievedAt),'Future block anchor');}
  check(v.tip.height-v.lowerBoundary.height+1===v.scannedBlocks && stamp(v.tip.medianTime)>=stamp(window.end) && stamp(v.lowerBoundary.medianTime)<stamp(window.start),'Incomplete verified block span');
  const pages=sources[index].pages;check(pages.at(-1).url===`${cfg.base}/block-height/${v.tip.height}` && pages[1]?.url===`${cfg.base}/blocks`,'Missing canonical chain recheck');
  if(a.blocks==='0') check(v.firstBlock===null && v.lastBlock===null && a.transactions==='0','Wrong empty-day count');
  else {check(v.firstBlock && v.lastBlock && v.firstBlock.height>v.lowerBoundary.height && v.lastBlock.height<=v.tip.height && v.lastBlock.height-v.firstBlock.height+1===Number(a.blocks),'Wrong block count');for(const b of [v.firstBlock,v.lastBlock])check(stamp(b.medianTime)>=stamp(window.start)&&stamp(b.medianTime)<stamp(window.end),'Block outside daily window');}
}
function validateState(state, collectedMs) {
  allowedKeys(state, ['asOf', 'freshness', ...STATE_FIELDS]);
  check(['fresh', 'stale', 'missing', 'invalid'].includes(state.freshness), 'Invalid market freshness');
  if (state.asOf !== null) {
    const time = stamp(state.asOf); check(time <= collectedMs, 'Future market timestamp');
    const age = collectedMs - time;
    if (state.freshness === 'fresh') check(age <= MARKET_MAX_AGE_SECONDS * 1000, 'Stale market marked fresh');
    if (state.freshness === 'stale') check(age > MARKET_MAX_AGE_SECONDS * 1000, 'Fresh market marked stale');
  } else check(state.freshness === 'missing' || state.freshness === 'invalid', 'Missing market timestamp');
  for (const key of STATE_FIELDS) {
    if (state.freshness !== 'fresh') check(state[key] === null, 'Stale state contains a quote');
    else check(decimal(state[key], { max: key === 'utilization' ? 1 : ['borrowApy', 'supplyApy'].includes(key) ? 1000 : null }) === state[key], 'Invalid market quote');
  }
}
function validatePrice(price, collectedMs) {
  allowedKeys(price, ['value', 'asOf', 'status', 'unit']);
  check(price.unit === 'USD' && ['fresh', 'stale', 'missing', 'invalid'].includes(price.status), 'Invalid price');
  if (price.asOf !== null) { const ms = stamp(price.asOf); check(ms <= collectedMs, 'Future price'); if (price.status === 'fresh') check(collectedMs - ms <= MARKET_MAX_AGE_SECONDS * 1000, 'Stale price marked fresh'); if (price.status === 'stale') check(collectedMs - ms > MARKET_MAX_AGE_SECONDS * 1000, 'Fresh price marked stale'); }
  if (price.status === 'fresh') check(price.asOf !== null && price.value !== null && decimal(price.value, { positive: true }) === price.value, 'Invalid fresh price');
  else check(price.value === null, 'Unavailable price contains quote');
}
export function validateIntelligence(snapshot,{now,editionDate}={}) {
  const ms=currentMs(now);const collectedMs=stamp(snapshot?.collectedAt); const evaluationMs=stamp(snapshot?.evaluatedAt);
  check(collectedMs<=evaluationMs && evaluationMs<=ms && ms-collectedMs<=DAY,'Intelligence collection is stale or future');
  allowedKeys(snapshot,['schemaVersion','parserVersion','collectedAt','evaluatedAt','asOfDate','timeZone','network','markets','sources','notes','gaps']);
  check(snapshot.schemaVersion===1&&snapshot.parserVersion===INTELLIGENCE_VERSION&&snapshot.timeZone==='America/New_York'&&snapshot.asOfDate===intelligenceDate(snapshot.collectedAt),'Invalid intelligence header');
  if(editionDate)check(snapshot.asOfDate===editionDate,'Intelligence belongs to another edition date');
  check(Array.isArray(snapshot.sources)&&snapshot.sources.length===3,'Incomplete intelligence source registry');
  const requestTime=snapshot.sources[0]?.requestedWindow?.end;stamp(requestTime);
  check(stamp(requestTime)<=collectedMs&&collectedMs-stamp(requestTime)<DAY+3_600_000,'Unexpected request day');
  const requests=intelligenceRequests(requestTime);snapshot.sources.forEach((s,i)=>validateSource(s,requests[i],collectedMs));
  const n=snapshot.network;allowedKeys(n,['status','sourceId','sourceIds','window','assets','comparison','history','units','attribution','gaps']);
  check(n.sourceId===NETWORK_ID,'Invalid network source');equal(n.sourceIds,BLOCK_SOURCES.map(s=>s.id),'Wrong network sources');equal(n.units,UNITS,'Wrong network units');equal(n.attribution,ATTRIBUTION,'Wrong network attribution');
  equal(n.window,utcWindow(stamp(requests[0].requestedWindow.start)),'Wrong network interval');check(stamp(n.window.end)<=collectedMs,'Future network interval');
  check(Array.isArray(n.assets)&&n.assets.length===2,'Wrong network asset count');n.assets.forEach((a,i)=>validateNetworkAsset(a,i,n.window,snapshot.sources));
  const expected=normalizeBlockNetwork(Object.fromEntries(n.assets.filter(a=>a.transactions!==null).map(a=>[BLOCK_SOURCES.find(s=>s.asset===a.asset).id,a])),{now:iso(evaluationMs),window:n.window});equal(n,expected,'Inconsistent network result');
  check(Array.isArray(snapshot.markets)&&snapshot.markets.length===MARKET_ROUTES.length,'Wrong market count');
  snapshot.markets.forEach((market,i)=>{
    const r=MARKET_ROUTES[i];allowedKeys(market,[...Object.keys(r),'status','state','prices','gaps']);for(const key of Object.keys(r))equal(market[key],r[key],'Wrong pinned market identity');
    validateState(market.state,evaluationMs);check(market.status===market.state.freshness,'Wrong market status');allowedKeys(market.prices,['collateralUsd','usdcUsd']);Object.values(market.prices).forEach(p=>validatePrice(p,evaluationMs));check(Object.keys(market.prices).length===2,'Missing token price status');
    for(const time of [market.state.asOf,...Object.values(market.prices).map(p=>p.asOf)].filter(Boolean))check(stamp(time)<=stamp(snapshot.sources[2].retrievedAt),'Source effective time after retrieval');
    if(market.status==='fresh'||Object.values(market.prices).some(p=>p.status==='fresh'))check(snapshot.sources[2].status==='retrieved','Market values without source');
    check(Array.isArray(market.gaps)&&market.gaps.length<=3&&market.gaps.every(g=>['Market source unavailable.','Configured market was not returned.','Market failed identity, value or timestamp validation.','Market response structure validation failed.','Some current state fields are unavailable.','State is older than 15 minutes; rates and liquidity are withheld.','State timestamp is unavailable; rates and liquidity are withheld.','One or more token prices are unavailable or older than 15 minutes.'].includes(g)),'Invalid market gap');
  });
  equal(snapshot.notes,NOTES,'Unexpected methodology');equal(snapshot.gaps,[...(n.status!=='fresh'?['A fresh common network comparison is unavailable.']:[]),...(snapshot.markets.some(m=>m.status!=='fresh'||m.gaps.length>0)?['Some configured Morpho fields are unavailable or stale.']:[])],'Invalid intelligence gaps');
  return structuredClone(snapshot);
}
export function refreshIntelligenceForPublication(snapshot, { now, editionDate } = {}) {
  const result = validateIntelligence(snapshot, { now, editionDate }); const ms = currentMs(now); result.evaluatedAt=iso(ms);
  for (const market of result.markets) {
    if (market.state.freshness === 'fresh' && ms - stamp(market.state.asOf) > MARKET_MAX_AGE_SECONDS * 1000) {
      market.state = blankState('stale', market.state.asOf); market.status = 'stale';
      market.gaps = market.gaps.filter(g => g !== 'Some current state fields are unavailable.');
      market.gaps.push('State is older than 15 minutes; rates and liquidity are withheld.');
    }
    for (const price of Object.values(market.prices)) if (price.status === 'fresh' && ms - stamp(price.asOf) > MARKET_MAX_AGE_SECONDS * 1000) { price.status = 'stale'; price.value = null; }
    if (Object.values(market.prices).some(p => p.status !== 'fresh') && !market.gaps.includes('One or more token prices are unavailable or older than 15 minutes.')) market.gaps.push('One or more token prices are unavailable or older than 15 minutes.');
  }
  // Preserve collection provenance while re-evaluating quote availability at publication.
  if (result.network.status === 'fresh' && ms - stamp(result.network.window.end) > NETWORK_MAX_AGE_SECONDS * 1000) result.network.status = 'stale';
  result.gaps = [ ...(result.network.status !== 'fresh' ? ['A fresh common network comparison is unavailable.'] : []), ...(result.markets.some(m => m.status !== 'fresh' || m.gaps.length > 0) ? ['Some configured Morpho fields are unavailable or stale.'] : []) ];
  return result;
}
