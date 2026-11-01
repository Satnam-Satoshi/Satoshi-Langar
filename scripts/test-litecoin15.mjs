import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const issue=JSON.parse(await readFile('content/specials/litecoin-at-15-r1.json','utf8'));
test('Anniversary identity distinguishes future cover date, network birthday and research cutoff',()=>{
 assert.equal(issue.pageCount,84);assert.equal(issue.pages.length,84);
 assert.deepEqual(issue.pages.map(p=>p.page),Array.from({length:84},(_,i)=>i+1));
 assert.equal(issue.researchCutoff,'2026-10-04');assert.equal(issue.preparedAt,'2026-10-04');
 assert.equal(issue.anniversaryDate,'2026-10-13');assert.equal(issue.plannedIssueDate,'2026-10-15');
 assert.match(issue.state,/Advance/);assert.match(issue.humanReview,/pending/);
});
test('Every source reference and exact quotation resolves without invented or future source dates',()=>{
 const ids=new Set(issue.sources.map(s=>s.id));assert.equal(ids.size,issue.sources.length);
 const quotes=new Map();
 for(const p of issue.pages){for(const id of p.sources)assert.ok(ids.has(id),`${p.page}: ${id}`);
  assert.ok(p.paragraphs.length);assert.match(p.classification,/human review pending/);
  if(p.quote){assert.ok(p.sources.includes(p.quote.sourceId));const s=issue.sources.find(s=>s.id===p.quote.sourceId);assert.ok(s);assert.equal(p.quote.person,'Charlie Lee');assert.ok(p.quote.date<=issue.researchCutoff);const words=p.quote.text.split(/\s+/).length;assert.ok(words<=12);quotes.set(s.url,(quotes.get(s.url)??0)+words);}
 }
 assert.equal([...quotes.values()].reduce((a,b)=>a+b,0)>0,true);
 for(const count of quotes.values())assert.ok(count*2<=25,'Quote budget accounts for print and web reuse');
 for(const s of issue.sources){assert.equal(new URL(s.url).protocol,'https:');assert.ok(!s.publishedDate||s.publishedDate<=issue.researchCutoff);assert.equal(s.checkedDate,issue.researchCutoff);}
});
test('Every illustration and schematic exists and diagrams cannot run scripts or load third parties',async()=>{
 for(const p of issue.pages){for(const image of [p.art,p.diagram].filter(Boolean)){assert.ok(image.src.startsWith('/magazine/litecoin-15/'));await stat('public'+image.src);assert.ok(image.caption.length>20);}
  if(p.diagram){const svg=await readFile('public'+p.diagram.src,'utf8');assert.ok(!/<script|foreignObject|https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(svg));assert.ok(svg.includes('<title>'));}
 }
 const pdf=await readFile('public'+issue.pdf);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
});
test('The source notebook contains each numbered record once; special never impersonates a daily edition',async()=>{
 const refs=issue.pages.filter(p=>p.sourcebook).flatMap(p=>p.sources);
 assert.equal(refs.length,issue.sources.length);assert.equal(new Set(refs).size,refs.length);
 const daily=JSON.parse(await readFile('content/ltc/index.json','utf8'));assert.ok(!daily.some(d=>d.id===issue.id));
 assert.equal(issue.pages[82].title,'The October 15 checkpoint');
 assert.ok(new Set(issue.pages.map(p=>p.layout)).size>=7);
});
