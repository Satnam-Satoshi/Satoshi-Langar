import {expectedLatest,newestWeb,assertCurrentNotice} from './lib/test-published-navigation.mjs';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const current=expectedLatest.page;
const read=p=>readFileSync(`dist/${p}/index.html`,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
for(const route of ['conversations','conversations/desks','ecosystem','subscribe',...readdirSync('dist/conversations/desks',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>`conversations/desks/${d.name}`)]){
 const html=read(route);assertCurrentNotice(html,route);let currentLinks=0;
 for(const match of html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)){
  const label=match[2].replace(/<[^>]*>/g,'');
  if(!match[1].startsWith('#') && /^(Daily issue|Latest daily issue|Read the latest daily issue|Read the latest issue|Latest published issue|LATEST PUBLISHED)/i.test(label)){currentLinks++;assert.equal(new URL(match[1],`https://example.com/${route}/`).pathname.replace(/index\.html$/,''),current,`${route}: ${label}`);}
 }
 assert.ok(currentLinks>0,`${route}: at least one actual current-issue navigation link`);
 if(route.startsWith('conversations/desks/')){
  assert.ok(html.includes('Historical reference guide · Not refreshed for the current issue'));
  assert.ok(html.includes('Archived automated evidence'));
  assert.ok(!html.includes('The latest published edition'));
  assert.ok(html.includes('2026-10-04'));
  assert.ok(html.includes(new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'UTC'}).format(new Date(newestWeb.date+'T12:00:00Z'))),'The automated evidence section retains its actual published observation edition date');
 }
}
console.log('PASS current issue navigation and historical labels on all 25 desks');
