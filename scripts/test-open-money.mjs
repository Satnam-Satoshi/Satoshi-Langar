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
