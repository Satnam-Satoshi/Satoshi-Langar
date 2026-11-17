/** Retained build evidence + real service observations. Not signed provenance. */
import {createHash} from 'node:crypto';
import {createGitHubReadOnly,GITHUB_REPOSITORY} from './adapters/github-readonly.mjs';
import {createGitHubActionsObserver} from './adapters/github-actions-readonly.mjs';
import {createCloudRunExecutionObserver} from './adapters/cloud-run-execution.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===keys;
const c=v=>JSON.stringify(Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])));
const hold=reason=>({status:'held',reason,readyForWorker:false,signedProvenanceVerified:false,runtimeAttestation:false,mutationPerformed:false});
export function createBuildProvenanceLoader({reviewedPins:given,github,cloudRun,clock=()=>new Date().toISOString(),networkEnabled=false}={}){
 const keys='branch|evidenceBlobSha|evidenceSha256|image|jobId|jobName|runAttempt|runId|sourceCommit|stepName|workflowPath';
 if(!exact(given,keys)||typeof clock!=='function'||typeof networkEnabled!=='boolean'||! /^[a-f0-9]{40}$/.test(given.evidenceBlobSha??'')||! /^[a-f0-9]{64}$/.test(given.evidenceSha256??''))throw Error('independent-reviewed-build-pins-required');
 const pins=Object.freeze(structuredClone(given));
 if(typeof github?.secretReference!=='string'||!github.secretReference||typeof github.resolveSecret!=='function')throw Error('authenticated-github-reader-required');
 const git=createGitHubReadOnly({...github,branch:pins.branch,networkEnabled}),actions=createGitHubActionsObserver({...github,...pins,clock,networkEnabled}),runtime=createCloudRunExecutionObserver({...cloudRun,image:pins.image,clock,networkEnabled});let busy=false;
 return Object.freeze({async load(){if(!networkEnabled)return hold('network-disabled');if(busy)return hold('loader-busy');busy=true;try{
 const startedAt=clock(),start=Date.parse(startedAt);if(!Number.isFinite(start))return hold('invalid-clock');
 const commit=await git.readCommit(pins.sourceCommit);if(commit.status!=='read'||commit.sha!==pins.sourceCommit||commit.repository!==GITHUB_REPOSITORY)return hold('source-commit-unobserved');
 const blob=await git.readBlob(pins.evidenceBlobSha);if(blob.status!=='read'||blob.objectBytesVerified!==true||blob.sha256!==pins.evidenceSha256||!(blob.bytes instanceof Uint8Array)||blob.bytes.length<1||blob.bytes.length>16384)return hold('retained-evidence-byte-mismatch');
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(blob.bytes),e=JSON.parse(raw),expected={schemaVersion:1,kind:'retained-ci-build-evidence',repository:GITHUB_REPOSITORY,sourceCommit:pins.sourceCommit,image:pins.image,branch:pins.branch,runId:pins.runId,runAttempt:pins.runAttempt,jobId:pins.jobId,jobName:pins.jobName,stepName:pins.stepName,workflowPath:pins.workflowPath,jobCompletedAt:e?.jobCompletedAt};
 if(!exact(e,Object.keys(expected).sort().join('|'))||c(e)!==raw||c(e)!==c(expected)||typeof e.jobCompletedAt!=='string'||!Number.isFinite(Date.parse(e.jobCompletedAt)))return hold('retained-evidence-binding-mismatch');
 const ci=await actions.observe();if(ci.status!=='github-actions-build-observed'||Date.parse(ci.jobCompletedAt)!==Date.parse(e.jobCompletedAt))return hold('ci-build-not-observed');
 const execution=await runtime.observe();if(execution.status!=='cloud-run-execution-observed'||Date.parse(execution.createTime)<Date.parse(ci.jobCompletedAt))return hold('execution-image-not-observed');
 const observedAt=clock(),at=Date.parse(observedAt);if(!Number.isFinite(at)||at<start||at-start>=60000||Date.parse(ci.observedAt)>at||Date.parse(execution.observedAt)>at)return hold('observation-window-invalid');
 const binding={repository:GITHUB_REPOSITORY,sourceCommit:pins.sourceCommit,image:pins.image,retainedEvidenceSha256:blob.sha256,evidenceBlobSha:pins.evidenceBlobSha,runResponseSha256:ci.runResponseSha256,jobsResponseSha256:ci.jobsResponseSha256,executionResponseSha256:execution.responseSha256,executionName:execution.name,executionUid:execution.uid,job:execution.job,runId:pins.runId,runAttempt:pins.runAttempt,jobId:pins.jobId,jobCompletedAt:ci.jobCompletedAt,startedAt,observedAt};
 return {status:'reviewed-build-binding-observed',...binding,evidenceSha256:sha(c(binding)),expiresAt:new Date(start+60000).toISOString(),ciBuildSuccessObserved:true,retainedEvidenceBytesVerified:true,reviewPinAuthorityVerified:false,sourceImageRelationship:'independently-reviewed-assertion-correlated-with-ci-and-execution',signedProvenanceVerified:false,imageBytesVerified:false,sourceProvenanceVerified:false,runtimeAttestation:false,fullTemplateVerified:false,operationAssociationVerified:false,readyForWorker:false,mutationPerformed:false};
 }catch{return hold('build-binding-observation-unavailable');}finally{busy=false;}}});
}
