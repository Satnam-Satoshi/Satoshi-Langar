/** Read-only public chain observation; never extrapolates the block height. */
export const CHAIN_URL = 'https://api.blockcypher.com/v1/ltc/main';
const MAX_BYTES = 100_000;
const HASH = /^[a-f0-9]{64}$/;
function timestamp(value, now, maximumAge) {
  if (typeof value !== 'string') throw new Error('invalid_timestamp');
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time > now + 60_000 || now - time > maximumAge) throw new Error('stale_timestamp');
  return new Date(time).toISOString();
}
function height(value) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('invalid_height');
  return value;
}
export function validateChain(data, now) {
  if (!data || data.name !== 'LTC.main' || !HASH.test(data.hash)) throw new Error('invalid_chain');
  return { height: height(data.height), hash: data.hash, observedAt: timestamp(data.time, now, 20 * 60_000) };
}
export function validateBlock(data, chain, now) {
  if (!data || data.hash !== chain.hash || data.height !== chain.height) throw new Error('invalid_block');
  return timestamp(data.time, now, 2 * 60 * 60_000);
}
async function fetchJSON(url, fetcher, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('source_timeout')); }, timeoutMs);
  });
  const operation = (async () => {
    const response = await fetcher(url, { method: 'GET', signal: controller.signal, redirect: 'error', cache: 'no-store', headers: { accept: 'application/json' } });
    if (!response.ok || response.redirected) throw new Error('source_unavailable');
    const length = response.headers.get('content-length');
    if (length && Number(length) > MAX_BYTES) throw new Error('oversized_source');
    if (!response.body) throw new Error('empty_source');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0, text = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error('oversized_source');
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
      return JSON.parse(text);
    } finally { await reader.cancel().catch(() => {}); }
  })();
  try { return await Promise.race([operation, timeout]); }
  finally { clearTimeout(timer); controller.abort(); }
}
function json(body, status, method, cache = false) {
  return new Response(method === 'HEAD' ? null : JSON.stringify(body), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'vercel-cdn-cache-control': cache ? 'public, max-age=60' : 'no-store',
    'x-content-type-options': 'nosniff',
    ...(status === 405 ? { allow: 'GET, HEAD' } : {}),
  } });
}
export async function litecoinChainResponse(request, { fetcher = fetch, clock = Date.now, timeoutMs = 4000 } = {}) {
  if (!['GET', 'HEAD'].includes(request.method)) return json({ status: 'unavailable', reason: 'method_not_allowed' }, 405, request.method);
  if (new URL(request.url).search) return json({ status: 'unavailable', reason: 'query_not_supported' }, 400, request.method);
  try {
    // One deadline covers both fixed-source reads and body consumption.
    const startedAt = clock();
    const chain = validateChain(await fetchJSON(CHAIN_URL, fetcher, timeoutMs), clock());
    const remaining = timeoutMs - (clock() - startedAt);
    if (remaining <= 0) throw new Error('source_timeout');
    const blockURL = `${CHAIN_URL}/blocks/${chain.hash}?txstart=1&limit=1`;
    const block = await fetchJSON(blockURL, fetcher, remaining);
    const checkedAt = clock();
    // Revalidate at completion; a newly fetched cached provider result is not a fresh observation.
    const observedAt = timestamp(chain.observedAt, checkedAt, 20 * 60_000);
    const blockTimestamp = validateBlock(block, chain, checkedAt);
    return json({ schemaVersion: 1, status: 'fresh', chain: 'LTC.main', height: chain.height,
      hash: chain.hash, observedAt, checkedAt: new Date(checkedAt).toISOString(), blockTimestamp,
      observationAgeSeconds: Math.max(0, Math.floor((checkedAt - Date.parse(observedAt)) / 1000)),
      blockAgeSeconds: Math.max(0, Math.floor((checkedAt - Date.parse(blockTimestamp)) / 1000)),
      refreshAfterSeconds: 60, maximumObservationAgeSeconds: 1200,
      source: { name: 'BlockCypher', chainURL: CHAIN_URL, blockURL },
    }, 200, request.method, true);
  } catch {
    return json({ schemaVersion: 1, status: 'unavailable', reason: 'source_unavailable', checkedAt: new Date(clock()).toISOString() }, 503, request.method);
  }
}
