import {createHash} from 'node:crypto';
import {evaluateRunHealth} from './monitor.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const canonical=x=>JSON.stringify(x&&typeof x==='object'?sort(x):x);
const sort=x=>Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;
const stamp=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s?Date.parse(s):NaN;
const iso=n=>new Date(n).toISOString();
const digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
/** Resolve one explicitly supplied date, never the machine's local timezone.
 * Bounded 36h/minute scan covers NY DST without hardcoded UTC offsets. */
export function dailyEditionEvent(editionDate){
 if(typeof editionDate!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(editionDate)||!Number.isFinite(Date.parse(editionDate))||new Date(editionDate).toISOString().slice(0,10)!==editionDate)throw Error('exact-edition-date-required');
 const start=Date.parse(editionDate+'T00:00:00.000Z'),matches=[];
 for(let minute=0;minute<=2160;minute++){const at=start+minute*60000,parts=Object.fromEntries(ny.formatToParts(at).map(p=>[p.type,p.value]));if(`${parts.year}-${parts.month}-${parts.day}`===editionDate&&parts.hour==='09'&&parts.minute==='00')matches.push(at);}
 if(matches.length!==1)throw Error('unique-new-york-schedule-required');
 const scheduledAt=iso(matches[0]);const event={schemaVersion:1,kind:'daily-edition',timezone:'America/New_York',editionDate,editionId:`${editionDate}-r1`,runId:`daily-${editionDate}-r1`,scheduledAt,deadlineAt:iso(matches[0]+30*60000)};
 return Object.freeze({...event,eventSha256:sha(canonical(event))});
}
function eventInput(given){const event=dailyEditionEvent(given?.editionDate);if(canonical(given)!==canonical(event))throw Error('bound-schedule-event-required');return event;}
const held=reason=>({status:'held',reason,publicationVerified:false,dispatchPerformed:false,alertSent:false});
function readState(s){
 if(!s||Object.keys(s).sort().join('|')!=='record|version'||!Number.isSafeInteger(s.version)||s.version<0||s.version>Number.MAX_SAFE_INTEGER-3||!(s.record===null||s.record&&typeof s.record==='object'))throw Error('preinitialized-durable-outbox-required');
 if(s.record===null&&s.version!==0||s.record!==null&&(s.record.status==='intent'?s.version!==1:s.record.status==='acknowledged'?s.version!==2:true))throw Error('invalid-outbox-phase-version');return s;
}
export function createScheduleMonitor({history,outbox,dispatch,sendAlert,loadApproval,clock,dispatchTargetSha256,alertDestinationSha256,dispatchEnabled=false,alertsEnabled=false}={}){
 if(typeof history?.readEdition!=='function'||typeof outbox?.read!=='function'||typeof outbox?.cas!=='function'||typeof clock!=='function'||typeof dispatchEnabled!=='boolean'||typeof alertsEnabled!=='boolean'||dispatchEnabled&&!digest(dispatchTargetSha256)||alertsEnabled&&!digest(alertDestinationSha256))throw Error('independent-monitor-boundaries-required');
 let busy=false;const uncertain=new Set();
 const now=()=>{const n=stamp(clock());if(!Number.isFinite(n))throw Error('invalid-clock');return n;};
 async function observe(event){
  const h=await history.readEdition({editionDate:event.editionDate});const at=now();
  if(!h||h.authenticated!==true||!Number.isFinite(stamp(h.observedAt))||stamp(h.observedAt)>at||at-stamp(h.observedAt)>60000||h.editionId!==event.editionId||typeof h.exists!=='boolean'||!Object.hasOwn(h,'run')||h.run!==null&&h.exists!==true)throw Error('fresh-canonical-history-required');
  const health=evaluateRunHealth({now:iso(at),expectedRun:{id:event.runId,scheduledAt:event.scheduledAt,deadlineAt:event.deadlineAt},observation:{authenticated:true,observedAt:h.observedAt,run:h.run}});
  let reason=health.alert?.reason??null;
  if(health.status!=='completed'&&h.sourceHealth!==undefined){const s=h.sourceHealth;if(!s||Object.keys(s).sort().join('|')!=='expiresAt|gapCount'||!Number.isSafeInteger(s.gapCount)||s.gapCount<0||s.gapCount>1000||!Number.isFinite(stamp(s.expiresAt)))throw Error('source-health-observation-required');if(s.gapCount>0)reason='source-coverage-gaps';else if(stamp(s.expiresAt)<=at)reason='source-evidence-stale';}
  return {h,at,health,reason};
 }
 function actionFor(event,observed){const {h,at,health,reason}=observed;
  if(at<stamp(event.scheduledAt))return {kind:null,reason:'not-due'};
  if(health.status==='completed')return {kind:null,reason:'existing-verified-completion'};
  if(reason)return {kind:'alert',payload:{runId:event.runId,editionId:event.editionId,reason,healthStatus:health.status}};
  if(h.exists||h.run!==null)return {kind:null,reason:'existing-canonical-edition'};
  if(at>=stamp(event.deadlineAt))return {kind:null,reason:'late-event-no-backfill'};
  return {kind:'dispatch',payload:{runId:event.runId,editionId:event.editionId,scheduledAt:event.scheduledAt}};
 }
 const keyFor=(event,action)=>sha(canonical(['standalone-schedule-v1',event.editionId,action.kind,action.kind==='alert'?action.payload.reason:'canonical-producer']));
 function binding(event,action){return {key:keyFor(event,action),kind:action.kind,destinationSha256:action.kind==='dispatch'?dispatchTargetSha256:alertDestinationSha256,eventSha256:event.eventSha256,payloadSha256:sha(canonical(action.payload))};}
 function validRecord(record,bound){
  const at=now();
  if(!record||!['intent','acknowledged'].includes(record.status)||!Object.keys(bound).every(k=>record[k]===bound[k])||!Number.isFinite(stamp(record.createdAt))||stamp(record.createdAt)>at||Object.keys(record).sort().join('|')!==(record.status==='intent'?'createdAt|destinationSha256|eventSha256|key|kind|payloadSha256|status':'acknowledgedAt|createdAt|destinationSha256|eventSha256|key|kind|payloadSha256|receiptSha256|status')||record.status==='acknowledged'&&(!digest(record.receiptSha256)||!(stamp(record.acknowledgedAt)>=stamp(record.createdAt))||stamp(record.acknowledgedAt)>at))throw Error('outbox-binding-conflict');
 }
 async function act(event,action){
  const bound=binding(event,action),key=bound.key,enabled=action.kind==='dispatch'?dispatchEnabled:alertsEnabled;
  if(!enabled)return {...held(action.kind+'-disabled'),action:{...action,key}};
  if(uncertain.has(key))return held('uncertain-action-readonly-reconciliation');
  if(typeof loadApproval!=='function'||typeof (action.kind==='dispatch'?dispatch:sendAlert)!=='function')return held('approved-effect-adapter-required');
  let state=readState(await outbox.read({key}));
  if(state.record){validRecord(state.record,bound);return {...held(state.record.status==='acknowledged'?'already-acknowledged':'uncertain-action-readonly-reconciliation'),key};}
  const approval=structuredClone(await loadApproval({action:action.kind==='dispatch'?'dispatch-daily-preparation':'send-run-health-alert',...bound}));
  const approved=()=>{const at=now();return approval&&approval.action===(action.kind==='dispatch'?'dispatch-daily-preparation':'send-run-health-alert')&&approval.key===key&&approval.eventSha256===bound.eventSha256&&approval.payloadSha256===bound.payloadSha256&&approval.destinationSha256===bound.destinationSha256&&typeof approval.reference==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(approval.reference)&&stamp(approval.notBefore)<=at&&stamp(approval.expiresAt)>at;};
  if(!approved())return held('exact-effect-approval-required');
  // Recheck independently authenticated history after approval, before durable intent.
  const refreshed=actionFor(event,await observe(event));if(refreshed.kind!==action.kind||canonical(refreshed.payload)!==canonical(action.payload))return held('action-no-longer-current');
  const record={...bound,status:'intent',createdAt:iso(now())};
  try{
   const next={version:state.version+1,record};
   if((await outbox.cas({key,expectedVersion:state.version,next}))?.applied!==true)return held('outbox-cas-conflict');
   state=readState(await outbox.read({key}));if(canonical(state)!==canonical(next))throw Error('outbox-readback-mismatch');validRecord(state.record,bound);
   if(!approved())throw Error('approval-expired-after-intent');
   // Final observation narrows, but cannot eliminate, cross-system race windows.
   const final=actionFor(event,await observe(event));if(final.kind!==action.kind||canonical(final.payload)!==canonical(action.payload))throw Error('action-changed-after-intent');
   if(!approved())throw Error('approval-expired-before-effect');
   const result=await (action.kind==='dispatch'?dispatch:sendAlert)({key,event,destinationSha256:bound.destinationSha256,payload:structuredClone(action.payload),approvalReference:approval.reference});
   if(!result||result.key!==key||result.status!==(action.kind==='dispatch'?'preparation-accepted':'alert-delivery-confirmed')||!digest(result.receiptSha256))throw Error('unbound-effect-receipt');
   const done={version:state.version+1,record:{...record,status:'acknowledged',acknowledgedAt:iso(now()),receiptSha256:result.receiptSha256}};
   validRecord(done.record,bound);
   if((await outbox.cas({key,expectedVersion:state.version,next:done}))?.applied!==true||canonical(readState(await outbox.read({key})))!==canonical(done))throw Error('acknowledgment-uncertain');
   validRecord(done.record,bound);
   return {status:action.kind==='dispatch'?'preparation-dispatched':'alert-delivery-confirmed',key,dispatchPerformed:action.kind==='dispatch',alertSent:action.kind==='alert',publicationVerified:false};
  }catch{uncertain.add(key);return {...held('uncertain-effect-no-retry'),key};}
 }
 return Object.freeze({
  async handle(given){if(busy)return held('monitor-busy');busy=true;try{const event=eventInput(given),observation=await observe(event),action=actionFor(event,observation);if(!action.kind)return {...held(action.reason),health:observation.health};return {...await act(event,action),health:observation.health};}catch{return held('invalid-or-unavailable-authoritative-input');}finally{busy=false;}},
  async reconcile({event:given,kind,reason}={}){try{const event=eventInput(given);if(!['dispatch','alert'].includes(kind)||kind==='alert'&&(!reason||typeof reason!=='string'||reason.length>100))throw Error();const key=keyFor(event,{kind,payload:{reason}}),state=readState(await outbox.read({key}));if(state.record&&(state.record.key!==key||state.record.kind!==kind||state.record.eventSha256!==event.eventSha256||!digest(state.record.payloadSha256)||!digest(state.record.destinationSha256)))throw Error();if(state.record)validRecord(state.record,{key,kind,destinationSha256:state.record.destinationSha256,eventSha256:event.eventSha256,payloadSha256:state.record.payloadSha256});return {status:'outbox-observed',key,record:state.record,readonly:true,retryAuthorized:false,publicationVerified:false};}catch{return held('reconciliation-unavailable');}}
 });
}
