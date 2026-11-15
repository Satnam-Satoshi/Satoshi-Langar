import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {packageArtifactEvidence,packageEvidence} from './cloud-ltc-evidence.mjs';
import {extractRecoveryManifests,planSoftwareReviewEvidence,assembleSoftwareReviewEvidence} from './lib/ltc-recovery-manifest.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const page=Buffer.from('<h1>Reviewed</h1>'),empty=Buffer.alloc(0);
 const files=[{path:'source/large.bin',bytes:Buffer.alloc(4300000,7)},{path:'evidence/review.json',bytes:Buffer.from('{}')},{path:'static/index.html',bytes:page},{path:'static/empty.txt',bytes:empty},{path:'build-output/static/index.html',bytes:page},{path:'build-output/static/empty.txt',bytes:empty},{path:'build-output/config.json',bytes:Buffer.from('{"version":3}')},{path:'build-output/functions/api/example.func/.vc-config.json',bytes:Buffer.from('{}')}];
 const pkg=packageArtifactEvidence(files);
 const select=prefix=>files.filter(f=>f.path.startsWith(prefix)).map(f=>({file:f.path.slice(prefix.length),sha256:hash(f.bytes)})).sort((a,b)=>a.file.localeCompare(b.file));
 return{pkg,pins:{artifactPackageManifestSha256:pkg.manifestSha256,staticManifestSha256:hash(JSON.stringify(select('static/'))),buildOutputSha256:hash(JSON.stringify(select('build-output/')))},manifest:select('static/'),buildOutput:select('build-output/')};
}
function changed(f,mutate){
 const manifest=structuredClone(f.pkg.manifest);mutate(manifest);
 const bytes=Buffer.from(JSON.stringify(manifest)+'\n');
 const entries=JSON.parse(f.pkg.bundles[0].bytes).files.map(file=>({path:file.path,bytes:file.path==='artifact-manifest.json'?bytes:Buffer.from(file.contentBase64,'base64')}));
 return{bundle:packageEvidence(entries),pins:{...f.pins,artifactPackageManifestSha256:hash(bytes)}};
}
test('real multi-bundle package yields exact manifests from bundle zero alone without restoration claims',()=>{
 const f=fixture();assert.ok(f.pkg.bundles.length>1);
 const r=extractRecoveryManifests(f.pkg.bundles[0],f.pins);
 assert.deepEqual(r.manifest,f.manifest);assert.deepEqual(r.buildOutput,f.buildOutput);assert.equal(r.archiveBundleCount,f.pkg.bundles.length);
 assert.equal(r.archiveContentsRestored,false);assert.equal(r.protectedBytesVerified,false);assert.equal(r.recoveryAuthorized,false);
 // Omit every other bundle; there is no lookup, caller callback or filesystem output.
 f.pkg.bundles.splice(1);assert.deepEqual(extractRecoveryManifests(f.pkg.bundles[0],f.pins),r);
});
test('outer corruption, missing manifest, incorrect bundle and independent digest pins fail',()=>{
 const f=fixture();
 assert.throws(()=>extractRecoveryManifests({...f.pkg.bundles[0],sha256:'0'.repeat(64)},f.pins));
 assert.throws(()=>extractRecoveryManifests(f.pkg.bundles[1],f.pins),/manifest_missing/);
 for(const key of Object.keys(f.pins)){assert.throws(()=>extractRecoveryManifests(f.pkg.bundles[0],{...f.pins,[key]:'0'.repeat(64)}));assert.throws(()=>extractRecoveryManifests(f.pkg.bundles[0],{...f.pins,[key]:undefined}),/pins_required/);}
 const entries=JSON.parse(f.pkg.bundles[0].bytes).files;
 const manifestOnly=packageEvidence([{path:'artifact-manifest.json',bytes:Buffer.from(entries.find(f=>f.path==='artifact-manifest.json').contentBase64,'base64')}]);
 assert.throws(()=>extractRecoveryManifests(manifestOnly,f.pins),/not_bundle_zero/);
});
test('unknown schema keys, noncanonical ordering/counts and malformed paths are rejected even with repinned manifest hash',()=>{
 const f=fixture();
 const mutations=[m=>m.extra=true,m=>m.schemaVersion=2,m=>m.partBytes=1,m=>m.originalBytes++,m=>m.scopes.static++,m=>m.scopes.unknown=1,m=>m.files.reverse(),m=>m.files.push(m.files[0]),m=>m.files[0].extra=true,m=>m.files[0].length=-1,m=>m.files[0].length=1.2,m=>m.files[0].sha256='bad',m=>m.files[0].path='static/../x',m=>m.files[0].path='static/.secret',m=>m.files[0].path='/static/x',m=>m.files[0].path='static/a\\b',m=>m.files[0].path='static/a\u0000b',m=>m.files[0].parts[0].extra=true,m=>m.files[0].parts[0].path='parts/other/000000',m=>m.files[0].parts[0].length++,m=>m.files[0].parts[0].sha256='bad',m=>m.files[0].parts=[]];
 for(const mutate of mutations){const {bundle,pins}=changed(f,mutate);assert.throws(()=>extractRecoveryManifests(bundle,pins));}
});
test('dedup metadata conflicts, empty digest and single-part digest inconsistency are rejected',()=>{
 const f=fixture();
 for(const mutate of [m=>m.files.find(f=>f.path==='static/index.html').parts[0].sha256='a'.repeat(64),m=>m.files.find(f=>f.path==='static/empty.txt').sha256='a'.repeat(64),m=>{const source=m.files.find(f=>f.path==='source/large.bin');m.files.push({...structuredClone(source),path:'source/duplicate.bin',parts:source.parts.map((p,i)=>({...p,...(i?{}:{sha256:'a'.repeat(64)})}))});}]){
  const {bundle,pins}=changed(f,mutate);assert.throws(()=>extractRecoveryManifests(bundle,pins));
 }
});
test('static and deployment static must agree independently of their separately matching digest pins',()=>{
 const files=[{path:'static/index.html',bytes:Buffer.from('one')},{path:'build-output/static/index.html',bytes:Buffer.from('two')},{path:'build-output/config.json',bytes:Buffer.from('{}')}];
 const pkg=packageArtifactEvidence(files),select=prefix=>files.filter(f=>f.path.startsWith(prefix)).map(f=>({file:f.path.slice(prefix.length),sha256:hash(f.bytes)})).sort((a,b)=>a.file.localeCompare(b.file));
 assert.throws(()=>extractRecoveryManifests(pkg.bundles[0],{artifactPackageManifestSha256:pkg.manifestSha256,staticManifestSha256:hash(JSON.stringify(select('static/'))),buildOutputSha256:hash(JSON.stringify(select('build-output/')))}),/static_mismatch/);
});
test('file count and file/directory collisions fail bounded metadata validation',()=>{
 const f=fixture();
 const huge={...f.pkg.manifest,files:Array(8193).fill({path:'static/x',length:0,sha256:hash(Buffer.alloc(0)),parts:[]})},bytes=Buffer.from(JSON.stringify(huge)+'\n');
 assert.throws(()=>extractRecoveryManifests(packageEvidence([{path:'artifact-manifest.json',bytes}]),{...f.pins,artifactPackageManifestSha256:hash(bytes)}),/manifest_invalid/);
 for(const mutate of [m=>{m.files.push({path:'static/index.html/child',length:0,sha256:hash(Buffer.alloc(0)),parts:[]});}]){
  const {bundle,pins}=changed(f,mutate);assert.throws(()=>extractRecoveryManifests(bundle,pins));
 }
});
test('noncanonical JSON whitespace and extra bundle-zero payloads cannot be hidden by matching pins',()=>{
 const f=fixture(),entries=JSON.parse(f.pkg.bundles[0].bytes).files.map(f=>({path:f.path,bytes:Buffer.from(f.contentBase64,'base64')}));
 const entry=entries.find(f=>f.path==='artifact-manifest.json');entry.bytes=Buffer.from(JSON.stringify(f.pkg.manifest,null,1)+'\n');
 const changed=packageEvidence(entries);assert.throws(()=>extractRecoveryManifests(changed,{...f.pins,artifactPackageManifestSha256:hash(entry.bytes)}),/noncanonical/);
 const extra=packageEvidence([...JSON.parse(f.pkg.bundles[0].bytes).files.map(f=>({path:f.path,bytes:Buffer.from(f.contentBase64,'base64')})),{path:'unreferenced.bin',bytes:Buffer.from('extra')}]);
 assert.throws(()=>extractRecoveryManifests(extra,f.pins),/not_bundle_zero/);
});

function reviewFixture(value={review:{approvalId:'fixed'},softwareRelease:{kind:'software-only',padding:'x'.repeat(2199900)}}){
 const reviewBytes=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value));
 // A preceding small deduplicated part forces this review's two parts across
 // bundle boundaries, exercising selective assembly instead of a lucky bundle.
 let preceding;for(let i=0;i<1000;i++){const b=Buffer.alloc(300000,i%256);if(hash(b)<hash(reviewBytes)){preceding=b;break;}}assert.ok(preceding);
 const files=[{path:'evidence/software-review.json',bytes:reviewBytes},{path:'source/preceding.bin',bytes:preceding},{path:'source/unneeded.bin',bytes:Buffer.alloc(4300000,8)},{path:'static/index.html',bytes:Buffer.from('page')},{path:'build-output/static/index.html',bytes:Buffer.from('page')},{path:'build-output/config.json',bytes:Buffer.from('{}')}];
 const pkg=packageArtifactEvidence(files),select=prefix=>files.filter(f=>f.path.startsWith(prefix)).map(f=>({file:f.path.slice(prefix.length),sha256:hash(f.bytes)})).sort((a,b)=>a.file.localeCompare(b.file));
 const pins={artifactPackageManifestSha256:pkg.manifestSha256,staticManifestSha256:hash(JSON.stringify(select('static/'))),buildOutputSha256:hash(JSON.stringify(select('build-output/')))};
 const plan=planSoftwareReviewEvidence(pkg.bundles[0],pins),downloads=plan.downloadBundleIndexes.map(index=>({index,bundle:pkg.bundles[index],expectedSha256:pkg.bundles[index].sha256}));
 return{pkg,pins,plan,downloads};
}
test('fixed review plan assembles canonical original review/context from required bundles only',()=>{
 const f=reviewFixture();assert.ok(f.plan.bundleIndexes.length>1);assert.ok(f.pkg.bundles.length>f.plan.bundleIndexes.length);
 assert.equal(f.plan.file.path,'evidence/software-review.json');assert.ok(!f.plan.downloadBundleIndexes.includes(0));
 const r=assembleSoftwareReviewEvidence(f.pkg.bundles[0],f.downloads,f.pins);
 assert.deepEqual(r.originalReview,{approvalId:'fixed'});assert.equal(r.originalContext.kind,'software-only');assert.equal(r.originalContext.padding.length,2199900);
 assert.equal(r.reviewFileBytesVerified,true);assert.equal(r.archiveContentsRestored,false);assert.equal(r.protectedBytesVerified,false);assert.equal(r.recoveryAuthorized,false);
});
test('selective review rejects missing/duplicate/wrong-index/corrupt bundles and receipt hashes',()=>{
 const f=reviewFixture(),run=downloads=>assembleSoftwareReviewEvidence(f.pkg.bundles[0],downloads,f.pins);
 assert.throws(()=>run([]));assert.throws(()=>run([...f.downloads,f.downloads[0]]));
 assert.throws(()=>run(f.downloads.map((d,i)=>i?d:{...d,index:999})));assert.throws(()=>run(f.downloads.map((d,i)=>i?d:{...d,expectedSha256:'0'.repeat(64)})));
 assert.throws(()=>run(f.downloads.map((d,i)=>i?d:{...d,bundle:{...d.bundle,bytes:Buffer.from('corrupt')}})));
 const first=f.downloads[0],entries=JSON.parse(first.bundle.bytes).files.map(e=>({path:e.path,bytes:Buffer.from(e.contentBase64,'base64')}));
 entries[0].bytes[0]^=1;const changed=packageEvidence(entries);
 assert.throws(()=>run([{...first,bundle:changed,expectedSha256:changed.sha256},...f.downloads.slice(1)]),/metadata_mismatch/);
 // A repeated part changes the canonical outer package itself and is rejected.
 const decoded=JSON.parse(first.bundle.bytes);decoded.files.push(decoded.files[0]);const bytes=Buffer.from(JSON.stringify(decoded)+'\n');
 assert.throws(()=>run([{...first,bundle:{bytes,length:bytes.length,sha256:hash(bytes)},expectedSha256:hash(bytes)},...f.downloads.slice(1)]));
});
test('exact fixed review record and canonical object pair are mandatory',()=>{
 const absent=fixture();assert.throws(()=>planSoftwareReviewEvidence(absent.pkg.bundles[0],absent.pins),/software_review_missing/);
 for(const value of [Buffer.from('not JSON'),Buffer.from('{"review":{},"softwareRelease":{},"extra":true}'),Buffer.from('{ "review":{},"softwareRelease":{} }'),Buffer.from('{"review":{},"review":{},"softwareRelease":{}}'),{review:null,softwareRelease:{}},{review:{},softwareRelease:[]},{review:{},wrong:{}}]){
  const f=reviewFixture(value);assert.throws(()=>assembleSoftwareReviewEvidence(f.pkg.bundles[0],f.downloads,f.pins),/software_review_json_invalid/);
 }
});
