import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {blockClock,borrowingExample} from '../app/data/open-money-math.ts';
test('subsidy changes at the exact boundary, with a full interval after it',()=>{
 assert.equal(blockClock(839999).subsidy,50);assert.equal(blockClock(839999).blocksToHalving,1);
 const first=blockClock(840000);assert.equal(first.subsidy,25);assert.equal(first.halvingProgress,0);assert.equal(first.blocksToHalving,840000);
 assert.equal(blockClock(2520000).subsidy,6.25);assert.equal(blockClock(3360000).subsidy,3.125);
});
test('base-unit truncation, terminal subsidy and difficulty boundaries',()=>{
 assert.equal(blockClock(32*840000).subsidy,0.00000001);assert.equal(blockClock(33*840000).subsidy,0);assert.equal(blockClock(64*840000).subsidy,0);
 assert.equal(blockClock(2015).blocksToRetarget,1);assert.equal(blockClock(2016).blocksToRetarget,2016);
});
test('height input rejects invalid and unsafe numbers',()=>{
 for(const n of [-1,1.1,NaN,Infinity,Number.MAX_SAFE_INTEGER])assert.throws(()=>blockClock(n));
 assert.equal(blockClock(0).subsidy,50);
});
const input={collateral:1000,debt:250,annualRate:0,days:0,decline:0};
test('debt, collateral shock and liquidation boundary remain distinct',()=>{
 const a=borrowingExample(input);assert.equal(a.ltv,0.25);assert.equal(a.health,2.5);assert.equal(a.thresholdValue,400);
 assert.equal(borrowingExample({...input,decline:60}).health,1);
 assert.match(borrowingExample({...input,decline:61}).state,/Beyond/);
 const b=borrowingExample({...input,annualRate:8,days:365});assert.equal(b.totalDebt,270);assert.equal(b.interest,20);
});
test('empty collateral, no debt and total price loss avoid false reassuring results',()=>{
 assert.throws(()=>borrowingExample({...input,collateral:0}));
 assert.equal(borrowingExample({...input,debt:0}).state,'No debt');
 assert.equal(borrowingExample({...input,decline:100}).health,0);
 for(const bad of [{debt:-1},{annualRate:NaN},{days:4000},{decline:101},{lltv:1}])assert.throws(()=>borrowingExample({...input,...bad}));
});
test('checkpoint identifies the exact provider block and method',async()=>{
 const c=JSON.parse(await readFile('content/research/litecoin-clock-20261015.json','utf8'));
 assert.match(c.hash,/^[a-f0-9]{64}$/);assert(Number.isSafeInteger(c.height));assert.equal(c.blockSource,`https://api.blockcypher.com/v1/ltc/main/blocks/${c.hash}`);
 assert(Date.parse(c.blockTimestamp)<=Date.parse(c.checkedAt));assert.equal(c.status,'dated-checkpoint');
});
test('enhancement is local-only and cannot silently connect a wallet or send funds',async()=>{
 const script=await readFile('scripts/browser/open-money.mjs','utf8');
 assert(!/\bfetch\s*\(|XMLHttpRequest|window\.ethereum|wallet_request|eth_send|localStorage|sessionStorage/.test(script));
 assert.match(script,/value\.trim\(\)===''/);assert.match(script,/Invalid inputs/);
});

test('issuance sums each subsidy era including the observed block, without rounding subsidy upward',()=>{
 assert.equal(blockClock(0).issuedSats,'5000000000');
 assert.equal(blockClock(839999).issued,42_000_000);
 assert.equal(blockClock(840000).issued,42_000_025);
 assert.equal(blockClock(2519999).issued,73_500_000);
 assert.equal(blockClock(2520000).issued,73_500_006.25);
 assert.equal(blockClock(3359999).issued,78_750_000);
 const terminal=blockClock(33*840000);
 assert.equal(terminal.issuedSats,'8399999990760000');
 assert.equal(blockClock(64*840000).issuedSats,terminal.issuedSats);
 assert.equal(blockClock(3195769).issued+blockClock(3195769).remainingSupply,84_000_000);
});
test('client acceptance rejects stale cached fetch times, wrong chain and invalid timestamps',async()=>{
 const {acceptChainObservation}=await import('../app/data/timechain-observation.ts');
 const now=Date.parse('2026-10-15T20:00:00Z');
 const observation={schemaVersion:1,status:'fresh',chain:'LTC.main',height:3195769,hash:'a'.repeat(64),observedAt:new Date(now-60000).toISOString(),checkedAt:new Date(now-10000).toISOString(),blockTimestamp:new Date(now-180000).toISOString()};
 assert.equal(acceptChainObservation(observation,now).height,observation.height);
 for(const delta of [{chain:'BTC.main'},{height:0},{hash:'bad'},{checkedAt:new Date(now-180001).toISOString()},{observedAt:new Date(now-1200001).toISOString()},{blockTimestamp:new Date(now-7200001).toISOString()},{observedAt:new Date(now+60001).toISOString()},{checkedAt:'not-a-date'}])assert.throws(()=>acceptChainObservation({...observation,...delta},now));
 assert.throws(()=>acceptChainObservation(observation,now+180000));
});
test('timechain polling resumes after browser back-forward cache restoration',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=(await readFile('scripts/browser/timechain-live.mjs','utf8')).replace(/^import .*;\n/gm,'');
 const events={},timers=new Set();let next=0;
 const root={dataset:{},querySelectorAll:()=>[],querySelector:()=>null};
 runInNewContext(source,{document:{querySelector:()=>root,hidden:false,addEventListener(){}},window:{addEventListener:(name,fn)=>{events[name]=fn;}},location:{hostname:'portable.invalid'},Date,Event,AbortController,setInterval:()=>{const id=++next;timers.add(id);return id;},clearInterval:id=>timers.delete(id),setTimeout,clearTimeout,blockClock,acceptChainObservation(){throw Error('No observation');}});
 assert.equal(timers.size,2);
 events.pagehide();assert.equal(timers.size,0);
 events.pageshow({persisted:true});assert.equal(timers.size,2);
 events.pageshow({persisted:true});assert.equal(timers.size,2);
 events.pagehide();assert.equal(timers.size,0);
});
