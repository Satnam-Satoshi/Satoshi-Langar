import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';
import{sourceDeskFromNewsroom,publishSourceDesk}from'./prepare-ltc-source-desk.mjs';
const notebook=JSON.parse(await readFile(new URL('../content/ltc-newsroom/latest.json',import.meta.url),'utf8'));
test('validated notebook selection copies evidence and dates without new reporting claims',()=>{
 const result=sourceDeskFromNewsroom(notebook);assert.equal(result.checkedAt,notebook.preparedAt);assert.equal(result.generatedFrom.sha256,notebook.sha256);
 for(const [i,story]of result.stories.entries()){const brief=notebook.briefs[i],source=notebook.sources.find(s=>s.id===brief.sourceIds[0]);assert.equal(story.title,brief.headline);assert.equal(story.summary,brief.paragraphs[0]);assert.equal(story.checkedAt,source.checkedAt);assert.equal(story.observedAt,brief.effectiveAt);assert.equal(story.dateKind,'observed');}
 assert.ok(result.gaps.includes(notebook.coverageGaps[0]));const bad=structuredClone(notebook);bad.briefs[0].headline='unsupported';assert.throws(()=>sourceDeskFromNewsroom(bad));
});
test('curated same-day scan and existing archive bytes remain untouched; new day advances once',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ltc-source-desk-'));
 try{const pointer=path.join(directory,'latest.json');const curated={id:'curated',checkedAt:notebook.preparedAt};const text=JSON.stringify(curated);await writeFile(pointer,text);assert.equal((await publishSourceDesk(notebook,{directory})).status,'unchanged');assert.equal(await readFile(pointer,'utf8'),text);
 await writeFile(pointer,JSON.stringify({id:'older',checkedAt:'2026-10-01T12:00:00.000Z'}));const first=await publishSourceDesk(notebook,{directory});assert.equal(first.status,'prepared');const archive=path.join(directory,`${first.id}.json`),bytes=await readFile(archive,'utf8');assert.equal((await publishSourceDesk(notebook,{directory})).status,'unchanged');assert.equal(await readFile(archive,'utf8'),bytes);
 }finally{await rm(directory,{recursive:true,force:true});}
});
