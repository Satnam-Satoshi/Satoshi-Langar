import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createCloudNewsroomV2HttpQa,createCloudNewsroomV2FetchTransport} from './cloud-newsroom-v2-http-qa.mjs';
const encode=s=>new TextEncoder().encode(s),hash=b=>createHash('sha256').update(b).digest('hex');
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
function fixture(){
 const pdf=encode('%PDF-1.7\nSynthetic unit test only\n%%EOF'),reader=encode('<!doctype html><html><head><title>Unit test</title></head><body><h1>Test</h1></body></html>'),identity={editionId:'ltc-daily-2026-11-17',revision:1};
 const artifacts=['pdf','html','cover','promo'].map(role=>({...identity,role,path:`artifacts/2026-11-17/r1/${role}`,mimeType:role==='pdf'?'application/pdf':role==='html'?'text/html':'image/png',sha256:hash(role==='pdf'?pdf:role==='html'?reader:png),bytes:(role==='pdf'?pdf:role==='html'?reader:png).length,verification:'actual-local-file-bytes',...(role==='html'?{htmlSafety:{status:'accepted-inert-subset',profile:'ltc-inert-html-v1',sanitized:false,resourceFetchesAllowed:false}}:{})}));
 const publication={registryId:'2026-11-17-r1',page:'/conversations/editions/2026-11-17/',canonicalUrl:'https://ltcmagazine.org/conversations/editions/2026-11-17/',title:'Research & evidence'};
 const receipt={status:'accepted-receipt',errors:[],validation:{status:'validated-description',manifest:{...identity,editionDate:'2026-11-17',kind:'daily',generation:'cloud-newsroom-v2',artifacts}},publication,artifacts};
 const trustedPlan={deploymentId:'dpl_test',sourceCommit:'a'.repeat(40),artifactSha256:hash(pdf),pdfSha256:hash(pdf),artifactSha256Kind:'pdf-bytes-sha256',projectId:'prj_test',previewHostname:'approved-build.vercel.app',domains:['ltcmagazine.org','satnamsatoshi.com'],receipt,criticalRoutes:[{path:'/',markers:['<h1>Home</h1>']},{path:'/conversations/archive/',markers:['<h1>Archive</h1>']}]};
 const edition=encode('<!doctype html><html><head><link rel="canonical" href="'+publication.canonicalUrl+'"/></head><body><h1>Research &amp; evidence</h1><time dateTime="2026-11-17">Nov17</time><a href="/magazine/daily/2026-11-17/r1/edition.pdf">PDF</a><article data-trusted-daily-reader="ltc-inert-html-v1"><h2 id="reader-2026-11-17-r1">Reader</h2></article></body></html>');
 const calls=[],bodies=new Map([['/magazine/daily/2026-11-17/r1/cover.png',png],['/magazine/daily/2026-11-17/r1/promo.png',png],['/magazine/daily/2026-11-17/r1/edition.pdf',pdf],['/magazine/daily/2026-11-17/r1/reader.html',reader],[publication.page,edition],['/',encode('<!doctype html><html><body><h1>Home</h1></body></html>')],['/conversations/archive/',encode('<!doctype html><html><body><h1>Archive</h1></body></html>')]]);
 const transport={read:async({url,maxBytes})=>{calls.push({url,maxBytes});const u=new URL(url),body=bodies.get(u.pathname);return {status:200,url,body,headers:{'content-type':u.pathname.endsWith('.pdf')?'application/pdf':u.pathname.endsWith('.png')?'image/png':u.pathname.endsWith('.jpg')?'image/jpeg':u.pathname.endsWith('.webp')?'image/webp':'text/html','content-length':String(body.length)}};}};
 const request={deploymentId:trustedPlan.deploymentId,sourceCommit:trustedPlan.sourceCommit,artifactSha256:trustedPlan.artifactSha256,pdfSha256:trustedPlan.pdfSha256,projectId:trustedPlan.projectId};
 return {trustedPlan,transport,clock:()=> '2026-11-17T12:00:00Z',request,calls,bodies};
}
test('preview reads exact approved host PDF/reader/edition/critical routes, bound expiring proof',async()=>{const x=fixture(),qa=createCloudNewsroomV2HttpQa(x),proof=await qa.verify(x.request);assert.equal(proof.passed,true);assert.equal(proof.pdfSha256,x.trustedPlan.pdfSha256);assert.equal(proof.artifactSha256Kind,'pdf-bytes-sha256');assert.equal(proof.sourceCommit,x.request.sourceCommit);assert.equal(proof.expiresAt,'2026-11-17T12:01:00.000Z');assert.equal(x.calls.length,7);assert.ok(x.calls.every(c=>new URL(c.url).hostname===x.trustedPlan.previewHostname));assert.deepEqual(proof.effects,[]);assert.ok(Object.isFrozen(proof));});
test('public QA actually checks PDF and edition on both exact domains',async()=>{const x=fixture(),proof=await createCloudNewsroomV2HttpQa(x).verifyPublic({...x.request,domains:x.trustedPlan.domains,editionDate:'2026-11-17'});assert.equal(proof.passed,true);assert.equal(x.calls.length,14);assert.deepEqual(proof.domainObservations.map(o=>o.domain),x.trustedPlan.domains);assert.ok(proof.domainObservations.every(o=>o.pdfBytesPassed&&o.readerBytesPassed&&o.coverBytesPassed&&o.promoBytesPassed&&o.routesPassed));assert.deepEqual(new Set(x.calls.map(c=>new URL(c.url).hostname)),new Set(x.trustedPlan.domains));});
test('foreign preview host, generic artifact digest, receipt hash and identity fail before reads',async()=>{for(const alter of [p=>p.previewHostname='evil.vercel.app.attacker.test',p=>p.pdfSha256='f'.repeat(64),p=>p.artifactSha256='b'.repeat(64),p=>p.receipt.artifacts[0].verification='claimed',p=>p.domains=['ltcmagazine.org','ltcmagazine.org']]){const x=fixture();alter(x.trustedPlan);assert.throws(()=>createCloudNewsroomV2HttpQa(x));assert.equal(x.calls.length,0);}const x=fixture();assert.equal((await createCloudNewsroomV2HttpQa(x).verify({...x.request,sourceCommit:'b'.repeat(40)})).passed,false);assert.equal(x.calls.length,0);});
test('redirects, foreign final URL, strings, oversize, partial status, HTML-instead-PDF fail',async()=>{for(const alter of [r=>r.status=302,r=>r.url='https://evil.test/',r=>r.redirected=true,r=>r.body='not bytes',r=>r.body=new Uint8Array(999999),r=>r.status=206,r=>r.headers.location=r.url,r=>r.headers['content-length']='999',r=>r.headers['content-type']='text/html',r=>r.body=encode('<html>login</html>')]){const x=fixture(),read=x.transport.read;x.transport.read=async q=>{const r=await read(q);alter(r);return r;};assert.equal((await createCloudNewsroomV2HttpQa(x).verify(x.request)).passed,false);}});
test('PDF and reader hash tampering, missing edition markers and missing critical route fail',async()=>{for(const path of ['/magazine/daily/2026-11-17/r1/edition.pdf','/magazine/daily/2026-11-17/r1/reader.html','/conversations/editions/2026-11-17/','/conversations/archive/']){const x=fixture();x.bodies.set(path,encode('<!doctype html><html><body>Wrong content</body></html>'));assert.equal((await createCloudNewsroomV2HttpQa(x).verify(x.request)).passed,false);}const x=fixture(),p=x.trustedPlan.receipt.publication.page;const text=new TextDecoder().decode(x.bodies.get(p));x.bodies.set(p,encode(text.replace('<h1>Research &amp; evidence</h1>','<!--<h1>Research &amp; evidence</h1>-->')));assert.equal((await createCloudNewsroomV2HttpQa(x).verify(x.request)).passed,false);});
test('public mismatch or failure on second domain cannot produce successful public proof',async()=>{const x=fixture(),qa=createCloudNewsroomV2HttpQa(x);assert.equal((await qa.verifyPublic({...x.request,domains:['ltcmagazine.org','foreign.test'],editionDate:'2026-11-17'})).passed,false);assert.equal(x.calls.length,0);const read=x.transport.read;x.transport.read=async q=>{if(q.url.includes('satnamsatoshi.com'))throw Error('second domain unavailable');return read(q);};assert.equal((await qa.verifyPublic({...x.request,domains:x.trustedPlan.domains,editionDate:'2026-11-17'})).passed,false);});
test('expired, reversed or invalid clock cannot issue proof; trusted plan is snapshotted',async()=>{for(const end of ['2026-11-17T12:02:00Z','2026-11-17T11:59:00Z','invalid']){const x=fixture();let calls=0;x.clock=()=>calls++===0?'2026-11-17T12:00:00Z':end;assert.equal((await createCloudNewsroomV2HttpQa(x).verify(x.request)).passed,false);}const x=fixture(),qa=createCloudNewsroomV2HttpQa(x);x.trustedPlan.previewHostname='changed.vercel.app';assert.equal((await qa.verify(x.request)).passed,true);assert.ok(x.calls.every(c=>c.url.startsWith('https://approved-build.vercel.app/')));});

test('real React full edition SSR passes markers and transport requests identity/no redirects',async()=>{
 const x=fixture(),root=await mkdtemp(path.join(os.tmpdir(),'ltc-http-ssr-')),previous=process.cwd();
 try{
  const readerPath='/magazine/daily/2026-11-17/r1/reader.html',reader=x.bodies.get(readerPath),a=x.trustedPlan.receipt.artifacts.find(a=>a.role==='html');
  const target=path.join(root,'public',readerPath);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,reader);
  const bundled=await build({entryPoints:['app/components/LtcPdfIssue.tsx'],bundle:true,platform:'node',format:'cjs',target:'node22',packages:'external',loader:{'.css':'empty','.module.css':'empty'},write:false,logLevel:'silent'});
  const mod={exports:{}};new Function('require','module','exports',bundled.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
  process.chdir(root);
  const issue={id:'2026-11-17-r1',date:'2026-11-17',revision:1,title:'Research & evidence',dek:'Synthetic SSR fixture.',preparedDate:'2026-11-17',pdf:'/magazine/daily/2026-11-17/r1/edition.pdf',cover:'/magazine/daily/2026-11-17/r1/cover.png',coverWidth:1080,coverHeight:1350,pages:29,size:'1KB',page:x.trustedPlan.receipt.publication.page,reader:{path:readerPath,sha256:a.sha256,bytes:a.bytes},correction:null};
  const markup=renderToStaticMarkup(React.createElement(mod.exports.default,{issue,full:true}));
  assert.ok(markup.includes('<time dateTime="2026-11-17">'));assert.ok(markup.includes('data-trusted-daily-reader="ltc-inert-html-v1"'));
  x.bodies.set(issue.page,encode('<!doctype html><html><head><link rel="canonical" href="'+x.trustedPlan.receipt.publication.canonicalUrl+'"/></head><body>'+markup+'</body></html>'));
  const read=x.transport.read;x.transport.read=async request=>{assert.deepEqual(request.headers,{'Accept-Encoding':'identity'});assert.equal(request.redirect,'error');return read(request);};
  assert.equal((await createCloudNewsroomV2HttpQa(x).verify(x.request)).passed,true);
 }finally{process.chdir(previous);await rm(root,{recursive:true,force:true});}
});

function fetchFixture(overrides={}){
 const calls=[],bytes=encode('actual bytes');
 const fetchImpl=async(url,options)=>{calls.push({url,options});return {url,status:200,redirected:false,headers:new Headers({'content-type':'text/html','content-length':String(bytes.length)}),body:new ReadableStream({start(c){c.enqueue(bytes);c.close();}}),...overrides};};
 return {calls,bytes,fetchImpl,previewHostname:'approved-build.vercel.app',domains:['ltcmagazine.org','satnamsatoshi.com']};
}
const readRequest=host=>({url:'https://'+host+'/',maxBytes:100,headers:{'Accept-Encoding':'identity'},redirect:'error'});
test('native transport sends supplied credentials only to exact preview, public never inherits them',async()=>{
 const x=fetchFixture(),transport=createCloudNewsroomV2FetchTransport({...x,previewHeaders:{'x-vercel-protection-bypass':'TEST-SECRET'}});
 for(const host of [x.previewHostname,...x.domains])assert.deepEqual((await transport.read(readRequest(host))).body,x.bytes);
 assert.equal(x.calls[0].options.headers['x-vercel-protection-bypass'],'TEST-SECRET');
 for(const call of x.calls.slice(1)){assert.deepEqual(call.options.headers,{'Accept-Encoding':'identity'});assert.equal(call.options.credentials,'omit');assert.equal(call.options.redirect,'error');}
 assert.equal(JSON.stringify(transport),'{}');
});
test('native transport rejects foreign hosts/redirects/encoding/truncated/oversize streams',async()=>{
 const x=fetchFixture(),transport=createCloudNewsroomV2FetchTransport(x);for(const host of ['evil.test','approved-build.vercel.app.evil.test'])await assert.rejects(()=>transport.read(readRequest(host)),/scope/);assert.equal(x.calls.length,0);
 for(const overrides of [{url:'https://evil.test/'},{redirected:true},{headers:new Headers({'content-encoding':'gzip'})},{headers:new Headers({'content-length':'99'})},{headers:new Headers({'content-length':'1000'})},{headers:new Headers(),body:new ReadableStream({start(c){c.enqueue(new Uint8Array(101));c.close();}})}]){
  const f=fetchFixture(overrides);await assert.rejects(()=>createCloudNewsroomV2FetchTransport(f).read(readRequest(f.previewHostname)),/transport-/);
 }
});
test('native transport timeout is bounded and arbitrary credential/routing headers rejected',async()=>{
 const x=fetchFixture();await assert.rejects(()=>createCloudNewsroomV2FetchTransport({...x,timeoutMs:5,fetchImpl:()=>new Promise(()=>{})}).read(readRequest(x.previewHostname)),/timeout/);
 assert.throws(()=>createCloudNewsroomV2FetchTransport({...x,previewHeaders:{Host:'evil.test'}}),/headers/);
 assert.throws(()=>createCloudNewsroomV2FetchTransport({...x,previewHeaders:{authorization:'test\r\ninjected'}}),/headers/);
});

test('cover and promo actual bytes/size/MIME must pass on preview and both public domains',async()=>{
 for(const role of ['cover','promo'])for(const phase of ['preview','public'])for(const defect of ['bytes','size','mime','missing']){
  const x=fixture(),imagePath=`/magazine/daily/2026-11-17/r1/${role}.png`,read=x.transport.read;
  x.transport.read=async request=>{const response=await read(request);if(new URL(request.url).pathname===imagePath&&(phase==='preview'||new URL(request.url).hostname==='satnamsatoshi.com')){
   if(defect==='bytes'){response.body=response.body.slice();response.body[40]^=1;}
   if(defect==='size'){response.body=response.body.slice(0,-1);response.headers['content-length']=String(response.body.length);}
   if(defect==='mime')response.headers['content-type']='text/html';if(defect==='missing')response.status=404;
  }return response;};
  const qa=createCloudNewsroomV2HttpQa(x),proof=phase==='preview'?await qa.verify(x.request):await qa.verifyPublic({...x.request,domains:x.trustedPlan.domains,editionDate:'2026-11-17'});assert.equal(proof.passed,false,`${role}/${phase}/${defect}`);
 }
});
test('promo MIME determines immutable PNG/JPEG/WebP destination; unsupported cover/promo held',async()=>{
 const jpeg=new Uint8Array([255,216,255,224,0,0,255,217]);
 const webp=new Uint8Array(20);webp.set(encode('RIFF'));new DataView(webp.buffer).setUint32(4,12,true);webp.set(encode('WEBP'),8);
 for(const [mime,extension,bytes]of [['image/jpeg','jpg',jpeg],['image/webp','webp',webp]]){
  const x=fixture(),a=x.trustedPlan.receipt.artifacts.find(a=>a.role==='promo');Object.assign(a,{mimeType:mime,sha256:hash(bytes),bytes:bytes.length});
  x.bodies.delete('/magazine/daily/2026-11-17/r1/promo.png');x.bodies.set(`/magazine/daily/2026-11-17/r1/promo.${extension}`,bytes);
  assert.equal((await createCloudNewsroomV2HttpQa(x).verify(x.request)).passed,true);assert.ok(x.calls.some(c=>c.url.endsWith(`/promo.${extension}`)));
 }
 for(const role of ['cover','promo']){const x=fixture();x.trustedPlan.receipt.artifacts.find(a=>a.role===role).mimeType='image/svg+xml';assert.throws(()=>createCloudNewsroomV2HttpQa(x),/image-mime/);}
});
