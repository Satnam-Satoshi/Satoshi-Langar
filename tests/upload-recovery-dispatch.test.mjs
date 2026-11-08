import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
const source=await readFile(new URL('../.github/workflows/ltc-daily-publication.yml',import.meta.url),'utf8');
const job=source.split('\n  stage-acceptance:\n')[1].split('\n  social-sent-reconciliation:\n')[0];
test('upload recovery shares existing founder-only main job and global concurrency',()=>{
 const condition=job.match(/^    if: (.*)$/m)[1];
 const good={github:{repository:'Satnam-Satoshi/Satoshi-Langar',ref:'refs/heads/main',event_name:'workflow_dispatch',event:{sender:{id:268053325}}},inputs:{acceptance_probe:false,acceptance_mode:'recover-upload-only'}};
 assert.equal(vm.runInNewContext(condition,good),true);
 for(const mutate of [c=>c.github.event_name='schedule',c=>c.github.event.sender.id=1,c=>c.github.ref='refs/heads/other',c=>c.inputs.acceptance_probe=true]){const c=structuredClone(good);mutate(c);assert.equal(vm.runInNewContext(condition,c),false);}
 assert.equal((source.match(/group: ltc-production-publication/g)||[]).length,1);
 assert.equal((source.match(/^  schedule:/gm)||[]).length,1);
 assert.match(job,/stateSha256:r.stateSha256/);
});
test('recovery has private review/writer evidence and exact runtime entry, no new credential',()=>{
 for(const key of ['LTC_UPLOAD_ONLY_RECOVERY_REVIEW_JSON','LTC_UPLOAD_ONLY_WRITER_EVIDENCE_JSON'])assert.match(job,new RegExp(key+": \\$\\{\\{ inputs.acceptance_mode == 'recover-upload-only' && secrets."+key));
 assert.match(job,/LTC_UPLOAD_ONLY_RECOVERY_REVIEW_SHA256: \$\{\{ vars\./);
 assert.match(job,/node scripts\/cloud-ltc-upload-recovery-runtime.mjs --review-file/);
 assert.match(job,/--writer-evidence/);
 assert.doesNotMatch(job,/permissions:\s*\n\s*variables:|upload-artifact/);
});
test('every recovery shell and embedded JavaScript block parses without execution',()=>{
 const scripts=[...job.matchAll(/        run: \|\n((?:          .*\n|\n)+)/g)].map(m=>m[1].split('\n').map(l=>l.slice(10)).join('\n'));
 assert.ok(scripts.length>3);
 for(const input of scripts){const r=spawnSync('bash',['-n'],{input,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  for(const m of input.matchAll(/node --input-type=module <<'NODE'\n([\s\S]*?)\nNODE/g)){const j=spawnSync(process.execPath,['--check','--input-type=module'],{input:m[1],encoding:'utf8'});assert.equal(j.status,0,j.stderr);}
 }
});
