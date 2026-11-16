import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, realpath, symlink, unlink, link, open, stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ingestCloudNewsroomV2Bundle, MAX_ARTIFACT_BYTES } from './cloud-newsroom-v2-ingest.mjs';
const GENERATION = 'cloud-newsroom-v2';
const PRODUCER = '6ab31b91763881918f6bfc2b20505366';
async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'ltc-v2-ingest-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const identity = { editionDate: '2026-11-16', editionId: 'ltc-daily-2026-11-16', revision: 1 };
  const producer = { id: PRODUCER, generation: GENERATION, kind: 'daily' }, artifacts = [];
  await mkdir(path.join(root, 'artifacts/2026-11-16/r1'), { recursive: true });
  for (const [role, mimeType, ext] of [['pdf', 'application/pdf', 'pdf'], ['html', 'text/html', 'html'], ['cover', 'image/png', 'png'], ['promo', 'image/png', 'png']]) {
    const content = role === 'cover' ? Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') : Buffer.from(role === 'html' ? '<!doctype html><html lang="en"><head><title>Fixture</title></head><body><h1>Synthetic edition</h1><p>Not publication evidence.</p></body></html>' : `synthetic-${role}-test-only-not-rendered`), relative = `artifacts/2026-11-16/r1/${role}.${ext}`;
    await writeFile(path.join(root, relative), content);
    artifacts.push({ ...identity, role, path: relative, sha256: createHash('sha256').update(content).digest('hex'), bytes: content.length, mimeType, url: null, ...(role === 'pdf' ? { pages: 29 } : {}) });
  }
  const request={ bundleRoot: root, now: '2026-11-16T19:00:00Z', expectedProducer: producer, existingDailyIssues: [], manifest: {
    schemaVersion: 1, generation: GENERATION, kind: 'daily', timezone: 'America/New_York', ...identity, producer: { ...producer }, sourceCommit: 'fd45e107ac37e537195b7311baeba8cd40b2f035', implementationCommit: 'a'.repeat(40), implementationSha256: 'b'.repeat(64), preparedAt: '2026-11-16T18:59:30Z', presentation: {title:'Synthetic daily edition',dek:'Test fixture, not public reporting.'}, artifacts,
    sources: [{ id: 'btc', url: 'https://api.exchange.coinbase.com/products/BTC-USD/ticker', primary: true, status: 'verified', claimVerified: true, value: 123.45, classification: 'current', label: null, publishedAt: null, eventAt: null, effectiveAt: '2026-11-16T18:58:00Z', retrievedAt: '2026-11-16T18:59:00Z', maxRetrievalAgeSeconds: 180, maxEffectiveAgeSeconds: 300 }],
    scope: { summary: 'Synthetic bounded test, never publication evidence.', coveredSourceIds: ['btc'], exclusions: ['Test has no verified live observation.'] }, gaps: [], correction: null,
    novelty: { verified: true, hasMaterialChange: true, checkedAt: '2026-11-16T18:59:30Z', producerId: PRODUCER, editionId: identity.editionId, revision: 1, pdfSha256: artifacts[0].sha256, comparedEditionKeys: [], summary: 'Synthetic novelty attestation for validator test only.' },
  } };
  Object.assign(request,policyFixture(request.manifest.sources[0]));return request;
}
function policyFixture(s){
 Object.assign(s,{url:'https://api.exchange.coinbase.com/products/BTC-USD/ticker',metricKind:'venue-quote',snapshotSha256:'e'.repeat(64),parserId:'coinbase-ticker',parserVersion:'1',publisherId:'coinbase',evidence:{kind:'snapshot',path:'evidence/btc.json',sha256:'e'.repeat(64),retrievedAt:s.retrievedAt}});
 const key=JSON.stringify([s.id,s.url,s.metricKind]);
 return {trustedSourcePolicies:{[key]:{classification:'current',publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion,maxRetrievalAgeSeconds:7200,maxEffectiveAgeSeconds:7200}},trustedEvidence:{[key]:{kind:'snapshot',bytesObserved:true,sourceId:s.id,url:s.url,snapshotSha256:s.snapshotSha256,path:s.evidence.path,retrievedAt:s.retrievedAt,publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion}}};
}
import {createCloudNewsroomV2PublicationRunner} from './cloud-newsroom-v2-publication-runner.mjs';
import {gitTreeFromFileEntries} from './cloud-newsroom-v2-candidate-transport.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'), blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
const envelope=p=>({structuredContent:p}), raw=p=>envelope({content:JSON.stringify(p)});
async function setup(t,permissions={}){
 const bundle=await fixture(t),m=bundle.manifest;let prior='d'.repeat(40),candidate='f'.repeat(40);
 const oldPdf=Buffer.from('old pdf!'),oldCover=Buffer.from('old png!');
 const old={id:'2026-11-15-r1',date:'2026-11-15',revision:1,title:'Old',dek:'Historical fixture.',preparedDate:'2026-11-15',pdf:'/magazine/daily/old.pdf',cover:'/magazine/daily/old.png',pages:1,bytes:8,sha256:hash(oldPdf),coverBytes:8,coverSha256:hash(oldCover),coverWidth:1,coverHeight:1,correction:null};
 const registryText=JSON.stringify({schemaVersion:1,current:old.id,issues:[old]},null,2)+'\n';
 const contents={'app/page.tsx':Buffer.from('reviewed'),'vercel.json':Buffer.from('guard')};
 contents['public'+old.pdf]=oldPdf;contents['public'+old.cover]=oldCover;contents['content/ltc-pdf/issues.json']=Buffer.from(registryText);
 const files=Object.entries(contents).map(([path,b])=>({path,mode:'100644',sha:blob(b)}));
 const bytes=new Map(Object.values(contents).map(b=>[blob(b),b])),treeSha=gitTreeFromFileEntries(files),trees=new Map([[treeSha,files]]),commits=new Map([[prior,{sha:prior,tree:{sha:treeSha},parents:[]}]]);
 const observed=fs=>fs.map(f=>({path:f.path,mode:f.mode,sha256:hash(bytes.get(f.sha)),bytes:bytes.get(f.sha).length}));
 const priorTree=observed(files),trust={expectedProducer:bundle.expectedProducer,existingDailyIssues:[],trustedSourcePolicies:bundle.trustedSourcePolicies,trustedEvidence:bundle.trustedEvidence,reviewDigest:'c'.repeat(64),baseline:{commitSha:prior,treeSha,registryText,files},admissionTrust:{priorCommit:prior,legacyRouteIds:[],priorArtifactInventory:[],review:{sourceCommit:m.sourceCommit,implementationCommit:m.implementationCommit,implementationSha256:m.implementationSha256,notBefore:'2026-11-16T18:00:00Z',expiresAt:'2026-11-17T00:00:00Z',invariantTree:priorTree.filter(e=>e.path!=='content/ltc-pdf/issues.json')}}};
 let head=prior,claimed=false,time=bundle.now;const keys=new Set(),calls=[];
 const gitTools={
 githubFetch:async({url})=>{calls.push('fetch');if(url.includes('/ref/'))return raw({ref:'refs/heads/agent/cloud-newsroom-v2-20261116',object:{type:'commit',sha:head}});if(url.includes('/commits/'))return raw(commits.get(url.split('/').at(-1)));const id=url.split('/').at(-1).split('?')[0];return raw({sha:id,truncated:false,tree:trees.get(id).map(f=>({...f,type:'blob'}))});},
 githubFetchFile:async({ref,path,encoding})=>{assert.equal(encoding,'base64');const f=trees.get(commits.get(ref).tree.sha).find(f=>f.path===path);return envelope({sha:f.sha,encoding,content:bytes.get(f.sha).toString('base64')});},
 githubCreateBlob:async a=>{calls.push('blob');const b=Buffer.from(a.content,'base64');bytes.set(blob(b),b);return envelope({sha:blob(b)});},
 githubCreateTree:async a=>{calls.push('tree');const fs=[...files.filter(f=>!a.tree_elements.some(e=>e.path===f.path)),...a.tree_elements.map(({path,mode,sha})=>({path,mode,sha}))],sha=gitTreeFromFileEntries(fs);trees.set(sha,fs);return envelope({sha});},
 githubCreateCommit:async a=>{calls.push('commit');commits.set(candidate,{sha:candidate,tree:{sha:a.tree_sha},parents:[{sha:a.parent_sha}]});return envelope({commit_sha:candidate});},
 githubUpdateRef:async a=>{calls.push('ref');assert.equal(a.expected_sha,head);head=a.sha;return envelope({sha:head});}
 };
 const options={clock:async()=>time,loadTrust:async()=>trust,gitTools,readArtifact:a=>readFile(path.join(bundle.bundleRoot,a.source)),journal:{root:path.join(bundle.bundleRoot,'journal'),inventory:{claimRoot:async()=>{const created=!claimed;claimed=true;return {created,journalId:'e'.repeat(64)};},claimKey:async k=>{keys.add(k);return {created:true};},hasKey:async k=>keys.has(k)}},observeCandidate:async()=>{const c=commits.get(candidate),fs=trees.get(c.tree.sha);return {candidateCommit:candidate,candidateTreeGitSha:c.tree.sha,priorCommit:prior,candidateParents:[prior],candidateTree:observed(fs),candidateRegistryText:bytes.get(fs.find(f=>f.path==='content/ltc-pdf/issues.json').sha).toString(),priorTree,currentRegistryText:registryText};},permissions};
 const input={runId:'runner-fixture',owner:'test-owner',bundle};return {options,input,trust,calls,gitTools,api:createCloudNewsroomV2PublicationRunner(options),setTime:v=>time=v,contents,bytes,trees,commits,setPrior:v=>{prior=v;head=v;trust.baseline.commitSha=v;trust.admissionTrust.priorCommit=v;commits.set(v,{sha:v,tree:{sha:treeSha},parents:[]});},setCandidate:v=>candidate=v};
}
test('actual ingestion and default preparation call no connectors or journal',async t=>{const x=await setup(t),r=await x.api.advance(x.input);assert.equal(r.status,'prepared-only');assert.equal(r.receipt.status,'accepted-receipt');assert.deepEqual(x.calls,[]);});
test('untrusted bundle cannot choose producer policy or approval',async t=>{const x=await setup(t);x.input.bundle.expectedProducer={id:'evil'};x.input.bundle.manifest.producer.id='evil';const r=await x.api.advance(x.input);assert.equal(r.status,'hold');assert.deepEqual(x.calls,[]);});
test('real ingest, phase journal, Git envelopes and evaluator retain observations through resume',async t=>{const x=await setup(t,{stageObjects:true,updateSourceRef:true});let r=await x.api.advance(x.input);assert.equal(r.status,'awaiting-ref-reconciliation',JSON.stringify(r));assert.equal(r.admissionCapture.evaluation.status,'eligible-for-preview-review');assert.equal(r.admissionCapture.evaluatorInput.receipt.status,'accepted-receipt');const api=createCloudNewsroomV2PublicationRunner(x.options);r=await api.advance(x.input);assert.equal(r.status,'admitted-awaiting-preview-permission');assert.equal(x.calls.filter(v=>v==='ref').length,1);assert.equal(x.calls.filter(v=>v==='blob').length,5);});
test('uncertain object result is held without blind retry',async t=>{const x=await setup(t,{stageObjects:true});x.gitTools.githubCreateBlob=async()=>{x.calls.push('uncertain');throw Error('lost');};assert.equal((await x.api.advance(x.input)).status,'hold');assert.equal((await createCloudNewsroomV2PublicationRunner(x.options).advance(x.input)).status,'hold');assert.equal(x.calls.filter(v=>v==='uncertain').length,1);});
test('missing or mismatched trusted Git observer holds before source ref',async t=>{for(const missing of [true,false]){const x=await setup(t,{stageObjects:true,updateSourceRef:true});x.options.observeCandidate=missing?undefined:async()=>({candidateCommit:'a'.repeat(40)});const r=await createCloudNewsroomV2PublicationRunner(x.options).advance(x.input);assert.equal(r.status,'hold');assert.ok(!x.calls.includes('ref'));}});
test('candidate cannot inject admission or preview adapter permission',async t=>{const x=await setup(t,{stageObjects:true});x.input.admission={status:'eligible-for-preview-review'};x.options.coordinatorAdapters={state:{read:()=>{throw Error('must not reach');}}};const r=await createCloudNewsroomV2PublicationRunner(x.options).advance(x.input);assert.equal(r.status,'admitted-awaiting-source-ref-permission');assert.ok(!x.calls.includes('ref'));});
test('enabled preview invokes real coordinator but disabled durable state holds without provider effects',async t=>{const x=await setup(t,{stageObjects:true,updateSourceRef:true,createPreview:true});let reads=0,promotes=0;x.options.coordinatorAdapters={state:{cas:async()=>{},read:async()=>{reads++;return {version:'a',value:{enabled:false}};}},provider:{promote:async()=>{promotes++;},createPreview:async()=>{},getDeployment:async()=>{},getDomainDeployment:async()=>{}},archive:{persistQa:async()=>{}},admission:{observeGrant:async()=>{}},qa:{verify:async()=>{},verifyPublic:async()=>{}},clock:x.options.clock};const api=createCloudNewsroomV2PublicationRunner(x.options);await api.advance(x.input);const r=await api.advance(x.input);assert.equal(r.phase,'coordinator');assert.equal(reads,1);assert.equal(promotes,0);assert.equal(r.promotionAuthorized,false);});
test('lost ref response resumes with independent readback, no repeated writes',async t=>{const x=await setup(t,{stageObjects:true,updateSourceRef:true}),write=x.gitTools.githubUpdateRef;x.gitTools.githubUpdateRef=async a=>{await write(a);throw Error('lost response');};assert.equal((await x.api.advance(x.input)).status,'awaiting-ref-reconciliation');assert.equal((await createCloudNewsroomV2PublicationRunner(x.options).advance(x.input)).status,'admitted-awaiting-preview-permission');assert.equal(x.calls.filter(v=>v==='ref').length,1);});
test('source expiry during observation denies ref update despite earlier valid ingestion',async t=>{const x=await setup(t,{stageObjects:true,updateSourceRef:true}),observe=x.options.observeCandidate;x.options.observeCandidate=async a=>{const r=await observe(a);x.setTime('2026-11-16T19:10:00Z');return r;};const r=await createCloudNewsroomV2PublicationRunner(x.options).advance(x.input);assert.equal(r.status,'hold');assert.equal(r.phase,'admission');assert.ok(!x.calls.includes('ref'));});
test('permission hierarchy is explicit and promotion approval is not an accepted runner parameter',()=>{assert.throws(()=>createCloudNewsroomV2PublicationRunner({clock:()=>'',loadTrust:()=>{},permissions:{createPreview:true}}),/staging_permission/);});
test('stale source-ref reconciliation uses saved trusted capture without bundle or writes',async t=>{const x=await setup(t,{stageObjects:true,updateSourceRef:true}),r=await x.api.advance(x.input);x.trust.reconciliation={request:r.request,admissionCapture:r.admissionCapture};x.setTime('2026-11-17T19:00:00Z');const before=x.calls.filter(v=>['blob','tree','commit','ref'].includes(v));const out=await x.api.reconcile({runId:x.input.runId,owner:x.input.owner});assert.equal(out.status,'read-only-effect-observed');assert.equal(out.sourceEvidenceStale,true);assert.equal(out.sourceRef,'candidate-observed');assert.equal(out.durableStateUpdated,false);assert.deepEqual(x.calls.filter(v=>['blob','tree','commit','ref'].includes(v)),before);assert.equal((await x.api.advance(x.input)).status,'hold');});
test('reconciliation cannot use candidate-supplied capture or changed durable identity',async t=>{const x=await setup(t);assert.equal((await x.api.reconcile({...x.input,reconciliation:{}})).status,'hold');});
test('concurrent calls hold rather than race journal initialization',async t=>{const x=await setup(t,{stageObjects:true});let release;const wait=new Promise(r=>release=r),load=x.options.loadTrust;x.options.loadTrust=async a=>{await wait;return load(a);};const api=createCloudNewsroomV2PublicationRunner(x.options),pending=api.advance(x.input);const other=await api.advance(x.input);assert.equal(other.reason,'runner_call_in_progress');release();assert.equal((await pending).status,'admitted-awaiting-source-ref-permission');});
test('explicit materialization hook precedes observation but never runs in read-only reconcile',async t=>{const x=await setup(t,{stageObjects:true,updateSourceRef:true});let prepared=0;const observe=x.options.observeCandidate;x.options.prepareCandidateObservation=async a=>{assert.equal(a.repository,'Satnam-Satoshi/Satoshi-Langar');prepared++;};x.options.observeCandidate=async a=>{assert.ok(prepared>0);return observe(a);};const api=createCloudNewsroomV2PublicationRunner(x.options),r=await api.advance(x.input);assert.equal(r.status,'awaiting-ref-reconciliation');x.trust.reconciliation={request:r.request,admissionCapture:r.admissionCapture};const before=prepared;assert.equal((await api.reconcile(x.input)).status,'read-only-effect-observed');assert.equal(prepared,before);});
import {execFileSync} from 'node:child_process';
import {prepareCloudNewsroomV2CandidateCheckout} from './cloud-newsroom-v2-candidate-checkout.mjs';
test('end-to-end genuine Git materialization observes unreferenced candidate before ref update',async t=>{
 const x=await setup(t,{stageObjects:true,updateSourceRef:true}),root=await mkdtemp(path.join(tmpdir(),'runner-real-git-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const source=path.join(root,'source'),work=path.join(root,'work');await mkdir(source);await mkdir(work);
 const git=(...args)=>execFileSync('/usr/bin/git',['-C',source,...args],{env:{...process.env,GIT_AUTHOR_NAME:'Fixture',GIT_AUTHOR_EMAIL:'fixture@example.invalid',GIT_COMMITTER_NAME:'Fixture',GIT_COMMITTER_EMAIL:'fixture@example.invalid'},stdio:['ignore','pipe','pipe']}).toString().trim();
 git('init');git('remote','add','origin','https://github.com/Satnam-Satoshi/Satoshi-Langar.git');
 for(const [name,b]of Object.entries(x.contents)){await mkdir(path.dirname(path.join(source,name)),{recursive:true});await writeFile(path.join(source,name),b);}git('add','.');git('commit','-m','Synthetic baseline');const base=git('rev-parse','HEAD');x.setPrior(base);
 const original=x.gitTools.githubCreateCommit;
 x.gitTools.githubCreateCommit=async args=>{
  // Materialize mocked remote Git objects in a real local object database. No ref
  // points at the candidate: commit-tree creates an unreferenced object.
  for(const f of x.trees.get(args.tree_sha)){const b=x.bytes.get(f.sha);await mkdir(path.dirname(path.join(source,f.path)),{recursive:true});await writeFile(path.join(source,f.path),b);}git('add','.');assert.equal(git('write-tree'),args.tree_sha);
  const commit=git('commit-tree',args.tree_sha,'-p',base,'-m','Synthetic candidate');x.setCandidate(commit);return original(args);
 };
 delete x.options.observeCandidate;
 let isolated;
 x.options.prepareCandidateObservation=async a=>{const prepared=await prepareCloudNewsroomV2CandidateCheckout({sourceRepoRoot:source,workspaceRoot:work,candidateCommit:a.candidateCommit,priorCommit:a.priorCommit,repository:a.repository,branch:a.branch,allowFetch:false});isolated=prepared.repoRoot;return prepared;};
 const api=createCloudNewsroomV2PublicationRunner(x.options),r=await api.advance(x.input);assert.equal(r.status,'awaiting-ref-reconciliation',JSON.stringify({status:r.status,phase:r.phase,reason:r.reason,evaluation:r.admissionCapture?.evaluation}));assert.ok(isolated);assert.equal(git('rev-parse','HEAD'),base);assert.equal(r.admissionCapture.evaluation.status,'eligible-for-preview-review');assert.equal((await api.advance(x.input)).status,'admitted-awaiting-preview-permission');assert.equal(x.calls.filter(v=>v==='ref').length,1);
});
test('read-only reconciliation accepts exact transport MCP fetch envelope variants',async t=>{
 for(const shape of ['structured','structured-result','text','text-result']){
  const x=await setup(t,{stageObjects:true,updateSourceRef:true}),r=await x.api.advance(x.input);x.trust.reconciliation={request:r.request,admissionCapture:r.admissionCapture};
  const fetch=x.gitTools.githubFetch;x.gitTools.githubFetch=async a=>{const p=(await fetch(a)).structuredContent;switch(shape){case 'structured':return {structuredContent:p};case 'structured-result':return {structuredContent:{result:p}};case 'text':return {content:[{type:'text',text:'not JSON'},{type:'text',text:JSON.stringify(p)}]};default:return {content:[{type:'text',text:JSON.stringify({result:p})}]};}};
  assert.equal((await x.api.reconcile(x.input)).status,'read-only-effect-observed',shape);
 }
});
test('reconciliation rejects recursive envelopes, errors and unwrapped ref objects',async t=>{
 for(const shape of ['recursive','error','direct','tool-error']){
  const x=await setup(t,{stageObjects:true,updateSourceRef:true}),r=await x.api.advance(x.input);x.trust.reconciliation={request:r.request,admissionCapture:r.admissionCapture};
  const fetch=x.gitTools.githubFetch;x.gitTools.githubFetch=async a=>{const p=(await fetch(a)).structuredContent;switch(shape){case 'recursive':return {structuredContent:{result:{result:p}}};case 'error':return {structuredContent:{error:'failed',result:p}};case 'direct':return {structuredContent:JSON.parse(p.content)};default:return {isError:true,structuredContent:p};}};
  assert.equal((await x.api.reconcile(x.input)).status,'hold',shape);
 }
});
