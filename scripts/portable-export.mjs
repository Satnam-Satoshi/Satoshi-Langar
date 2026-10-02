import { readdir, readFile, mkdir, writeFile, rm, copyFile } from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve('out'), target = path.resolve('dist');
await rm(target, { recursive: true, force: true });
async function walk(directory) {
 for (const entry of await readdir(directory, {withFileTypes:true})) {
  const input=path.join(directory,entry.name), relative=path.relative(source,input), output=path.join(target,relative);
  if(entry.isDirectory()) { await walk(input); continue; }
  const publicExtras=['data/ltc-snapshot.json','data/community-auth.json','scripts/community.js','scripts/auth.js','scripts/learning.js','conversations/feed.xml'];
  if(!/\.(html|css|svg|png|jpg|jpeg|webp|ico|woff2?)$/.test(entry.name) && !publicExtras.includes(relative) && !/^toolkits\/[a-z0-9-]+\.(md|txt)$/.test(relative)) continue;
  await mkdir(path.dirname(output),{recursive:true});
  if(entry.name.endsWith('.html')) {
   let html=await readFile(input,'utf8');
   // Keep native static navigation. Only explicitly reviewed progressive enhancements ship.
   html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<link\b(?=[^>]*\bas="script")[^>]*>/gi,'');
   const scripts=[];
   if(/\bdata-community="/.test(html)) scripts.push('community');
   if(/\bdata-community-auth="/.test(html)) scripts.push('auth');
   if(/\bdata-learning-progress(?:=|\s|>)/.test(html)) scripts.push('learning');
   html=html.replace('</body>',scripts.map(name=>`<script src="/scripts/${name}.js" defer></script>`).join('')+'</body>');
   html=html.replace(/\b(href|src)="(\/[^"\s]*)"/g,(match,attribute,url)=>{
    if(url.startsWith('//')) return match;
    const parsed=new URL(url,'https://export.invalid');
    // Some IPFS gateways list nested directories instead of serving their index.
    const pathname=decodeURIComponent(parsed.pathname);
    const destination=pathname.endsWith('/')?path.join(pathname,'index.html'):pathname;
    const local=path.relative(path.dirname(input),path.join(source,destination))||'.';
    return `${attribute}="${local}${parsed.search}${parsed.hash}"`;
   });
   await writeFile(output,html);
  } else await copyFile(input,output);
 }
}
await walk(source);
await copyFile('LICENSE',path.join(target,'LICENSE.txt'));
await copyFile('NOTICE',path.join(target,'NOTICE.txt'));
console.log('Portable static release generated in dist/; allowlisted local enhancements, no application server.');
