import {createHash} from 'node:crypto';
import {inspectionHash,validateF33ReadSnapshot} from './cloud-ltc-f33-readonly.mjs';
import {downloadEvidence,safeEvidenceDiagnostic} from './cloud-ltc-evidence.mjs';
import {createScopedGoogleAuthorization} from './cloud-ltc-google-auth.mjs';
import {createReadOnlyReleaseClients} from './cloud-ltc-reconcile.mjs';
import {TARGET,verifyPublicManifestRecord,verifyPublicRootRouting} from './cloud-ltc-release.mjs';
import {assertVercelDeploymentIdentity} from './cloud-ltc-release-providers.mjs';
const bytesHash=v=>createHash('sha256').update(v).digest('hex');
const check=(v,c)=>{if(!v)throw Error('f33_full_'+c);};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
async function pool(count,limit,run){let next=0,failed=false;await Promise.all(Array.from({length:Math.min(count,limit)},async()=>{while(!failed){const index=next++;if(index>=count)return;try{await run(index);}catch(error){failed=true;throw error;}}}));}
// expectedCurrentSource is the current main WORKFLOW commit, not the pinned
// inspection checkout or previous release source.
// Library only, no CLI or writes. Native authority and private manifest provenance
// are caller responsibilities; returned evidence never authorizes CAS/retry.
export async function reconcileF33FullReadOnly({config,baselineManifest,loadBaselineManifest,expectedCurrentSource,readState,readEvidence,github,vercel,verifyPublic,assertInspection,clock=Date.now}){
 const c=freeze(structuredClone(config));
 for(const fn of[readState,readEvidence,github,vercel,verifyPublic,assertInspection,clock])check(typeof fn==='function','adapter');
 const started=clock();check(Number.isFinite(started)&&/^[a-f0-9]{40}$/.test(expectedCurrentSource),'input');
 const guard=()=>{const t=clock();check(Number.isFinite(t)&&t>=started&&t-started<=300000,'expired');check(assertInspection()===true,'authority');return new Date(t).toISOString();};guard();
 const before=freeze(structuredClone(await readState()));validateF33ReadSnapshot(before,c,clock());
 const manifest=freeze(structuredClone(loadBaselineManifest?await loadBaselineManifest(before.value):baselineManifest));guard();
 const latest=before.value.latestRelease;check(latest&&/^[a-f0-9]{40}$/.test(latest.source??'')&&/^dpl_[A-Za-z0-9]+$/.test(latest.deployment??'')&&Array.isArray(manifest)&&manifest.length>0&&manifest.length<=10000&&inspectionHash(manifest)===latest.artifactManifestSha256,'baseline_manifest');
 const rows=Object.values(before.value.intents).filter(r=>r.fence===33).sort((a,b)=>a.payload.artifactBundleIndex-b.payload.artifactBundleIndex),confirmedReadbacks=[];
 await pool(34,4,async index=>{const row=rows[index];guard();const got=await readEvidence(row);check(got?.proof&&inspectionHash(got.proof)===inspectionHash(row.proof.proof),'confirmed_changed');confirmedReadbacks[index]={operationId:row.operationId,payloadSha256:row.payloadSha256,...structuredClone(got.proof),observedAt:guard()};});
 let diagnostic=null;let uncertain={observed:'unknown',operationId:rows[34].operationId,proof:null};guard();try{const got=await readEvidence(rows[34],value=>{diagnostic=safeEvidenceDiagnostic(value);});if(got?.proof){const p=rows[34].payload,q=got.proof;check(q.fileId===p.fileId&&q.folderId===c.folderId&&q.sha256===p.sha256&&q.length===p.bytes&&q.ownerPermissionId===c.ownerPermissionId&&q.ownerOnly===true&&q.downloadVerified===true,'uncertain_proof');uncertain={observed:'applied',operationId:rows[34].operationId,proof:structuredClone(q)};}}catch{/* Any unavailable/missing observation remains UNKNOWN, not absence. */}uncertain.diagnostic=diagnostic;guard();
 const ref=await github('/git/ref/heads/main');check(ref.object?.sha===expectedCurrentSource,'source_changed');
 const commit=await github(`/git/commits/${latest.source}`);check(commit.sha===latest.source&&/^[a-f0-9]{40}$/.test(commit.tree?.sha??''),'baseline_source');
 async function pointers(){const out=[];for(const domain of TARGET.domains){guard();const d=await vercel(`/v13/deployments/${new URL(domain).hostname}`);assertVercelDeploymentIdentity(d,TARGET);check(d.id===latest.deployment,'alias_changed');out.push({domain,deployment:d.id});}return out;}
 await pointers();const domains=[];for(const domain of TARGET.domains){guard();await verifyPublic(domain,manifest,guard);domains.push({domain,deployment:latest.deployment,allManifestBytesVerified:true,verifiedCount:manifest.length});guard();}
 await pointers();const finalRef=await github('/git/ref/heads/main');check(finalRef.object?.sha===expectedCurrentSource,'source_changed');
 const after=await readState();check(after.version===before.version&&inspectionHash(after.value)===inspectionHash(before.value),'ledger_changed');
 return {status:'full-read-only-evidence-complete',snapshotVersion:before.version,snapshotSha256:inspectionHash(before.value),confirmedReadbacks,uncertain,publicBaseline:{domains,artifactManifestSha256:latest.artifactManifestSha256,manifestCount:manifest.length,observedAt:guard()},currentSource:expectedCurrentSource,baselineSource:latest.source,casAuthorized:false,writerBarrierVerified:false,publicationPerformed:false,stateChanged:false,retryAuthorized:false};
}
// Actual supported read-only providers. Private state/native authority remain in
// the existing inspection coordinator. No mutation methods are returned.
export function createFullReadOnlyProviders({config,env,fetchImpl=fetch}){
 const c=freeze(structuredClone(config));
 const guarded=(url,options={})=>{const u=new URL(url),method=options.method??'GET';check(!u.username&&!u.password&&((method==='POST'&&u.href==='https://oauth2.googleapis.com/token')||(method==='GET'&&((u.origin==='https://www.googleapis.com'&&/^\/drive\/v3\/files\/[A-Za-z0-9_-]+(?:\/permissions)?$/.test(u.pathname))||(u.origin==='https://api.github.com'&&u.pathname.startsWith('/repos/Satnam-Satoshi/Satoshi-Langar/git/'))||(u.origin==='https://api.vercel.com'&&u.pathname.startsWith('/v13/deployments/'))||TARGET.domains.includes(u.origin)))),'write_forbidden');return fetchImpl(url,options);};
 const authorization=createScopedGoogleAuthorization({env,fetchImpl:guarded});const clients=createReadOnlyReleaseClients({env,fetcher:guarded});
 return Object.freeze({...clients,async loadBaselineManifest(snapshot){
 const latest=snapshot.latestRelease,s=latest?.summary;check(s&&s.folderId===c.folderId&&s.operationId==='summary-'+s.sha256&&s.payloadSha256===inspectionHash({kind:'drive-evidence',role:'release-summary',archivedStateSha256:s.archivedStateSha256,fileId:s.fileId,folderId:s.folderId,sha256:s.sha256,bytes:s.length}),'summary');
 const got=await downloadEvidence(s,{config:{folderId:c.folderId,ownerPermissionId:c.ownerPermissionId,fileId:s.fileId},getAccessToken:()=>authorization(a=>a.LTC_GOOGLE_ACCESS_TOKEN),fetcher:guarded});check(got?.bundle,'summary_unknown');
 const files=JSON.parse(got.bundle.bytes.toString('utf8')).files;
 const raw=name=>{const hits=files.filter(f=>f.path===name);check(hits.length===1,'summary_file');return Buffer.from(hits[0].contentBase64,'base64');};const extract=name=>JSON.parse(raw(name).toString('utf8'));
 const manifest=extract('artifact-manifest.json'),release=extract('release-receipt.json'),backup=extract('ledger-backup.json');
 check(bytesHash(raw('artifact-manifest.json'))===latest.artifactManifestSha256&&inspectionHash(manifest)===latest.artifactManifestSha256&&release.source===latest.source&&release.deployment===latest.deployment&&release.editionId===latest.editionId&&release.artifactPackageManifestSha256===latest.artifactPackageManifestSha256&&backup.schemaVersion===1&&backup.key==='website'&&typeof backup.bytes==='string'&&bytesHash(backup.bytes)===backup.sha256&&backup.sha256===s.archivedStateSha256,'summary_binding');return manifest;
 },readEvidence:(row,onDiagnostic)=>downloadEvidence({...row.payload,length:row.payload.bytes,operationId:row.operationId,payloadSha256:row.payloadSha256},{config:{folderId:c.folderId,ownerPermissionId:c.ownerPermissionId,fileId:row.payload.fileId},getAccessToken:()=>authorization(a=>a.LTC_GOOGLE_ACCESS_TOKEN),fetcher:guarded,onDiagnostic}),async verifyPublic(domain,manifest,guard){guard();await verifyPublicRootRouting(domain,manifest,{fetchImpl:guarded});await pool(manifest.length,8,async index=>{guard();await verifyPublicManifestRecord(domain,manifest[index],manifest,{fetchImpl:guarded});});}});
}
