import test from 'node:test';
import assert from 'node:assert/strict';
import {DurableCloudState,MemoryStateAdapter} from './cloud-ltc-state.mjs';
import {ReleaseOperationCoordinator,runBoundedReleaseOperations} from './cloud-ltc-operations.mjs';
async function setup() {
  let now=1000;const state=new DurableCloudState(new MemoryStateAdapter(),'website',{clock:()=>now});await state.setPaused(false);const lease=await state.acquire('run-one');
  return {state,lease,coordinator:new ReleaseOperationCoordinator({state,lease}),advance:()=>{now=999999}};
}
function provider() {
  let calls=0;let outcome=null;let fail=false;let unknown=false;
  return {get calls(){return calls},fail:()=>{fail=true},unknown:()=>{unknown=true},
    apply:async context=>{calls++;outcome=context;if(fail)throw Error('private token not exposed')},
    readback:async context=>({...context,status:unknown?'unknown':outcome?'applied':'not-applied',definitive:!outcome,proof:{remoteId:'fixture',sha256:context.payloadSha256}}),
  };
}
test('concurrent duplicate operation authorizes one external effect and terminal rerun never applies again',async()=>{
  const f=await setup();const p=provider();const input={operationId:'source-20261022',payload:{head:'exact'},provider:p};
  const attempts=await Promise.allSettled([f.coordinator.execute(input),f.coordinator.execute(input)]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);assert.equal(p.calls,1);
  assert.equal((await f.coordinator.execute(input)).status,'confirmed');assert.equal(p.calls,1);
  await assert.rejects(f.coordinator.execute({...input,payload:{head:'changed'}}),/idempotency_conflict/);
});
test('timeout after successful provider effect remains uncertain until explicit readback; no blind retry',async()=>{
  const f=await setup();const p=provider();p.fail();const input={operationId:'stage-20261022',payload:{manifest:'exact'},provider:p};
  await assert.rejects(f.coordinator.execute(input),e=>e.message==='operation_outcome_uncertain');
  assert.equal((await f.state.inspect()).intents[input.operationId].status,'uncertain');
  await assert.rejects(f.coordinator.execute(input),/operation_reconciliation_required/);assert.equal(p.calls,1);
  assert.equal((await f.coordinator.reconcile(input)).status,'confirmed');assert.equal(p.calls,1);
  await f.state.release(f.lease);
});
test('crash after durable authorization but before remote call requires definitive absence proof',async()=>{
  const f=await setup();const p=provider();const payload={commit:'fixture'};
  // Simulate a crash at the exact authorization boundary.
  const {createHash}=await import('node:crypto');const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  await f.state.intend(f.lease,'source-crash',hash);await f.state.assertMayMutate(f.lease,'source-crash');
  p.readback=async context=>({...context,status:'not-applied',proof:{absent:true}});
  await assert.rejects(f.coordinator.reconcile({operationId:'source-crash',payload,provider:p}),/operation_readback_invalid/);
  p.readback=async context=>({...context,status:'not-applied',definitive:true,proof:{requestNeverSubmitted:true}});
  assert.equal((await f.coordinator.reconcile({operationId:'source-crash',payload,provider:p})).status,'not-applied');
  assert.equal((await f.coordinator.execute({operationId:'source-crash',payload,provider:p})).status,'not-applied');assert.equal(p.calls,0);
});
test('readback outage, mismatched payload or unknown outcome keeps durable uncertainty and blocks release',async()=>{
  for(const readback of [async()=>{throw Error('private')},async context=>({...context,payloadSha256:'wrong',status:'applied',proof:{id:1}}),async context=>({...context,status:'unknown'}),async context=>({...context,status:'applied',proof:{}})]) {
    const f=await setup();const p=provider();p.readback=readback;
    await assert.rejects(f.coordinator.execute({operationId:'promote-check',payload:{id:1},provider:p}),/operation_outcome_uncertain|operation_readback_invalid/);
    assert.equal(p.calls,1);assert.equal((await f.state.inspect()).intents['promote-check'].status,'uncertain');await assert.rejects(f.state.release(f.lease),/reconciliation_required/);
  }
});
test('pause and expired lease stop effects while allowing readback reconciliation',async()=>{
  for(const mode of ['pause','expire']) {
    const f=await setup();const p=provider();if(mode==='pause')await f.state.setPaused(true);else f.advance();
    await assert.rejects(f.coordinator.execute({operationId:'blocked',payload:{a:1},provider:p}),/publication_paused|lease_expired/);assert.equal(p.calls,0);
  }
  const f=await setup();const p=provider();p.fail();const input={operationId:'prior',payload:{a:1},provider:p};await assert.rejects(f.coordinator.execute(input));await f.state.setPaused(true);
  assert.equal((await f.coordinator.reconcile(input)).status,'confirmed');
});
test('bounded source/evidence/stage/promote plan stops after uncertain effect and resumes via readback only',async()=>{
  const f=await setup();const providers=[provider(),provider(),provider(),provider()];providers[1].fail();
  const steps=['source','evidence','stage','promote'].map((kind,i)=>({kind,operationId:`${kind}-run`,payload:{kind},provider:providers[i]}));
  await assert.rejects(runBoundedReleaseOperations(f.coordinator,steps),/operation_outcome_uncertain/);assert.deepEqual(providers.map(p=>p.calls),[1,1,0,0]);
  await f.coordinator.reconcile(steps[1]);const receipts=await runBoundedReleaseOperations(f.coordinator,steps);assert.equal(receipts.length,4);assert.deepEqual(providers.map(p=>p.calls),[1,1,1,1]);
  await f.state.release(f.lease);
});
test('unsafe plans and non-JSON payloads are rejected before provider effects',async()=>{
  const f=await setup();const p=provider();
  await assert.rejects(runBoundedReleaseOperations(f.coordinator,[]),/invalid_release_operation_plan/);
  for(const payload of [{x:undefined},{x:NaN},new Date(),{x:BigInt(2)}])await assert.rejects(f.coordinator.execute({operationId:'unsafe',payload,provider:p}),/invalid_operation_payload/);
  assert.equal(p.calls,0);
});
