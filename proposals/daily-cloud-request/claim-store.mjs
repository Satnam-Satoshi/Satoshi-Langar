import {createHash} from 'node:crypto';
const hash=a=>createHash('sha256').update(JSON.stringify({key:a.key,issue:a.issue,date:a.date,source:a.source,fence:a.observedFence,expires:a.expiresAt})).digest('hex');
const check=(x,s)=>{if(!x)throw Error(s);};
function validate(v){check(v&&v.schemaVersion===1&&v.requests&&Object.keys(v).sort().join(',')==='requests,schemaVersion'&&!Array.isArray(v.requests)&&Object.keys(v.requests).length<=366,'claim_document');for(const [key,r] of Object.entries(v.requests))check(/^\d{4}-\d\d-\d\d$/.test(key)&&r&&/^[a-f0-9]{64}$/.test(r.binding)&&['claimed','accepted','uncertain','expired-without-dispatch'].includes(r.status),'claim_record');}
// Dedicated, pre-provisioned private CAS storage ONLY. Never the publication ledger.
// No storage credential, resource creation or automatic retry is implemented here.
export function claimStore({store,storageIdentity,publicationIdentity,revalidate}){
 check(typeof storageIdentity==='string'&&storageIdentity.length>4&&typeof publicationIdentity==='string'&&publicationIdentity.length>4&&storageIdentity!==publicationIdentity,'separate_claim_resource_required');
 check(typeof revalidate==='function'&&typeof store?.read==='function'&&typeof store?.conditionalWrite==='function','adapter_required');
 const held=new WeakMap(),key='daily-dispatch-requests';
 return {
  async claim(a){
   if(await revalidate(a)!==true)return false;
   const {value,version}=await store.read(key);validate(value);check(version!==null&&version!==undefined,'provisioned_store_required');
   if(value.requests[a.date])return false;
   check(Object.keys(value.requests).length<366,'claim_capacity');
   // Recheck revocation/current source/ledger/runs after reading CAS state as well.
   if(await revalidate(a)!==true)return false;
   const next=structuredClone(value);next.requests[a.date]={binding:hash(a),status:'claimed'};
   try{const written=await store.conditionalWrite(key,next,version);check((typeof written==='string'&&written.length>0)||(Number.isSafeInteger(written)&&written>0),'cas_acknowledgement');const readback=await store.read(key);validate(readback.value);check(readback.version===written&&readback.value.requests[a.date]?.binding===hash(a)&&readback.value.requests[a.date]?.status==='claimed','claim_readback');}catch(error){if(error?.message==='state_conflict')return false;throw Error('claim_uncertain_no_dispatch');}
   held.set(a,hash(a));return true;
  },
  async record(a,status){
   check(['accepted','uncertain','expired-without-dispatch'].includes(status),'record_status');
   check(held.get(a)===hash(a),'claim_not_owned');
   const {value,version}=await store.read(key);validate(value);check(value.requests[a.date]?.binding===hash(a)&&value.requests[a.date].status==='claimed','claim_changed');
   const next=structuredClone(value);next.requests[a.date].status=status;
   const written=await store.conditionalWrite(key,next,version);check((typeof written==='string'&&written.length>0)||(Number.isSafeInteger(written)&&written>0),'cas_acknowledgement');const readback=await store.read(key);validate(readback.value);check(readback.version===written&&readback.value.requests[a.date]?.binding===hash(a)&&readback.value.requests[a.date]?.status===status,'receipt_readback');
  }
 };
}
