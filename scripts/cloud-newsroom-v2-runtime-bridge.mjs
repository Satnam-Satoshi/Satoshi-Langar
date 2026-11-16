/** Agent-runtime stdio bridge, not a background service or credential store.
 * A scheduled dot executes explicit connector requests and returns actual results.
 * The coordinator retains intent/CAS/reconciliation rules; this layer never retries.
 * External approval and independently pinned source remain the dispatcher boundary.
 */
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createCloudNewsroomV2ConnectorAdapters} from './cloud-newsroom-v2-connector-adapters.mjs';
import {createCloudNewsroomV2Coordinator} from './cloud-newsroom-v2-coordinator.mjs';
export const RUNTIME_OPERATIONS=Object.freeze(['githubFetchFile','githubUpdateFile','vercelCreateDeployment','vercelGetDeployment','vercelPromote','observeGrant','verifyPreview','verifyPublic','persistQa']);
const mutations=new Set(['githubUpdateFile','vercelCreateDeployment','vercelPromote','persistQa']);
const MAX=4*1024*1024;
export function createRuntimeBridge({send,clock=()=>new Date().toISOString(),timeoutMs=120000,allowMutations=false,allowPromotion=false}){
 if(typeof send!=='function'||typeof clock!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw Error('invalid_bridge_configuration');
 const pending=new Map();let closed=false;
 const call=(operation,args)=>new Promise((resolve,reject)=>{
  if(closed||!RUNTIME_OPERATIONS.includes(operation))return reject(Error('bridge_closed_or_unknown_operation'));
  if(mutations.has(operation)&&allowMutations!==true||operation==='vercelPromote'&&allowPromotion!==true)return reject(Error('bridge_effect_not_authorized'));
  const id=randomUUID(),envelope={schemaVersion:1,kind:'ltc-v2-runtime-request',id,operation,args};
  const serialized=JSON.stringify(envelope);if(Buffer.byteLength(serialized)>MAX)return reject(Error('bridge_request_too_large'));
  const timer=setTimeout(()=>{pending.delete(id);reject(Error('bridge_result_unknown_no_retry'));},timeoutMs);
  pending.set(id,{resolve,reject,timer});
  try{send(serialized);}catch{clearTimeout(timer);pending.delete(id);reject(Error('bridge_send_unknown_no_retry'));}
 });
 const receive=line=>{
  if(typeof line!=='string'||Buffer.byteLength(line)>MAX)throw Error('bridge_response_bounds');
  const response=JSON.parse(line),p=pending.get(response.id);
  if(response.schemaVersion!==1||response.kind!=='ltc-v2-runtime-response'||!p)throw Error('bridge_unknown_or_replayed_response');
  if(Object.keys(response).sort().join(',')!=='id,kind,result,schemaVersion')throw Error('bridge_response_shape');
  clearTimeout(p.timer);pending.delete(response.id);p.resolve(response.result);
 };
 const close=()=>{closed=true;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('bridge_closed_result_unknown_no_retry'));}pending.clear();};
 const tools=Object.fromEntries(RUNTIME_OPERATIONS.slice(0,5).map(k=>[k,args=>call(k,args)]));
 const adapters=createCloudNewsroomV2ConnectorAdapters({tools,clock,allowMutations,allowPromotion,grantObserver:args=>call('observeGrant',args),qaVerifier:{verify:args=>call('verifyPreview',args),verifyPublic:args=>call('verifyPublic',args)},qaArchive:{persistQa:args=>call('persistQa',args)}});
 return Object.freeze({receive,close,advance:request=>createCloudNewsroomV2Coordinator(adapters).advance(request)});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);if(args.length!==1)throw Error('usage_external_request_json');
 const bytes=readFileSync(args[0]);if(bytes.length>MAX)throw Error('bridge_input_bounds');
 const input=JSON.parse(bytes);
 // Permissions are intentionally fixed off in the CLI until an activation-reviewed
 // private runner supplies the library constructor's explicit flags.
 const bridge=createRuntimeBridge({send:line=>process.stdout.write(line+'\n')});
 const rl=createInterface({input:process.stdin,crlfDelay:Infinity});
 rl.on('line',line=>{try{bridge.receive(line);}catch{bridge.close();rl.close();}});
 rl.on('close',()=>bridge.close());
 try{const result=await bridge.advance(input);process.stdout.write(JSON.stringify({schemaVersion:1,kind:'ltc-v2-runtime-result',result})+'\n');}finally{bridge.close();rl.close();}
}
