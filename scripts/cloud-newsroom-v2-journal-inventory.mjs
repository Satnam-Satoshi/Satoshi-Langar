/** Public-safe durable inventory in a separate new-v2 inventory document. Stores only hashes.
 * No private paths, provider file IDs, content, credentials or access links.
 * Default read-only; real state mutation requires separately approved activation.
 */
import {createHash} from 'node:crypto';
import {V2_CONNECTOR_SCOPE as S} from './cloud-newsroom-v2-connector-adapters.mjs';
export const JOURNAL_INVENTORY_PATH='state/cloud-newsroom-v2-journal-inventory.json';
const digest=s=>createHash('sha256').update(s).digest('hex');
function payload(r){if(r?.isError)throw Error('inventory_connector_error');if(r?.structuredContent)return r.structuredContent;for(const b of r?.content??[])if(b.type==='text'){try{return JSON.parse(b.text);}catch{}}throw Error('inventory_result_unknown');}
export function createCloudNewsroomV2JournalInventory({namespace,tools,allowMutations=false}){
 if(typeof namespace!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(namespace)||typeof tools?.githubFetchFile!=='function'||typeof tools.githubUpdateFile!=='function')throw Error('explicit_inventory_scope_required');
 const id=digest('cloud-newsroom-v2:'+namespace);
 const read=async()=>{const p=payload(await tools.githubFetchFile({repository_full_name:S.repository,ref:S.stateBranch,path:JOURNAL_INVENTORY_PATH,encoding:'utf-8'}));if(p.encoding!=='utf-8'||!/^[a-f0-9]{40}$/.test(p.sha??'')||typeof p.content!=='string'||Buffer.byteLength(p.content)>24*1024)throw Error('inventory_state_invalid');const value=JSON.parse(p.content);if(value.schemaVersion!==1||value.generation!=='cloud-newsroom-v2-journal-inventory')throw Error('inventory_foreign_state');return {sha:p.sha,value};};
 const save=async(r,value)=>{if(allowMutations!==true)throw Error('inventory_mutations_disabled');const content=JSON.stringify(value)+'\n';if(Buffer.byteLength(content)>24*1024)throw Error('inventory_state_bounds');const w=payload(await tools.githubUpdateFile({repository_full_name:S.repository,branch:S.stateBranch,path:JOURNAL_INVENTORY_PATH,sha:r.sha,content,message:'Reserve cloud newsroom v2 journal identity before effect'}));if(!/^[a-f0-9]{40}$/.test(w.content_sha??''))throw Error('inventory_write_uncertain');const after=await read();if(after.sha!==w.content_sha||JSON.stringify(after.value)!==JSON.stringify(value))throw Error('inventory_readback_unknown');};
 const current=r=>{if(r.value.journalInventory!==undefined&&r.value.journalInventory?.schemaVersion!==1)throw Error('inventory_schema');const roots=r.value.journalInventory?.roots;if(roots!==undefined&&(!roots||Array.isArray(roots)||typeof roots!=='object'||Object.keys(roots).length>16))throw Error('inventory_roots_invalid');return roots?.[id];};
 const validate=root=>{if(root?.id!==id||!root.keys||Array.isArray(root.keys)||typeof root.keys!=='object'||Object.keys(root.keys).length>128||Object.entries(root.keys).some(([k,v])=>!/^[a-f0-9]{64}$/.test(k)||v!==true))throw Error('inventory_root_invalid');};
 return Object.freeze({
  async claimRoot(){const r=await read(),root=current(r);if(root){validate(root);return {created:false,journalId:id};}if(Object.keys(r.value.journalInventory?.roots??{}).length>=16)throw Error('inventory_capacity_hold');r.value.journalInventory??={schemaVersion:1,roots:{}};if(r.value.journalInventory.schemaVersion!==1)throw Error('inventory_schema');r.value.journalInventory.roots[id]={id,keys:{}};await save(r,r.value);return {created:true,journalId:id};},
  async claimKey(key){if(typeof key!=='string'||key.length>240)throw Error('inventory_key_bounds');const r=await read(),root=current(r);validate(root);const k=digest(key);if(root.keys[k]===true)return {created:false};if(Object.keys(root.keys).length>=128)throw Error('inventory_capacity_hold');root.keys[k]=true;await save(r,r.value);return {created:true};},
  /** Read-only lifetime-key capacity. Warning at112; full128 holds NEW claims.
   * Existing keys remain valid; never deletes, rotates or initializes a root. */
  async capacity(){const r=await read(),root=current(r);validate(root);const used=Object.keys(root.keys).length;return {status:used===128?'full':used>=112?'warning':'available',used,limit:128,remaining:128-used,alertAt:112,canClaimNew:used<128};},
  async hasKey(key){if(typeof key!=='string'||key.length>240)throw Error('inventory_key_bounds');const r=await read(),root=current(r);validate(root);return root.keys[digest(key)]===true;}
 });
}
