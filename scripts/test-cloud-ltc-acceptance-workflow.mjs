import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync,spawnSync} from 'node:child_process';
const workflow=await readFile(new URL('../ops/ltc-daily-workflow.yml',import.meta.url),'utf8');
const stage=workflow.slice(workflow.indexOf('\n  stage-acceptance:'));
const step=name=>{const start=stage.indexOf('      - name: '+name);assert(start>=0);const end=stage.indexOf('\n      - ',start+1);return stage.slice(start,end<0?undefined:end)};
test('acceptance workflow isolates manual main-only stage/recovery from routine publication',()=>{
 assert.match(stage,/github\.ref == 'refs\/heads\/main'/);assert.match(stage,/github\.event_name == 'workflow_dispatch'/);
 assert.match(stage,/github\.event\.sender\.id == 268053325/);assert.match(stage,/environment: ltc-production/);assert.match(stage,/contents: read\n      actions: read/);assert(!stage.includes('contents: write'));
 assert.match(stage,/e\.LTC_CLOUD_PUBLISH!==\(e\.LTC_ACCEPTANCE_MODE==='activate-cloud'\?'true':'false'\)/);assert.match(stage,/Unknown acceptance mode/);
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
 assert(!stage.replace(effect,'').includes('LTC_BUFFER_API_KEY')); assert(!stage.includes('upload-artifact'));
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
 assert.match(workflow,/options: \[none, stage, recover, quarantine, promotion-proof, promotion-reconcile, promotion-rollback, activate-cloud, social-inspect, social-bootstrap, social-private-draft, social-reconcile-private-draft, pre-effect-retire, continue-staged, retire-staged, inspect-upload-failure, quarantine-uploads, recover-promotion-checkpoint\]/);
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

test('controlled proof and activation share the existing manual job and ten inputs, with isolated protected review pins',()=>{
 const inputs=workflow.slice(workflow.indexOf('    inputs:'),workflow.indexOf('permissions:'));
 assert.equal((inputs.match(/^      [a-z_0-9]+:/gm)||[]).length,10);
 assert.equal((workflow.match(/cron:/g)||[]).length,1);
 const effect=step('Explicitly approved stage-only effect or fresh-proof recovery');
 for(const mode of ['promotion-proof','promotion-reconcile','promotion-rollback','activate-cloud'])assert(stage.includes(mode));
 for(const name of ['LTC_CONTROLLED_PROMOTION_REVIEW_SHA256','LTC_MIGRATION_ACCEPTANCE_SHA256'])assert(effect.includes(name));
 assert(effect.includes('cloud-ltc-controlled-promotion.mjs'));assert(effect.includes('cloud-ltc-activate.mjs'));
 assert(!step('Install pinned tools and test without service credentials').includes('secrets.'));
});

test('finite social modes use the same protected manual job, exact raw JSON bundle and closed daily switches',()=>{
 const effect=step('Explicitly approved stage-only effect or fresh-proof recovery');
 for(const mode of ['social-inspect','social-bootstrap','social-private-draft','social-reconcile-private-draft'])assert(stage.includes(mode));
 assert(effect.includes('cloud-ltc-social-acceptance.mjs'));assert(effect.includes('LTC_SOCIAL_ACCEPTANCE_POLICY_SHA256'));
 assert(effect.includes('maxOutputLength:1800000'));assert(effect.includes('writeFileSync(process.env.RUNNER_TEMP'));assert(effect.includes('bundle[key],{flag:'));
 assert(effect.includes('--historical-copy-evidence'));assert(effect.includes("LTC_SOCIAL_PUBLISH: 'false'"));
 assert(!step('Build exact committed source without preparing new daily data').includes('LTC_BUFFER_API_KEY'));
});

test('pre-effect retirement is manual founder-only with separate protected review and full previous baseline',()=>{
 const effect=step('Explicitly approved stage-only effect or fresh-proof recovery');
 assert(stage.includes("inputs.acceptance_mode == 'pre-effect-retire'"));assert(effect.includes('LTC_PRE_EFFECT_RECOVERY_REVIEW_JSON'));assert(effect.includes('LTC_PRE_EFFECT_RECOVERY_REVIEW_SHA256'));
 assert(effect.includes('cloud-ltc-pre-effect-recovery.mjs'));assert(effect.includes('--previous-manifest'));
 assert(step('Select exact private resources and accepted public hash baseline').includes("['stage','quarantine','pre-effect-retire','quarantine-uploads']"));
 assert(step('Validate explicit acceptance scope before credentials').includes("['promotion-reconcile','promotion-rollback','pre-effect-retire','continue-staged','retire-staged','quarantine-uploads']"));
 assert(!effect.includes('LTC_CLOUD_PUBLISH:'));assert(!effect.includes('conditionalWrite'));
});

test('existing-stage continuation remains a single manual protected job with separate review and no build/recollection',()=>{
 const effect=step('Explicitly approved stage-only effect or fresh-proof recovery');assert(stage.includes("inputs.acceptance_mode == 'continue-staged'"));assert(effect.includes('LTC_STAGED_CONTINUATION_REVIEW_JSON'));assert(effect.includes('LTC_STAGED_CONTINUATION_REVIEW_SHA256'));assert(effect.includes('cloud-ltc-continue-staged.mjs'));assert(!effect.includes('git push'));
 assert(step('Validate explicit acceptance scope before credentials').includes("['promotion-reconcile','promotion-rollback','pre-effect-retire','continue-staged','retire-staged','quarantine-uploads']"));
 assert(step('Build exact committed source without preparing new daily data').includes("if: inputs.acceptance_mode == 'stage'"));
});

test('finite receipt summary reports actual publication with scalar-fence fallback while routine remains disabled',()=>{const summary=step('Safe acceptance result; preserve held fences after any failure');assert(summary.includes('fence:r.lease?.fence??r.fence'));assert(summary.includes('publicationPerformed:r.publicationPerformed'));assert(summary.includes('publicationEnabled:false'));});

test('archive-only mode uses separate protected review, no source preparation, one existing scheduler and preserved ten inputs',()=>{const effect=step('Explicitly approved stage-only effect or fresh-proof recovery');assert(stage.includes("inputs.acceptance_mode == 'retire-staged'"));assert(effect.includes('LTC_STAGE_RETIREMENT_REVIEW_JSON'));assert(effect.includes('LTC_STAGE_RETIREMENT_REVIEW_SHA256'));assert(effect.includes('cloud-ltc-retire-staged.mjs'));assert(!effect.includes('vercel delete'));assert(step('Build exact committed source without preparing new daily data').includes("if: inputs.acceptance_mode == 'stage'"));});


test('already-promoted checkpoint recovery is separately reviewed, exact-fenced and cannot enter the deploy/build branch',()=>{
 const scope=step('Validate explicit acceptance scope before credentials');
 assert(scope.includes("e.LTC_ACCEPTANCE_MODE==='recover-promotion-checkpoint'"));
 assert(scope.includes("e.LTC_ACCEPTANCE_FENCE!=='10'"));
 assert(scope.includes("e.LTC_ACCEPTANCE_PLAN_SHA256||e.LTC_ACCEPTANCE_PREVIOUS_DEPLOYMENT"));
 assert(scope.includes("Exact checkpoint recovery scope required"));
 const effect=step('Explicitly approved stage-only effect or fresh-proof recovery');
 assert(effect.includes("inputs.acceptance_mode == 'recover-promotion-checkpoint' && secrets.LTC_PROMOTION_CHECKPOINT_REVIEW_JSON"));
 assert(effect.includes('LTC_PROMOTION_CHECKPOINT_REVIEW_SHA256'));
 assert(effect.includes('cloud-ltc-recover-checkpoint.mjs --review-file'));
 assert(!effect.includes('recover-checkpoint.mjs --publish'));
 assert.equal((workflow.match(/cron:/g)||[]).length,1);
 assert(!step('Build exact committed source without preparing new daily data').includes('recover-promotion-checkpoint'));
 assert(!stage.replace(effect,'').includes('secrets.LTC_PROMOTION_CHECKPOINT_REVIEW_JSON'));
});


test('checkpoint precredential guard executes against exact local HEAD and rejects fence, source and unexpected input changes',()=>{
 const scope=step('Validate explicit acceptance scope before credentials');
 const script=scope.split("node --input-type=module <<'NODE'\n")[1].split('\n          NODE')[0].split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n');
 const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const base={PATH:process.env.PATH,LTC_CLOUD_PUBLISH:'false',LTC_ACCEPTANCE_MODE:'recover-promotion-checkpoint',LTC_ACCEPTANCE_SOURCE_COMMIT:source,LTC_VERCEL_CLI_VERSION:'65.9.0',LTC_ACCEPTANCE_FENCE:'10',LTC_ACCEPTANCE_ID:'',LTC_ACCEPTANCE_PLAN_SHA256:'',LTC_ACCEPTANCE_PREVIOUS_DEPLOYMENT:'',LTC_ACCEPTANCE_CRASH_AFTER:'none'};
 const run=extra=>spawnSync(process.execPath,['--input-type=module','-e',script],{env:{...base,...extra},encoding:'utf8'});
 assert.equal(run({}).status,0);
 for(const changed of [{LTC_CLOUD_PUBLISH:'true'},{LTC_ACCEPTANCE_FENCE:'11'},{LTC_ACCEPTANCE_SOURCE_COMMIT:'a'.repeat(40)},{LTC_ACCEPTANCE_ID:'unexpected'},{LTC_ACCEPTANCE_PLAN_SHA256:'b'.repeat(64)},{LTC_ACCEPTANCE_PREVIOUS_DEPLOYMENT:'dpl_unexpected'},{LTC_ACCEPTANCE_CRASH_AFTER:'stage-effect'}])assert.notEqual(run(changed).status,0);
});
