import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { parseRecoveryDocument } from './cloud-ltc-recovery-doc-parser.mjs';
import { decodeStateEnvelope, encodeStateEnvelope } from './cloud-ltc-state-envelope.mjs';
import { assertF33Transition, f33Digest } from './cloud-ltc-f33-fresh-admission.mjs';
import { validateDocument } from './cloud-ltc-state.mjs';
const check=(v,c)=>{if(!v)throw Error('f33_fresh_provider_'+c);};

// No resource creation, no receipt mutation, no automatic retry. The caller must
// first verify reviewed source/native approval and acquire persistent exclusion.
export async function createF33FreshProvider({ledgerConfig,receiptConfig,ownerPermissionId,env,fetchImpl,runtimeFactory=createGoogleStateRuntime}) {
  ledgerConfig=structuredClone(ledgerConfig);receiptConfig=structuredClone(receiptConfig);
  check(ledgerConfig.documentId!==receiptConfig.documentId && ledgerConfig.folderId===receiptConfig.folderId && typeof ownerPermissionId==='string' && ownerPermissionId.length>0,'resources');
  let guard=null,attempted=false;
  const ledger=await runtimeFactory({config:ledgerConfig,env,fetchImpl,beforeWrite:()=>{check(typeof guard==='function','unarmed');guard();}});
  const receipt=await runtimeFactory({config:receiptConfig,env,fetchImpl,beforeWrite:()=>{throw Error('f33_fresh_receipt_readonly');}});
  async function read(runtime,config) {
    await runtime.client.verifySelectedResources();
    const metadata=await runtime.client.getFileMetadata(config.documentId);
    check(metadata.status===200 && metadata.body?.permissions?.length===1 && metadata.body.permissions[0].id===ownerPermissionId,'owner');
    const response=await runtime.client.getDocument(config.documentId,{includeTabsContent:true,suggestionsViewMode:'SUGGESTIONS_INLINE'});
    check(response.status===200,'read');return parseRecoveryDocument(response.body,config.documentId,'website');
  }
  return Object.freeze({
    async readState(){const r=await read(ledger,ledgerConfig);return {value:r.value,version:r.revision};},
    async readFinishedReceipt(){return (await read(receipt,receiptConfig)).value;},
    async readRawEnvelope(){const r=await read(ledger,ledgerConfig);return {raw:r.raw,revision:r.revision};},
    async compareAndSwapExact(request,{beforeSend}) {
      check(!attempted && typeof beforeSend==='function','single_attempt');attempted=true;
      const current=await read(ledger,ledgerConfig),{binding,envelope,candidate,configuration}=request;
      check(current.revision===binding.expectedRevision && f33Digest(current.value)===binding.expectedSnapshotSha256,'snapshot_changed');
      check(envelope===encodeStateEnvelope('website',candidate,binding.nonce),'nonce_binding');
      check(f33Digest(decodeStateEnvelope(envelope,'website'))===binding.proposedStateSha256 && f33Digest(candidate)===binding.proposedStateSha256,'candidate_changed');
      assertF33Transition(current.value,candidate,configuration);validateDocument(candidate);
      const requests=[];
      if(current.endIndex>2)requests.push({deleteContentRange:{range:{startIndex:1,endIndex:current.endIndex-1,tabId:current.tabId}}});
      requests.push({insertText:{location:{index:1,tabId:current.tabId},text:envelope}});
      let calls=0;guard=()=>{check(++calls===1,'duplicate_send');beforeSend();};
      try {await ledger.client.batchUpdateDocument(ledgerConfig.documentId,{requests,writeControl:{requiredRevisionId:current.revision}});}
      finally {guard=null;}
    },
  });
}
