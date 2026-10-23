import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDistribution} from './prepare-litecoin-distribution.mjs';
const record=events=>({name:'Fixture',sector:'exchange',subsector:'custody',region:'global',events});
const options={asOf:'2026-10-15',collectedAt:'2026-10-15T17:00:00.000Z',sourceSha256:'a'.repeat(64)};
test('carry-forward balance changes exclude unknown baselines, keep zeros and ignore future events',()=>{
 const result=buildDistribution({a:record([['2026-10-15',7],['2026-09-14',10],['2026-10-16',999]]),b:record([['2026-10-15',1]]),c:record([['2026-10-15',0],['2026-09-15',0]]),d:record([['2026-10-15','#N/A']])},options);
 assert.equal(result.baselineDate,'2026-09-15');assert.equal(result.total,8);assert.equal(result.rows.length,3);assert.equal(result.missingNumericalRecords,1);assert.equal(result.series.length,31);assert.equal(result.series[0].value,10);assert.equal(result.sectors[0].change,-3);
 assert.equal(result.rows.find(r=>r.id==='b').baseline,null);assert.equal(result.rows.find(r=>r.id==='b').change,null);assert.equal(result.rows.find(r=>r.id==='c').current,0);
});
test('source shape and date mismatch fail before publication',()=>{
 assert.throws(()=>buildDistribution({a:record([['invalid-date',7]])},options));
 assert.throws(()=>buildDistribution({a:record([['2026-10-15',7]])},{...options,asOf:'2026-10-14'}));
 assert.throws(()=>buildDistribution({'../bad':record([['2026-10-15',7]])},options));
});
