import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(p,'utf8');
const moon=JSON.parse(read('content/specials/litecoin-to-the-moon-r4.json'));
assert.equal(moon.id,'litecoin-to-the-moon-r4');assert.equal(moon.researchThrough,'2026-11-16');
assert.equal(read('content/specials/litecoin-to-the-moon-r3.json'),read('public/magazine/litecoin-to-the-moon/revision-3.json'));
const ids=new Set(moon.sources.map(x=>x.id));assert.equal(ids.size,moon.sources.length);
for(const section of [...moon.sections,...moon.timeline])for(const id of section.sourceIds)assert.ok(ids.has(id),id);
for(const s of moon.sources)assert.ok(s.checkedAt<=moon.researchThrough);
for(const term of ['100 holders','15,908,728','532,276,000','In build','testnet','not independently','no independent audit'])assert.ok(JSON.stringify(moon).includes(term),term);
const pdf='magazine/ecosystem-special-20261116/LTC-Ecosystem-Special-2026-11-16-v1.0.pdf';
for(const root of ['public','dist','.vercel/output/static'])assert.equal(createHash('sha256').update(readFileSync(`${root}/${pdf}`)).digest('hex'),'1441aad5ed6f8e653b48ea85bef334cc8ae254a326cc5f057a327b7736347132');
for(const route of ['index.html','conversations/index.html','conversations/archive/index.html','conversations/specials/2026-11-16-ecosystem/index.html']){const html=read('dist/'+route);assert.ok(html.includes('One Family.'));assert.ok(html.includes('ecosystem-special-20261116'));}
const html=read('dist/conversations/specials/litecoin-to-the-moon/index.html');for(const phrase of ['Revision 4','November 16, 2026','revision-3.json','15,908,728'])assert.ok(html.includes(phrase),phrase);
console.log('PASS exact18-page PDF, all4 publication surfaces, Moon r4 evidence, date integrity and preserved r3');
