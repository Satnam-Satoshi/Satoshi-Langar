import test from 'node:test';import assert from 'node:assert/strict';
import {readonlyGoogleTransport,runReadOnlyPreflight} from './cloud-ltc-f33-preflight-cli.mjs';
import {f33Digest} from './cloud-ltc-f33-fresh-admission.mjs';
test('read-only transport blocks mutation and non-Google destinations before request',async()=>{
 let calls=0;const f=readonlyGoogleTransport(async()=>{calls++;return {};});
 for(const [u,method] of [['https://docs.googleapis.com/v1/documents/id:batchUpdate','POST'],['https://www.googleapis.com/upload/drive/v3/files','POST'],['https://api.github.com/repos/x','GET'],['https://oauth2.googleapis.com/token?x=y','POST']])await assert.rejects(f(u,{method}));
 assert.equal(calls,0);await f('https://docs.googleapis.com/v1/documents/id');await f('https://oauth2.googleapis.com/token',{method:'POST'});assert.equal(calls,2);
});
const env={GITHUB_REPOSITORY:'Satnam-Satoshi/Satoshi-Langar',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_ACTOR_ID:'268053325',GITHUB_RUN_ATTEMPT:'1',LTC_F33_PREFLIGHT_MODE:'read-only-preflight',LTC_ACCEPTED_IMPLEMENTATION_SHA256:'a'.repeat(64)};
test('missing protected review returns categorical blocker before provider credentials',async()=>{
 let calls=0;const r=await runReadOnlyPreflight({env,verify:async()=>{},providerFactory:async()=>{calls++;throw Error('secret');}});
 assert.equal(r.phase,'protected-review');assert.equal(calls,0);assert.equal(JSON.stringify(r).includes('secret'),false);
});
test('real bundle passed verbatim to pure preflight with only selected reads',async()=>{
 const input={admission:{sourceCommit:'b'.repeat(40),implementationSha256:env.LTC_ACCEPTED_IMPLEMENTATION_SHA256}},migration={pin:'retained'},snapshot={actual:true},receipt={actualReceipt:true};let reads=0;
 const r=await runReadOnlyPreflight({env:{...env,LTC_F33_ACTIVATION_REVIEW_JSON:JSON.stringify(input),LTC_F33_ACTIVATION_REVIEW_SHA256:f33Digest(input),LTC_MIGRATION_ACCEPTANCE_JSON:JSON.stringify(migration),LTC_MIGRATION_ACCEPTANCE_SHA256:f33Digest(migration)},verify:async()=>{},git:()=>input.admission.sourceCommit,providerFactory:async()=>({readState:async()=>{reads++;return {value:snapshot};},readFinishedReceipt:async()=>{reads++;return receipt;},compareAndSwapExact:()=>{throw Error('unexpected write');}}),preflight:args=>{assert.equal(args.snapshot,snapshot);assert.equal(args.receipt,receipt);assert.deepEqual(args.admission,input.admission);assert.deepEqual(args.migration,migration);}});
 assert.equal(r.status,'read-only-preflight-passed');assert.equal(reads,2);assert.equal(r.activationAuthorized,false);
});

test('preflight workflow supplies exact historical generation pins and labels read-only scope',async()=>{
 const {readFile}=await import('node:fs/promises');const text=await readFile(new URL('../.github/workflows/ltc-f33-fresh-activation.yml',import.meta.url),'utf8');
 const job=text.slice(text.indexOf('  read-only-preflight:'));
 for(const key of ['LTC_UPLOAD_QUARANTINE_COMPLETION_SHA256','LTC_ROUTINE_RETIREMENT_COMPLETION_SHA256','LTC_ROUTINE_RETIREMENT_FRESH_PROOF_SHA256','LTC_ROUTINE_FOLLOWUP_COMPLETION_SHA256','LTC_ROUTINE_FOLLOWUP_FRESH_PROOF_SHA256'])assert.ok(job.includes(key+': ${{ vars.'+key+' }}'));
 assert.match(text,/Read-only protected-input preflight only/);assert.doesNotMatch(job,/VERCEL_TOKEN|LTC_BUFFER_API_KEY|github.token/);
});
