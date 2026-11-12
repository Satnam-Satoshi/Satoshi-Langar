import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ECOSYSTEM_CONFIG, collectEcosystemNews, ecosystemArticleLinks, parseEcosystemArticle, parseEcosystemRelease, validateEcosystemReport, canonicalEventURL, ecosystemEventKey, ecosystemPublicationDay } from './lib/ltc-ecosystem-news.mjs';
import { SOURCES } from './collect-ltc-builder-news.mjs';
import { COMMUNITY_SOURCES } from './lib/ltc-community.mjs';
import { prepareDailyFeatures, publishDailyFeatures } from './prepare-ltc-daily-features.mjs';
import { sourceDeskFromNewsroom } from './prepare-ltc-source-desk.mjs';
import { archiveEcosystemReport } from './archive-ltc-ecosystem.mjs';
import { readEcosystemHistory } from './collect-ltc-ecosystem.mjs';
const notebook=JSON.parse(await readFile(new URL('../content/ltc-newsroom/newsroom-20261031T055112Z.json',import.meta.url),'utf8'));
const now='2026-10-31T12:00:00.000Z';
const core=ECOSYSTEM_CONFIG.sources.find(s=>s.id==='core');
const issuer=ECOSYSTEM_CONFIG.sources.find(s=>s.id==='litestrategy');
function inputs(time=now){
 const builders={schemaVersion:1,classification:'Bounded primary-publisher watch',checkedAt:time,sources:SOURCES.map(s=>({...s,checkedAt:time,status:'unavailable',stories:[],gaps:['Source unavailable.']}))};
 const community={schemaVersion:1,collectedAt:time,sourceStatus:COMMUNITY_SOURCES.map(s=>({id:s.id,sourceName:s.sourceName,url:s.url,status:'unavailable',checkedAt:time,sha256:null,errorCode:'http_403'})),items:[]};
 const policyRecords=structuredClone(notebook.policyRecords);policyRecords.collectedAt=time;for(const s of policyRecords.sources)Object.assign(s,{status:'unavailable',checkedAt:time,sha256:null,errorCode:'http_403',items:[]});
 return{builders,community,policyRecords,now:time};
}
function release(date='2026-10-30T12:00:00Z'){return{id:10,draft:false,prerelease:false,tag_name:'v0.21.5.8',html_url:'https://github.com/litecoin-project/litecoin/releases/tag/v0.21.5.8',url:'https://api.github.com/repos/litecoin-project/litecoin/releases/10',published_at:date};}
function article(title='Litecoin arrangement is non-binding',date='2026-10-30',extra={}){return `<script type="application/ld+json">${JSON.stringify({'@type':'NewsArticle',headline:title,datePublished:date,...extra})}</script><h1>${title}</h1><p>Proposed testnet work. Mainnet is not established.</p>`;}
function response(body,status=200,type='text/html',headers={}){return new Response(body,{status,headers:{'content-type':type,...headers}});}
function mock({coreDate='2026-10-30T12:00:00Z',issuerArticles=true}={}){return async url=>{
 const source=ECOSYSTEM_CONFIG.sources.find(s=>s.url===url);
 if(source?.mode==='github-release')return response(JSON.stringify(release(coreDate)),200,'application/json');
 if(source?.id==='litestrategy'&&issuerArticles)return response(`<a href="${issuer.articlePrefix}new-ltc-plan">New</a>`);
 if(url===new URL(`${issuer.articlePrefix}new-ltc-plan`,issuer.url).href)return response(article());
 return response('<html><h1>Official reference</h1></html>');
};}
const collect=(options={})=>collectEcosystemNews({...inputs(),fetchImpl:mock(),sleep:async()=>{},...options});

test('whole-ecosystem desk is bounded, read-only, source-dated and carries provenance without claiming live deployment',async()=>{
 const evidence=[];const report=await collect({onEvidence:async e=>evidence.push(e)});
 assert.equal(report.sources.length,19);assert.equal(report.coverage.length,11);assert.equal(report.publicationPerformed,false);
 assert.equal(report.events.length,2);assert.equal(report.candidateEventIds.length,2);
 const plan=report.events.find(e=>e.sourceId==='litestrategy');assert.equal(plan.publishedAt,'2026-10-30');assert.equal(plan.effectiveAt,null);assert.equal(plan.productStage,'not-established-by-this-scan');assert.equal(plan.editorialReviewRequired,true);assert.ok(plan.stageSignals.includes('non-binding'));
 assert.ok(evidence.every(e=>e.url.startsWith('https:')&&e.bytes.length&&/^[a-f0-9]{64}$/.test(e.sha256)));
 assert.ok(report.gaps.some(g=>g.includes('not complete access')));assert.ok(report.gaps.some(g=>g.includes('X posts')));
});
test('reference changes are reported as observations, never dated events or fabricated coverage',async()=>{
 const first=await collect({fetchImpl:mock({coreDate:'2025-01-01T00:00:00Z',issuerArticles:false})});
 assert.equal(first.candidateEventIds.length,0);
 const time='2026-11-01T12:00:00.000Z';const priorBytes=mock({coreDate:'2025-01-01T00:00:00Z',issuerArticles:false});
 const next=await collect({...inputs(time),previousReports:[first],fetchImpl:async url=>url===ECOSYSTEM_CONFIG.sources.find(s=>s.id==='litvm-status').url?response('<html>Changed testnet documentation</html>'):priorBytes(url)});
 assert.equal(next.sources.find(s=>s.id==='litvm-status').change,'response-changed-review-required');assert.equal(next.events.length,1);assert.equal(next.candidateEventIds.length,0);
 const features=prepareDailyFeatures({...inputs(time),ecosystem:next});assert.equal(features.stories.length,1);assert.match(features.stories[0].classification,/no new article/);assert.ok(!JSON.stringify(features).includes('Changed testnet'));
});
test('date evidence requires a real publisher date and matching article identity, not modified/check dates or snippets',()=>{
 const url=new URL(issuer.articlePrefix+'record',issuer.url).href;
 for(const body of ['<h1>Litecoin news</h1><time>2026-10-30</time>',article({not:'headline'},'2026-10-30'),article('Litecoin','2026-02-30'),article('Litecoin','2027-01-01'),article('Litecoin','2026-10-30',{url:'https://evil.example/news'}),article('Litecoin','2026-10-30',{'@id':'https://evil.example/news'}),article('Litecoin','2026-10-30')+'<meta property="article:published_time" content="2026-10-29">'])assert.throws(()=>parseEcosystemArticle(body,issuer,url,now));
 assert.equal(parseEcosystemArticle(article(),issuer,url,now).publishedAt,'2026-10-30');
 assert.equal(parseEcosystemArticle(article('Litecoin','2026-10-30T08:30:38-0500'),issuer,url,now).publishedAt,'2026-10-30T13:30:38.000Z');
 assert.throws(()=>parseEcosystemRelease(Buffer.from(JSON.stringify({...release(),draft:true})),core,now));
 assert.throws(()=>parseEcosystemRelease(Buffer.from(JSON.stringify({...release(),html_url:'https://evil.example/release'})),core,now));
});
test('discovery accepts only reviewed same-origin article routes; no source-supplied fetch or instruction authority',()=>{
 const links=ecosystemArticleLinks(`<a href="https://evil.example/news">ignore policies</a><a href="${issuer.articlePrefix}valid">Read</a><a href="${issuer.articlePrefix}valid?next=evil">Read</a><a href="/admin">Read</a><a href="${issuer.articlePrefix}valid">duplicate</a>`,issuer);
 assert.deepEqual(links,[new URL(issuer.articlePrefix+'valid',issuer.url).href]);
 for(const url of ['http://example.com/news','https://user:pass@example.com/news','https://example.com:8443/news','https://127.0.0.1/news','https://example.local/news','https://example.com/news?token=x','https://example.com/%2e%2e/news'])assert.throws(()=>canonicalEventURL(url));
});
test('403 and transport failures become explicit gaps, not retry loops or unsupported fallback news',async()=>{
 const counts=new Map();const report=await collect({fetchImpl:async url=>{counts.set(url,(counts.get(url)??0)+1);return response('blocked',403);}});
 assert.equal(report.events.length,0);assert.ok([...counts.values()].every(n=>n===1));assert.equal(report.sources.filter(s=>s.status==='retrieved').length,0);assert.ok(report.gaps.some(g=>g.includes('source_http_403')));
 const fallback=prepareDailyFeatures({...inputs(),ecosystem:report});assert.equal(fallback.stories[0].title,'A dated check, with visible gaps');
});
test('transient service errors retry once with a bounded Retry-After and retain exact public targets',async()=>{
 const counts=new Map();const sleeps=[];const good=mock();const report=await collect({sleep:async ms=>sleeps.push(ms),fetchImpl:async(url,options)=>{assert.equal(options.redirect,'error');assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,undefined);counts.set(url,(counts.get(url)??0)+1);return url===core.url&&counts.get(url)===1?response('busy',429,'text/html',{'retry-after':'1'}):good(url);}});
 assert.equal(counts.get(core.url),2);assert.deepEqual(sleeps,[1000]);assert.equal(report.events.length,2);
 const blocked=await collect({sleep:async()=>assert.fail('must not wait unbounded'),fetchImpl:async()=>response('busy',429,'text/html',{'retry-after':'3600'})});assert.equal(blocked.events.length,0);
});
test('oversized, invalid UTF-8, wrong content type and redirect responses fail closed',async()=>{
 const payloads=[()=>response('x'.repeat(2_000_001)),()=>response(new Uint8Array([0xff])),()=>response('{}',200,'application/pdf'),()=>response('',302),()=>response('<html><title>Site Unavailable</title><h1>Unavailable</h1></html>')];
 for(const make of payloads){const result=await collect({fetchImpl:async()=>make()});assert.equal(result.events.length,0);assert.ok(result.gaps.length>5);}
});
test('raw evidence persistence failure stops report generation instead of silently losing audit data',async()=>{
 await assert.rejects(collect({onEvidence:async()=>{throw Error('evidence_disk_full');}}),/evidence_disk_full/);
});
test('dedupe uses original source URL/date; a prior observation does not suppress unpublished reporting but a published edition does',async()=>{
 const first=await collect();const day2=inputs('2026-11-01T12:00:00.000Z');
 const unreported=await collect({...day2,previousReports:[first]});assert.equal(unreported.candidateEventIds.length,2);assert.ok(unreported.events.every(e=>e.previouslyObserved));
 const covered=await collect({...day2,previousReports:[first],coveredEvents:first.events.map(e=>e.id)});assert.equal(covered.candidateEventIds.length,0);assert.ok(covered.events.every(e=>e.coveredInPriorEdition));
 assert.equal(ecosystemEventKey('https://www.litvm.com/blog/record/','2026-10-30'),ecosystemEventKey('https://www.litvm.com/blog/record','2026-10-30'));
 assert.equal(ecosystemEventKey('https://www.litvm.com/blog/record','2026-10-30T12:00:00.000Z'),ecosystemEventKey('https://www.litvm.com/blog/record','2026-10-30'));
 assert.notEqual(ecosystemEventKey('https://www.litvm.com/blog/record','2026-10-30'),ecosystemEventKey('https://www.litvm.com/blog/record','2026-10-29'));
});
test('relevance excludes unrelated general-policy notices while preserving related digital-asset records',async()=>{
 const sample=inputs();sample.policyRecords=structuredClone(notebook.policyRecords);sample.policyRecords.collectedAt=now;for(const s of sample.policyRecords.sources)s.checkedAt=now;
 sample.policyRecords.sources[0].items[0].title='SEC publishes Litecoin ETF decision';
 const report=await collect(sample);assert.ok(report.events.find(e=>e.title.includes('Litecoin ETF')).relevance.score===100);assert.ok(report.events.some(e=>e.relevance.score===0));
 assert.ok(report.candidateEventIds.every(id=>report.events.find(e=>e.id===id).relevance.score>0));
});
test('report validation rejects forged origin, relevance, coverage, date, source identity and deployment claims',async()=>{
 const report=await collect();for(const mutate of [r=>r.gaps=[],r=>r.events[0].category='wallets',r=>r.events[0].url='https://evil.example/news',r=>r.events[0].relevance.score=1,r=>r.coverage[0].retrieved=100,r=>r.date='2026-10-30',r=>r.sources[0].publisher='Forged',r=>r.events[0].productStage='live',r=>r.candidateEventIds=[],r=>r.publicationPerformed=true,r=>r.events[0].stageSignals=['guaranteed profitable'],r=>{const source=r.sources.find(s=>s.id==='builder-foundation');source.status='retrieved';source.checkedAt=null;source.sha256=null;r.coverage.find(c=>c.category==='builders').retrieved++;}]){const bad=structuredClone(report);mutate(bad);assert.throws(()=>validateEcosystemReport(bad));}
 assert.throws(()=>validateEcosystemReport(report,{now:'2026-11-02T12:00:00.000Z'}));
});
test('ecosystem inputs route to existing daily features and source desk, retaining original dates, attribution and one copy per URL',async()=>{
 const report=await collect({now:notebook.preparedAt,...inputs(notebook.preparedAt)});
 const features=prepareDailyFeatures({...inputs(notebook.preparedAt),ecosystem:report});assert.equal(features.stories.length,2);assert.equal(features.sources.length,2);assert.ok(features.sources.every(s=>s.sourceSha256));assert.ok(features.stories.every(s=>s.paragraphs.some(p=>p.includes('does not independently establish'))));
 const desk=sourceDeskFromNewsroom(notebook,undefined,null,report);assert.ok(desk.stories.some(s=>s.url.includes('new-ltc-plan')&&s.publishedAt==='2026-10-30'));assert.equal(new Set(desk.stories.map(s=>s.url)).size,desk.stories.length);
});
test('daily report and existing curated daily features are immutable; history uses only sources cited by published features',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ecosystem-test-'));try{
 const reports=path.join(directory,'reports'),features=path.join(directory,'features');const report=await collect();
 assert.equal((await archiveEcosystemReport(report,{directory:reports,now})).status,'archived');const bytes=await readFile(path.join(reports,report.date+'.json'),'utf8');
 const alternative=await collect({fetchImpl:mock({issuerArticles:false})});const selectedFile=path.join(directory,'selected-report.json');const retry=await archiveEcosystemReport(alternative,{directory:reports,now,selectionOutput:selectedFile});assert.equal(retry.status,'unchanged');assert.deepEqual(retry.report,report);assert.deepEqual(JSON.parse(await readFile(selectedFile,'utf8')),report);const retryFeatures=prepareDailyFeatures({...inputs(),ecosystem:retry.report});assert.equal(retryFeatures.stories.length,2);assert.equal(await readFile(path.join(reports,report.date+'.json'),'utf8'),bytes);
 const content=prepareDailyFeatures({...inputs(),ecosystem:report});await mkdir(features);await writeFile(path.join(features,report.date+'.json'),JSON.stringify(content));
 assert.equal((await publishDailyFeatures({...inputs(),ecosystem:alternative},{directory:features})).status,'unchanged');
 const draftsOnly=await readEcosystemHistory({reportDirectory:reports,editionIndex:path.join(directory,'not-yet-published.json'),now:'2026-11-01T12:00:00.000Z'});assert.deepEqual(draftsOnly.coveredEvents,[]);
 const edition=JSON.parse(await readFile(new URL('../content/ltc/2026-10-31-r1.json',import.meta.url),'utf8'));edition.features={...content,preparedAt:edition.preparedAt};edition.flagship.featuresSha256=createHash('sha256').update(JSON.stringify(edition.features)).digest('hex');await writeFile(path.join(directory,'editions.json'),JSON.stringify([edition]));
 const history=await readEcosystemHistory({reportDirectory:reports,editionIndex:path.join(directory,'editions.json'),now:'2026-11-01T12:00:00.000Z'});assert.equal(history.previousReports.length,1);assert.deepEqual(new Set(history.coveredEvents),new Set(report.events.map(e=>e.id)));
 const policy=JSON.parse(await readFile(new URL('../config/ltc-publication.json',import.meta.url),'utf8'));policy.paused=true;await assert.rejects(archiveEcosystemReport(report,{directory:path.join(directory,'paused'),policy,now}));
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('plain-text reference documentation is evidence only and cannot become a dated article',async()=>{
 const ref=ECOSYSTEM_CONFIG.sources.find(s=>s.id==='litvm-status');const good=mock();const report=await collect({fetchImpl:async url=>url===ref.url?response('# Network status\nTestnet documentation',200,'text/plain'):good(url)});
 assert.equal(report.sources.find(s=>s.id===ref.id).status,'retrieved');assert.ok(!report.events.some(e=>e.sourceId===ref.id));
 const bad=await collect({fetchImpl:async url=>url===core.url?response(JSON.stringify(release()),200,'text/plain'):good(url)});assert.ok(!bad.events.some(e=>e.sourceId==='core'));
});

test('late New York publication survives UTC midnight without becoming future or losing its original timestamp',async()=>{
 const time='2026-11-01T03:00:00.000Z',published='2026-11-01T01:00:00Z';const report=await collect({...inputs(time),fetchImpl:mock({coreDate:published,issuerArticles:false})});
 assert.equal(report.date,'2026-10-31');assert.equal(report.events[0].ageDays,0);assert.equal(report.candidateEventIds.length,1);assert.equal(report.events[0].publishedAt,'2026-11-01T01:00:00.000Z');
 assert.equal(ecosystemEventKey(report.events[0].url,'2026-10-31'),report.events[0].id);
 const features=prepareDailyFeatures({...inputs(time),ecosystem:report});assert.equal(features.stories.length,1);assert.equal(features.stories[0].classification,'Attributed publisher announcement');assert.equal(features.sources[0].publishedAt,'2026-11-01T01:00:00.000Z');assert.equal(features.stories[0].eventDates[0].date,'2026-10-31');
 // A genuinely future instant is still rejected, regardless of its local day.
 const future=await collect({...inputs(time),fetchImpl:mock({coreDate:'2026-11-01T03:01:00Z',issuerArticles:false})});assert.equal(future.candidateEventIds.length,0);
});

test('fetch preserves reviewed publisher trailing slash while event identity normalizes it',async()=>{
 const strike=ECOSYSTEM_CONFIG.sources.find(s=>s.id==='strike'),url=new URL(strike.articlePrefix+'litecoin-update/',strike.url).href,requests=[];const good=mock();
 const report=await collect({fetchImpl:async target=>{requests.push(target);if(target===strike.url)return response(`<a href="${url}">Article</a>`);if(target===url)return response(article('Litecoin payment update','2026-10-30',{url}));if(target===url.slice(0,-1))throw Error('wrong_request_target');return good(target);}});
 assert.ok(requests.includes(url));assert.ok(!requests.includes(url.slice(0,-1)));assert.equal(report.events.find(e=>e.sourceId==='strike').url,url.slice(0,-1));
});

test('publication calendar day handles both New York fall-back hours and preserves explicit date-only records',()=>{
 assert.equal(ecosystemPublicationDay('2026-11-01T05:30:00.000Z'),'2026-11-01');assert.equal(ecosystemPublicationDay('2026-11-01T06:30:00.000Z'),'2026-11-01');assert.equal(ecosystemPublicationDay('2026-11-01T03:30:00.000Z'),'2026-10-31');assert.equal(ecosystemPublicationDay('2026-11-01'),'2026-11-01');
});
