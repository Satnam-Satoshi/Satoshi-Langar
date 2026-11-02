import test from 'node:test';
import assert from 'node:assert/strict';
import { activateReviewedDailyPublication } from './cloud-ltc-activate.mjs';
import { migrationFixture } from './lib/test-migration-gate-fixture.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';

async function fixture() {
  const f = migrationFixture(), adapter = new MemoryStateAdapter();
  await adapter.conditionalWrite('website', f.document, null);
  const state = new DurableCloudState(adapter, 'website');
  const env = { GITHUB_ACTIONS:'true', GITHUB_EVENT_NAME:'workflow_dispatch', GITHUB_REF:'refs/heads/main', GITHUB_REPOSITORY:TARGET.repository, GITHUB_ACTOR_ID:'268053325', GITHUB_RUN_ID:'300', GITHUB_RUN_ATTEMPT:'1', LTC_CLOUD_PUBLISH:'true', LTC_ACCEPTANCE_ENVIRONMENT:'ltc-production', LTC_ACCEPTANCE_MANUAL:'true', LTC_ACCEPTED_IMPLEMENTATION_SHA256:f.currentControllerImplementationSha256, LTC_MIGRATION_ACCEPTANCE_SHA256:hash(f.configuration) };
  const events = [];
  const dependencies = { sourceControlCheck:async()=>events.push('source'), vercel:async endpoint=>endpoint.startsWith('/v9/') ? {id:TARGET.project,accountId:TARGET.team,name:'https-github-com-satnam-satoshi-satoshi-langar',crons:{definitions:[]}} : {id:f.pins.stagePins.previousDeployment,projectId:TARGET.project,ownerId:TARGET.team,team:{id:TARGET.team,slug:TARGET.scope},target:'production',readyState:'READY',url:'previous.vercel.app'}, currentManifest:async()=>[{file:'index.html',sha256:'a'.repeat(64)}], verifyPublic:async()=>events.push('public'), save:async()=>events.push('save') };
  return {...f,state,env,dependencies,events,adapter};
}
test('activation verifies historical proof, live baseline and owner cutover before one durable unpause; it publishes nothing', async()=>{
  const f=await fixture(), original=hash(f.document.unresolvedSetupIncident);
  const result=await activateReviewedDailyPublication(f);
  assert.equal(result.publicationPerformed,false); assert.equal(result.socialActivationPerformed,false);
  const next=await f.state.inspect(); assert.equal(next.paused,false); assert.equal(next.lease,null); assert.equal(hash(next.unresolvedSetupIncident),original);
  assert.deepEqual(f.events,['source','public','save']); assert.equal(next.migrationActivation.configurationSha256,hash(f.configuration));
});
test('missing proof, wrong actor/switch/hash and live verification failure cannot unpause', async()=>{
  for(const change of [f=>f.env.GITHUB_ACTOR_ID='2',f=>f.env.LTC_CLOUD_PUBLISH='false',f=>f.env.LTC_MIGRATION_ACCEPTANCE_SHA256='f'.repeat(64),f=>delete f.configuration.pins.completionSha256,f=>f.dependencies.verifyPublic=async()=>{throw Error('bytes');}]){
    const f=await fixture(); change(f); await assert.rejects(activateReviewedDailyPublication(f)); assert.equal((await f.state.inspect()).paused,true);
  }
});
test('CAS conflict never retries or reports activation; readback mismatch stays unresolved',async()=>{
  for(const mismatch of [false,true]){
    const f=await fixture(); let writes=0;
    f.adapter.conditionalWrite=async()=>{writes++;if(!mismatch)throw Error('conflict');};
    await assert.rejects(activateReviewedDailyPublication(f)); assert.equal(writes,1); assert.equal(f.events.includes('save'),false);
  }
});
