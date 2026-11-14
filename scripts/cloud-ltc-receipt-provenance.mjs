import {createHash} from 'node:crypto';
const check=(v,c)=>{if(!v)throw Error('receipt_provenance_'+c);};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,160}$/.test(v);
export function receiptProvenance(config){
 check(config&&id(config.folderId)&&id(config.ownerPermissionId)&&/^[1-9][0-9]{0,19}$/.test(config.runId??'')&&config.attempt===1&&/^[A-Za-z][A-Za-z0-9 -]{3,79}$/.test(config.incident??''),'config');
 return Object.freeze({incident:config.incident,runId:config.runId,attempt:1});
}
export function receiptBody(config){const p=receiptProvenance(config);return Object.freeze({name:`LTC recovery receipt - ${p.incident} - run ${p.runId}`,mimeType:'application/vnd.google-apps.document',parents:Object.freeze([config.folderId]),appProperties:Object.freeze({incident:p.incident,githubRunId:p.runId,githubRunAttempt:'1',recordKind:'recovery-receipt'})});}
export const receiptBodyHash=config=>createHash('sha256').update(JSON.stringify(receiptBody(config))).digest('hex');
// Read-only adapter must supply authoritative complete run/job/step inventories.
// No caller boolean, filename absence or zero-result Drive lookup authorizes create.
export function validatePriorBootstrapInventory({inventory,currentRunId,workflowPath,repository,now}){
 check(Number.isFinite(now)&&Number.isFinite(inventory?.observedAt)&&now>=inventory.observedAt&&now-inventory.observedAt<30000,'stale');
 check(inventory.total_count===inventory.runs?.length&&inventory.total_count>0&&inventory.total_count<=100&&!inventory.nextPage,'incomplete');
 const seen=new Set();let current=0;
 for(const entry of inventory.runs){const r=entry.run;check(r&&typeof r.id==='number'&&Number.isSafeInteger(r.id)&&!seen.has(r.id),'run');seen.add(r.id);
  check(r.repository?.full_name===repository&&r.path===workflowPath&&r.event==='workflow_dispatch'&&r.head_branch==='main'&&r.run_attempt===1,'identity');
  if(String(r.id)===currentRunId){current++;check(r.status==='in_progress','current');continue;}
  check(r.status==='completed'&&['failure','cancelled'].includes(r.conclusion),'prior_outcome');
  const jobs=entry.jobs;check(jobs&&jobs.total_count===jobs.jobs?.length&&jobs.total_count>0&&jobs.total_count<=100&&!jobs.nextPage,'jobs');
  let createSteps=0;
  for(const j of jobs.jobs){check(j.run_id===r.id&&j.run_attempt===1&&j.head_sha===r.head_sha&&j.status==='completed'&&Array.isArray(j.steps),'job');for(const s of j.steps){if(s.name==='Create private receipt once'){createSteps++;check(s.status==='completed'&&s.conclusion==='skipped','prior_create_unknown');}}}
  check(createSteps===1,'missing_create_step');
 }
 check(current===1,'current_missing');return true;
}
// Native approval is the authority; provenance is just a non-secret record label.
// Both adapters are trusted runtime code, not JSON-supplied callbacks.
export function createNativeReceiptAdmission({config,readNativeApproval,readPriorInventory,clock=Date.now}){
 config=Object.freeze({...config});
 const p=receiptProvenance(config),bodySha256=receiptBodyHash(config),native=readNativeApproval,inventory=readPriorInventory;
 check(typeof native==='function'&&typeof inventory==='function'&&typeof clock==='function','adapters');let used=false;
 return async binding=>{check(!used,'already_invoked');used=true;const first=clock();check(Number.isFinite(first),'clock');
  const prior=structuredClone(await inventory());validatePriorBootstrapInventory({inventory:prior,currentRunId:p.runId,workflowPath:config.workflowPath,repository:'Satnam-Satoshi/Satoshi-Langar',now:clock()});
  const proof=Object.freeze({...await native()});check(proof.runId===p.runId&&Number.isFinite(proof.observedAt)&&Number.isFinite(proof.expiresAt),'native');
  const assertInvocation=b=>{const now=clock();check(Number.isFinite(now)&&now>=first&&now-first<30000&&now>=proof.observedAt&&now<proof.expiresAt,'expired');check(b?.action==='create-one-private-receipt-document'&&b.runId===p.runId&&b.attempt===1&&b.incident===p.incident&&b.bodySha256===bodySha256&&b.folderId===config.folderId&&b.ownerPermissionId===config.ownerPermissionId,'binding');return true;};
  assertInvocation(binding);return Object.freeze({assertInvocation,admissionMode:'bounded-single-invocation',exactlyOnceGuaranteed:false});
 };
}

export function matchesReceiptProperties(actual,config){const expected=receiptBody(config).appProperties;return !!actual&&typeof actual==='object'&&!Array.isArray(actual)&&Object.keys(actual).sort().join('|')===Object.keys(expected).sort().join('|')&&Object.keys(expected).every(k=>actual[k]===expected[k]);}
