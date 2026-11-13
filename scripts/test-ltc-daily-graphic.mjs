import test from 'node:test';import assert from 'node:assert/strict';import {readFile,mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';
import {dailyGraphicPlan,dailyGraphicSVG,renderDailyGraphic,saveDailyGraphic} from './render-ltc-daily-graphic.mjs';
const dependencyRoot=process.env.LTC_TEST_DEPENDENCY_ROOT??process.cwd();
const requireApp=createRequire(path.resolve(dependencyRoot,'package.json'));const requireNext=createRequire(requireApp.resolve('next/package.json'));const sharp=requireNext('sharp');
const editions=JSON.parse(await readFile(new URL('../content/ltc/index.json',import.meta.url),'utf8'));const edition=()=>structuredClone(editions[0]);
test('plan follows actual saved feature titles and source dates with no clock or archive mutation',()=>{
 const e=edition(),copy=structuredClone(e),plan=dailyGraphicPlan(e);assert.deepEqual(e,copy);assert.equal(plan.headline,e.features.title);assert.equal(plan.date,e.date);assert.deepEqual(plan.stories.map(s=>s.id),e.features.stories.slice(0,3).map(s=>s.id));assert.equal(JSON.stringify(plan),JSON.stringify(dailyGraphicPlan(e)));assert(plan.sourceDates.every(date=>typeof date==='string'));
 const carried=edition();carried.features.issueDate='2026-10-01';assert(dailyGraphicSVG(dailyGraphicPlan(carried)).includes('CARRIED FORWARD'));
});
test('SVG escapes untrusted strings and preserves explicit source attribution',()=>{
 const e=edition();e.features.title='<script>alert("bad")</script> & news';e.features.stories[0].title='A & B <test>';const svg=dailyGraphicSVG(dailyGraphicPlan(e));assert(!svg.includes('<script>'));assert(svg.includes('&lt;script&gt;'));assert(svg.includes('A &amp; B &lt;test&gt;'));assert(svg.includes('AI-prepared'));assert(svg.includes('SOURCE:'));assert(svg.includes('No market forecast.'));assert(svg.includes('role="img"'));
});
test('real PNG render is 1200x630, visually nonempty and deterministic; story changes alter pixels',async()=>{
 const e=edition(),a=await renderDailyGraphic(e,{dependencyRoot}),b=await renderDailyGraphic(e,{dependencyRoot});assert(a.png.equals(b.png));assert.equal(a.metadata.width,1200);assert.equal(a.metadata.height,630);
 const meta=await sharp(a.png).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,630);assert.equal(meta.format,'png');const stats=await sharp(a.png).stats();assert(stats.channels.some(channel=>channel.stdev>20),'Image must contain actual contrast/content, not a solid placeholder');
 const changed=edition();changed.features.title='A different sourced news agenda';changed.features.stories[0].title='A community project shares a new testnet record';const c=await renderDailyGraphic(changed,{dependencyRoot});assert(!a.png.equals(c.png));assert.notEqual(a.metadata.svgSha256,c.metadata.svgSha256);
});
test('dated asset recording is immutable and exact repeat is idempotent',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'ltc-daily-art-'));t.after(()=>rm(root,{recursive:true,force:true}));const art=await renderDailyGraphic(edition(),{dependencyRoot});assert.equal((await saveDailyGraphic(art,{root})).saved,true);assert.equal((await saveDailyGraphic(art,{root})).alreadyRecorded,true);assert((await readFile(path.join(root,art.paths.png))).equals(art.png));
 const changed=edition();changed.features.title='Changed same-day content needs a new revision';const other=await renderDailyGraphic(changed,{dependencyRoot});await assert.rejects(saveDailyGraphic(other,{root}),/immutable_daily_graphic_exists/);
});
test('missing or malformed published/source records and unavailable render dependency fail, never invent an image',async()=>{
 for(const delta of [{status:'draft'},{id:'../escape'},{features:null},{publishedAt:'bad'}])assert.throws(()=>dailyGraphicPlan({...edition(),...delta}));
 const e=edition();e.features.stories[0].sourceIds=['not-present'];assert.throws(()=>dailyGraphicPlan(e),/source/);
 await assert.rejects(renderDailyGraphic(edition(),{dependencyRoot:'/private/tmp/nonexistent-render-dependencies'}));await assert.rejects(renderDailyGraphic(edition(),{dependencyRoot,distribution:{total:123}}),/not_implemented/);
});
