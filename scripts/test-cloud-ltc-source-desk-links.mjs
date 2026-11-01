import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sourceDeskReadMore} from './lib/ltc-source-desk-links.mjs';
const config=JSON.parse(await readFile(new URL('../config/ltc-publication-exclusions.json',import.meta.url)));
test('only literal excluded edition targets use the same story primary source, preserving source records',()=>{
 for(const prefix of['','https://ltcmagazine.org','https://satnamsatoshi.com'])for(const suffix of['','/','/index.html','/#sourcebook','/?from=desk']){
  const story={readMore:prefix+'/conversations/editions/2026-10-31-r1'+suffix,url:'https://publisher.example/release?original=1#record'},before=JSON.stringify(story);
  assert.deepEqual(sourceDeskReadMore(story,config),{href:story.url,label:'Open primary source',destination:'primary-source'});assert.equal(JSON.stringify(story),before);
 }
});
test('similar external sites, other revisions/dates, nested paths and query substrings remain exactly unchanged',()=>{
 for(const readMore of['https://other.example/conversations/editions/2026-10-31-r1/','https://ltcmagazine.org.evil.example/conversations/editions/2026-10-31-r1/','//ltcmagazine.org/conversations/editions/2026-10-31-r1/','http://ltcmagazine.org/conversations/editions/2026-10-31-r1/','/conversations/editions/2026-10-31-r2/','/conversations/editions/2026-11-01-r1/','/conversations/editions/2026-10-30-r1/','/conversations/editions/2026-10-31-r1/extra/','/conversations/updates/?next=/conversations/editions/2026-10-31-r1/','/conversations/specials/litecoin-to-the-moon/'])assert.deepEqual(sourceDeskReadMore({readMore,url:'https://publisher.example/'},config),{href:readMore,label:null,destination:'unchanged'});
});
test('missing or unsafe source uses a real source-desk anchor and an accurate label',async()=>{
 for(const url of[undefined,'','javascript:alert(1)','http://publisher.example/','https://user:password@publisher.example/','https://ltcmagazine.org/conversations/editions/2026-10-31-r1/'])assert.deepEqual(sourceDeskReadMore({readMore:'/conversations/editions/2026-10-31-r1/',url},config),{href:'/conversations/#source-desk',label:'Open source desk',destination:'source-desk'});
 assert.match(await readFile(new URL('../app/conversations/page.tsx',import.meta.url),'utf8'),/<section id="source-desk"/);
});
test('actual saved selections resolve four unavailable issue links without changing their bytes or other eight links',async()=>{
 const file=new URL('../content/ltc-newsroom-selections/latest.json',import.meta.url),before=await readFile(file),desk=JSON.parse(before);let replaced=0;
 for(const story of desk.stories){const link=sourceDeskReadMore(story,config);if(story.readMore==='/conversations/editions/2026-10-31-r1/'){replaced++;assert.equal(link.href,story.url);assert.equal(link.label,'Open primary source');}else assert.equal(link.href,story.readMore);}
 assert.equal(replaced,4);assert((await readFile(file)).equals(before));
});
test('home, conversations and Litecoin source-card displays all use the shared resolver and appropriate link labels',async()=>{
 for(const file of['../app/components/CommunityEditionFront.tsx','../app/conversations/page.tsx','../app/conversations/litecoin/page.tsx']){const text=await readFile(new URL(file,import.meta.url),'utf8');assert.match(text,/import \{ sourceDeskReadMore \} from/);assert.match(text,/href=\{sourceDeskReadMore\((?:story|s), publicationExclusionConfig\)\.href\}/);assert.match(text,/sourceDeskReadMore\((?:story|s), publicationExclusionConfig\)\.label/);assert.doesNotMatch(text,/href=\{(?:story|s)\.readMore\}/);}
});
