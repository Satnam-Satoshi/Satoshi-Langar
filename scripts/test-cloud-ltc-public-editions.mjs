import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,copyFile,access,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {publicEditions,publicationExclusions,excludedPublicationPath} from './lib/ltc-public-editions.mjs';
const root=path.resolve(import.meta.dirname,'..'),json=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
test('only the exact never-public record is excluded; immutable bytes and raw index remain intact',async()=>{
 const records=await json('content/ltc/index.json'),config=await json('config/ltc-publication-exclusions.json'),before=JSON.stringify(records),excluded=records.find(v=>v.id==='2026-10-31-r1');assert(excluded);
 const bytes=await readFile(path.join(root,'content/ltc/2026-10-31-r1.json'));assert.equal(createHash('sha256').update(bytes).digest('hex'),config.editions[0].editionSha256);
 const next={...excluded,id:'2026-11-01-r1',date:'2026-11-01'},laterRevision={...excluded,id:'2026-10-31-r2',revision:2},eligible=publicEditions([next,...records,laterRevision],config);
 assert.equal(eligible[0],next);assert(eligible.some(v=>v.id==='2026-10-30-r1'));assert(eligible.includes(laterRevision));assert(!eligible.includes(excluded));assert.equal(JSON.stringify(records),before);
 assert.equal(excludedPublicationPath('conversations/editions/2026-10-31-r1/index.html',config,eligible),true);assert.equal(excludedPublicationPath('data/ltc-editions/2026-10-31-r1.json',config,eligible),true);assert.equal(excludedPublicationPath('magazine/daily/2026-10-31-r1/social.png',config,eligible),true);assert.equal(excludedPublicationPath('conversations/editions/2026-10-31/index.html',config,eligible),false);assert.equal(excludedPublicationPath('conversations/editions/2026-11-01-r1/index.html',config,eligible),false);
 for(const change of [v=>v.schemaVersion=2,v=>v.editions.push({...v.editions[0]}),v=>v.editions[0].id='../arbitrary',v=>v.editions[0].editionSha256='bad']){const invalid=structuredClone(config);change(invalid);assert.throws(()=>publicationExclusions(invalid));}
});
test('public calendar and publication-update inputs omit the never-released day while accepting a fresh next day',async()=>{
 const code=`import {readFile} from 'node:fs/promises';import {publicEditions} from './scripts/lib/ltc-public-editions.mjs';import {publicationDays,publicationUpdates} from './app/data/edition-calendar.ts';const raw=JSON.parse(await readFile('content/ltc/index.json')),config=JSON.parse(await readFile('config/ltc-publication-exclusions.json'));const next={...raw[0],id:'2026-11-01-r1',date:'2026-11-01',publishedAt:'2026-11-01T12:00:00Z'};const visible=publicEditions([next,...raw],config);console.log(JSON.stringify({days:publicationDays(visible).map(v=>v.date),updates:publicationUpdates(visible).map(v=>v.id)}));`;
 const result=JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',code],{cwd:root,encoding:'utf8',maxBuffer:100000,stdio:['ignore','pipe','pipe']}));assert.equal(result.days[0],'2026-11-01');assert(!result.days.includes('2026-10-31'));assert(!result.updates.includes('2026-10-31-r1'));assert(result.updates.includes('2026-10-30-r1'));
});
test('actual portable exporter suppresses stale excluded routes/assets/downloads and emits filtered index/SEO without altering source',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ltc-public-editions-'));try{
  const save=async(file,bytes)=>{await mkdir(path.dirname(path.join(directory,file)),{recursive:true});await writeFile(path.join(directory,file),bytes);};
  for(const file of ['scripts/portable-export.mjs','scripts/lib/ltc-public-editions.mjs','scripts/lib/site-seo.mjs','scripts/lib/ltc-routine-data.mjs','scripts/lib/community-archive.mjs','scripts/lib/ltc-community.mjs','config/ltc-publication-exclusions.json','content/ltc/2026-10-31-r1.json','content/ltc/2026-10-30-r1.json','content/ltc-extras/2026-10-06-delorean-r1.json','content/ltc-extras/2026-10-06-delorean-r2.json'])await save(file,await readFile(path.join(root,file)));
  const old=await json('content/ltc/2026-10-30-r1.json'),excluded=await json('content/ltc/2026-10-31-r1.json'),next={...old,id:'2026-11-01-r1',date:'2026-11-01',publishedAt:'2026-11-01T12:00:00Z'};await save('content/ltc/2026-11-01-r1.json',JSON.stringify(next));const raw=JSON.stringify([next,excluded,old]);await save('content/ltc/index.json',raw);await save('LICENSE','fixture license');await save('NOTICE','fixture notice');await mkdir(path.join(directory,'content/ltc-community/archive'),{recursive:true});
  const html='<!doctype html><html><head><title>Fixture issue</title></head><body><h1>A dated source record</h1></body></html>';
  for(const route of ['index.html','conversations/index.html','conversations/editions/2026-10-31-r1/index.html','conversations/editions/2026-10-31/index.html','conversations/editions/2026-10-30-r1/index.html','conversations/editions/2026-10-30/index.html','conversations/editions/2026-11-01-r1/index.html','conversations/editions/2026-11-01/index.html'])await save('out/'+route,html);
  await save('out/magazine/daily/2026-10-31-r1/social.png','old unpromoted image');await save('out/data/ltc-editions/2026-10-31-r1.json','old leaked data');
  execFileSync(process.execPath,['scripts/portable-export.mjs'],{cwd:directory,encoding:'utf8',maxBuffer:100000,stdio:['ignore','pipe','pipe']});
  const exported=JSON.parse(await readFile(path.join(directory,'dist/data/ltc-editions/index.json')));assert.deepEqual(exported,[next,old]);assert.equal(await readFile(path.join(directory,'content/ltc/index.json'),'utf8'),raw);
  for(const file of ['conversations/editions/2026-10-31-r1/index.html','conversations/editions/2026-10-31/index.html','data/ltc-editions/2026-10-31-r1.json','magazine/daily/2026-10-31-r1/social.png'])await assert.rejects(access(path.join(directory,'dist',file)));
  await access(path.join(directory,'dist/conversations/editions/2026-11-01-r1/index.html'));await access(path.join(directory,'dist/data/ltc-editions/2026-10-30-r1.json'));const sitemap=await readFile(path.join(directory,'dist/sitemap-magazine.xml'),'utf8');assert(!sitemap.includes('2026-10-31'));assert(sitemap.includes('2026-11-01'));
 }finally{await rm(directory,{recursive:true,force:true});}
});
