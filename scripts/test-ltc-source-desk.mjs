import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';
import{sourceDeskFromNewsroom,publishSourceDesk}from'./prepare-ltc-source-desk.mjs';
const notebook=JSON.parse(await readFile(new URL('../content/ltc-newsroom/latest.json',import.meta.url),'utf8'));
test('validated notebook selection copies evidence and dates without new reporting claims',()=>{
 const result=sourceDeskFromNewsroom(notebook);assert.equal(result.checkedAt,notebook.preparedAt);assert.equal(result.generatedFrom.sha256,notebook.sha256);
 for(const story of result.stories){const brief=notebook.briefs.find(item=>item.id===story.id),source=notebook.sources.find(s=>s.id===brief.sourceIds[0]);assert.equal(story.title,brief.headline);assert.equal(story.summary,brief.paragraphs[0]);assert.equal(story.checkedAt,source.checkedAt);assert.equal(story.observedAt,brief.effectiveAt);assert.equal(story.dateKind,source.freshness==='dated-event'?'published':'observed');}
 assert.ok(result.gaps.includes(notebook.coverageGaps[0]));const bad=structuredClone(notebook);bad.briefs[0].headline='unsupported';assert.throws(()=>sourceDeskFromNewsroom(bad));
});
test('curated same-day scan and existing archive bytes remain untouched; new day advances once',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ltc-source-desk-'));
 try{const pointer=path.join(directory,'latest.json');const curated={id:'curated',checkedAt:notebook.preparedAt};const text=JSON.stringify(curated);await writeFile(pointer,text);assert.equal((await publishSourceDesk(notebook,{directory})).status,'unchanged');assert.equal(await readFile(pointer,'utf8'),text);
 await writeFile(pointer,JSON.stringify({id:'older',checkedAt:'2026-10-01T12:00:00.000Z'}));const first=await publishSourceDesk(notebook,{directory});assert.equal(first.status,'prepared');const archive=path.join(directory,`${first.id}.json`),bytes=await readFile(archive,'utf8');assert.equal((await publishSourceDesk(notebook,{directory})).status,'unchanged');assert.equal(await readFile(archive,'utf8'),bytes);
 }finally{await rm(directory,{recursive:true,force:true});}
});

// Use the real accepted notebook clocks; no fetches or historical regeneration.
test('dated releases outrank older builder announcements and today observations; ties stay stable',async()=>{
 const {SOURCES}=await import('./collect-ltc-builder-news.mjs');
 const builders={schemaVersion:1,classification:'Bounded primary-publisher watch',checkedAt:notebook.preparedAt,sources:SOURCES.map((source,index)=>({id:source.id,publisher:source.publisher,index:source.index,checkedAt:notebook.preparedAt,status:index===0?'collected':'unavailable',gaps:[],stories:index===0?[0,1].map(n=>({id:`builder-${n}`,publisher:source.publisher,title:`Testnet plan ${n}`,publishedAt:'2026-10-27',checkedAt:notebook.preparedAt,url:new URL(`${source.articlePrefix}priority-test-${n}`,source.index).href,sourceSha256:'a'.repeat(64)})):[]}))};
 const result=sourceDeskFromNewsroom(notebook,undefined,builders);
 assert.equal(result.stories[0].id,'lnd-release');
 const dated=result.stories.filter(story=>story.dateKind==='published');
 assert.deepEqual(dated.map(story=>story.publishedAt),[...dated.map(story=>story.publishedAt)].sort((a,b)=>Date.parse(b)-Date.parse(a)));
 assert.deepEqual(dated.filter(story=>story.id.startsWith('builder-')).map(story=>story.id),['builder-0','builder-1']);
 const observed=result.stories.filter(story=>story.dateKind==='observed');
 assert.deepEqual(observed.map(story=>story.id),notebook.briefs.filter(brief=>!brief.id.endsWith('-release')).map(brief=>brief.id));
 assert.ok(result.stories.indexOf(observed[0])>result.stories.indexOf(dated.at(-1)));
 assert.equal(observed[0].classification,'Automated source observation');
 assert.equal(observed[0].observedAt,notebook.briefs[0].effectiveAt);
 assert.match(dated.find(story=>story.id==='builder-0').title,/Testnet plan/);
 assert.equal(dated.find(story=>story.id==='builder-0').classification,'Attributed publisher announcement');
});
test('dated page observation is never promoted to publication by a fresh check',()=>{
 const copy=structuredClone(notebook);const source=copy.sources.find(item=>item.id==='lnd');
 source.freshness='unknown';source.checkedAt=copy.preparedAt;
 const result=sourceDeskFromNewsroom(copy,()=>{});
 const story=result.stories.find(item=>item.id==='lnd-release');
 assert.equal(story.dateKind,'observed');assert.equal(story.classification,'Automated source observation');
 assert.equal(story.publishedAt,notebook.briefs.find(item=>item.id==='lnd-release').effectiveAt);
 assert.notEqual(story.publishedAt,source.checkedAt);
});
