/** Private local effect journal. Not cross-machine authority or a production fence.
 * A completed response is reused; an uncertain effect is NEVER invoked again.
 * Cloud loss of this journal is a hold requiring provider reconciliation.
 */
import {createHash} from 'node:crypto';
import {mkdir,lstat,readFile,open,rename,realpath} from 'node:fs/promises';
import {resolve,join,isAbsolute,dirname} from 'node:path';
const MAX=8*1024*1024;
function canonical(x){if(x===null||['string','boolean'].includes(typeof x)||typeof x==='number'&&Number.isFinite(x))return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(x&&Object.getPrototypeOf(x)===Object.prototype)return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';throw Error('journal_non_json_value');}
const hash=x=>createHash('sha256').update(x).digest('hex');
async function writeNew(path,value){const text=canonical(value);if(Buffer.byteLength(text)>MAX)throw Error('journal_bounds');const f=await open(path,'wx',0o600);try{await f.writeFile(text);await f.sync();}finally{await f.close();}}
async function syncDirectory(path){const f=await open(path,'r');try{await f.sync();}finally{await f.close();}}
async function safeDirectory(path){const s=await lstat(path);if(!s.isDirectory()||s.isSymbolicLink()||await realpath(path)!==path||s.mode&0o077)throw Error('journal_private_directory_required');}
async function openJournalRoot(root,inventory){
 if(typeof root!=='string'||!isAbsolute(root)||resolve(root)!==root||!['claimRoot','claimKey','hasKey'].every(k=>typeof inventory?.[k]==='function'))throw Error('external_durable_inventory_required');
 // claimRoot/claimKey must be actual durable conditional inserts with readback,
 // not local files or caller booleans. Missing existing roots/keys fail closed.
 const claim=await inventory.claimRoot();if(typeof claim?.created!=='boolean'||!/^[a-f0-9]{64}$/.test(claim.journalId??''))throw Error('inventory_root_claim_unknown');
 if(claim.created){await mkdir(root,{mode:0o700});await writeNew(join(root,'identity.json'),{journalId:claim.journalId});await syncDirectory(root);await syncDirectory(dirname(root));}
 await safeDirectory(root);let identity;try{identity=JSON.parse(await readFile(join(root,'identity.json'),'utf8'));}catch{throw Error('expected_journal_root_missing_hold');}if(identity.journalId!==claim.journalId)throw Error('journal_root_identity_mismatch');
 return claim.journalId;
}
export async function createPrivateEffectJournal(root,inventory){
 await openJournalRoot(root,inventory);
 async function runOnce({key,operation,args,invoke}){
  if(typeof key!=='string'||!/^[A-Za-z0-9_.:-]{1,180}$/.test(key)||typeof operation!=='string'||!/^[a-zA-Z][a-zA-Z0-9_.]{1,100}$/.test(operation)||typeof invoke!=='function')throw Error('journal_invalid_request');
  await safeDirectory(root);const request={key,operation,args},requestSha256=hash(canonical(request)),dir=join(root,hash(key));let fresh=true;
  const claim=await inventory.claimKey(key);if(typeof claim?.created!=='boolean')throw Error('inventory_key_claim_unknown');
  fresh=claim.created;
  if(fresh){try{await mkdir(dir,{mode:0o700});}catch{throw Error('expected_journal_key_conflicting_hold');}}
  else {try{await safeDirectory(dir);}catch{throw Error('expected_journal_key_missing_or_conflicting_hold');}}
  await safeDirectory(dir);
  if(!fresh){
   let old;try{old=JSON.parse(await readFile(join(dir,'request.json'),'utf8'));}catch{throw Error('journal_uncertain_intent_hold');}
   if(hash(canonical(old))!==requestSha256)throw Error('journal_key_conflict');
   let reply;try{reply=JSON.parse(await readFile(join(dir,'response.json'),'utf8'));}catch{throw Error('journal_uncertain_effect_hold_no_retry');}
   if(reply.requestSha256!==requestSha256||reply.resultSha256!==hash(canonical(reply.result)))throw Error('journal_response_binding_failed');
   return {status:'completed-replay',requestSha256,result:reply.result};
  }
  await writeNew(join(dir,'request.json'),request);await syncDirectory(dir);await syncDirectory(root);
  // Persisted request precedes the one invocation. Exceptions leave an uncertain
  // journal entry even when the provider might have completed the action.
  const result=await invoke(args);const response={requestSha256,resultSha256:hash(canonical(result)),result};
  await writeNew(join(dir,'response.pending'),response);await rename(join(dir,'response.pending'),join(dir,'response.json'));
  const d=await open(dir,'r');try{await d.sync();}finally{await d.close();}
  return {status:'completed-new',requestSha256,result};
 }
 return Object.freeze({runOnce});
}

/** Local phase CAS for candidate transport. Atomic lock+rename on this filesystem;
 * not a cross-host lease. An abandoned lock holds; never silently steals it.
 */
export async function createPrivatePhaseJournal(root,inventory){
 const {rmdir}=await import('node:fs/promises');
 await openJournalRoot(root,inventory);
 const paths=key=>{if(typeof key!=='string'||!/^[A-Za-z0-9_./:-]{1,240}$/.test(key))throw Error('journal_invalid_key');const id=hash(key);return {file:join(root,id+'.json'),lock:join(root,id+'.lock')};};
 const read=async key=>{await safeDirectory(root);const {file}=paths(key);let bytes;try{const st=await lstat(file);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size>MAX)throw Error('journal_unsafe_file');bytes=await readFile(file);}catch(e){if(e.code==='ENOENT'){if(await inventory.hasKey(key)!==false)throw Error('expected_phase_key_missing_hold');return {version:null,value:null};}throw e;}if(await inventory.hasKey(key)!==true)throw Error('phase_key_missing_remote_inventory');const r=JSON.parse(bytes);if(r.key!==key)throw Error('journal_key_conflict');return {version:hash(bytes),value:r.value};};
 const cas=async(key,expected,value)=>{
  await safeDirectory(root);const {file,lock}=paths(key);try{await mkdir(lock,{mode:0o700});}catch(e){if(e.code==='EEXIST')return {ok:false,reason:'locked_or_uncertain'};throw e;}
  let completed=false;
  try{const prior=await read(key);if(prior.version!==expected){completed=true;return {ok:false,reason:'version_conflict'};}
   if(prior.version===null){const claim=await inventory.claimKey(key);if(claim?.created!==true)throw Error('phase_key_claim_uncertain_hold');}
   const next={key,value},bytes=canonical(next);await writeNew(join(lock,'next.json'),next);await syncDirectory(lock);await rename(join(lock,'next.json'),file);await syncDirectory(root);completed=true;return {ok:true,version:hash(bytes)};
  }finally{if(completed){await rmdir(lock);await syncDirectory(root);}}
 };
 return Object.freeze({read,cas});
}
