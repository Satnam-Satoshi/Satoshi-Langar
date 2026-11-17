import {createHash} from 'node:crypto';
import {FIRESTORE_STATE_DOCUMENT} from './firestore-state.mjs';
export const SCHEDULE_STORE_PATHS=Object.freeze({root:'newsroomPrivateScheduleV1/inventory',history:'newsroomPrivateCanonicalEditionsV1',outbox:'newsroomPrivateScheduleEffectsV1'});
const fail=code=>Object.assign(new Error(code),{code});
const hash=s=>createHash('sha256').update(s).digest('hex');
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===keys;
const time=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,19)===s.slice(0,19)?Date.parse(s):NaN;
const date=s=>typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
function canonical(value){let count=0;const walk=(v,d=0)=>{if(++count>30000||d>12)throw fail('store-bound');if(v===null||typeof v==='boolean'||Number.isSafeInteger(v))return v;if(typeof v==='string'&&v.length<=2000)return v;if(Array.isArray(v)&&v.length<=1000)return v.map(x=>walk(x,d+1));if(v&&Object.getPrototypeOf(v)===Object.prototype){if(Object.keys(v).some(k=>['__proto__','constructor','prototype'].includes(k)))throw fail('unsafe-store-key');return Object.fromEntries(Object.keys(v).sort().map(k=>[k,walk(v[k],d+1)]));}throw fail('json-store-required');};const s=JSON.stringify(walk(value));if(Buffer.byteLength(s)>512*1024)throw fail('store-byte-bound');return s;}
function rootState(snapshot){
 if(snapshot?.exists!==true)throw fail('existing-inventory-required');const r=snapshot.data();
 if(!exact(r,'claims|editions|generation|initialized|revision|schemaVersion')||r.schemaVersion!==1||r.generation!=='standalone-schedule-store-v1'||r.initialized!==true||!Number.isSafeInteger(r.revision)||r.revision<1||r.revision>=Number.MAX_SAFE_INTEGER||!r.claims||Object.getPrototypeOf(r.claims)!==Object.prototype||!r.editions||Object.getPrototypeOf(r.editions)!==Object.prototype||Object.keys(r.claims).length>1000||Object.keys(r.editions).length>1000)throw fail('invalid-inventory');
 for(const [key,binding]of Object.entries(r.claims))if(!hex(key)||!hex(binding))throw fail('invalid-claim');
 for(const [day,entry]of Object.entries(r.editions))if(!date(day)||!exact(entry,'editionId|sha256')||!new RegExp(`^${day}-r[1-9][0-9]*$`).test(entry.editionId)||!hex(entry.sha256))throw fail('invalid-canonical-index');
 canonical(r);return structuredClone(r);
}
function recordState(s,now){
 if(!exact(s,'record|version')||!(s.version===0&&s.record===null||s.version===1&&s.record?.status==='intent'||s.version===2&&s.record?.status==='acknowledged'))throw fail('invalid-effect-phase');
 if(s.record===null)return;
 const r=s.record,ack=r.status==='acknowledged';
 if(!exact(r,ack?'acknowledgedAt|createdAt|destinationSha256|eventSha256|key|kind|payloadSha256|receiptSha256|status':'createdAt|destinationSha256|eventSha256|key|kind|payloadSha256|status')||!['dispatch','alert'].includes(r.kind)||!['key','eventSha256','payloadSha256','destinationSha256'].every(k=>hex(r[k]))||!Number.isFinite(time(r.createdAt))||time(r.createdAt)>now||ack&&(!hex(r.receiptSha256)||!(time(r.acknowledgedAt)>=time(r.createdAt))||time(r.acknowledgedAt)>now))throw fail('invalid-effect-record');
}
const binding=r=>hash(canonical({key:r.key,kind:r.kind,eventSha256:r.eventSha256,payloadSha256:r.payloadSha256,destinationSha256:r.destinationSha256}));
function decodeEffect(snapshot,key,root,now){
 const known=Object.hasOwn(root.claims,key);
 if(!known){if(snapshot?.exists!==false)throw fail('unindexed-effect');return {version:0,record:null};}
 if(snapshot?.exists!==true)throw fail('lost-known-effect');const e=snapshot.data();
 if(!exact(e,'generation|key|payloadJson|schemaVersion|version')||e.schemaVersion!==1||e.generation!=='standalone-schedule-effect-v1'||e.key!==key||typeof e.payloadJson!=='string'||Buffer.byteLength(e.payloadJson)>16384)throw fail('invalid-effect-envelope');
 let s;try{s=JSON.parse(e.payloadJson);}catch{throw fail('invalid-effect-json');}recordState(s,now);
 if(s.record===null||s.version!==e.version||s.record.key!==key||canonical(s)!==e.payloadJson||binding(s.record)!==root.claims[key])throw fail('effect-binding-mismatch');return s;
}
function control(snapshot,claim,now){
 if(snapshot?.exists!==true)throw fail('existing-control-required');const e=snapshot.data();if(!exact(e,'generation|payloadJson|revision|schemaVersion')||e.schemaVersion!==1||e.generation!=='standalone-v1'||typeof e.payloadJson!=='string'||Buffer.byteLength(e.payloadJson)>524288)throw fail('invalid-control');let s;try{s=JSON.parse(e.payloadJson);}catch{throw fail('invalid-control');}
 if(s.schemaVersion!==1||s.generation!=='standalone-v1'||s.initialized!==true||s.revision!==e.revision||!Number.isSafeInteger(s.revision)||s.revision<1||s.emergencyStop!==false||s.fence!==claim.fence||!exact(s.lease,'expiresAt|fence|owner')||s.lease.fence!==claim.fence||s.lease.owner!==claim.owner||!(time(s.lease.expiresAt)>now))throw fail('live-controller-claim-required');
}
function historyValue(snapshot,day,entry,now){
 if(!entry){if(snapshot?.exists!==false)throw fail('unindexed-canonical-history');return {editionId:`${day}-r1`,exists:false,run:null};}
 if(snapshot?.exists!==true)throw fail('lost-canonical-history');const e=snapshot.data();if(!exact(e,'generation|payloadJson|schemaVersion')||e.schemaVersion!==1||e.generation!=='standalone-canonical-edition-v1'||typeof e.payloadJson!=='string'||Buffer.byteLength(e.payloadJson)>65536||hash(e.payloadJson)!==entry.sha256)throw fail('canonical-history-digest-mismatch');let h;try{h=JSON.parse(e.payloadJson);}catch{throw fail('invalid-canonical-history');}
 if(!exact(h,'editionDate|editionId|run|sourceHealth')||h.editionDate!==day||h.editionId!==entry.editionId||canonical(h)!==e.payloadJson)throw fail('canonical-history-binding');
 if(h.sourceHealth!==null&&(!exact(h.sourceHealth,'expiresAt|gapCount')||!Number.isFinite(time(h.sourceHealth.expiresAt))||!Number.isSafeInteger(h.sourceHealth.gapCount)||h.sourceHealth.gapCount<0||h.sourceHealth.gapCount>1000))throw fail('invalid-source-health');
 if(h.run!==null){const r=h.run,allowed=['id','scheduledAt','startedAt','heartbeatAt','status','attempt','publication'];if(!r||Object.getPrototypeOf(r)!==Object.prototype||Object.keys(r).some(k=>!allowed.includes(k))||r.id!==`daily-${h.editionId}`||!['running','held','failed','published-verified'].includes(r.status)||!Number.isSafeInteger(r.attempt)||r.attempt<1||!Number.isFinite(time(r.scheduledAt))||!Number.isFinite(time(r.startedAt))||time(r.startedAt)<time(r.scheduledAt)||time(r.startedAt)>now||r.heartbeatAt!==undefined&&(!Number.isFinite(time(r.heartbeatAt))||time(r.heartbeatAt)>now||time(r.heartbeatAt)<time(r.startedAt)))throw fail('invalid-run-history');if(r.publication!==undefined){const p=r.publication;if(!exact(p,'artifactSha256|bothDomainsVerified|checkedAt|domains|receiptSha256')||!hex(p.artifactSha256)||!hex(p.receiptSha256)||p.bothDomainsVerified!==true||!Array.isArray(p.domains)||canonical([...p.domains].sort())!==canonical(['ltcmagazine.org','satnamsatoshi.com'])||!(time(p.checkedAt)>=time(r.startedAt))||time(p.checkedAt)>now)throw fail('invalid-publication-history');}}
 return {editionId:h.editionId,exists:true,run:h.run,...h.sourceHealth===null?{}:{sourceHealth:h.sourceHealth}};
}
export function createFirestoreScheduleStore({Firestore,expectedProjectId,expectedDatabaseId,claim:givenClaim,clock,mutationEnabled=false}={}){
 if(typeof Firestore!=='function'||typeof expectedProjectId!=='string'||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(expectedProjectId)||typeof expectedDatabaseId!=='string'||!(expectedDatabaseId==='(default)'||/^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(expectedDatabaseId))||typeof clock!=='function'||typeof mutationEnabled!=='boolean'||!exact(givenClaim,'fence|owner')||typeof givenClaim.owner!=='string'||!givenClaim.owner||givenClaim.owner.length>200||!Number.isSafeInteger(givenClaim.fence)||givenClaim.fence<1||process.env.FIRESTORE_EMULATOR_HOST)throw fail('bound-schedule-store-required');
 const claim={...givenClaim},db=new Firestore({projectId:expectedProjectId,databaseId:expectedDatabaseId,ignoreUndefinedProperties:false});if(db.databaseId!==expectedDatabaseId||typeof db.doc!=='function'||typeof db.runTransaction!=='function')throw fail('bound-schedule-store-required');
 const ref=p=>{const r=db.doc(p);if(r?.path!==p||typeof r.get!=='function')throw fail('exact-document-required');return r;};
 const rootRef=ref(SCHEDULE_STORE_PATHS.root),controlRef=ref(FIRESTORE_STATE_DOCUMENT);const uncertain=new Set();
 const now=()=>{const t=time(clock());if(!Number.isFinite(t))throw fail('invalid-clock');return t;};
 const keyRef=key=>{if(!hex(key))throw fail('exact-effect-key-required');return ref(`${SCHEDULE_STORE_PATHS.outbox}/${key}`);};
 const read=async({key}={})=>{const r=keyRef(key);return db.runTransaction(async tx=>{const root=rootState(await tx.get(rootRef)),snapshot=await tx.get(r);return decodeEffect(snapshot,key,root,now());});};
 return Object.freeze({
  history:Object.freeze({async readEdition({editionDate}={}){if(!date(editionDate))throw fail('exact-edition-date-required');const r=ref(`${SCHEDULE_STORE_PATHS.history}/${editionDate}`);return db.runTransaction(async tx=>{const root=rootState(await tx.get(rootRef)),snap=await tx.get(r),at=now();const value=historyValue(snap,editionDate,root.editions[editionDate],at);return {...value,authenticated:true,observedAt:new Date(at).toISOString(),observationSha256:hash(canonical({inventoryRevision:root.revision,editionDate,entry:root.editions[editionDate]??null,value})),authenticationSource:'injected-firestore-sdk-read'};});}}),
  outbox:Object.freeze({read,async cas({key,expectedVersion,next}={}){
   if(!mutationEnabled)throw fail('schedule-store-mutations-disabled');if(uncertain.has(key))throw fail('schedule-store-reconcile-only');const r=keyRef(key),frozen=JSON.parse(canonical(next));recordState(frozen,now());if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||frozen.version!==expectedVersion+1||frozen.record?.key!==key)throw fail('invalid-effect-cas');
   try{const applied=await db.runTransaction(async tx=>{const root=rootState(await tx.get(rootRef)),snapshot=await tx.get(r),controller=await tx.get(controlRef),at=now();control(controller,claim,at);const current=decodeEffect(snapshot,key,root,at);recordState(frozen,at);if(current.version!==expectedVersion)return false;
    if(current.record===null){if(frozen.version!==1||Object.keys(root.claims).length>=1000)throw fail('inventory-capacity-or-invalid-claim');const newRoot={...root,revision:root.revision+1,claims:{...root.claims,[key]:binding(frozen.record)}};canonical(newRoot);tx.update(rootRef,newRoot);}
    else if(frozen.version!==2||binding(current.record)!==binding(frozen.record)||current.record.createdAt!==frozen.record.createdAt)throw fail('immutable-effect-transition');
    const row={schemaVersion:1,generation:'standalone-schedule-effect-v1',key,version:frozen.version,payloadJson:canonical(frozen)};
    if(current.record===null)tx.create(r,row);else tx.update(r,row);return true;
   });if(!applied)return {applied:false};if(canonical(await read({key}))!==canonical(frozen))throw fail('effect-readback-mismatch');return {applied:true};}catch(e){uncertain.add(key);throw e;}
  }})
 });
}
