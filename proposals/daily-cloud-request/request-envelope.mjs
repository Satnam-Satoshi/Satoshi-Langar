// Compatibility layer confined to a distinct private REQUEST document.
// The reviewed Google transport accepts only website/social codec keys. Reuse its
// website envelope codec without changing that transport or publication ledger.
const logical='daily-dispatch-requests';
function shape(value){if(!value||Object.keys(value).sort().join(',')!=='requests,schemaVersion'||value.schemaVersion!==1||!value.requests||Array.isArray(value.requests))throw Error('request_document_required');}
export function requestEnvelopeAdapter(adapter,documentId){
 if(adapter?.documentId!==documentId||typeof documentId!=='string'||typeof adapter.read!=='function'||typeof adapter.conditionalWrite!=='function')throw Error('bound_request_document_required');
 return Object.freeze({
  async read(key){if(key!==logical)throw Error('request_key_required');const read=await adapter.read('website');shape(read.value);return read;},
  async conditionalWrite(key,value,version){if(key!==logical)throw Error('request_key_required');shape(value);return adapter.conditionalWrite('website',value,version);}
 });
}
