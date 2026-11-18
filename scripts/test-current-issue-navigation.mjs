import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const current='/conversations/editions/2026-11-16/';
const read=p=>readFileSync(`dist/${p}/index.html`,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
for(const route of ['conversations','conversations/desks','ecosystem','subscribe',...readdirSync('dist/conversations/desks',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>`conversations/desks/${d.name}`)]){
 const html=read(route);
 for(const match of html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)){
  const label=match[2].replace(/<[^>]*>/g,'');
  if(!match[1].startsWith('#') && /^(Daily issue|Latest daily issue|Read the latest daily issue|Read the latest issue|Latest published issue|LATEST PUBLISHED)/i.test(label))assert.equal(new URL(match[1],`https://example.com/${route}/`).pathname.replace(/index\.html$/,''),current,`${route}: ${label}`);
 }
 if(route.startsWith('conversations/desks/')){
  assert.ok(html.includes('Historical reference guide · Not refreshed for the current issue'));
  assert.ok(html.includes('Archived automated evidence'));
  assert.ok(!html.includes('The latest published edition'));
  assert.ok(html.includes('2026-10-04'));
  assert.ok(html.includes('November 13, 2026'));
 }
}
console.log('PASS current issue navigation and historical labels on all 25 desks');
