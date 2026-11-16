/** Agent-dispatched Library callbacks. No credential/session discovery or sharing.
 * createAndApply MUST perform actual Library create, private response persistence,
 * and official apply-xattrs in one tool invocation. This module cannot fake that.
 * materializeAndObserve MUST use original create IDs + official helper and read
 * actual bytes/xattrs; returned base64 is decoded, never treated as a hash claim.
 */
import {mkdir,mkdtemp,lstat,open,readFile,realpath} from 'node:fs/promises';
import {isAbsolute,resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const digest=b=>createHash('sha256').update(b).digest('hex');
function payload(r){if(r?.isError)throw Error('library_tool_error');if(r?.structuredContent)return r.structuredContent.result??r.structuredContent;for(const x of r?.content??[])if(x.type==='text'){try{const p=JSON.parse(x.text);return p.result??p;}catch{}}throw Error('library_result_unknown');}
function decode(s){if(typeof s!=='string'||s.length>6*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(s)||s.length%4)throw Error('local_readback_invalid_base64');const b=Buffer.from(s,'base64');if(b.toString('base64')!==s)throw Error('local_readback_noncanonical_base64');return b;}
export async function createCloudNewsroomV2LibraryTransport({workRoot,journal,createAndApply,listOwnedRoot,materializeAndObserve}){
 if(typeof workRoot!=='string'||!isAbsolute(workRoot)||resolve(workRoot)!==workRoot||typeof journal?.runOnce!=='function'||[createAndApply,listOwnedRoot,materializeAndObserve].some(x=>typeof x!=='function'))throw Error('explicit_library_dispatch_required');
 await mkdir(workRoot,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});const st=await lstat(workRoot);if(!st.isDirectory()||st.isSymbolicLink()||st.mode&0o077||await realpath(workRoot)!==workRoot)throw Error('private_library_workroot_required');
 const createdIds=new Set();
 return Object.freeze({
  async createOwnedRoot({name,bytes,mimeType,library_artifact_type}){
   if(!(bytes instanceof Uint8Array)||bytes.length<1||bytes.length>4*1024*1024||name!==`ltc-qa-${digest(bytes)}.json`||mimeType!=='application/json'||library_artifact_type!=='other')throw Error('canonical_qa_payload_required');
   const file=join(workRoot,name);let handle;
   try{handle=await open(file,'wx',0o600);await handle.writeFile(bytes);await handle.sync();}catch(e){if(e.code!=='EEXIST')throw e;const s=await lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||digest(await readFile(file))!==digest(bytes))throw Error('staged_payload_conflict');}finally{await handle?.close();}
   const r=await journal.runOnce({key:'library-qa:'+digest(bytes),operation:'library.createAndApply',args:{file,library_artifact_type:'other'},invoke:createAndApply});
   const p=payload(r.result),row=Array.isArray(p.results)?p.results[0]:p;
   // Dispatcher returns a single create row from the real response after metadata
   // application, not a fabricated normalized ACL or version.
   const created=row.created??row;
   if(row.metadataApplied!==true||created.operation!=='create_library_file'||typeof created.library_file_id!=='string')throw Error('create_metadata_application_unverified');
   createdIds.add(created.library_file_id+'|'+created.file_id);return created;
  },
  async list(args){if(JSON.stringify(args)!==JSON.stringify({surface:'library',library_path:'/',recursive:false,limit:200,sort:'created_at',sort_order:'desc'}))throw Error('owned_root_list_scope');return payload(await listOwnedRoot(args));},
  async materialize(args){
   if(!Array.isArray(args?.items)||args.items.length!==1||!createdIds.has(args.items[0].library_file_id+'|'+args.items[0].file_id))throw Error('create_derived_materialization_required');
   const directory=await mkdtemp(join(workRoot,'readback-'));
   const observed=await materializeAndObserve({...args,destination:{directory}});
   if(observed?.officialHelperApplied!==true||!observed.local)throw Error('official_materialization_required');
   return {result:payload(observed.toolResult),local:{path:observed.local.path,bytes:decode(observed.local.bytesBase64),xattrs:Object.fromEntries(Object.entries(observed.local.xattrsBase64??{}).map(([k,v])=>[k,decode(v)]))}};
  }
 });
}
