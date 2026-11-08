import test from 'node:test';
import assert from 'node:assert/strict';
import {assertReviewDryRunResult} from './check-cloud-ltc-review-result.mjs';
test('paused review requires exact no-publication refusal, not arbitrary failure',()=>{
 const good={policy:{paused:true},exitCode:1,receipt:{mode:'dry-run',published:false,failure:'publication_paused'}};
 assert.equal(assertReviewDryRunResult(good),'pause-enforcement-verified');
 for(const mutate of [v=>v.exitCode=0,v=>v.exitCode=2,v=>v.receipt.published=true,v=>v.receipt.failure='implementation_changed',v=>v.receipt.failure='command_failed_pnpm',v=>v.receipt.mode='publish',v=>v.receipt=null]){
  const v=structuredClone(good);mutate(v);assert.throws(()=>assertReviewDryRunResult(v));
 }
});
test('open policy still requires a successful dry run and missing/invalid states fail',()=>{
 const good={policy:{paused:false},exitCode:0,receipt:{mode:'dry-run',published:false}};
 assert.equal(assertReviewDryRunResult(good),'dry-run-verified');
 for(const mutate of [v=>v.exitCode=1,v=>v.policy.paused=undefined,v=>v.policy.paused='true',v=>v.receipt.published=true,v=>v.receipt.failure='publication_paused']){
  const v=structuredClone(good);mutate(v);assert.throws(()=>assertReviewDryRunResult(v));
 }
});
