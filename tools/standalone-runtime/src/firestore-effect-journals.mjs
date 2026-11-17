import {createHash} from 'node:crypto';
import {FIRESTORE_STATE_DOCUMENT} from './firestore-state.mjs';
export const EFFECT_JOURNAL_PREFIXES=Object.freeze({cloudRun:'newsroomPrivateCloudRunEffectsV1',brevo:'newsroomPrivateBrevoAlertsV1'});
const fail=s=>Object.assign(new Error(s),{code:s});
const sha=s=>createHash('sha256').update(s).digest('hex');
const exact=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===keys;
const token=(s,max=200)=>typeof s==='string'&&new RegExp(`^[A-Za-z0-9_-]{1,${max}}$`).test(s);
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const stamp=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s.replace(/Z$/,s.includes('.')?'Z':'.000Z')?Date.parse(s):NaN;
function canonical(v){let n=0;const walk=(x,d=0)=>{if(++n>100||d>8)throw fail('journal-bound');if(x===null||typeof x==='boolean'||Number.isSafeInteger(x))return x;if(typeof x==='string'&&x.length<=3000)return x;if(x&&Object.getPrototypeOf(x)===Object.prototype){if(Object.keys(x).some(k=>['__proto__','constructor','prototype'].includes(k)))throw fail('unsafe-key');return Object.fromEntries(Object.keys(x).sort().map(k=>[k,walk(x[k],d+1)]));}throw fail('json-journal-required');};const s=JSON.stringify(walk(v));if(Buffer.byteLength(s)>16384)throw fail('journal-byte-bound');return s;}
const email=s=>typeof s==='string'&&s.length<=254&&/^[A-Za-z0-9._+-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(s);
const reasons=Object.freeze({'source-unavailable':'Source evidence is unavailable.','run-failed':'The publication preparation run failed.','missed-run':'The scheduled preparation run was missed.','credentials-unavailable':'A required service connection is unavailable.','publication-unverified':'Publication could not be independently verified.'});
export function deriveBrevoAlertIdentity({sender,recipient,event}={}){
 if(!email(sender)||!email(recipient)||!exact(event,'editionDate|reason|runSha256')||!/^\d{4}-\d{2}-\d{2}$/.test(event.editionDate)||!Number.isFinite(Date.parse(event.editionDate))||new Date(event.editionDate).toISOString().slice(0,10)!==event.editionDate||!Object.hasOwn(reasons,event.reason)||!hex(event.runSha256))throw fail('fixed-alert-identity-required');
 const captured=structuredClone(event),subject=`LTC publication check: ${event.editionDate}`,body=`${reasons[event.reason]}\nEdition date: ${event.editionDate}.\nNo automatic retry or publication is implied. Owner review may be required.`;
 return {sender,recipient,event:captured,contentSha256:sha(subject+'\n'+body)};
}
function identityFor(kind,given){
 if(kind==='cloudRun'){
  if(!exact(given,'dispatchId|expectedEtag|jobName')||typeof given.jobName!=='string'||!/^projects\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/locations\/[a-z]+(?:-[a-z]+)+[0-9]\/jobs\/[a-z][a-z0-9-]{0,61}[a-z0-9]$/.test(given.jobName)||typeof given.expectedEtag!=='string'||!given.expectedEtag||given.expectedEtag.length>200||/[\x00-\x20\x7f]/.test(given.expectedEtag)||!token(given.dispatchId))throw fail('fixed-job-identity-required');
 }else if(!exact(given,'contentSha256|event|recipient|sender')||canonical(given)!==canonical(deriveBrevoAlertIdentity(given)))throw fail('fixed-alert-identity-required');
 return JSON.parse(canonical(given));
}
function factory(kind,{Firestore,expectedProjectId,expectedDatabaseId,identity:given,claim:inputClaim,clock,mutationEnabled=false}={}){
 const identity=identityFor(kind,given),key=sha(canonical(identity));
 if(typeof Firestore!=='function'||typeof expectedProjectId!=='string'||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(expectedProjectId)||typeof expectedDatabaseId!=='string'||!(expectedDatabaseId==='(default)'||/^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(expectedDatabaseId))||!exact(inputClaim,'fence|owner')||typeof inputClaim.owner!=='string'||!inputClaim.owner||inputClaim.owner.length>200||!Number.isSafeInteger(inputClaim.fence)||inputClaim.fence<1||typeof clock!=='function'||typeof mutationEnabled!=='boolean'||process.env.FIRESTORE_EMULATOR_HOST)throw fail('bound-effect-journal-required');
 const claim={...inputClaim},generation=kind==='cloudRun'?'standalone-cloud-run-journal-v1':'standalone-brevo-alert-journal-v1',knownPhase=kind==='cloudRun'?'operation-known':'accepted';
 const now=()=>{const n=stamp(clock());if(!Number.isFinite(n))throw fail('invalid-clock');return n;};
 function state(s){
  if(!exact(s,'record|version')||!(s.version===0&&s.record===null||s.version===1&&s.record?.phase==='attempting'||s.version===2&&s.record?.phase===knownPhase))throw fail('exact-phase-version-required');if(s.record===null)return;
  const r=s.record,known=s.version===2,keys=kind==='cloudRun'?(known?'approvalReference|identity|key|operationName|phase':'approvalReference|identity|key|phase'):(known?'approvalReference|createdAt|identity|key|messageId|phase':'approvalReference|createdAt|identity|key|phase');
  if(!exact(r,keys)||r.key!==key||canonical(r.identity)!==canonical(identity)||!token(r.approvalReference,kind==='cloudRun'?200:160))throw fail('immutable-effect-identity');
  if(kind==='brevo'&&(!Number.isFinite(stamp(r.createdAt))||stamp(r.createdAt)>now()||known&&(typeof r.messageId!=='string'||r.messageId.length>500||!/^<[^<>\s@]+@[^<>\s@]+>$/.test(r.messageId))))throw fail('alert-record-invalid');
  if(kind==='cloudRun'&&known){const prefix=identity.jobName.split('/jobs/')[0]+'/operations/';if(typeof r.operationName!=='string'||!r.operationName.startsWith(prefix)||!token(r.operationName.slice(prefix.length)))throw fail('operation-scope-mismatch');}
 }
 const row=s=>({schemaVersion:1,generation,initialized:true,key,identityJson:canonical(identity),version:s.version,payloadJson:canonical(s)});
 const decode=snapshot=>{if(snapshot?.exists!==true)throw fail('existing-initialized-effect-required');const e=snapshot.data();if(!exact(e,'generation|identityJson|initialized|key|payloadJson|schemaVersion|version')||e.schemaVersion!==1||e.generation!==generation||e.initialized!==true||e.key!==key||e.identityJson!==canonical(identity)||typeof e.payloadJson!=='string'||Buffer.byteLength(e.payloadJson)>16384)throw fail('effect-envelope-invalid');let s;try{s=JSON.parse(e.payloadJson);}catch{throw fail('effect-json-invalid');}state(s);if(s.version!==e.version||canonical(s)!==e.payloadJson)throw fail('effect-envelope-mismatch');return s;};
 function live(snapshot){if(snapshot?.exists!==true)throw fail('existing-control-required');const e=snapshot.data();if(!exact(e,'generation|payloadJson|revision|schemaVersion')||e.schemaVersion!==1||e.generation!=='standalone-v1'||typeof e.payloadJson!=='string'||Buffer.byteLength(e.payloadJson)>524288)throw fail('control-invalid');let c;try{c=JSON.parse(e.payloadJson);}catch{throw fail('control-invalid');}if(c.schemaVersion!==1||c.generation!=='standalone-v1'||c.initialized!==true||!Number.isSafeInteger(c.revision)||c.revision<1||c.revision!==e.revision||c.emergencyStop!==false||c.fence!==claim.fence||!exact(c.lease,'expiresAt|fence|owner')||c.lease.owner!==claim.owner||c.lease.fence!==claim.fence||!(stamp(c.lease.expiresAt)>now()))throw fail('live-effect-claim-required');}
 const db=new Firestore({projectId:expectedProjectId,databaseId:expectedDatabaseId,ignoreUndefinedProperties:false});if(db.databaseId!==expectedDatabaseId||typeof db.doc!=='function'||typeof db.runTransaction!=='function')throw fail('bound-effect-journal-required');
 const ref=p=>{const r=db.doc(p);if(r?.path!==p||typeof r.get!=='function')throw fail('fixed-document-required');return r;};const journal=ref(`${EFFECT_JOURNAL_PREFIXES[kind]}/${key}`),control=ref(FIRESTORE_STATE_DOCUMENT);let uncertain=false;
 const checkKey=k=>{if(k!==key)throw fail('fixed-effect-key-required');};
 return Object.freeze({
  async read({key:k}={}){checkKey(k);return decode(await journal.get());},
  async cas({key:k,expectedVersion,next}={}){
   if(!mutationEnabled)throw fail('effect-journal-mutations-disabled');if(uncertain)throw fail('effect-journal-readonly-reconcile');checkKey(k);const frozen=JSON.parse(canonical(next));state(frozen);if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||frozen.version!==expectedVersion+1)throw fail('invalid-effect-cas');
   try{const applied=await db.runTransaction(async tx=>{const controller=await tx.get(control),current=decode(await tx.get(journal));live(controller);state(frozen);if(current.version!==expectedVersion)return false;if(current.version!==0&&(frozen.version!==2||current.record.approvalReference!==frozen.record.approvalReference||kind==='brevo'&&current.record.createdAt!==frozen.record.createdAt))throw fail('immutable-effect-transition');tx.update(journal,row(frozen));return true;});if(!applied)return {applied:false};if(canonical(decode(await journal.get()))!==canonical(frozen))throw fail('effect-readback-mismatch');return {applied:true};}catch(e){uncertain=true;throw e;}
  }
 });
}
export const createFirestoreCloudRunJournal=options=>factory('cloudRun',options);
export const createFirestoreBrevoAlertJournal=options=>factory('brevo',options);
