/** Explicit isolated LOCAL checkout preparation, never a remote ref mutation.
 * The caller must run this reviewed implementation and independently pin inputs.
 * Fetching public Git objects is an additional explicit opt-in. No build/code runs.
 */
import {execFileSync} from 'node:child_process';
import {realpathSync,lstatSync,mkdtempSync} from 'node:fs';
import {isAbsolute,resolve,join} from 'node:path';
import {observeCloudNewsroomV2GitCandidate} from './cloud-newsroom-v2-admission-wrapper.mjs';
const hex=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
const canonical=p=>typeof p==='string'&&isAbsolute(p)&&resolve(p)===p&&realpathSync(p)===p&&lstatSync(p).isDirectory();
const env={PATH:'/usr/bin:/bin',HOME:'/nonexistent',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_ASKPASS:'/bin/false',GIT_NO_REPLACE_OBJECTS:'1'};
const git=(cwd,args)=>execFileSync('/usr/bin/git',['--no-replace-objects','-c','core.fsmonitor=false','-c','core.hooksPath=/dev/null','-c','credential.helper=','-C',cwd,...args],{env,maxBuffer:2*1024*1024,timeout:120000,stdio:['ignore','pipe','pipe']}).toString('utf8').trim();
export function prepareCloudNewsroomV2CandidateCheckout({sourceRepoRoot,workspaceRoot,candidateCommit,priorCommit,repository,branch,allowFetch=false}={}){
 if(!canonical(sourceRepoRoot)||!canonical(workspaceRoot)||!hex(candidateCommit)||!hex(priorCommit)||repository!=='Satnam-Satoshi/Satoshi-Langar'||branch!=='agent/cloud-newsroom-v2-20261116')throw Error('candidate_checkout_scope');
 if(git(sourceRepoRoot,['rev-parse','--show-toplevel'])!==sourceRepoRoot||git(sourceRepoRoot,['rev-parse','--is-shallow-repository'])!=='false')throw Error('candidate_checkout_source_layout');
 const origin=git(sourceRepoRoot,['config','--get','remote.origin.url']),url=`https://github.com/${repository}.git`;
 if(![url,url.slice(0,-4),`git@github.com:${repository}.git`].includes(origin))throw Error('candidate_checkout_source_origin');
 // Retain all scratch output, including incomplete preparations. Never clean or
 // reuse a previous directory after uncertainty or missing-object failure.
 const repoRoot=mkdtempSync(join(workspaceRoot,'ltc-v2-candidate-'));
 git(workspaceRoot,['clone','--local','--no-hardlinks','--dissociate','--no-checkout','--',sourceRepoRoot,repoRoot]);
 git(repoRoot,['remote','set-url','origin',url]);
 for(const commit of [candidateCommit,priorCommit]){
  let present=false;try{present=git(repoRoot,['rev-parse','--verify',commit+'^{commit}'])===commit;}catch{}
  if(!present){if(allowFetch!==true)throw Error('candidate_objects_missing_fetch_not_authorized');git(repoRoot,['fetch','--no-tags','--no-recurse-submodules','origin',commit]);if(git(repoRoot,['rev-parse','--verify',commit+'^{commit}'])!==commit)throw Error('candidate_object_fetch_unverified');}
 }
 git(repoRoot,['checkout','--no-recurse-submodules','-B',branch,candidateCommit]);
 if(git(repoRoot,['status','--porcelain'])!=='')throw Error('candidate_checkout_not_clean');
 const observation=observeCloudNewsroomV2GitCandidate({repoRoot,repository,branch,candidateCommit,priorCommit});
 return {repoRoot,observation:{...observation,priorCommit},remoteRefChanged:false,codeExecuted:false};
}
