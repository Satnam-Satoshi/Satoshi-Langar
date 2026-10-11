import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('../content/research/litecoin-distribution-20261011.json',import.meta.url),'utf8'));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('dated distribution preserves coverage, comparability and sector reconciliation',()=>{
 assert.equal(data.baselineDate,'2026-09-11');assert.equal(data.asOf,'2026-10-11');
 assert.equal(data.series.length,31);assert.equal(data.rows.length,72);
 assert.equal(data.rows.filter(r=>r.baseline===null).length,1);
 assert.equal(new Set(data.rows.map(r=>r.id)).size,data.rows.length);
 for(const row of data.rows){assert.ok(row.observedAt<=data.asOf);assert.ok(Number.isFinite(row.current)&&row.current>=0);if(row.baseline===null){assert.equal(row.change,null);assert.equal(row.baselineObservedAt,null);}else{assert.ok(row.baselineObservedAt<=data.baselineDate);close(row.change,row.current-row.baseline);}}
 close(data.total,data.rows.reduce((s,r)=>s+r.current,0));
 for(const sector of data.sectors){const rows=data.rows.filter(r=>r.sector===sector.name);close(sector.current,rows.reduce((s,r)=>s+r.current,0));close(sector.change,rows.reduce((s,r)=>s+(r.change??0),0));assert.equal(sector.missingBaseline,rows.filter(r=>r.baseline===null).length);}
 const comparable=data.rows.reduce((s,r)=>s+(r.change??0),0);const newlyCovered=data.rows.filter(r=>r.baseline===null).reduce((s,r)=>s+r.current,0);
 close(data.total-data.series[0].value,comparable+newlyCovered);
 assert.ok(comparable<0);assert.ok(data.total-data.series[0].value>0);
 close(data.series.at(-1).value,data.total);
});
test('published downloadable derivative matches the editorial data',async()=>{
 const publicData=JSON.parse(await readFile(new URL('../public/data/litecoin-distribution-20261011.json',import.meta.url),'utf8'));
 assert.deepEqual(publicData,data);
});
