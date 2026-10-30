import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,symlink,rm,mkdir} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {packageEvidence,chunkEvidence,preallocateEvidenceIds,packageArtifactEvidence,restoreArtifactEvidence,verifyEvidenceBundle,uploadEvidence,downloadEvidence,restoreEvidence,createDriveEvidenceProvider} from './cloud-ltc-evidence.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const config={folderId:'selected_folder_123',fileId:'preallocated_file_123',ownerPermissionId:'owner_permission_123'};
let context;
const bundle=()=>packageEvidence([{path:'sources/market.json',bytes:Buffer.from('{"observedAt":"2026-10-30T20:00:00Z"}\n')},{path:'release.json',bytes:Buffer.from('{"published":false}\n')}]);
const payload={fileId:config.fileId,folderId:config.folderId,sha256:bundle().sha256,bytes:bundle().length};
context={operationId:'evidence:2026-10-30:r1',payload,payloadSha256:hash(Buffer.from(JSON.stringify(payload)))};
function fixture({ambiguous=false,sharedFolder=false,sharedFile=false,tamper=false,wrongParent=false}={}){
 let metadata=null,bytes=null,posts=0;const calls=[];
 const fetcher=async(url,options)=>{
  const parsed=new URL(url);assert.equal(parsed.origin,'https://www.googleapis.com');assert.equal(options.redirect,'error');assert.equal(options.headers.authorization,'Bearer fixture-token');calls.push({url,method:options.method});
  if(parsed.pathname===`/drive/v3/files/${config.folderId}`)return Response.json({id:config.folderId,mimeType:'application/vnd.google-apps.folder',ownedByMe:true,trashed:false});
  if(parsed.pathname.endsWith('/permissions')){
   const shared=parsed.pathname.includes(config.folderId)?sharedFolder:sharedFile;
   return Response.json({permissions:[{id:config.ownerPermissionId,type:'user',role:'owner'},...(shared?[{id:'public_reader',type:'anyone',role:'reader'}]:[])]});
  }
  if(parsed.pathname==='/upload/drive/v3/files'){
   posts++;assert.equal(options.method,'POST');const boundary=options.headers['content-type'].split('boundary=')[1];const parts=Buffer.from(options.body).toString().split('--'+boundary);
   metadata=JSON.parse(parts[1].split('\r\n\r\n')[1].trim());bytes=Buffer.from(parts[2].split('\r\n\r\n')[1].replace(/\r\n$/,''));metadata={...metadata,size:String(bytes.length),ownedByMe:true,trashed:false};assert.equal(metadata.id,config.fileId);assert.deepEqual(metadata.parents,[config.folderId]);
   if(wrongParent)metadata.parents=['wrong_folder'];if(ambiguous)throw Error('upload-response-lost');return Response.json({id:config.fileId});
  }
  if(parsed.pathname===`/drive/v3/files/${config.fileId}`){
   if(!metadata)return new Response('',{status:404});if(parsed.searchParams.get('alt')==='media')return new Response(tamper?Buffer.from('corrupt'):bytes);return Response.json(metadata);
  }
  throw Error('unexpected_fixture_request');
 };
 return {options:{config,getAccessToken:async()=>'fixture-token',fetcher},calls,get posts(){return posts;}};
}
test('content-addressed packaging is deterministic and bounded, rejects traversal/collisions',()=>{
 const a=bundle(),b=packageEvidence([{path:'release.json',bytes:Buffer.from('{"published":false}\n')},{path:'sources/market.json',bytes:Buffer.from('{"observedAt":"2026-10-30T20:00:00Z"}\n')}]);assert.equal(a.sha256,b.sha256);assert(a.bytes.equals(b.bytes));assert.equal(verifyEvidenceBundle(a).manifest.length,2);
 for(const filename of ['../secret','/tmp/escape','a//b','.env','a/../b','a\\b'])assert.throws(()=>packageEvidence([{path:filename,bytes:Buffer.from('x')}]));
 assert.throws(()=>packageEvidence([{path:'a',bytes:Buffer.from('x')},{path:'a/b',bytes:Buffer.from('y')}]));assert.throws(()=>packageEvidence([{path:'big',bytes:Buffer.alloc(2500001)}]));
 const broken={...a,bytes:Buffer.from(a.bytes)};broken.bytes[4]^=1;assert.throws(()=>verifyEvidenceBundle(broken));
 const altered=JSON.parse(a.bytes);altered.files[0].sha256='0'.repeat(64);const raw=Buffer.from(JSON.stringify(altered)+'\n');assert.throws(()=>verifyEvidenceBundle({bytes:raw,length:raw.length,sha256:hash(raw)}));
});
test('upload verifies selected folder, owner-only permissions, exact metadata and downloaded hash',async()=>{
 const f=fixture(),b=bundle();const result=await uploadEvidence(b,f.options,context);assert.equal(result.proof.downloadVerified,true);assert.equal(result.proof.ownerOnly,true);assert.equal(result.proof.sha256,b.sha256);assert.equal(f.posts,1);
 const again=await uploadEvidence(b,f.options,context);assert.equal(again.proof.sha256,b.sha256);assert.equal(f.posts,1,'Already confirmed exact ID is read back, not uploaded again');
});
test('lost create response reconciles known ID without another upload',async()=>{
 const f=fixture({ambiguous:true}),provider=createDriveEvidenceProvider({bundle:bundle(),...f.options});await assert.rejects(provider.apply(context),/outcome_unknown/);assert.equal(f.posts,1);
 const readback=await provider.readback(context);assert.equal(readback.status,'applied');assert.equal(readback.operationId,context.operationId);assert.equal(readback.payloadSha256,context.payloadSha256);assert.equal(f.posts,1);
});
test('owner-only checks, wrong parent and corrupted media fail closed',async()=>{
 const folder=fixture({sharedFolder:true});await assert.rejects(uploadEvidence(bundle(),folder.options,context));assert.equal(folder.posts,0);
 for(const options of [{sharedFile:true},{wrongParent:true},{tamper:true}]){const f=fixture(options);await assert.rejects(uploadEvidence(bundle(),f.options,context));const p=createDriveEvidenceProvider({bundle:bundle(),...f.options});assert.equal((await p.readback(context)).status,'unknown');assert.equal(f.posts,1);}
});
test('missing evidence stays unknown; no credential reads, list traversal or live requests',async()=>{
 const f=fixture(),p=createDriveEvidenceProvider({bundle:bundle(),...f.options});assert.equal((await p.readback(context)).status,'unknown');assert.equal(f.posts,0);assert(!f.calls.some(c=>c.method!=='GET'));
 await assert.rejects(downloadEvidence({fileId:'other_id_123',folderId:config.folderId,sha256:bundle().sha256,length:bundle().length},f.options));
});
test('clean restore verifies every byte, refuses existing directories and symlinks',async t=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'ltc-evidence-test-'));t.after(()=>rm(temp,{recursive:true,force:true}));const dest=path.join(temp,'restore');const b=bundle();const proof=await restoreEvidence(b,{directory:dest});assert.equal(proof.fileCount,2);
 assert.equal(await readFile(path.join(dest,'release.json'),'utf8'),'{"published":false}\n');assert.equal((await stat(path.join(dest,'release.json'))).mode&0o777,0o600);assert.equal((await stat(dest)).mode&0o777,0o700);await assert.rejects(restoreEvidence(b,{directory:dest}));
 const outside=path.join(temp,'outside');await mkdir(outside);const linked=path.join(temp,'linked');await symlink(outside,linked);await assert.rejects(restoreEvidence(b,{directory:linked}));
});

test('provider binds durable payload to actual bundle, file, folder and length before any effect',async()=>{const f=fixture(),p=createDriveEvidenceProvider({bundle:bundle(),...f.options});await assert.rejects(p.apply({...context,payload:{...context.payload,fileId:'wrong_file_123'}}),/payload_mismatch/);await assert.rejects(p.apply({...context,payloadSha256:'0'.repeat(64)}),/digest_mismatch/);assert.equal(f.calls.length,0);});
test('bounded Drive deadlines fail closed without retrying effects',async()=>{let calls=0;await assert.rejects(uploadEvidence(bundle(),{config,getAccessToken:async()=>'fixture-token',timeoutMs:15,fetcher:async()=>{calls++;return new Promise(()=>{});}},context),/unconfirmed/);assert.equal(calls,1);});

test('chunking preserves all bytes deterministically at size/file-count boundaries',()=>{
 const files=[{path:'b.json',bytes:Buffer.alloc(1250001,2)},{path:'a.json',bytes:Buffer.alloc(1250000,1)},{path:'c.json',bytes:Buffer.from('tail')}];
 const chunks=chunkEvidence(files);assert.equal(chunks.length,2);assert.deepEqual(chunks.map(c=>c.sha256),chunkEvidence([...files].reverse()).map(c=>c.sha256));assert.deepEqual(chunks.flatMap(c=>c.manifest.map(f=>f.path)),['a.json','b.json','c.json']);
 const byCount=chunkEvidence(Array.from({length:129},(_,i)=>({path:`file-${String(i).padStart(3,'0')}.json`,bytes:Buffer.alloc(0)})));assert.equal(byCount.length,2);assert.equal(byCount[0].manifest.length,128);
 assert.throws(()=>chunkEvidence([{path:'big',bytes:Buffer.alloc(2500001)}]),/file_too_large/);assert.throws(()=>chunkEvidence([{path:'same',bytes:Buffer.from('1')},{path:'same',bytes:Buffer.from('2')}]),/duplicate/);assert.throws(()=>chunkEvidence([{path:'root',bytes:Buffer.from('1')},{path:'root/child',bytes:Buffer.from('2')}]),/collision/);
});

test('ID allocation verifies selected private folder then allocates exact unique IDs without upload',async()=>{
 const ids=['allocated_file_001','allocated_file_002'];let allocations=0;const f=fixture();
 const fetcher=async(url,options)=>{if(new URL(url).pathname==='/drive/v3/files/generateIds'){allocations++;assert.equal(options.method,'GET');assert.equal(new URL(url).search,'?count=2&space=drive&type=files');return Response.json({ids,space:'drive',kind:'drive#generatedIds'});}return f.options.fetcher(url,options);};
 assert.deepEqual(await preallocateEvidenceIds({...f.options,fetcher,count:2}),ids);assert.equal(allocations,1);assert.equal(f.posts,0);
 await assert.rejects(preallocateEvidenceIds({...f.options,count:0}));
 await assert.rejects(preallocateEvidenceIds({...f.options,count:2,fetcher:async(url,options)=>new URL(url).pathname.endsWith('/generateIds')?Response.json({ids:[ids[0],ids[0]],space:'drive',kind:'drive#generatedIds'}):f.options.fetcher(url,options)}),/invalid_generated/);
});

test('explicit artifact backup segments large binary files, reverses hidden paths, deduplicates and restores every byte',async t=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'ltc-artifact-test-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 const large=Buffer.alloc(2700000,133);large[2600000]=71;
 const files=[{path:'source/.github/workflows/ci.yml',bytes:Buffer.from('name: CI')},{path:'source/app/[slug]/page.tsx',bytes:Buffer.from('export default function Page(){}')},{path:'build-output/functions/api.func/.vc-config.json',bytes:Buffer.from('{"runtime":"nodejs22.x"}')},{path:'static/large image.png',bytes:large},{path:'build-output/static/large image.png',bytes:large},{path:'evidence/empty.json',bytes:Buffer.alloc(0)}];
 const result=packageArtifactEvidence(files);assert.equal(result.manifest.files.length,files.length);assert.deepEqual(result.manifest.scopes,{source:2,static:1,'build-output':2,evidence:1});assert.equal(result.manifest.files.find(f=>f.path==='static/large image.png').parts.length,2);
 const partCount=result.bundles.reduce((n,b)=>n+b.manifest.filter(f=>f.path.startsWith('parts/')).length,0);assert.equal(partCount,5,'Duplicated static/build-output asset has one shared part set');
 const destination=path.join(temp,'restored');const proof=await restoreArtifactEvidence(result.bundles,{directory:destination,expectedManifestSha256:result.manifestSha256});assert.equal(proof.fileCount,files.length);
 for(const file of files)assert((await readFile(path.join(destination,file.path))).equals(file.bytes));
 await assert.rejects(restoreArtifactEvidence(result.bundles,{directory:destination}));
});
test('artifact paths, incomplete sets, manifest tampering and forbidden credential paths fail closed before restore',async t=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'ltc-artifact-invalid-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 for(const name of ['source/../secret','source/.env','source/.aws/config','outside/root','source//bad'])assert.throws(()=>packageArtifactEvidence([{path:name,bytes:Buffer.from('x')}]),/invalid_artifact_file/);
 const packed=packageArtifactEvidence([{path:'static/large.bin',bytes:Buffer.alloc(2700000)}]);assert(packed.bundles.length>1);
 await assert.rejects(restoreArtifactEvidence(packed.bundles.slice(0,1),{directory:path.join(temp,'missing')}));
 await assert.rejects(restoreArtifactEvidence(packed.bundles,{directory:path.join(temp,'bad'),expectedManifestSha256:'0'.repeat(64)}),/manifest_digest/);
});
