import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DurableCloudState, MemoryStateAdapter} from './cloud-ltc-state.mjs';
import {ReleaseOperationCoordinator} from './cloud-ltc-operations.mjs';
import {executeArtifactBackupPlan} from './cloud-ltc-production.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function fixture(date='2026-11-10') {
 let now=Date.parse(date+'T12:00:00Z'),writes=0;
 const memory=new MemoryStateAdapter();
 const adapter={read:key=>memory.read(key),conditionalWrite:async(...args)=>{writes++;return memory.conditionalWrite(...args);}};
 const state=new DurableCloudState(adapter,'website',{clock:()=>now});
 await state.setPaused(false);const lease=await state.acquire('fixture',3600000,undefined,date);
 return {state,lease,adapter,advance:ms=>now+=ms,writes:()=>writes};
}
const operations=Array.from({length:43},(_,i)=>({operationId:`bundle-${i}`,payload:{kind:'test',fileId:`file-${i}`}}));
const intents=operations.map(x=>({...x,payloadSha256:hash(x.payload)}));
test('43 intents register in one CAS; repeated exact intents perform zero writes',async()=>{
 const f=await fixture();let before=f.writes();await f.state.intendBatch(f.lease,intents);assert.equal(f.writes()-before,1);
 before=f.writes();for(const op of intents)await f.state.intend(f.lease,op.operationId,op.payloadSha256,op.payload);
 assert.equal(f.writes(),before);assert.equal(Object.keys((await f.state.inspect()).intents).length,43);
});
test('batch is atomic when a late payload conflicts; duplicate IDs rejected',async()=>{
 const f=await fixture();await f.state.intend(f.lease,intents[42].operationId,intents[42].payloadSha256,intents[42].payload);
 const changed={...intents[42],payload:{kind:'changed'}};changed.payloadSha256=hash(changed.payload);
 await assert.rejects(f.state.intendBatch(f.lease,[intents[0],changed]),/idempotency_conflict/);
 assert.equal((await f.state.inspect()).intents[intents[0].operationId],undefined);
 await assert.rejects(f.state.intendBatch(f.lease,[intents[0],intents[0]]),/invalid_intent/);
});
test('identical no-op validates pause, fence, expiry and issue date',async()=>{
 for(const mode of ['pause','fence','expiry','date']){
  const f=await fixture();await f.state.intendBatch(f.lease,[intents[0]]);
  let lease=f.lease;
  if(mode==='pause')await f.state.setPaused(true);
  if(mode==='fence')lease={...lease,fence:lease.fence+1};
  if(mode==='expiry')f.advance(3600001);
  if(mode==='date'){
   f.advance(16*3600000+30*60000); // 23:30 NY; renew before crossing midnight.
   const entry=await f.adapter.read('website');entry.value.lease.expiresAt=f.state.clock()+3600000;
   await f.adapter.conditionalWrite('website',entry.value,entry.version);f.advance(31*60000);
  }
  await assert.rejects(f.state.intendBatch(lease,[intents[0]]),/publication_paused|lease_fenced|lease_expired|publication_date_changed/);
 }
});
test('concurrent registration preserves CAS winner and does not authorize effects',async()=>{
 const f=await fixture();const results=await Promise.allSettled([f.state.intendBatch(f.lease,[intents[0]]),f.state.intendBatch(f.lease,[intents[1]])]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.match(results.find(x=>x.status==='rejected').reason.message,/state_conflict/);
 assert.equal(Object.values((await f.state.inspect()).intents)[0].status,'pending');
});
test('long backup renews between confirmed effects; markers and proof remain durable',async()=>{
 const f=await fixture(),coordinator=new ReleaseOperationCoordinator(f);let uploads=0;
 await executeArtifactBackupPlan({admission:f,operations:operations.slice(0,7),execute:operation=>coordinator.execute({...operation,provider:{
  apply:async()=>{assert.equal((await f.state.inspect()).intents[operation.operationId].status,'uncertain');uploads++;f.advance(11*60000);},
  readback:async context=>({...context,status:'applied',proof:{verified:true}})
 }})});
 const d=await f.state.inspect();assert.equal(uploads,7);assert(Object.values(d.intents).every(x=>x.status==='confirmed'));assert(d.lease.expiresAt>f.state.clock());assert.equal(Object.keys(d.receipts).length,7);
});
test('uncertain operation stops loop and cannot trigger renewal or next upload',async()=>{
 const f=await fixture(),coordinator=new ReleaseOperationCoordinator(f);const expiry=f.lease.expiresAt;let uploads=0;
 await assert.rejects(executeArtifactBackupPlan({admission:f,operations:operations.slice(0,2),execute:operation=>coordinator.execute({...operation,provider:{apply:async()=>{uploads++;f.advance(11*60000);throw Error('lost');},readback:async()=>{throw Error('unavailable');}}})}),/operation_outcome_uncertain/);
 const d=await f.state.inspect();assert.equal(uploads,1);assert.equal(d.lease.expiresAt,expiry);assert.equal(d.intents['bundle-0'].status,'uncertain');assert.equal(d.intents['bundle-1'].status,'pending');
});
test('pause after confirmation prevents periodic renewal and next operation',async()=>{
 const f=await fixture();let executed=0;
 await assert.rejects(executeArtifactBackupPlan({admission:f,operations:operations.slice(0,2),execute:async()=>{executed++;f.advance(11*60000);await f.state.setPaused(true);return {status:'confirmed'};}}),/publication_paused/);
 assert.equal(executed,1);
});
