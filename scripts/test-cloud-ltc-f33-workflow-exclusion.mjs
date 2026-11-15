import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {LEGACY_CREDENTIAL_WORKFLOWS,READ_ONLY_WORKFLOWS,validateWorkflowExclusion,createWorkflowExclusion} from './cloud-ltc-f33-workflow-exclusion.mjs';
import {f33Digest} from './cloud-ltc-f33-fresh-admission.mjs';
function fixture(){
 const config={runId:'123',workflowId:9001,workflowPath:'.github/workflows/ltc-f33-fresh-activation.yml',workflowSha:'a'.repeat(40),sourceSha:'b'.repeat(40),sourceBranch:'agent/wall-street-20261011',group:'ltc-production-publication',cancelInProgress:false,newWorkflows:[{id:9001,path:'.github/workflows/ltc-f33-fresh-activation.yml'},{id:9002,path:'.github/workflows/ltc-fresh-daily-publication.yml'},{id:9003,path:'.github/workflows/ltc-social-maintenance-v2.yml'}]};
 const workflows={total_count:18,workflows:[...Object.entries(LEGACY_CREDENTIAL_WORKFLOWS).map(([id,path])=>({id:Number(id),path,state:'disabled_manually'})),...Object.entries(READ_ONLY_WORKFLOWS).map(([id,path])=>({id:Number(id),path,state:'active'})),...config.newWorkflows.map(w=>({...w,state:'active'}))]};
 const inventory=['queued','in_progress','waiting','pending','requested'].map(status=>({status,total_count:status==='in_progress'?1:0,workflow_runs:status==='in_progress'?[{id:123,workflow_id:9001,run_attempt:1,head_branch:'main',head_sha:config.workflowSha,path:config.workflowPath,status,event:'workflow_dispatch'}]:[]}));
 return {config,workflows,inventory,main:{object:{sha:config.workflowSha}},source:{object:{sha:config.sourceSha}},now:1000};
}
test('distinct new identities with all legacy credential workflows disabled',()=>assert.equal(validateWorkflowExclusion(fixture()).expiresAt,301000));
for(const [label,mutate] of [
 ['old daily enabled',f=>f.workflows.workflows.find(w=>w.id===373667484).state='active'],
 ['old queued job retains secrets',f=>{f.inventory[0].total_count=1;f.inventory[0].workflow_runs=[{id:42,workflow_id:373667484,status:'queued'}];}],
 ['unknown workflow',f=>f.workflows.workflows[0].id=99999],
 ['renamed old daily identity',f=>f.config.newWorkflows[0].id=373667484],
 ['incomplete inventory',f=>f.workflows.total_count++],
 ['source changed',f=>f.source.object.sha='c'.repeat(40)],
 ['main changed',f=>f.main.object.sha='c'.repeat(40)],
 ['rerun',f=>f.inventory[1].workflow_runs[0].run_attempt=2],
 ['new publisher disabled',f=>f.workflows.workflows.at(-1).state='disabled_manually'],
])test('reject '+label,()=>{const f=fixture();mutate(f);assert.throws(()=>validateWorkflowExclusion(f),/f33_exclusion_/);});
test('capability binds review, requires persistent local stop and expires',async()=>{
 const f=fixture();let now=1000,local=true;const reads=[];
 const readGitHub=async suffix=>{reads.push(suffix);if(suffix==='git/ref/heads/main')return f.main;if(suffix.startsWith('git/ref/'))return f.source;if(suffix==='actions/workflows?per_page=100')return f.workflows;return f.inventory.find(p=>suffix.includes('status='+p.status+'&'));};
 const barrier=createWorkflowExclusion({config:f.config,readGitHub,assertLocalStop:()=>local,clock:()=>now});
 const binding={test:'one'},cap=await barrier.acquire({binding,configuration:{writerExclusionSha256:f33Digest(f.config)}});
 assert.equal(cap.assertHeld(binding),true);assert.equal(reads.length,8);assert.throws(()=>cap.assertHeld({test:'two'}));local=false;assert.throws(()=>cap.assertHeld(binding));local=true;now=301000;assert.throws(()=>cap.assertHeld(binding));
});
test('replacement workflow gates are off unless explicitly configured and website-only',async()=>{
 const publisher=await readFile(new URL('../.github/workflows/ltc-fresh-daily-publication.yml',import.meta.url),'utf8');
 const activation=await readFile(new URL('../.github/workflows/ltc-f33-fresh-activation.yml',import.meta.url),'utf8');
 assert.match(publisher,/vars\.LTC_FRESH_PUBLISH_ENABLED == 'true'/);assert.match(publisher,/default: true/);
 assert.match(activation,/vars\.LTC_F33_ACTIVATION_ENABLED == 'true'/);assert.match(activation,/environment: ltc-receipt-owner-approval/);
 for(const s of [publisher,activation]){assert.match(s,/group: ltc-production-publication/);assert.match(s,/cancel-in-progress: false/);assert.match(s,/github.run_attempt == 1/);assert.doesNotMatch(s,/secrets\.LTC_BUFFER|SMTP|RESEND|SENDGRID|social-reconcile\.mjs/);}
});
test('separate social maintenance preserves all finite modes and no publisher credentials',async()=>{
 const s=await readFile(new URL('../.github/workflows/ltc-social-maintenance-v2.yml',import.meta.url),'utf8');
 assert.match(s,/vars\.LTC_SOCIAL_MAINTENANCE_ENABLED == 'true'/);
 assert.match(s,/options: \[inspect, bootstrap, private-draft, reconcile-private-draft, reconcile-sent\]/);
 assert.match(s,/group: ltc-production-publication/);assert.match(s,/cancel-in-progress: false/);
 assert.equal((s.match(/github.run_attempt == 1/g)||[]).length,2);
 assert.match(s,/loadGuardedSocialAcceptanceInputs/);assert.match(s,/loadGuardedReconciliationInputs/);
 assert.match(s,/cloud-ltc-social-acceptance\.mjs "\$@"/);assert.match(s,/cloud-ltc-social-reconcile\.mjs --mode apply/);
 assert.doesNotMatch(s,/schedule:|LTC_VERCEL|LTC_GITHUB|SMTP|SENDGRID|RESEND|upload-artifact/);
 for(const gate of ['LTC_CLOUD_PUBLISH','LTC_CLOUD_SOCIAL_PUBLISH','LTC_SOCIAL_CLOUD_PUBLISH','LTC_SOCIAL_PUBLISH'])assert.equal((s.match(new RegExp(gate+": 'false'",'g'))||[]).length,2);
});
