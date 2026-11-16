import { inspectCloudNewsroomV2Html } from './cloud-newsroom-v2-html-safety.mjs';
const inertHtmlFixture='<!doctype html><html><head><title>Synthetic fixture</title></head><body><p>Not publication evidence.</p></body></html>';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { projectReceiptToPdfRegistry } from './lib/ltc-pdf-receipt.mjs';
import { evaluateCloudNewsroomV2DataAdmission, PDF_REGISTRY_PATH } from './cloud-newsroom-v2-data-admission.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex'),pin='a'.repeat(40),impl='b'.repeat(40),implHash='c'.repeat(64);
const entry=(path,text)=>({path,mode:'100644',sha256:hash(text),bytes:Buffer.byteLength(text)});
function receipt(date='2026-11-16'){
 const id=`ltc-daily-${date}`,artifacts=['pdf','html','cover','promo'].map((role,i)=>({role,path:`artifacts/${date}/r1/${role}`,editionId:id,editionDate:date,revision:1,sha256:hash(date+role),bytes:100+i,mimeType:i===0?'application/pdf':i===1?'text/html':'image/png',...(i===0?{pages:29}:{})}));
 return {status:'accepted-receipt',errors:[],operational:false,effects:[],artifacts:artifacts.map(a=>({...a,verification:'actual-local-file-bytes',...(a.role==='html'?{htmlSafety:inspectCloudNewsroomV2Html(Buffer.from(inertHtmlFixture))}:{})})),coverDimensions:{width:675,height:900,verification:'png-ihdr-with-crc',renderVerified:false},publication:{registryId:`${date}-r1`,page:`/conversations/editions/${date}/`,canonicalUrl:`https://ltcmagazine.org/conversations/editions/${date}/`,title:'Synthetic source-led daily',dek:'Test evidence, not a publication claim.',preparedAt:`${date}T18:59:30Z`,preparedDate:date},validation:{status:'validated-description',errors:[],manifest:{schemaVersion:1,generation:'cloud-newsroom-v2',kind:'daily',editionId:id,editionDate:date,revision:1,sourceCommit:pin,implementationCommit:impl,implementationSha256:implHash,preparedAt:`${date}T18:59:30Z`,artifacts,correction:null,sources:[{id:'btc',status:'verified',claimVerified:true,classification:'current',value:123,publishedAt:null,eventAt:null,effectiveAt:`${date}T18:58:00Z`,retrievedAt:`${date}T18:59:00Z`,maxRetrievalAgeSeconds:180,maxEffectiveAgeSeconds:300}]}}};
}
function candidate(trusted,r=receipt(),candidateCommit='f'.repeat(40)){
 Object.assign(trusted,policyFixture(r.validation.manifest.sources[0]));
 const projection=projectReceiptToPdfRegistry(JSON.parse(trusted.currentRegistryText),r),text=JSON.stringify(projection.registry,null,2)+'\n';
 return {now:`${r.validation.manifest.editionDate}T19:00:00Z`,candidateCommit,candidateParents:[trusted.priorCommit],candidateRegistryText:text,receipt:r,candidateTree:[...structuredClone(trusted.priorTree.filter(e=>e.path!==PDF_REGISTRY_PATH)),entry(PDF_REGISTRY_PATH,text),...projection.assetCopies.map(a=>({path:a.destination,mode:'100644',sha256:a.sha256,bytes:a.bytes}))]};
}
function fixture(){
 const old={id:'2026-11-15-r1',date:'2026-11-15',revision:1,title:'Prior title',dek:'Prior historical record.',preparedDate:'2026-11-15',pdf:'/magazine/daily/legacy.pdf',cover:'/magazine/daily/legacy.png',pages:28,bytes:8,sha256:hash('old pdf!'),coverBytes:8,coverSha256:hash('old png!'),coverWidth:675,coverHeight:900,correction:null};
 const currentRegistryText=JSON.stringify({schemaVersion:1,current:old.id,issues:[old]},null,2)+'\n';
 const invariantTree=[entry('app/page.tsx','reviewed code'),entry('vercel.json','reviewed guard'),entry('.github/workflows/release.yml','reviewed workflow'),entry('scripts/lib/ltc-pdf-registry.mjs','reviewed registry code'),entry('public'+old.pdf,'old pdf!'),entry('public'+old.cover,'old png!')];
 const trusted={priorCommit:'d'.repeat(40),currentRegistryText,priorTree:[...structuredClone(invariantTree),entry(PDF_REGISTRY_PATH,currentRegistryText)],legacyRouteIds:[],priorArtifactInventory:[],review:{sourceCommit:pin,implementationCommit:impl,implementationSha256:implHash,notBefore:'2026-11-16T18:00:00Z',expiresAt:'2026-11-18T00:00:00Z',invariantTree}};
 return {trusted,input:candidate(trusted)};
}
function blocked(x){const r=evaluateCloudNewsroomV2DataAdmission(x.input,x.trusted);assert.equal(r.status,'blocked');assert.equal(r.proposal,null);assert.deepEqual(r.effects,[]);assert.equal(r.promotionAuthorized,false);return r;}
function registryChange(x,mutate){const raw=JSON.parse(x.input.candidateRegistryText);mutate(raw);x.input.candidateRegistryText=JSON.stringify(raw,null,2)+'\n';Object.assign(x.input.candidateTree.find(e=>e.path===PDF_REGISTRY_PATH),entry(PDF_REGISTRY_PATH,x.input.candidateRegistryText));}
test('exact registry append plus4derived files is preview-review eligible only',()=>{
 const x=fixture(),before=structuredClone(x),r=evaluateCloudNewsroomV2DataAdmission(x.input,x.trusted);
 assert.equal(r.status,'eligible-for-preview-review');assert.equal(r.proposal.artifactPaths.length,4);assert.equal(r.proposal.issueId,'2026-11-16-r1');assert.deepEqual(r.effects,[]);assert.equal(r.promotionAuthorized,false);assert.ok(Object.isFrozen(r.proposal));assert.deepEqual(x,before);assert.deepEqual(evaluateCloudNewsroomV2DataAdmission(x.input,x.trusted),r);
});
test('external trust context cannot be replaced with candidate self-authorization',()=>{
 const x=fixture();x.input.trustedReview=x.trusted.review;assert.equal(evaluateCloudNewsroomV2DataAdmission(x.input).status,'blocked');
 x.input.receipt.validation.manifest.sourceCommit='e'.repeat(40);blocked(x);
});
test('code, config, workflow, guard, modes and old assets remain byte-immutable',()=>{
 for(const path of ['app/page.tsx','vercel.json','.github/workflows/release.yml','scripts/lib/ltc-pdf-registry.mjs','public/magazine/daily/legacy.pdf']){const x=fixture();x.input.candidateTree.find(e=>e.path===path).sha256=hash('changed');blocked(x);}
 for(const mode of ['100755','120000','160000']){const x=fixture();x.input.candidateTree[0].mode=mode;blocked(x);}
 const x=fixture();x.input.candidateTree=x.input.candidateTree.filter(e=>e.path!=='app/page.tsx');blocked(x);
});
test('added code, arbitrary data, traversal and case aliases are outside exact allowlist',()=>{
 for(const path of ['app/evil.ts','public/magazine/daily/extra.pdf','public/magazine/daily/2026-11-16/r1/../evil','PUBLIC/magazine/daily/legacy.pdf','.git/config']){const x=fixture();x.input.candidateTree.push(entry(path,'evil'));blocked(x);}
 const x=fixture();x.input.candidateTree.push({...x.input.candidateTree[0]});blocked(x);
});
test('missing4thartifact, preexisting destination, fake hash or counts are rejected',()=>{
 for(const key of ['sha256','bytes']){const x=fixture(),a=x.input.candidateTree.find(e=>e.path.endsWith('reader.html'));a[key]=key==='sha256'?hash('different'):999;blocked(x);}
 const x=fixture();x.input.candidateTree=x.input.candidateTree.filter(e=>!e.path.endsWith('promo.png'));blocked(x);
 const y=fixture();const a=y.input.candidateTree.find(e=>e.path.endsWith('edition.pdf'));y.trusted.priorTree.push(a);y.trusted.review.invariantTree.push(a);blocked(y);
});
test('registry data must match actual tree digest and exact append-only projection',()=>{
 const x=fixture();x.input.candidateRegistryText+=' ';blocked(x);
 const y=fixture();registryChange(y,r=>{r.issues.find(i=>i.date==='2026-11-15').title='Rewritten historical title';});blocked(y);
 const z=fixture();registryChange(z,r=>{r.issues.find(i=>i.date==='2026-11-16').pdf='/magazine/daily/arbitrary.pdf';});blocked(z);
 const w=fixture();registryChange(w,r=>{r.modelChosenField='unsafe';});blocked(w);
});
test('unknown prior code cannot hide outside reviewed invariant coverage',()=>{
 const x=fixture();x.trusted.priorTree.push(entry('scripts/unknown.mjs','unknown'));x.input.candidateTree.push(entry('scripts/unknown.mjs','unknown'));blocked(x);
 const y=fixture();y.trusted.review.invariantTree=y.trusted.review.invariantTree.slice(1);blocked(y);
 const z=fixture();z.trusted.priorTree.find(e=>e.path==='app/page.tsx').sha256=hash('drift');blocked(z);
});
test('freshness, NYdate, expiry, exact parent and receipt code pin are rechecked',()=>{
 for(const patch of [{now:'2026-11-18T00:00:00Z'},{now:'2026-11-16T17:00:00Z'},{candidateParents:[]},{candidateParents:['d'.repeat(40),'e'.repeat(40)]},{candidateParents:['e'.repeat(40)]}]){const x=fixture();Object.assign(x.input,patch);blocked(x);}
 const x=fixture();x.input.receipt.validation.manifest.implementationSha256='e'.repeat(64);blocked(x);
 const y=fixture();y.input.now='2026-11-16T19:05:00Z';assert.ok(blocked(y).errors.includes('receipt_evidence_expired'));
 const z=fixture();z.input.receipt.validation.manifest.sources[0].status='unverified';blocked(z);
});
test('arbitrary bundle path never becomes public destination or code permission',()=>{
 const x=fixture();for(const a of [x.input.receipt.artifacts[0],x.input.receipt.validation.manifest.artifacts[0]])a.path='../../vercel.json';blocked(x);
 const y=fixture();y.input.receipt.publication.page='/admin/';blocked(y);
});
test('next day remains eligible with same code pin and separately trusted4role artifact history',()=>{
 const first=fixture(),r=first.input.receipt,projection=projectReceiptToPdfRegistry(JSON.parse(first.trusted.currentRegistryText),r);
 const trusted={...structuredClone(first.trusted),priorCommit:first.input.candidateCommit,priorTree:structuredClone(first.input.candidateTree),currentRegistryText:first.input.candidateRegistryText,priorArtifactInventory:projection.assetCopies.map(a=>({issueId:projection.issue.id,role:a.role,path:a.destination,mode:'100644',sha256:a.sha256,bytes:a.bytes}))};
 const input=candidate(trusted,receipt('2026-11-17'),'e'.repeat(40));
 assert.equal(evaluateCloudNewsroomV2DataAdmission(input,trusted).status,'eligible-for-preview-review');
 const mutation={input:structuredClone(input),trusted:structuredClone(trusted)};mutation.input.candidateTree.find(e=>e.path.endsWith('2026-11-16/r1/reader.html')).sha256=hash('rewrite');blocked(mutation);
 const incomplete={input:structuredClone(input),trusted:structuredClone(trusted)};incomplete.trusted.priorArtifactInventory.pop();blocked(incomplete);
 const smuggle={input:structuredClone(input),trusted:structuredClone(trusted)};smuggle.trusted.priorArtifactInventory[1].path='app/page.tsx';blocked(smuggle);
});
test('malformed trees, receipts and file-directory collisions reject without effects',()=>{
 for(const field of ['candidateTree','candidateRegistryText','receipt']){const x=fixture();x.input[field]=null;blocked(x);}
 const x=fixture();x.input.candidateTree.push(entry('public','directory-collision'));blocked(x);
 const y=fixture();y.input.receipt.effects=['publish'];blocked(y);
});
test('evaluator has no process, IO, network, clock read or production effect implementation',()=>{
 const source=readFileSync(new URL('./cloud-newsroom-v2-data-admission.mjs',import.meta.url),'utf8');assert.doesNotMatch(source,/node:fs|\bfetch\s*\(|Date\.now\s*\(|execSync|spawn\s*\(|process\.|writeFile/);
});

test('invalid values, SHA1 blobs, absent source pin and self-attested inventory cannot widen trust',()=>{
 for(const value of [NaN,Infinity,{},'']){const x=fixture();x.input.receipt.validation.manifest.sources[0].value=value;blocked(x);}
 const x=fixture();x.input.candidateTree[0].sha256='a'.repeat(40);blocked(x);
 const y=fixture();y.trusted.review.sourceCommit=null;blocked(y);
 const z=fixture();z.input.priorArtifactInventory=[{path:'app/page.tsx',role:'html'}];z.input.candidateTree[0].sha256=hash('evil');blocked(z);
});
test('old receipts and altered inert-HTML attestations cannot enter admission',()=>{
 for(const safety of [undefined,{status:'accepted-inert-subset',profile:'unknown',sanitized:false,resourceFetchesAllowed:false},{status:'accepted-inert-subset',profile:'ltc-inert-html-v1',sanitized:true,resourceFetchesAllowed:false},{status:'accepted-inert-subset',profile:'ltc-inert-html-v1',sanitized:false,resourceFetchesAllowed:true},{status:'accepted-inert-subset',profile:'ltc-inert-html-v1',sanitized:false,resourceFetchesAllowed:false,override:true}]){
  const x=fixture();x.input.receipt.artifacts.find(a=>a.role==='html').htmlSafety=safety;assert.ok(blocked(x).errors.includes('verified_inert_html_profile_required'));
 }
});

// Synthetic external coordinator observations only, never production trust creation.
function policyFixture(s){
 Object.assign(s,{url:'https://api.exchange.coinbase.com/products/BTC-USD/ticker',metricKind:'venue-quote',snapshotSha256:'e'.repeat(64),parserId:'coinbase-ticker',parserVersion:'1',publisherId:'coinbase',evidence:{path:'evidence/btc.json',sha256:'e'.repeat(64),retrievedAt:s.retrievedAt}});
 const key=JSON.stringify([s.id,s.url,s.metricKind]);
 return {trustedSourcePolicies:{[key]:{classification:'current',publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion,maxRetrievalAgeSeconds:7200,maxEffectiveAgeSeconds:7200}},trustedEvidence:{[key]:{bytesObserved:true,sourceId:s.id,url:s.url,snapshotSha256:s.snapshotSha256,path:s.evidence.path,retrievedAt:s.retrievedAt,publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion}}};
}
test('admission cannot trust a source-selected24h window, provenance or historical waiver',()=>{
 const x=fixture(),s=x.input.receipt.validation.manifest.sources[0];s.effectiveAt='2026-11-16T16:59:59Z';s.maxRetrievalAgeSeconds=86400;s.maxEffectiveAgeSeconds=86400;assert.ok(blocked(x).errors.includes('source_effective_value_stale'));
 const y=fixture();delete y.trusted.trustedEvidence;assert.ok(blocked(y).errors.includes('external_source_policy_and_evidence_required'));
 const z=fixture();z.input.receipt.validation.manifest.sources[0].classification='historical';assert.ok(blocked(z).errors.includes('unknown_or_mismatched_source_policy'));
});
