import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCloudNewsroomV2Coordinator,normalizeCloudNewsroomV2CoordinatorRequest} from './cloud-newsroom-v2-coordinator.mjs';
function fixture(){
 let version=1,time='2026-11-16T19:00:00Z';const calls=[];
 let value={schemaVersion:1,generation:'cloud-newsroom-v2',branch:'agent/cloud-newsroom-v2-20261116',enabled:true,previewEnabled:true,publicationEnabled:true,emergencyStop:false,oldWritersDisabled:true,approvedCodeCommit:'a'.repeat(40),repository:'Satnam-Satoshi/Satoshi-Langar',projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',domains:['ltcmagazine.org','satnamsatoshi.com'],expectedDomains:{'ltcmagazine.org':'old','satnamsatoshi.com':'old'},fence:0,completed:[],run:null,lease:null};
 const req={branch:value.branch,candidateTreeGitSha:'d'.repeat(40),receiptSha256:'e'.repeat(64),reviewDigest:'f'.repeat(64),owner:'coordinator',runId:'run-1',editionDate:'2026-11-16',candidateCommit:'b'.repeat(40),artifactSha256:'c'.repeat(64),pdfSha256:'c'.repeat(64),reviewedCodeCommit:value.approvedCodeCommit,repository:value.repository,projectId:value.projectId,admission:{branch:value.branch,candidateTreeGitSha:'d'.repeat(40),receiptSha256:'e'.repeat(64),reviewDigest:'f'.repeat(64),status:'eligible-for-preview-review',candidateCommit:'b'.repeat(40),artifactSha256:'c'.repeat(64),pdfSha256:'c'.repeat(64),reviewedCodeCommit:value.approvedCodeCommit,expiresAt:'2026-11-16T20:00:00Z'},approval:{approved:true,projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',deploymentId:'new',sourceCommit:'b'.repeat(40),artifactSha256:'c'.repeat(64),pdfSha256:'c'.repeat(64),domains:[...value.domains],expiresAt:'2026-11-16T20:00:00Z'}};
 const domainState=Object.fromEntries(value.domains.map(d=>[d,'old']));
 const adapters={archive:{persistQa:async args=>({verified:true,kind:'private-qa-receipt',sha256:'e'.repeat(64),bytes:100,locator:{provider:'google-drive',folderId:'private-folder',fileId:'qa-'+args.phase},phase:args.phase,deploymentId:args.deploymentId,sourceCommit:args.sourceCommit,projectId:args.projectId})},admission:{observeGrant:async()=>structuredClone(value)},clock:async()=>time,state:{read:async ns=>{assert.equal(ns,'cloud-newsroom-v2');return {version,value:structuredClone(value)};},cas:async(ns,expected,next)=>{calls.push('cas:'+next.run?.phase);if(expected!==version)return {ok:false};value=structuredClone(next);version++;return {ok:true,version};}},provider:{createPreview:async args=>{assert.equal(value.run.phase,'create-intent');assert.equal(args.production,false);assert.equal(args.target,'preview');calls.push('create');return {id:'new'};},getDeployment:async()=>({id:'new',projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',sourceCommit:req.candidateCommit,repository:'Satnam-Satoshi/Satoshi-Langar',target:'preview',status:'READY'}),getDomainDeployment:async({domain})=>({deploymentId:domainState[domain],projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx'}),promote:async args=>{assert.equal(value.run.phase,'promotion-intent');calls.push('promote');for(const d of args.domains)domainState[d]='new';}},qa:{verify:async args=>({...args,passed:true,expiresAt:'2026-11-16T20:00:00Z'}),verifyPublic:async args=>({...args,passed:true,checkedAt:time,expiresAt:'2026-11-16T20:00:00Z',domainObservations:args.domains.map(domain=>({domain,routesPassed:true,pdfBytesPassed:true,pdfSha256:args.pdfSha256}))})}};
 const coordinator=createCloudNewsroomV2Coordinator(adapters);
 return {req,adapters,calls,domains:domainState,advance:()=>coordinator.advance(req),state:()=>value,mutate:fn=>{fn(value);version++;},time:t=>{time=t;}};
}
test('executes durable claim/create/READY/QA/promotion/reconciliation sequence',async()=>{
 const x=fixture();assert.equal((await x.advance()).status,'awaiting-preview');assert.equal(x.state().fence,1);assert.equal((await x.advance()).status,'preview-verified');assert.equal((await x.advance()).status,'awaiting-reconciliation');assert.equal((await x.advance()).status,'published-verified');assert.equal(x.state().completed.length,1);assert.equal(x.state().run,null);assert.equal((await x.advance()).status,'duplicate-no-op');assert.equal(x.calls.filter(x=>x==='promote').length,1);
 x.req.artifactSha256='d'.repeat(64);x.req.admission.artifactSha256=x.req.artifactSha256;x.req.pdfSha256='d'.repeat(64);x.req.admission.pdfSha256=x.req.pdfSha256;assert.equal((await x.advance()).status,'hold');
});
test('disabled, stopped, mismatched pins, absent admission and CAS conflict never create',async()=>{
 for(const mutate of [x=>x.mutate(s=>s.enabled=false),x=>x.mutate(s=>s.previewEnabled=false),x=>x.mutate(s=>s.emergencyStop=true),x=>x.req.reviewedCodeCommit='d'.repeat(40),x=>delete x.req.admission,x=>x.adapters.state.cas=async()=>({ok:false})]){const x=fixture();mutate(x);assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('create'));}
});
test('creation uncertainty persists intent and never retries',async()=>{
 const x=fixture();let effects=0;x.adapters.provider.createPreview=async()=>{effects++;throw Error('timeout after side effect');};assert.equal((await x.advance()).status,'hold');assert.equal(x.state().run.phase,'create-intent');assert.equal((await x.advance()).status,'hold');assert.equal(effects,1);
});
test('READY source mismatch, truthy QA, expired QA and wrong bindings hold',async()=>{
 for(const mutate of [x=>x.adapters.provider.getDeployment=async()=>({id:'new',sourceCommit:'wrong'}),x=>x.adapters.qa.verify=async()=>({passed:'true'}),x=>x.adapters.qa.verify=async args=>({...args,passed:true,expiresAt:'2026-11-16T18:00:00Z'})]){const x=fixture();await x.advance();mutate(x);assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('promote'));}
 const x=fixture();await x.advance();x.adapters.provider.getDeployment=async()=>({id:'new',projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',sourceCommit:x.req.candidateCommit,repository:'Satnam-Satoshi/Satoshi-Langar',target:'preview',status:'BUILDING'});assert.equal((await x.advance()).status,'awaiting-preview');
});
test('publication enabled, approval exact domains and baseline are required',async()=>{
 for(const mutate of [x=>x.mutate(s=>s.publicationEnabled=false),x=>x.req.approval.domains=['ltcmagazine.org'],x=>x.req.approval.approved='true',x=>x.domains['ltcmagazine.org']='manual-change']){const x=fixture();await x.advance();await x.advance();mutate(x);assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('promote'));}
});
test('uncertain promotion reconciles without retry; partial outcome stays hold',async()=>{
 const x=fixture();await x.advance();await x.advance();let promoted=0;x.adapters.provider.promote=async()=>{promoted++;x.domains['ltcmagazine.org']='new';throw Error('partial');};assert.equal((await x.advance()).status,'awaiting-reconciliation');assert.equal((await x.advance()).status,'hold');assert.equal(promoted,1);x.domains['satnamsatoshi.com']='new';assert.equal((await x.advance()).status,'published-verified');assert.equal(promoted,1);
});
test('emergency stop after intent prevents effect, sameowner safe lease renews monotonically',async()=>{
 const x=fixture(),original=x.adapters.state.cas;x.adapters.state.cas=async(...args)=>{const r=await original(...args);if(args[2].run?.phase==='create-intent')x.mutate(s=>s.emergencyStop=true);return r;};assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('create'));
 const y=fixture();await y.advance();y.time('2026-11-16T19:03:00Z');assert.equal((await y.advance()).status,'preview-verified');assert.equal(y.state().fence,2);
 const z=fixture();z.adapters.provider.createPreview=async()=>{throw Error();};await z.advance();z.time('2026-11-16T19:03:00Z');assert.equal((await z.advance()).reason,'expired_lease_uncertain_effect_requires_reconciliation');assert.equal(z.state().fence,1);
});
test('no imports, credentials discovery, network implementation or ambient clock',()=>{const src=readFileSync(new URL('./cloud-newsroom-v2-coordinator.mjs',import.meta.url),'utf8');assert.doesNotMatch(src,/^import\s|\bfetch\s*\(|process\.|Date\.now\s*\(/m);});

import {evaluateCooperativePreview} from './cloud-newsroom-v2-cooperative-preview.mjs';
test('same intent CAS produces state accepted by real provider cooperative gate before create',async()=>{
 const x=fixture(),create=x.adapters.provider.createPreview;
 x.adapters.provider.createPreview=async args=>{
  const state=x.state(),g=state.previewGrant;
  assert.equal(state.run.phase,'create-intent');assert.equal(g.fence,state.fence);assert.equal(g.owner,state.lease.owner);assert.ok(Date.parse(g.expiresAt)<=Date.parse(state.lease.expiresAt));assert.equal(typeof state.lease.expiresAt,'string');
  const env={VERCEL_PROJECT_ID:state.projectId,VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_GIT_REPO_OWNER:'Satnam-Satoshi',VERCEL_GIT_REPO_SLUG:'Satoshi-Langar',VERCEL_GIT_COMMIT_REF:state.branch,VERCEL_GIT_COMMIT_SHA:x.req.candidateCommit};
  const options={env,git:ref=>ref==='HEAD'?x.req.candidateCommit:x.req.candidateTreeGitSha,now:Date.parse('2026-11-16T19:00:00Z'),fetcher:async()=>new Response(JSON.stringify(state))};
  assert.equal(await evaluateCooperativePreview(options),true);
  for(const mutate of [v=>v.emergencyStop=true,v=>v.previewEnabled=false,v=>v.fence++,v=>v.previewGrant.candidateTreeGitSha='a'.repeat(40)]){const bad=structuredClone(state);mutate(bad);assert.equal(await evaluateCooperativePreview({...options,fetcher:async()=>new Response(JSON.stringify(bad))}),false);}
  return create(args);
 };
 assert.equal((await x.advance()).status,'awaiting-preview');await x.advance();await x.advance();assert.equal((await x.advance()).status,'published-verified');assert.equal(x.state().previewGrant,null);
});
test('missing schema, wrong canonical branch and unbound candidate tree/receipt/review deny',async()=>{
 for(const mutate of [x=>x.mutate(s=>delete s.schemaVersion),x=>x.mutate(s=>s.branch='main'),x=>x.req.branch='main',x=>x.req.candidateTreeGitSha='a'.repeat(40),x=>x.req.receiptSha256='a'.repeat(64),x=>x.req.reviewDigest='a'.repeat(64)]){const x=fixture();mutate(x);assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('create'));}
});
test('queued deployment renews exact grant with monotonic fence, without another create',async()=>{
 const x=fixture();await x.advance();const old=structuredClone(x.state().previewGrant);x.time('2026-11-16T19:03:00Z');
 x.adapters.provider.getDeployment=async()=>({id:'new',projectId:x.req.projectId,sourceCommit:x.req.candidateCommit,repository:x.req.repository,target:'preview',status:'BUILDING'});
 assert.equal((await x.advance()).status,'awaiting-preview');const state=x.state();assert.equal(state.fence,old.fence+1);assert.equal(state.previewGrant.fence,state.fence);assert.equal(state.run.deploymentId,'new');assert.equal(x.calls.filter(c=>c==='create').length,1);
 const env={VERCEL_PROJECT_ID:state.projectId,VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_GIT_REPO_OWNER:'Satnam-Satoshi',VERCEL_GIT_REPO_SLUG:'Satoshi-Langar',VERCEL_GIT_COMMIT_REF:state.branch,VERCEL_GIT_COMMIT_SHA:x.req.candidateCommit};
 const args={env,git:r=>r==='HEAD'?x.req.candidateCommit:x.req.candidateTreeGitSha,now:Date.parse('2026-11-16T19:03:00Z'),fetcher:async()=>new Response(JSON.stringify(state))};
 assert.equal(await evaluateCooperativePreview(args),true);assert.equal(await evaluateCooperativePreview({...args,fetcher:async()=>new Response(JSON.stringify({...state,previewGrant:old}))}),false);
});
test('expired admission cannot renew; QA expiry stays fixed and no create repeats',async()=>{
 const x=fixture();await x.advance();x.time('2026-11-16T20:01:00Z');assert.equal((await x.advance()).reason,'fresh_external_admission_required');assert.equal(x.state().fence,1);
 const y=fixture();await y.advance();await y.advance();const expiry=y.state().run.qa.expiresAt;y.time('2026-11-16T19:03:00Z');y.mutate(s=>s.publicationEnabled=false);assert.equal((await y.advance()).status,'hold');assert.equal(y.state().fence,2);assert.equal(y.state().run.qa.expiresAt,expiry);assert.equal(y.calls.filter(c=>c==='create').length,1);
});
test('CAS readback mismatch and same-version ownership tampering cannot reach effects',async()=>{
 const x=fixture(),cas=x.adapters.state.cas;x.adapters.state.cas=async(...args)=>{const written=await cas(...args);return {...written,version:'wrong'};};assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('create'));
 const y=fixture(),read=y.adapters.state.read;let reads=0;y.adapters.state.read=async(...args)=>{const r=await read(...args);if(++reads===3)r.value.lease.owner='other';return r;};assert.equal((await y.advance()).status,'hold');assert.ok(!y.calls.includes('create'));
});
test('alias success alone never completes publication; public PDF and route QA must bind both domains',async()=>{
 for(const change of [q=>q.passed='true',q=>q.sourceCommit='a'.repeat(40),q=>q.domainObservations[0].pdfSha256='a'.repeat(64),q=>q.domainObservations[0].routesPassed=false,q=>q.domainObservations.pop(),q=>q.checkedAt='2026-11-16T18:59:59Z',q=>q.expiresAt='2026-11-16T19:00:00Z']){
  const x=fixture();await x.advance();await x.advance();await x.advance();const verify=x.adapters.qa.verifyPublic;x.adapters.qa.verifyPublic=async args=>{const q=await verify(args);change(q);return q;};
  assert.equal((await x.advance()).status,'hold');assert.equal(x.state().completed.length,0);assert.equal(x.state().run.phase,'public-qa-pending');assert.equal(x.calls.filter(c=>c==='promote').length,1);
  x.adapters.qa.verifyPublic=verify;assert.equal((await x.advance()).status,'published-verified');assert.equal(x.calls.filter(c=>c==='promote').length,1);
 }
});
test('promotion reconciliation after lease expiry is read-only and never repeats promote',async()=>{
 const x=fixture();await x.advance();await x.advance();await x.advance();x.time('2026-11-16T19:03:00Z');assert.equal((await x.advance()).status,'published-verified');assert.equal(x.state().fence,2);assert.equal(x.calls.filter(c=>c==='create').length,1);assert.equal(x.calls.filter(c=>c==='promote').length,1);assert.equal(x.state().completed[0].publicQa.passed,true);
 const y=fixture();await y.advance();await y.advance();await y.advance();const verify=y.adapters.qa.verifyPublic;y.adapters.qa.verifyPublic=async()=>{throw Error('HTTP timeout');};assert.equal((await y.advance()).status,'hold');y.time('2026-11-16T19:03:00Z');y.adapters.qa.verifyPublic=verify;assert.equal((await y.advance()).status,'published-verified');assert.equal(y.calls.filter(c=>c==='promote').length,1);
});
test('alias change during public QA and emergency stop prevent verified completion',async()=>{
 for(const alter of [x=>x.domains['ltcmagazine.org']='manual-change',x=>x.mutate(s=>s.emergencyStop=true)]){const x=fixture();await x.advance();await x.advance();await x.advance();const verify=x.adapters.qa.verifyPublic;x.adapters.qa.verifyPublic=async args=>{const q=await verify(args);alter(x);return q;};assert.equal((await x.advance()).status,'hold');assert.equal(x.state().completed.length,0);assert.equal(x.calls.filter(c=>c==='promote').length,1);}
});

// Integration fixture exercises the real data evaluator, not a forged proposal.
import {createHash} from 'node:crypto';
import {evaluateCloudNewsroomV2DataAdmission,PDF_REGISTRY_PATH} from './cloud-newsroom-v2-data-admission.mjs';
import {projectReceiptToPdfRegistry} from './lib/ltc-pdf-receipt.mjs';
import {inspectCloudNewsroomV2Html} from './cloud-newsroom-v2-html-safety.mjs';
const inertHtmlFixture='<!doctype html><html><head><title>Fixture</title></head><body><p>Synthetic.</p></body></html>';
const hash=v=>createHash('sha256').update(v).digest('hex'),pin='a'.repeat(40),impl='b'.repeat(40),implHash='c'.repeat(64);
const entry=(path,text)=>({path,mode:'100644',sha256:hash(text),bytes:Buffer.byteLength(text)});
function normalizationReceipt(date='2026-11-16'){
 const id=`ltc-daily-${date}`,artifacts=['pdf','html','cover','promo'].map((role,i)=>({role,path:`artifacts/${date}/r1/${role}`,editionId:id,editionDate:date,revision:1,sha256:hash(date+role),bytes:100+i,mimeType:i===0?'application/pdf':i===1?'text/html':'image/png',...(i===0?{pages:29}:{})}));
 return {status:'accepted-receipt',errors:[],operational:false,effects:[],artifacts:artifacts.map(a=>({...a,verification:'actual-local-file-bytes',...(a.role==='html'?{htmlSafety:inspectCloudNewsroomV2Html(Buffer.from(inertHtmlFixture))}:{})})),coverDimensions:{width:675,height:900,verification:'png-ihdr-with-crc',renderVerified:false},publication:{registryId:`${date}-r1`,page:`/conversations/editions/${date}/`,canonicalUrl:`https://ltcmagazine.org/conversations/editions/${date}/`,title:'Synthetic source-led daily',dek:'Test evidence, not a publication claim.',preparedAt:`${date}T18:59:30Z`,preparedDate:date},validation:{status:'validated-description',errors:[],manifest:{schemaVersion:1,generation:'cloud-newsroom-v2',kind:'daily',editionId:id,editionDate:date,revision:1,sourceCommit:pin,implementationCommit:impl,implementationSha256:implHash,preparedAt:`${date}T18:59:30Z`,artifacts,correction:null,sources:[{id:'btc',status:'verified',claimVerified:true,classification:'current',value:123,publishedAt:null,eventAt:null,effectiveAt:`${date}T18:58:00Z`,retrievedAt:`${date}T18:59:00Z`,maxRetrievalAgeSeconds:180,maxEffectiveAgeSeconds:300}]}}};
}
function normalizationCandidate(trusted,r=normalizationReceipt(),candidateCommit='f'.repeat(40)){
 Object.assign(trusted,policyFixture(r.validation.manifest.sources[0]));
 const projection=projectReceiptToPdfRegistry(JSON.parse(trusted.currentRegistryText),r),text=JSON.stringify(projection.registry,null,2)+'\n';
 return {now:`${r.validation.manifest.editionDate}T19:00:00Z`,candidateCommit,candidateParents:[trusted.priorCommit],candidateRegistryText:text,receipt:r,candidateTree:[...structuredClone(trusted.priorTree.filter(e=>e.path!==PDF_REGISTRY_PATH)),entry(PDF_REGISTRY_PATH,text),...projection.assetCopies.map(a=>({path:a.destination,mode:'100644',sha256:a.sha256,bytes:a.bytes}))]};
}
function normalizationFixture(){
 const old={id:'2026-11-15-r1',date:'2026-11-15',revision:1,title:'Prior title',dek:'Prior historical record.',preparedDate:'2026-11-15',pdf:'/magazine/daily/legacy.pdf',cover:'/magazine/daily/legacy.png',pages:28,bytes:8,sha256:hash('old pdf!'),coverBytes:8,coverSha256:hash('old png!'),coverWidth:675,coverHeight:900,correction:null};
 const currentRegistryText=JSON.stringify({schemaVersion:1,current:old.id,issues:[old]},null,2)+'\n';
 const invariantTree=[entry('app/page.tsx','reviewed code'),entry('vercel.json','reviewed guard'),entry('.github/workflows/release.yml','reviewed workflow'),entry('scripts/lib/ltc-pdf-registry.mjs','reviewed registry code'),entry('public'+old.pdf,'old pdf!'),entry('public'+old.cover,'old png!')];
 const trusted={priorCommit:'d'.repeat(40),currentRegistryText,priorTree:[...structuredClone(invariantTree),entry(PDF_REGISTRY_PATH,currentRegistryText)],legacyRouteIds:[],priorArtifactInventory:[],review:{sourceCommit:pin,implementationCommit:impl,implementationSha256:implHash,notBefore:'2026-11-16T18:00:00Z',expiresAt:'2026-11-18T00:00:00Z',invariantTree}};
 return {trusted,input:normalizationCandidate(trusted)};
}
function policyFixture(s){
 Object.assign(s,{url:'https://api.exchange.coinbase.com/products/BTC-USD/ticker',metricKind:'venue-quote',snapshotSha256:'e'.repeat(64),parserId:'coinbase-ticker',parserVersion:'1',publisherId:'coinbase',evidence:{kind:'snapshot',path:'evidence/btc.json',sha256:'e'.repeat(64),retrievedAt:s.retrievedAt}});
 const key=JSON.stringify([s.id,s.url,s.metricKind]);
 return {trustedSourcePolicies:{[key]:{classification:'current',publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion,maxRetrievalAgeSeconds:7200,maxEffectiveAgeSeconds:7200}},trustedEvidence:{[key]:{kind:'snapshot',bytesObserved:true,sourceId:s.id,url:s.url,snapshotSha256:s.snapshotSha256,path:s.evidence.path,retrievedAt:s.retrievedAt,publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion}}};
}function normalizationInputs(){const x=normalizationFixture(),evaluation=evaluateCloudNewsroomV2DataAdmission(x.input,x.trusted);assert.equal(evaluation.status,'eligible-for-preview-review');return {receipt:x.input.receipt,evaluation,evaluatorInput:x.input,observed:{receipt:structuredClone(x.input.receipt),candidateCommit:x.input.candidateCommit,candidateTreeGitSha:'d'.repeat(40),receiptSha256:hash(JSON.stringify(x.input.receipt)),reviewDigest:'e'.repeat(64),repository:'Satnam-Satoshi/Satoshi-Langar',branch:'agent/cloud-newsroom-v2-20261116',projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx'},owner:'coordinator',runId:'normalized-run'};}
test('real evaluator and accepted receipt normalize explicit PDF identity, never caller digest',()=>{
 const x=normalizationInputs();x.artifactSha256='f'.repeat(64);x.pdfSha256='f'.repeat(64);const out=normalizeCloudNewsroomV2CoordinatorRequest(x),pdf=x.receipt.artifacts.find(a=>a.role==='pdf');assert.equal(out.pdfSha256,pdf.sha256);assert.equal(out.artifactSha256,pdf.sha256);assert.equal(out.admission.pdfSha256,pdf.sha256);assert.equal(out.receiptSha256,x.observed.receiptSha256);assert.notEqual(out.pdfSha256,out.receiptSha256);
});
test('normalizer rejects mismatched evaluated receipt, source/tree and PDF mappings',()=>{
 for(const mutate of [x=>x.observed.receipt.artifacts[0].sha256='f'.repeat(64),x=>x.evaluatorInput.candidateCommit='a'.repeat(40),x=>x.observed.candidateCommit='a'.repeat(40),x=>x.evaluation={...x.evaluation,status:'blocked'},x=>x.evaluatorInput.candidateTree.find(e=>e.path.endsWith('edition.pdf')).sha256='f'.repeat(64),x=>x.evaluatorInput.candidateTree.find(e=>e.path.endsWith('reader.html')).bytes++,x=>x.observed.receiptSha256=null]){const x=normalizationInputs();mutate(x);assert.throws(()=>normalizeCloudNewsroomV2CoordinatorRequest(x));}
});
test('rolling completed pointer stays compact while Git CAS history can retain prior versions',async()=>{
 const x=fixture(),history=[],cas=x.adapters.state.cas;
 x.mutate(s=>s.completed=[{editionDate:'2026-11-15',pdfSha256:'a'.repeat(64),artifactSha256:'a'.repeat(64),candidateCommit:'a'.repeat(40),deploymentId:'prior',publicQa:{passed:true}}]);
 x.adapters.state.cas=async(...args)=>{history.push(structuredClone(x.state()));return cas(...args);};
 const verify=x.adapters.qa.verifyPublic;x.adapters.qa.verifyPublic=async args=>({...await verify(args),verboseRouteObservations:Array.from({length:1000},(_,i)=>({url:'https://ltcmagazine.org/long-route-'+i,details:'X'.repeat(100)}))});
 await x.advance();await x.advance();await x.advance();assert.equal((await x.advance()).status,'published-verified');
 assert.equal(x.state().completed.length,1);assert.equal(x.state().completed[0].editionDate,'2026-11-16');assert.ok(!Object.hasOwn(x.state().completed[0].publicQa,'domainObservations'));assert.ok(!Object.hasOwn(x.state().completed[0].publicQa,'verboseRouteObservations'));assert.ok(JSON.stringify(x.state()).length<4096);assert.ok(history.some(s=>s.completed[0]?.editionDate==='2026-11-15'));
});
test('monotonic latest date blocks old replay and latest conflict; same latest PDF is no-op',async()=>{
 const x=fixture();await x.advance();await x.advance();await x.advance();await x.advance();const count=x.calls.length;
 assert.equal((await x.advance()).status,'duplicate-no-op');
 x.req.editionDate='2026-11-15';assert.equal((await x.advance()).status,'hold');
 x.req.editionDate='2026-11-16';x.req.pdfSha256='a'.repeat(64);x.req.admission.pdfSha256=x.req.pdfSha256;assert.equal((await x.advance()).status,'hold');assert.equal(x.calls.length,count);
});
test('fixed24KiB UTF8 current-state bound fails before oversized CAS or provider effect',async()=>{
 const x=fixture();x.req.runId='界'.repeat(10000);assert.equal((await x.advance()).status,'hold');assert.equal(x.calls.length,0);
 const y=fixture();y.mutate(s=>s.unrecognizedLargeField='X'.repeat(25000));assert.equal((await y.advance()).status,'hold');assert.equal(y.calls.length,0);
 const z=fixture();z.mutate(s=>s.completed=[{editionDate:'2026-11-14',pdfSha256:'a'.repeat(64)},{editionDate:'2026-11-15',pdfSha256:'a'.repeat(64)}]);assert.equal((await z.advance()).status,'hold');assert.equal(z.calls.length,0);
});
test('stale CDN state causes awaiting-grant and never create until exact grant visible',async()=>{
 const x=fixture(),cached=structuredClone(x.state());x.adapters.admission.observeGrant=async()=>cached;
 assert.equal((await x.advance()).status,'awaiting-grant');assert.equal(x.state().run.phase,'grant-pending');assert.ok(!x.calls.includes('create'));assert.equal((await x.advance()).status,'awaiting-grant');assert.ok(!x.calls.includes('create'));
 x.adapters.admission.observeGrant=async args=>{assert.deepEqual(args.expectedGrant,x.state().previewGrant);assert.equal(args.fence,x.state().fence);return structuredClone(x.state());};
 assert.equal((await x.advance()).status,'awaiting-preview');assert.equal(x.calls.filter(c=>c==='create').length,1);
});
test('expired grant-pending lease refreshes monotonically but still waits for CDN visibility',async()=>{
 const x=fixture(),cached=structuredClone(x.state());x.adapters.admission.observeGrant=async()=>cached;await x.advance();const first=structuredClone(x.state());x.time('2026-11-16T19:03:00Z');x.adapters.admission.observeGrant=async()=>first;
 assert.equal((await x.advance()).status,'awaiting-grant');assert.equal(x.state().fence,2);assert.equal(x.state().previewGrant.fence,2);assert.equal(x.state().run.phase,'grant-pending');assert.ok(!x.calls.includes('create'));
 x.adapters.admission.observeGrant=async()=>structuredClone(x.state());assert.equal((await x.advance()).status,'awaiting-preview');assert.equal(x.calls.filter(c=>c==='create').length,1);
});
test('boolean, changed candidate grant, absent authority and emergencyStop cannot authorize create',async()=>{
 for(const observation of [x=>true,x=>({...structuredClone(x.state()),emergencyStop:true}),x=>({...structuredClone(x.state()),enabled:false}),x=>({...structuredClone(x.state()),previewGrant:{...x.state().previewGrant,candidateTreeGitSha:'a'.repeat(40)}}),x=>({...structuredClone(x.state()),lease:{...x.state().lease,owner:'someone-else'}})]){
  const x=fixture();x.adapters.admission.observeGrant=async()=>observation(x);assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('create'));assert.equal(x.state().run.phase,'grant-pending');
 }
});
test('visibility read timeout has no create side effect and can retry observation only',async()=>{
 const x=fixture();x.adapters.admission.observeGrant=async()=>{throw Error('CDN timeout');};assert.equal((await x.advance()).status,'awaiting-grant');assert.ok(!x.calls.includes('create'));x.adapters.admission.observeGrant=async()=>structuredClone(x.state());assert.equal((await x.advance()).status,'awaiting-preview');assert.equal(x.calls.filter(c=>c==='create').length,1);
});
test('admission expiry during domain read or promotion intent CAS prevents promote',async()=>{
 for(const mode of ['domain-read','promotion-cas']){
  const x=fixture();x.req.admission.expiresAt='2026-11-16T19:00:30Z';await x.advance();await x.advance();
  if(mode==='domain-read'){const get=x.adapters.provider.getDomainDeployment;x.adapters.provider.getDomainDeployment=async args=>{const r=await get(args);x.time('2026-11-16T19:00:31Z');return r;};}
  else{const cas=x.adapters.state.cas;x.adapters.state.cas=async(...args)=>{const r=await cas(...args);if(args[2].run?.phase==='promotion-intent')x.time('2026-11-16T19:00:31Z');return r;};}
  assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('promote'));
 }
});
test('admission expiry during grant observation or create intent CAS prevents create',async()=>{
 for(const mode of ['grant-read','create-cas']){
  const x=fixture();x.req.admission.expiresAt='2026-11-16T19:00:30Z';
  if(mode==='grant-read')x.adapters.admission.observeGrant=async()=>{x.time('2026-11-16T19:00:31Z');return structuredClone(x.state());};
  else{const cas=x.adapters.state.cas;x.adapters.state.cas=async(...args)=>{const r=await cas(...args);if(args[2].run?.phase==='create-intent')x.time('2026-11-16T19:00:31Z');return r;};}
  assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('create'));
 }
});
test('missing archive adapter or failed preview archive cannot reach promotion',async()=>{
 const x=fixture();delete x.adapters.archive;assert.throws(()=>createCloudNewsroomV2Coordinator(x.adapters),/explicit_adapters_required/);
 const y=fixture();await y.advance();y.adapters.archive.persistQa=async()=>{throw Error('archive unavailable');};assert.equal((await y.advance()).status,'hold');assert.equal(y.state().run.phase,'preview-recorded');assert.ok(!y.calls.includes('promote'));
});
test('archive receipt wrong identity, phase, hash, unverified or URL locator holds preview',async()=>{
 for(const mutate of [r=>r.verified=false,r=>r.sourceCommit='a'.repeat(40),r=>r.phase='public',r=>r.sha256='not-a-hash',r=>r.locator.fileId='https://secret.example/token',r=>r.locator.url='https://example.com',r=>r.bytes=0]){
  const x=fixture();await x.advance();const archive=x.adapters.archive.persistQa;x.adapters.archive.persistQa=async args=>{const r=await archive(args);mutate(r);return r;};assert.equal((await x.advance()).status,'hold');assert.equal(x.state().run.phase,'preview-recorded');assert.ok(!x.calls.includes('promote'));
 }
});
test('public archive failure keeps reconciliation pending; successful retry stores only bound references',async()=>{
 const x=fixture();await x.advance();await x.advance();await x.advance();const archive=x.adapters.archive.persistQa,proofs=[];
 x.adapters.archive.persistQa=async args=>{proofs.push(args);if(args.phase==='public')throw Error('readback failed');return archive(args);};assert.equal((await x.advance()).status,'hold');assert.equal(x.state().completed.length,0);assert.equal(x.state().run.phase,'public-qa-pending');
 x.adapters.archive.persistQa=async args=>{proofs.push(args);return archive(args);};assert.equal((await x.advance()).status,'published-verified');const done=x.state().completed[0];assert.equal(done.previewQaArchive.phase,'preview');assert.equal(done.publicQaArchive.phase,'public');assert.equal(done.publicQaArchive.verified,true);assert.ok(!Object.hasOwn(done.publicQaArchive,'proof'));assert.ok(proofs.every(p=>p.proof.domainObservations.length===2));assert.equal(x.calls.filter(c=>c==='promote').length,1);
});
test('public state and result never contain validated private archive folder/file identifiers',async()=>{
 const x=fixture(),cas=x.adapters.state.cas,archive=x.adapters.archive.persistQa,states=[],results=[];
 x.adapters.archive.persistQa=async args=>({...await archive(args),locator:{provider:'google-drive',folderId:'PRIVATE_FOLDER_DO_NOT_PUBLISH_123',fileId:'PRIVATE_FILE_DO_NOT_PUBLISH_'+args.phase}});
 x.adapters.state.cas=async(...args)=>{states.push(structuredClone(args[2]));return cas(...args);};
 for(let i=0;i<4;i++)results.push(await x.advance());assert.equal(results.at(-1).status,'published-verified');
 for(const value of [...states,...results]){const json=JSON.stringify(value);assert.doesNotMatch(json,/PRIVATE_FOLDER_DO_NOT_PUBLISH|PRIVATE_FILE_DO_NOT_PUBLISH|folderId|fileId|google-drive|"locator"|https?:\/\//);}
 const done=x.state().completed[0];assert.equal(done.publicQaArchive.verified,true);assert.match(done.publicQaArchive.sha256,/^[a-f0-9]{64}$/);assert.equal(done.publicQaArchive.phase,'public');
});
test('legacy state archive locator cannot leak into completion',async()=>{
 const x=fixture();await x.advance();await x.advance();x.mutate(s=>s.run.previewQaArchive.locator={provider:'google-drive',folderId:'private-folder',fileId:'private-file'});assert.equal((await x.advance()).status,'hold');assert.ok(!x.calls.includes('promote'));
});
test('delayed promotion outcome reconciles expired source evidence with explicit stale result and no Vercel writes',async()=>{
 const x=fixture();x.req.admission.expiresAt='2026-11-16T19:01:00Z';await x.advance();await x.advance();
 const promote=x.adapters.provider.promote;x.adapters.provider.promote=async args=>{await promote(args);throw Error('provider committed but response lost');};
 assert.equal((await x.advance()).status,'awaiting-reconciliation');x.time('2026-11-16T19:03:00Z');
 const writes=x.calls.filter(c=>c==='create'||c==='promote').length,r=await x.advance();assert.equal(r.status,'published-reconciled-stale-evidence');assert.equal(r.sourceEvidenceStale,true);assert.equal(r.sourceEvidenceExpiresAt,'2026-11-16T19:01:00Z');assert.match(r.reason,/no_freshness_claim/);assert.equal(x.calls.filter(c=>c==='create'||c==='promote').length,writes);assert.equal(x.state().completed[0].sourceEvidenceStale,true);
});
test('expired-source reconciliation still rejects immutable binding drift and cannot resume new effects',async()=>{
 const x=fixture();x.req.admission.expiresAt='2026-11-16T19:01:00Z';await x.advance();await x.advance();await x.advance();x.time('2026-11-16T19:03:00Z');x.req.candidateCommit='a'.repeat(40);x.req.admission.candidateCommit=x.req.candidateCommit;assert.equal((await x.advance()).status,'hold');assert.equal(x.state().completed.length,0);assert.equal(x.calls.filter(c=>c==='promote').length,1);
 const y=fixture();y.req.admission.expiresAt='2026-11-16T19:01:00Z';await y.advance();await y.advance();y.time('2026-11-16T19:03:00Z');const before=structuredClone(y.state());assert.equal((await y.advance()).reason,'fresh_external_admission_required');assert.deepEqual(y.state(),before);assert.ok(!y.calls.includes('promote'));
});
test('expired preview QA is rechecked and rearchived once for same READY candidate, not recreated or promoted',async()=>{
 const x=fixture(),verify=x.adapters.qa.verify,archive=x.adapters.archive.persistQa;let checks=0,archives=0;
 x.adapters.qa.verify=async args=>{checks++;return {...await verify(args),expiresAt:checks===1?'2026-11-16T19:00:30Z':'2026-11-16T19:05:00Z'};};
 x.adapters.archive.persistQa=async args=>{if(args.phase==='preview')archives++;return archive(args);};
 await x.advance();await x.advance();x.time('2026-11-16T19:01:00Z');const r=await x.advance();assert.equal(r.status,'preview-verified');assert.match(r.reason,/qa_refreshed/);assert.equal(checks,2);assert.equal(archives,2);assert.equal(x.state().run.qa.expiresAt,'2026-11-16T19:05:00Z');assert.equal(x.calls.filter(c=>c==='create').length,1);assert.ok(!x.calls.includes('promote'));
});
test('QA renewal cannot bypass source drift or retry a failing QA within same advance',async()=>{
 const x=fixture(),verify=x.adapters.qa.verify;let checks=0;x.adapters.qa.verify=async args=>{checks++;return {...await verify(args),expiresAt:'2026-11-16T19:00:30Z'};};await x.advance();await x.advance();x.time('2026-11-16T19:01:00Z');assert.equal((await x.advance()).status,'hold');assert.equal(checks,2);assert.ok(!x.calls.includes('promote'));
 const y=fixture();y.adapters.qa.verify=async args=>({...args,passed:true,expiresAt:'2026-11-16T19:00:30Z'});await y.advance();await y.advance();y.time('2026-11-16T19:01:00Z');y.adapters.provider.getDeployment=async()=>({id:'new',projectId:y.req.projectId,sourceCommit:'a'.repeat(40),repository:y.req.repository,target:'preview',status:'READY'});assert.equal((await y.advance()).reason,'preview_identity_mismatch');assert.ok(!y.calls.includes('promote'));
});
