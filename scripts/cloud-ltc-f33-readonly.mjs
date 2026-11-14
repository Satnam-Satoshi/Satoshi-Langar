import {createHash} from 'node:crypto';
import {safeEvidenceDiagnostic} from './cloud-ltc-evidence.mjs';
const check=(v,c)=>{if(!v)throw Error('f33_readonly_'+c);};
export const inspectionHash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
// The only POST accepted is the existing scoped OAuth token refresh. This guard
// applies to lookup, ledger and evidence independently of their higher APIs.
export function inspectionReadOnlyFetch(fetcher){return(url,options={})=>{const u=new URL(url),method=options.method??'GET';check(!u.username&&!u.password&&u.protocol==='https:'&&((method==='POST'&&u.href==='https://oauth2.googleapis.com/token')||(method==='GET'&&((u.origin==='https://www.googleapis.com'&&/^\/drive\/v3\/files(?:\/[A-Za-z0-9_-]+(?:\/permissions)?)?$/.test(u.pathname))||(u.origin==='https://docs.googleapis.com'&&/^\/v1\/documents\/[A-Za-z0-9_-]+$/.test(u.pathname))||(u.origin==='https://api.github.com'&&u.pathname.startsWith('/repos/Satnam-Satoshi/Satoshi-Langar/actions/'))))),'transport_write_forbidden');return fetcher(url,options);};}
export function validateF33ReadSnapshot(snapshot,{folderId,ownerPermissionId,originRunId,originAttempt},now){
 const d=snapshot.value,run=`gha-${originRunId}-${originAttempt}`;
 check(typeof snapshot.version==='string'&&snapshot.version.length>0&&d?.schemaVersion===1&&typeof d.paused==='boolean'&&d.restoreHold===false&&d.fence===33&&d.lease?.fence===33&&d.lease.runId===run&&d.lease.publicationDate==='2026-11-14'&&Number.isFinite(d.lease.expiresAt)&&d.lease.expiresAt<=now&&!Object.hasOwn(d,'f33Retirement'),'snapshot');
 check(d.intents&&d.receipts&&!Array.isArray(d.intents)&&!Array.isArray(d.receipts),'shape');
 const rows=Object.values(d.intents).filter(r=>r.fence===33).sort((a,b)=>a.payload?.artifactBundleIndex-b.payload?.artifactBundleIndex);
 check(rows.length===51&&new Set(rows.map(r=>r.payload?.fileId)).size===51,'rows');
 for(const [key,r]of Object.entries(d.intents)){check(r.operationId===key&&r.payloadSha256===inspectionHash(r.payload),'payload');if(r.fence!==33)check(r.fence<33&&r.runId!==run&&['confirmed','not-applied'].includes(r.status),'other_lineage');}
 for(const [i,r]of rows.entries()){const p=r.payload;check(r.runId===run&&r.status===(i<34?'confirmed':i===34?'uncertain':'pending')&&p?.kind==='drive-evidence'&&p.role==='release-artifacts'&&p.folderId===folderId&&p.artifactBundleIndex===i&&p.artifactBundleCount===51&&p.generation===rows[34].payload.generation&&p.artifactPackageManifestSha256===rows[34].payload.artifactPackageManifestSha256&&/^[a-f0-9]{64}$/.test(p.sha256??'')&&/^[A-Za-z0-9_-]{8,160}$/.test(p.fileId??'')&&Number.isSafeInteger(p.bytes)&&p.bytes>0&&p.bytes<=3500000,'lineage');
  if(i<34){const q=r.proof;check(r.evidenceSha256===inspectionHash(q)&&d.receipts[r.operationId]?.sha256===inspectionHash(r)&&inspectionHash(d.receipts[r.operationId].receipt)===inspectionHash(r)&&q?.operationId===r.operationId&&q.payloadSha256===r.payloadSha256&&q.status==='applied'&&q.proof?.fileId===p.fileId&&q.proof.folderId===folderId&&q.proof.ownerPermissionId===ownerPermissionId&&q.proof.ownerOnly===true&&q.proof.downloadVerified===true&&q.proof.sha256===p.sha256&&q.proof.length===p.bytes,'confirmed_receipt');}
  else check(r.evidenceSha256===null&&!Object.hasOwn(r,'proof')&&!Object.hasOwn(d.receipts,r.operationId),'nonterminal');
 }
 check(/^f33-[a-f0-9]+$/.test(rows[34].payload.generation)&&/^[a-f0-9]{64}$/.test(rows[34].payload.artifactPackageManifestSha256),'generation');return rows[34];
}
export async function inspectF33ReadOnly({config,authorize,lookup,readState,readOrigin,readEvidence,clock=Date.now}){
 // All adapter references captured before waits; none expose a write method.
 const c=structuredClone(config),a=authorize,l=lookup,s=readState,o=readOrigin,e=readEvidence,now=clock;
 for(const f of[a,l,s,o,e,now])check(typeof f==='function','adapter');
 const capability=await a();check(typeof capability?.assertInspection==='function','authority');const assertInspection=capability.assertInspection.bind(capability);assertInspection();
 const receipt=await l();check(receipt?.status==='verified-existing-private-receipt'&&receipt.retryCreateAllowed===false,'receipt_lookup');assertInspection();
 const before=structuredClone(await s());const uncertain=validateF33ReadSnapshot(before,c,now());
 const origin=await o();check(String(origin?.id)===c.originRunId&&origin.run_attempt===c.originAttempt&&origin.repository?.full_name==='Satnam-Satoshi/Satoshi-Langar'&&origin.path==='.github/workflows/ltc-daily-publication.yml'&&origin.head_branch==='main'&&origin.event==='workflow_dispatch'&&origin.status==='completed'&&['failure','cancelled','timed_out'].includes(origin.conclusion)&&/^[a-f0-9]{40}$/.test(origin.head_sha??''),'origin');
 let observed='unknown',diagnostic=null,proof=null;assertInspection();
 try{const result=await e(uncertain,value=>{diagnostic=safeEvidenceDiagnostic(value);});if(result?.proof){observed='applied';proof=result.proof;}}catch{/* missing or failed read never proves absence */}
 const after=await s();check(after.version===before.version&&inspectionHash(after.value)===inspectionHash(before.value),'concurrent_change');assertInspection();
 return {evidenceCoverage:'uncertain-only',casReconciliationComplete:false,status:'read-only-inspection-complete',receipt,origin:{runId:c.originRunId,attempt:c.originAttempt,head:origin.head_sha},snapshotVersion:before.version,snapshotSha256:inspectionHash(before.value),snapshot:before.value,uncertain:{operationId:uncertain.operationId,observed,proof,diagnostic},confirmedRetained:34,pendingNotAuthorized:16,ledgerPaused:before.value.paused,stateChanged:false,publicationPerformed:false,creationPerformed:false,retryAuthorized:false};
}
export function inspectionPublicStatus(r){return {evidenceCoverage:'uncertain-only',casReconciliationComplete:false,status:r?.status==='read-only-inspection-complete'?r.status:'inspection-blocked',receiptVerified:r?.status==='read-only-inspection-complete',uncertainObserved:r?.uncertain?.observed==='applied'?'applied':'unknown',confirmedRetained:r?.confirmedRetained===34?34:null,pendingNotAuthorized:r?.pendingNotAuthorized===16?16:null,...(r?.uncertain?.diagnostic?{diagnostic:safeEvidenceDiagnostic(r.uncertain.diagnostic)}:{}),stateChanged:false,publicationPerformed:false,creationPerformed:false,retryAuthorized:false};}
