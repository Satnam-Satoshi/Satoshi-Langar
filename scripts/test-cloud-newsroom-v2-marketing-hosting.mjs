import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {inspectMarketingPng,planCloudNewsroomV2MarketingAssets as plan} from './cloud-newsroom-v2-marketing-assets.mjs';
import {parseVerifiedPdfReader,extractPdfReaderOutline} from './lib/ltc-pdf-reader.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;};
const concat=(...arrays)=>{const output=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let at=0;for(const a of arrays){output.set(a,at);at+=a.length;}return output;};
function chunk(name,data){const b=new Uint8Array(data.length+12),v=new DataView(b.buffer);v.setUint32(0,data.length);b.set(new TextEncoder().encode(name),4);b.set(data,8);v.setUint32(b.length-4,crc32(b.subarray(4,b.length-4)));return b;}
function png(width=1080,height=1350){const header=new Uint8Array(13),v=new DataView(header.buffer);v.setUint32(0,width);v.setUint32(4,height);header[8]=8;header[9]=6;return concat(new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(new Uint8Array((width*4+1)*height))),chunk('IEND',new Uint8Array()));}
const image=png();
function marketingFixture(){
 const html=new TextEncoder().encode('<!doctype html><html><head><title>Fixture</title></head><body><main><section><h2>Native</h2><p>Synthetic only.</p></section><section><h2>Builders</h2><p>Synthetic only.</p></section><section><h2>Institutions</h2><p>Synthetic only.</p></section></main></body></html>');
 const trustedOutline=extractPdfReaderOutline(parseVerifiedPdfReader(html,{sha256:hash(html),bytes:html.length}),'2026-11-17-r1');
 const identity={editionId:'ltc-daily-2026-11-17',revision:1};
 const artifacts=['pdf','html','cover','promo'].map(role=>({...identity,role,path:`artifacts/2026-11-17/r1/${role}`,sha256:role==='html'?hash(html):hash(new TextEncoder().encode(role)),bytes:role==='html'?html.length:10,verification:'actual-local-file-bytes',...(role==='html'?{htmlSafety:{status:'accepted-inert-subset',profile:'ltc-inert-html-v1',sanitized:false,resourceFetchesAllowed:false}}:{})}));
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

import {planCloudNewsroomV2MarketingHosting as hostingPlan,evaluateCloudNewsroomV2MarketingHosting as admit,MARKETING_HOSTING_MANIFEST_PATH as manifestPath} from './cloud-newsroom-v2-marketing-hosting.mjs';
const entry=(path,text)=>({path,mode:'100644',sha256:hash(Buffer.from(text)),bytes:Buffer.byteLength(text)});
function fixture(){
 const marketing=marketingFixture();marketing.receipt.validation.manifest.sourceCommit='a'.repeat(40);
 const pdf=marketing.receipt.artifacts.find(a=>a.role==='pdf'),reader=marketing.receipt.artifacts.find(a=>a.role==='html');
 const trusted={priorCommit:'b'.repeat(40),reviewedCodeCommit:'a'.repeat(40),expiresAt:'2026-11-17T12:05:00Z',priorManifestText:null,priorTree:[entry('app/page.tsx','reviewed application'),entry('vercel.json','unchanged guard'),entry('.github/workflows/daily.yml','unchanged scheduler'),entry('public/archives/old.pdf','immutable archive')],publishedIssueProof:{status:'published-verified',issueId:'2026-11-17-r1',pdfSha256:pdf.sha256,readerSha256:reader.sha256,sourceCommit:'b'.repeat(40),observedAt:'2026-11-17T12:00:00Z',expiresAt:'2026-11-17T12:05:00Z',domains:['ltcmagazine.org','satnamsatoshi.com'].map(host=>({host,deploymentId:'dpl_verified',verified:true,pdfSha256:pdf.sha256,readerSha256:reader.sha256,sourceCommit:'b'.repeat(40)}))}};
 const input={now:'2026-11-17T12:01:00Z',marketing};return {input,trusted};
}
function candidate(x){const p=hostingPlan(x.input,x.trusted);assert.notEqual(p.status,'blocked',JSON.stringify(p));x.input.candidateCommit='c'.repeat(40);x.input.candidateParents=[x.trusted.priorCommit];x.input.candidateManifestText=p.manifestText;x.input.candidateTree=[...structuredClone(x.trusted.priorTree.filter(e=>e.path!==manifestPath)),entry(manifestPath,p.manifestText),...p.assetCopies.map(a=>({path:a.destination,mode:'100644',sha256:a.sha256,bytes:a.bytes}))];return p;}
const blocked=x=>{const r=admit(x.input,x.trusted);assert.equal(r.status,'blocked',JSON.stringify(r));assert.equal(r.publishAllowed,false);assert.deepEqual(r.effects,[]);return r;};
test('exact accepted artwork yields separate append-only public manifest with no authority or complete-coverage overclaim',()=>{
 const x=fixture(),before=structuredClone(x),p=hostingPlan(x.input,x.trusted);assert.equal(p.status,'marketing-hosting-manifest-plan');assert.equal(p.assetCopies.length,2);assert.equal(p.remainingStoryIds.length,1);assert.equal(p.coverageComplete,false);assert.equal(p.publishAllowed,false);assert.equal(p.tagAuthority,'none');assert.deepEqual(x,before);
 const m=JSON.parse(p.manifestText);assert.equal(m.assets.length,2);assert.equal(m.assets[0].source.evidenceSha256,'a'.repeat(64));assert.equal(m.assets[0].source.claim,'Synthetic claim only.');assert.equal(m.assets[0].binding.readerSha256,x.input.marketing.receipt.artifacts[1].sha256);assert.ok(!p.manifestText.includes('covers/story'));assert.ok(Object.isFrozen(p));
 candidate(x);const r=admit(x.input,x.trusted);assert.equal(r.status,'eligible-for-marketing-preview-review');assert.equal(r.promotionAuthorized,false);assert.equal(r.proposal.assetPaths.length,2);
});
test('all old code, settings, workflows, archives and prior records remain byte immutable',()=>{
 for(const path of ['app/page.tsx','vercel.json','.github/workflows/daily.yml','public/archives/old.pdf']){const x=fixture();candidate(x);x.input.candidateTree.find(e=>e.path===path).sha256='f'.repeat(64);blocked(x);}
 const x=fixture();candidate(x);x.input.candidateTree.pop();blocked(x);
 const y=fixture();candidate(y);y.input.candidateTree=y.input.candidateTree.filter(e=>e.path!=='vercel.json');blocked(y);
});
test('full candidate tree admits only derived PNGs and exactmanifest, not four-artifact daily changes',()=>{
 for(const path of ['public/magazine/elsewhere.png','content/ltc-pdf/issues.json','app/evil.tsx']){const x=fixture();candidate(x);x.input.candidateTree.push(entry(path,'unexpected'));blocked(x);}
 const x=fixture();candidate(x);x.input.candidateTree.find(e=>e.path.endsWith('.png')).mode='100755';blocked(x);
 const y=fixture();candidate(y);y.input.candidateManifestText+=' ';blocked(y);
 const z=fixture();candidate(z);z.input.candidateTree.find(e=>e.path===manifestPath).sha256='f'.repeat(64);blocked(z);
});
test('hosting requires current independently verified public PDF+reader on BOTH domains',()=>{
 for(const mutate of [x=>delete x.trusted.publishedIssueProof,x=>x.trusted.publishedIssueProof.status='preview-verified',x=>x.trusted.publishedIssueProof.pdfSha256='f'.repeat(64),x=>x.trusted.publishedIssueProof.domains.pop(),x=>x.trusted.publishedIssueProof.domains[0].readerSha256='f'.repeat(64),x=>x.trusted.publishedIssueProof.sourceCommit='f'.repeat(40),x=>x.trusted.publishedIssueProof.domains[0].verified='true',x=>x.input.now='2026-11-17T12:06:00Z']){const x=fixture();mutate(x);assert.equal(hostingPlan(x.input,x.trusted).status,'blocked');}
});
test('receipt, source snapshots and story bindings cannot be guessed or replaced',()=>{
 for(const mutate of [x=>x.input.marketing.receipt.artifacts[0].verification='claimed',x=>x.input.marketing.envelope.stories[0].canonicalStoryUrl='https://evil.example/',x=>x.input.marketing.sourceEvidence.clear(),x=>x.input.marketing.sourceEvidence.values().next().value.checkedAt='2026-11-17T12:02:00Z',x=>x.input.marketing.envelope.stories[0].asset.sha256='f'.repeat(64)]){const x=fixture();mutate(x);assert.equal(hostingPlan(x.input,x.trusted).status,'blocked');}
});
function completedFirstBatch(){const x=fixture(),p=candidate(x);x.trusted.priorTree=structuredClone(x.input.candidateTree);x.trusted.priorManifestText=p.manifestText;return x;}
test('exact repeated assets are no-op; metadata/claim/source drift cannot overwrite same path',()=>{
 const x=completedFirstBatch(),p=hostingPlan(x.input,x.trusted);assert.equal(p.status,'marketing-hosting-no-op');assert.equal(p.assetCopies.length,0);assert.equal(p.manifestText,x.trusted.priorManifestText);x.input.candidateTree=structuredClone(x.trusted.priorTree);assert.equal(admit(x.input,x.trusted).status,'marketing-hosting-no-op');
 x.input.candidateTree.push(entry('public/extra.png','bad'));blocked(x);
 for(const mutate of [x=>x.input.marketing.envelope.stories[0].asset.altText='Rewritten alt text',x=>{const s=x.input.marketing.envelope.stories[0];s.claim='Changed claim';x.input.marketing.sourceEvidence.get(s.storyId).claim=s.claim;},x=>x.input.marketing.sourceEvidence.values().next().value.evidenceSha256='b'.repeat(64)]){const y=completedFirstBatch();mutate(y);assert.equal(hostingPlan(y.input,y.trusted).status,'blocked');}
});
test('batch cap remains two while subsequent eligible story batch completes coverage and preserves previous metadata',()=>{
 const x=completedFirstBatch(),prior=JSON.parse(x.trusted.priorManifestText),story=x.input.marketing.trustedOutline[2],base=x.input.marketing.envelope.stories[0];x.input.marketing.sourceEvidence.set(story.fragment,{...x.input.marketing.sourceEvidence.get(base.storyId),contentSha256:story.contentSha256});x.input.marketing.envelope.stories=[{...base,storyId:story.fragment,fragment:story.fragment,nodePath:story.nodePath,contentSha256:story.contentSha256,canonicalStoryUrl:x.input.marketing.receipt.publication.canonicalUrl+'#'+story.fragment}];
 const p=candidate(x);assert.equal(p.assetCopies.length,1);assert.equal(p.coverageComplete,true);assert.deepEqual(JSON.parse(p.manifestText).assets.slice(0,2),prior.assets);assert.equal(admit(x.input,x.trusted).status,'eligible-for-marketing-preview-review');
 const changed=JSON.parse(p.manifestText);changed.assets[0].altText='Rewrite history';x.input.candidateManifestText=JSON.stringify(changed,null,2)+'\n';Object.assign(x.input.candidateTree.find(e=>e.path===manifestPath),entry(manifestPath,x.input.candidateManifestText));blocked(x);
});
test('prior registry cannot exempt arbitrary paths, unregistered collisions or missing assets',()=>{
 const x=fixture(),p=hostingPlan(x.input,x.trusted),a=p.assetCopies[0];x.trusted.priorTree.push({path:a.destination,mode:'100644',sha256:a.sha256,bytes:a.bytes});assert.equal(hostingPlan(x.input,x.trusted).status,'blocked');
 const y=completedFirstBatch();y.trusted.priorTree=y.trusted.priorTree.filter(e=>!e.path.endsWith('.png'));assert.equal(hostingPlan(y.input,y.trusted).status,'blocked');
 const z=completedFirstBatch(),m=JSON.parse(z.trusted.priorManifestText);m.assets[0].path='vercel.json';z.trusted.priorManifestText=JSON.stringify(m);Object.assign(z.trusted.priorTree.find(e=>e.path===manifestPath),entry(manifestPath,z.trusted.priorManifestText));assert.equal(hostingPlan(z.input,z.trusted).status,'blocked');
});
function addTag(x,checkedAt){const tag={platform:'X',handle:'@Litecoin',officialSourceUrl:'https://litecoin.com/',linkedTarget:'https://x.com/Litecoin',evidenceSha256:'b'.repeat(64),checkedAt};x.input.marketing.envelope.stories[0].tags=[tag];x.input.marketing.tagEvidence.set('X:@Litecoin',{...tag,verified:true});}
test('new hosting source and tag evidence must remain strictly within24h and not future',()=>{
 for(const at of ['2026-11-16T12:01:00Z','2026-11-15T12:01:00Z','2026-11-17T12:01:01Z']){
  const source=fixture();source.input.marketing.sourceEvidence.values().next().value.checkedAt=at;assert.equal(hostingPlan(source.input,source.trusted).status,'blocked');
  const tag=fixture();addTag(tag,at);assert.equal(hostingPlan(tag.input,tag.trusted).status,'blocked');
 }
});
test('hosting proposal expires at earliest new source/tag deadline and reevaluation catches elapsed time',()=>{
 const x=fixture();x.input.marketing.sourceEvidence.values().next().value.checkedAt='2026-11-16T12:01:45Z';addTag(x,'2026-11-16T12:01:30Z');const p=candidate(x);assert.equal(p.expiresAt,'2026-11-17T12:01:30.000Z');const r=admit(x.input,x.trusted);assert.equal(r.status,'eligible-for-marketing-preview-review');assert.equal(r.proposal.expiresAt,p.expiresAt);
 x.input.now='2026-11-17T12:01:30Z';const stale=blocked(x);assert.ok(stale.errors.includes('stale_new_tag_evidence'));
 const y=fixture();y.input.marketing.sourceEvidence.values().next().value.checkedAt='2026-11-16T12:01:20Z';candidate(y);assert.equal(admit(y.input,y.trusted).proposal.expiresAt,'2026-11-17T12:01:20.000Z');
});
test('old exact immutable hosted record remains no-op without fabricated fresh timestamps',()=>{
 const x=completedFirstBatch(),original=x.trusted.priorManifestText;
 x.input.now='2026-11-19T12:01:00Z';x.trusted.expiresAt='2026-11-19T12:05:00Z';x.trusted.publishedIssueProof.observedAt='2026-11-19T12:00:00Z';x.trusted.publishedIssueProof.expiresAt='2026-11-19T12:05:00Z';
 const p=hostingPlan(x.input,x.trusted);assert.equal(p.status,'marketing-hosting-no-op');assert.equal(p.manifestText,original);assert.equal(JSON.parse(p.manifestText).assets[0].source.checkedAt,'2026-11-17T12:00:00Z');x.input.candidateTree=structuredClone(x.trusted.priorTree);assert.equal(admit(x.input,x.trusted).status,'marketing-hosting-no-op');
});
test('review and publication windows still cap evidence-fresh hosting admission',()=>{
 const x=fixture();x.trusted.expiresAt='2026-11-17T13:00:00Z';x.trusted.publishedIssueProof.observedAt=x.input.now;x.trusted.publishedIssueProof.expiresAt='2026-11-17T13:00:00Z';assert.equal(hostingPlan(x.input,x.trusted).expiresAt,'2026-11-17T12:06:00.000Z');
 x.trusted.expiresAt='2026-11-17T12:02:00Z';assert.equal(hostingPlan(x.input,x.trusted).expiresAt,'2026-11-17T12:02:00.000Z');
});
test('new hosting honors stricter independent source and tag policy expiry',()=>{
 const x=fixture();x.input.marketing.sourceEvidence.values().next().value.expiresAt='2026-11-17T12:01:45Z';addTag(x,'2026-11-17T12:00:00Z');x.input.marketing.tagEvidence.get('X:@Litecoin').expiresAt='2026-11-17T12:01:20Z';
 const p=candidate(x);assert.equal(p.expiresAt,'2026-11-17T12:01:20.000Z');assert.equal(admit(x.input,x.trusted).proposal.expiresAt,p.expiresAt);x.input.now='2026-11-17T12:01:20Z';assert.ok(blocked(x).errors.includes('stale_new_tag_evidence'));
 for(const expiresAt of ['2026-11-17T12:00:30Z','invalid',null,undefined,'2026-11-17T11:59:59Z']){
  const source=fixture();source.input.marketing.sourceEvidence.values().next().value.expiresAt=expiresAt;assert.equal(hostingPlan(source.input,source.trusted).status,'blocked');
  const tag=fixture();addTag(tag,'2026-11-17T12:00:00Z');tag.input.marketing.tagEvidence.get('X:@Litecoin').expiresAt=expiresAt;assert.equal(hostingPlan(tag.input,tag.trusted).status,'blocked');
 }
});
test('optional expiry never relaxes24h cap and does not invalidate old immutable no-op',()=>{
 const x=fixture();x.input.marketing.sourceEvidence.values().next().value.checkedAt='2026-11-16T12:01:30Z';x.input.marketing.sourceEvidence.values().next().value.expiresAt='2026-11-18T12:00:00Z';assert.equal(hostingPlan(x.input,x.trusted).expiresAt,'2026-11-17T12:01:30.000Z');
 const y=completedFirstBatch();y.input.marketing.sourceEvidence.values().next().value.expiresAt='2026-11-17T12:00:30Z';assert.equal(hostingPlan(y.input,y.trusted).status,'marketing-hosting-no-op');
});
