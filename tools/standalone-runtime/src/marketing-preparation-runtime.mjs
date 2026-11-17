/** Dormant composition only: exact campaign -> platform draft validation -> one private reservation. */
import {prepareMarketingCampaign} from './marketing-campaign.mjs';
import {validateMarketingPlatformRequest,validateMarketingPlatformActionRequest} from './marketing-platform-policy.mjs';
import {createFirestoreMarketingSchedule} from './firestore-marketing-schedule.mjs';
const instant=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s?Date.parse(s):NaN;
const token=s=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(s);
function snapshot(value){let nodes=0,total=0;function walk(v,d=0){if(++nodes>100000||d>25)throw Error('bounded-input');if(v===null||typeof v==='boolean'||Number.isSafeInteger(v))return v;if(typeof v==='string'){total+=Buffer.byteLength(v);if(v.length>131072||total>16000000)throw Error('bounded-input');return v;}if(v instanceof Uint8Array){total+=v.byteLength;if(v.byteLength>2000000||total>16000000)throw Error('bounded-input');return new Uint8Array(v);}if(v instanceof Map){if(Object.getPrototypeOf(v)!==Map.prototype||Reflect.ownKeys(v).length||Object.getOwnPropertyDescriptor(Map.prototype,'size').get.call(v)>500)throw Error('bounded-map');return new Map([...Map.prototype.entries.call(v)].map(([k,x])=>{if(typeof k!=='string')throw Error('map-key');return [walk(k,d+1),walk(x,d+1)];}));}if(Array.isArray(v)){const ds=Object.getOwnPropertyDescriptors(v);if(Object.getPrototypeOf(v)!==Array.prototype||v.length>1000||Object.keys(v).length!==v.length||Object.getOwnPropertySymbols(v).length||Object.entries(ds).some(([k,p])=>k!=='length'&&(!p.enumerable||!('value'in p))))throw Error('plain-data');return v.map(x=>walk(x,d+1));}if(v&&Object.getPrototypeOf(v)===Object.prototype){const ds=Object.getOwnPropertyDescriptors(v);if(Reflect.ownKeys(v).length!==Object.keys(v).length||Object.entries(ds).some(([k,p])=>!p.enumerable||!('value'in p)||['__proto__','prototype','constructor'].includes(k)))throw Error('plain-data');return Object.fromEntries(Object.entries(ds).map(([k,p])=>[k,walk(p.value,d+1)]));}throw Error('plain-data');}return walk(value);}
const hold=(reason,extra={})=>({status:'held',reason,executeAllowed:false,schedulingAuthorized:false,providerMutationAttempted:false,...extra});
export function createMarketingPreparationRuntime({store,authorityLoaders,loadPlatformEvidence,channels,clock,preparationEnabled=false,reservationEnabled=false}={}){
 if(typeof clock!=='function'||typeof preparationEnabled!=='boolean'||typeof reservationEnabled!=='boolean'||reservationEnabled&&!preparationEnabled)throw Error('explicit-dormant-boundary-required');
 const fixedChannels=snapshot(channels);if(Object.keys(fixedChannels??{}).sort().join('|')!=='Instagram|X'||!Object.values(fixedChannels).every(token)||fixedChannels.X===fixedChannels.Instagram)throw Error('fixed-project-channels-required');
 let busy=false,uncertain=false;
 return Object.freeze({async advance(input){
  if(!preparationEnabled)return hold('marketing-preparation-disabled',{authorityReadCallbacksInvoked:0,reservationWriteAttempted:false});
  if(busy||uncertain)return hold('busy-or-uncertain-no-retry');busy=true;let callbackCount=0,reservationWriteAttempted=false;
  try{
   const frozen=snapshot(input);if(Object.keys(frozen??{}).sort().join('|')!=='campaign|selection')return hold('exact-runtime-input-required');
   const s=frozen.selection;if(!s||Object.keys(s).sort().join('|')!=='campaignId|dueAt|issueId|platform|queueObservationSha256|storyId'||![s.campaignId,s.storyId].every(token)||!['X','Instagram'].includes(s.platform)||typeof s.issueId!=='string'||!/^\d{4}-\d\d-\d\d-r[1-9][0-9]*$/.test(s.issueId)||!Number.isFinite(instant(s.dueAt))||!(/^[a-f0-9]{64}$/).test(s.queueObservationSha256??''))return hold('exact-selected-story-required');
   const started=instant(clock());if(!Number.isFinite(started))return hold('invalid-clock');
   const prepared=prepareMarketingCampaign({...frozen.campaign,now:new Date(started).toISOString()});
   const matches=prepared.drafts.filter(d=>d.campaignId===s.campaignId&&d.issueId===s.issueId&&d.storyId===s.storyId&&d.platform===s.platform);
   const common={backlog:prepared.backlog,backlogSha256:prepared.backlogSha256,coverage:prepared.coverage,nextBatchAfterKey:prepared.nextBatchAfterKey??null,allStoryCount:prepared.backlog.entries.length};
   if(matches.length!==1)return hold('selected-story-not-prepared',common);const draft=snapshot(matches[0]);
   if(typeof loadPlatformEvidence!=='function')return hold('independent-platform-evidence-loader-required',common);
   callbackCount++;const evidence=snapshot(await loadPlatformEvidence({draft:snapshot(draft),dueAt:s.dueAt,channelId:fixedChannels[s.platform]}));
   const at=instant(clock());if(!Number.isFinite(at)||at<started||at>=instant(draft.expiresAt)||instant(s.dueAt)<=at||instant(s.dueAt)>=instant(draft.contentExpiresAt))return hold('preparation-evidence-expired-or-clock-invalid',common);
   const evidenceKeys=Object.keys(evidence??{}).sort().join('|'),actionPolicy=evidenceKeys==='accountLimits|expectedPolicySha256|expectedQuotaPolicySha256|policy|publishedEvidence|quotaPolicy';
   if(!actionPolicy&&evidenceKeys!=='accountLimits|expectedPolicySha256|policy|publishedEvidence')return hold('exact-platform-evidence-required',common);
   const validatePlatform=args=>actionPolicy?validateMarketingPlatformActionRequest({...args,action:'create-draft'}):validateMarketingPlatformRequest(args);
   if(evidence.publishedEvidence?.mediaSha256!==draft.media.sha256)return hold('selected-media-binding-mismatch',common);
   const hashtags=draft.text.split(/\s+/).filter(v=>/^#[A-Za-z][A-Za-z_]{0,30}$/.test(v));
   const post={platform:s.platform==='X'?'twitter':'instagram',channelId:fixedChannels[s.platform],caption:draft.text,storyUrl:draft.storyUrl,mediaUrl:draft.media.url,mediaAlt:draft.media.alt,growthUrl:draft.growthUrl,dueAt:s.dueAt,verifiedHashtags:hashtags,campaignKind:'routine',storyId:draft.storyId};
   const request=validatePlatform({...evidence,now:new Date(at).toISOString(),post});
   if(request.status!=='dormant-request-validated')return hold('platform-policy-or-account-evidence-held',common);
   const validUntil=new Date(Math.min(instant(draft.expiresAt),instant(draft.contentExpiresAt),instant(post.dueAt),instant(evidence.policy.expiresAt),instant(evidence.accountLimits.expiresAt),instant(evidence.publishedEvidence.expiresAt),...evidence.accountLimits.requestWindows.map(w=>instant(w.resetAt)),...(actionPolicy?[instant(evidence.quotaPolicy.expiresAt)]:[]))).toISOString();
   if(!reservationEnabled)return {status:'marketing-preparation-validated',...common,draft,request,checkedAt:new Date(at).toISOString(),validUntil,reservationWriteAttempted:false,authorityReadCallbacksInvoked:callbackCount,providerCalls:null,executeAllowed:false,schedulingAuthorized:false,providerMutationAttempted:false};
   if(!store||typeof store.Firestore!=='function'||!authorityLoaders)return hold('independent-private-store-and-authorities-required',common);
   const reservationStore=createFirestoreMarketingSchedule({...store,authorityLoaders,clock,mutationEnabled:true});reservationWriteAttempted=true;
   const reservation=await reservationStore.reserve({draft,dueAt:s.dueAt,queueObservationSha256:s.queueObservationSha256});
   const final=instant(clock());if(!Number.isFinite(final)||final<at){uncertain=true;return hold('post-reservation-clock-invalid-no-retry',{...common,reservationMayExist:true});}
   return {status:'marketing-preparation-observed',...common,draft,request,reservation,checkedAt:new Date(final).toISOString(),validUntil,preparationCurrent:final<instant(draft.expiresAt)&&final<instant(draft.contentExpiresAt)&&validatePlatform({...evidence,post,now:new Date(final).toISOString()}).status==='dormant-request-validated',reservationWriteAttempted:true,authorityReadCallbacksInvoked:callbackCount,providerCalls:null,executeAllowed:false,schedulingAuthorized:false,providerMutationAttempted:false};
  }catch{if(reservationWriteAttempted)uncertain=true;return hold('marketing-preparation-failed-no-retry',{authorityReadCallbacksInvoked:callbackCount,providerCalls:callbackCount||reservationWriteAttempted?null:0,reservationWriteAttempted,reservationMayExist:reservationWriteAttempted});}
  finally{busy=false;}
 }});
}

/** Bounded copy shared by the concrete durable-backlog composition. */
export const snapshotMarketingPreparationInput=snapshot;
