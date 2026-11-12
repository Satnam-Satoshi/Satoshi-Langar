import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { gzipSync, gunzipSync } from 'node:zlib';
const source = await readFile(new URL('../.github/workflows/ltc-daily-publication.yml', import.meta.url), 'utf8');
const job = source.split('\n  social-sent-reconciliation:\n')[1];
const scripts = [...job.matchAll(/        run: \|\n((?:          .*\n|\n)+)/g)].map(m => m[1].split('\n').map(line => line.slice(10)).join('\n'));
const jsBlocks = scripts.flatMap(s => [...s.matchAll(/node --input-type=module <<'NODE'\n([\s\S]*?)\nNODE/g)].map(m => m[1]));
const oldJobs = source.split('\n  social-sent-reconciliation:\n')[0];
const ecosystemClassifier = String.raw`content\/(?:daily-features|ltc-ecosystem)\/`;
const previousClassifier = String.raw`content\/daily-features\/`;
function assertPreservedDailyJobs(text) {
  // The only new exception is the same dated ecosystem shape in all three
  // existing implementation guards. Reverse exactly that reviewed delta and
  // retain the established pre-handoff byte hash, rather than repinning it.
  assert.equal(text.split(ecosystemClassifier).length - 1, 3);
  const normalized = text.replaceAll(ecosystemClassifier, previousClassifier)
    .replace(', social-reconcile-sent', '')
    .replace("cron: '17 5,6,7,9,12,16,20 * * *'", "cron: '17 5,6,7 * * *'").trimEnd();
  assert.equal(createHash('sha256').update(normalized).digest('hex'), '8e03a2496c395e64a79fe02ab36814c86a35797c3628571cd8c27972178b9079');
}

test('manual mode cannot run for cron, another owner/repo/ref, dry runs, probes or bootstrap', () => {
  const condition = job.match(/^    if: (.*)$/m)[1];
  const base = { github: { repository: 'Satnam-Satoshi/Satoshi-Langar', ref: 'refs/heads/main', event_name: 'workflow_dispatch', event: {sender:{id:268053325}} }, inputs: {acceptance_probe:false,dry_run:false,bootstrap_previous_manifest:false,acceptance_mode:'social-reconcile-sent'} };
  assert.equal(vm.runInNewContext(condition, base), true);
  for(const mutate of [c=>c.github.event_name='schedule',c=>c.github.repository='other/repo',c=>c.github.ref='refs/heads/other',c=>c.github.event.sender.id=1,c=>c.inputs.dry_run=true,c=>c.inputs.acceptance_probe=true,c=>c.inputs.bootstrap_previous_manifest=true,c=>c.inputs.acceptance_mode='none']) { const c=structuredClone(base);mutate(c);assert.equal(vm.runInNewContext(condition,c),false); }
});
test('existing writer lock, schedule and social job remain; only three dated classifiers change', () => {
  assert.match(source,/group: ltc-production-publication\n  cancel-in-progress: false/);
  assert.match(source,/cron: '17 5,6,7,9,12,16,20 \* \* \*'\n      timezone: America\/New_York/);
  assert.doesNotMatch(job,/concurrency:|schedule:|contents: write|actions: write|VERCEL|LTC_STATE_DOCUMENT_ID|ltc-cloud-release\.mjs --/);
  assert.equal((source.match(/social-sent-reconciliation:/g)??[]).length,1);
  // The social reconciliation job remains byte-identical to its accepted form.
  assert.equal(createHash('sha256').update(job).digest('hex'),'a1c2643ab8de4e09ffa6a03cdbbeaf5446eefd4937bc17a49f554212627b54c8');
  assert.equal((oldJobs.match(/social-reconcile-sent/g)??[]).length,1); // Dispatch choice only; existing jobs do not take this mode.
  assertPreservedDailyJobs(oldJobs);
});
test('reviewed delta cannot hide schedule, writer-lock, mode or broader classifier changes', () => {
  for (const changed of [
    oldJobs.replace('timezone: America/New_York', 'timezone: Etc/UTC'),
    oldJobs.replace('cancel-in-progress: false', 'cancel-in-progress: true'),
    oldJobs.replace('recover-upload-only', 'unreviewed-mode'),
    oldJobs.replace(ecosystemClassifier, previousClassifier),
    oldJobs.replace('daily-features|ltc-ecosystem', 'daily-features|ltc-ecosystem|unknown'),
    oldJobs + ecosystemClassifier,
  ]) assert.throws(() => assertPreservedDailyJobs(changed));
});
test('all three actual classifiers accept only calendar-dated ecosystem records', () => {
  const classifiers = [...oldJobs.matchAll(/          const pointers = new Set\(\[[\s\S]*?          const isRoutineData = file => routineDataRecord\(file\) !== null;/g)];
  assert.equal(classifiers.length, 3);
  for (const [code] of classifiers) {
    const classify = file => vm.runInNewContext(code+'\nroutineDataRecord(file)', {file});
    for (const directory of ['daily-features', 'ltc-ecosystem']) {
      for (const date of ['2026-11-12', '2028-02-29']) {
        assert.equal(JSON.stringify(classify(`content/${directory}/${date}.json`)), JSON.stringify({kind:'dated',date}));
      }
      for (const name of ['latest', '2026-02-29', '2026-11-31', '2026-1-01', '2026-11-12-r1', '../2026-11-12', '2026-11-12.json/extra']) {
        assert.equal(classify(`content/${directory}/${name}.json`), null);
      }
    }
    for (const file of ['content/unknown/2026-11-12.json','content/ltc-ecosystem/2026-11-12.js','content/ltc-ecosystem/nested/2026-11-12.json',null]) assert.equal(classify(file), null);
  }
});
test('dedicated source and policy pins never replace website configuration; all publication gates are false', () => {
  assert.match(job,/LTC_ACCEPTED_IMPLEMENTATION_SHA256: \$\{\{ vars\.LTC_SOCIAL_RECONCILIATION_IMPLEMENTATION_SHA256 \}\}/);
  assert.match(job,/ref: \$\{\{ vars\.LTC_SOCIAL_RECONCILIATION_SOURCE_SHA \}\}/);
  assert.match(job,/persist-credentials: false/);
  for(const key of ['LTC_CLOUD_PUBLISH','LTC_CLOUD_SOCIAL_PUBLISH','LTC_SOCIAL_CLOUD_PUBLISH','LTC_SOCIAL_PUBLISH']) assert.match(job,new RegExp(key+": 'false'"));
  assert.doesNotMatch(job,/vars\.LTC_ACCEPTED_IMPLEMENTATION_SHA256|LTC_MIGRATION_ACCEPTANCE/);
});
test('no service credentials appear before source, implementation, tests and private-policy validation', () => {
  const effect=job.indexOf('- name: Reconcile sent receipts only');
  for(const key of ['LTC_GOOGLE_CLIENT_ID','LTC_GOOGLE_CLIENT_SECRET','LTC_GOOGLE_REFRESH_TOKEN','LTC_BUFFER_API_KEY']) assert.ok(job.indexOf('secrets.'+key)>effect);
  for(const stage of ['Verify exact protected maintenance commit','Verify implementation and test','Validate protected private review bundle']) assert.ok(job.indexOf(stage)<effect);
  assert.equal((job.match(/--mode apply/g)??[]).length,1);
  assert.doesNotMatch(job,/upload-artifact|create_post|edit_post|setPaused|activate-cloud|deploy|promote/);
});
test('every embedded shell and module block parses without executing providers', () => {
  assert.equal(scripts.length,5);assert.equal(jsBlocks.length,4);
  for(const input of scripts){const r=spawnSync('bash',['-n'],{input,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
  for(const input of jsBlocks){const r=spawnSync(process.execPath,['--check','--input-type=module'],{input,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
});
test('actual pre-source guard rejects wrong commits, changed working trees and other actors', async () => {
  const root=await mkdtemp(path.join(tmpdir(),'social-dispatch-test-'));const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  try {
    git(['init']);await writeFile(path.join(root,'fixture'),'reviewed');git(['add','fixture']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','fixture']);
    const sha=git(['rev-parse','HEAD']),env={PATH:process.env.PATH,GITHUB_REPOSITORY:'Satnam-Satoshi/Satoshi-Langar',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_ACTOR_ID:'268053325',LTC_SOCIAL_RECONCILIATION_SOURCE_SHA:sha,LTC_ACCEPTANCE_SOURCE_COMMIT:sha,LTC_ACCEPTED_IMPLEMENTATION_SHA256:'a'.repeat(64),LTC_SOCIAL_RECONCILIATION_POLICY_SHA256:'b'.repeat(64)};
    const run=e=>spawnSync(process.execPath,['--input-type=module','-'],{cwd:root,env:e,input:jsBlocks[0],encoding:'utf8'});
    assert.equal(run(env).status,0);
    for(const changed of [{...env,GITHUB_ACTOR_ID:'other'},{...env,LTC_ACCEPTANCE_SOURCE_COMMIT:'c'.repeat(40)},{...env,LTC_SOCIAL_RECONCILIATION_SOURCE_SHA:'c'.repeat(40)},{...env,LTC_ACCEPTED_IMPLEMENTATION_SHA256:''}]) assert.notEqual(run(changed).status,0);
    await writeFile(path.join(root,'fixture'),'changed');assert.notEqual(run(env).status,0);
  } finally {await rm(root,{recursive:true,force:true});}
});
test('summary exposes only validated counts, plan hash and control outcomes', () => {
  const code=jsBlocks.at(-1);assert.match(code,/r\.paused!==true/);assert.match(code,/r\.bufferWrites!==false/);assert.match(code,/r\.activationAllowed!==false/);
  assert.doesNotMatch(code,/r\.text|r\.postId|r\.channelId|r\.records|r\.error|JSON\.stringify\(r\)/);
  assert.match(code,/Read the paused ledger before retrying/);
});
test('actual bundle decoder accepts ordered bounded parts and refuses gaps, extras and oversized decompression', () => {
  const code=jsBlocks[2].slice(jsBlocks[2].indexOf('const e=process.env,count='),jsBlocks[2].indexOf('const folderId='));
  const bundle={inputJson:'fixture input',planJson:'fixture plan',policyJson:'fixture policy'};
  const encoded=gzipSync(JSON.stringify(bundle)).toString('base64'),chunk=Math.ceil(encoded.length/4);
  const env={LTC_SOCIAL_RECONCILIATION_BUNDLE_PARTS:'4',...Object.fromEntries(Array.from({length:4},(_,i)=>['LTC_SOCIAL_RECONCILIATION_BUNDLE_PART_'+(i+1),encoded.slice(i*chunk,(i+1)*chunk)]))};
  const run=e=>vm.runInNewContext(code+'JSON.stringify(bundle)',{process:{env:e},Buffer,gunzipSync});
  assert.equal(run(env),JSON.stringify(bundle));
  for(const mutate of [e=>e.LTC_SOCIAL_RECONCILIATION_BUNDLE_PARTS='0',e=>e.LTC_SOCIAL_RECONCILIATION_BUNDLE_PARTS='5',e=>e.LTC_SOCIAL_RECONCILIATION_BUNDLE_PARTS='1',e=>e.LTC_SOCIAL_RECONCILIATION_BUNDLE_PART_2='',e=>e.LTC_SOCIAL_RECONCILIATION_BUNDLE_PART_2='x'.repeat(40001),e=>e.LTC_SOCIAL_RECONCILIATION_BUNDLE_PART_1='invalid!']){const e={...env};mutate(e);assert.throws(()=>run(e));}
  assert.throws(()=>run({LTC_SOCIAL_RECONCILIATION_BUNDLE_PARTS:'1',LTC_SOCIAL_RECONCILIATION_BUNDLE_PART_1:gzipSync('x'.repeat(2000001)).toString('base64')}));
});
