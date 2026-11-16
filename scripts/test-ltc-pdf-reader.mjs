import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseVerifiedPdfReader,readVerifiedPdfReader} from './lib/ltc-pdf-reader.mjs';
import {validatePdfRegistry,appendPdfIssue,findPdfIssue} from './lib/ltc-pdf-registry.mjs';
const registry=JSON.parse(await readFile('content/ltc-pdf/issues.json','utf8'));
const wrap=body=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Research reader</title></head><body>${body}</body></html>`;
const body='<main><h1>A source-led day</h1><p>Evidence &amp; context. <a href="https://litecoin.com/">Primary source</a></p><table><caption>Dated observations</caption><thead><tr><th scope="col">Metric</th><th scope="col">Value</th></tr></thead><tbody><tr><th scope="row">Illustration</th><td>42</td></tr></tbody></table><p>&lt;script&gt; is quoted text, not markup.</p></main>';
const bytes=Buffer.from(wrap(body));
const descriptor=(b=bytes)=>({path:'/magazine/daily/2026-11-17/r1/reader.html',bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});
test('actual hash-bound inert body becomes typed nodes; head never renders',()=>{const doc=parseVerifiedPdfReader(bytes,descriptor());assert.equal(doc.profile,'ltc-inert-html-v1');assert.equal(doc.nodes[0].tag,'main');const serialized=JSON.stringify(doc);assert.ok(!serialized.includes('Research reader'));assert.ok(serialized.includes('<script> is quoted text'));assert.ok(Object.isFrozen(doc.nodes));});
test('bad bytes and active or styled HTML fail even when their declared hash matches',()=>{assert.throws(()=>parseVerifiedPdfReader(Buffer.from('changed'),descriptor()),/identity/);for(const bad of ['<script>alert(1)</script>','<style>p{display:none}</style>','<img src="https://litecoin.com/x.png">','<form><p>Input</p></form>','<p style="color:red">Text</p>','<a href="javascript:alert(1)">Click</a>','<svg><script>bad</script></svg>','<p onclick="bad">Click</p>']){const b=Buffer.from(wrap(bad));assert.throws(()=>parseVerifiedPdfReader(b,descriptor(b)),/inert-profile/);}});
test('tables require a caption and explicit scoped headers',()=>{for(const bad of ['<table><tbody><tr><td>1</td></tr></tbody></table>','<table><caption>Data</caption><tbody><tr><th>Name</th></tr></tbody></table>','<table><caption>Data</caption><tbody><tr><td>1</td></tr></tbody></table>']){const b=Buffer.from(wrap(bad));assert.throws(()=>parseVerifiedPdfReader(b,descriptor(b)),/reader-table/);}});
test('optional reader supports a future data-only issue while historical records remain byte-equivalent',()=>{const original=structuredClone(registry.issues),next={...registry.issues[1],id:'2026-11-17-r1',date:'2026-11-17',preparedDate:'2026-11-17',sha256:'b'.repeat(64),pdf:'/magazine/daily/2026-11-17/r1/edition.pdf',cover:'/magazine/daily/2026-11-17/r1/cover.png',reader:descriptor()};const updated=appendPdfIssue(registry,next);assert.deepEqual(original,registry.issues);assert.deepEqual(findPdfIssue(updated,'2026-11-16'),findPdfIssue(registry,'2026-11-16'));assert.deepEqual(findPdfIssue(updated,'2026-11-17').reader,descriptor());for(const reader of [{...descriptor(),path:'/elsewhere.html'},{...descriptor(),bytes:0},{...descriptor(),style:'x'}])assert.throws(()=>validatePdfRegistry({...updated,issues:updated.issues.map(issue=>issue.id===next.id?{...issue,reader}:issue)}));});
test('future full reader renders reviewed theme, accessible table and safe escaped text',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'ltc-themed-reader-'));const previous=process.cwd();
 try{
  const file=path.join(root,'public',descriptor().path.slice(1));await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes);
  assert.deepEqual(readVerifiedPdfReader(descriptor(),path.join(root,'public')),parseVerifiedPdfReader(bytes,descriptor()));
  const bundled=await build({entryPoints:['app/components/LtcTrustedReader.tsx'],bundle:true,platform:'node',format:'cjs',target:'node22',packages:'external',loader:{'.css':'empty','.module.css':'empty'},write:false,logLevel:'silent'});
  const mod={exports:{}};new Function('require','module','exports',bundled.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
  process.chdir(root);
  const markup=renderToStaticMarkup(React.createElement(mod.exports.default,{issue:{...registry.issues[1],reader:descriptor()}}));
  assert.ok(markup.includes('data-trusted-daily-reader="ltc-inert-html-v1"'));assert.ok(markup.includes('Read beyond'));assert.ok(markup.includes('<caption>Dated observations</caption>'));assert.ok(markup.includes('scope="col"'));assert.ok(markup.includes('tabindex="0"'));assert.ok(markup.includes('https://litecoin.com/'));assert.ok(markup.includes('&lt;script&gt; is quoted text'));assert.ok(!markup.includes('<script'));assert.ok(!markup.includes('Research reader'));assert.ok(!markup.includes('<main>'));assert.ok(!markup.includes('reader.html'));
  await writeFile(file,Buffer.from(wrap('<script>bad</script>')));assert.throws(()=>renderToStaticMarkup(React.createElement(mod.exports.default,{issue:{...registry.issues[1],reader:descriptor()}})),/identity/);
 }finally{process.chdir(previous);await rm(root,{recursive:true,force:true});}
});
