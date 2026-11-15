import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {communityRecordId,readCommunityArchive} from './lib/community-archive.mjs';
import {validateCommunitySnapshot} from './lib/ltc-community.mjs';
const current=JSON.parse(readFileSync('content/ltc-community/latest.json'));
const fixture=JSON.parse(readFileSync('content/ltc-community/archive/20261023T014725Z.json'));
const cli=path.resolve('scripts/archive-ltc-community.mjs');
const canonical=value=>JSON.stringify(value,null,2)+'\n';
// Move synthetic check/publication clocks together; raw archived evidence stays unchanged.
function fresh(ago=0){const value=structuredClone(fixture),time=Date.now()-ago,shift=time-Date.parse(fixture.collectedAt);value.collectedAt=new Date(time).toISOString();for(const source of value.sourceStatus)if(source.checkedAt)source.checkedAt=value.collectedAt;for(const item of value.items)item.publishedAt=new Date(Date.parse(item.publishedAt)+shift).toISOString();return value;}
function sandbox(fn){const root=mkdtempSync(path.join(tmpdir(),'ltc-archive-'));try{const dir=path.join(root,'content/ltc-community/archive');mkdirSync(dir,{recursive:true});return fn(root,dir);}finally{rmSync(root,{recursive:true,force:true});}}
function run(root,value){writeFileSync(path.join(root,'candidate.json'),canonical(value));return spawnSync(process.execPath,[cli,'--snapshot',path.join(root,'candidate.json')],{cwd:root,encoding:'utf8'});}
test('new checks archive exact bytes, retain source dates, and identical retries are idempotent',()=>sandbox((root,dir)=>{const prior=fresh(60000),next=fresh();writeFileSync(path.join(root,'content/ltc-community/latest.json'),canonical(prior));writeFileSync(path.join(dir,communityRecordId(prior)+'.json'),canonical(prior));assert.equal(run(root,next).status,0);assert.equal(run(root,next).status,0);const archive=readCommunityArchive(dir);assert.equal(archive.length,2);assert.deepEqual(archive[0].snapshot.items.map(item=>item.publishedAt),next.items.map(item=>item.publishedAt));assert.equal(archive[1].sha256,createHash('sha256').update(canonical(prior)).digest('hex'));assert.equal(readFileSync(path.join(root,'content/ltc-community/latest.json'),'utf8'),canonical(next));}));
test('older check rejects before mutating archive or latest pointer',()=>sandbox((root,dir)=>{const latest=fresh();writeFileSync(path.join(root,'content/ltc-community/latest.json'),canonical(latest));assert.notEqual(run(root,fresh(60000)).status,0);assert.equal(readdirSync(dir).length,0);assert.equal(readFileSync(path.join(root,'content/ltc-community/latest.json'),'utf8'),canonical(latest));}));
test('same record identity cannot overwrite existing different bytes',()=>sandbox((root,dir)=>{const next=fresh();writeFileSync(path.join(root,'content/ltc-community/latest.json'),canonical(fresh(60000)));writeFileSync(path.join(dir,communityRecordId(next)+'.json'),'existing protected bytes');assert.notEqual(run(root,next).status,0);assert.equal(readFileSync(path.join(dir,communityRecordId(next)+'.json'),'utf8'),'existing protected bytes');}));
test('stale or future collection is not archived as a fresh check',()=>sandbox((root,dir)=>{writeFileSync(path.join(root,'content/ltc-community/latest.json'),canonical(fresh(3*86400000)));for(const ago of [2*86400000,-86400000])assert.notEqual(run(root,fresh(ago)).status,0);assert.equal(readdirSync(dir).length,0);}));
test('historical records validate at saved time but a mismatched file identity fails',()=>sandbox((root,dir)=>{const file=path.join(dir,communityRecordId(fixture)+'.json');writeFileSync(file,canonical(fixture));assert.equal(readCommunityArchive(dir)[0].snapshot.collectedAt,fixture.collectedAt);renameSync(file,path.join(dir,'20000101T000000Z.json'));assert.throws(()=>readCommunityArchive(dir),/identity mismatch/);}));

test('current community snapshot validates at its own saved clock, including legitimate empty items',()=>{const before=canonical(current);assert.doesNotThrow(()=>validateCommunitySnapshot(current,{now:current.collectedAt}));assert.equal(canonical(current),before);});
test('valid empty community observations archive and retry without inventing an item',()=>sandbox((root,dir)=>{
 const value=fresh();value.items=[];for(const source of value.sourceStatus)Object.assign(source,{status:'unavailable',checkedAt:value.collectedAt,sha256:null,errorCode:'transport_failure'});
 assert.doesNotThrow(()=>validateCommunitySnapshot(value,{now:value.collectedAt}));const prior=structuredClone(value);prior.collectedAt=new Date(Date.parse(value.collectedAt)-60000).toISOString();for(const source of prior.sourceStatus)source.checkedAt=prior.collectedAt;writeFileSync(path.join(root,'content/ltc-community/latest.json'),canonical(prior));assert.equal(run(root,value).status,0);assert.equal(run(root,value).status,0);const archive=readCommunityArchive(dir);assert.equal(archive.length,1);assert.deepEqual(archive[0].snapshot.items,[]);assert.equal(readFileSync(path.join(root,'content/ltc-community/latest.json'),'utf8'),canonical(value));
}));
