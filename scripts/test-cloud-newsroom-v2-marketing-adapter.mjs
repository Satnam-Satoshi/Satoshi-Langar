import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {inspectMarketingPng,planCloudNewsroomV2MarketingAssets as plan} from './cloud-newsroom-v2-marketing-assets.mjs';
import {prepareV2StoryCovers as prepare,bindRenderedV2Assets as bind,rendererInputSha256} from './cloud-newsroom-v2-marketing-adapter.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;};
const concat=(...arrays)=>{const output=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let at=0;for(const a of arrays){output.set(a,at);at+=a.length;}return output;};
function chunk(name,data){const b=new Uint8Array(data.length+12),v=new DataView(b.buffer);v.setUint32(0,data.length);b.set(new TextEncoder().encode(name),4);b.set(data,8);v.setUint32(b.length-4,crc32(b.subarray(4,b.length-4)));return b;}
function png(width=1080,height=1350){const header=new Uint8Array(13),v=new DataView(header.buffer);v.setUint32(0,width);v.setUint32(4,height);header[8]=8;header[9]=6;return concat(new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(new Uint8Array((width*4+1)*height))),chunk('IEND',new Uint8Array()));}
const image=png();
function fixture(){
 const html=new TextEncoder().encode('<!doctype html><html><head><title>Fixture</title></head><body><main><section><h2>Native</h2><p>Synthetic only.</p></section><section><h2>Builders</h2><p>Synthetic only.</p></section><section><h2>Institutions</h2><p>Synthetic only.</p></section></main></body></html>');
 const trustedOutline=[0,1,2].map(i=>({fragment:`story-2026-11-17-r1-0-${i}`,nodePath:`0.${i}`,contentSha256:hash('synthetic-story-'+i),readerSha256:hash(html)}));
 const identity={editionId:'ltc-daily-2026-11-17',revision:1};
 const artifacts=['pdf','html','cover','promo'].map(role=>({...identity,role,mimeType:role==='pdf'?'application/pdf':role==='html'?'text/html':'image/png',path:`artifacts/2026-11-17/r1/${role}`,sha256:role==='html'?hash(html):hash(new TextEncoder().encode(role)),bytes:role==='html'?html.length:10,verification:'actual-local-file-bytes',...(role==='html'?{htmlSafety:{status:'accepted-inert-subset',profile:'ltc-inert-html-v1',sanitized:false,resourceFetchesAllowed:false}}:{})}));
 // Explicit synthetic receipt shape: tests do not claim these were ingested production artifacts.
 const receipt={status:'accepted-receipt',errors:[],validation:{status:'validated-description',manifest:{...identity,generation:'cloud-newsroom-v2',kind:'daily',editionDate:'2026-11-17',artifacts}},publication:{registryId:'2026-11-17-r1',page:'/conversations/editions/2026-11-17/',canonicalUrl:'https://ltcmagazine.org/conversations/editions/2026-11-17/'},artifacts};
 const observedAssets=new Map(),sourceEvidence=new Map(),tagEvidence=new Map();
 const stories=trustedOutline.slice(0,2).map((story,index)=>{
  const source=`covers/story-${index}.png`;observedAssets.set(source,image);
  sourceEvidence.set(story.fragment,{verified:true,contentSha256:story.contentSha256,readerSha256:story.readerSha256,claim:'Synthetic claim only.',sourceIds:['test-source'],sourceUrls:['https://litecoin.com/'],evidenceSha256:'a'.repeat(64),checkedAt:'2026-11-17T12:00:00Z'});
  return {storyId:story.fragment,fragment:story.fragment,nodePath:story.nodePath,contentSha256:story.contentSha256,readerSha256:story.readerSha256,pdfSha256:artifacts[0].sha256,canonicalStoryUrl:receipt.publication.canonicalUrl+'#'+story.fragment,claim:'Synthetic claim only.',sourceIds:['test-source'],tags:[],asset:{path:source,sha256:hash(image),bytes:image.length,altText:'Synthetic image for a unit test.',aiAssisted:true}};
 });
 return {receipt,trustedOutline,envelope:{schemaVersion:1,kind:'canonicaldaily-marketing-assets',issueId:'2026-11-17-r1',stories},observedAssets,sourceEvidence,tagEvidence,existingInventory:new Map()};
}

const NOW=Date.parse('2026-11-17T13:00:00Z');
function inputs(){
 const x=fixture(),editorialSelections=new Map(),evidenceBlobs=new Map();
 for(const s of x.trustedOutline){
  const raw=new TextEncoder().encode('Synthetic source evidence for '+s.fragment),h=hash(raw);evidenceBlobs.set(h,raw);
  x.sourceEvidence.set(s.fragment,{verified:true,contentSha256:s.contentSha256,readerSha256:s.readerSha256,claim:'Synthetic test claim only.',stage:'testnet',sourceIds:['test-source'],sourceUrls:['https://example.com/source'],evidenceSha256:h,representation:'web_tool_extraction',checkedAt:'2026-11-17T12:00:00Z'});
  editorialSelections.set(s.fragment,{title:'SYNTHETIC TEST',subtitle:'DO NOT PUBLISH.',claim:'Synthetic test claim only.',stage:'testnet',sourceIds:['test-source'],tags:[],stage:'testnet',theme:'orange',alt:'Synthetic unit test cover.'});
 }
 const publicationProof={kind:'independent-public-readback',issueId:x.receipt.publication.registryId,canonicalUrl:x.receipt.publication.canonicalUrl,httpStatus:200,checkedAt:'2026-11-17T12:00:00Z',artifacts:x.receipt.artifacts.map(a=>({role:a.role,url:'https://ltcmagazine.org/magazine/daily/2026-11-17/r1/'+({pdf:'edition.pdf',html:'reader.html',cover:'cover.png',promo:'promo.png'}[a.role]),sha256:a.sha256,bytes:a.bytes,httpStatus:200}))};
 return {...x,publicationProof,editorialSelections,evidenceBlobs,now:NOW};
}
test('two bounded candidates leave third story explicitly pending, no effects',()=>{const x=inputs(),p=prepare(x);assert.equal(p.covers.length,2);assert.equal(p.backlog.length,1);assert.equal(p.coverageComplete,false);assert.equal(p.backlog[0].reason,'next-bounded-batch');assert.equal(p.publishAllowed,false);assert.deepEqual(p.effects,[]);assert.ok(Object.isFrozen(p.covers));});
test('local accepted receipt without actual public proof fails',()=>{const x=inputs();delete x.publicationProof;assert.throws(()=>prepare(x),/published-readback/);});
test('reject legacy and incorrect public PDF hash',()=>{const x=inputs();x.receipt.validation.manifest.kind='special';assert.throws(()=>prepare(x),/accepted-daily/);const y=inputs();y.publicationProof.artifacts[0].sha256='f'.repeat(64);assert.throws(()=>prepare(y),/artifact-mismatch/);});
test('stale and future public/source evidence fail',()=>{for(const timestamp of ['2020-01-01T00:00:00Z','2026-11-18T00:00:00Z']){const x=inputs();x.publicationProof.checkedAt=timestamp;assert.throws(()=>prepare(x));const y=inputs();y.sourceEvidence.values().next().value.checkedAt=timestamp;assert.throws(()=>prepare(y));}});
test('missing editorial or evidence stays backlog, never silently complete',()=>{const x=inputs();x.editorialSelections.clear();const p=prepare(x);assert.equal(p.covers.length,0);assert.equal(p.backlog.length,3);assert.equal(p.coverageComplete,false);});
test('evidence hashes require observed bytes',()=>{const x=inputs();x.evidenceBlobs.clear();assert.throws(()=>prepare(x),/evidence-bytes/);});
test('tag needs exact observed official outbound target and correct platform',()=>{const x=inputs(),key='X:@ExampleAccount',raw=new TextEncoder().encode('Synthetic official link https://x.com/ExampleAccount'),h=hash(raw);x.evidenceBlobs.set(h,raw);const t={verified:true,platform:'X',handle:'@ExampleAccount',officialSourceUrl:'https://example.com/connect',linkedTarget:'https://x.com/ExampleAccount',evidenceSha256:h,representation:'web_tool_extraction',checkedAt:'2026-11-17T12:00:00Z'};x.tagEvidence.set(key,t);x.editorialSelections.values().next().value.tags=[key];assert.equal(prepare(x).covers[0].tags[0].handle,'@ExampleAccount');t.linkedTarget='https://instagram.com/ExampleAccount';assert.throws(()=>prepare(x),/outbound/);});
test('outline fragment and canonical revision cannot be guessed',()=>{const x=inputs();x.trustedOutline[0].fragment='guess';assert.throws(()=>prepare(x),/outline/);});
test('render binding emits exact admission envelope and observed PNG hashes',()=>{const x=inputs(),p=prepare(x),renderedByStory=new Map(p.covers.map(c=>[c.storyId,{bytes:image,visualQa:'passed',inputMetadataSha256:rendererInputSha256(c.coverMetadata)}]));const result=bind({...x,preparation:p,renderedByStory});assert.equal(result.admission.assetCopies.length,2);assert.equal(result.admission.publishAllowed,false);assert.equal(result.admission.remainingStoryIds.length,1);assert.match(result.admission.assetCopies[0].destination,/^public\/magazine\/2026-11-17-r1\/marketing\/story-/);});
test('bad rendered bytes/metadata/QA fail, no new authority',()=>{for(const alter of [r=>r.visualQa='pending',r=>r.inputMetadataSha256='x',r=>r.bytes=new Uint8Array([1,2,3])]){const x=inputs(),p=prepare(x),r={bytes:image,visualQa:'passed',inputMetadataSha256:rendererInputSha256(p.covers[0].coverMetadata)};alter(r);assert.throws(()=>bind({...x,preparation:p,renderedByStory:new Map([[p.covers[0].storyId,r]])}));}});
test('prior immutable assets count coverage but changed identity fails',()=>{const x=inputs(),p=prepare(x);for(const c of p.covers)x.existingInventory.set(c.plannedDestination,{sha256:hash(image),bytes:image.length,binding:{issueId:p.issueId,storyId:c.storyId,contentSha256:c.contentSha256,readerSha256:c.readerSha256,pdfSha256:c.pdfSha256}});const next=prepare(x);assert.equal(next.covers.length,1);assert.equal(next.coveredStoryIds.length,2);assert.equal(next.coverageComplete,false);x.existingInventory.values().next().value.binding.pdfSha256='bad';assert.throws(()=>prepare(x),/inventory/);});

export {inputs};

test('readback paths exact for every artifact role',()=>{for(let i=0;i<4;i++){const x=inputs();x.publicationProof.artifacts[i].url='https://ltcmagazine.org/wrong-page/';assert.throws(()=>prepare(x),/artifact-mismatch/);}});
test('editorial stage cannot upgrade independently verified testnet',()=>{const x=inputs();x.editorialSelections.values().next().value.stage='live';assert.throws(()=>prepare(x),/source-evidence-binding/);});
test('canonical renderer metadata SHA matches Python including unicode',()=>{const x={z:'café 🚀',a:{b:true,a:null}};assert.equal(rendererInputSha256(x),hash('{"a":{"a":null,"b":true},"z":"caf\\u00e9 \\ud83d\\ude80"}'));});
