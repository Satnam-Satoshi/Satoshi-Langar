import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../ops/ltc-software-stage-recovery-workflow.yml',import.meta.url),'utf8');
test('recovery is manual owner-only main and first-attempt with existing lock',()=>{
  assert.match(workflow,/workflow_dispatch:/);
  assert.doesNotMatch(workflow,/\b(schedule|pull_request|push):/);
  assert.match(workflow,/github\.actor_id == '268053325' && github\.run_attempt == 1/);
  assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/group: ltc-production-publication\n  cancel-in-progress: false/);
  assert.match(workflow,/environment: ltc-production/);
  assert.doesNotMatch(workflow.split('runs-on:')[0],/vars\./);
  assert.match(workflow,/permissions:\n  contents: read\n  actions: read/);
});
test('credential boundary follows immutable controller and pinned implementation checks',()=>{
  const credential=workflow.indexOf('secrets.');
  for(const marker of ["^\x5ba-f0-9\x5d{40}$",'persist-credentials: false','rev-parse','Recovery controller source mismatch',"hash.digest('hex')!==expected"]){
    assert.ok(workflow.includes(marker),marker);assert.ok(workflow.indexOf(marker)<credential,marker);
  }
  assert.match(workflow,/node-version: 22\.23\.2/);
  assert.match(workflow,/npm install --global vercel@65\.9\.0/);
  assert.doesNotMatch(workflow,/pnpm|vercel (?:deploy|build)|--prebuilt|--force|git push/);
});
test('local deny flags and all retained historical pins are forwarded',()=>{
  assert.match(workflow,/LTC_CLOUD_PUBLISH: 'false'/);
  assert.match(workflow,/LTC_SOFTWARE_RELEASE_ENABLED: 'false'/);
  for(const pin of ['UPLOAD_QUARANTINE_COMPLETION','ROUTINE_RETIREMENT_COMPLETION','ROUTINE_RETIREMENT_FRESH_PROOF','ROUTINE_FOLLOWUP_COMPLETION','ROUTINE_FOLLOWUP_FRESH_PROOF'])assert.ok(workflow.includes(`LTC_${pin}_SHA256: \${{ vars.LTC_${pin}_SHA256 }}`));
  assert.match(workflow,/LTC_MIGRATION_ACCEPTANCE_JSON: \$\{\{ secrets\.LTC_MIGRATION_ACCEPTANCE_JSON \}\}/);
});
test('bounded review is hashed and saved privately; fixed runtime arguments and no raw summary',()=>{
  assert.match(workflow,/Buffer\.byteLength\(raw\)>65536/);
  assert.match(workflow,/digest\('hex'\)!==process\.env\.LTC_SOFTWARE_STAGE_RECOVERY_REVIEW_SHA256/);
  assert.match(workflow,/flag:'wx',mode:0o600/);
  assert.match(workflow,/node scripts\/cloud-ltc-resume-software\.mjs --review-file .* --state-config .* --evidence-config .* --receipt /);
  const summary=workflow.slice(workflow.indexOf('- name: Sanitized result'));
  assert.doesNotMatch(summary,/r\.(failure|error|message|stderr)|JSON\.stringify\(r[,)]/);
  assert.match(summary,/dailyPublished:false/);
});
test('summary executes with only fixed public diagnostic fields and rejects unsafe records',()=>{
  const source=workflow.slice(workflow.indexOf('- name: Sanitized result')).split("<<'NODE'\n")[1].split('\n          NODE')[0].replace(/^          /gm,'').replace(/^import .*;\n/m,'');
  const render=record=>{let output;new Function('existsSync','readFileSync','appendFileSync','process',source)(()=>true,()=>JSON.stringify(record),(_,value)=>output=value,{env:{RUNNER_TEMP:'/tmp',GITHUB_STEP_SUMMARY:'/summary'},exit(){throw Error('unexpected exit');}});return JSON.parse(output);};
  const good={phase:'protected-manifest',ordinal:2,total:673,file:'brand/ltc-avatar.png',expectedSha256:'a'.repeat(64),code:'deployed_artifact_mismatch',httpStatus:200,rawBody:'PRIVATE'};
  assert.deepEqual(render({protectedFailure:good,failure:'PRIVATE'}).protectedFailure,{phase:good.phase,ordinal:2,total:673,file:good.file,expectedSha256:good.expectedSha256,code:good.code,httpStatus:200});
  assert.ok(!JSON.stringify(render({protectedFailure:good,failure:'PRIVATE'})).includes('PRIVATE'));
  const uncertain=render({requiresJournalReconciliation:true,publicationOutcome:'unconfirmed'});
  assert.equal(uncertain.requiresJournalReconciliation,true);assert.equal(uncertain.publicationOutcome,'unconfirmed');assert.equal(uncertain.status,'software-recovery-not-confirmed');
  for(const bad of [{file:'../private'},{file:'line\nbreak'},{code:'PRIVATE'},{ordinal:0},{total:99999}])assert.equal(render({protectedFailure:{...good,...bad}}).protectedFailure,undefined);
  assert.equal(render({protectedFailure:{phase:'api-handler',route:'/api/private',code:'software_api_invalid'}}).protectedFailure,undefined);
  assert.deepEqual(render({protectedFailure:{phase:'api-handler',route:'/api/market-prices',code:'software_api_invalid',rawBody:'PRIVATE'}}).protectedFailure,{phase:'api-handler',route:'/api/market-prices',code:'software_api_invalid'});
});
