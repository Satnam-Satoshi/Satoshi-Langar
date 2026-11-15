import {createHash} from 'node:crypto';
import {createGoogleStateRuntime} from './cloud-ltc-google-runtime.mjs';
import {decodeStateEnvelope,encodeStateEnvelope} from './cloud-ltc-state-envelope.mjs';
import {parseRecoveryDocument} from './cloud-ltc-recovery-doc-parser.mjs';
const check=(v,c)=>{if(!v)throw Error('f33_provider_'+c);};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
// Local-only library. No CLI/workflow. Caller supplies already approved exact
// resource configs and reviewed request. No creation, sharing, unpause or retries.
export async function createF33ProviderAdapters({ledgerConfig,receiptConfig,ownerPermissionId,env,fetchImpl,assertReceiptAuthority,runtimeFactory=createGoogleStateRuntime}){
 ledgerConfig=freeze(structuredClone(ledgerConfig));receiptConfig=freeze(structuredClone(receiptConfig));
 check(ledgerConfig?.documentId!==receiptConfig?.documentId&&ledgerConfig?.folderId===receiptConfig?.folderId&&typeof ownerPermissionId==='string'&&ownerPermissionId.length>0,'resources');
 check(typeof assertReceiptAuthority==='function','receipt_authority');
 const reservations=new WeakMap();let ledgerAttempted=false,receiptAttempted=false;
 async function selected(config){
  config=freeze(structuredClone(config));let guard=null;
  const runtime=await runtimeFactory({config,env,fetchImpl,beforeWrite:()=>{check(typeof guard==='function','unarmed');guard();}});
  const client=runtime.client;
  async function read(){
   await client.verifySelectedResources();
   const metadata=await client.getFileMetadata(config.documentId);
   check(metadata.status===200&&metadata.body?.permissions?.length===1&&metadata.body.permissions[0].id===ownerPermissionId,'owner');
   const r=await client.getDocument(config.documentId,{includeTabsContent:true,suggestionsViewMode:'SUGGESTIONS_INLINE'});check(r.status===200,'read');
   return parseRecoveryDocument(r.body,config.documentId,'website');
  }
  async function write(raw,current,beforeSend){
   decodeStateEnvelope(raw,'website');let calls=0;
   const requests=[];if(current.endIndex>2)requests.push({deleteContentRange:{range:{startIndex:1,endIndex:current.endIndex-1,tabId:current.tabId}}});
   requests.push({insertText:{location:{index:1,tabId:current.tabId},text:raw}});
   check(guard===null,'busy');guard=()=>{check(++calls===1,'duplicate_send');beforeSend();};
   try{await client.batchUpdateDocument(config.documentId,{requests,writeControl:{requiredRevisionId:current.revision}});}catch{/* Every lost/error response needs exact readback. Never retry. */}finally{guard=null;}
   let observed;try{observed=await read();}catch{throw Error('f33_provider_outcome_uncertain');}
   check(calls===1&&observed.raw===raw&&observed.revision!==current.revision,'outcome_uncertain');return observed;
  }
  return {read,write};
 }
 const ledger=await selected(ledgerConfig),receipt=await selected(receiptConfig);
 const records=new Map();
 return Object.freeze({
  async reserveReceipt(input){
   check(!receiptAttempted,'receipt_already_attempted');receiptAttempted=true;
   const request=freeze(structuredClone(input));check(request.incident==='gha-43608206507-1/fence33'&&request.action==='retire-paused-only'&&request.envelopeSha256===hash(request.envelope),'request');
   decodeStateEnvelope(request.envelope,'website');const current=await receipt.read();check(current.value===null,'receipt_not_blank');
   const value={schemaVersion:1,kind:'f33-recovery-reservation',status:'reserved',request};const raw=encodeStateEnvelope('website',value,request.nonce);
   const observed=await receipt.write(raw,current,()=>{check(assertReceiptAuthority(request,'reserve')===true,'receipt_authority');});
   const record={request,raw,revision:observed.revision,finalized:false};
   const cap=Object.freeze({assertReserved(next){check(!record.finalized&&hash(next)===hash(request),'reservation_binding');return true;}});reservations.set(cap,record);records.set(hash(request),record);return cap;
  },
  async compareAndSwap(input,{beforeSend}={}){
   check(!ledgerAttempted,'ledger_already_attempted');ledgerAttempted=true;
   const request=freeze(structuredClone(input)),record=records.get(hash(request));check(record&&!record.finalized&&typeof beforeSend==='function','reservation_missing');
   const retained=await receipt.read();check(retained.raw===record.raw&&retained.revision===record.revision,'reservation_changed');
   const current=await ledger.read();check(current.revision===request.expectedRevision&&hash(current.value)===request.expectedSnapshotSha256,'snapshot_changed');
   check(hash(request.envelope)===request.envelopeSha256,'envelope_hash');const desired=decodeStateEnvelope(request.envelope,'website');check(hash(desired)===request.proposedStateSha256&&desired.paused===true&&desired.lease===null&&desired.fence===34,'candidate');
   return ledger.write(request.envelope,current,beforeSend);
  },
  async readEnvelope(){const r=await ledger.read();return {raw:r.raw,revision:r.revision};},
  async finishReceipt(cap,result){
   result=freeze(structuredClone(result));
   const record=reservations.get(cap);check(record&&!record.finalized,'receipt_capability');record.finalized=true;
   check(['verified-paused-retirement','outcome-uncertain'].includes(result?.status)&&result.nonce===record.request.nonce&&result.envelopeSha256===record.request.envelopeSha256&&result.publicationPerformed===false&&result.retryAllowed===false&&result.barrierReleaseAllowed===false,'result');
   const current=await receipt.read();check(current.raw===record.raw&&current.revision===record.revision,'receipt_changed');
   const raw=encodeStateEnvelope('website',{schemaVersion:1,kind:'f33-recovery-reservation',status:'finished',request:record.request,result:structuredClone(result)},record.request.nonce);
   await receipt.write(raw,current,()=>{check(assertReceiptAuthority(record.request,'finalize')===true,'receipt_authority');});
  }
 });
}
