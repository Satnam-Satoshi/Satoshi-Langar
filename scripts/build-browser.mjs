import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {validateAuthConfig} from './community-core.mjs';
await mkdir('public/scripts',{recursive:true});
await mkdir('public/data',{recursive:true});
const enabled=process.env.COMMUNITY_AUTH_ENABLED==='true';
const config=validateAuthConfig({enabled,url:process.env.COMMUNITY_AUTH_URL,publishableKey:process.env.COMMUNITY_AUTH_PUBLISHABLE_KEY,siteOrigin:process.env.COMMUNITY_SITE_ORIGIN,privacyEmail:process.env.COMMUNITY_PRIVACY_EMAIL,providers:(process.env.COMMUNITY_AUTH_PROVIDERS||'').split(',').filter(Boolean)});
if(config.enabled){
 const vercel=JSON.parse(await readFile('vercel.json','utf8'));
 const csp=vercel.headers?.flatMap(rule=>rule.headers).find(header=>header.key==='Content-Security-Policy')?.value||'';
 const origins=csp.match(/(?:^|;)\s*connect-src ([^;]+)/)?.[1].split(/\s+/)||[];
 if(!origins.includes(config.url))throw new Error('Add the exact configured authentication origin to connect-src before enabling accounts.');
}
await writeFile('public/data/community-auth.json',JSON.stringify(config,null,2)+'\n');
await build({entryPoints:['scripts/browser/community.mjs','scripts/browser/auth.mjs'],outdir:'public/scripts',bundle:true,minify:true,format:'iife',platform:'browser',target:['safari16','chrome110'],logLevel:'warning'});
console.log(`Browser enhancements built; community auth ${config.enabled?'configured':'inactive'}.`);
