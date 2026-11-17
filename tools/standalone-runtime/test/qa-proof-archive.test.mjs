import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createQaProofArchive,qaProofCanonical} from '../src/qa-proof-archive.mjs';
import {createArtifactStoreFixture} from '../smoke/drive-artifact-store-fixture.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
 const f=createArtifactStoreFixture(),binding={phase:'preview',projectId:'prj_fixture',sourceCommit:'a'.repeat(40),candidateDeploymentId:'dpl_fixture',planSha256:'b'.repeat(64),manifestSha256:'c'.repeat(64)};
 const proof={status:'preview-qa-verified',...binding,expectedBaselineDeploymentId:'dpl_baseline',evidenceSha256:'d'.repeat(64),checkedAt:'2026-11-17T14:09:00.000Z',expiresAt:'2026-11-17T14:12:00.000Z',fresh:true,domainObservations:[{domain:'fixture.vercel.app',artifacts:['pdf','reader','cover','promo'].map(role=>({role,sha256:'e'.repeat(64),bytes:100,mimeType:role==='pdf'?'application/pdf':role==='reader'?'text/html':'image/png'})),editionHtmlSha256:'f'.repeat(64),routesPassed:true,readerArtifactBytesVerified:true,readerMarkerObserved:true,renderedContentEquivalence:false,visualQaVerified:false}],baselineObservation:{deploymentId:'dpl_baseline',sourceCommit:'1'.repeat(40),branch:'agent/baseline',domains:['ltcmagazine.org','satnamsatoshi.com'],responseSha256:'2'.repeat(64),checkedAt:'2026-11-17T14:09:00.000Z',expiresAt:'2026-11-17T14:12:00.000Z',atomic:false},providerResponseSha256:'3'.repeat(64),publicationVerified:false,promotionAllowed:false,mutationPerformed:false,atomic:false,reconciliationOnly:false};
 const c=f.config,store={Firestore:c.Firestore,expectedProjectId:c.expectedProjectId,expectedDatabaseId:c.expectedDatabaseId,claim:c.claim},drive={fetch:c.fetch,resolveSecret:c.resolveSecret,secretReference:c.secretReference,folderId:c.folderId,ownerPermissionId:c.ownerPermissionId,loadApproval:c.loadApproval};
 const config={store,drive,binding,proofJson:qaProofCanonical(proof),clock:c.clock,networkEnabled:true,mutationsEnabled:true};
 return {...f,base:f,proof,binding,config,make:override=>createQaProofArchive({...config,...override})};
}
test('default network/mutation off makes no SDK/Drive calls and freezes no upload claim',async()=>{
 const f=fixture(),before=f.base.snapshot();const h=f.make({networkEnabled:false,mutationsEnabled:false});assert.equal((await h.advance()).reason,'qa-archive-disabled');assert.equal((await h.readback()).reason,'qa-archive-disabled');assert.deepEqual(f.base.snapshot(),before);
 const readOnly=f.make({mutationsEnabled:false});assert.equal((await readOnly.advance()).reason,'qa-archive-disabled');assert.equal(f.counters.posts,0);
});
test('concrete upload journal and real Drive wrappers archive exact frozen JSON; restart only GETs and preserves receipt',async()=>{
 const f=fixture(),r=await f.make().advance();assert.equal(r.status,'qa-proof-archived');assert.equal(r.fresh,true);assert.equal(r.publicationVerified,false);assert.equal(r.promotionAllowed,false);assert.equal(r.qaAuthorityAuthenticated,false);assert.equal(r.ownerOnlyObserved,true);assert.equal(r.atomic,false);assert.equal(r.worm,false);assert.equal(f.counters.posts,1);assert.equal(f.files.size,1);
 const file=[...f.files.values()][0];assert.equal(file.bytes.toString(),f.config.proofJson);assert.equal(r.receipt.sha256,sha(file.bytes));assert.equal(r.receipt.bytes,file.bytes.length);
 const before=structuredClone([...f.rows]),posts=f.counters.posts;
 const reboot=createArtifactStoreFixture().restore(f.base.snapshot()),c=reboot.config;const h=createQaProofArchive({...f.config,store:{Firestore:c.Firestore,expectedProjectId:c.expectedProjectId,expectedDatabaseId:c.expectedDatabaseId,claim:c.claim},drive:{fetch:c.fetch,resolveSecret:c.resolveSecret,secretReference:c.secretReference,folderId:c.folderId,ownerPermissionId:c.ownerPermissionId,loadApproval:c.loadApproval},clock:c.clock,mutationsEnabled:false});
 const resumed=await h.readback();assert.equal(resumed.status,'qa-proof-archived');assert.deepEqual(resumed.receipt,r.receipt);assert.equal(reboot.counters.posts,posts);assert.deepEqual([...reboot.rows],before);
});
test('stale frozen proof remains archived as historical bytes and never gets new checkedAt authority',async()=>{
 const f=fixture();f.base.now='2026-11-17T14:13:00.000Z';const r=await f.make().advance();assert.equal(r.status,'qa-proof-archived');assert.equal(r.fresh,false);assert.equal(r.proofCheckedAt,'2026-11-17T14:09:00.000Z');assert.equal(r.proofExpiresAt,'2026-11-17T14:12:00.000Z');assert.equal(r.promotionAllowed,false);assert.equal([...f.files.values()][0].bytes.toString(),f.config.proofJson);
});
test('final readback expiry is reported stale and invalid final clock holds without another upload',async()=>{
 for(const ending of ['2026-11-17T14:12:00.000Z','not-a-clock','2026-11-17T14:09:30.000Z']){const f=fixture(),fetch=f.config.drive.fetch;f.config.drive.fetch=async(url,o)=>{const r=await fetch(url,o);if(new URL(url).searchParams.get('alt')==='media')f.base.now=ending;return r;};const r=await f.make().advance();assert.equal(f.counters.posts,1);if(ending!=='2026-11-17T14:12:00.000Z'){assert.equal(r.status,'held');assert.equal(JSON.stringify(r).includes(ending),false);}else{assert.equal(r.status,'qa-proof-archived');assert.equal(r.fresh,false);}}
});
test('unknown POST after provider accepted it persists attempting; new helper never uploads again or searches names',async()=>{
 const f=fixture(),fetch=f.config.drive.fetch;f.config.drive.fetch=async(url,o)=>{const r=await fetch(url,o);if(o.method==='POST')throw Error('synthetic unknown outcome and secret-not-for-output');return r;};const first=await f.make().advance();assert.equal(first.status,'held');assert.equal(JSON.stringify(first).includes('secret-not-for-output'),false);assert.equal(f.counters.posts,1);
 f.config.drive.fetch=fetch;assert.equal((await f.make().advance()).status,'held');assert.equal((await f.make({mutationsEnabled:false}).readback()).status,'held');assert.equal(f.counters.posts,1);
});
test('missing global inventory and known reset/lost upload rows fail closed',async()=>{
 const f=fixture();f.rows.delete('newsroomPrivateUploadInventoryV1/root');assert.equal((await f.make().advance()).status,'held');assert.equal(f.counters.posts,0);
 for(const reset of [false,true]){const g=fixture();assert.equal((await g.make().advance()).status,'qa-proof-archived');const key=[...g.rows.keys()].find(x=>x.startsWith('newsroomPrivateUploadJournalV1/'));if(reset){const row=g.rows.get(key);g.rows.set(key,{...row,version:0,payloadJson:'{"record":null,"version":0}'});}else g.rows.delete(key);assert.equal((await g.make().advance()).status,'held');assert.equal(g.counters.posts,1);}
});
test('actual media or ACL mutation cannot be accepted from metadata/hash alone',async()=>{
 for(const fault of ['media','acl']){const f=fixture();assert.equal((await f.make().advance()).status,'qa-proof-archived');const fetch=f.config.drive.fetch;f.config.drive.fetch=async(url,o)=>{const r=await fetch(url,o),u=new URL(url);if(fault==='media'&&u.searchParams.get('alt')==='media')return {...r,body:new Response('wrong bytes').body};if(fault==='acl'&&u.pathname.endsWith('/permissions'))return {...r,body:new Response(JSON.stringify({permissions:[{id:'fixture-owner',type:'user',role:'owner',deleted:false},{id:'unapproved',type:'anyone',role:'reader'}]})).body};return r;};assert.equal((await f.make({mutationsEnabled:false}).readback()).status,'held');assert.equal(f.counters.posts,1);}
});
test('strict frozen JSON and exact binding reject duplicate keys, altered source, extra top fields, and accessors',()=>{
 const f=fixture();for(const raw of [f.config.proofJson+'\n',f.config.proofJson.replace('"fresh":true','"fresh":true,"fresh":true'),qaProofCanonical({...f.proof,sourceCommit:'0'.repeat(40)}),qaProofCanonical({...f.proof,privateExtra:'not-uploaded'})])assert.throws(()=>f.make({proofJson:raw}));
 let reads=0;const binding={...f.binding};Object.defineProperty(binding,'projectId',{enumerable:true,get(){reads++;return 'prj_fixture';}});assert.throws(()=>f.make({binding}));assert.equal(reads,0);assert.equal(f.counters.posts,0);
});
test('bounded proof JSON above small identity string caps is archived intact without making QA authority claims',async()=>{
 const f=fixture();f.proof.baselineObservation.branch='agent/'+ 'x'.repeat(4000);const proofJson=qaProofCanonical(f.proof);assert.ok(proofJson.length>3000);const r=await f.make({proofJson}).advance();assert.equal(r.status,'qa-proof-archived');assert.equal(r.qaAuthorityAuthenticated,false);assert.equal([...f.files.values()][0].bytes.toString(),proofJson);
 assert.throws(()=>f.make({proofJson:'x'.repeat(131073)}));
});
test('binding snapshot and frozen bytes are not replaced by later caller mutation; future proof clock prevents upload',async()=>{
 const f=fixture(),h=f.make();f.config.binding.sourceCommit='0'.repeat(40);f.config.proofJson='private replacement';assert.equal((await h.advance()).status,'qa-proof-archived');assert.equal(f.counters.posts,1);
 const g=fixture();g.base.now='2026-11-17T14:08:00.000Z';assert.equal((await g.make().advance()).status,'held');assert.equal(g.counters.posts,0);
});
function publicFixture(){
 const f=fixture();f.binding.phase='public';Object.assign(f.proof,{phase:'public',status:'production-readback-observed',reconciliationOnly:true,baselineObservation:null});
 f.proof.domainObservations=['ltcmagazine.org','satnamsatoshi.com'].map(domain=>({...structuredClone(f.proof.domainObservations[0]),domain}));
 f.config.proofJson=qaProofCanonical(f.proof);return f;
}
test('successful both-domain public readback archives exact bytes and resumes GET-only',async()=>{
 const f=publicFixture(),first=await f.make().advance();assert.equal(first.status,'qa-proof-archived');assert.equal(first.publicationVerified,false);assert.equal(first.fresh,true);assert.equal(f.counters.posts,1);
 const again=await f.make({mutationsEnabled:false}).readback();assert.deepEqual(again.receipt,first.receipt);assert.equal(f.counters.posts,1);assert.equal([...f.files.values()][0].bytes.toString(),f.config.proofJson);
});
test('historical public proof may expire before observedAt and never gains freshness',async()=>{
 for(const expiresAt of ['2026-11-17T14:08:00.000Z','2026-11-17T14:12:00.000Z']){
  const f=publicFixture();Object.assign(f.proof,{fresh:false,expiresAt});f.config.proofJson=qaProofCanonical(f.proof);
  const r=await f.make().advance();assert.equal(r.status,'qa-proof-archived');assert.equal(r.fresh,false);assert.equal(r.proofExpiresAt,expiresAt);assert.equal(r.promotionAllowed,false);assert.equal([...f.files.values()][0].bytes.toString(),f.config.proofJson);
 }
});
test('public archive rejects failed, missing, duplicate or foreign domains and unequal artifact proof',()=>{
 const faults=[p=>p.domainObservations.pop(),p=>p.domainObservations[1].domain='ltcmagazine.org',p=>p.domainObservations[1].domain='elsewhere.example',p=>p.domainObservations[0].routesPassed=false,p=>p.domainObservations[0].readerArtifactBytesVerified=false,p=>p.domainObservations[0].artifacts.pop(),p=>p.domainObservations[0].artifacts[1].role='pdf',p=>p.domainObservations[0].artifacts[0].sha256='0'.repeat(64),p=>p.domainObservations[0].artifacts[0].bytes=0,p=>p.baselineObservation={},p=>p.status='public-qa-verified',p=>p.reconciliationOnly=false,p=>p.expiresAt='2026-11-17T14:08:00.000Z',p=>p.expiresAt='invalid'];
 for(const fault of faults){const f=publicFixture();fault(f.proof);assert.throws(()=>f.make({proofJson:qaProofCanonical(f.proof)}));assert.equal(f.counters.posts,0);}
});
test('phase/source/plan binding cannot substitute earlier preview for public frozen proof',()=>{
 const f=publicFixture();assert.throws(()=>f.make({proofJson:fixture().config.proofJson}));
 for(const key of ['sourceCommit','candidateDeploymentId','planSha256','manifestSha256']){const g=publicFixture();g.proof[key]=key==='candidateDeploymentId'?'dpl_wrong':'0'.repeat(key==='sourceCommit'?40:64);assert.throws(()=>g.make({proofJson:qaProofCanonical(g.proof)}));}
});
