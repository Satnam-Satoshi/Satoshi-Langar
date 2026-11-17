/** Local half of agent-dispatched Library callbacks. No Library/network client.
 * Call after-create immediately after actual create in the SAME agent tool call.
 * Persist raw response before applying metadata, so uncertain effects aren't lost.
 * helperPath must be freshly fetched unchanged official helper + companion files.
 * Caller owns skill provenance; basename checks do NOT authenticate helper code.
 * Fixed interpreter, no inherited environment or user-site packages. Official
 * helper uses -E -s (not -I) so its trusted adjacent companion remains importable.
 * Observation uses -I. Raw-response file AND directory entry are fsynced; the
 * private journal, not these files alone, governs uncertain-effect retry policy.
 * Tests may supply a clearly synthetic helper, never an operational attestation.
 */
import {lstat,realpath,open,readFile} from 'node:fs/promises';
import {dirname,basename,join,isAbsolute,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
const PYTHON='/usr/bin/python3';
const PYTHON_ENV=Object.freeze({PATH:'/usr/bin:/bin',LANG:'C.UTF-8',LC_ALL:'C.UTF-8'});
const exec=promisify(execFile),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=m=>{throw Error(m);};
const ID=(x,p)=>typeof x==='string'&&new RegExp('^'+p+'[A-Za-z0-9_-]{1,200}$').test(x);
function payload(r){if(r?.isError)fail('library_tool_failed_response_retained');let p=r?.structuredContent;if(p===undefined){const texts=r?.content?.filter(b=>b.type==='text');if(texts?.length!==1)fail('library_response_unknown');try{p=JSON.parse(texts[0].text);}catch{fail('library_response_unknown');}}return p?.result??p;}
async function privateDirectory(path){if(typeof path!=='string'||!isAbsolute(path)||resolve(path)!==path)fail('private_local_directory_required');const st=await lstat(path);if(!st.isDirectory()||st.isSymbolicLink()||st.mode&0o077||await realpath(path)!==path)fail('private_local_directory_required');}
async function fileInfo(file,maxBytes=4*1024*1024){if(typeof file!=='string'||!isAbsolute(file)||resolve(file)!==file||await realpath(file)!==file)fail('safe_local_file_required');const st=await lstat(file);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<1||st.size>maxBytes)fail('safe_local_file_required');return st;}
async function saveResponse(root,kind,result){const bytes=Buffer.from(JSON.stringify(result)+'\n');if(bytes.length>1024*1024)fail('library_response_size');const path=join(root,`${kind}-${hash(bytes)}.json`);let handle;try{handle=await open(path,'wx',0o600);await handle.writeFile(bytes);await handle.sync();const directory=await open(root,'r');try{await directory.sync();}finally{await directory.close();}}catch(error){if(error.code!=='EEXIST')throw error;await fileInfo(path,1024*1024);if(hash(await readFile(path))!==hash(bytes))fail('library_saved_response_collision');}finally{await handle?.close();}return path;}
async function helper(helperPath,args,stdin){await privateDirectory(dirname(helperPath));if(basename(helperPath)!=='library_file_transfer.py')fail('official_helper_path_required');await fileInfo(helperPath,2*1024*1024);await fileInfo(join(dirname(helperPath),'library_hosted_apps.py'),2*1024*1024);await new Promise((resolve,reject)=>{const child=execFile(PYTHON,['-E','-s','-B',helperPath,...args],{env:PYTHON_ENV,cwd:dirname(helperPath),timeout:60000,maxBuffer:2*1024*1024},error=>error?reject(Error('official_library_helper_failed_response_retained')):resolve());child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(stdin));});}
const OBSERVE="import os,sys,json,base64\np=sys.argv[1]\nprint(json.dumps({'path':p,'bytesBase64':base64.b64encode(open(p,'rb').read()).decode(),'xattrsBase64':{k:base64.b64encode(os.getxattr(p,k)).decode() for k in ['user.library-file-id','user.library-file-version']}}))";
async function observe(path,libraryId,version){await fileInfo(path);let local;try{const result=await exec(PYTHON,['-I','-B','-c',OBSERVE,path],{env:PYTHON_ENV,cwd:'/',timeout:10000,maxBuffer:8*1024*1024});local=JSON.parse(result.stdout);}catch{fail('local_library_observation_failed');}if(local.path!==path||Buffer.from(local.xattrsBase64?.['user.library-file-id']??'','base64').toString()!==libraryId||Buffer.from(local.xattrsBase64?.['user.library-file-version']??'','base64').toString()!==String(version))fail('local_library_xattrs_mismatch');return local;}
/** Args contain actual raw MCP result and trusted local paths, never a made-up ACL.
 * Return values feed the existing Library transport/archive byte validators.
 */
export async function completeLibraryLocalCallback({operation,args}){
 if(!['after-create','after-materialize'].includes(operation)||!args||typeof args!=='object')fail('library_local_operation');
 await privateDirectory(args.responseRoot);await saveResponse(args.responseRoot,operation,args.toolResult);
 const result=payload(args.toolResult);
 if(operation==='after-create'){
  const c=result;if(c?.operation!=='create_library_file'||c.status!=='succeeded'||!ID(c.library_file_id,'libfile_')||!ID(c.file_id,'file_')||c.current_version_number!==0||c.restored_from_version_number!==null||!Array.isArray(c.xattrs)||c.file_name!==basename(args.file)||c.path!==`/${c.file_name}`||c.mime_type!=='application/json'||c.library_artifact_type!=='other')fail('fresh_create_identity_required');
  await privateDirectory(dirname(args.file));const info=await fileInfo(args.file);const before=hash(await readFile(args.file));if(c.file_size_bytes!==info.size||c.file_name!==`ltc-qa-${before}.json`)fail('create_staged_bytes_mismatch');
  await helper(args.helperPath,['apply-xattrs',args.file,c.library_file_id],c.xattrs);
  const local=await observe(args.file,c.library_file_id,0);if(hash(Buffer.from(local.bytesBase64,'base64'))!==before)fail('create_bytes_changed_during_metadata');
  return {structuredContent:{metadataApplied:true,created:c}};
 }
 const expected=args.created;
 if(!ID(expected?.library_file_id,'libfile_')||!ID(expected?.file_id,'file_')||expected.current_version_number!==0||!/^ltc-qa-[a-f0-9]{64}\.json$/.test(expected.file_name))fail('original_create_identity_required');
 if(!Array.isArray(result?.transfers)||result.transfers.length!==1||result.unavailable_items?.length!==0||result.warnings?.length!==0)fail('complete_materialization_required');
 const transfer=result.transfers[0];if(transfer.library_file_id!==expected.library_file_id||transfer.file_id!==expected.file_id||transfer.file_name!==expected.file_name||transfer.current_version_number!==0)fail('materialization_identity_mismatch');
 await privateDirectory(args.directory);const path=join(args.directory,expected.file_name);
 if(transfer.workspace_path){if(transfer.workspace_path!==path)fail('materialization_destination_mismatch');await helper(args.helperPath,['apply-xattrs',path],transfer);}
 else{if(typeof transfer.download_url!=='string')fail('materialization_source_missing');await helper(args.helperPath,['materialize',path],transfer);}
 const local=await observe(path,expected.library_file_id,0);const bytes=Buffer.from(local.bytesBase64,'base64');if(bytes.length!==expected.file_size_bytes||expected.file_name!==`ltc-qa-${hash(bytes)}.json`)fail('materialization_raw_bytes_mismatch');
 return {officialHelperApplied:true,toolResult:args.toolResult,local};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{const chunks=[];let size=0;for await(const chunk of process.stdin){size+=chunk.length;if(size>2*1024*1024)fail('library_callback_input_limit');chunks.push(chunk);}const request=JSON.parse(Buffer.concat(chunks).toString('utf8'));process.stdout.write(JSON.stringify(await completeLibraryLocalCallback(request))+'\n');}catch{process.stderr.write('Library local callback failed; inspect retained private response. Do not repeat create.\n');process.exitCode=1;}}
