/** Dormant owner-only operational alerts. No subscriber, campaign or bulk API. */
import {createHash} from 'node:crypto';
const SEND='https://api.brevo.com/v3/smtp/email',EVENTS='https://api.brevo.com/v3/smtp/statistics/events';
const hash=x=>createHash('sha256').update(x).digest('hex');
const exact=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===[...keys].sort().join('|');
function canon(v){let n=0;const walk=(x,d=0)=>{if(++n>100||d>8)throw Error();if(x===null||typeof x==='boolean'||Number.isSafeInteger(x))return x;if(typeof x==='string'&&x.length<=3000)return x;if(x&&Object.getPrototypeOf(x)===Object.prototype)return Object.fromEntries(Object.keys(x).sort().map(k=>[k,walk(x[k],d+1)]));throw Error();};return JSON.stringify(walk(v));}
const stamp=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s.replace(/Z$/,s.includes('.')?'Z':'.000Z')?Date.parse(s):NaN;
const email=s=>typeof s==='string'&&s.length<=254&&/^[A-Za-z0-9._+-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(s);
const reference=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(s);
const messageId=s=>typeof s==='string'&&s.length<=500&&/^<[^<>\s@]+@[^<>\s@]+>$/.test(s);
const reasons=Object.freeze({'source-unavailable':'Source evidence is unavailable.','run-failed':'The publication preparation run failed.','missed-run':'The scheduled preparation run was missed.','credentials-unavailable':'A required service connection is unavailable.','publication-unverified':'Publication could not be independently verified.'});
const hold=reason=>({status:'held',reason,deliveryConfirmed:false,publicationVerified:false});
export function createBrevoAlert({fetch:transport,resolveSecret,secretReference,sender,recipient,journal,loadApproval,clock=()=>new Date().toISOString(),networkEnabled=false,sendEnabled=false,timeoutMs=10000}={}){
 if(!email(sender)||!email(recipient)||typeof secretReference!=='string'||!secretReference||secretReference.length>300||[transport,resolveSecret,journal?.read,journal?.cas,loadApproval,clock].some(f=>typeof f!=='function')||typeof networkEnabled!=='boolean'||typeof sendEnabled!=='boolean'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>15000)throw Error('independent_alert_boundary_required');
 let busy=false,latched=false;
 return Object.freeze({async advance(event){
  if(!networkEnabled)return hold('network_disabled');if(busy)return hold('busy');busy=true;const abort=new AbortController();let timer,attempted=false;
  const active=()=>{if(abort.signal.aborted)throw Error();};
  try{return await Promise.race([(async()=>{
   if(!exact(event,['editionDate','reason','runSha256'])||!/^\d{4}-\d\d-\d\d$/.test(event.editionDate)||!Number.isFinite(Date.parse(event.editionDate))||new Date(event.editionDate).toISOString().slice(0,10)!==event.editionDate||!Object.hasOwn(reasons,event.reason)||!/^[a-f0-9]{64}$/.test(event.runSha256))return hold('bounded_operational_event_required');
   const observed=stamp(clock());if(!Number.isFinite(observed)||Date.parse(event.editionDate+'T00:00:00Z')>observed)return hold('invalid_event_clock');
   const captured=structuredClone(event),subject=`LTC publication check: ${captured.editionDate}`,textContent=`${reasons[captured.reason]}\nEdition date: ${captured.editionDate}.\nNo automatic retry or publication is implied. Owner review may be required.`;
   const identity={sender,recipient,event:captured,contentSha256:hash(subject+'\n'+textContent)},key=hash(canon(identity));
   let state=await journal.read({key});active();
   function valid(s){const now=stamp(clock());if(!Number.isFinite(now)||!exact(s,['version','record']))return false;if(s.record===null)return s.version===0;const r=s.record,accepted=s.version===2&&r?.phase==='accepted';return ((s.version===1&&r?.phase==='attempting')||accepted)&&exact(r,accepted?['key','identity','phase','approvalReference','createdAt','messageId']:['key','identity','phase','approvalReference','createdAt'])&&r.key===key&&canon(r.identity)===canon(identity)&&reference(r.approvalReference)&&Number.isFinite(stamp(r.createdAt))&&stamp(r.createdAt)<=now&&(!accepted||messageId(r.messageId));}
   if(!valid(state))return hold('authoritative_alert_journal_required');
   async function save(record){active();const next={version:state.version+1,record};const ack=await journal.cas({key,expectedVersion:state.version,next});active();if(ack?.applied!==true)throw Error();const readback=await journal.read({key});active();if(!valid(readback)||canon(readback)!==canon(next))throw Error();state=readback;}
   async function credential(){const value=await resolveSecret({reference:secretReference,purpose:'brevo-owner-operational-alert'});active();if(typeof value!=='string'||value.length<8||value.length>4096||/\s/.test(value))throw Error();return value;}
   async function json(url,options,status){const r=await transport(url,{...options,redirect:'manual',signal:abort.signal});active();if(r.url!==url||r.redirected||r.status!==status||!/^application\/json(?:;|$)/i.test(r.headers.get('content-type')??''))throw Error();const reader=r.body?.getReader();if(!reader)throw Error();let n=0;const parts=[];try{for(;;){const p=await reader.read();active();if(p.done)break;if(!(p.value instanceof Uint8Array)||(n+=p.value.length)>65536)throw Error();parts.push(p.value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));}
   async function reconcile(){
    const secret=await credential(),url=EVENTS+'?messageId='+encodeURIComponent(state.record.messageId)+'&email='+encodeURIComponent(recipient)+'&days=90&limit=100&offset=0&sort=desc';
    const result=await json(url,{method:'GET',headers:{'api-key':secret,Accept:'application/json'}},200);
    if(!result||!Array.isArray(result.events)||result.events.length>=100)return hold('delivery_history_incomplete');
    let delivered=null,latestDeferred=-Infinity;for(const e of result.events){if(!e||e.messageId!==state.record.messageId||e.email!==recipient||e.from!==sender||!Number.isFinite(stamp(e.date))||stamp(e.date)<stamp(state.record.createdAt)||stamp(e.date)>stamp(clock())||typeof e.event!=='string')return hold('delivery_event_binding_failed');if(!['requests','delivered','opened','clicks','loadedByProxy','deferred'].includes(e.event))return hold('delivery_failure_or_unknown_event');if(e.event==='deferred')latestDeferred=Math.max(latestDeferred,stamp(e.date));if(e.event==='delivered'&&(!delivered||stamp(e.date)>stamp(delivered.date)))delivered={date:e.date,event:'delivered'};}
    if(delivered&&latestDeferred>=stamp(delivered.date))return hold('conflicting_delivery_history');
    if(!delivered)return {status:'provider-accepted-delivery-pending',key,deliveryConfirmed:false,sendAttempted:attempted,retryAuthorized:false};
    const receiptSha256=hash(canon({key,messageId:state.record.messageId,delivered,contentSha256:identity.contentSha256}));return {status:'provider-delivery-observed',key,receiptSha256,deliveryConfirmed:true,sendAttempted:attempted,retryAuthorized:false,publicationVerified:false};
   }
   if(state.record?.phase==='attempting')return hold('unknown_send_no_retry');
   if(state.record?.phase==='accepted')return await reconcile();
   if(!sendEnabled||latched)return hold('send_disabled_or_uncertain');
   const approval=structuredClone(await loadApproval({action:'send-owner-operational-alert',key,identity}));active();
   const approved=()=>{const now=stamp(clock());return Number.isFinite(now)&&approval?.action==='send-owner-operational-alert'&&approval.key===key&&canon(approval.identity)===canon(identity)&&reference(approval.reference)&&stamp(approval.notBefore)<=now&&stamp(approval.expiresAt)>now;};
   if(!approved())return hold('exact_alert_approval_required');const secret=await credential();
   if(!approved())return hold('approval_expired');await save({key,identity,phase:'attempting',approvalReference:approval.reference,createdAt:new Date(stamp(clock())).toISOString()});active();if(!approved())return hold('approval_expired_after_intent');
   attempted=true;const result=await json(SEND,{method:'POST',headers:{'api-key':secret,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({sender:{email:sender},to:[{email:recipient,contactPixelTrackingConsent:false}],subject,textContent})},201);
   if(!messageId(result?.messageId)||result.messageIds!==undefined)throw Error();await save({...state.record,phase:'accepted',messageId:result.messageId});return await reconcile();
  })(),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error());},timeoutMs);})]);}catch{latched=true;abort.abort();return {...hold('uncertain_alert_operation_no_retry'),sendAttempted:attempted};}finally{abort.abort();clearTimeout(timer);busy=false;}
 }});
}
