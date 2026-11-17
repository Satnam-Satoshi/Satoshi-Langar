import {createHash} from 'node:crypto';
const API='https://api.vercel.com';const DOMAINS=Object.freeze(['ltcmagazine.org','satnamsatoshi.com']);
const hold=reason=>({status:'held',reason,publicationVerified:false,mutationPerformed:false});
const states=['BLOCKED','BUILDING','CANCELED','ERROR','INITIALIZING','QUEUED','READY'];
const hex=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
const dpl=s=>typeof s==='string'&&/^dpl_[A-Za-z0-9]{1,100}$/.test(s);
/** No upload, create, promote, alias-write, bypass or credential-management methods. */
export function createVercelReadOnly({fetch:fetcher,resolveSecret,secretReference,projectId,teamId,expectedBranch,readEnabled=false,timeoutMs=10000}={}){
 if(typeof fetcher!=='function'||typeof resolveSecret!=='function'||typeof secretReference!=='string'||!secretReference||secretReference.length>500||!/^prj_[A-Za-z0-9]{1,100}$/.test(projectId??'')||!/^team_[A-Za-z0-9]{1,100}$/.test(teamId??'')||typeof expectedBranch!=='string'||!/^agent\/[a-z0-9][a-z0-9/_-]{0,150}$/.test(expectedBranch)||expectedBranch.includes('//')||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw Error('fixed-vercel-read-boundary-required');
 let stopped=false,busy=false;
 async function read(path){
  if(readEnabled!==true)return hold('reads-disabled');if(stopped||busy)return hold('read-session-held');busy=true;let timer;const controller=new AbortController();
  const url=API+path+(path.includes('?')?'&':'?')+'teamId='+teamId;
  try{return await Promise.race([(async()=>{const secret=await resolveSecret({reference:secretReference,purpose:'vercel-read-only'});if(typeof secret!=='string'||secret.length<8||secret.length>4096||/\s/.test(secret)||controller.signal.aborted)throw Error();const r=await fetcher(url,{method:'GET',redirect:'manual',signal:controller.signal,headers:{Authorization:'Bearer '+secret,Accept:'application/json'}});if(r.redirected||r.url!==url||r.status!==200||!/^application\/json(?:;|$)/i.test(r.headers.get('content-type')??''))throw Error();const length=r.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>2097152))throw Error();const reader=r.body?.getReader();if(!reader)throw Error();let total=0;const chunks=[];try{for(;;){const {done,value}=await reader.read();if(done)break;if(!(value instanceof Uint8Array)||(total+=value.length)>2097152)throw Error();chunks.push(Buffer.from(value));}}catch(e){await reader.cancel().catch(()=>{});throw e;}if(controller.signal.aborted)throw Error();const bytes=Buffer.concat(chunks),data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!data||typeof data!=='object'||Array.isArray(data)||data.error)throw Error();return {data,responseSha256:createHash('sha256').update(bytes).digest('hex')};})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error());},timeoutMs);})]);}catch{stopped=true;controller.abort();return hold('read-failed-no-retry');}finally{clearTimeout(timer);busy=false;}
 }
 async function getDeployment({deploymentId,expectedCommit}={}){
  if(!dpl(deploymentId)||!hex(expectedCommit))return hold('exact-deployment-and-commit-required');
  const r=await read('/v13/deployments/'+deploymentId+'?withGitRepoInfo=true');if(r.status==='held')return r;const d=r.data,g=d.gitSource;
  // Owner-only fields are required. Reduced public responses never establish scope.
  const repositoryMatches=g?.repoId!==undefined?String(g.repoId)==='1181242402':g?.org==='Satnam-Satoshi'&&g.repo==='Satoshi-Langar';
  if(d.id!==deploymentId||d.projectId!==projectId||d.ownerId!==teamId||d.project?.id!==undefined&&d.project.id!==projectId||!states.includes(d.readyState)||![null,'production','staging'].includes(d.target)||g?.type!=='github'||g.sha!==expectedCommit||g.ref!==expectedBranch||!repositoryMatches||g.org!==undefined&&g.org!=='Satnam-Satoshi'||g.repo!==undefined&&g.repo!=='Satoshi-Langar'){stopped=true;return hold('deployment-scope-or-source-mismatch');}
  let deploymentHostname=null;
  if(d.url!==undefined&&d.url!==null){
   if(typeof d.url!=='string'||d.url.length>253||!d.url.endsWith('.vercel.app')||!d.url.split('.').every(label=>label.length>=1&&label.length<=63&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))){stopped=true;return hold('deployment-hostname-invalid');}
   deploymentHostname=d.url;
  }
  // Deliberately omit env, creators, protectionBypass and all other raw provider fields.
  return {status:'deployment-observed',deploymentId,projectId,teamId,commit:expectedCommit,branch:expectedBranch,readyState:d.readyState,target:d.target,deploymentHostname,responseSha256:r.responseSha256,publicationVerified:false,mutationPerformed:false};
 }
 async function getProductionAliasObservation(args){
  const d=await getDeployment(args);if(d.status!=='deployment-observed')return d;if(d.readyState!=='READY'||d.target!=='production')return hold('ready-production-deployment-required');
  const r=await read('/v2/deployments/'+d.deploymentId+'/aliases');if(r.status==='held')return r;
  if(!Array.isArray(r.data.aliases)||r.data.aliases.length>1000){stopped=true;return hold('alias-list-bound');}
  const seen=new Set(),matches=[];
  for(const a of r.data.aliases){if(!a||typeof a.alias!=='string'||a.alias.length>253||seen.has(a.alias)){stopped=true;return hold('invalid-or-duplicate-alias');}seen.add(a.alias);if(DOMAINS.includes(a.alias)){if(a.redirect!==undefined&&a.redirect!==null){stopped=true;return hold('expected-domain-is-redirect');}matches.push(a.alias);}}
  return {status:'production-alias-list-observed',deploymentId:d.deploymentId,commit:d.commit,domains:matches.sort(),bothDomainsListed:matches.length===2,responseSha256:r.responseSha256,publicationVerified:false,publicArtifactQaVerified:false,atomic:false,mutationPerformed:false};
 }
 return Object.freeze({getDeployment,getProductionAliasObservation});
}
