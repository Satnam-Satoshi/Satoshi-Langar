import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createFirestoreOutbox,FIRESTORE_OUTBOX_PREFIX} from '../src/firestore-outbox.mjs';
import {FIRESTORE_STATE_DOCUMENT} from '../src/firestore-state.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const intent={status:'intent',artifactSha256:'a'.repeat(64),sourceSha256:'b'.repeat(64),phase:'stage',target:'synthetic-preview',editionDate:'2026-11-17',owner:'worker-one',fence:1,approvalReference:'synthetic-approval',createdAt:'2026-11-17T12:00:00.000Z'};
const input=()=>({key:sha(JSON.stringify([intent.editionDate,intent.target,intent.phase])),fence:1,owner:intent.owner,intent:{...intent}});
const canonical=v=>v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
function fixture(){
 const rows=new Map();let writes=0,reads=0,repeats=1,unknown=false,now='2026-11-17T12:00:01.000Z';
 const control={schemaVersion:1,generation:'standalone-v1',initialized:true,revision:2,fence:1,emergencyStop:false,lease:{owner:intent.owner,fence:1,expiresAt:'2026-11-17T12:02:00.000Z'},jobs:{[input().key]:intent}};
 const save=()=>rows.set(FIRESTORE_STATE_DOCUMENT,{schemaVersion:1,generation:'standalone-v1',revision:control.revision,payloadJson:JSON.stringify(canonical(control))});save();
 const snap=path=>({exists:rows.has(path),data:()=>structuredClone(rows.get(path))});
 const sdk={databaseId:'(default)',doc:path=>({path,get:async()=>{reads++;return snap(path);}}),runTransaction:async cb=>{let pending;for(let n=0;n<repeats;n++)await cb({get:async r=>snap(r.path),create:(r,row)=>{assert.ok(r.path.startsWith(FIRESTORE_OUTBOX_PREFIX+'/'));assert.equal(rows.has(r.path),false);pending=[r.path,row];}});if(pending){rows.set(...pending);writes++;}if(unknown)throw Error('unknown-commit');}};
 return {rows,control,save,sdk,get writes(){return writes;},get reads(){return reads;},set repeats(v){repeats=v;},set unknown(v){unknown=v;},set now(v){now=v;},factory(enabled=true){return createFirestoreOutbox({Firestore:function(opts){assert.deepEqual(opts,{projectId:'synthetic-project',databaseId:'(default)',ignoreUndefinedProperties:false});return sdk;},expectedProjectId:'synthetic-project',expectedDatabaseId:'(default)',mutationEnabled:enabled,clock:()=>now});}};
}
test('default-off and fixed namespace; no implicit control bootstrap',async()=>{const f=fixture();await assert.rejects(f.factory(false).persist(input()),/disabled/);f.rows.clear();await assert.rejects(f.factory().persist(input()),/existing-control/);assert.equal(f.writes,0);assert.equal(f.rows.size,0);assert.throws(()=>createFirestoreOutbox({expectedDocumentPrefix:'other'}),/bound-firestore/);});
test('exact immutable bytes survive sorted control, idempotent transaction and readback',async()=>{const f=fixture(),a=f.factory(),before=f.rows.get(FIRESTORE_STATE_DOCUMENT);const r=await a.persist(input());assert.equal(r.intentSha256,sha(JSON.stringify(intent)));assert.equal(r.persisted,true);assert.equal((await a.persist(input())).persisted,true);assert.equal(f.writes,1);assert.equal(f.reads,2);assert.deepEqual(f.rows.get(FIRESTORE_STATE_DOCUMENT),before);assert.equal(r.externalEffectAuthorized,false);});
test('retried transaction callback produces one immutable create, no provider callbacks',async()=>{const f=fixture();f.repeats=4;await f.factory().persist(input());assert.equal(f.writes,1);});
test('stale owner, fence, expired lease, stop and differing bound job reject without create',async()=>{for(const mutate of [c=>c.lease.owner='other',c=>c.fence=2,c=>c.lease.expiresAt='2026-11-17T12:00:00.000Z',c=>c.emergencyStop=true,c=>c.jobs[input().key]={...intent,sourceSha256:'c'.repeat(64)},c=>c.jobs={}]){const f=fixture();mutate(f.control);f.save();await assert.rejects(f.factory().persist(input()),/live-claim/);assert.equal(f.writes,0);}});
test('unknown committed outcome latches mutations; same instance and restarted read-only reconcile',async()=>{const f=fixture(),a=f.factory();f.unknown=true;await assert.rejects(a.persist(input()),/unknown-commit/);await assert.rejects(a.persist(input()),/reconciliation-required/);assert.equal((await a.reconcile(input())).persisted,true);assert.equal((await f.factory(false).reconcile(input())).persisted,true);assert.equal(f.writes,1);});
test('missing reconciliation is not retry authority; conflicting row and tampered readback reject',async()=>{const f=fixture(),a=f.factory();assert.equal((await a.reconcile(input())).persisted,false);await a.persist(input());const path=`${FIRESTORE_OUTBOX_PREFIX}/${input().key}`;f.rows.get(path).intentSha256='c'.repeat(64);await assert.rejects(a.reconcile(input()),/conflict/);await assert.rejects(f.factory().persist(input()),/conflict/);assert.equal(f.writes,1);});
test('substituted key, extra intent field and invalid hash reject before transaction',async()=>{for(const mutate of [r=>r.key='c'.repeat(64),r=>r.intent.secret='bad',r=>r.intent.artifactSha256='bad',r=>r.owner='different']){const f=fixture(),r=input();mutate(r);await assert.rejects(f.factory().persist(r),/invalid/);assert.equal(f.writes,0);}});
test('input snapshotted before await and postcommit missing readback fails',async()=>{const f=fixture(),r=input();const old=f.sdk.runTransaction;f.sdk.runTransaction=async cb=>{r.intent.target='mutated';await old(cb);f.rows.delete(`${FIRESTORE_OUTBOX_PREFIX}/${input().key}`);};await assert.rejects(f.factory().persist(r),/readback/);assert.equal(f.writes,1);});
test('retry rechecks clock and live claim rather than caching authority',async()=>{const f=fixture();f.sdk.runTransaction=async cb=>{const tx={get:async r=>({exists:f.rows.has(r.path),data:()=>structuredClone(f.rows.get(r.path))}),create:()=>{}};await cb(tx);f.now='2026-11-17T12:03:00.000Z';await cb(tx);};await assert.rejects(f.factory().persist(input()),/live-claim/);assert.equal(f.writes,0);});

test('actual runner plus state and outbox SDK adapters compose without control self-conflict',async()=>{
 const {createJobRunner}=await import('../src/job-runner.mjs');
 const {createFirestoreState}=await import('../src/firestore-state.mjs');
 const rows=new Map(),events=[];
 const initial={schemaVersion:1,generation:'standalone-v1',initialized:true,revision:1,fence:0,emergencyStop:false,jobs:{}};
 rows.set(FIRESTORE_STATE_DOCUMENT,{schemaVersion:1,generation:'standalone-v1',revision:1,payloadJson:JSON.stringify(canonical(initial))});
 const snapshot=path=>({exists:rows.has(path),data:()=>structuredClone(rows.get(path))});
 const sdk={databaseId:'(default)',doc:path=>({path,get:async()=>{if(path.startsWith(FIRESTORE_OUTBOX_PREFIX+'/'))events.push('outbox-readback');return snapshot(path);}}),runTransaction:async cb=>{
  const pending=[];
  const result=await cb({get:async ref=>snapshot(ref.path),create:(ref,value)=>{assert.equal(rows.has(ref.path),false);assert.ok(ref.path.startsWith(FIRESTORE_OUTBOX_PREFIX+'/'));pending.push([ref.path,value]);events.push('outbox-create');},update:(ref,value)=>{assert.equal(ref.path,FIRESTORE_STATE_DOCUMENT);pending.push([ref.path,value]);events.push('control-'+value.revision);}});
  for(const [path,value] of pending)rows.set(path,structuredClone(value));return result;
 }};
 const options={Firestore:function(){return sdk;},expectedProjectId:'synthetic-project',expectedDatabaseId:'(default)',mutationEnabled:true};
 const state=createFirestoreState(options),outbox=createFirestoreOutbox({...options,clock:()=> '2026-11-17T12:00:00.000Z'});
 const source=Buffer.from('synthetic evidence'),artifact=Buffer.from('synthetic artifact');let calls=0;
 const job={phase:'stage',target:'synthetic-preview',editionDate:'2026-11-17',sourceSha256:sha(source),artifactSha256:sha(artifact)};
 const runner=createJobRunner({state,outbox,clock:()=> '2026-11-17T12:00:00.000Z',credentials:{checkReference:async()=>true},evidence:{read:async({sha256})=>sha256===job.sourceSha256?{bytes:source,kind:'primary',maxAgeSeconds:3600,retrievedAt:'2026-11-17T11:59:00Z',effectiveAt:'2026-11-17T11:58:00Z',expiresAt:'2026-11-17T12:03:00Z'}:{bytes:artifact}},provider:{execute:async request=>{
  calls++;events.push('provider');assert.equal((await state.read()).revision,2);assert.ok(events.includes('outbox-readback'));
  const saved=[...rows.entries()].find(([path])=>path.startsWith(FIRESTORE_OUTBOX_PREFIX+'/'))[1];assert.equal(saved.intentSha256,sha(saved.intentJson));assert.equal(Object.keys(JSON.parse(saved.intentJson))[0],'status');
  return {key:request.key,artifactSha256:request.artifactSha256,providerOperationId:'synthetic-operation'};
 }}});
 const args={config:{effectsEnabled:true,deploymentEnabled:true,credentialReference:'synthetic-reference'},job,owner:'worker-one',approval:{...job,reference:'synthetic-approval',notBefore:'2026-11-17T11:59:00Z',expiresAt:'2026-11-17T12:05:00Z'}};
 assert.equal((await runner.advance(args)).status,'provider-acknowledged-not-publicly-verified');
 assert.equal((await runner.advance(args)).status,'already-acknowledged');assert.equal(calls,1);
 assert.deepEqual(events,['control-2','outbox-create','outbox-readback','provider','control-3']);
 assert.equal((await state.read()).revision,3);assert.equal(rows.size,2);
});
