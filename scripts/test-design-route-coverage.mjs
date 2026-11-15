import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('custom magazine interiors implement the approved design, not only shell tokens',async()=>{
 const files=['app/conversations/desks/desks.module.css','app/conversations/magazine.module.css','app/conversations/issue.module.css','app/conversations/about/about.module.css','app/conversations/community/wire.module.css','app/conversations/litecoin/litecoin.module.css','app/conversations/litecoin-distribution/distribution.module.css','app/conversations/daily/daily.module.css','app/components/OpenMoney.module.css'];
 for(const file of files){const css=await read(file);assert.match(css,/Approved interior design/);assert.match(css,/font-family:var\(--font-sans\);font-weight:(850|900)/);assert.match(css,/#f7931a/);}
});

test('daily route follows the actual latest publication, not a historical design review',async()=>{
 const daily=await read('app/conversations/daily/page.tsx');
 assert.match(daily,/latestLtcEdition/);assert.match(daily,/<EditionPage params=/);
 assert.doesNotMatch(daily,/const btcCompanies|const products|October 2 design review/);
 const edition=await read('app/conversations/editions/[id]/page.tsx');
 assert.match(edition,/Edition reading paths/);assert.match(edition,/styles.editionDesk/);
 const newsroom=await read('app/conversations/updates/page.tsx');
 assert.match(newsroom,/editorialSpecials.slice/);assert.match(newsroom,/newsroom-reading/);
});
test('rendered QA includes current reader, newsroom and new special on mobile and desktop',async()=>{
 const qa=await read('scripts/qa-site-browser.mjs');
 for(const route of ['/conversations/daily/','/conversations/updates/','/conversations/specials/litecoin-builders-november/','/mission/','/langar/','/agents/'])assert.ok(qa.includes(route));
 assert.match(qa,/daily-interior/);
});

test('Explore Litecoin remains discoverable in both site shells and footer',async()=>{
 for(const file of ['app/components/SiteHeader.tsx','app/components/SiteFooter.tsx','app/conversations/layout.tsx']){
  const source=await read(file);assert.match(source,/Explore Litecoin['"],\s*['"]\/conversations\/litecoin\//);
 }
 const css=await read('app/conversations/litecoin/litecoin.module.css');
 assert.match(css,/\.hero h1 em,\.section h2 em,\.closing h2 em\{font:inherit;font-style:normal/);
 assert.match(css,/\.index,\.newsNumber,\.stats strong,\.featureLink strong,\.closing strong\{font-family:var\(--font-sans\);font-weight:900/);
});
