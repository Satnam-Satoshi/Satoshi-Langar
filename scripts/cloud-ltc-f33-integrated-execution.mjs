import {executeF33Retirement} from './cloud-ltc-f33-executor.mjs';
import {createF33ProviderAdapters} from './cloud-ltc-f33-provider-adapters.mjs';
const check=(v,c)=>{if(!v)throw Error('f33_integrated_'+c);};
const snapshot=v=>{v=structuredClone(v);const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};return freeze(v);};
// Local integration only. Authority and ALL-writer exclusion implementations are
// mandatory trusted capabilities, not caller booleans or sampled status JSON.
// No CLI, environment inspection, settings mutation, retries or barrier release.
export async function executeIntegratedF33(input,{now,readVerifiedInputs,authorizeOwner,acquireBarrier,providerOptions,providerFactory=createF33ProviderAdapters}){
 for(const f of[now,readVerifiedInputs,authorizeOwner,acquireBarrier,providerFactory])check(typeof f==='function','capability');
 const args=snapshot(input),options={...providerOptions,...(providerOptions?.env?{env:Object.freeze({...providerOptions.env})}:{}),ledgerConfig:snapshot(providerOptions?.ledgerConfig),receiptConfig:snapshot(providerOptions?.receiptConfig)};
 let binding,scope,assertOwner,assertBarrier,providers;
 const permitted=request=>{
  check(binding&&scope&&assertOwner&&assertBarrier,'unbound');
  for(const key of Object.keys(binding))check(JSON.stringify(request[key])===JSON.stringify(binding[key]),'request_changed');
  check(assertOwner(binding)===true&&assertBarrier(scope)===true,'revoked');return true;
 };
 const get=async()=>{check(binding&&scope,'unbound');providers??=await providerFactory({...options,assertReceiptAuthority:request=>permitted(request)});return providers;};
 return executeF33Retirement(args,{
  now,readVerifiedInputs,
  async acquireBarrier(value){scope=snapshot(value);const cap=await acquireBarrier(scope);check(typeof cap?.assertHeld==='function','barrier');assertBarrier=cap.assertHeld.bind(cap);check(assertBarrier(scope)===true,'barrier');return Object.freeze({assertHeld:assertBarrier});},
  async authorizeOwner(token,value){binding=snapshot(value);const cap=await authorizeOwner(token,binding);check(typeof cap?.assertValid==='function','owner');assertOwner=cap.assertValid.bind(cap);check(assertOwner(binding)===true,'owner');return Object.freeze({assertValid:assertOwner});},
  async reserveReceipt(request){permitted(request);return (await get()).reserveReceipt(request);},
  async compareAndSwap(request,context){permitted(request);return (await get()).compareAndSwap(request,context);},
  async readEnvelope(request){return (await get()).readEnvelope(request);},
  async finishReceipt(receipt,result){return (await get()).finishReceipt(receipt,result);}
 });
}
