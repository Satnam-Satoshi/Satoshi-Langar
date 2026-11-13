import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';

const release = await readFile(new URL('./cloud-ltc-release.mjs',import.meta.url),'utf8');
const entry = release.slice(release.lastIndexOf("if (process.argv[1] && import.meta.url"));
async function run(entrySource,fail=false){
 const root=await realpath(await mkdtemp(path.join(tmpdir(),'ltc-cli-cycle-')));
 try{
  await writeFile(path.join(root,'client.mjs'),"import {marker} from './entry.mjs'; export const loaded=marker;\n");
  await writeFile(path.join(root,'entry.mjs'),`import path from 'node:path';import{pathToFileURL}from'node:url';export const marker='complete';const parseArgs=x=>x;const safeFailure=e=>e.message;async function runRelease(){try{const client=await import('./client.mjs');if(${fail})throw Error('preparation_failed');return{status:client.loaded};}catch(e){console.log('unused_pre_effect_lease_released');throw e;}}\n${entrySource}`);
  return spawnSync(process.execPath,[path.join(root,'entry.mjs')],{encoding:'utf8',timeout:5000,env:{PATH:process.env.PATH}});
 }finally{await rm(root,{recursive:true,force:true});}
}
test('old CLI top-level-await topology reproduces Node exit13 at the real dynamic-import cycle',async()=>{
 const old="if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {try { console.log(JSON.stringify(await runRelease(parseArgs(process.argv.slice(2))))); } catch(error) {console.error(safeFailure(error));process.exitCode=1;}}";
 const result=await run(old);assert.equal(result.status,13);assert.match(result.stderr,/unsettled top-level await/);
});
test('actual release CLI entry completes its module before circular client import',async()=>{
 const result=await run(entry);assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{status:'complete'});assert(!result.stderr.includes('unsettled'));
});
test('pre-effect preparation failure reaches cleanup and safe CLI error instead of exit13',async()=>{
 const result=await run(entry,true);assert.equal(result.status,1);assert.match(result.stdout,/unused_pre_effect_lease_released/);assert.match(result.stderr,/LTC cloud release withheld: preparation_failed/);assert(!result.stderr.includes('unsettled'));
});
