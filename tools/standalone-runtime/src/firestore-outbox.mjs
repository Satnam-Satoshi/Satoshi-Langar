import {createHash} from 'node:crypto';
import {FIRESTORE_STATE_DOCUMENT} from './firestore-state.mjs';
export const FIRESTORE_OUTBOX_PREFIX = 'newsroomStandaloneOutboxV1';
const fail = code => Object.assign(new Error(code), {code});
const sha = s => createHash('sha256').update(s).digest('hex');
const hash = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
const fields = 'approvalReference|artifactSha256|createdAt|editionDate|fence|owner|phase|sourceSha256|status|target';
const instant = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === s ? Date.parse(s) : NaN;
const equal = (a,b) => a && b && Object.keys(a).sort().join('|') === Object.keys(b).sort().join('|') && Object.keys(a).every(k=>a[k]===b[k]);
function request(input) {
 const {key,fence,owner,intent} = input ?? {};
 if (!hash(key) || !intent || Object.getPrototypeOf(intent)!==Object.prototype || Object.keys(intent).sort().join('|')!==fields || intent.status!=='intent' || !hash(intent.sourceSha256) || !hash(intent.artifactSha256) || !['prepare','stage','publish'].includes(intent.phase) || !Number.isSafeInteger(fence) || fence<1 || intent.fence!==fence || intent.owner!==owner || !Number.isFinite(instant(intent.createdAt))) throw fail('invalid-intent');
 for(const k of ['owner','target','approvalReference']) if(typeof intent[k]!=='string'||!intent[k]||intent[k].length>(k==='approvalReference'?500:200)||/[\x00-\x1f]/.test(intent[k])) throw fail('invalid-intent');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(intent.editionDate)||!Number.isFinite(Date.parse(intent.editionDate))||new Date(intent.editionDate).toISOString().slice(0,10)!==intent.editionDate || key!==sha(JSON.stringify([intent.editionDate,intent.target,intent.phase]))) throw fail('invalid-intent-key');
 const intentJson=JSON.stringify(intent); // Preserve runner's exact insertion-order digest.
 return {key,fence,owner,intent:JSON.parse(intentJson),intentJson,intentSha256:sha(intentJson)};
}
function rowFor(r) { return {schemaVersion:1,generation:'standalone-outbox-v1',key:r.key,fence:r.fence,owner:r.owner,intentJson:r.intentJson,intentSha256:r.intentSha256}; }
function receipt(snapshot,r) {
 if(snapshot?.exists!==true) return {persisted:false,key:r.key,reconciliationRequired:true};
 if(!equal(snapshot.data(),rowFor(r))) throw fail('immutable-outbox-conflict');
 return {persisted:true,key:r.key,fence:r.fence,intentSha256:r.intentSha256,reconciliationOnly:true,externalEffectAuthorized:false};
}
function claim(snapshot,r,now) {
 if(snapshot?.exists!==true) throw fail('existing-control-required');
 const envelope=snapshot.data();
 if(!envelope || Object.keys(envelope).sort().join('|')!=='generation|payloadJson|revision|schemaVersion' || envelope.schemaVersion!==1 || envelope.generation!=='standalone-v1' || typeof envelope.payloadJson!=='string' || Buffer.byteLength(envelope.payloadJson)>512*1024) throw fail('invalid-control');
 let c;try{c=JSON.parse(envelope.payloadJson);}catch{throw fail('invalid-control');}
 if(c.schemaVersion!==1||c.generation!=='standalone-v1'||c.initialized!==true||!Number.isSafeInteger(c.revision)||c.revision<1||c.revision!==envelope.revision||c.emergencyStop!==false||c.fence!==r.fence||c.lease?.fence!==r.fence||c.lease?.owner!==r.owner||!Number.isFinite(now)||!(instant(c.lease.expiresAt)>now)||instant(r.intent.createdAt)>now||!equal(c.jobs?.[r.key],r.intent)) throw fail('live-claim-required');
}
/** Official SDK is injected; constructor performs no bootstrap. Clock must be pure.
 * No provider effects are performed, including in transaction retries. */
export function createFirestoreOutbox({Firestore,expectedProjectId,expectedDatabaseId,expectedDocumentPrefix=FIRESTORE_OUTBOX_PREFIX,mutationEnabled=false,clock}={}) {
 if(typeof Firestore!=='function'||typeof expectedProjectId!=='string'||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(expectedProjectId)||typeof expectedDatabaseId!=='string'||!(expectedDatabaseId==='(default)'||/^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(expectedDatabaseId))||expectedDocumentPrefix!==FIRESTORE_OUTBOX_PREFIX||typeof clock!=='function'||process.env.FIRESTORE_EMULATOR_HOST) throw fail('bound-firestore-required');
 const db=new Firestore({projectId:expectedProjectId,databaseId:expectedDatabaseId,ignoreUndefinedProperties:false});
 if(db.databaseId!==expectedDatabaseId||typeof db.doc!=='function'||typeof db.runTransaction!=='function') throw fail('bound-firestore-required');
 const ref=path=>{const r=db.doc(path);if(r?.path!==path||typeof r.get!=='function')throw fail('exact-document-required');return r;};
 const control=ref(FIRESTORE_STATE_DOCUMENT);let uncertain=false;
 return Object.freeze({
  async reconcile(input){const r=request(input);return receipt(await ref(`${FIRESTORE_OUTBOX_PREFIX}/${r.key}`).get(),r);},
  async persist(input){
   if(mutationEnabled!==true)throw fail('outbox-mutations-disabled');
   if(uncertain)throw fail('outbox-reconciliation-required');
   const r=request(input),out=ref(`${FIRESTORE_OUTBOX_PREFIX}/${r.key}`);
   try {
    await db.runTransaction(async tx=>{
     // All reads before the sole conditional create; never update control or existing row.
     const c=await tx.get(control),existing=await tx.get(out);
     claim(c,r,instant(clock()));
     if(existing.exists===true){receipt(existing,r);return;}
     if(existing.exists!==false)throw fail('invalid-outbox-snapshot');
     tx.create(out,rowFor(r));
    });
    const result=receipt(await out.get(),r);
    if(!result.persisted)throw fail('outbox-readback-required');
    return result;
   }catch(e){uncertain=true;throw e;} // Even timeout-after-commit: never blind retry.
  }
 });
}
