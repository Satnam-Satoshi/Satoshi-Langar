import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const MAX_RAW=2_500_000,MAX_BUNDLE=3_500_000,MAX_FILES=128;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,160}$/.test(value);
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const check=(ok,message)=>{if(!ok)throw Error(message);};
const safePath=value=>typeof value==='string'&&value.length<=240&&/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value)&&value.split('/').every(s=>s&&s!=='.'&&s!=='..'&&!s.startsWith('.'));
/** Caller explicitly selects evidence; never crawl a checkout or environment. */
export function packageEvidence(files){
 check(Array.isArray(files)&&files.length>0&&files.length<=MAX_FILES,'invalid_evidence_files');
 let total=0;const seen=new Set();
 const entries=files.map(file=>{
  check(file&&safePath(file.path)&&!seen.has(file.path),'invalid_evidence_path');seen.add(file.path);
  check(Buffer.isBuffer(file.bytes)||file.bytes instanceof Uint8Array,'invalid_evidence_bytes');
  const bytes=Buffer.from(file.bytes);total+=bytes.length;check(total<=MAX_RAW,'evidence_too_large');
  return {path:file.path,length:bytes.length,sha256:hash(bytes),contentBase64:bytes.toString('base64')};
 }).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 for(const entry of entries)check(!entries.some(other=>other.path.startsWith(entry.path+'/')),'evidence_path_collision');
 const bytes=Buffer.from(JSON.stringify({schemaVersion:1,files:entries})+'\n');check(bytes.length<=MAX_BUNDLE,'evidence_too_large');
 return {bytes,sha256:hash(bytes),length:bytes.length,manifest:entries.map(({contentBase64,...entry})=>entry)};
}
/** Deterministic greedy grouping; a single oversized file is rejected, never truncated. */
export function chunkEvidence(files){
 check(Array.isArray(files)&&files.length>0&&files.length<=4096,'invalid_evidence_files');
 const entries=files.map(file=>{check(file&&safePath(file.path)&&(Buffer.isBuffer(file.bytes)||file.bytes instanceof Uint8Array),'invalid_evidence_file');check(file.bytes.length<=MAX_RAW,'evidence_file_too_large');return {path:file.path,bytes:Buffer.from(file.bytes)};}).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 check(new Set(entries.map(entry=>entry.path)).size===entries.length,'duplicate_evidence_path');
 check(entries.reduce((total,entry)=>total+entry.bytes.length,0)<=MAX_RAW*64,'evidence_set_too_large');
 const names=new Set(entries.map(entry=>entry.path));
 for(const entry of entries){const segments=entry.path.split('/');for(let i=1;i<segments.length;i++)check(!names.has(segments.slice(0,i).join('/')),'evidence_path_collision');}
 const chunks=[];let pending=[],size=0;
 for(const entry of entries){
  if(pending.length&&(pending.length===MAX_FILES||size+entry.bytes.length>MAX_RAW)){chunks.push(packageEvidence(pending));pending=[];size=0;}
  pending.push(entry);size+=entry.bytes.length;
 }
 if(pending.length)chunks.push(packageEvidence(pending));check(chunks.length<=64,'evidence_set_too_large');return chunks;
}
export function verifyEvidenceBundle(bundle){
 check(bundle&&Buffer.isBuffer(bundle.bytes)&&bundle.bytes.length<=MAX_BUNDLE&&sha(bundle.sha256)&&hash(bundle.bytes)===bundle.sha256&&bundle.length===bundle.bytes.length,'invalid_evidence_digest');
 let decoded;try{decoded=JSON.parse(bundle.bytes.toString('utf8'));}catch{throw Error('invalid_evidence_json');}
 check(decoded?.schemaVersion===1&&Array.isArray(decoded.files),'invalid_evidence_schema');
 const rebuilt=packageEvidence(decoded.files.map(file=>{
  check(typeof file.contentBase64==='string'&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.contentBase64),'invalid_evidence_encoding');
  const bytes=Buffer.from(file.contentBase64,'base64');check(file.length===bytes.length&&file.sha256===hash(bytes),'invalid_evidence_file_digest');return {path:file.path,bytes};
 }));
 check(rebuilt.bytes.equals(bundle.bytes),'noncanonical_evidence_bundle');return rebuilt;
}
const DIAGNOSTIC=Symbol('private-evidence-failure');
const diagnosticPhases=new Set(['folder-metadata','folder-permissions','upload-preflight','upload-post','readback-metadata','readback-permissions','readback-media','readback-integrity','id-allocation']);
const diagnosticReasons=new Set(['authorization','transport','timeout','http-status','redirect','body','integrity','not-found']);
export function safeEvidenceDiagnostic(value){return {provider:'drive-evidence',phase:diagnosticPhases.has(value?.phase)?value.phase:'unknown',reason:diagnosticReasons.has(value?.reason)?value.reason:'unknown',httpStatus:Number.isInteger(value?.httpStatus)&&value.httpStatus>=100&&value.httpStatus<=599?value.httpStatus:null,timedOut:value?.timedOut===true,postAttempted:value?.postAttempted===true};}
function trackedOptions(options){return options[DIAGNOSTIC]?options:{...options,[DIAGNOSTIC]:{postAttempted:false,reported:false}};}
async function reportDiagnostic(options,value){const tracking=options[DIAGNOSTIC];if(!tracking||tracking.reported)return;tracking.reported=true;const safe=safeEvidenceDiagnostic({...value,postAttempted:tracking.postAttempted});try{await options.onDiagnostic?.(safe);}catch{/* Diagnostic storage failure never authorizes a retry or replaces uncertainty. */}}
function configCheck(config){check(config&&id(config.folderId)&&id(config.fileId)&&id(config.ownerPermissionId)&&config.fileId!==config.folderId,'invalid_evidence_configuration');}
async function bounded(response,limit){
 check(response.body,'missing_drive_body');const reader=response.body.getReader();let count=0;const parts=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;check(count<=limit,'drive_response_too_large');parts.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(parts);
}
function client(options){
 const {getAccessToken,fetcher=fetch,timeoutMs=15000}=options;
 check(typeof getAccessToken==='function','missing_token_provider');
 return async (pathname,{method='GET',body,contentType,limit=100_000,allowMissing=false,phase='unknown'}={})=>{
  check(/^\/(?:drive\/v3\/files\/[A-Za-z0-9_-]+(?:\/permissions)?|upload\/drive\/v3\/files)(?:\?[^#]*)?$/.test(pathname),'drive_path_not_allowed');
  let token;try{token=await getAccessToken();check(typeof token==='string'&&token.length>0&&!/[\r\n]/.test(token),'invalid_access_token');}catch{await reportDiagnostic(options,{phase,reason:'authorization',httpStatus:null,timedOut:false});throw Error('drive_request_unconfirmed');}
  const controller=new AbortController();let timer,status=null,timedOut=false,reason='transport';
  try{
   const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{timedOut=true;controller.abort();reject(Error('drive_timeout'));},timeoutMs);});
   return await Promise.race([(async()=>{if(method==='POST'&&options[DIAGNOSTIC])options[DIAGNOSTIC].postAttempted=true;
    const response=await fetcher('https://www.googleapis.com'+pathname,{method,body,redirect:'error',cache:'no-store',signal:controller.signal,headers:{authorization:`Bearer ${token}`,accept:'application/json',...(contentType?{'content-type':contentType}:{})}});
    status=response.status;if(response.redirected){reason='redirect';throw Error('drive_redirect_rejected');}if(allowMissing&&status===404)return null;if(!response.ok){reason='http-status';throw Error('drive_request_failed');}reason='body';return bounded(response,limit);})(),deadline]);
  }catch{await reportDiagnostic(options,{phase,reason:timedOut?'timeout':reason,httpStatus:status,timedOut});throw Error('drive_request_unconfirmed');}finally{clearTimeout(timer);controller.abort();}
 };
}
const fields='id,name,mimeType,parents,trashed,ownedByMe,size,appProperties';
async function metadata(call,fileId,phase='readback-metadata'){const bytes=await call(`/drive/v3/files/${fileId}?fields=${encodeURIComponent(fields)}`,{allowMissing:true,phase});return bytes===null?null:JSON.parse(bytes.toString('utf8'));}
async function ownerOnly(call,fileId,ownerId,phase='readback-permissions'){
 const bytes=await call(`/drive/v3/files/${fileId}/permissions?fields=${encodeURIComponent('nextPageToken,permissions(id,type,role,deleted)')}&pageSize=100`,{phase});
 const result=JSON.parse(bytes.toString('utf8'));
 check(!result.nextPageToken&&Array.isArray(result.permissions)&&result.permissions.length===1,'evidence_not_owner_only');
 const p=result.permissions[0];check(p.id===ownerId&&p.type==='user'&&p.role==='owner'&&p.deleted!==true,'evidence_not_owner_only');
}
async function verifyFolder(call,config){
 const meta=await metadata(call,config.folderId,'folder-metadata');check(meta&&meta.id===config.folderId&&meta.mimeType==='application/vnd.google-apps.folder'&&meta.trashed===false&&meta.ownedByMe===true,'unverified_evidence_folder');await ownerOnly(call,config.folderId,config.ownerPermissionId,'folder-permissions');
}
function operationCheck(context){check(context&&typeof context.operationId==='string'&&/^[a-zA-Z0-9._:-]{1,120}$/.test(context.operationId)&&sha(context.payloadSha256),'invalid_evidence_operation');}
export async function downloadEvidence(receipt,options){
 options=trackedOptions(options);try{
 const {config}=options;configCheck(config);check(receipt&&receipt.fileId===config.fileId&&receipt.folderId===config.folderId&&sha(receipt.sha256)&&Number.isSafeInteger(receipt.length)&&receipt.length>0&&receipt.length<=MAX_BUNDLE,'invalid_evidence_receipt');
 const call=client(options);await verifyFolder(call,config);const meta=await metadata(call,config.fileId);if(!meta){await reportDiagnostic(options,{phase:'readback-metadata',reason:'not-found',httpStatus:404,timedOut:false});return null;}
 check(meta.id===config.fileId&&meta.name===`ltc-evidence-${receipt.sha256}.json`&&meta.mimeType==='application/json'&&meta.ownedByMe===true&&meta.trashed===false&&Array.isArray(meta.parents)&&meta.parents.length===1&&meta.parents[0]===config.folderId&&meta.size===String(receipt.length),'evidence_metadata_mismatch');
 check(meta.appProperties?.sha256===receipt.sha256&&meta.appProperties?.operationId===receipt.operationId&&meta.appProperties?.payloadSha256===receipt.payloadSha256,'evidence_operation_mismatch');
 await ownerOnly(call,config.fileId,config.ownerPermissionId);
 const bytes=await call(`/drive/v3/files/${config.fileId}?alt=media`,{limit:MAX_BUNDLE,phase:'readback-media'});
 const bundle=verifyEvidenceBundle({bytes,sha256:receipt.sha256,length:receipt.length});
 return {bundle,proof:{fileId:config.fileId,folderId:config.folderId,sha256:bundle.sha256,length:bundle.length,ownerPermissionId:config.ownerPermissionId,ownerOnly:true,downloadVerified:true}};
 }catch(error){await reportDiagnostic(options,{phase:'readback-integrity',reason:'integrity',httpStatus:null,timedOut:false});throw error;}
}
/** Exactly one create attempt. An uncertain response MUST be reconciled by known fileId. */
export async function uploadEvidence(bundle,options,context){
 options=trackedOptions(options);try{
 const valid=verifyEvidenceBundle(bundle),{config}=options;configCheck(config);operationCheck(context);
 const receipt={fileId:config.fileId,folderId:config.folderId,sha256:valid.sha256,length:valid.length,operationId:context.operationId,payloadSha256:context.payloadSha256};
 const call=client(options);await verifyFolder(call,config);
 const prior=await metadata(call,config.fileId,'upload-preflight');
 if(prior){const restored=await downloadEvidence(receipt,options);check(restored,'evidence_readback_missing');return {receipt,...restored};}
 const boundary=`ltc_evidence_${valid.sha256}`;
 const meta={id:config.fileId,name:`ltc-evidence-${valid.sha256}.json`,mimeType:'application/json',parents:[config.folderId],appProperties:{sha256:valid.sha256,operationId:context.operationId,payloadSha256:context.payloadSha256}};
 const body=Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`),valid.bytes,Buffer.from(`\r\n--${boundary}--\r\n`)]);
 // Multipart bundles can be several MiB. Give the single create request a
 // bounded minute; metadata/readback keep their shorter existing deadline.
 // An explicit caller deadline still applies, and no request is retried.
 const upload=client({...options,timeoutMs:options.timeoutMs??60_000});
 try{await upload('/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',body,contentType:`multipart/related; boundary=${boundary}`,phase:'upload-post'});}catch{
  // A lost create acknowledgement permits exact known-ID reads only. Neither
  // absence nor unavailable proof authorizes a second create or not-applied.
  if(options[DIAGNOSTIC].postAttempted){
   for(let attempt=0;attempt<3;attempt++){
    try{const restored=await downloadEvidence(receipt,options);if(restored)return {receipt,...restored};}
    catch(error){if(error?.message!=='drive_request_unconfirmed')break;}
    if(attempt<2){try{await(options.readbackWait??(ms=>new Promise(resolve=>setTimeout(resolve,ms))))(1000);}catch{break;}}
   }
  }
  throw Error('evidence_upload_outcome_unknown');
 }
 const restored=await downloadEvidence(receipt,options);check(restored,'evidence_readback_missing');return {receipt,...restored};
 }catch(error){await reportDiagnostic(options,{phase:'upload-preflight',reason:'integrity',httpStatus:null,timedOut:false});throw error;}
}
export async function restoreEvidence(bundle,{directory}){
 const valid=verifyEvidenceBundle(bundle);check(typeof directory==='string'&&path.isAbsolute(directory),'invalid_restore_directory');
 // Exclusive root creation prevents traversal through pre-existing symlinks or overwrites.
 await mkdir(directory,{mode:0o700});const entries=JSON.parse(valid.bytes.toString('utf8')).files;
 for(const entry of entries){const target=path.join(directory,...entry.path.split('/'));await mkdir(path.dirname(target),{recursive:true,mode:0o700});await writeFile(target,Buffer.from(entry.contentBase64,'base64'),{flag:'wx',mode:0o600});check(hash(await readFile(target))===entry.sha256,'restore_readback_mismatch');}
 return {directory,sha256:valid.sha256,fileCount:entries.length,restored:true};
}
export function createDriveEvidenceProvider(options){
 options=trackedOptions(options);
 const valid=verifyEvidenceBundle(options.bundle);configCheck(options.config);
 const bind=context=>{operationCheck(context);const p=context.payload;check(p&&p.fileId===options.config.fileId&&p.folderId===options.config.folderId&&p.sha256===valid.sha256&&p.bytes===valid.length,'evidence_payload_mismatch');check(hash(Buffer.from(JSON.stringify(p)))===context.payloadSha256,'evidence_payload_digest_mismatch');};
 return {
  async apply(context){bind(context);const result=await uploadEvidence(valid,options,context);return {operationId:context.operationId,payloadSha256:context.payloadSha256,status:'applied',proof:result.proof};},
  async readback(context){bind(context);const receipt={fileId:options.config.fileId,folderId:options.config.folderId,sha256:valid.sha256,length:valid.length,operationId:context.operationId,payloadSha256:context.payloadSha256};try{const result=await downloadEvidence(receipt,options);return {operationId:context.operationId,payloadSha256:context.payloadSha256,status:result?'applied':'unknown',proof:result?.proof??{fileId:receipt.fileId,sha256:receipt.sha256,folderId:receipt.folderId,verified:false}};}catch{return {operationId:context.operationId,payloadSha256:context.payloadSha256,status:'unknown',proof:{fileId:receipt.fileId,sha256:receipt.sha256,folderId:receipt.folderId,verified:false}};}}
 };
}

/** Allocate opaque IDs only; caller must durably intend each ID before any upload. */
export async function preallocateEvidenceIds({count,config,getAccessToken,fetcher=fetch,timeoutMs=15000,onDiagnostic}){
 check(Number.isSafeInteger(count)&&count>=1&&count<=64,'invalid_evidence_id_count');
 check(config&&id(config.folderId)&&id(config.ownerPermissionId),'invalid_evidence_configuration');
 const call=client(trackedOptions({getAccessToken,fetcher,timeoutMs,onDiagnostic}));await verifyFolder(call,config);
 const raw=await call(`/drive/v3/files/generateIds?count=${count}&space=drive&type=files`,{phase:'id-allocation'});
 const result=JSON.parse(raw.toString('utf8'));
 check(result.space==='drive'&&result.kind==='drive#generatedIds'&&Array.isArray(result.ids)&&result.ids.length===count&&result.ids.every(value=>id(value)&&value!==config.folderId)&&new Set(result.ids).size===count,'invalid_generated_evidence_ids');
 return result.ids;
}

const ARTIFACT_PART_BYTES=2_000_000;
const HIDDEN_ARTIFACT_SEGMENTS=new Set(['.github','.vercel','.vc-config.json','.env.example','.gitignore','.gitattributes','.gitkeep','.nvmrc','.release','.well-known']);
function artifactPath(value){
 if(typeof value!=='string'||value.length>500||! /^(?:source|static|build-output|evidence)\//.test(value)||/[\u0000-\u001f\u007f\uD800-\uDFFF\\]/u.test(value))return false;
 const pieces=value.split('/');return pieces.every(piece=>piece&&piece!=='.'&&piece!=='..'&&(!piece.startsWith('.')||HIDDEN_ARTIFACT_SEGMENTS.has(piece)));
}
/** Encode only explicitly selected artifacts. No directory traversal/crawl or secret discovery. */
export function packageArtifactEvidence(files){
 check(Array.isArray(files)&&files.length>0&&files.length<=8192,'invalid_artifact_files');
 const ordered=[...files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),names=new Set(),parts=new Map(),manifestFiles=[];
 let originalBytes=0;
 for(const file of ordered){
  check(file&&artifactPath(file.path)&&!names.has(file.path)&&(Buffer.isBuffer(file.bytes)||file.bytes instanceof Uint8Array),'invalid_artifact_file');names.add(file.path);
  const bytes=Buffer.from(file.bytes);originalBytes+=bytes.length;check(originalBytes<=1_000_000_000,'artifact_source_set_too_large');
  const digest=hash(bytes),references=[];
  for(let offset=0,index=0;offset<bytes.length;offset+=ARTIFACT_PART_BYTES,index++){
   const piece=bytes.subarray(offset,offset+ARTIFACT_PART_BYTES),partPath=`parts/${digest}/${String(index).padStart(6,'0')}`;
   const record={path:partPath,length:piece.length,sha256:hash(piece)};references.push(record);
   if(!parts.has(partPath))parts.set(partPath,{path:partPath,bytes:Buffer.from(piece)});
  }
  manifestFiles.push({path:file.path,length:bytes.length,sha256:digest,parts:references});
 }
 for(const name of names){const pieces=name.split('/');for(let n=1;n<pieces.length;n++)check(!names.has(pieces.slice(0,n).join('/')),'artifact_path_collision');}
 const scopes=Object.fromEntries(['source','static','build-output','evidence'].map(scope=>[scope,manifestFiles.filter(file=>file.path.startsWith(scope+'/')).length]));
 const manifest={schemaVersion:1,kind:'ltc-release-artifacts',partBytes:ARTIFACT_PART_BYTES,scopes,originalBytes,files:manifestFiles};
 const manifestBytes=Buffer.from(JSON.stringify(manifest)+'\n');check(manifestBytes.length<=MAX_RAW,'artifact_manifest_too_large');
 const bundles=chunkEvidence([{path:'artifact-manifest.json',bytes:manifestBytes},...parts.values()]);
 return {bundles,manifest,manifestSha256:hash(manifestBytes)};
}
export async function restoreArtifactEvidence(bundles,{directory,expectedManifestSha256}={}){
 check(Array.isArray(bundles)&&bundles.length>0&&bundles.length<=64,'invalid_artifact_bundles');
 check(typeof directory==='string'&&path.isAbsolute(directory),'invalid_restore_directory');
 if(expectedManifestSha256!==undefined)check(sha(expectedManifestSha256),'invalid_manifest_digest');
 const entries=new Map();
 for(const bundle of bundles){const valid=verifyEvidenceBundle(bundle);for(const file of JSON.parse(valid.bytes.toString('utf8')).files){check(!entries.has(file.path),'duplicate_artifact_entry');entries.set(file.path,Buffer.from(file.contentBase64,'base64'));}}
 const manifestBytes=entries.get('artifact-manifest.json');check(manifestBytes,'artifact_manifest_missing');
 const manifestSha256=hash(manifestBytes);if(expectedManifestSha256!==undefined)check(manifestSha256===expectedManifestSha256,'artifact_manifest_digest_mismatch');
 let manifest;try{manifest=JSON.parse(manifestBytes.toString('utf8'));}catch{throw Error('invalid_artifact_manifest');}
 check(manifest?.schemaVersion===1&&manifest.kind==='ltc-release-artifacts'&&manifest.partBytes===ARTIFACT_PART_BYTES&&Array.isArray(manifest.files)&&manifest.files.length>0&&manifest.files.length<=8192,'invalid_artifact_manifest');
 const restored=[],used=new Set(['artifact-manifest.json']),names=new Set();let total=0;
 for(const file of manifest.files){
  check(file&&artifactPath(file.path)&&!names.has(file.path)&&Number.isSafeInteger(file.length)&&file.length>=0&&sha(file.sha256)&&Array.isArray(file.parts)&&file.parts.length===Math.ceil(file.length/ARTIFACT_PART_BYTES),'invalid_artifact_file');names.add(file.path);total+=file.length;check(total<=1_000_000_000,'artifact_source_set_too_large');
  const pieces=file.parts.map((part,index)=>{
   const expectedPath=`parts/${file.sha256}/${String(index).padStart(6,'0')}`;
   check(part&&part.path===expectedPath&&sha(part.sha256)&&Number.isSafeInteger(part.length)&&part.length===Math.min(ARTIFACT_PART_BYTES,file.length-index*ARTIFACT_PART_BYTES),'invalid_artifact_part');
   const data=entries.get(part.path);check(data&&data.length===part.length&&hash(data)===part.sha256,'artifact_part_missing_or_corrupt');used.add(part.path);return data;
  });
  const bytes=Buffer.concat(pieces);check(bytes.length===file.length&&hash(bytes)===file.sha256,'artifact_file_digest_mismatch');restored.push({path:file.path,bytes});
 }
 check(used.size===entries.size,'unreferenced_artifact_data');
 // Canonical reconstruction validates scope counts, byte totals, ordering and extra keys.
 const reconstructed=packageArtifactEvidence(restored);check(reconstructed.manifestSha256===manifestSha256,'noncanonical_artifact_manifest');
 await mkdir(directory,{mode:0o700});
 for(const file of restored){const target=path.join(directory,...file.path.split('/'));await mkdir(path.dirname(target),{recursive:true,mode:0o700});await writeFile(target,file.bytes,{flag:'wx',mode:0o600});check(hash(await readFile(target))===hash(file.bytes),'restore_readback_mismatch');}
 return {directory,manifestSha256,fileCount:restored.length,scopes:reconstructed.manifest.scopes,originalBytes:total,restored:true};
}
