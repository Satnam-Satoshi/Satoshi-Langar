import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {DurableCloudState,MemoryStateAdapter} from './cloud-ltc-state.mjs';import {packageEvidence} from './cloud-ltc-evidence.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
async function setup(){const state=new DurableCloudState(new MemoryStateAdapter(),'compaction',{clock:()=>1000});await state.setPaused(false);return state;}
async function confirm(state,lease,id,payload,remote={checked:true}){const payloadSha256=hash(JSON.stringify(payload));await state.intend(lease,id,payloadSha256,payload);await state.assertMayMutate(lease,id);const proof={operationId:id,payloadSha256,status:'applied',proof:remote};await state.reconcile(id,'confirmed',hash(JSON.stringify(proof)),proof);return payloadSha256;}
async function summary(state,lease,id,{remoteEdit}={}){
 const backup=await state.backup();const summaryBundle=packageEvidence([{path:'ledger-backup.json',bytes:Buffer.from(JSON.stringify(backup))}]);const payload={kind:'drive-evidence',role:'release-summary',archivedStateSha256:backup.sha256,fileId:`file_for_${id}`,folderId:'selected_folder_123',sha256:summaryBundle.sha256,bytes:summaryBundle.length};
 const remote={fileId:payload.fileId,folderId:payload.folderId,sha256:summaryBundle.sha256,length:summaryBundle.length,ownerOnly:true,downloadVerified:true};if(remoteEdit)remoteEdit(remote);
 const payloadSha256=await confirm(state,lease,id,payload,remote);
 await state.recordLatestRelease(lease,{source:'a'.repeat(40),deployment:'dpl_fixture',artifactManifestSha256:'b'.repeat(64),summary:{operationId:id,archivedStateSha256:backup.sha256,payloadSha256,fileId:payload.fileId,folderId:payload.folderId,sha256:summaryBundle.sha256,length:summaryBundle.length}});
 return {backup,summaryBundle,summaryOperationId:id};
}
test('only exact archived terminal intents compact after private verified summary and checkpoint',async()=>{
 const state=await setup(),lease=await state.acquire('run1');await confirm(state,lease,'source1',{source:'a'.repeat(40)});const inputs=await summary(state,lease,'summary1');
 const result=await state.compactArchivedState(lease,inputs),doc=await state.inspect();assert.equal(result.archivedIntentCount,1);assert.deepEqual(Object.keys(doc.intents),['summary1']);assert.deepEqual(Object.keys(doc.receipts),['summary1']);assert.equal(doc.latestRelease.summary.operationId,'summary1');assert.equal(doc.archiveHead.backupSha256,inputs.backup.sha256);assert.equal(doc.archiveHead.previousArchiveSha256,null);assert.equal((await state.compactArchivedState(lease,inputs)).alreadyCompacted,true);
});
test('unknown or unverified private upload cannot authorize compaction',async()=>{
 const state=await setup(),lease=await state.acquire('run1');await confirm(state,lease,'source1',{value:1});const inputs=await summary(state,lease,'summary1',{remoteEdit:r=>r.downloadVerified=false});const before=await state.inspect();await assert.rejects(state.compactArchivedState(lease,inputs),/archive_unverified/);assert.deepEqual(await state.inspect(),before);
});
test('backup changes, summary bytes mismatch and post-backup terminal entries cannot be pruned',async()=>{
 const state=await setup(),lease=await state.acquire('run1');await confirm(state,lease,'source1',{value:1});const inputs=await summary(state,lease,'summary1');
 await assert.rejects(state.compactArchivedState(lease,{...inputs,backup:{...inputs.backup,sha256:'0'.repeat(64)}}),/invalid_compaction_backup/);
 const changedBundle=packageEvidence([{path:'ledger-backup.json',bytes:Buffer.from('{}')}]);await assert.rejects(state.compactArchivedState(lease,{...inputs,summaryBundle:changedBundle}),/summary_backup_mismatch/);
 await confirm(state,lease,'not_in_backup',{value:2});const before=await state.inspect();await assert.rejects(state.compactArchivedState(lease,inputs),/entry_not_archived/);assert.deepEqual(await state.inspect(),before);
});
test('unresolved intents are retained intact even when other archived entries compact',async()=>{
 const state=await setup(),lease=await state.acquire('run1');await confirm(state,lease,'source1',{value:1});const inputs=await summary(state,lease,'summary1');
 await state.intend(lease,'pending1',hash('{}'),{});await state.intend(lease,'uncertain1',hash('{}'),{});await state.assertMayMutate(lease,'uncertain1');
 const before=await state.inspect();await state.compactArchivedState(lease,inputs);const after=await state.inspect();assert.deepEqual(after.intents.pending1,before.intents.pending1);assert.deepEqual(after.intents.uncertain1,before.intents.uncertain1);assert(!after.intents.source1);await assert.rejects(state.release(lease),/reconciliation_required/);
});
test('many daily archives retain bounded live state and cryptographically link prior archive head',async()=>{
 const state=await setup();let prior=null;
 for(let day=0;day<40;day++){
  const lease=await state.acquire(`run${day}`);for(let n=0;n<12;n++)await confirm(state,lease,`day${day}_op${n}`,{value:n,padding:'x'.repeat(400)});
  const inputs=await summary(state,lease,`summary${day}`);await state.compactArchivedState(lease,inputs);const doc=await state.inspect();assert.equal(doc.archiveHead.previousArchiveSha256,prior?hash(JSON.stringify(prior)):null);assert(JSON.stringify(doc).length<10000);assert.equal(Object.keys(doc.intents).length,1);prior=doc.archiveHead;await state.release(lease);
 }
});
