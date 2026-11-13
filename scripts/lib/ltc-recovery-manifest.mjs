import {createHash} from 'node:crypto';
import {verifyEvidenceBundle,MAX_EVIDENCE_RAW_BYTES} from '../cloud-ltc-evidence.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const check=(value,code)=>{if(!value)throw Error(code);};
const PART_BYTES=2000000,scopes=['source','static','build-output','evidence'];
// Identical path boundary to packageArtifactEvidence/restoreArtifactEvidence.
const hidden=new Set(['.github','.vercel','.vc-config.json','.env.example','.gitignore','.gitattributes','.gitkeep','.nvmrc','.release','.well-known']);
function artifactPath(value){
 if(typeof value!=='string'||value.length>500||!/^(?:source|static|build-output|evidence)\//.test(value)||/[\u0000-\u001f\u007f\uD800-\uDFFF\\]/u.test(value))return false;
 return value.split('/').every(piece=>piece&&piece!=='.'&&piece!=='..'&&(!piece.startsWith('.')||hidden.has(piece)));
}
const lexical=(a,b)=>a.path<b.path?-1:a.path>b.path?1:0;
/** Pure metadata extraction. No I/O, restore, network read, or stage acceptance.
 * Caller must bind bundleZero to the confirmed index-0 receipt and independently
 * supply all three expected digests. Missing archive parts are never synthesized.
 */
function validateRecoveryMetadata(bundleZero,{artifactPackageManifestSha256,staticManifestSha256,buildOutputSha256}={}){
 check([artifactPackageManifestSha256,staticManifestSha256,buildOutputSha256].every(digest),'recovery_manifest_pins_required');
 const bundle=verifyEvidenceBundle(bundleZero),entries=JSON.parse(bundle.bytes.toString('utf8')).files;
 const manifests=entries.filter(entry=>entry.path==='artifact-manifest.json');
 check(manifests.length===1,'recovery_manifest_missing');
 const bytes=Buffer.from(manifests[0].contentBase64,'base64');
 check(bytes.length<=MAX_EVIDENCE_RAW_BYTES&&hash(bytes)===artifactPackageManifestSha256,'recovery_manifest_digest_mismatch');
 let input;try{input=JSON.parse(bytes.toString('utf8'));}catch{throw Error('recovery_manifest_invalid');}
 check(input?.schemaVersion===1&&input.kind==='ltc-release-artifacts'&&input.partBytes===PART_BYTES&&Array.isArray(input.files)&&input.files.length>0&&input.files.length<=8192,'recovery_manifest_invalid');
 const files=[],names=new Set(),parts=new Map(),fileDigests=new Map();let originalBytes=0;
 for(const file of input.files){
  check(file&&artifactPath(file.path)&&!names.has(file.path)&&Number.isSafeInteger(file.length)&&file.length>=0&&digest(file.sha256)&&Array.isArray(file.parts)&&file.parts.length===Math.ceil(file.length/PART_BYTES),'recovery_manifest_file_invalid');
  names.add(file.path);originalBytes+=file.length;check(originalBytes<=1000000000,'recovery_manifest_too_large');
  const references=file.parts.map((part,index)=>{
   const expected=`parts/${file.sha256}/${String(index).padStart(6,'0')}`;
   check(part&&part.path===expected&&digest(part.sha256)&&Number.isSafeInteger(part.length)&&part.length===Math.min(PART_BYTES,file.length-index*PART_BYTES),'recovery_manifest_part_invalid');
   const canonical={path:expected,length:part.length,sha256:part.sha256};
   check(JSON.stringify(part)===JSON.stringify(canonical),'recovery_manifest_noncanonical');
   const prior=parts.get(expected);check(!prior||JSON.stringify(prior)===JSON.stringify(canonical),'recovery_manifest_dedup_conflict');parts.set(expected,canonical);return canonical;
  });
  if(file.length===0)check(file.sha256===hash(Buffer.alloc(0)),'recovery_manifest_file_invalid');
  if(references.length===1)check(file.sha256===references[0].sha256,'recovery_manifest_file_invalid');
  const identity=JSON.stringify({length:file.length,parts:references}),prior=fileDigests.get(file.sha256);
  check(prior===undefined||prior===identity,'recovery_manifest_dedup_conflict');fileDigests.set(file.sha256,identity);
  files.push({path:file.path,length:file.length,sha256:file.sha256,parts:references});
 }
 for(const name of names){const pieces=name.split('/');for(let i=1;i<pieces.length;i++)check(!names.has(pieces.slice(0,i).join('/')),'recovery_manifest_path_collision');}
 files.sort(lexical);
 const canonical={schemaVersion:1,kind:'ltc-release-artifacts',partBytes:PART_BYTES,scopes:Object.fromEntries(scopes.map(scope=>[scope,files.filter(file=>file.path.startsWith(scope+'/')).length])),originalBytes,files};
 check(Buffer.from(JSON.stringify(canonical)+'\n').equals(bytes),'recovery_manifest_noncanonical');
 // Reproduce chunkEvidence's metadata grouping to prove this is exactly bundle 0.
 const ordered=[{path:'artifact-manifest.json',length:bytes.length,sha256:hash(bytes)},...[...parts.values()].sort(lexical)];
 check(ordered.length<=4096&&ordered.reduce((n,p)=>n+p.length,0)<=MAX_EVIDENCE_RAW_BYTES*64,'recovery_manifest_too_large');
 const groups=[];let group=[],size=0;
 for(const part of ordered){if(group.length&&(group.length===128||size+part.length>MAX_EVIDENCE_RAW_BYTES)){groups.push(group);group=[];size=0;}group.push(part);size+=part.length;}if(group.length)groups.push(group);
 check(groups.length<=64,'recovery_manifest_too_large');
 check(JSON.stringify(entries.map(({path,length,sha256})=>({path,length,sha256})))===JSON.stringify(groups[0]),'recovery_manifest_not_bundle_zero');
 const select=prefix=>files.filter(file=>file.path.startsWith(prefix)).map(file=>({file:file.path.slice(prefix.length),sha256:file.sha256})).sort((a,b)=>a.file.localeCompare(b.file));
 const manifest=select('static/'),buildOutput=select('build-output/');
 check(manifest.length>0&&buildOutput.some(record=>record.file==='config.json')&&buildOutput.every(record=>record.file==='config.json'||record.file.startsWith('static/')||record.file.startsWith('functions/')),'recovery_manifest_output_invalid');
 const outputStatic=buildOutput.filter(record=>record.file.startsWith('static/')).map(record=>({file:record.file.slice(7),sha256:record.sha256})).sort((a,b)=>a.file.localeCompare(b.file));
 check(JSON.stringify(manifest)===JSON.stringify(outputStatic),'recovery_manifest_static_mismatch');
 check(hash(JSON.stringify(manifest))===staticManifestSha256&&hash(JSON.stringify(buildOutput))===buildOutputSha256,'recovery_manifest_output_digest_mismatch');
 const result={schemaVersion:1,kind:'recovery-manifest-metadata-only',artifactPackageManifestSha256,staticManifestSha256,buildOutputSha256,manifest,buildOutput,archiveBundleCount:groups.length,archiveContentsRestored:false,protectedBytesVerified:false,recoveryAuthorized:false};
 return {result,files,groups};
}

export function extractRecoveryManifests(bundleZero,pins){return validateRecoveryMetadata(bundleZero,pins).result;}

const REVIEW_PATH='evidence/software-review.json';
function reviewPlan(validated){
 const matches=validated.files.filter(file=>file.path===REVIEW_PATH);
 check(matches.length===1,'software_review_missing');const file=matches[0];
 check(file.length>0&&file.length<=MAX_EVIDENCE_RAW_BYTES,'software_review_size_invalid');
 const needed=new Set(file.parts.map(part=>part.path));
 const bundleIndexes=validated.groups.flatMap((group,index)=>group.some(part=>needed.has(part.path))?[index]:[]);
 return {schemaVersion:1,kind:'software-review-metadata-plan',artifactPackageManifestSha256:validated.result.artifactPackageManifestSha256,file:structuredClone(file),bundleIndexes,downloadBundleIndexes:bundleIndexes.filter(index=>index!==0),reviewVerified:false,recoveryAuthorized:false};
}
/** Fixed-path plan only. Index 0 is already supplied; downloadBundleIndexes
 * lists only additional bundles to retrieve with independently bound receipts. */
export function planSoftwareReviewEvidence(bundleZero,pins){return reviewPlan(validateRecoveryMetadata(bundleZero,pins));}

/** Downloads: [{index,bundle,expectedSha256}], exactly the additional indexes
 * in the recomputed plan. expectedSha256 must come from the caller-verified
 * receipt, never from the downloaded response. The plan is not trusted input. */
export function assembleSoftwareReviewEvidence(bundleZero,downloads,pins){
 const validated=validateRecoveryMetadata(bundleZero,pins),plan=reviewPlan(validated);
 check(Array.isArray(downloads)&&downloads.length===plan.downloadBundleIndexes.length,'software_review_bundle_set_invalid');
 const supplied=new Map([[0,verifyEvidenceBundle(bundleZero)]]);
 for(const download of downloads){
  check(download&&Number.isSafeInteger(download.index)&&plan.downloadBundleIndexes.includes(download.index)&&!supplied.has(download.index)&&digest(download.expectedSha256)&&download.bundle?.sha256===download.expectedSha256,'software_review_bundle_set_invalid');
  const bundle=verifyEvidenceBundle(download.bundle),entries=JSON.parse(bundle.bytes.toString('utf8')).files;
  check(JSON.stringify(entries.map(({path,length,sha256})=>({path,length,sha256})))===JSON.stringify(validated.groups[download.index]),'software_review_bundle_metadata_mismatch');
  supplied.set(download.index,bundle);
 }
 const wanted=new Set(plan.file.parts.map(part=>part.path)),found=new Map();
 for(const index of plan.bundleIndexes){
  const bundle=supplied.get(index);check(bundle,'software_review_bundle_missing');
  for(const entry of JSON.parse(bundle.bytes.toString('utf8')).files){if(!wanted.has(entry.path))continue;
   check(!found.has(entry.path),'software_review_duplicate_part');found.set(entry.path,Buffer.from(entry.contentBase64,'base64'));
  }
 }
 const chunks=plan.file.parts.map(part=>{const bytes=found.get(part.path);check(bytes&&bytes.length===part.length&&hash(bytes)===part.sha256,'software_review_part_invalid');return bytes;});
 const bytes=Buffer.concat(chunks);check(bytes.length===plan.file.length&&hash(bytes)===plan.file.sha256,'software_review_digest_mismatch');
 let value;try{value=JSON.parse(bytes.toString('utf8'));}catch{throw Error('software_review_json_invalid');}
 const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 check(plain(value)&&plain(value.review)&&plain(value.softwareRelease)&&Buffer.from(JSON.stringify({review:value.review,softwareRelease:value.softwareRelease})).equals(bytes),'software_review_json_invalid');
 return {schemaVersion:1,kind:'assembled-software-review-only',originalReview:value.review,originalContext:value.softwareRelease,softwareReviewSha256:plan.file.sha256,artifactPackageManifestSha256:plan.artifactPackageManifestSha256,reviewFileBytesVerified:true,archiveContentsRestored:false,protectedBytesVerified:false,recoveryAuthorized:false};
}
