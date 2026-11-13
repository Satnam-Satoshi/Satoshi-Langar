import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {runInNewContext} from 'node:vm';
import {morphoMarketsResponse} from './lib/morpho-market-service.mjs';import {MARKET_ROUTES,intelligenceRequests} from './lib/ltc-intelligence.mjs';
const now=Date.parse('2026-10-30T20:00:00Z'),seconds=now/1000;
const market=r=>({marketId:r.marketId,chain:{id:r.chainId},lltv:r.lltv==='0.86'?'860000000000000000':'625000000000000000',oracle:{address:r.oracleAddress},irmAddress:r.irmAddress,loanAsset:{...r.loan,chain:{id:r.chainId},price:{usd:1,timestamp:seconds-30}},collateralAsset:{...r.collateral,chain:{id:r.chainId},price:{usd:80,timestamp:seconds-30}},state:{timestamp:seconds-20,borrowApy:0.05,supplyApy:0.03,utilization:0.7,liquidityAssets:'1000000',supplyAssets:'2000000',borrowAssets:'1000000'}});
const payload=()=>({data:{markets:{items:MARKET_ROUTES.map(market)}}});
const request=(method='GET',query='')=>new Request(`https://local.invalid/api/morpho-markets${query}`,{method});
const run=(fetcher,req=request(),extra={})=>morphoMarketsResponse(req,{fetcher,clock:()=>now,...extra});
test('only existing pinned four-market GraphQL request is sent, source times preserved',async()=>{
 const r=await run(async(url,opt)=>{assert.equal(url,'https://api.morpho.org/graphql');assert.equal(opt.method,'POST');assert.equal(opt.redirect,'error');assert.equal(opt.body,intelligenceRequests(new Date(now).toISOString()).find(r=>r.id==='morpho-verified-markets').body);assert(!opt.headers.authorization);return Response.json(payload());});
 const d=await r.json();assert.equal(r.status,200);assert.equal(d.status,'fresh');assert.equal(d.markets.length,4);assert.equal(d.markets[0].state.asOf,new Date(now-20000).toISOString());assert.equal(r.headers.get('vercel-cdn-cache-control'),'public, max-age=60');
});
test('stale, future, wrong identity and NaN market values never produce live rates',async()=>{
 for(const change of [m=>m.state.timestamp=seconds-901,m=>m.state.timestamp=seconds+1,m=>m.chain.id=1,m=>m.state.supplyApy='NaN']){
  const p=payload();change(p.data.markets.items[0]);const r=await run(async()=>Response.json(p));
  if(r.status===503)continue;const d=await r.json();assert.equal(d.markets[0].state.supplyApy,null);assert.notEqual(d.status,'fresh');assert.equal(r.headers.get('vercel-cdn-cache-control'),'no-store');
 }
});
test('queries and writes never fetch; HEAD has no body',async()=>{
 let calls=0;const f=async()=>{calls++;return Response.json(payload());};assert.equal((await run(f,request('POST'))).status,405);assert.equal((await run(f,request('GET','?market=other'))).status,400);assert.equal(calls,0);assert.equal(await(await run(f,request('HEAD'))).text(),'');
});
test('malformed, oversized, GraphQL error and timeout responses fail closed',async()=>{
 for(const f of [async()=>new Response('{oops'),async()=>new Response(' '.repeat(100001)),async()=>Response.json({errors:[{message:'private-internal-error'}]}),async()=>new Promise(()=>{})]){const r=await run(f,request(),{timeoutMs:15});assert.equal(r.status,503);const text=await r.text();assert(!text.includes('private-internal-error'));assert.equal(r.headers.get('cache-control'),'no-store');}
});
async function browser(body){
 const source=await readFile(new URL('./browser/morpho-live.mjs',import.meta.url),'utf8');const nodes=new Map();const get=s=>{if(!nodes.has(s))nodes.set(s,{textContent:'saved'});return nodes.get(s);};
 const expected=MARKET_ROUTES[0];const card={dataset:{morphoRoute:expected.routeId,morphoMarket:expected.marketId,morphoChain:String(expected.chainId)},querySelectorAll:s=>[get(s)]};
 const root={querySelectorAll:()=>[card]};class Clock extends Date{static now(){return now;}}
 runInNewContext(source,{location:{hostname:'ltcmagazine.org'},document:{querySelectorAll:()=>[root],hidden:false,addEventListener(){}},window:{addEventListener(){}},Date:Clock,Intl,Set,Number,Array,Math,JSON,Error,AbortController,setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},fetch:async()=>Response.json(body)});
 await new Promise(resolve=>setImmediate(resolve));return nodes;
}
test('browser writes text only, validates dates/identity and rejects NaN/future observations',async()=>{
 const good=await(await run(async()=>Response.json(payload()))).json();let nodes=await browser(good);assert.equal(nodes.get('[data-morpho-supply]').textContent,'3%');
 for(const change of [d=>d.checkedAt='invalid',d=>d.checkedAt=new Date(now+1).toISOString(),d=>d.markets[0].state.asOf=new Date(now+1).toISOString(),d=>d.markets[0].state.supplyApy='NaN',d=>d.markets[0].marketId='other']){const d=structuredClone(good);change(d);nodes=await browser(d);assert.equal(nodes.get('[data-morpho-supply]').textContent,'Withheld');}
});
