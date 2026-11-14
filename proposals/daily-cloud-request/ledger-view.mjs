// Adapt ONLY an existing DurableCloudState.inspect() result plus the reviewed
// assertDailyPublicationAvailable verifier. Do not pass raw/unvalidated JSON.
export async function ledgerView({state,assertDailyPublicationAvailable,DailyPublicationComplete,date}){
 if(typeof state?.inspect!=='function'||typeof assertDailyPublicationAvailable!=='function'||typeof DailyPublicationComplete!=='function')throw Error('reviewed_ledger_adapter_required');
 const d=await state.inspect();
 if(d?.schemaVersion!==1||typeof d.paused!=='boolean'||typeof d.restoreHold!=='boolean'||!Object.hasOwn(d,'lease')||!Number.isSafeInteger(d.fence)||d.fence<0||!d.intents||Array.isArray(d.intents)||!d.receipts)throw Error('invalid_ledger');
 let latest=null;
 try{assertDailyPublicationAvailable(d,date);}catch(e){if(e instanceof DailyPublicationComplete)latest=date;else throw e;}
 if(latest===null&&d.latestRelease){
  // Reviewed verifier above authenticates the checkpoint/receipt/archive chain.
  const edition=d.latestRelease.editionId.slice(0,10);
  const verified=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d.latestRelease.verifiedAt));
  latest=edition>verified?edition:verified;
 }
 const intents=Object.values(d.intents);if(intents.some(i=>!['pending','uncertain','confirmed','not-applied'].includes(i?.status)))throw Error('unknown_intent');
 return {paused:d.paused,restore_hold:d.restoreHold,lease:d.lease,unresolved_intents:intents.filter(i=>!['confirmed','not-applied'].includes(i.status)).length,latest_date:latest,fence:d.fence};
}
