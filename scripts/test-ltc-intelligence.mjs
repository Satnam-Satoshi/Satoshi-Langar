import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateBlocks, BLOCK_SOURCES, collectIntelligence, compareTransactions, decimal, divideDecimal, intelligenceRequests, MARKET_ROUTES, normalizeMorpho, normalizeMorphoMarket, readBoundedResponse, refreshIntelligenceForPublication, validateIntelligence } from './lib/ltc-intelligence.mjs';
const NOW='2026-10-05T12:00:00.000Z';
const SECONDS=Date.parse(NOW)/1000;
const WINDOW={start:'2026-10-04T00:00:00.000Z',end:'2026-10-05T00:00:00.000Z',timezone:'UTC',frequency:'1d'};
const hash=height=>height.toString(16).padStart(64,'0');
const blocks=Array.from({length:20},(_,i)=>({id:hash(50-i),previousblockhash:hash(49-i),height:50-i,timestamp:SECONDS-6*3600-i*7200+1,mediantime:SECONDS-6*3600-i*7200,tx_count:100+i}));
const rawMarket=(r=MARKET_ROUTES[0])=>({marketId:r.marketId,chain:{id:r.chainId},lltv:r.lltv==='0.86'?'860000000000000000':'625000000000000000',oracle:{address:r.oracleAddress},irmAddress:r.irmAddress,loanAsset:{...r.loan,chain:{id:r.chainId},price:{usd:0.9999,timestamp:SECONDS-60}},collateralAsset:{...r.collateral,chain:{id:r.chainId},price:{usd:80,timestamp:SECONDS-120}},state:{timestamp:SECONDS-20,borrowApy:0.053,supplyApy:0.04,utilization:0.8,liquidityAssets:123456789,supplyAssets:1000000000,borrowAssets:800000000}});
const payload=()=>({data:{markets:{items:MARKET_ROUTES.map(rawMarket)}}});
function fixtureFetch({ltcError=false,editMarket}={}) {
  const calls=[];
  return {calls,fetch:async(url,options)=>{
    calls.push({url,options});
    if(url==='https://api.morpho.org/graphql'){const p=payload();if(editMarket)editMarket(p);return Response.json(p);}
    const cfg=BLOCK_SOURCES.find(s=>url.startsWith(s.base));assert.ok(cfg,'Only pinned origins');
    if(ltcError&&cfg.asset==='LTC')return new Response('Rate Limited',{status:503});
    if(url===`${cfg.base}/block-height/0`)return new Response(cfg.genesis);
    if(url===`${cfg.base}/blocks`)return Response.json(blocks.slice(0,10));
    if(url===`${cfg.base}/blocks/40`)return Response.json(blocks.slice(10));
    if(url===`${cfg.base}/block-height/50`)return new Response(hash(50));
    throw Error(`Unexpected fixture path ${url}`);
  }};
}
const collect=async(options={})=>{const mock=fixtureFetch(options);return {snapshot:await collectIntelligence({now:NOW,fetchImpl:mock.fetch,waitImpl:async()=>{}}),calls:mock.calls};};

test('counts one completed UTC day by median block time, including each block coinbase',()=>{
  const a=aggregateBlocks(blocks,{asset:'BTC',window:WINDOW,now:NOW});
  assert.equal(a.blocks,'12');assert.equal(a.transactions,'1314');assert.equal(a.feesNative,null);assert.equal(a.verification.firstBlock.height,35);assert.equal(a.verification.lastBlock.height,46);
  assert.deepEqual(compareTransactions([{asset:'BTC',transactions:'3'},{asset:'LTC',transactions:'2'}]),{transactionRatioLtcToBtc:'0.666666666666',transactionDifferenceLtcMinusBtc:'-1'});
  assert.equal(compareTransactions([{asset:'BTC',transactions:'0'},{asset:'LTC',transactions:'2'}]).transactionRatioLtcToBtc,null);
  assert.equal(divideDecimal('0.1','3'),'0.033333333333');
});

test('rejects broken, incomplete, duplicate and future block spans',()=>{
  for(const change of [b=>b[1].height++,b=>b[1].id=hash(999),b=>b[1].mediantime=b[0].mediantime+1,b=>b[1].timestamp=SECONDS+1,b=>b[1].tx_count=-1,b=>b[1].tx_count=1.2,b=>b.pop(),b=>b[0].mediantime=Date.parse(WINDOW.end)/1000-1]) {
    const b=structuredClone(blocks);change(b);
    // Removing only the final block still leaves a lower boundary; remove the full boundary section instead.
    if(b.length===19)b.splice(15);
    assert.throws(()=>aggregateBlocks(b,{asset:'BTC',window:WINDOW,now:NOW}));
  }
});

test('fixed sources, bounded serial reads and Morpho last yield self-contained valid snapshot',async()=>{
  const {snapshot:s,calls}=await collect();
  assert.equal(calls.length,9);assert.equal(calls.at(-1).url,'https://api.morpho.org/graphql');
  assert.ok(calls.every(c=>c.options.redirect==='error' && c.options.signal && !c.options.headers.Authorization));
  assert.equal(s.network.status,'fresh');assert.equal(s.network.history.length,1);assert.equal(s.network.comparison.transactionRatioLtcToBtc,'1');
  assert.equal(s.markets[0].state.liquidityUsdc,'123.456789');assert.equal(s.markets[0].state.borrowApy,'0.053');
  assert.deepEqual(validateIntelligence(s,{now:NOW,editionDate:'2026-10-05'}),s);
  assert.equal(s.sources[0].pages.length,4);assert.match(s.sources[0].sha256,/^[a-f0-9]{64}$/);
});

test('rate-limited source stops after one request and never becomes zero or a comparison',async()=>{
  const {snapshot:s,calls}=await collect({ltcError:true});
  assert.equal(calls.filter(c=>c.url.startsWith(BLOCK_SOURCES[1].base)).length,1);
  assert.equal(s.network.status,'partial');assert.equal(s.network.assets[1].transactions,null);assert.equal(s.network.assets[0].transactions,'1314');
  assert.equal(s.network.comparison.transactionRatioLtcToBtc,null);assert.deepEqual(s.network.history,[]);
  assert.equal(s.sources[1].error,'Public block API rate limited.');validateIntelligence(s,{now:NOW});
});

test('explicit same-run deferral never retries an already rate-limited API',async()=>{
  const mock=fixtureFetch();const s=await collectIntelligence({now:NOW,fetchImpl:mock.fetch,waitImpl:async()=>{},deferredSources:['litecoin-blocks']});
  assert.equal(mock.calls.some(c=>c.url.startsWith(BLOCK_SOURCES[1].base)),false);assert.equal(s.sources[1].status,'deferred');assert.equal(s.sources[1].retrievedAt,null);validateIntelligence(s,{now:NOW});
});

test('rejects wrong route, chain, loan token, collateral, decimals, LLTV, oracle and IRM',()=>{
  const changes=[r=>r.marketId=MARKET_ROUTES[1].marketId,r=>r.chain.id=8453,r=>r.loanAsset.address=r.collateralAsset.address,r=>r.collateralAsset.symbol='BTC',r=>r.loanAsset.decimals=18,r=>r.collateralAsset.chain.id=1,r=>r.lltv='625000000000000000',r=>r.oracle.address=MARKET_ROUTES[1].oracleAddress,r=>r.irmAddress='0x'+'1'.repeat(40)];
  for(const change of changes){const r=rawMarket();change(r);assert.throws(()=>normalizeMorphoMarket(r,MARKET_ROUTES[0],{now:NOW}));}
});

test('stale state withholds rates while fresh prices remain independent',()=>{
  const r=rawMarket();r.state.timestamp=SECONDS-901;const m=normalizeMorphoMarket(r,MARKET_ROUTES[0],{now:NOW});
  assert.equal(m.status,'stale');assert.equal(m.state.borrowApy,null);assert.equal(m.state.liquidityUsdc,null);assert.equal(m.prices.usdcUsd.value,'0.9999');
  const p=rawMarket();p.collateralAsset.price.timestamp=SECONDS-901;const n=normalizeMorphoMarket(p,MARKET_ROUTES[0],{now:NOW});assert.equal(n.state.borrowApy,'0.053');assert.equal(n.prices.collateralUsd.value,null);assert.equal(n.prices.collateralUsd.status,'stale');
});

test('future timestamps fail closed; missing fields never coerce to zero',()=>{
  for(const change of [r=>r.state.timestamp=SECONDS+1,r=>r.loanAsset.price.timestamp=SECONDS+1,r=>r.collateralAsset.price.timestamp=SECONDS+1,r=>r.state.supplyApy='not-a-number',r=>r.state.borrowApy=-1,r=>r.state.liquidityAssets=Number.MAX_SAFE_INTEGER+1]) {
    const p=payload();change(p.data.markets.items[0]);const m=normalizeMorpho(p,{now:NOW})[0];assert.equal(m.status,'invalid');assert.equal(m.state.borrowApy,null);
  }
  const r=rawMarket();delete r.state.borrowApy;r.state.supplyApy=0;const m=normalizeMorphoMarket(r,MARKET_ROUTES[0],{now:NOW});assert.equal(m.state.borrowApy,null);assert.equal(m.state.supplyApy,'0');
  for(const value of [false,'',NaN,Infinity,'-1','01','1e2'])assert.throws(()=>decimal(value));
});

test('duplicate/unconfigured markets and GraphQL errors cannot become trusted observations',()=>{
  const p=payload();p.data.markets.items[1]=p.data.markets.items[0];assert.throws(()=>normalizeMorpho(p,{now:NOW}));
  assert.throws(()=>normalizeMorpho({errors:[{message:'arbitrary remote text'}],data:payload().data},{now:NOW}));
});

test('public snapshot validation catches mutations to identity, dates, math, provenance, units and messages',async()=>{
  const {snapshot}=await collect();
  const changes=[s=>s.markets[0].loan.address=MARKET_ROUTES[2].loan.address,s=>s.markets[0].state.asOf='2026-10-06T00:00:00.000Z',s=>s.sources[0].url='https://evil.example/',s=>s.sources[0].pages[1].url='https://mempool.space.evil.example/api/blocks',s=>s.sources[0].pages[1].sha256='a'.repeat(64),s=>s.network.comparison.transactionRatioLtcToBtc='99',s=>s.network.assets[0].blocks='999',s=>s.network.units.transactions='payments',s=>s.network.history.push(s.network.history[0]),s=>s.network.assets[1].transactions=null,s=>s.collectedAt='2026-10-05T13:00:00.000Z',s=>s.asOfDate='2026-10-04',s=>s.notes.push('Publish arbitrary message'),s=>s.markets[0].state.supplyApy='NaN'];
  for(const change of changes){const s=structuredClone(snapshot);change(s);assert.throws(()=>validateIntelligence(s,{now:NOW}));}
  assert.throws(()=>validateIntelligence(snapshot,{now:'2026-10-07T00:00:00.000Z'}));
});

test('publication re-evaluation removes stale quotes without altering original evidence',async()=>{
  const {snapshot:s}=await collect();const later='2026-10-05T12:20:00.000Z';const view=refreshIntelligenceForPublication(s,{now:later});
  assert.equal(view.markets[0].status,'stale');assert.equal(view.markets[0].state.supplyApy,null);assert.equal(view.markets[0].prices.usdcUsd.value,null);assert.equal(s.markets[0].state.supplyApy,'0.04');assert.equal(view.collectedAt,NOW);validateIntelligence(view,{now:later});
});

test('response byte bound and failed endpoints preserve gaps',async()=>{
  await assert.rejects(readBoundedResponse(new Response('oversized'),2),/byte limit/);
  const s=await collectIntelligence({now:NOW,fetchImpl:async()=>{throw Error('network');},waitImpl:async()=>{}});
  assert.equal(s.network.status,'missing');assert.ok(s.markets.every(m=>m.status==='missing'));validateIntelligence(s,{now:NOW});
  assert.equal(intelligenceRequests(NOW).length,3);
});


test('malformed first block page and a changed anchor stop a chain without publishing partial counts',async()=>{
  for(const mode of ['malformed','changed-anchor']){
    const mock=fixtureFetch();const counts=[];
    const s=await collectIntelligence({now:NOW,waitImpl:async()=>{},fetchImpl:async(url,options)=>{
      counts.push(url);
      if(url===`${BLOCK_SOURCES[0].base}/blocks`&&mode==='malformed'){const bad=structuredClone(blocks.slice(0,10));bad[0].timestamp=SECONDS+1;return Response.json(bad);}
      if(url===`${BLOCK_SOURCES[0].base}/block-height/50`&&mode==='changed-anchor')return new Response(hash(999));
      return mock.fetch(url,options);
    }});
    assert.equal(s.network.assets[0].transactions,null);assert.equal(s.network.status,'partial');assert.equal(s.network.comparison.transactionDifferenceLtcMinusBtc,null);validateIntelligence(s,{now:NOW});
    if(mode==='malformed')assert.equal(counts.filter(u=>u.startsWith(BLOCK_SOURCES[0].base)).length,2);
  }
});

test('invalid UTF-8 cannot acquire a misleading decoded-body hash',async()=>{
  await assert.rejects(readBoundedResponse(new Response(new Uint8Array([255]))));
});
