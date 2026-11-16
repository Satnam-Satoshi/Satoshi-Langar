import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {admitV2Preview} from './cloud-newsroom-v2-preview-admission.mjs';
const sha='a'.repeat(40),now=Date.parse('2026-11-16T19:00:00Z');
const env={VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_GIT_REPO_OWNER:'Satnam-Satoshi',VERCEL_GIT_REPO_SLUG:'Satoshi-Langar',VERCEL_GIT_COMMIT_REF:'agent/cloud-newsroom-v2-20261116',VERCEL_GIT_COMMIT_SHA:sha};
const tree=execFileSync('git',['ls-tree','-r','d9e65796cd23996b274622ee47e265a066d01e76'],{encoding:'utf8'});
const git=ref=>ref==='HEAD'?sha:ref==='tree'?tree:'parent d9e65796cd23996b274622ee47e265a066d01e76\n\npreview';
test('exact approved preview source admitted',()=>assert.equal(admitV2Preview(env,git,now),true));
test('missing or wrong context and production denied',()=>{for(const key of Object.keys(env))for(const value of [undefined,'production','other'])assert.equal(admitV2Preview({...env,[key]:value},git,now),false);});
test('time boundaries, wrong parent, modified tree and git failures denied',()=>{
 for(const n of [NaN,Date.parse('2026-11-15'),Date.parse('2026-11-17')])assert.equal(admitV2Preview(env,git,n),false);
 for(const ref of ['HEAD','commit','tree'])assert.equal(admitV2Preview(env,r=>r===ref?'invalid':git(r),now),false);
 assert.equal(admitV2Preview(env,()=>{throw Error();},now),false);
 assert.equal(admitV2Preview(env,r=>r==='tree'?tree+'100644 blob '+sha+'\tunexpected.txt\n':git(r),now),false);
});
test('wrapper needs exact allow marker and successful command',()=>{
 const wrapper=JSON.parse(readFileSync('vercel.json')).ignoreCommand;
 for(const [body,status] of [['printf ALLOW_V2_PINNED_PREVIEW; return 0',1],['printf ALLOW_V2_PINNED_PREVIEW; return 1',0],['printf "ALLOW_V2_PINNED_PREVIEW extra"; return 0',0],['return 127',0]])assert.equal(spawnSync('sh',['-c',`node() { ${body}; }; ${wrapper}`]).status,status);
});
