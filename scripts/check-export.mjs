import {readCommunityArchive} from './lib/community-archive.mjs';
import {readdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {validateLtcArchive} from './validate-ltc-archive.mjs';
import {buildSeoSitemaps,validatePageSeo} from './lib/site-seo.mjs';
const editions=await validateLtcArchive();
const root=path.resolve('dist'); let count=0; const failures=[];
const seoPages=[]; const assetPaths=new Set();
async function listAssets(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await listAssets(file);else assetPaths.add(path.relative(root,file).split(path.sep).join('/'));}}
await listAssets(root);
const fileCache=new Map();
async function content(file){if(!fileCache.has(file))fileCache.set(file,await readFile(file,'utf8'));return fileCache.get(file);}
async function walk(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){await walk(file);continue;}
  if(!entry.name.endsWith('.html'))continue;
  count++; const html=await readFile(file,'utf8');
  const seo=validatePageSeo(html,path.relative(root,file).split(path.sep).join('/'),{editions,assetPaths});
  failures.push(...seo.failures.map(message=>`${file}: SEO ${message}`));
  if(seo.model)seoPages.push(seo.model);
  if(/\bon\w+="|javascript:/i.test(html))failures.push(`${file}: inline executable content`);
  for(const [tag,attrs,body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   // Only the exact controlled data block is exempt from executable-script rules;
   // validatePageSeo checks its keys, values, serialization and complete schema.
   if(/^\s+type="application\/ld\+json" data-site-seo="v1"\s*$/.test(attrs))continue;
   const src=attrs.match(/\bsrc="([^"]+)"/)?.[1];
   if(body.trim() || !src || !['community.js','auth.js','learning.js','copy-address.js','ecosystem-help.js'].includes(path.basename(src)) || !path.resolve(path.dirname(file),src).startsWith(path.join(root,'scripts')+path.sep))failures.push(`${file}: script outside enhancement allowlist`);
   if(src && path.basename(src)==='copy-address.js' && !/\bdata-address-copy(?:=|\s|>)/.test(html))failures.push(`${file}: address-copy script without its scoped marker`);
   if(src && path.basename(src)==='ecosystem-help.js' && !/\bdata-ecosystem-help(?:=|\s|>)/.test(html))failures.push(`${file}: ecosystem-help script without its scoped marker`);
  }
  if(/\bdata-ecosystem-help(?:=|\s|>)/.test(html) && !/<script\b[^>]*src="[^"]*\/ecosystem-help\.js"/.test(html))failures.push(`${file}: community guide is missing its browser enhancement`);
  for(const [tag] of html.matchAll(/<form\b[^>]*>/gi))if(!/\bdata-(?:plan|guide)-form(?:=|\s|>)/.test(tag)||/\baction=/.test(tag)||(/\bdata-guide-form(?:=|\s|>)/.test(tag)&&!/\bhidden(?:=|\s|>)/.test(tag)))failures.push(`${file}: unexpected network form`);
  for(const [,attr,url] of html.matchAll(/\b(href|src)="([^"]+)"/g)){
   if(/^(https?:|mailto:|data:)/.test(url))continue;
   if (/^(bitcoin:|litecoin:)/.test(url)) { const allowed=['bitcoin:bc1q3qxtztzjp6wllmszv9fryp4rln8wt0er2xz8rx','litecoin:ltc1q78882zg99eedjnscxlv43we2r4exxua4e5c63j']; if(!allowed.includes(url))failures.push(`${file}: unapproved payment URI`); continue; }
   if(url.startsWith('/')){failures.push(`${file}: absolute local path ${url}`);continue;}
   const clean=decodeURIComponent(url.replaceAll('&amp;','&').split(/[?#]/)[0]);
   let dest=clean?path.resolve(path.dirname(file),clean):file;
   if(!dest.startsWith(root+path.sep)&&dest!==root){failures.push(`${file}: path escapes release ${url}`);continue;}
   try{const info=await stat(dest);if(info.isDirectory())failures.push(`${file}: directory link depends on gateway index serving ${url}`);
    const fragment=url.split('#')[1];
    if(fragment && dest.endsWith('.html')){const ids=[...(await content(dest)).matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);if(!ids.includes(decodeURIComponent(fragment)))failures.push(`${file}: missing target anchor ${url}`);}
   }
   catch{failures.push(`${file}: broken ${attr} ${url}`);}
  }
 }
}
await walk(root);
for(const [name,expected] of Object.entries(buildSeoSitemaps(seoPages))){
 try{if(await readFile(path.join(root,name),'utf8')!==expected)failures.push(`${name}: differs from canonical indexed-page policy`);}catch{failures.push(`${name}: missing canonical discovery file`);}
}
for (const record of readCommunityArchive('content/ltc-community/archive')) {
 const exported=await readFile(path.join(root,`data/ltc-community/${record.id}.json`));
 const original=await readFile(`content/ltc-community/archive/${record.id}.json`);
 if(!exported.equals(original)) failures.push(`Community record differs from archive: ${record.id}`);
 await stat(path.join(root,`conversations/community/records/${record.id}/index.html`));
}
await stat(path.join(root,'conversations/community/index.html'));
const exportedIndex=JSON.parse(await readFile(path.join(root,'data/ltc-editions/index.json'),'utf8'));
if(JSON.stringify(exportedIndex)!==JSON.stringify(editions)) failures.push('Exported edition index differs from validated archive');
const rss=await readFile(path.join(root,'conversations/feed.xml'),'utf8');
const dailyRss=await readFile(path.join(root,'conversations/daily.xml'),'utf8');
const expectedDailyIds=[...editions].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||b.date.localeCompare(a.date)||b.revision-a.revision).map(edition=>`ltc:edition:${edition.id}`);
const dailyIds=[...dailyRss.matchAll(/<guid isPermaLink="false">([^<]+)<\/guid>/g)].map(match=>match[1]);
if(JSON.stringify(dailyIds)!==JSON.stringify(expectedDailyIds))failures.push('Daily feed must contain only daily edition publication events in publication order');
if(!dailyRss.includes('href="https://ltcmagazine.org/conversations/daily.xml"')||dailyRss.includes('ltc:feature:'))failures.push('Daily feed has an invalid canonical URL or editorial preview');
for(const [,item] of dailyRss.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
 const id=item.match(/<guid isPermaLink="false">ltc:edition:([^<]+)<\/guid>/)?.[1];
 const edition=editions.find(record=>record.id===id);
 const asset=edition?.presentation?.artDirection?.coverAsset;
 const enclosure=item.match(/<enclosure url="([^"]+)" length="(\d+)" type="([^"]+)"\/>/);
 if(asset){
  const info=await stat(path.join(root,'magazine',asset));
  const mime={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'}[path.extname(asset).toLowerCase()];
  if(!enclosure||enclosure[1]!==`https://ltcmagazine.org/magazine/${asset}`||Number(enclosure[2])!==info.size||enclosure[3]!==mime)failures.push(`Daily feed cover differs from saved edition: ${id}`);
 } else if(enclosure)failures.push(`Daily feed invented a cover for ${id}`);
}
for(const edition of editions) {
 const route=`conversations/editions/${edition.id}/index.html`;
 await stat(path.join(root,route));
 const download=JSON.parse(await readFile(path.join(root,`data/ltc-editions/${edition.id}.json`),'utf8'));
 if(JSON.stringify(download)!==JSON.stringify(edition)) failures.push(`Edition download differs from archive: ${edition.id}`);
 if(!rss.includes(`/conversations/editions/${edition.id}/`)) failures.push(`Edition missing from RSS: ${edition.id}`);
}
for(const date of new Set(editions.map(item=>item.date))) {
 await stat(path.join(root,`conversations/editions/${date}/index.html`));
 await stat(path.join(root,`conversations/archive/${date.slice(0,7)}/index.html`));
}
for(const name of ['sitemap.xml','robots.txt','conversations/about/index.html']) await stat(path.join(root,name));
for(const route of ['index.html','join/index.html','welcome/index.html','sign-in/index.html','auth/callback/index.html','account-help/index.html','mission/index.html','langar/index.html','kalakar/index.html','crypto-kitty/index.html','agents/index.html','privacy/index.html','domain/index.html','ecosystem/index.html','sikh-bitcoin/index.html','meetups/index.html','donate/index.html','connect/index.html','roadmap/index.html','partners/index.html','technology/index.html','conversations/methodology/index.html','conversations/archive/index.html','conversations/feed.xml','data/community-auth.json'])await stat(path.join(root,route));
const birthday=JSON.parse(await readFile('content/specials/proof-of-birthday-r3.json','utf8'));
await stat(path.join(root,birthday.pdf));
for(const archive of ['conversations/archive/index.html',`conversations/archive/${birthday.preparedAt.slice(0,7)}/index.html`]){
 const html=await content(path.join(root,archive));
 if(!html.includes(`data-special-edition="${birthday.id}"`)||!html.includes('Proof of Birthday'))failures.push(`Reviewed special missing from past issues: ${archive}`);
}
try{await stat(path.join(root,'magazine/proof-of-birthday/Proof-of-Birthday-LTC-84-pages-r2.pdf'));failures.push('Superseded birthday PDF is still in public export');}catch(error){if(error.code!=='ENOENT')throw error;}
const retired=path.join(root,'magazine/litecoin-15/Litecoin-at-15-84-page-advance-edition.pdf');
try{await stat(retired);failures.push('Retired special PDF is still in public export');}catch(error){if(error.code!=='ENOENT')throw error;}
for(let p=1;p<=84;p++) {
 const html=await content(path.join(root,`conversations/specials/proof-of-birthday/${p}/index.html`));
 if(!html.includes(`data-birthday-page="${p}"`))failures.push(`Missing birthday page ${p}`);
 if(/human.{0,20}review.{0,20}pending/i.test(html))failures.push(`Outdated review label on birthday page ${p}`);
 if(!/founder reviewed October 4, 2026/i.test(html))failures.push(`Missing founder review on birthday page ${p}`);
 const prior=await content(path.join(root,`conversations/specials/litecoin-at-15/${p}/index.html`));
 if(!prior.includes('http-equiv="refresh"')||prior.includes('An open network.'))failures.push(`Old special remains publicly readable: ${p}`);
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`PASS: ${count} static pages; internal links/assets resolve; scripts allowlisted and no network forms; links remain inside a subpath or IPFS directory.`);
