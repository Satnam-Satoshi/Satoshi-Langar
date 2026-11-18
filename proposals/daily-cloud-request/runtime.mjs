import {admit,dispatchOnce,REPO} from './daily-request.mjs';
import {claimStore} from './claim-store.mjs';
import {ledgerView} from './ledger-view.mjs';
const dateAt=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
// Composition, not an entrypoint. Production composition must bind these providers
// to reviewed immutable code and exact resource identities before calling handle.
export function createDailyRequestRuntime({reader,claimAdapter,storageIdentity,publicationIdentity,state,assertDailyPublicationAvailable,DailyPublicationComplete,post,clock=Date.now,excludeProvenSelf=async runs=>runs}){
 return {async handle({event,context}){
  const number=event?.issue?.number;if(!Number.isSafeInteger(number)||number<=0)throw Error('issue_number');
  async function inspect(){
   const started=clock(),date=dateAt(started),issue=await reader.issue(number),source=await reader.source(),runs=await excludeProvenSelf(await reader.activeRuns());
   const ledger=await ledgerView({state,assertDailyPublicationAvailable,DailyPublicationComplete,date});
   // Absence from history is enforced by durable CAS claim, never asserted from issue.
   const history=await claimAdapter.read('daily-dispatch-requests');
   if(history.value?.schemaVersion!==1||!history.value.requests||Array.isArray(history.value.requests)||history.version===null||history.version===undefined)throw Error('claim_history_unavailable');
   const evidence={observed_at:new Date(started).toISOString(),repository:REPO,source_commit:source,runs_complete:true,ledger_complete:true,runs:runs.map(r=>({status:r.status})),ledger,request_history_complete:true,request_seen:Object.hasOwn(history.value.requests,date)};
   return admit({event,issue,context,evidence,now:clock()});
  }
  const initial=await inspect();
  const claims=claimStore({store:claimAdapter,storageIdentity,publicationIdentity,revalidate:async a=>{try{const fresh=await inspect();return a.source===fresh.source&&a.observedFence===fresh.observedFence&&a.issue===fresh.issue&&a.key===fresh.key&&a.expiresAt===fresh.expiresAt;}catch{return false;}}});
  return dispatchOnce(initial,{...claims,post,clock});
 }};
}
