/** Coordinator-only read-only Git admission. Run this reviewed module from trusted
 * code, never substitute a candidate-controlled implementation. External trust
 * transport/ownership and provider fencing are NOT supplied by this module. */
import { readFileSync, realpathSync, lstatSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { evaluateCloudNewsroomV2DataAdmission, PDF_REGISTRY_PATH } from './cloud-newsroom-v2-data-admission.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const hex=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
const inside=(root,p)=>{const r=relative(root,p);return r===''||(!r.startsWith('../')&&!isAbsolute(r));};
function jsonFile(path){
 if(typeof path!=='string'||!isAbsolute(path)||resolve(path)!==path||realpathSync(path)!==path)throw Error('noncanonical_json_path');
 const s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>4*1024*1024)throw Error('unsafe_json_file');
 const bytes=readFileSync(path);if(bytes.length>4*1024*1024)throw Error('json_too_large');
 return {value:JSON.parse(bytes.toString('utf8')),sha256:sha(bytes)};
}
/** Read-only Git object observation for a trusted coordinator before deployment.
 * Does not assert Vercel/provider environment, source approval or publishing authority.
 * Origin, branch and exact candidate/prior pins are independently supplied inputs.
 */
export function observeCloudNewsroomV2GitCandidate({repoRoot,repository,branch:expectedBranch,candidateCommit,priorCommit}={}){
 if(typeof repoRoot!=='string'||!isAbsolute(repoRoot)||resolve(repoRoot)!==repoRoot||realpathSync(repoRoot)!==repoRoot)throw Error('canonical_repo_required');
 if(typeof repository!=='string'||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)||typeof expectedBranch!=='string'||!expectedBranch||expectedBranch.startsWith('-')||expectedBranch.includes('\n')||!hex(candidateCommit)||!hex(priorCommit))throw Error('exact_git_observation_scope_required');
  // Fixed executable, no shell, no inherited Git config/replace/shallow helpers.
  const git=(args)=>execFileSync('/usr/bin/git',['--no-replace-objects','-c','core.fsmonitor=false','-c','core.hooksPath=/dev/null','-C',repoRoot,...args],{env:{PATH:'/usr/bin:/bin',HOME:'/nonexistent',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1'},maxBuffer:34*1024*1024,timeout:30000,stdio:['ignore','pipe','pipe']});
  const str=args=>git(args).toString('utf8').trim();
  if(str(['rev-parse','--show-toplevel'])!==repoRoot||str(['rev-parse','--is-shallow-repository'])!=='false')throw Error('unsupported_repository_layout');
  const remote=str(['config','--get','remote.origin.url']);
  if(![`https://github.com/${repository}.git`,`https://github.com/${repository}`,`git@github.com:${repository}.git`].includes(remote))throw Error('origin_identity_mismatch');
  const branch=str(['symbolic-ref','--short','HEAD']);if(branch!==expectedBranch)throw Error('branch_mismatch');
  const head=str(['rev-parse','--verify','HEAD^{commit}']);if(head!==candidateCommit)throw Error('head_reported_sha_mismatch');
  const prior=priorCommit;if(!hex(prior))throw Error('invalid_prior_commit');
  if(str(['rev-parse','--verify',prior+'^{commit}'])!==prior)throw Error('prior_commit_missing');
  const observe=commit=>{
   const rows=git(['ls-tree','-rz','--full-tree',commit]).toString('utf8').split('\0').filter(Boolean);
   if(rows.length===0||rows.length>20000)throw Error('tree_bounds');
   let total=0;const entries=[];let registry;
   for(const row of rows){const m=/^(\d{6}) blob ([a-f0-9]{40})\t([^\0]+)$/.exec(row);if(!m||m[1]!=='100644')throw Error('nonregular_git_entry');
    const bytes=git(['cat-file','blob',m[2]]);total+=bytes.length;if(bytes.length>32*1024*1024||total>256*1024*1024)throw Error('tree_byte_bounds');
    entries.push({path:m[3],mode:m[1],sha256:sha(bytes),bytes:bytes.length});if(m[3]===PDF_REGISTRY_PATH){registry=bytes.toString('utf8');if(!Buffer.from(registry).equals(bytes))throw Error('registry_not_utf8');}
   }return {entries,registry};
  };
  const a=observe(prior),b=observe(head);
  const parents=str(['show','-s','--format=%P',head]).split(' ').filter(Boolean);
  const candidateTreeGitSha=str(['rev-parse',head+'^{tree}']);
  if(!hex(candidateTreeGitSha)||str(['rev-parse','HEAD'])!==head||str(['symbolic-ref','--short','HEAD'])!==branch)throw Error('head_changed_during_observation');
  return {candidateCommit:head,candidateTreeGitSha,candidateParents:parents,candidateTree:b.entries,candidateRegistryText:b.registry,priorTree:a.entries,currentRegistryText:a.registry};
}
/** trust JSON: {repository:'owner/repo',branch,receiptSha256, trusted:{...pure evaluator trust}}
 * Trusted priorTree/currentRegistryText are ignored and replaced by Git objects.
 * now must be coordinator-owned; CLI uses real clock. env must be provider-owned.
 * Trusted file outside checkout is necessary, NOT proof of provenance/ownership.
 */
export function runCloudNewsroomV2Admission({repoRoot,trustPath,receiptPath,now,env}={}){
 const deny=error=>({status:'blocked',marker:'LTC_V2_ADMISSION_DENY',errors:[error],effects:[],promotionAuthorized:false});
 try{
  if(!trustPath) return deny('external_trust_file_required');
  if(typeof repoRoot!=='string'||!isAbsolute(repoRoot)||resolve(repoRoot)!==repoRoot||realpathSync(repoRoot)!==repoRoot)return deny('canonical_repo_required');
  if(inside(repoRoot,resolve(trustPath))||inside(repoRoot,realpathSync(trustPath)))return deny('trust_file_inside_candidate');
  const {value:t}=jsonFile(trustPath),receipt=jsonFile(receiptPath);
  if(!t||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(t.repository)||typeof t.branch!=='string'||!t.branch||t.branch.startsWith('-')||t.branch.includes('\n'))return deny('invalid_trust_identity');
  if(!/^[a-f0-9]{64}$/.test(t.receiptSha256)||receipt.sha256!==t.receiptSha256)return deny('receipt_external_binding_mismatch');
  if(env?.VERCEL_ENV!=='preview'||env?.VERCEL_TARGET_ENV!=='preview')return deny('preview_environment_required');
  if(`${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}`!==t.repository||env.VERCEL_GIT_COMMIT_REF!==t.branch||!hex(env.VERCEL_GIT_COMMIT_SHA))return deny('provider_identity_mismatch');
  const observed=observeCloudNewsroomV2GitCandidate({repoRoot,repository:t.repository,branch:t.branch,candidateCommit:env.VERCEL_GIT_COMMIT_SHA,priorCommit:t.trusted?.priorCommit});
  const result=evaluateCloudNewsroomV2DataAdmission({now,candidateCommit:observed.candidateCommit,candidateParents:observed.candidateParents,candidateTree:observed.candidateTree,candidateRegistryText:observed.candidateRegistryText,receipt:receipt.value},{...t.trusted,priorTree:observed.priorTree,currentRegistryText:observed.currentRegistryText});
  // Preserve the wrapper's final post-evaluation HEAD/branch stability check.
  const finalGit=args=>execFileSync('/usr/bin/git',['--no-replace-objects','-c','core.fsmonitor=false','-c','core.hooksPath=/dev/null','-C',repoRoot,...args],{env:{PATH:'/usr/bin:/bin',HOME:'/nonexistent',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1'},maxBuffer:1024*1024,timeout:30000,stdio:['ignore','pipe','pipe']}).toString('utf8').trim();
  if(finalGit(['rev-parse','HEAD'])!==observed.candidateCommit||finalGit(['symbolic-ref','--short','HEAD'])!==t.branch)return deny('head_changed_during_observation');
  return {...result,marker:result.status==='eligible-for-preview-review'?'LTC_V2_PREVIEW_REVIEW_ONLY':'LTC_V2_ADMISSION_DENY',observedCommit:observed.candidateCommit,providerEnforcement:false};
 }catch{return deny('observation_or_validation_failed');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);const result=args.length===3?runCloudNewsroomV2Admission({repoRoot:args[0],trustPath:args[1],receiptPath:args[2],now:new Date().toISOString(),env:process.env}):{status:'blocked',marker:'LTC_V2_ADMISSION_DENY',errors:['usage_repo_trust_receipt_required'],effects:[],promotionAuthorized:false};
 console.log(JSON.stringify(result));process.exitCode=result.status==='eligible-for-preview-review'?0:1;
}
