import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateNewsroom,prepareNewsroom} from './prepare-ltc-newsroom.mjs';
import {digest} from './prepare-ltc-edition.mjs';
const record=JSON.parse(await readFile(new URL('../content/ltc-newsroom/latest.json',import.meta.url),'utf8'));
const fixture=JSON.parse(await readFile(new URL('../content/ltc-newsroom/newsroom-20261031T055112Z.json',import.meta.url),'utf8'));
test('newsroom snapshot validates against its saved preparation clock',()=>{const before=JSON.stringify(record);validateNewsroom(record);assert.equal(JSON.stringify(record),before)});
test('modified newsroom rate and digest mismatch are rejected',()=>{const m=structuredClone(fixture);m.intelligence.markets[0].state.borrowApy='999';assert.throws(()=>validateNewsroom(m),/digest/)});
test('rehashing cannot make a mismatched market or future policy timestamp valid',()=>{
 for(const mutate of [r=>r.sources.find(x=>x.id==='coinbase-btc-usd').observations[0].value='123456789',r=>r.briefs[0].headline='Altered headline',r=>r.sources.find(x=>x.id==='coinbase-btc-usd').sourceAsOf='2099-01-01T00:00:00.000Z',r=>r.intelligence.markets[0].marketId='0x'+ '0'.repeat(64),r=>r.policyRecords.collectedAt='2030-01-01T00:00:00.000Z',r=>r.intelligence.evaluatedAt='2026-10-05T01:00:00.000Z']){const m=structuredClone(fixture);mutate(m);const {sha256,...body}=m;m.sha256=digest(body);assert.throws(()=>validateNewsroom(m))}
});
test('two specials have unique navigable chapters and complete source references',async()=>{
 for(const name of ['charlie-lee-r1','iykyk-r1']){const s=JSON.parse(await readFile(new URL(`../content/specials/${name}.json`,import.meta.url),'utf8'));assert.equal(s.sections.length,8);assert.equal(new Set(s.sections.map(c=>c.id)).size,8);const ids=new Set(s.sources.map(x=>x.id));for(const c of s.sections){assert.match(c.id,/^[a-z0-9-]+$/);assert.ok(c.paragraphs.length>0);assert.ok(c.sourceIds.length);c.sourceIds.forEach(id=>assert.ok(ids.has(id)))}for(const t of s.timeline)t.sourceIds.forEach(id=>assert.ok(ids.has(id)));for(const q of s.quotes){assert.ok(ids.has(q.sourceId));assert.ok(q.text.split(/\s+/).length<=25)}for(const source of s.sources){const url=new URL(source.url);assert.equal(url.protocol,'https:');assert.ok(!url.username&&!url.password);assert.ok(source.checkedAt<=s.researchThrough)}}
});

test('a valid unavailable ticker has null observations and still validates without dereferencing them',async()=>{
 const snapshot=structuredClone(fixture.baseSnapshot),source=snapshot.sources.find(value=>value.id==='coinbase-btc-usd');Object.assign(source,{status:'unavailable',httpStatus:503,sourceAsOf:null,sourceSha256:null,freshness:'unknown',observations:null,errorCode:'http_failure'});snapshot.failureCount=snapshot.sources.filter(value=>value.status==='unavailable').length;
 const registry=JSON.parse(await readFile(new URL('../config/ltc-sources.json',import.meta.url))),policy=JSON.parse(await readFile(new URL('../config/ltc-publication.json',import.meta.url)));
 const unavailable=prepareNewsroom({snapshot,registry,policy,intelligence:fixture.intelligence,policyRecords:fixture.policyRecords,now:fixture.preparedAt});
 assert.equal(unavailable.sources.find(value=>value.id==='coinbase-btc-usd').observations,null);assert(!unavailable.briefs.some(brief=>brief.sourceIds.includes('coinbase-btc-usd')));assert.doesNotThrow(()=>validateNewsroom(unavailable));
});
