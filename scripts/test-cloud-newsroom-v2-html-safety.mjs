import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectCloudNewsroomV2Html, MAX_INERT_HTML_BYTES } from './cloud-newsroom-v2-html-safety.mjs';
const doc=body=>'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Edition</title></head><body>'+body+'</body></html>';
const inspect=s=>inspectCloudNewsroomV2Html(Buffer.from(s));
test('strict static text, tables, lists and reviewed ordinary source links accepted',()=>{
 const s=doc('<main><h1>Fresh &amp; dated</h1><p>A <strong>source-led</strong> edition. <a href="https://litecoin.org/">Source</a></p><ul><li>One</li></ul><table><caption>Snapshot</caption><thead><tr><th scope="col">Value</th></tr></thead><tbody><tr><td>123</td></tr></tbody></table></main>');
 const result=inspect(s);assert.equal(result.status,'accepted-inert-subset');assert.equal(result.sanitized,false);assert.equal(result.resourceFetchesAllowed,false);assert.ok(Object.isFrozen(result));
});
test('active markup and fetch elements all hold',()=>{
 for(const s of ['<script>alert(1)</script>','<iframe src="https://litecoin.org/"></iframe>','<form></form>','<object></object>','<embed>','<base href="https://litecoin.org/">','<svg></svg>','<math></math>','<img src="https://litecoin.org/x.png">','<video></video>','<link rel="stylesheet" href="https://litecoin.org/x.css">','<p onclick="alert(1)">X</p>','<meta http-equiv="refresh" content="0">','<template><p>X</p></template>'])assert.equal(inspect(doc(s)).status,'hold',s);
});
test('all CSS rejected, including fetch, import, expression and escaped variants',()=>{
 for(const s of ['<style>p {color:red}</style>','<style>@import "x";</style>','<p style="background:url(https://litecoin.org/)">X</p>','<p style="width:expression(alert(1))">X</p>','<p style="background:u\\72l(x)">X</p>'])assert.equal(inspect(doc(s)).status,'hold');
});
test('URL and entity obfuscation, arbitrary hosts and active schemes hold',()=>{
 for(const href of ['javascript:alert(1)','data:text/html,hi','//litecoin.org/','https://evil.example/','https://litecoin.org@evil.example/','https://litecoin.org:443/','https://litecoin.org/&#x22;','jav&#97;script:alert(1)','https://litecoin.org/\nfoo','https://litecoin.org\\@evil.example/'])assert.equal(inspect(doc('<a href="'+href+'">X</a>')).status,'hold',href);
});
test('malformed, unfamiliar browser-repair constructs and attribute tricks hold',()=>{
 for(const s of ['<p title=x>X</p>','<p class="x">X</p>','<p/>','<P>X</P>','<!--x-->','<![CDATA[x]]>','<p><div>X</div></p>','<table><p>X</p></table>','<table><tr><td>X</td></tr></table>','<a href="https://litecoin.org/"><a href="https://litecoin.org/">X</a></a>','<p>&#60;script&#62;</p>','<p>&unknown;</p>','<p><em>X</p></em>','<a href="https://litecoin.org/" href="https://evil.example/">X</a>'])assert.equal(inspect(doc(s)).status,'hold',s);
});
test('invalid UTF8, BOM, bounds and incomplete documents hold',()=>{
 assert.equal(inspectCloudNewsroomV2Html(Uint8Array.from([0xc0,0xaf])).status,'hold');
 for(const s of ['\ufeff'+doc('<p>X</p>'),'<p>Fragment</p>',doc('<p>\0</p>'),doc('<p>X</p>')+'<html></html>'])assert.equal(inspect(s).status,'hold');
 assert.equal(inspectCloudNewsroomV2Html(Buffer.alloc(MAX_INERT_HTML_BYTES+1,65)).status,'hold');
});
