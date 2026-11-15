import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const SOURCES=Object.freeze(JSON.parse(await readFile(new URL('../config/ltc-builder-news.json',import.meta.url),'utf8')).sources);
const check=(v)=>{if(!v)throw Error('unsupported_publisher_structure');};
const sha=b=>createHash('sha256').update(b).digest('hex');
function text(value){return value.replace(/<[^>]*>/g,' ').replace(/&(?:amp|quot|apos|lt|gt|#39|#x27);/g,v=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&#39;':"'",'&#x27;':"'"}[v])).replace(/\s+/g,' ').trim();}
function date(value){const match=/^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) (\d{1,2}), (\d{4})$/.exec(value);if(!match)return null;const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[1].slice(0,3))+1;const result=`${match[3]}-${String(month).padStart(2,'0')}-${match[2].padStart(2,'0')}`;return new Date(result).toISOString().slice(0,10)===result?result:null;}
export function articleLinks(html,source){return [...new Set([...html.matchAll(/\bhref="([^"]+)"/g)].flatMap(([,href])=>{try{const url=new URL(href,source.index);return url.origin===new URL(source.index).origin&&!url.search&&!url.hash&&new RegExp(`^${source.articlePrefix}[a-z0-9-]+/?$`).test(url.pathname)?[url.href]:[];}catch{return [];}}))].slice(0,2);}
export function parseBuilderArticle(html,source,url,checkedAt){
 check(articleLinks(`<a href="${url}">`,source).includes(url));
 // These are verified publisher-specific HTML contracts, never executable DOM.
 const title=text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
 const description=text(html.match(/<meta\b[^>]*\bname="description"[^>]*\bcontent="([^"]*)"[^>]*>/i)?.[1]||'');
 let publishedAt;
 if(source.id==='litvm')publishedAt=date(text(html.match(/class="article-details"[^>]*>\s*<div[^>]*>([^<]+)<\/div>/)?.[1]||''));
 else if(source.id==='luxxfolio')publishedAt=date(text(html.match(/class="lxp-article-meta"[^>]*>\s*<time\b[^>]*>([^<]+)<\/time>/)?.[1]||''));
 // Foundation's direct index currently returns 403; do not guess its parser.
 check(title.length>0&&title.length<=300&&description.length>0&&description.length<=1200&&publishedAt&&publishedAt<=checkedAt.slice(0,10));
 return {id:sha(Buffer.from(url)).slice(0,20),publisher:source.publisher,title,description,publishedAt,checkedAt,url,classification:'Publisher announcement; claims attributed to publisher',limits:'Metadata excerpt only. Deployment, reserves, transaction totals and partnerships are not independently verified.'};
}
async function readPublic(url,fetchImpl){const response=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html'}});check(response.ok&&!response.redirected&&response.headers.get('content-type')?.includes('text/html')&&response.body);check(Number(response.headers.get('content-length')||0)<=600000);let length=0;const chunks=[];for await(const chunk of response.body){length+=chunk.byteLength;check(length<=600000);chunks.push(chunk);}return Buffer.concat(chunks);}
export async function collectBuilderNews({fetchImpl=fetch,now=()=>new Date().toISOString(),saveEvidence=async()=>{}}={}){
 const checkedAt=now(),sources=[];
 for(const source of SOURCES){const record={id:source.id,publisher:source.publisher,index:source.index,checkedAt,status:'unavailable',stories:[],gaps:[]};try{const index=await readPublic(source.index,fetchImpl);await saveEvidence(`${source.id}-index.html`,index);record.indexSha256=sha(index);const links=articleLinks(index.toString('utf8'),source);check(links.length);for(const [i,url]of links.entries()){try{const bytes=await readPublic(url,fetchImpl);await saveEvidence(`${source.id}-article-${i}.html`,bytes);record.stories.push({...parseBuilderArticle(bytes.toString('utf8'),source,url,checkedAt),sourceSha256:sha(bytes)});}catch{record.gaps.push('A linked publisher article was unavailable or did not match the accepted dated format.');}}if(record.stories.length)record.status='collected';else record.gaps.push('No dated publisher story accepted.');}catch{record.gaps.push('Publisher index unavailable or changed; no alternate source or access bypass used.');}sources.push(record);}
 return {schemaVersion:1,checkedAt,classification:'Bounded primary-publisher watch',sources,limits:['At most two index-linked articles per publisher. This is not a complete news or social feed.','Publication dates belong to publishers; retrieval time does not make an old announcement current.']};
}
export function validateBuilderNews(record,{now=record?.checkedAt}={}){
 check(record?.schemaVersion===1&&record.classification==='Bounded primary-publisher watch'&&Number.isFinite(Date.parse(record.checkedAt))&&Number.isFinite(Date.parse(now))&&Date.parse(record.checkedAt)<=Date.parse(now)&&Date.parse(now)-Date.parse(record.checkedAt)<=86400000&&Array.isArray(record.sources)&&record.sources.length===SOURCES.length);
 for(const source of SOURCES){const entry=record.sources.find(item=>item.id===source.id);check(entry&&entry.publisher===source.publisher&&entry.index===source.index&&entry.checkedAt===record.checkedAt&&['collected','unavailable'].includes(entry.status)&&Array.isArray(entry.stories)&&entry.stories.length<=2&&Array.isArray(entry.gaps)&&entry.gaps.every(g=>typeof g==='string'&&g.length<2000));check(entry.status==='collected'?entry.stories.length>0:entry.stories.length===0);for(const story of entry.stories){check(articleLinks(`<a href="${story.url}">`,source).includes(story.url)&&story.publisher===source.publisher&&story.checkedAt===entry.checkedAt&&/^[a-f0-9]{64}$/.test(story.sourceSha256)&&/^\d{4}-\d{2}-\d{2}$/.test(story.publishedAt)&&new Date(story.publishedAt).toISOString().slice(0,10)===story.publishedAt&&story.publishedAt<=entry.checkedAt.slice(0,10)&&typeof story.title==='string'&&story.title.length>0&&story.title.length<=300);}}
 return record;
}
async function main(){const args=process.argv.slice(2);check(args.length===4&&args[0]==='--output'&&args[2]==='--evidence-dir');await mkdir(args[3],{recursive:false,mode:0o700});const record=await collectBuilderNews({saveEvidence:(name,bytes)=>writeFile(path.join(args[3],name),bytes,{flag:'wx',mode:0o600})});await writeFile(args[1],JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({status:'collected-with-explicit-gaps',sources:record.sources.map(s=>({id:s.id,status:s.status,stories:s.stories.length})),published:false}));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('Builder news collection withheld');process.exitCode=1;});
