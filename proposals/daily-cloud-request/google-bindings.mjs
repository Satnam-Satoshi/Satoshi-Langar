import {requestEnvelopeAdapter} from './request-envelope.mjs';
// Bind the existing reviewed Google runtime/state classes, supplied by a pinned
// trusted controller. No credential lookup or runtime invocation occurs on import.
export async function googleBindings({folderId,publicationDocumentId,requestDocumentId,createGoogleStateRuntime,DurableCloudState,env,clock=Date.now,requestWritesAuthorized=false}){
 const valid=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{8,160}$/.test(s);
 if(![folderId,publicationDocumentId,requestDocumentId].every(valid)||publicationDocumentId===requestDocumentId||folderId===publicationDocumentId||folderId===requestDocumentId)throw Error('distinct_exact_private_resources_required');
 if(typeof createGoogleStateRuntime!=='function'||typeof DurableCloudState!=='function'||typeof requestWritesAuthorized!=='boolean')throw Error('reviewed_runtime_required');
 const configuration=documentId=>({schemaVersion:1,provider:'google-docs',publicationEnabled:false,folderId,documentId});
 const publication=await createGoogleStateRuntime({config:configuration(publicationDocumentId),env,clock,beforeWrite:()=>{throw Error('publication_ledger_read_only');}});
 const requests=await createGoogleStateRuntime({config:configuration(requestDocumentId),env,clock,beforeWrite:()=>{if(!requestWritesAuthorized)throw Error('request_storage_writes_not_authorized');}});
 // Existing Google runtime verifies exact IDs, parent, owner-only permissions and
 // revisions against the provider. Identity strings derive from those bound configs.
 return {state:new DurableCloudState(publication.stateAdapter,'website',{clock}),claimAdapter:requestEnvelopeAdapter(requests.stateAdapter,requestDocumentId),storageIdentity:requestDocumentId,publicationIdentity:publicationDocumentId};
}
