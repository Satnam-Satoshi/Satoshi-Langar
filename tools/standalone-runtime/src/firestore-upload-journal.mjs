/** Dormant private upload journal. No SDK construction on import or bootstrap. */
import {createHash} from 'node:crypto';
import {FIRESTORE_STATE_DOCUMENT} from './firestore-state.mjs';
export const FIRESTORE_UPLOAD_INVENTORY='newsroomPrivateUploadInventoryV1/root';
export const FIRESTORE_UPLOAD_JOURNAL_PREFIX='newsroomPrivateUploadJournalV1';
const fail=code=>Object.assign(new Error(code),{code});
const digest=s=>createHash('sha256').update(s).digest('hex');
const id=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(s);
const exact=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===keys;
function canonical(v){let count=0;function walk(x,d=0){if(++count>100||d>8)throw fail('journal-bound');if(x===null||typeof x==='boolean'||Number.isSafeInteger(x))return x;if(typeof x==='string'&&x.length<=2000)return x;if(x&&Object.getPrototypeOf(x)===Object.prototype)return Object.fromEntries(Object.keys(x).sort().map(k=>[k,walk(x[k],d+1)]));throw fail('invalid-journal-json');}const s=JSON.stringify(walk(v));if(Buffer.byteLength(s)>16384)throw fail('journal-byte-bound');return s;}
const time=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s?Date.parse(s):NaN;
function validateIdentity(i){const ext={'application/pdf':'pdf','application/json':'json','text/html':'html','image/png':'png','image/jpeg':'jpg'};if(!exact(i,'bytes|folderId|mimeType|name|ownerPermissionId|sha256')||!id(i.folderId)||!id(i.ownerPermissionId)||!Number.isSafeInteger(i.bytes)||i.bytes<1||i.bytes>5_000_000||!/^[a-f0-9]{64}$/.test(i.sha256??'')||!Object.hasOwn(ext,i.mimeType)||i.name!==`ltc-archive-${i.sha256}.${ext[i.mimeType]}`)throw fail('exact-upload-identity-required');return JSON.parse(canonical(i));}
function validState(s,key,identity){
 if(!exact(s,'record|version')||!Number.isSafeInteger(s.version)||s.version<0||s.version>=Number.MAX_SAFE_INTEGER-3)throw fail('invalid-upload-state');
 if(s.record===null){if(s.version!==0)throw fail('null-state-reset');return;}
 const r=s.record,withFile=r.phase==='readback-pending'||r.phase==='verified';
 if(!exact(r,withFile?'approvalReference|fileId|fileVersion|identity|key|phase':'approvalReference|identity|key|phase')||!['attempting','readback-pending','verified'].includes(r.phase)||s.version!==({attempting:1,'readback-pending':2,verified:3}[r.phase])||r.key!==key||canonical(r.identity)!==canonical(identity)||!id(r.approvalReference)||withFile&&(!id(r.fileId)||!/^[1-9][0-9]{0,19}$/.test(r.fileVersion??'')))throw fail('invalid-upload-record');
}
function envelope(key,identity,state){return {schemaVersion:1,generation:'standalone-upload-journal-v1',initialized:true,key,identityJson:canonical(identity),version:state.version,payloadJson:canonical(state)};}
function decode(snap,key,identity){
 if(snap?.exists!==true)throw fail('existing-upload-journal-required');
 const r=snap.data();if(!exact(r,'generation|identityJson|initialized|key|payloadJson|schemaVersion|version')||r.schemaVersion!==1||r.generation!=='standalone-upload-journal-v1'||r.initialized!==true||r.key!==key||r.identityJson!==canonical(identity)||typeof r.payloadJson!=='string'||Buffer.byteLength(r.payloadJson)>16384)throw fail('invalid-upload-envelope');
 let s;try{s=JSON.parse(r.payloadJson);}catch{throw fail('invalid-upload-json');}validState(s,key,identity);if(canonical(s)!==r.payloadJson||s.version!==r.version)throw fail('upload-envelope-mismatch');return s;
}
function controlClaim(snap,claim,now){
 if(snap?.exists!==true)throw fail('existing-control-required');const r=snap.data();
 if(!exact(r,'generation|payloadJson|revision|schemaVersion')||r.schemaVersion!==1||r.generation!=='standalone-v1'||typeof r.payloadJson!=='string'||Buffer.byteLength(r.payloadJson)>524288)throw fail('invalid-control');
 let s;try{s=JSON.parse(r.payloadJson);}catch{throw fail('invalid-control');}
 if(s.schemaVersion!==1||s.generation!=='standalone-v1'||s.initialized!==true||!Number.isSafeInteger(s.revision)||s.revision<1||s.revision!==r.revision||s.emergencyStop!==false||s.fence!==claim.fence||!exact(s.lease,'expiresAt|fence|owner')||s.lease.owner!==claim.owner||s.lease.fence!==claim.fence||!Number.isFinite(now)||!(time(s.lease.expiresAt)>now))throw fail('live-upload-claim-required');
}
function inventory(snapshot){
 if(snapshot?.exists!==true)throw fail('existing-upload-inventory-required');const r=snapshot.data();
 if(!exact(r,'claims|generation|initialized|revision|schemaVersion')||r.schemaVersion!==1||r.generation!=='standalone-upload-inventory-v1'||r.initialized!==true||!Number.isSafeInteger(r.revision)||r.revision<1||!r.claims||Object.getPrototypeOf(r.claims)!==Object.prototype||Object.keys(r.claims).length>1000||Object.entries(r.claims).some(([k,v])=>!/^[a-f0-9]{64}$/.test(k)||v!==k)||Buffer.byteLength(JSON.stringify(r))>256*1024)throw fail('invalid-upload-inventory');return structuredClone(r);
}
export function createFirestoreUploadJournal({Firestore,expectedProjectId,expectedDatabaseId,expectedDocumentPrefix=FIRESTORE_UPLOAD_JOURNAL_PREFIX,identity:given,claim:givenClaim,clock,mutationEnabled=false}={}){
 const identity=validateIdentity(given),key=digest(canonical(identity));
 if(typeof Firestore!=='function'||typeof expectedProjectId!=='string'||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(expectedProjectId)||typeof expectedDatabaseId!=='string'||!(expectedDatabaseId==='(default)'||/^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(expectedDatabaseId))||expectedDocumentPrefix!==FIRESTORE_UPLOAD_JOURNAL_PREFIX||typeof clock!=='function'||!exact(givenClaim,'fence|owner')||typeof givenClaim.owner!=='string'||!givenClaim.owner||givenClaim.owner.length>200||!Number.isSafeInteger(givenClaim.fence)||givenClaim.fence<1||typeof mutationEnabled!=='boolean'||process.env.FIRESTORE_EMULATOR_HOST)throw fail('bound-upload-journal-required');
 const claim={...givenClaim};const db=new Firestore({projectId:expectedProjectId,databaseId:expectedDatabaseId,ignoreUndefinedProperties:false});
 if(db.databaseId!==expectedDatabaseId||typeof db.doc!=='function'||typeof db.runTransaction!=='function')throw fail('bound-upload-journal-required');
 const ref=path=>{const r=db.doc(path);if(r?.path!==path||typeof r.get!=='function')throw fail('exact-document-required');return r;};
 const journal=ref(`${FIRESTORE_UPLOAD_JOURNAL_PREFIX}/${key}`),control=ref(FIRESTORE_STATE_DOCUMENT),inventoryRef=ref(FIRESTORE_UPLOAD_INVENTORY);let uncertain=false;
 const bound=k=>{if(k!==key)throw fail('upload-key-mismatch');};
 function indexed(root,snapshot){if(!Object.hasOwn(root.claims,key)){if(snapshot?.exists!==false)throw fail('orphan-upload-row');return {version:0,record:null};}if(snapshot?.exists!==true)throw fail('lost-known-upload-row');const s=decode(snapshot,key,identity);if(s.record===null||s.version===0)throw fail('known-upload-reset');return s;}
 const read=async({key:k}={})=>{bound(k);return db.runTransaction(async tx=>{const root=inventory(await tx.get(inventoryRef)),snapshot=await tx.get(journal);return indexed(root,snapshot);});};
 return Object.freeze({
  read,
  async cas({key:k,expectedVersion,next}={}){
   if(mutationEnabled!==true)throw fail('upload-journal-mutations-disabled');if(uncertain)throw fail('upload-journal-reconcile-only');bound(k);
   const frozen=JSON.parse(canonical(next));validState(frozen,key,identity);
   if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||frozen.version!==expectedVersion+1)throw fail('invalid-upload-cas');
   try{
    const applied=await db.runTransaction(async tx=>{
     const root=inventory(await tx.get(inventoryRef)),c=await tx.get(control),snapshot=await tx.get(journal),current=indexed(root,snapshot);controlClaim(c,claim,time(clock()));
     if(current.version!==expectedVersion)return false;
     const before=current.record,after=frozen.record;
     const phase=before===null?'attempting':before.phase==='attempting'?'readback-pending':before.phase==='readback-pending'?'verified':null;
     if(!after||after.phase!==phase||before&&after.approvalReference!==before.approvalReference||before?.fileId&&(after.fileId!==before.fileId||after.fileVersion!==before.fileVersion))throw fail('nonmonotonic-upload-transition');
     if(!Object.hasOwn(root.claims,key)){if(Object.keys(root.claims).length>=1000||root.revision>=Number.MAX_SAFE_INTEGER)throw fail('upload-inventory-exhausted');tx.update(inventoryRef,{...root,revision:root.revision+1,claims:{...root.claims,[key]:key}});tx.create(journal,envelope(key,identity,frozen));}else tx.update(journal,envelope(key,identity,frozen));return true;
    });
    if(!applied)return {applied:false};
    if(canonical(await read({key}))!==canonical(frozen))throw fail('upload-journal-readback-mismatch');
    return {applied:true};
   }catch(e){uncertain=true;throw e;}
  }
 });
}
