import {createCloudNewsroomV2MarketingBacklog} from './cloud-newsroom-v2-marketing-backlog.mjs';
import {createCloudNewsroomV2MarketingBacklogStore} from './cloud-newsroom-v2-marketing-backlog-store.mjs';
import {createCloudNewsroomV2JournalInventory} from './cloud-newsroom-v2-journal-inventory.mjs';
export const MARKETING_ISSUE_CLAIM_NAMESPACE='marketing-backlog-issue-claims-v1';
export const MARKETING_RUNTIME_OPERATIONS=Object.freeze(['sync','next','report','capacity','recordRendered','recordHosted','reservePost','confirmPost']);
const reads=new Set(['next','report','capacity']),methods=['githubFetchFile','githubCreateFile','githubUpdateFile'];
const maxBytes=8*1024*1024;
function bounded(value,seen=new Set(),depth=0){
 if(depth>30)throw Error('marketing_input_depth');
 if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return 16;
 if(typeof value==='string')return new TextEncoder().encode(value).length;
 if(value instanceof Uint8Array){if(value.length>5*1024*1024)throw Error('marketing_byte_input_limit');return value.length;}
 if(!value||typeof value!=='object'||seen.has(value))throw Error('marketing_nondata_input');seen.add(value);let size=0;
 if(value instanceof Map){if(value.size>5000)throw Error('marketing_map_limit');for(const [k,v]of value){size+=bounded(k,seen,depth+1)+bounded(v,seen,depth+1);if(size>maxBytes)throw Error('marketing_input_size');}}
 else{if(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw Error('marketing_nonplain_input');if(Object.getOwnPropertySymbols(value).length)throw Error('marketing_symbol_input');const descriptors=Object.getOwnPropertyDescriptors(value);if(Object.keys(descriptors).length>5001)throw Error('marketing_collection_limit');for(const [key,d]of Object.entries(descriptors)){if(Array.isArray(value)&&key==='length')continue;if(d.get||d.set||!d.enumerable)throw Error('marketing_accessor_input');size+=key.length+bounded(d.value,seen,depth+1);if(size>maxBytes)throw Error('marketing_input_size');}}
 seen.delete(value);return size;
}
/** Shape normalization only: callbacks must invoke authenticated official GitHub
 * tools. No fabricated connector receipts, retries, credentials or new endpoints.
 */
export function normalizeMarketingGithubResult(result){
 if(!result||typeof result!=='object')throw Error('marketing_connector_result_unknown');
 let p=result.structuredContent;
 if(p===undefined){const text=result.content?.filter(b=>b.type==='text');if(text?.length!==1)throw Error('marketing_connector_result_unknown');try{p=JSON.parse(text[0].text);}catch{throw Error('marketing_connector_result_unknown');}}
 p=p?.result??p;if(!p||typeof p!=='object'||Array.isArray(p))throw Error('marketing_connector_result_unknown');
 return {isError:result.isError===true,structuredContent:p};
}
/** Nonproduction bookkeeping runner. NO rendering, hosting, Buffer, scheduling,
 * deployment or public message client exists here. Evidence inputs must be supplied
 * by independent trusted observers; shape validation cannot authenticate truth.
 * Default durable inventory uses an ALREADY bootstrapped dedicated namespace.
 * Never creates/reinitializes inventory root; missing inventory holds.
 */
export function createCloudNewsroomV2MarketingRuntime({tools,clock,inventory,allowMutations=false}){
 if(!methods.every(k=>typeof tools?.[k]==='function')||typeof clock!=='function')throw Error('marketing_explicit_adapters_required');
 let busy=false,uncertain=false;
 const normalized=Object.fromEntries(methods.map(name=>[name,async args=>{
  if(name!=='githubFetchFile'&&allowMutations!==true)throw Error('marketing_mutations_disabled');
  try{const result=normalizeMarketingGithubResult(await tools[name](args));if(name!=='githubFetchFile'&&result.isError){const p=result.structuredContent,c=p.error?.status??p.error?.code??p.status??p.code??p.error_code;if(c!==409&&c!=='CONFLICT')uncertain=true;}return result;}catch{if(name!=='githubFetchFile')uncertain=true;throw Error('marketing_connector_unconfirmed_no_retry');}
 }]));
 let issueInventory=inventory;
 if(issueInventory===undefined){const durable=createCloudNewsroomV2JournalInventory({namespace:MARKETING_ISSUE_CLAIM_NAMESPACE,tools:normalized,allowMutations});issueInventory={claimIssue:issueId=>durable.claimKey('issue:'+issueId),capacity:()=>durable.capacity()};}
 if(typeof issueInventory?.claimIssue!=='function')throw Error('marketing_durable_inventory_required');
 // Optional injected inventory may lack an observable capacity API. Report unknown,
 // never guess from current backlog count: consumed claims are lifetime history.
 const capacity=async()=>{
  if(typeof issueInventory.capacity!=='function')return {status:'unknown',reason:'inventory-capacity-unavailable'};
  const observed=await issueInventory.capacity();
  if(!observed||!Number.isInteger(observed.used)||observed.used<0||observed.used>128||observed.limit!==128||observed.remaining!==128-observed.used||observed.alertAt!==112||observed.canClaimNew!==(observed.used<128)||observed.status!==(observed.used===128?'full':observed.used>=112?'warning':'available'))throw Error('marketing_inventory_capacity_invalid');
  return {...observed};
 };
 const store=createCloudNewsroomV2MarketingBacklogStore({tools:normalized,inventory:issueInventory,allowMutations});
 const backlog=createCloudNewsroomV2MarketingBacklog({store,clock,allowMutations});
 return Object.freeze({async execute(request){
  bounded(request);if(!request||typeof request!=='object'||Object.keys(request).sort().join(',')!=='args,operation'||!MARKETING_RUNTIME_OPERATIONS.includes(request.operation))throw Error('marketing_operation_not_allowed');
  const {operation,args}=request;
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('marketing_operation_args');
  if(busy)throw Error('marketing_operation_in_flight');if(!reads.has(operation)&&(allowMutations!==true||uncertain))throw Error(uncertain?'marketing_uncertain_result_hold':'marketing_mutations_disabled');
  busy=true;
  try{
   if(operation==='capacity'){if(Object.keys(args).length)throw Error('marketing_capacity_arguments');return {inventoryCapacity:await capacity(),publishAllowed:false};}
   if(operation==='next'||operation==='report'){
    const allowed=operation==='next'?['issueId','limit']:['issueId','platforms'];if(Object.keys(args).some(k=>!allowed.includes(k)))throw Error('marketing_unknown_read_argument');
    const {issueId,...options}=args;const result=await backlog[operation](issueId,options);return operation==='report'?{...result,inventoryCapacity:await capacity()}:result;
   }
   return await backlog[operation](args);
  }catch(error){if(/unconfirmed|uncertain|unknown|no_retry/.test(error instanceof Error?error.message:''))uncertain=true;throw error;}
  finally{busy=false;}
 }});
}
