import test from 'node:test';
import assert from 'node:assert/strict';
import {collectDistribution,SOURCE} from './collect-litecoin-distribution.mjs';
const now=()=> '2026-10-31T02:00:00.000Z'; // Still October 30 in New York.
const raw={a:{name:'A',sector:'Company',subsector:'Treasury',region:'US',events:[['2026-09-30',0],['2026-10-29',12]]},b:{name:'B',sector:'Company',subsector:'Treasury',region:'US',events:[['2026-10-29',3]]}};
test('fixed source preserves exact evidence, New York cutoff, source dates and unknown baselines',async()=>{
  const text=JSON.stringify(raw);
  const {bytes,record}=await collectDistribution({now,fetchImpl:async(url,options)=>{assert.equal(url,SOURCE);assert.equal(options.redirect,'error');assert.ok(options.signal);return new Response(text);}});
  assert.equal(bytes.toString(),text);assert.equal(record.asOf,'2026-10-30');assert.equal(record.total,15);
  assert.equal(record.rows[0].baseline,0);assert.equal(record.rows[0].change,12);assert.equal(record.rows[0].observedAt,'2026-10-29');assert.equal(record.rows[1].change,null);
});
test('bad status, redirects, declared and streamed oversize, invalid JSON and impossible balances fail closed',async()=>{
  for(const fetchImpl of [async()=>new Response('no',{status:500}),async()=>({ok:true,redirected:true}),async()=>new Response('{}',{headers:{'content-length':'3000001'}}),async()=>new Response('x'.repeat(3000001)),async()=>new Response('invalid'),async()=>new Response(JSON.stringify({a:{...raw.a,events:[['2026-10-29',84000001]]}})),async()=>{throw Error('network');}]) await assert.rejects(collectDistribution({now,fetchImpl}));
});
