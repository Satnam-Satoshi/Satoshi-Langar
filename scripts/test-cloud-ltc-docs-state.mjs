import test from 'node:test';
import assert from 'node:assert/strict';
import { ReleaseOperationCoordinator } from './cloud-ltc-operations.mjs';
import { GoogleDocsStateAdapter } from './cloud-ltc-docs-state.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { admitDurablePublication, requireDurableAdapter, runRelease, assertMigrationAcceptance } from './cloud-ltc-release.mjs';
const documentId = 'ledger-fixture'; const folderId = 'folder-fixture';
function fixture() {
  let revision = 1; let raw = ''; const calls = []; let ambiguous = false; let status = 200;
  const metadata = {id:documentId,mimeType:'application/vnd.google-apps.document',trashed:false,ownedByMe:true,shared:false,parents:[folderId],capabilities:{canEdit:true}};
  const document = () => ({documentId,revisionId:`rev-${revision}`,tabs:[{tabProperties:{tabId:'tab-one'},documentTab:{body:{content:[{endIndex:1,sectionBreak:{}},{startIndex:1,endIndex:raw.length+2,paragraph:{elements:[{startIndex:1,endIndex:raw.length+2,textRun:{content:raw+'\n'}}]}}]}}}]});
  const client = {
    getFileMetadata: async () => ({status,body:structuredClone(metadata)}),
    getDocument: async (_,options) => { assert.deepEqual(options,{includeTabsContent:true,suggestionsViewMode:'SUGGESTIONS_INLINE'}); return {status:200,body:document()}; },
    batchUpdateDocument: async (id,body) => {
      assert.equal(id,documentId); calls.push(body);
      assert.deepEqual(Object.keys(body.writeControl),['requiredRevisionId']);
      if (body.writeControl.requiredRevisionId !== `rev-${revision}`) return {status:400,body:{}};
      for(const request of body.requests) {
        if(request.deleteContentRange) { const range = request.deleteContentRange.range; assert.equal(range.tabId,'tab-one'); assert.equal(range.endIndex,raw.length+1); raw = ''; }
        else { assert.equal(request.insertText.location.tabId,'tab-one'); raw = request.insertText.text+raw; }
      }
      revision++;
      if(ambiguous) { ambiguous=false; throw Error('private token must not escape'); }
      return {status:200,body:{documentId,writeControl:{requiredRevisionId:`rev-${revision}`}}};
    },
  };
  const adapter = new GoogleDocsStateAdapter({documentId,folderId,client});
  return {adapter,client,metadata,calls,document,setRaw:v=>{raw=v;revision++},timeout:()=>{ambiguous=true},setStatus:v=>{status=v}};
}
test('provisioned blank ledger bootstrap is CAS: concurrent creates have exactly one winner', async () => {
  const {adapter,calls} = fixture();
  assert.deepEqual(await adapter.read('website'),{value:null,version:null});
  const results = await Promise.allSettled([adapter.conditionalWrite('website',{owner:'one'},null),adapter.conditionalWrite('website',{owner:'two'},null)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.message,'state_conflict');
  assert.equal(calls.length,2);
  await assert.rejects(adapter.conditionalWrite('website',{owner:'third'},null),/state_conflict/);
});
test('two writers using same revision cannot overwrite; UTF16 end indexes preserve Unicode', async () => {
  const {adapter,calls} = fixture(); await adapter.conditionalWrite('website',{note:'☀️ Litecoin 🚀'},null);
  const current = await adapter.read('website');
  const results = await Promise.allSettled([adapter.conditionalWrite('website',{note:'next'},current.version),adapter.conditionalWrite('website',{note:'other'},current.version)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.message,'state_conflict');
  assert.ok(calls.at(-1).requests.some(r=>r.deleteContentRange));
});
test('ambiguous successful write is never silently retried and readback establishes stored value', async () => {
  const f=fixture(); f.timeout();
  await assert.rejects(f.adapter.conditionalWrite('website',{fence:7},null),error=>error.message==='storage_write_uncertain');
  assert.equal(f.calls.length,1);
  assert.deepEqual((await f.adapter.read('website')).value,{fence:7});
  await assert.rejects(f.adapter.conditionalWrite('website',{fence:8},null),/state_conflict/);
});
test('arbitrary400 or ambiguous response is not treated as accepted mutation or safe retry', async () => {
  for(const result of [{status:400,body:{}},{status:200,body:{documentId,writeControl:{targetRevisionId:'merged'}}},{status:403,body:{error:'private'}},{status:200,body:{documentId:'other',writeControl:{requiredRevisionId:'x'}}}]) {
    const f=fixture(); f.client.batchUpdateDocument=async()=>result;
    await assert.rejects(f.adapter.conditionalWrite('website',{a:1},null),/storage_write_uncertain/);
  }
});
test('missing, shared, trashed or moved ledger fails closed without creating replacement', async () => {
  for(const patch of [{shared:true},{trashed:true},{ownedByMe:false},{parents:['different']},{mimeType:'application/json'},{capabilities:{canEdit:false}}]) {
    const f=fixture();Object.assign(f.metadata,patch);
    await assert.rejects(f.adapter.read('website'),/private_storage_required/);
    assert.equal(f.calls.length,0);
  }
  const f=fixture();f.setStatus(404);await assert.rejects(f.adapter.conditionalWrite('website',{a:1},null),/storage_read_failed/);assert.equal(f.calls.length,0);
});
test('malformed, wrong-key, noncanonical, multi-tab and suggested state cannot be overwritten', async () => {
  for(const raw of ['not JSON','{}','{"schemaVersion":1,"key":"wrong","value":{}}','{ "schemaVersion":1,"key":"website","value":{}}','null','{"schemaVersion":1,"key":"website","value":[]}']) {
    const f=fixture();f.setRaw(raw);await assert.rejects(f.adapter.read('website'),/invalid_state_document/);assert.equal(f.calls.length,0);
  }
  for(const mutate of [d=>d.tabs.push(structuredClone(d.tabs[0])),d=>d.tabs[0].childTabs=[{}],d=>d.tabs[0].documentTab.body.content[1].paragraph.elements[0].suggestedInsertionIds=['x'],d=>d.tabs[0].documentTab.body.content[1].paragraph.elements[0].textRun.textStyle={link:{url:'https://untrusted'}}]) {
    const f=fixture();f.client.getDocument=async()=>{const d=f.document();mutate(d);return {status:200,body:d}};
    await assert.rejects(f.adapter.conditionalWrite('website',{a:1},null),/invalid_state_document/);assert.equal(f.calls.length,0);
  }
});
test('actual DurableCloudState interface uses remote CAS for leases and uncertain-operation fencing', async () => {
  const f=fixture();const state=new DurableCloudState(f.adapter,'website',{clock:()=>1000});
  await assert.rejects(state.acquire('run-a'),/publication_paused/);
  await state.setPaused(false);
  const attempts=await Promise.allSettled([state.acquire('run-a'),state.acquire('run-b')]);
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
  const lease=attempts.find(r=>r.status==='fulfilled').value;
  await state.intend(lease,'promotion','a'.repeat(64));
  await state.assertMayMutate(lease,'promotion');
  await assert.rejects(state.assertMayMutate(lease,'promotion'),/reconciliation_required/);
  await assert.rejects(state.release(lease),/reconciliation_required/);
  await state.reconcile('promotion','confirmed','b'.repeat(64));await state.release(lease);
  assert.equal((await state.inspect()).lease,null);
});
test('crash after durable mutation authorization leaves uncertain intent that blocks replay', async () => {
  const f=fixture(); const state=new DurableCloudState(f.adapter,'website',{clock:()=>1000});
  await state.setPaused(false);const lease=await state.acquire('run-a');await state.intend(lease,'commit','a'.repeat(64));
  f.timeout();await assert.rejects(state.assertMayMutate(lease,'commit'),/storage_write_uncertain/);
  assert.equal((await state.inspect()).intents.commit.status,'uncertain');
  await assert.rejects(state.assertMayMutate(lease,'commit'),/reconciliation_required/);
  await assert.rejects(state.acquire('run-b'),/lease_held/);
});
test('restore requires provisioned blank destination and retains paused restore hold', async () => {
  const f=fixture();const source=new DurableCloudState(f.adapter,'website');await source.setPaused(false);
  const backup=await source.backup();const destinationFixture=fixture();
  const restored=new DurableCloudState(destinationFixture.adapter,'website');
  await restored.restore(backup);assert.equal((await restored.inspect()).restoreHold,true);
  await assert.rejects(restored.setPaused(false),/restore_acceptance_required/);
  await assert.rejects(restored.restore(backup),/state_conflict/);
});

test('publisher admission rejects missing/memory adapter before filesystem, provider or mutation', async () => {
  for(const adapter of [undefined,{},new MemoryStateAdapter()]) {
    assert.throws(()=>requireDurableAdapter(adapter),/durable_adapter_required/);
    await assert.rejects(runRelease({publish:true,root:'/does-not-exist'}, {}, {stateAdapter:adapter}),/durable_adapter_required/);
  }
  assert.throws(assertMigrationAcceptance,/migration_acceptance_pending/);
});
test('runner lease admission respects pause, restore hold and one-writer fencing; never unpauses', async () => {
  const f=fixture();const state=new DurableCloudState(f.adapter,'website',{clock:()=>1000});
  await assert.rejects(admitDurablePublication({env:{},adapter:f.adapter,runId:'gha-123-1',clock:()=>1000}),/publication_paused/);
  assert.equal(f.calls.length,0);
  await state.setPaused(false);
  const attempts=await Promise.allSettled([admitDurablePublication({env:{},adapter:f.adapter,runId:'gha-123-1',clock:()=>1000}),admitDurablePublication({env:{},adapter:f.adapter,runId:'gha-124-1',clock:()=>1000})]);
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
  const lease=attempts.find(r=>r.status==='fulfilled').value.lease;
  assert.equal(lease.fence,1);assert.equal(lease.expiresAt,3601000);
  await assert.rejects(admitDurablePublication({env:{},adapter:f.adapter,runId:'gha-125-1',clock:()=>99999999}),/lease_held/);
  await assert.rejects(admitDurablePublication({env:{},adapter:f.adapter,runId:'arbitrary'}),/invalid_cloud_run_id/);
  const backup=await state.backup();const g=fixture();const restored=new DurableCloudState(g.adapter,'website');await restored.restore(backup);
  await assert.rejects(admitDurablePublication({env:{},adapter:g.adapter,runId:'gha-126-1'}),/publication_paused/);
});

test('operation coordinator with actual Docs adapter preserves uncertain effect across reconstructed coordinator', async () => {
  const f=fixture();const state=new DurableCloudState(f.adapter,'website',{clock:()=>1000});await state.setPaused(false);const lease=await state.acquire('run-operation');
  let calls=0;const provider={apply:async()=>{calls++;throw Error('timeout after effect')},readback:async context=>({...context,status:'applied',proof:{verifiedRemoteId:'fixture'}})};
  const operation={operationId:'source-docs',payload:{sha:'fixed'},provider};
  await assert.rejects(new ReleaseOperationCoordinator({state,lease}).execute(operation),/operation_outcome_uncertain/);
  const recovered=new ReleaseOperationCoordinator({state:new DurableCloudState(f.adapter,'website',{clock:()=>1000}),lease});
  await assert.rejects(recovered.execute(operation),/operation_reconciliation_required/);assert.equal(calls,1);
  assert.equal((await recovered.reconcile(operation)).status,'confirmed');await state.release(lease);
});


test('explicit protected quarantine pin rejects an unbound fixture before any lease CAS', async () => {
  const f=fixture();const state=new DurableCloudState(f.adapter,'website',{clock:()=>1000});
  await state.setPaused(false);
  const before=await f.adapter.read('website'),writes=f.calls.length;
  await assert.rejects(admitDurablePublication({adapter:f.adapter,runId:'gha-127-1',clock:()=>1000,env:{LTC_UPLOAD_QUARANTINE_COMPLETION_SHA256:'f'.repeat(64)}}),/upload_quarantine_independent_acceptance_required/);
  assert.equal(f.calls.length,writes);
  assert.deepEqual(await f.adapter.read('website'),before);
  assert.equal((await state.inspect()).lease,null);
  assert.equal((await state.inspect()).fence,0);
});
