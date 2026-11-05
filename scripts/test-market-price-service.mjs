import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptMarketQuote, marketPricesResponse } from './lib/market-price-service.mjs';
const now=Date.parse('2026-10-15T20:00:00Z');
const quote={trade_id:123,price:'90.25',time:'2026-10-15T19:59:30.123456Z'};
const request=(method='GET',query='')=>new Request(`https://local.invalid/api/market-prices${query}`,{method});
const run=(fetcher,req=request(),extra={})=>marketPricesResponse(req,{fetcher,clock:()=>now,...extra});
test('fixed source products, source trade time preserved and short CDN freshness',async()=>{
 const calls=[];
 const response=await run(async(url,options)=>{calls.push(url);assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert(!options.headers.authorization);return Response.json(quote);});
 assert.equal(response.status,200);const body=await response.json();
 assert.deepEqual(calls,['BTC-USD','LTC-USD'].map(p=>`https://api.exchange.coinbase.com/products/${p}/ticker`));
 assert.equal(body.quotes[0].observedAt,quote.time);assert.equal(body.quotes[1].price,Number(quote.price));assert.equal(body.quotes[0].checkedAt,new Date(now).toISOString());
 assert.equal(response.headers.get('vercel-cdn-cache-control'),'public, max-age=60');assert.equal(response.headers.get('cache-control'),'no-store');
});
test('invalid price, trade, product and stale/future timestamps fail closed',()=>{
 for(const delta of [{price:'0'},{price:'-1'},{price:'Infinity'},{price:23},{trade_id:0},{product_id:'ETH-USD'},{time:new Date(now-300001).toISOString()},{time:new Date(now+30001).toISOString()},{time:'bad'}])assert.throws(()=>acceptMarketQuote('LTC-USD',{...quote,...delta},now));
 assert.throws(()=>acceptMarketQuote('ETH-USD',quote,now));
});
test('one failed source is explicit, never substitutes the other asset',async()=>{
 const response=await run(async url=>url.includes('BTC-USD')?Response.json(quote):new Response('',{status:429}));
 const body=await response.json();assert.equal(response.status,200);assert.equal(body.status,'partial');assert.equal(body.quotes[1].status,'unavailable');assert.equal(body.quotes[1].price,undefined);assert.equal(response.headers.get('vercel-cdn-cache-control'),'no-store');
});
test('all failures, oversized stream, oversized length, malformed JSON and deadline return no-store 503',async()=>{
 for(const fetcher of [async()=>new Response('',{status:500}),async()=>new Response(' '.repeat(8193)),async()=>new Response('{}',{headers:{'content-length':'8193'}}),async()=>new Response('{bad'),async()=>new Promise(()=>{}),async()=>new Response(new ReadableStream({start(){}}))]){
  const response=await run(fetcher,request(),{timeoutMs:15});assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');
 }
});
test('unsupported methods and queries never fetch, HEAD carries no body',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return Response.json(quote);};
 assert.equal((await run(fetcher,request('POST'))).status,405);assert.equal((await run(fetcher,request('GET','?product=ETH-USD'))).status,400);assert.equal(calls,0);
 const response=await run(fetcher,request('HEAD'));assert.equal(response.status,200);assert.equal(await response.text(),'');
});
test('accepted price is finite numeric with original decimal retained; numeric/nonfinite input rejected',()=>{
 const accepted=acceptMarketQuote('BTC-USD',quote,now);
 assert.equal(typeof accepted.price,'number');assert.equal(accepted.price,90.25);assert.equal(accepted.sourcePrice,'90.25');
 for(const price of [Infinity,-Infinity,NaN,90.25,'1e999','9999999999999999999999999999','NaN','Infinity'])assert.throws(()=>acceptMarketQuote('BTC-USD',{...quote,price},now));
});
test('global market enhancement accepts service schema and withholds a partial response',async()=>{
 const {readFile}=await import('node:fs/promises');const {runInNewContext}=await import('node:vm');
 const source=await readFile('scripts/browser/market-live.mjs','utf8');
 const service=await run(async()=>Response.json(quote));const payload=await service.json();
 async function display(body){
  const nodes=new Map();const node=s=>{if(!nodes.has(s))nodes.set(s,{textContent:'saved'});return nodes.get(s);};
  const root={querySelectorAll:s=>[node(s)],querySelector:s=>node(s)};
  class Clock extends Date{static now(){return now;}}
  runInNewContext(source,{document:{querySelector:()=>root,hidden:false,addEventListener(){}},window:{addEventListener(){}},location:{hostname:'ltcmagazine.org'},Date:Clock,Intl,Number,Array,JSON,Error,AbortController,setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},fetch:async()=>Response.json(body)});
  await new Promise(resolve=>setImmediate(resolve));return nodes;
 }
 const fresh=await display(payload);assert.equal(fresh.get('[data-market-price="BTC-USD"]').textContent,'$90.25');assert.match(fresh.get('[data-market-state]').textContent,/Auto-refreshed/);
 const partial=await display({...payload,status:'partial'});assert(!partial.has('[data-market-price="BTC-USD"]'));assert.match(partial.get('[data-market-state]').textContent,/unavailable/);
});
