import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateBuilderNews, SOURCES as BUILDER_SOURCES, articleLinks as builderArticleLinks } from '../collect-ltc-builder-news.mjs';
import { validateCommunitySnapshot, COMMUNITY_SOURCES } from './ltc-community.mjs';
import { validatePolicySnapshot, POLICY_SOURCES } from './ltc-policy.mjs';

export const ECOSYSTEM_CONFIG = JSON.parse(await readFile(new URL('../../config/ltc-ecosystem-watch.json', import.meta.url), 'utf8'));
export const ECOSYSTEM_CATEGORIES = Object.freeze(['core','wallets','privacy-security','builders','scaling','payments','mining','institutions','etfs','policy','community']);
const DAY = 86400_000;
const hash = value => createHash('sha256').update(value).digest('hex');
const check = (ok, message = 'invalid_ecosystem_report') => { if (!ok) throw Error(message); };
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const instant = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,19) === value.slice(0,19);
export const ecosystemDate = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(value));
function publicationDate(value) {
  if (typeof value !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(value) || !Number.isFinite(Date.parse(value.slice(0,10))) || new Date(value.slice(0,10)).toISOString().slice(0,10) !== value.slice(0,10)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value ? value : null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/.test(value) && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  return null;
}
export function canonicalEventURL(value) {
  check(typeof value === 'string' && value.length < 1500 && !/[\s\\%?#]/u.test(value), 'invalid_ecosystem_url');
  const u = new URL(value);
  check(u.protocol === 'https:' && !u.username && !u.password && !u.port && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname) && !/\.local$|\.internal$/.test(u.hostname), 'invalid_ecosystem_url');
  return u.href.replace(/\/$/, '');
}
// Date-only publisher records retain their stated day; timestamped records use the issue timezone.
export const ecosystemPublicationDay = value => value.length === 10 ? value : ecosystemDate(value);
export const ecosystemEventKey = (url, publishedAt) => hash(canonicalEventURL(url) + '\n' + ecosystemPublicationDay(publishedAt));
function cleanText(value) {
  return String(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:amp|lt|gt|quot|apos|#39);/g, v => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'"}[v])).replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu,' ').replace(/\s+/g,' ').trim();
}
function titleText(value) { check(typeof value === 'string','invalid_ecosystem_title'); const title = cleanText(value).split(/\s+/).slice(0,25).join(' '); check(title.length > 0 && title.length <= 400, 'invalid_ecosystem_title'); return title; }
function relevance(title, source) {
  const direct = /\blitecoin\b|\bLTC\b|\bcLTC\b|\bzkLTC\b|\bLitVM\b|\bMWEB\b/i.test(title);
  const adjacent = /\bbitcoin\b|\bcrypto\b|\bdigital asset|\bstablecoin\b|\bblockchain\b/i.test(title);
  return { score: direct ? 100 : source.relevance === 'direct' ? 85 : adjacent ? 45 : 0, reason: direct ? 'Explicit Litecoin ecosystem subject' : source.relevance === 'direct' ? 'Dedicated primary ecosystem source' : adjacent ? 'Related digital-asset infrastructure or policy' : 'No documented ecosystem relevance in title' };
}
function stageSignals(body) {
  return ['testnet','mainnet','non-binding','planned','beta','migration'].filter(term => body.toLowerCase().includes(term));
}
function eventCategory(title,source){return /\bMWEB\b|\bsecurity\b|\bvulnerabilit|\bpostmortem\b/i.test(title)?'privacy-security':source.category;}
function reportGaps(sources){return [...ECOSYSTEM_CONFIG.gaps,...sources.filter(s=>s.status==='unavailable').map(s=>`${s.publisher}: ${s.errorCode}.`),...sources.flatMap(s=>s.gaps.map(g=>`${s.publisher}: ${g}`))];}
function datedEvent(source, entry, checkedAt) {
  const publishedAt = publicationDate(entry.publishedAt);
  check(publishedAt && Date.parse(publishedAt) <= Date.parse(checkedAt) && digest(entry.sourceSha256), 'invalid_ecosystem_date');
  const url = canonicalEventURL(entry.url); const title = titleText(entry.title); const ranked = relevance(title,source);
  const category = eventCategory(title,source);
  return { id: ecosystemEventKey(url,publishedAt), sourceId: source.id, publisher: source.publisher, category, title, url, publishedAt, effectiveAt: null, checkedAt, sourceSha256: entry.sourceSha256, evidenceKind: entry.evidenceKind ?? 'attributed-source-record', relevance: ranked, productStage: 'not-established-by-this-scan', stageSignals: entry.stageSignals ?? [], editorialReviewRequired: true };
}
export function ecosystemArticleLinks(html, source) {
  const urls = [];
  for (const [, quoted] of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const u = new URL(quoted,source.url); const canonical = canonicalEventURL(u.href);
      if (u.origin !== new URL(source.url).origin || !u.pathname.startsWith(source.articlePrefix) || u.pathname === source.articlePrefix || !/^\/[a-zA-Z0-9/_-]+\/?$/.test(u.pathname)) continue;
      if (!urls.some(value=>canonicalEventURL(value)===canonical)) urls.push(u.href);
    } catch { /* Links outside the reviewed publisher route remain data. */ }
  }
  return urls.slice(0, ECOSYSTEM_CONFIG.maximumArticlesPerIndex);
}
function attrs(tag) { return Object.fromEntries([...tag.matchAll(/([a-zA-Z:-]+)\s*=\s*["']([^"']*)["']/g)].map(m => [m[1].toLowerCase(),m[2]])); }
export function parseEcosystemArticle(html, source, url, checkedAt) {
  check(ecosystemArticleLinks(`<a href="${url}">`,source).some(value=>canonicalEventURL(value)===canonicalEventURL(url)), 'invalid_ecosystem_article_url');
  const candidates = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const visit = (value, depth=0) => {
        if (depth > 6 || !value || typeof value !== 'object') return;
        if (Array.isArray(value)) { for (const child of value.slice(0,100)) visit(child,depth+1); return; }
        const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
        if (types.some(t => ['Article','NewsArticle','BlogPosting'].includes(t))) {
          const identity = typeof value.url === 'string' ? value.url : typeof value.mainEntityOfPage === 'string' ? value.mainEntityOfPage : value.mainEntityOfPage?.['@id'] ?? value['@id'];
          if (identity && canonicalEventURL(identity) !== canonicalEventURL(url)) return;
          if (value.datePublished && value.headline) candidates.push({ date:value.datePublished, title:value.headline });
        }
        if (value['@graph']) visit(value['@graph'],depth+1);
      };
      visit(JSON.parse(match[1]));
    } catch { /* Malformed structured data cannot authorize a date. */ }
  }
  let metaDate;
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) { const a=attrs(tag); if (a.property === 'article:published_time' && a.content) metaDate=a.content; }
  const heading=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (metaDate && heading) candidates.push({date:metaDate,title:heading});
  const parsed=candidates.map(c=>({publishedAt:publicationDate(c.date),title:titleText(c.title)})).filter(c=>c.publishedAt);
  check(parsed.length>0 && new Set(parsed.map(c=>c.publishedAt)).size===1 && new Set(parsed.map(c=>c.title)).size===1,'unverified_ecosystem_article_date');
  return datedEvent(source,{...parsed[0],url,sourceSha256:hash(html),evidenceKind:'full-html-response-with-publisher-date',stageSignals:stageSignals(cleanText(html))},checkedAt);
}
export function parseEcosystemRelease(bytes, source, checkedAt) {
  const r=JSON.parse(bytes.toString('utf8'));
  check(r && r.draft===false && r.prerelease===false && typeof r.tag_name==='string' && /^[A-Za-z0-9._-]{1,100}$/.test(r.tag_name) && r.html_url===`https://github.com/${source.repository}/releases/tag/${r.tag_name}` && r.url===`https://api.github.com/repos/${source.repository}/releases/${r.id}` && Number.isSafeInteger(r.id),'unverified_ecosystem_release');
  return datedEvent(source,{title:`${source.publisher} ${r.tag_name}`,url:r.html_url,publishedAt:r.published_at,sourceSha256:hash(bytes),evidenceKind:'upstream-release-record',stageSignals:[]},checkedAt);
}
async function readPublic(url, {fetchImpl,sleep,timeoutMs}) {
  for (let attempt=0;attempt<2;attempt++) {
    let response;
    try { response=await fetchImpl(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{Accept:'text/html,application/json'}}); }
    catch(error) { throw Error(error?.name==='TimeoutError' ? 'source_timeout' : 'source_transport_unavailable'); }
    if ([429,500,502,503,504].includes(response.status) && attempt===0) {
      const delay=response.headers.get('retry-after'); await response.body?.cancel().catch(()=>{});
      const seconds=delay===null?1:Number(delay); if(!Number.isFinite(seconds)||seconds<0||seconds>5)throw Error('source_rate_or_service_limited');
      await sleep(seconds*1000);continue;
    }
    check(response.status===200&&!response.redirected&&response.body,`source_http_${response.status}`);
    const mime=response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    check(['text/html','application/json','text/plain','text/markdown'].includes(mime),'source_content_type');
    const reader=response.body.getReader();const chunks=[];let length=0;
    try { while(true){const p=await reader.read();if(p.done)break;length+=p.value.byteLength;check(length<=2_000_000,'source_response_too_large');chunks.push(p.value);} } finally {await reader.cancel().catch(()=>{});}
    const bytes=Buffer.concat(chunks);check(bytes.length>0,'source_empty');const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);check(!/<title>\s*(?:Site Unavailable|Access Denied|Just a moment)\s*(?:\.\.\.)?\s*<\/title>/i.test(text),'source_unavailable_document');return{bytes,mime};
  }
  throw Error('source_unavailable');
}
function reuseInputs({builders,community,policyRecords,now}) {
  validateBuilderNews(builders,{now}); validateCommunitySnapshot(community,{now}); validatePolicySnapshot(policyRecords,{now});
  const sources=[],events=[];
  for(const b of builders.sources){const s={id:`builder-${b.id}`,publisher:b.publisher,url:b.index,category:b.id==='luxxfolio'?'institutions':'builders',relevance:'direct'};sources.push({...s,status:b.status==='collected'?'retrieved':'unavailable',checkedAt:b.checkedAt,sha256:b.indexSha256??null,errorCode:b.status==='collected'?null:'upstream_source_unavailable',reused:true,gaps:b.gaps});for(const e of b.stories)events.push(datedEvent(s,e,e.checkedAt));}
  for(const c of community.sourceStatus){const s={id:`community-${c.id}`,publisher:c.sourceName,url:c.url,category:c.id.includes('nexus')?'wallets':'community',relevance:'direct'};sources.push({...s,status:c.status==='collected'?'retrieved':'unavailable',checkedAt:c.checkedAt,sha256:c.sha256,errorCode:c.errorCode,reused:true,gaps:[]});for(const e of community.items.filter(e=>e.sourceId===c.id))events.push(datedEvent(s,{...e,sourceSha256:c.sha256},c.checkedAt));}
  for(const p of policyRecords.sources){const s={id:`policy-${p.id}`,publisher:p.title,url:p.url,category:'policy',relevance:'keyword'};sources.push({...s,status:p.status==='collected'?'retrieved':'unavailable',checkedAt:p.checkedAt,sha256:p.sha256,errorCode:p.errorCode,reused:true,gaps:[]});for(const e of p.items)events.push(datedEvent(s,{...e,sourceSha256:p.sha256},p.checkedAt));}
  return{sources,events};
}
export async function collectEcosystemNews({builders,community,policyRecords,now=new Date().toISOString(),previousReports=[],coveredEvents=[],fetchImpl=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),onEvidence=async()=>{},timeoutMs=15000}={}){
  check(instant(now),'invalid_ecosystem_clock'); const date=ecosystemDate(now);
  const reused=reuseInputs({builders,community,policyRecords,now});
  for(const previous of previousReports){validateEcosystemHistory(previous);check(previous.date<date,'future_ecosystem_history');}
  check(Array.isArray(coveredEvents)&&coveredEvents.every(digest),'invalid_ecosystem_coverage_history');
  const collected=new Array(ECOSYSTEM_CONFIG.sources.length);let cursor=0;
  async function worker(){while(cursor<ECOSYSTEM_CONFIG.sources.length){const index=cursor++;const source=ECOSYSTEM_CONFIG.sources[index];
    const record={...source,status:'unavailable',checkedAt:now,sha256:null,errorCode:null,reused:false,gaps:[]};const events=[],evidence=[];
    try{const first=await readPublic(source.url,{fetchImpl,sleep,timeoutMs});record.sha256=hash(first.bytes);record.status='retrieved';evidence.push({name:`${source.id}-index.body`,url:source.url,bytes:first.bytes});
      if(source.mode==='github-release'){check(first.mime==='application/json','source_content_type');events.push(parseEcosystemRelease(first.bytes,source,now));}
      else{check(source.mode==='reference'?['text/html','text/plain','text/markdown'].includes(first.mime):first.mime==='text/html','source_content_type');if(source.mode==='html-index'){
        const links=ecosystemArticleLinks(first.bytes.toString('utf8'),source);if(!links.length)record.gaps.push('No supported article links found.');
        for(const [i,url]of links.entries()){try{const article=await readPublic(url,{fetchImpl,sleep,timeoutMs});check(article.mime==='text/html','source_content_type');evidence.push({name:`${source.id}-article-${i}.body`,url,bytes:article.bytes});events.push(parseEcosystemArticle(article.bytes.toString('utf8'),source,url,now));}catch(error){record.gaps.push(`Article withheld: ${safeError(error)}.`);}}
      }}
    }catch(error){record.errorCode=safeError(error);if(record.status==='retrieved')record.gaps.push(`No dated item accepted: ${record.errorCode}.`);}
    // Evidence persistence failures stop the job rather than becoming coverage gaps.
    for(const item of evidence)await onEvidence({...item,sourceId:source.id,checkedAt:now,sha256:hash(item.bytes)});
    const previous=[...previousReports].sort((a,b)=>a.date.localeCompare(b.date)).map(r=>r.sources.find(s=>s.id===source.id)).filter(s=>s?.sha256).at(-1);
    record.change=record.sha256?(previous?(previous.sha256===record.sha256?'unchanged':'response-changed-review-required'):'first-observation'):'unavailable';
    collected[index]={source:record,events};
  }}
  const outcomes=await Promise.allSettled(Array.from({length:4},worker));
  const failure=outcomes.find(r=>r.status==='rejected');if(failure)throw failure.reason;
  const sources=[...reused.sources,...collected.map(r=>r.source)];const seen=new Map();const duplicates=[];
  for(const event of [...reused.events,...collected.flatMap(r=>r.events)]){if(seen.has(event.id)){duplicates.push({eventId:event.id,sourceId:event.sourceId});continue;}seen.set(event.id,event);}
  const priorIds=new Set(previousReports.flatMap(r=>r.events.map(e=>e.id))),covered=new Set(coveredEvents);
  const events=[...seen.values()].map(e=>({...e,previouslyObserved:priorIds.has(e.id),coveredInPriorEdition:covered.has(e.id),ageDays:Math.floor((Date.parse(date)-Date.parse(ecosystemPublicationDay(e.publishedAt)))/DAY)})).sort((a,b)=>b.relevance.score-a.relevance.score||Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id));
  const candidates=selectCandidates(events);
  const report={schemaVersion:1,agent:ECOSYSTEM_CONFIG.agent,date,timezone:'America/New_York',checkedAt:now,registrySha256:hash(JSON.stringify(ECOSYSTEM_CONFIG)),mode:'read-only-editorial-research',publicationPerformed:false,sources,events,candidateEventIds:candidates,duplicates,coverage:ECOSYSTEM_CATEGORIES.map(category=>({category,sources:sources.filter(s=>s.category===category).length,retrieved:sources.filter(s=>s.category===category&&s.status==='retrieved').length,datedEvents:events.filter(e=>e.category===category).length})),gaps:reportGaps(sources)};
  validateEcosystemReport(report,{now});return report;
}
export function validateEcosystemHistory(report){check(report?.schemaVersion===1&&instant(report.checkedAt)&&report.date===ecosystemDate(report.checkedAt)&&Array.isArray(report.sources)&&report.sources.length<=100&&Array.isArray(report.events)&&report.events.length<=100,'invalid_ecosystem_history');for(const e of report.events)check(digest(e.id)&&publicationDate(e.publishedAt)===e.publishedAt&&e.id===ecosystemEventKey(e.url,e.publishedAt),'invalid_ecosystem_history');for(const s of report.sources)check(typeof s.id==='string'&&(s.sha256===null||digest(s.sha256)),'invalid_ecosystem_history');return report;}
function allowedEventURL(sourceId,url){
  const rule=ECOSYSTEM_CONFIG.sources.find(s=>s.id===sourceId);
  if(rule){if(rule.mode==='github-release')return url.startsWith(`https://github.com/${rule.repository}/releases/tag/`)&&/^[A-Za-z0-9._-]{1,100}$/.test(url.split('/').at(-1));if(rule.mode==='html-index')return ecosystemArticleLinks(`<a href="${url}">`,rule).some(value=>canonicalEventURL(value)===url);return false;}
  const builder=BUILDER_SOURCES.find(s=>`builder-${s.id}`===sourceId);if(builder)return builderArticleLinks(`<a href="${url}">`,builder).some(u=>canonicalEventURL(u)===url);
  const community=COMMUNITY_SOURCES.find(s=>`community-${s.id}`===sourceId);if(community){const u=new URL(url);return u.origin===community.origin&&(community.format==='rss'?/^\/news\/[a-z0-9-]+$/.test(u.pathname):/^\/litecoin-foundation\/nexus\/releases\/tag\/v[0-9.]+$/.test(u.pathname));}
  const policy=POLICY_SOURCES.find(s=>`policy-${s.id}`===sourceId);if(policy){const u=new URL(url);return u.origin===policy.origin&&policy.path.test(u.pathname);}return false;
}
function selectCandidates(events){return [...events].sort((a,b)=>b.relevance.score-a.relevance.score||Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id)).filter(e=>e.relevance.score>0&&e.ageDays>=0&&e.ageDays<=ECOSYSTEM_CONFIG.freshDays&&!e.coveredInPriorEdition).slice(0,ECOSYSTEM_CONFIG.maximumCandidates).map(e=>e.id);}
function safeError(error){return typeof error?.message==='string'&&/^(?:source_[a-z0-9_]+|invalid_ecosystem_[a-z_]+|unverified_ecosystem_[a-z_]+)$/.test(error.message)?error.message:error?.name==='TimeoutError'?'source_timeout':'source_parse_or_transport_failure';}
export function validateEcosystemReport(report,{now=report?.checkedAt}={}){
  check(report?.schemaVersion===1&&report.agent===ECOSYSTEM_CONFIG.agent&&report.registrySha256===hash(JSON.stringify(ECOSYSTEM_CONFIG))&&report.mode==='read-only-editorial-research'&&report.publicationPerformed===false&&report.timezone==='America/New_York'&&instant(report.checkedAt)&&instant(now)&&Date.parse(now)>=Date.parse(report.checkedAt)&&Date.parse(now)-Date.parse(report.checkedAt)<=DAY&&report.date===ecosystemDate(report.checkedAt));
  const expected=[...ECOSYSTEM_CONFIG.sources.map(s=>s.id),'builder-litvm','builder-luxxfolio','builder-foundation',...COMMUNITY_SOURCES.map(s=>`community-${s.id}`),...POLICY_SOURCES.map(s=>`policy-${s.id}`)].sort();
  check(Array.isArray(report.sources)&&JSON.stringify(report.sources.map(s=>s.id).sort())===JSON.stringify(expected)&&Array.isArray(report.events)&&report.events.length<=100&&Array.isArray(report.candidateEventIds)&&report.candidateEventIds.length<=24&&new Set(report.events.map(e=>e.id)).size===report.events.length&&new Set(report.candidateEventIds).size===report.candidateEventIds.length);
  for(const source of report.sources){const rule=ECOSYSTEM_CONFIG.sources.find(s=>s.id===source.id);if(rule)check(source.url===rule.url&&source.publisher===rule.publisher&&source.category===rule.category&&source.relevance===rule.relevance&&source.mode===rule.mode&&source.reused===false);else{const b=BUILDER_SOURCES.find(s=>`builder-${s.id}`===source.id),c=COMMUNITY_SOURCES.find(s=>`community-${s.id}`===source.id),p=POLICY_SOURCES.find(s=>`policy-${s.id}`===source.id);check(b?source.url===b.index&&source.publisher===b.publisher&&source.category===(b.id==='luxxfolio'?'institutions':'builders')&&source.relevance==='direct':c?source.url===c.url&&source.publisher===c.sourceName&&source.category===(c.id.includes('nexus')?'wallets':'community')&&source.relevance==='direct':p&&source.url===p.url&&source.publisher===p.title&&source.category==='policy'&&source.relevance==='keyword');check(source.reused===true);}check(['retrieved','unavailable'].includes(source.status)&&ECOSYSTEM_CATEGORIES.includes(source.category)&&Array.isArray(source.gaps)&&source.gaps.every(g=>typeof g==='string'&&g.length<=300)&&((source.checkedAt===null&&source.reused===true)||instant(source.checkedAt)&&Date.parse(source.checkedAt)<=Date.parse(report.checkedAt)&&Date.parse(report.checkedAt)-Date.parse(source.checkedAt)<=DAY)&&(source.sha256===null||digest(source.sha256)));check(source.status==='retrieved'?instant(source.checkedAt)&&digest(source.sha256)&&(source.errorCode===null||!source.reused&&typeof source.errorCode==='string'):typeof source.errorCode==='string'&&source.errorCode.length>0);if(source.checkedAt===null)check(source.id==='community-litecoin-foundation-news'&&source.status==='unavailable'&&source.sha256===null&&source.errorCode==='deferred_by_operator');}
  for(const e of report.events){const s=report.sources.find(s=>s.id===e.sourceId);check(s&&s.status==='retrieved'&&e.publisher===s.publisher&&canonicalEventURL(e.url)===e.url&&allowedEventURL(e.sourceId,e.url)&&e.id===ecosystemEventKey(e.url,e.publishedAt)&&publicationDate(e.publishedAt)===e.publishedAt&&Date.parse(e.publishedAt)<=Date.parse(e.checkedAt)&&instant(e.checkedAt)&&Date.parse(e.checkedAt)<=Date.parse(report.checkedAt)&&digest(e.sourceSha256)&&titleText(e.title)===e.title&&e.category===eventCategory(e.title,s)&&e.effectiveAt===null&&e.productStage==='not-established-by-this-scan'&&e.editorialReviewRequired===true&&Array.isArray(e.stageSignals)&&e.stageSignals.every(v=>['testnet','mainnet','non-binding','planned','beta','migration'].includes(v))&&e.evidenceKind===(s.reused?'attributed-source-record':s.mode==='github-release'?'upstream-release-record':'full-html-response-with-publisher-date')&&typeof e.previouslyObserved==='boolean'&&typeof e.coveredInPriorEdition==='boolean'&&e.ageDays===Math.floor((Date.parse(report.date)-Date.parse(ecosystemPublicationDay(e.publishedAt)))/DAY)&&JSON.stringify(e.relevance)===JSON.stringify(relevance(e.title,s)));}
  for(const id of report.candidateEventIds){const e=report.events.find(e=>e.id===id);check(e&&e.ageDays>=0&&e.ageDays<=7&&!e.coveredInPriorEdition&&e.relevance.score>0);}
  check(JSON.stringify(report.candidateEventIds)===JSON.stringify(selectCandidates(report.events)));
  check(JSON.stringify(report.coverage)===JSON.stringify(ECOSYSTEM_CATEGORIES.map(category=>({category,sources:report.sources.filter(s=>s.category===category).length,retrieved:report.sources.filter(s=>s.category===category&&s.status==='retrieved').length,datedEvents:report.events.filter(e=>e.category===category).length}))));
  check(JSON.stringify(report.gaps)===JSON.stringify(reportGaps(report.sources)));
  check(Array.isArray(report.gaps)&&report.gaps.every(g=>typeof g==='string'&&g.length<=1000)&&Array.isArray(report.coverage)&&report.coverage.length===ECOSYSTEM_CATEGORIES.length&&Array.isArray(report.duplicates));return report;
}
export function ecosystemCandidates(report){validateEcosystemReport(report);return report.candidateEventIds.map(id=>report.events.find(e=>e.id===id));}
