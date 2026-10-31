import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const workflow=await readFile(new URL('../ops/ltc-daily-workflow.yml',import.meta.url),'utf8');
const stage=workflow.slice(workflow.indexOf('\n  stage-acceptance:'));
const step=name=>{const start=stage.indexOf('      - name: '+name);assert(start>=0);const end=stage.indexOf('\n      - ',start+1);return stage.slice(start,end<0?undefined:end)};
test('acceptance workflow isolates manual main-only stage/recovery from routine publication',()=>{
 assert.match(stage,/github\.ref == 'refs\/heads\/main'/);assert.match(stage,/github\.event_name == 'workflow_dispatch'/);
 assert.match(stage,/github\.event\.sender\.id == 268053325/);assert.match(stage,/environment: ltc-production/);assert.match(stage,/contents: read\n      actions: read/);assert(!stage.includes('contents: write'));
 assert.match(stage,/e\.LTC_CLOUD_PUBLISH!=='false'/);assert.match(stage,/Unknown acceptance mode/);
 assert(stage.indexOf('Verify reviewed source and exact implementation')<stage.indexOf('secrets.'));
 assert(!/vercel\s+(?:promote|rollback|alias)|--force|--publish/.test(stage));
 assert.match(workflow,/!inputs\.acceptance_probe && \(inputs\.acceptance_mode == '' \|\| inputs\.acceptance_mode == 'none'\)/);
});
test('service credentials exist only in the acceptance effect/recovery step and never in build/plan',()=>{
 const effect=step('Explicitly approved stage-only effect or fresh-proof recovery');
 for(const name of ['GITHUB_TOKEN','VERCEL_TOKEN','LTC_GOOGLE_CLIENT_ID','LTC_GOOGLE_CLIENT_SECRET','LTC_GOOGLE_REFRESH_TOKEN']){
  assert.match(effect,new RegExp('\\b'+name+':'));
  const outside=stage.replace(effect,'');assert(!new RegExp('\\b'+name+':').test(outside));
 }
 assert(!stage.includes('LTC_BUFFER_API_KEY'));assert(!stage.includes('upload-artifact'));
 assert.match(step('Bind exact prepared artifact plan before any provider effect'),/acceptanceHash\(plan\)/);
 assert.match(effect,/--skip-domain|--mode/);assert.match(effect,/--expected-fence/);assert.match(effect,/--previous-manifest/);
});
test('recovery skips rebuild, pins original plan/fence and retains safe admitted receipt on failure',()=>{
 assert.match(step('Build exact committed source without preparing new daily data'),/if: inputs\.acceptance_mode == 'stage'/);
 assert.match(step('Bind exact prepared artifact plan before any provider effect'),/if: inputs\.acceptance_mode == 'stage'/);
 assert.match(stage,/acceptance_plan_sha256/);assert.match(stage,/acceptance_fence/);
 const summary=step('Safe acceptance result; preserve held fences after any failure');assert.match(summary,/if: always\(\)/);assert.match(summary,/fence:r\.lease\?\.fence/);
 assert(!/setPaused|conditionalWrite|release|reconcile|delete/.test(summary));
});

test('owner incident quarantine requires a private protected review packet and preserves the original outcome',()=>{
 assert.match(workflow,/options: \[none, stage, recover, quarantine\]/);
 assert.match(stage,/inputs\.acceptance_mode == 'quarantine'/);
 assert.match(stage,/github\.event\.sender\.id == 268053325/);
 assert.match(step('Validate explicit acceptance scope before credentials'),/\['recover','quarantine'\]\.includes/);
 assert.match(step('Validate explicit acceptance scope before credentials'),/Unexpected recovery\/quarantine inputs/);
 const resources=step('Select exact private resources and accepted public hash baseline');
 assert.match(resources,/LTC_SETUP_QUARANTINE_REVIEW_JSON: \$\{\{ secrets\.LTC_SETUP_QUARANTINE_REVIEW_JSON \}\}/);
 assert.match(resources,/save\('ltc-setup-quarantine-review.json',JSON\.parse\(review\)\)/);
 const effect=step('Explicitly approved stage-only effect or fresh-proof recovery');
 assert.match(effect,/LTC_ACCEPTANCE_MODE\" == quarantine/);
 assert.match(effect,/--review-file.*ltc-setup-quarantine-review.json.*--previous-manifest/);
 for(const name of ['Install pinned tools and test without service credentials','Build exact committed source without preparing new daily data','Bind exact prepared artifact plan before any provider effect']) assert(!step(name).includes('LTC_SETUP_QUARANTINE_REVIEW_JSON'));
 assert.match(stage,/LTC_SETUP_INCIDENT_SHA256: \$\{\{ vars\.LTC_SETUP_INCIDENT_SHA256 \}\}/);
 const summary=step('Safe acceptance result; preserve held fences after any failure');
 assert.match(summary,/incidentSha256:r\.incidentSha256/);assert.match(summary,/originalOutcome:r\.originalOutcome/);assert.match(summary,/productionAuthorized:r\.productionAuthorized/);
 assert(!summary.includes('LTC_SETUP_QUARANTINE_REVIEW_JSON'));
});
