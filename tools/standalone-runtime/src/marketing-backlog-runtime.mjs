/** Concrete dormant durable full-backlog checkpoint before any selected reservation. */
import {createFirestoreMarketingBacklog} from './firestore-marketing-backlog.mjs';
import {prepareMarketingCampaign} from './marketing-campaign.mjs';
import {createMarketingPreparationRuntime,snapshotMarketingPreparationInput as copy} from './marketing-preparation-runtime.mjs';
const stamp=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s?Date.parse(s):NaN;
const held=(reason,more={})=>({status:'held',reason,executeAllowed:false,schedulingAuthorized:false,providerMutationAttempted:false,...more});
export function createDurableMarketingPreparationRuntime({store,authorityLoaders,loadPlatformEvidence,channels,clock,enabled=false,reservationEnabled=false}={}){
 if(typeof clock!=='function'||typeof enabled!=='boolean'||typeof reservationEnabled!=='boolean'||reservationEnabled&&!enabled)throw Error('explicit-durable-marketing-boundary');
 let busy=false,uncertain=false;
 return Object.freeze({async advance(input){if(!enabled)return held('durable-marketing-disabled');if(busy||uncertain)return held('busy-or-uncertain-checkpoint-no-retry');busy=true;let checkpointWriteAttempted=false;
 try{
  const frozen=copy(input);if(Object.keys(frozen??{}).sort().join('|')!=='campaign|selection')return held('exact-input-required');
  const start=stamp(clock());if(!Number.isFinite(start))return held('invalid-clock');
  const backlogStore=createFirestoreMarketingBacklog({...store,clock,mutationEnabled:true});
  const previous=await backlogStore.read(),readAt=stamp(clock());if(!Number.isFinite(readAt)||readAt<start)throw Error('clock');
  const campaign={...frozen.campaign,priorBacklog:previous.backlog,trustedPriorSha256:previous.backlogSha256,batchAfterKey:previous.batchAfterKey,now:new Date(readAt).toISOString()};
  const prepared=prepareMarketingCampaign(campaign);
  // Persist all identities, not just the selected draft; never advance a batch cursor before its work is accounted for.
  checkpointWriteAttempted=true;const ack=await backlogStore.commit({expectedRevision:previous.revision,backlog:prepared.backlog,batchAfterKey:previous.batchAfterKey});
  if(ack?.applied!==true||ack.backlogSha256!==prepared.backlogSha256)return held('canonical-backlog-cas-held',{checkpointWriteAttempted:true});
  const actual=await backlogStore.read(),at=stamp(clock());if(!Number.isFinite(at)||at<readAt||actual.revision!==ack.revision||actual.backlogSha256!==ack.backlogSha256||actual.batchAfterKey!==previous.batchAfterKey)throw Error('checkpoint-readback');
  const runtime=createMarketingPreparationRuntime({store,authorityLoaders,loadPlatformEvidence,channels,clock,preparationEnabled:true,reservationEnabled});
  let preparation=await runtime.advance({campaign:{...campaign,priorBacklog:actual.backlog,trustedPriorSha256:actual.backlogSha256,batchAfterKey:actual.batchAfterKey},selection:frozen.selection});
  const final=stamp(clock());if(!Number.isFinite(final)||final<at){uncertain=true;return held('post-checkpoint-clock-invalid-no-retry',{checkpointMayExist:true,reservationMayExist:reservationEnabled});}
  if(preparation.preparationCurrent!==undefined){const checked=stamp(preparation.checkedAt),deadline=stamp(preparation.validUntil);if(!Number.isFinite(checked)||!Number.isFinite(deadline)||final<checked)throw Error('child-observation-clock');preparation={...preparation,preparationCurrent:preparation.preparationCurrent===true&&final<deadline};}
  return {status:'durable-marketing-preparation-observed',checkpoint:{revision:actual.revision,backlogSha256:actual.backlogSha256,entries:actual.backlog.entries.length,batchAfterKey:actual.batchAfterKey},nextBatchAfterKeyProposal:prepared.nextBatchAfterKey??null,preparation,checkpointWriteAttempted:true,providerCalls:null,executeAllowed:false,schedulingAuthorized:false,providerMutationAttempted:false};
 }catch{if(checkpointWriteAttempted)uncertain=true;return held('durable-marketing-preparation-failed-no-retry',{checkpointWriteAttempted,checkpointMayExist:checkpointWriteAttempted,providerCalls:null});}
 finally{busy=false;}
 }});
}
