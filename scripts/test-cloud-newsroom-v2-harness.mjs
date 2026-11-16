import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulationHarness, SIMULATION_STATUS} from './cloud-newsroom-v2-harness.mjs';
const artifact={date:'2026-11-16',sha256:'a'.repeat(64)};
const expected={currentDeploymentId:'old',domains:{'one.example':'old','two.example':'old'}};
function fixture(options={}){
 let time=1000, value=null,version=0, state=structuredClone(expected), stages=0,promotions=0;
 const deployments=new Map();
 // No await between version comparison and replacement: this is the test's atomic CAS.
 const adapter={mode:'simulation',async read(){return {version,value:structuredClone(value)};},async conditionalWrite(ns,want,next){if(want!==version)return false;value=structuredClone(next);version++;return true;}};
 const provider={mode:'simulation',async readState(){return structuredClone(state);},async stage(a){stages++;deployments.set('new',{id:'new',ready:true,artifactSha256:options.badHash?'b'.repeat(64):a.sha256});if(options.driftAfterStage)state.domains['two.example']='foreign';if(options.expireAtStage)time+=500;return {id:'new'};},async readDeployment(id){return structuredClone(deployments.get(id));},async promote(id){promotions++;if(options.beforePromotion)options.beforePromotion();if(!options.noEffect)state={currentDeploymentId:id,domains:Object.fromEntries(Object.keys(expected.domains).map(d=>[d,id]))};if(options.uncertain)throw Error('transport lost');}};
 const config={mode:'simulation',namespace:'cloud-newsroom-v2-simulation/test',adapter,provider,clock:()=>time,leaseMs:100};
 return {h:createSimulationHarness(config),config,provider,adapter,setTime:n=>time=n,setState:s=>state=s,counts:()=>({stages,promotions}),ledger:()=>structuredClone(value),setLedger:v=>value=v};
}
test('only simulation mode and fresh simulation namespaces are accepted',()=>{
 const f=fixture();for(const mode of [undefined,'production','real','preview'])assert.throws(()=>createSimulationHarness({...f.config,mode}),/simulation-mode/);
 for(const namespace of ['old-publisher','cloud-newsroom-v2-simulation/../old','cloud-newsroom-v2-simulation/'])assert.throws(()=>createSimulationHarness({...f.config,namespace}),/namespace/);
 assert.throws(()=>createSimulationHarness({...f.config,provider:{...f.provider,mode:'production'}}),/simulation-dependencies/);
 assert.throws(()=>createSimulationHarness({...f.config,adapter:{...f.adapter,mode:'production'}}),/simulation-dependencies/);
 assert.equal(f.h.status,SIMULATION_STATUS);assert.equal(f.h.providerFencing,false);
});
test('concurrent atomic CAS permits exactly one lease owner',async()=>{
 const f=fixture();const results=await Promise.allSettled(Array.from({length:20},(_,i)=>f.h.acquire(`owner${i}`)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.ledger().fence,1);
});
test('lease stays exclusive even for same owner and fencing increases after expiry',async()=>{
 const f=fixture();const first=await f.h.acquire('a');await assert.rejects(f.h.acquire('a'),/lease-held/);f.setTime(1100);const second=await f.h.acquire('b');assert.equal(second.fence,first.fence+1);await assert.rejects(f.h.publish(first,artifact,expected),/stale-owner/);assert.deepEqual(f.counts(),{stages:0,promotions:0});
});
test('expired lease is rejected before side effects',async()=>{
 const f=fixture();const lease=await f.h.acquire('a');f.setTime(1100);await assert.rejects(f.h.publish(lease,artifact,expected),/expired-lease/);assert.deepEqual(f.counts(),{stages:0,promotions:0});
});
test('lease expiration during staging prevents promotion',async()=>{
 const f=fixture({expireAtStage:true});const lease=await f.h.acquire('a');await assert.rejects(f.h.publish(lease,artifact,expected),/expired-lease/);assert.equal(f.counts().promotions,0);
});
test('verified promotion is idempotent; conflicting same-date artifact rejected',async()=>{
 const f=fixture();const lease=await f.h.acquire('a');const result=await f.h.publish(lease,artifact,expected);assert.equal(result.outcome,'published-readback-verified');assert.equal(result.status,SIMULATION_STATUS);assert.equal((await f.h.publish(lease,artifact,expected)).outcome,'duplicate-no-op');await assert.rejects(f.h.publish(lease,{...artifact,sha256:'c'.repeat(64)},expected),/same-date-artifact-conflict/);assert.deepEqual(f.counts(),{stages:1,promotions:1});
});
test('mismatched staged hash cannot be promoted or automatically restaged',async()=>{
 const f=fixture({badHash:true});const lease=await f.h.acquire('a');await assert.rejects(f.h.publish(lease,artifact,expected),/staged-artifact-mismatch/);assert.equal((await f.h.publish(lease,artifact,expected)).outcome,'manual-reconciliation-required');assert.deepEqual(f.counts(),{stages:1,promotions:0});
});
test('unexpected current deployment aborts before staging',async()=>{
 const f=fixture();f.setState({...expected,currentDeploymentId:'foreign'});const lease=await f.h.acquire('a');await assert.rejects(f.h.publish(lease,artifact,expected),/unexpected-current/);assert.deepEqual(f.counts(),{stages:0,promotions:0});
});
test('domain drift before staging aborts',async()=>{
 const f=fixture();f.setState({...expected,domains:{...expected.domains,'two.example':'foreign'}});const lease=await f.h.acquire('a');await assert.rejects(f.h.publish(lease,artifact,expected),/domain-drift/);assert.equal(f.counts().stages,0);
});
test('domain drift after staging prevents promotion',async()=>{
 const f=fixture({driftAfterStage:true});const lease=await f.h.acquire('a');await assert.rejects(f.h.publish(lease,artifact,expected),/domain-drift/);assert.equal(f.counts().promotions,0);
});
test('lost promotion response resolves by readback with one mutation only',async()=>{
 const f=fixture({uncertain:true});const lease=await f.h.acquire('a');assert.equal((await f.h.publish(lease,artifact,expected)).outcome,'published-readback-verified');await f.h.reconcile(lease,artifact);await f.h.publish(lease,artifact,expected);assert.equal(f.counts().promotions,1);
});
test('uncertain promotion without visible effect never retries, including new owner',async()=>{
 const f=fixture({uncertain:true,noEffect:true});const lease=await f.h.acquire('a');assert.equal((await f.h.publish(lease,artifact,expected)).outcome,'promotion-uncertain-no-retry');await f.h.publish(lease,artifact,expected);f.setTime(1100);const next=await f.h.acquire('b');await f.h.publish(next,artifact,expected);assert.deepEqual(f.counts(),{stages:1,promotions:1});f.setState({currentDeploymentId:'new',domains:{'one.example':'new','two.example':'new'}});assert.equal((await f.h.reconcile(next,artifact)).outcome,'published-readback-verified');assert.equal(f.counts().promotions,1);
});
test('unexpected state during reconciliation aborts without repeat mutation',async()=>{
 const f=fixture({uncertain:true,noEffect:true});const lease=await f.h.acquire('a');await f.h.publish(lease,artifact,expected);f.setState({currentDeploymentId:'new',domains:{'one.example':'new','two.example':'foreign'}});await assert.rejects(f.h.reconcile(lease,artifact),/provider-drift/);assert.equal(f.counts().promotions,1);
});
test('concurrent publish calls cannot reserve the same daily artifact twice',async()=>{
 const f=fixture();const lease=await f.h.acquire('a');await Promise.allSettled([f.h.publish(lease,artifact,expected),f.h.publish(lease,artifact,expected)]);assert.deepEqual(f.counts(),{stages:1,promotions:1});
});
test('foreign ledger content is never reused',async()=>{
 const f=fixture();f.setLedger({schema:'legacy',records:{}});await assert.rejects(f.h.acquire('a'),/foreign-ledger/);
});

test('invalid artifact and partial baseline cannot stage',async()=>{
 const f=fixture();const lease=await f.h.acquire('a');await assert.rejects(f.h.publish(lease,{date:'bad',sha256:'not-a-hash'},expected),/invalid-artifact/);await assert.rejects(f.h.publish(lease,artifact,{...expected,domains:{'one.example':'foreign'}}),/invalid-baseline/);assert.equal(f.counts().stages,0);
});
test('uncertain stage is not automatically repeated',async()=>{
 const f=fixture();let calls=0;f.provider.stage=async()=>{calls++;throw Error('unknown outcome');};const lease=await f.h.acquire('a');assert.equal((await f.h.publish(lease,artifact,expected)).outcome,'stage-uncertain-no-retry');assert.equal((await f.h.publish(lease,artifact,expected)).outcome,'manual-reconciliation-required');assert.equal(calls,1);assert.equal(f.counts().promotions,0);
});
test('promotion readback verifies artifact bytes identity, not just alias',async()=>{
 const f=fixture({uncertain:true,noEffect:true});const lease=await f.h.acquire('a');await f.h.publish(lease,artifact,expected);f.setState({currentDeploymentId:'new',domains:{'one.example':'new','two.example':'new'}});f.provider.readDeployment=async()=>({id:'new',ready:true,artifactSha256:'b'.repeat(64)});await assert.rejects(f.h.reconcile(lease,artifact),/reconciled-artifact-mismatch/);assert.equal(f.counts().promotions,1);
});
