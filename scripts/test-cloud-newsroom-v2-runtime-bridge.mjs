import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntimeBridge} from './cloud-newsroom-v2-runtime-bridge.mjs';
const state={schemaVersion:1,generation:'cloud-newsroom-v2',enabled:false};
const reply=(id,result)=>JSON.stringify({schemaVersion:1,kind:'ltc-v2-runtime-response',id,result});
test('real asynchronous bridge emits exact connector request and accepts actual envelope',async()=>{
 let bridge,seen;
 bridge=createRuntimeBridge({send:line=>{seen=JSON.parse(line);queueMicrotask(()=>bridge.receive(reply(seen.id,{structuredContent:{content:JSON.stringify(state),encoding:'utf-8',sha:'a'.repeat(40)}})));}});
 const result=await bridge.advance({});assert.equal(result.reason,'disabled_or_emergency_stop');
 assert.equal(seen.operation,'githubFetchFile');assert.equal(seen.args.repository_full_name,'Satnam-Satoshi/Satoshi-Langar');assert.equal(seen.args.ref,'agent/cloud-newsroom-v2-state');bridge.close();
 assert.throws(()=>bridge.receive(reply(seen.id,{})),/replayed/);
});
test('unknown response IDs and oversized responses refused',()=>{
 const b=createRuntimeBridge({send:()=>{}});assert.throws(()=>b.receive(reply('unknown',{})),/replayed/);assert.throws(()=>b.receive(' '.repeat(4*1024*1024+1)),/bounds/);b.close();
});
test('lost response causes hold without retry',async()=>{
 let calls=0;const b=createRuntimeBridge({send:()=>calls++,timeoutMs:5});const r=await b.advance({});assert.equal(r.status,'hold');assert.equal(calls,1);b.close();
});
test('closing pending read fails closed without another request',async()=>{
 let calls=0;const b=createRuntimeBridge({send:()=>calls++});const task=b.advance({});await new Promise(resolve=>setImmediate(resolve));b.close();const r=await task;assert.equal(r.status,'hold');assert.equal(calls,1);
});
