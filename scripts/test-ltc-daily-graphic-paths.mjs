import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import vm from'node:vm';
import{routineDataRecord,assertRoutineChanges}from'./lib/ltc-routine-data.mjs';
const edition='2026-10-30-r1',base=`public/magazine/daily/${edition}/`;
const permitted=['social.png','social.svg','graphic.json'].map(name=>base+name);
const rejected=[base+'other.json',base+'cover.png',base+'nested/social.png',base+'../social.png',base+'graphic.JSON','public/magazine/daily/2026-02-30-r1/graphic.json','public/magazine/daily/2026-10-30-r0/social.png','public/magazine/daily/2026-10-30-r100/social.png'];
test('routine graphics permit only new exact edition assets and preserve historical bytes',()=>{
 for(const file of permitted){assert.equal(routineDataRecord(file).kind,'graphic');assertRoutineChanges([{file,status:'??'}],edition);assertRoutineChanges([{file,status:'A'}],edition);assert.throws(()=>assertRoutineChanges([{file,status:'M'}],edition),/immutable/);assert.throws(()=>assertRoutineChanges([{file,status:'D'}],edition));}
 for(const file of rejected){assert.equal(routineDataRecord(file),null);assert.throws(()=>assertRoutineChanges([{file,status:'A'}],edition));}
 for(const file of ['public/magazine/daily/2026-10-29-r1/social.png','public/magazine/daily/2026-10-30-r2/social.png']){assert.ok(routineDataRecord(file));assert.throws(()=>assertRoutineChanges([{file,status:'A'}],edition),/outside_allowlist/);}
});
test('trusted workflow inline classifier agrees with implementation including graphic edge cases',async()=>{
 const workflow=await readFile(new URL('../ops/ltc-daily-workflow.yml',import.meta.url),'utf8');const start=workflow.indexOf('          const pointers = new Set('),end=workflow.indexOf('          const files=',start);assert.ok(start>0&&end>start);const classifier=workflow.slice(start,end).replace(/^          /gm,'');const context=vm.createContext({});vm.runInContext(classifier+'\nglobalThis.classify=routineDataRecord;',context);
 for(const file of [...permitted,...rejected,'public/magazine/daily/2026-10-30-r2/social.svg','content/ltc/index.json','scripts/unreviewed.mjs'])assert.equal(JSON.stringify(context.classify(file)),JSON.stringify(routineDataRecord(file)));
});
