/** Fixed public last-trade snapshots. No credentials, transactions or arbitrary proxy. */
export const PRODUCTS = Object.freeze(['BTC-USD', 'LTC-USD']);
const urls = Object.freeze(Object.fromEntries(PRODUCTS.map(product => [product, `https://api.exchange.coinbase.com/products/${product}/ticker`])));
export function acceptMarketQuote(product, value, checkedAt) {
  if (!PRODUCTS.includes(product) || !value || (value.product_id !== undefined && value.product_id !== product)) throw Error('invalid_product');
  if (!Number.isSafeInteger(value.trade_id) || value.trade_id <= 0 || typeof value.price !== 'string' || !/^\d{1,12}(?:\.\d{1,18})?$/.test(value.price) || !Number.isFinite(Number(value.price)) || Number(value.price) <= 0) throw Error('invalid_price');
  if (typeof value.time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value.time)) throw Error('invalid_time');
  const sourceTime = Date.parse(value.time);
  if (!Number.isFinite(sourceTime) || sourceTime > checkedAt + 30_000 || checkedAt - sourceTime > 300_000) throw Error('stale_quote');
  return { product, asset: product.slice(0,3), currency: 'USD', status: 'fresh', price: Number(value.price), sourcePrice: value.price,
    observedAt: value.time, checkedAt: new Date(checkedAt).toISOString(), tradeId: value.trade_id,
    ageSeconds: Math.max(0, Math.floor((checkedAt-sourceTime)/1000)), sourceURL: urls[product] };
}
async function readTicker(url, fetcher, signal) {
  const response = await fetcher(url, { method: 'GET', redirect: 'error', cache: 'no-store', signal, headers: { accept: 'application/json' } });
  if (!response.ok || response.redirected || Number(response.headers.get('content-length')) > 8192 || !response.body) throw Error('source_unavailable');
  const reader=response.body.getReader(), decoder=new TextDecoder(); let bytes=0, text='';
  try {
    for (;;) { const {done,value}=await reader.read(); if(done)break; bytes+=value.byteLength; if(bytes>8192)throw Error('source_oversized');text+=decoder.decode(value,{stream:true}); }
    return JSON.parse(text+decoder.decode());
  } finally { await reader.cancel().catch(()=>{}); }
}
function result(body,status,method,cache=false) {
  return new Response(method==='HEAD'?null:JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','vercel-cdn-cache-control':cache?'public, max-age=60':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'GET, HEAD'}:{})}});
}
export async function marketPricesResponse(request,{fetcher=fetch,clock=Date.now,timeoutMs=4000}={}) {
  if(!['GET','HEAD'].includes(request.method))return result({status:'unavailable',reason:'method_not_allowed'},405,request.method);
  if(new URL(request.url).search)return result({status:'unavailable',reason:'query_not_supported'},400,request.method);
  const controller=new AbortController();let timer;
  try {
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('source_timeout'));},timeoutMs);});
    const reads=await Promise.race([Promise.allSettled(PRODUCTS.map(product=>readTicker(urls[product],fetcher,controller.signal))),deadline]);
    const checkedAt=clock();
    const quotes=PRODUCTS.map((product,index)=>{
      try{if(reads[index].status!=='fulfilled')throw Error('missing');return acceptMarketQuote(product,reads[index].value,checkedAt);}
      catch{return {product,asset:product.slice(0,3),currency:'USD',status:'unavailable',sourceURL:urls[product]};}
    });
    const count=quotes.filter(q=>q.status==='fresh').length;
    return result({schemaVersion:1,status:count===2?'fresh':count===1?'partial':'unavailable',checkedAt:new Date(checkedAt).toISOString(),source:'Coinbase Exchange',kind:'last-trade-snapshot',refreshAfterSeconds:60,maximumObservationAgeSeconds:300,maximumFetchAgeSeconds:180,quotes},count?200:503,request.method,count===2);
  }catch{return result({schemaVersion:1,status:'unavailable',reason:'source_unavailable',checkedAt:new Date(clock()).toISOString()},503,request.method);}
  finally{clearTimeout(timer);controller.abort();}
}
