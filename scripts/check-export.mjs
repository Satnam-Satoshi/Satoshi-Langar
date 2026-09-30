import {readdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist'); let count=0; const failures=[];
async function walk(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){await walk(file);continue;}
  if(!entry.name.endsWith('.html'))continue;
  count++; const html=await readFile(file,'utf8');
  if(/<script\b|<form\b|<input\b/i.test(html))failures.push(`${file}: unexpected active content`);
  for(const [,attr,url] of html.matchAll(/\b(href|src)="([^"]+)"/g)){
   if(/^(https?:|mailto:|data:|#)/.test(url))continue;
   if (/^(bitcoin:|litecoin:)/.test(url)) { const allowed=['bitcoin:bc1q3qxtztzjp6wllmszv9fryp4rln8wt0er2xz8rx','litecoin:ltc1q78882zg99eedjnscxlv43we2r4exxua4e5c63j']; if(!allowed.includes(url))failures.push(`${file}: unapproved payment URI`); continue; }
   if(url.startsWith('/')){failures.push(`${file}: absolute local path ${url}`);continue;}
   const clean=decodeURIComponent(url.split(/[?#]/)[0]);
   let dest=path.resolve(path.dirname(file),clean);
   if(!dest.startsWith(root+path.sep)&&dest!==root){failures.push(`${file}: path escapes release ${url}`);continue;}
   try{const info=await stat(dest);if(info.isDirectory())failures.push(`${file}: directory link depends on gateway index serving ${url}`);}
   catch{failures.push(`${file}: broken ${attr} ${url}`);}
  }
 }
}
await walk(root);
for(const route of ['index.html','join/index.html','mission/index.html','langar/index.html','kalakar/index.html','crypto-kitty/index.html','agents/index.html','privacy/index.html','domain/index.html','ecosystem/index.html','sikh-bitcoin/index.html','meetups/index.html','donate/index.html','connect/index.html','roadmap/index.html','partners/index.html','technology/index.html','conversations/methodology/index.html'])await stat(path.join(root,route));
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`PASS: ${count} static pages; internal links/assets resolve; no scripts/forms; links remain inside a subpath or IPFS directory.`);
