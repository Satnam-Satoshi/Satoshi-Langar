/** Dormant fixed-object review retrieval. Provider identity is not reviewer authorship. */
import {createDriveArchive} from './adapters/drive-archive.mjs';
import {bindReviewedEditorial} from './source-review-config.mjs';
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const time=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const hold=reason=>({status:'held',reason,reviewAuthorityAuthenticated:false,semanticTruthEstablished:false,publishable:false,effects:[]});
export function createDriveReviewLoader({drive,approvedObjects,trustedConfigurationSha256,trustedReviewSha256,trustedCollectionSha256,approvalExpiresAt,clock,networkEnabled=false}={}){
 if(!drive||!approvedObjects||Object.keys(approvedObjects).sort().join('|')!=='configuration|review'||![trustedConfigurationSha256,trustedReviewSha256,trustedCollectionSha256].every(hex)||!time(approvalExpiresAt)||typeof clock!=='function'||typeof networkEnabled!=='boolean')throw Error('invalid-review-loader-boundary');
 const objects=structuredClone(approvedObjects);
 for(const x of Object.values(objects))if(!x||Object.keys(x).sort().join('|')!=='bytes|fileId|mimeType|name|sha256|version'||typeof x.version!=='string'||x.mimeType!=='application/json'||!Number.isSafeInteger(x.bytes)||x.bytes<1||x.bytes>1048576)throw Error('invalid-review-object-boundary');
 if(objects.configuration.fileId===objects.review.fileId)throw Error('distinct-review-objects-required');
 const archive=createDriveArchive({fetch:drive.fetch,resolveSecret:drive.resolveSecret,secretReference:drive.secretReference,folderId:drive.folderId,ownerPermissionId:drive.ownerPermissionId,timeoutMs:drive.timeoutMs??15000,existingFiles:Object.values(objects),networkEnabled,mutationsEnabled:false});
 let busy=false,stopped=false;
 const now=()=>{const t=clock();if(!time(t)||Date.parse(t)>=Date.parse(approvalExpiresAt))throw Error('expired');return t;};
 return Object.freeze({async load({collection}={}){
  if(!networkEnabled)return hold('network-disabled');if(busy)return hold('concurrent-load-denied');if(stopped)return hold('previous-load-requires-review');busy=true;
  try{
   now();const retained=structuredClone(collection),parsed={};
   for(const role of ['configuration','review']){now();const r=await archive.readVerifiedArtifact(objects[role].fileId);now();if(r.status!=='existing-archive-readback-verified'||!(r.verifiedBytes instanceof Uint8Array))throw Error('readback');parsed[role]=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(r.verifiedBytes));}
   const binding=bindReviewedEditorial({configuration:parsed.configuration,reviewEnvelope:parsed.review,collection:retained,trustedConfigurationSha256,trustedReviewSha256,trustedCollectionSha256,now:now()});
   const checkedAt=now();if(Date.parse(checkedAt)>=Date.parse(binding.freshnessBounds.expiresAt))throw Error('expired');
   return {status:'review-loaded-and-bound',binding,sourceReview:{configuration:structuredClone(parsed.configuration),reviewEnvelope:structuredClone(parsed.review),collection:structuredClone(retained),trustedConfigurationSha256,trustedReviewSha256,trustedCollectionSha256},retrieval:{assurance:'service-authenticated-owner-private-byte-readback',trustedTransportRequired:true,configurationSha256:objects.configuration.sha256,reviewSha256:objects.review.sha256,checkedAt,atomic:false,worm:false},reviewAuthorityAuthenticated:false,semanticTruthEstablished:false,publishable:false,effects:[]};
  }catch{stopped=true;return hold('review-load-or-binding-failed');}finally{busy=false;}
 }});
}
