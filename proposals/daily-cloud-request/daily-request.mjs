// DRAFT ONLY: pure admission and one-shot protocol. No production adapters/configuration.
export const REPO='Satnam-Satoshi/Satoshi-Langar';
const admissions=new WeakSet();
const OWNER=268053325, TITLE='[LTC cloud request] daily publication';
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===k.split(',').sort().join(',');
const user=u=>u?.id===OWNER&&u?.login==='Satnam-Satoshi'&&u?.type==='User';
const timestamp=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(Date.parse(s)).toISOString()===s.replace(/Z$/,s.includes('.')?'Z':'.000Z');
const calendar=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00.000Z'))&&new Date(s+'T00:00:00.000Z').toISOString().slice(0,10)===s;
const fresh=(s,now)=>timestamp(s)&&Date.parse(s)<=now&&now-Date.parse(s)<=60000;
const eastern=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const reject=reason=>{throw Error(reason);};
export function admit({event,issue,context,evidence,now}){
 if(!Number.isFinite(now)||context?.repository!==REPO||context.ref!=='refs/heads/main'||context.event!=='issues'||context.attempt!==1)reject('context');
 if(event?.action!=='opened'||event.repository?.full_name!==REPO||!user(event.sender))reject('event');
 const old=event.issue;
 for(const i of [old,issue])if(!i||i.pull_request||!Number.isSafeInteger(i.id)||i.id<=0||!Number.isSafeInteger(i.number)||i.number<=0||!user(i.user)||i.author_association!=='OWNER'||i.state!=='open'||i.title!==TITLE||i.created_at!==i.updated_at||!timestamp(i.created_at))reject('issue');
 if(issue.id!==old.id||issue.number!==old.number||issue.body!==old.body||issue.created_at!==old.created_at)reject('changed');
 if(typeof issue.body!=='string'||Buffer.byteLength(issue.body)>512)reject('size');
 let r;try{r=JSON.parse(issue.body);}catch{reject('json');}
 if(!keys(r,'date,expires_at,source_commit')||!calendar(r.date)||r.date!==eastern(now)||!timestamp(r.expires_at)||Date.parse(r.expires_at)<=now||Date.parse(r.expires_at)-Date.parse(issue.created_at)>600000||Date.parse(issue.created_at)>now||now-Date.parse(issue.created_at)>600000||!/^[a-f0-9]{40}$/.test(r.source_commit))reject('request');
 // This evidence MUST come from a trusted adapter, never issue/body input.
 if(!keys(evidence,'observed_at,repository,source_commit,runs_complete,ledger_complete,runs,ledger,request_history_complete,request_seen'))reject('evidence_schema');
 if(!fresh(evidence.observed_at,now)||evidence.repository!==REPO||evidence.source_commit!==r.source_commit||evidence.runs_complete!==true||evidence.ledger_complete!==true||evidence.request_history_complete!==true||evidence.request_seen!==false)reject('evidence');
 if(!Array.isArray(evidence.runs))reject('runs');
 // Conservatively treat every non-completed production-group workflow as active.
 for(const run of evidence.runs)if(!keys(run,'status')||run.status!=='completed')reject('active_or_unknown');
 const l=evidence.ledger;
 if(!keys(l,'paused,restore_hold,lease,unresolved_intents,latest_date,fence')||l.paused!==false||l.restore_hold!==false||l.lease!==null||l.unresolved_intents!==0||!Number.isSafeInteger(l.fence)||l.fence<0||!(l.latest_date===null||calendar(l.latest_date)))reject('ledger');
 if(l.latest_date!==null&&l.latest_date>=r.date)reject('already_done_or_future');
 const admission=Object.freeze({expiresAt:Date.parse(r.expires_at),observedAt:Date.parse(evidence.observed_at),date:r.date,key:`${REPO}:daily:${r.date}`,issue:issue.number,observedFence:l.fence,source:r.source_commit,workflow:'ltc-daily-publication.yml',ref:'main',inputs:Object.freeze({dry_run:'false',acceptance_probe:'false',bootstrap_previous_manifest:'false',acceptance_mode:'none'})});
 admissions.add(admission);return admission;
}
// Atomic claim adapter must durably compare date/fence/evidence and retain uncertainty.
// No adapter is supplied: cannot run in production or pretend these checks grant access.
export async function dispatchOnce(admission,{claim,post,record,clock=Date.now}){
 const current=()=>{const now=clock();return Number.isFinite(now)&&now<admission.expiresAt&&now>=admission.observedAt&&now-admission.observedAt<=60000&&eastern(now)===admission.date;};
 if(!admissions.has(admission)||!current())reject('stale_or_unvalidated_admission');
 const owned=await claim(admission);
 if(owned!==true)return {status:'not-claimed',posted:false};
 if(!current()){await record(admission,'expired-without-dispatch');return{status:'expired-without-dispatch',posted:false};}
 let accepted=false;
 try{accepted=await post(admission)===true;}catch{}
 const status=accepted?'accepted':'uncertain';
 // Keep claim even when POST or record result is ambiguous. Never retry/clear here.
 await record(admission,status);
 return{status,posted:true};
}
