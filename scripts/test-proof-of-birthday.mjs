import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const issue=JSON.parse(await readFile('content/specials/proof-of-birthday-r3.json','utf8'));
test('Birthday revision has exactly84 pages, complete chapters, milestone destinations and a dated boundary',()=>{
 assert.equal(issue.pages.length,84);assert.deepEqual(issue.pages.map(p=>p.page),Array.from({length:84},(_,i)=>i+1));
 assert.equal(issue.researchCutoff,'2026-10-04');assert.equal(issue.anniversaryDate,'2026-10-13');assert.equal(issue.plannedIssueDate,'2026-10-15');
 assert.deepEqual(issue.chapters.flatMap(c=>Array.from({length:c.end-c.start+1},(_,i)=>c.start+i)),issue.pages.map(p=>p.page));
 for(const m of issue.milestones){assert.ok(issue.pages.some(p=>p.page===m.page));assert.ok(issue.sources.some(s=>s.id===m.sourceId));assert.ok(Date.parse(m.date)<=Date.parse(issue.researchCutoff+'T23:59:59Z'));}
});
test('Every birthday page has an authored visual, resolving citations and valid local art',async()=>{
 const ids=new Set(issue.sources.map(s=>s.id));assert.equal(ids.size,issue.sources.length);
 for(const p of issue.pages){assert.ok(p.art||p.diagram||p.quote||p.sourcebook);assert.ok(p.paragraphs.length);assert.ok(p.takehome);for(const id of p.sources)assert.ok(ids.has(id),`${p.page}:${id}`);if(p.art){assert.ok(p.art.alt.length>15);assert.match(p.art.src,/^\/magazine\/proof-of-birthday\//);await stat('public'+p.art.src);}}
 const used=issue.pages.filter(p=>p.sourcebook).flatMap(p=>p.sources);assert.equal(used.length,ids.size);assert.equal(new Set(used).size,ids.size);
 for(const s of issue.sources){assert.equal(new URL(s.url).protocol,'https:');assert.equal(s.checkedDate,'2026-10-04');assert.ok(!s.publishedDate||s.publishedDate<=issue.researchCutoff);}
 const quoteWords=new Map();for(const p of issue.pages.filter(p=>p.quote)){const q=p.quote;assert.ok(p.sources.includes(q.sourceId));const url=issue.sources.find(s=>s.id===q.sourceId).url;quoteWords.set(url,(quoteWords.get(url)||0)+q.text.split(/\s+/).length);}
 assert.equal(issue.pages.filter(p=>p.quote).length,6);for(const count of quoteWords.values())assert.ok(count*2<=25);
});
test('Prior special and daily records are retained; revised copy cannot overwrite the old identity',async()=>{
 assert.notEqual(issue.id,'litecoin-at-15-r1');
 const previousHash=createHash('sha256').update(await readFile('content/specials/proof-of-birthday-r2.json')).digest('hex');assert.equal(previousHash,'68ac52566105c22189399fed99482bbb590be78da6e937ba36d3f989c8efa6cd');
 const previousPdfHash=createHash('sha256').update(await readFile('public/magazine/proof-of-birthday/Proof-of-Birthday-LTC-84-pages-r2.pdf')).digest('hex');assert.equal(previousPdfHash,'6b98c2850c38b34b6af491355c61a9b4b2cc10c1048dd0358e0cdb492efcbc76');
 const hash=createHash('sha256').update(await readFile('content/specials/litecoin-at-15-r1.json')).digest('hex');assert.equal(hash,'36a3454229364f321a75bb7a3945ea96a8d173f232627b4b5b16c07b6b2288d1');
 const pdfHash=createHash('sha256').update(await readFile('public/magazine/litecoin-15/Litecoin-at-15-84-page-advance-edition.pdf')).digest('hex');assert.equal(pdfHash,'1957afc627ed6fdf8a8194ea8107034fdd0325b8310b686c66132a5f08196dec');
 const daily=JSON.parse(await readFile('content/ltc/index.json','utf8'));assert.ok(!daily.some(d=>d.id===issue.id));
 const pdf=await readFile('public'+issue.pdf);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
});
test('Founder review is recorded without upgrading evidence or changing the historical measurements',async()=>{
 const previous=JSON.parse(await readFile('content/specials/proof-of-birthday-r2.json','utf8'));
 assert.equal(issue.id,'proof-of-birthday-r3');assert.equal(issue.previousRevisionId,previous.id);
 assert.equal(issue.review.status,'founder-reviewed');assert.equal(issue.review.reviewedOn,'2026-10-04');
 assert.match(issue.review.limits,/not independent verification/);
 assert.match(issue.review.limits,/source conflicts/);
 assert.doesNotMatch(JSON.stringify(issue),/human.{0,20}review.{0,20}pending|human.{0,20}review.{0,20}remains pending/i);
 assert.deepEqual(issue.sources,previous.sources);assert.deepEqual(issue.milestones,previous.milestones);
 for(let i=0;i<84;i++){
  assert.deepEqual(issue.pages[i].table,previous.pages[i].table,`page ${i+1}: no silently revised measurements`);
  assert.deepEqual(issue.pages[i].quote,previous.pages[i].quote,`page ${i+1}: no silently revised quotation`);
  assert.deepEqual(issue.pages[i].sources,previous.pages[i].sources);
  if(![2,73,76].includes(i+1))assert.deepEqual(issue.pages[i].paragraphs,previous.pages[i].paragraphs,`page ${i+1}: review does not change research`);
 }
});
