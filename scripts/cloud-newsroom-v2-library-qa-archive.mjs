import {createHash} from 'node:crypto';
import {prepareCloudNewsroomV2QaArchivePayload} from './cloud-newsroom-v2-qa-archive.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw Error(message);};
const identifier=(value,prefix)=>typeof value==='string'&&new RegExp(`^${prefix}[A-Za-z0-9_-]{1,200}$`).test(value);
/** Limited-assurance alternative backend, test-only by default. Production mode
 * requires exact separately accepted assurance policy, NOT implied ACL/WORM. No default I/O, activation, sharing, replacement,
 * move, ACL or WORM operations. Callbacks must use official Library operations.
 * Owned-root provenance comes from create-without-directory + owned-root list
 * request semantics, NOT absence of a sharing flag. ACLs/trash/expiry are not
 * exposed by observed Library metadata, so none are asserted here.
 */
export const OWNED_LIBRARY_ARCHIVE_ACCEPTANCE=Object.freeze({kind:'owned-library-limited-assurance',accepted:true,accessAssurance:'owned-root-create-no-sharing-in-workflow',aclVerified:false,worm:false,retention:'subject-to-account-policy'});
export function createCloudNewsroomV2LibraryQaArchive({mode='test-only',transport,acceptancePolicy}={}){
 const approvedProduction=mode==='production-limited-assurance'&&acceptancePolicy&&Object.keys(acceptancePolicy).sort().join(',')===Object.keys(OWNED_LIBRARY_ARCHIVE_ACCEPTANCE).sort().join(',')&&Object.entries(OWNED_LIBRARY_ARCHIVE_ACCEPTANCE).every(([key,value])=>acceptancePolicy[key]===value);
 if((mode!=='test-only'&&!approvedProduction)||!['createOwnedRoot','list','materialize'].every(k=>typeof transport?.[k]==='function'))fail('test-only-or-explicit-production-policy-and-library-adapter-required');
 return Object.freeze({async persistQa(request){
  const {bytes,sha256,name,snapshot}=prepareCloudNewsroomV2QaArchivePayload(request);
  let created;try{created=await transport.createOwnedRoot({name,bytes:bytes.slice(),mimeType:'application/json',library_artifact_type:'other'});}catch{fail('library-create-unconfirmed-no-retry');}
  if(created?.operation!=='create_library_file'||created.status!=='succeeded'||created.path!==`/${name}`||created.file_name!==name||!identifier(created.file_id,'file_')||!identifier(created.library_file_id,'libfile_')||created.current_version_number!==0||created.restored_from_version_number!==null||!identifier(created.directory_id,'libdir_')||created.mime_type!=='application/json'||created.library_artifact_type!=='other'||created.file_size_bytes!==bytes.length||created.external_connectors_accessed!==false||!Array.isArray(created.xattrs)||created.xattrs.length!==1||created.xattrs[0]?.name!=='user.library-file-version'||created.xattrs[0]?.value!=='0')fail('fresh-owned-root-library-create-required');
  let listed;try{listed=await transport.list({surface:'library',library_path:'/',recursive:false,limit:200,sort:'created_at',sort_order:'desc'});}catch{fail('library-owned-root-list-unconfirmed');}
  if(listed?.surface!=='library'||listed.external_connectors_accessed!==false||!Array.isArray(listed.items)||!Array.isArray(listed.warnings)||listed.warnings.length)fail('library-owned-root-list-required');
  const matches=listed.items.filter(item=>item?.library_file_id===created.library_file_id||item?.file_id===created.file_id);
  if(matches.length!==1)fail('library-created-item-not-observed');const item=matches[0];
  if(item.id!==created.file_id||item.file_id!==created.file_id||item.library_file_id!==created.library_file_id||item.kind!=='file'||item.name!==name||item.path!==`/${name}`||item.library_artifact_type!=='other'||item.version_id!==null||item.mime_type!=='application/json'||item.size_bytes!==bytes.length||item.surface!=='library'||item.model_generated!==true||item.is_shared===true)fail('library-owned-root-item-identity');
  // list.version_id is genuinely null; never turn it into a fabricated version.
  // Materialization pins both known IDs from the same observed creation/list.
  let materialized;try{materialized=await transport.materialize({items:[{file_id:created.file_id,file_name:name,library_file_id:created.library_file_id}]});}catch{fail('library-materialization-unconfirmed');}
  return validateMaterialized(materialized,{created,item,bytes,sha256,name,snapshot});
 }});
}
function validateMaterialized(observed,{created,bytes,sha256,name,snapshot}){
 // Transport returns actual prepare_materialize structuredContent plus separately
 // read local bytes/xattrs AFTER the official materialization helper has run.
 const result=observed?.result,local=observed?.local;
 if(result?.external_connectors_accessed!==false||!Array.isArray(result.transfers)||result.transfers.length!==1||!Array.isArray(result.unavailable_items)||result.unavailable_items.length||!Array.isArray(result.warnings)||result.warnings.length)fail('complete-official-library-materialization-required');
 const transfer=result.transfers[0],selected=result.partial_bindings?.selected_refs?.[transfer.transfer_id];
 if(typeof transfer.transfer_id!=='string'||!transfer.transfer_id||transfer.file_id!==created.file_id||transfer.library_file_id!==created.library_file_id||transfer.file_name!==name||transfer.suggested_path!==name||transfer.current_version_number!==0||transfer.download_url!==null||transfer.method!=='GET'||!transfer.headers||Object.keys(transfer.headers).length||transfer.mime_type!=='application/json'||transfer.size_bytes!==bytes.length||!Array.isArray(transfer.xattrs)||transfer.xattrs.length!==1||transfer.xattrs[0]?.name!=='user.library-file-version'||transfer.xattrs[0]?.value!=='0'||selected?.file_id!==created.file_id||selected?.library_file_id!==created.library_file_id||selected?.workspace_sha256!==sha256)fail('pinned-library-materialization-identity');
 const directory=result.destination?.directory;
 if(typeof directory!=='string'||!directory.startsWith('/')||directory.endsWith('/')||directory.split('/').some(p=>p==='.'||p==='..')||transfer.workspace_path!==`${directory}/${name}`||local?.path!==transfer.workspace_path)fail('library-materialized-local-path');
 const localId=local.xattrs?.['user.library-file-id'],localVersion=local.xattrs?.['user.library-file-version'];
 if(!(localId instanceof Uint8Array)||!(localVersion instanceof Uint8Array)||new TextDecoder().decode(localId)!==created.library_file_id||new TextDecoder().decode(localVersion)!=='0')fail('library-local-xattrs-identity');
 if(!(local.bytes instanceof Uint8Array)||local.bytes.length!==bytes.length||hash(local.bytes)!==sha256||!local.bytes.every((byte,index)=>byte===bytes[index]))fail('library-raw-byte-readback-mismatch');
 return Object.freeze({verified:true,sha256,bytes:bytes.length,locator:Object.freeze({provider:'openai-library',fileId:created.library_file_id,version:0}),kind:'owned-library-qa-receipt',deploymentId:snapshot.deploymentId,sourceCommit:snapshot.sourceCommit,projectId:snapshot.projectId,phase:snapshot.phase,accessAssurance:'owned-root-create-no-sharing-in-workflow',aclVerified:false,worm:false,retention:'subject-to-account-policy'});
}
