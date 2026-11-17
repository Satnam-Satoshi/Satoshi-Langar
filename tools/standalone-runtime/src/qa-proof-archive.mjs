/** Exact frozen QA bytes → actual private Drive archive. No QA or release authority is inferred. */
import {createHash} from 'node:crypto';
import {createDriveArchive} from './adapters/drive-archive.mjs';
import {createDriveArchiveRuntime} from './adapters/drive-archive-runtime.mjs';
import {createFirestoreUploadJournal} from './firestore-upload-journal.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const stamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value ? Date.parse(value) : NaN;
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);
const exact = (value,keys) => value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
function dataProperties(value) {
 if (!value || Object.getPrototypeOf(value) !== Object.prototype || Reflect.ownKeys(value).length !== Object.keys(value).length || Object.values(Object.getOwnPropertyDescriptors(value)).some(p => !p.enumerable || !('value' in p))) throw Error('plain-archive-boundary-required');
 return value;
}
export function qaProofCanonical(value) {
 let nodes=0;
 function walk(v,depth=0) {
  if (++nodes > 12000 || depth > 16) throw Error('qa-proof-bound');
  if (v === null || typeof v === 'boolean' || Number.isSafeInteger(v)) return v;
  if (typeof v === 'string' && v.length <= 8192) return v;
  if (Array.isArray(v) && v.length <= 200) {
   const descriptors=Object.getOwnPropertyDescriptors(v);
   if (Object.getOwnPropertySymbols(v).length || Object.entries(descriptors).some(([k,p]) => p.get || p.set || k !== 'length' && (!p.enumerable || !/^(0|[1-9][0-9]*)$/.test(k))) || Object.keys(v).length !== v.length) throw Error('plain-qa-proof-required');
   return v.map(x=>walk(x,depth+1));
  }
  dataProperties(v);
  if (Object.keys(v).some(k=>['__proto__','constructor','prototype'].includes(k))) throw Error('plain-qa-proof-required');
  return Object.fromEntries(Object.keys(v).sort().map(k=>[k,walk(v[k],depth+1)]));
 }
 const text=JSON.stringify(walk(value));
 if (Buffer.byteLength(text)>131072) throw Error('qa-proof-byte-bound');
 return text;
}
const held = reason => ({status:'held',reason,publicationVerified:false,promotionAllowed:false,retryAuthorized:false});
const QA_KEYS=['status','phase','candidateDeploymentId','sourceCommit','projectId','expectedBaselineDeploymentId','manifestSha256','planSha256','evidenceSha256','checkedAt','expiresAt','fresh','domainObservations','baselineObservation','providerResponseSha256','publicationVerified','promotionAllowed','mutationPerformed','atomic','reconciliationOnly'];
function proofBoundary(proofJson,binding) {
 if(typeof proofJson!=='string'||Buffer.byteLength(proofJson)>131072||!proofJson)throw Error('frozen-canonical-qa-required');
 const p=JSON.parse(proofJson);
 if(qaProofCanonical(p)!==proofJson||!exact(p,QA_KEYS)||p.status!=='preview-qa-verified'||p.phase!=='preview'||p.reconciliationOnly!==false||p.fresh!==true||p.publicationVerified!==false||p.promotionAllowed!==false||p.mutationPerformed!==false||p.atomic!==false||!id(p.expectedBaselineDeploymentId)||![p.evidenceSha256,p.providerResponseSha256].every(hex)||!Array.isArray(p.domainObservations)||p.domainObservations.length!==1||!p.baselineObservation||!Number.isFinite(stamp(p.checkedAt))||!(stamp(p.expiresAt)>stamp(p.checkedAt)))throw Error('exact-preview-qa-proof-required');
 for(const key of Object.keys(binding))if(p[key]!==binding[key])throw Error('qa-proof-binding-mismatch');
 return p;
}
/** Caller must obtain proofJson from the concrete immutable release phase journal.
 * Hashes and this helper alone do not authenticate the original QA producer. */
export function createQaProofArchive({store,drive,binding:given,proofJson,clock,networkEnabled=false,mutationsEnabled=false}={}) {
 dataProperties(store);dataProperties(drive);
 if(!exact(store,['Firestore','expectedProjectId','expectedDatabaseId','claim'])||!exact(drive,['fetch','resolveSecret','secretReference','folderId','ownerPermissionId','loadApproval'])||[store.Firestore,drive.fetch,drive.resolveSecret,drive.loadApproval,clock].some(f=>typeof f!=='function')||typeof networkEnabled!=='boolean'||typeof mutationsEnabled!=='boolean')throw Error('fixed-qa-archive-boundary-required');
 const binding=JSON.parse(qaProofCanonical(given));
 if(!exact(binding,['phase','projectId','sourceCommit','candidateDeploymentId','planSha256','manifestSha256'])||binding.phase!=='preview'||!id(binding.projectId)||!id(binding.candidateDeploymentId)||typeof binding.sourceCommit!=='string'||!/^[a-f0-9]{40}$/.test(binding.sourceCommit)||![binding.planSha256,binding.manifestSha256].every(hex))throw Error('fixed-qa-proof-binding-required');
 const proof=proofBoundary(proofJson,binding),bytes=Buffer.from(proofJson),digest=sha(bytes),mimeType='application/json';
 const privateStore={...store,claim:JSON.parse(qaProofCanonical(store.claim))},privateDrive={...drive};
 // Validate the fixed Drive boundary without obtaining a token or making a request.
 createDriveArchive({...privateDrive,existingFiles:[],networkEnabled:false,mutationsEnabled:false});
 const identity={folderId:privateDrive.folderId,ownerPermissionId:privateDrive.ownerPermissionId,name:`ltc-archive-${digest}.json`,mimeType,bytes:bytes.length,sha256:digest};
 const key=sha(qaProofCanonical(identity));let busy=false;
 function journal(write) {return createFirestoreUploadJournal({...privateStore,identity,clock,mutationEnabled:write});}
 function known(state) {
  const r=state?.record;
  if(!r||![2,3].includes(state.version)||!['readback-pending','verified'].includes(r.phase)||state.version!==({'readback-pending':2,verified:3}[r.phase])||r.key!==key||qaProofCanonical(r.identity)!==qaProofCanonical(identity)||!id(r.fileId)||!/^[1-9][0-9]{0,19}$/.test(r.fileVersion??''))throw Error('known-qa-upload-required');
  return r;
 }
 async function verify(j,startedAt) {
  const r=known(await j.read({key}));
  const archive=createDriveArchive({...privateDrive,networkEnabled:true,mutationsEnabled:false,existingFiles:[{fileId:r.fileId,version:r.fileVersion,name:identity.name,mimeType,bytes:bytes.length,sha256:digest}]});
  const observed=await archive.readVerifiedArtifact(r.fileId);
  if(observed.status!=='existing-archive-readback-verified'||!(observed.verifiedBytes instanceof Uint8Array)||!Buffer.from(observed.verifiedBytes).equals(bytes)||observed.fileId!==r.fileId||observed.version!==r.fileVersion||observed.folderId!==identity.folderId||observed.sha256!==digest||observed.bytes!==bytes.length||observed.mimeType!==mimeType||observed.ownerOnlyObserved!==true||observed.atomic!==false||observed.worm!==false)throw Error('exact-qa-readback-required');
  const after=known(await j.read({key}));if(qaProofCanonical(after)!==qaProofCanonical(r))throw Error('qa-upload-state-changed');
  const checkedAt=clock(),at=stamp(checkedAt);if(!Number.isFinite(at)||at<startedAt||at<stamp(proof.checkedAt))throw Error('qa-archive-clock');
  return {status:'qa-proof-archived',receipt:{fileId:r.fileId,version:r.fileVersion,sha256:digest,bytes:bytes.length},proofCheckedAt:proof.checkedAt,proofExpiresAt:proof.expiresAt,checkedAt,fresh:at<stamp(proof.expiresAt),ownerOnlyObserved:true,atomic:false,worm:false,retention:'subject-to-account-policy',qaAuthorityAuthenticated:false,publicationVerified:false,promotionAllowed:false,retryAuthorized:false};
 }
 async function run(write) {
  if(!networkEnabled||write&&!mutationsEnabled)return held('qa-archive-disabled');if(busy)return held('qa-archive-busy');busy=true;
  try {
   const at=stamp(clock());if(!Number.isFinite(at)||at<stamp(proof.checkedAt))throw Error('qa-archive-clock');
   const j=journal(write);
   if(write){const runtime=createDriveArchiveRuntime({...privateDrive,journal:j,clock,networkEnabled:true,mutationsEnabled:true});const result=await runtime.advance({bytes:new Uint8Array(bytes),mimeType});if(result.status!=='archive-readback-verified'||result.sha256!==digest||result.bytes!==bytes.length)throw Error('qa-upload-held');}
   return await verify(j,at);
  } catch{return held('qa-proof-archive-or-readback-held');} finally {busy=false;}
 }
 return Object.freeze({advance:()=>run(true),readback:()=>run(false),identity:()=>({...identity}),proofSha256:digest});
}
