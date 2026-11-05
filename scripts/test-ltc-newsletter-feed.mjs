import {publicEditions} from './lib/ltc-public-editions.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
async function load(entry){const out=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',target:'node22',write:false,logLevel:'silent'});return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);}
const {buildNewsletterFeed,newsletterDescription}=await load('app/data/newsletter-feed.ts');
const route=await load('app/conversations/newsletter.xml/route.ts');
const rawRecords=JSON.parse(await readFile('content/ltc/index.json','utf8'));
const exclusions=JSON.parse(await readFile('config/ltc-publication-exclusions.json','utf8'));
const records=publicEditions(rawRecords,exclusions);
const ids=xml=>[...xml.matchAll(/<guid isPermaLink="false">([^<]+)<\/guid>/g)].map(m=>m[1]);
function fixture(date='2026-10-22',revision=1,publishedAt='2026-10-23T01:52:09Z'){
 const edition=structuredClone(records[0]);Object.assign(edition,{id:`${date}-r${revision}`,date,revision,publishedAt,presentation:undefined,corrections:[]});edition.features.issueDate=date;return edition;
}
test('static feed projects only saved events deterministically with stable existing GUIDs',async()=>{
 const copy=structuredClone(records),xml=await buildNewsletterFeed(records);
 assert.equal(xml,await buildNewsletterFeed(records));assert.deepEqual(records,copy);
 const expected=[...records].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||b.date.localeCompare(a.date)||b.revision-a.revision).slice(0,20).map(r=>`ltc:edition:${r.id}`);
 assert.deepEqual(ids(xml),expected);assert.equal(route.dynamic,'force-static');
 const response=await route.GET();assert.equal(response.headers.get('content-type'),'application/rss+xml; charset=utf-8');assert.equal(await response.text(),xml);
 assert(xml.includes('https://ltcmagazine.org/conversations/newsletter.xml'));
 for(const excluded of exclusions.editions)assert(!xml.includes(`ltc:edition:${excluded.id}`),'Never-public preparation is not mailed as a past publication');
});
test('corrections preserve publication order, exact timestamp and predecessors',async()=>{
 const previous=fixture('2026-10-20',1,'2026-10-20T12:00:00Z'),today=fixture(),correction=fixture('2026-10-20',2,'2026-10-23T02:00:00Z');
 correction.corrections=[{correctsEditionId:previous.id,reason:'Correct the deployment stage.'}];
 const xml=await buildNewsletterFeed([previous,today,correction]);assert.deepEqual(ids(xml),[`ltc:edition:${correction.id}`,`ltc:edition:${today.id}`,`ltc:edition:${previous.id}`]);
 assert(xml.includes('<pubDate>Fri, 23 Oct 2026 02:00:00 GMT</pubDate>'));assert(xml.includes('[Correction] 2026-10-20'));assert(xml.includes(`Correction to ${previous.id}`));
});
test('actual features yield a short attributed preview and original publication dates, not source-audit dump',()=>{
 const e=fixture(),d=newsletterDescription(e);assert(d.includes(e.features.title));
 for(const story of e.features.stories.slice(0,3))assert(d.includes(story.title));
 assert(d.includes('Original source publication:'));for(const story of e.features.stories.slice(0,3))for(const id of story.sourceIds){const published=e.features.sources.find(s=>s.id===id)?.publishedAt;if(published)assert(d.includes(published));}assert(d.includes('AI attribution:'));assert(d.includes('Human review:'));assert(d.includes('Edition 2026-10-22'));
 assert(d.length<3000);assert(!d.includes('sourceSha256'));assert(!d.includes('source as of'));assert(!d.includes('price'));
});
test('XML injection, control characters and oversized content cannot escape a bounded description',async()=>{
 const e=fixture();e.features.title='A & B </title><script>bad</script>';e.features.stories=e.features.stories.slice(0,1);e.features.stories[0].title='Story <x> & "quote"';e.features.stories[0].dek='O\'Hara 🪷\u0001 '+ 'long '.repeat(4000);
 const xml=await buildNewsletterFeed([e]);assert(xml.includes('&lt;/title&gt;&lt;script&gt;'));assert(xml.includes('Story &lt;x&gt; &amp; &quot;quote&quot;'));assert(!xml.includes('<script>'));assert(!xml.includes('\u0001'));assert(xml.includes('🪷'));assert(newsletterDescription(e).length<3000);
});
test('numeric prices and yields are withheld from preview copy',async()=>{
 const e=fixture();e.features.title='LTC $100';e.features.stories=[{...e.features.stories[0],title:'LTC $100'}, {...e.features.stories[0],title:'Borrowing basics',dek:'A fictional 8% APR'}];
 const xml=await buildNewsletterFeed([e]);assert(!xml.includes('$100'));assert(!xml.includes('8%'));assert(xml.includes('Borrowing basics'));
});
test('empty and pre-feature archives do not invent content, dates or editions',async()=>{
 const empty=await buildNewsletterFeed([]);assert.deepEqual(ids(empty),[]);assert(!empty.includes('<lastBuildDate>'));
 const e=fixture();delete e.features;const d=newsletterDescription(e);assert(d.includes('Read this saved edition online'));assert(!d.includes('Original source publication:'));
});
test('malformed, unpublished, duplicate and mismatched feature records fail closed',async()=>{
 for(const change of [{status:'draft'},{id:'bad'},{publishedAt:'bad'},{revision:0},{date:'2026-02-30'},{features:{...fixture().features,issueDate:'bad'}},{corrections:[{reason:'bad',correctsEditionId:'../'}]}])await assert.rejects(buildNewsletterFeed([{...fixture(),...change}]));
 await assert.rejects(buildNewsletterFeed([fixture(),fixture()]));
});
test('feed window is bounded at twenty actual events',async()=>{
 const many=Array.from({length:25},(_,i)=>fixture(`2026-10-${String(i+1).padStart(2,'0')}`,1,`2026-10-${String(i+1).padStart(2,'0')}T12:00:00Z`));
 const xml=await buildNewsletterFeed(many);assert.equal(ids(xml).length,20);assert.equal(ids(xml)[0],'ltc:edition:2026-10-25-r1');
});

test('historically carried-forward feature dates stay explicit without altering saved records',()=>{const e=fixture();e.features.issueDate='2026-10-20';const copy=structuredClone(e);assert(newsletterDescription(e).includes('Carried-forward feature reading dated 2026-10-20'));assert.deepEqual(e,copy);});
test('exact saved cover enclosure is reused and unsafe declared artwork fails closed',async()=>{
 const e=records.find(record=>record.presentation?.artDirection?.coverAsset);assert(e);
 const xml=await buildNewsletterFeed([e]);assert(xml.includes(`https://ltcmagazine.org/magazine/${e.presentation.artDirection.coverAsset}`));assert.match(xml,/<enclosure url="[^"]+" length="[1-9]\d*" type="image\/(?:jpeg|png|webp)"\/>/);
 const bad=fixture();bad.presentation={artDirection:{coverAsset:'../outside.jpg'}};await assert.rejects(buildNewsletterFeed([bad]));
});
