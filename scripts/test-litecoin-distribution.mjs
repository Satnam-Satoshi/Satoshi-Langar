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
test('October13 refresh reconciles its own 30-day window without changing the historical record',async()=>{
 const latest=JSON.parse(await readFile(new URL('../content/research/litecoin-distribution-20261013.json',import.meta.url),'utf8'));
 assert.equal(latest.asOf,'2026-10-13');assert.equal(latest.baselineDate,'2026-09-13');
 assert.equal((Date.parse(latest.asOf)-Date.parse(latest.baselineDate))/86400000,30);
 assert.equal(latest.series.length,31);assert.equal(latest.series[0].date,latest.baselineDate);assert.equal(latest.series.at(-1).date,latest.asOf);
 for(const row of latest.rows){assert.ok(row.observedAt<=latest.asOf);if(row.baseline===null){assert.equal(row.change,null);}else{assert.ok(row.baselineObservedAt<=latest.baselineDate);close(row.change,row.current-row.baseline);}}
 close(latest.total,latest.rows.reduce((sum,row)=>sum+row.current,0));close(latest.total,latest.sectors.reduce((sum,sector)=>sum+sector.current,0));
 const comparable=latest.rows.reduce((sum,row)=>sum+(row.change??0),0),newlyCovered=latest.rows.filter(row=>row.baseline===null).reduce((sum,row)=>sum+row.current,0);
 close(latest.total-latest.series[0].value,comparable+newlyCovered);close(latest.series.at(-1).value,latest.total);
 const published=JSON.parse(await readFile(new URL('../public/data/litecoin-distribution-20261013.json',import.meta.url),'utf8'));assert.deepEqual(published,latest);
 assert.equal(data.asOf,'2026-10-11');assert.equal(data.baselineDate,'2026-09-11');
});
