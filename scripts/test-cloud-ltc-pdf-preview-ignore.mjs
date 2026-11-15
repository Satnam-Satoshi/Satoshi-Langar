import { execFileSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { previewExitCode } from './pdf-preview-ignore.mjs';
const sha='a'.repeat(40), now=Date.parse('2026-11-15T18:00:00Z');
const env={VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_GIT_REPO_OWNER:'Satnam-Satoshi',VERCEL_GIT_REPO_SLUG:'Satoshi-Langar',VERCEL_GIT_COMMIT_SHA:sha};
const tree=execFileSync('git',['ls-tree','-r','HEAD'],{encoding:'utf8'});
const git=ref=>ref==='HEAD'?sha:ref==='tree'?tree:'parent 247df76011141fae768af3be3ee6a0aa141064a3\n\nmessage';
test('permits only pinned-parent repository preview',()=>assert.equal(previewExitCode(env,git,now),1));
test('production, missing context, other repo, old source and expired requests skip',()=>{
 for(const key of Object.keys(env)){assert.equal(previewExitCode({...env,[key]:undefined},git,now),0);assert.equal(previewExitCode({...env,[key]:'different'},git,now),0);}
 for(const key of ['VERCEL_ENV','VERCEL_TARGET_ENV'])assert.equal(previewExitCode({...env,[key]:'production'},git,now),0);
 assert.equal(previewExitCode(env,()=>sha,now),0);
 assert.equal(previewExitCode(env,ref=>ref==='commit'?'tree '+sha+'\n\nno parent':git(ref),now),0);
 assert.equal(previewExitCode(env,ref=>ref==='tree'?tree.replace(/blob [a-f0-9]{40}/,'blob '+sha):git(ref),now),0);
 assert.equal(previewExitCode(env,ref=>ref==='tree'?tree.split('\n').slice(1).join('\n'):git(ref),now),0);
 assert.equal(previewExitCode(env,ref=>ref==='commit'?'parent 247df76011141fae768af3be3ee6a0aa141064a3\nparent '+sha+'\n\nmerge':git(ref),now),0);
 assert.equal(previewExitCode(env,ref=>ref==='tree'?tree+'100644 blob '+sha+'\tunexpected.txt\n':git(ref),now),0);
 assert.equal(previewExitCode(env,git,Date.parse('2026-11-16T00:00:00Z')),0);
 assert.equal(previewExitCode(env,()=>{throw Error('git absent');},now),0);
});
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const wrapper=JSON.parse(readFileSync('vercel.json','utf8')).ignoreCommand;
test('wrapper only permits successful exact allow marker, all errors skip',()=>{
 for(const [body,expected] of [["printf ALLOW_PDF_PREVIEW; return 0",1],["printf ALLOW_PDF_PREVIEW; return 1",0],["return 127",0],["return 1",0],["printf SKIP_PDF_PREVIEW; return 0",0],["printf 'ALLOW_PDF_PREVIEW extra'; return 0",0]]){
  assert.equal(spawnSync('sh',['-c',`node() { ${body}; }; ${wrapper}`]).status,expected,body);
 }
});
