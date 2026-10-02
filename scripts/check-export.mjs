import {readdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist'); let count=0; const failures=[];
const fileCache=new Map();
async function content(file){if(!fileCache.has(file))fileCache.set(file,await readFile(file,'utf8'));return fileCache.get(file);}
async function walk(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){await walk(file);continue;}
  if(!entry.name.endsWith('.html'))continue;
  count++; const html=await readFile(file,'utf8');
  if(/\bon\w+="|javascript:/i.test(html))failures.push(`${file}: inline executable content`);
  for(const [tag,attrs,body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   const src=attrs.match(/\bsrc="([^"]+)"/)?.[1];
   if(body.trim() || !src || !['community.js','auth.js','learning.js'].includes(path.basename(src)) || !path.resolve(path.dirname(file),src).startsWith(path.join(root,'scripts')+path.sep))failures.push(`${file}: script outside enhancement allowlist`);
  }
  for(const [tag] of html.matchAll(/<form\b[^>]*>/gi))if(!/data-plan-form/.test(tag)||/\baction=/.test(tag))failures.push(`${file}: unexpected network form`);
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
for(const route of ['index.html','join/index.html','welcome/index.html','sign-in/index.html','auth/callback/index.html','account-help/index.html','mission/index.html','langar/index.html','kalakar/index.html','crypto-kitty/index.html','agents/index.html','privacy/index.html','domain/index.html','ecosystem/index.html','sikh-bitcoin/index.html','meetups/index.html','donate/index.html','connect/index.html','roadmap/index.html','partners/index.html','technology/index.html','conversations/methodology/index.html','conversations/archive/index.html','conversations/feed.xml','data/community-auth.json'])await stat(path.join(root,route));
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`PASS: ${count} static pages; internal links/assets resolve; scripts allowlisted and no network forms; links remain inside a subpath or IPFS directory.`);
