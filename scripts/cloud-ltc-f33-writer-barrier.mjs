// Bounded cooperative-writer barrier, not a provider lock or protection from owner edits.
// Trusted configuration binds the reviewed workflow's shared concurrency group and
// freshly recorded local maintenance observation. Native owner approval must cover
// leaving those controls unchanged. This module changes no setting.
const check=(v,c)=>{if(!v)throw Error('f33_barrier_'+c);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const digest=v=>/^[a-f0-9]{64}$/.test(v??'');
export function validateWriterWindow({config:c,main,source,inventory,now}){
 check(c?.group==='ltc-production-publication'&&c.cancelInProgress===false&&c.scope==='cooperative-known-writers'&&/^\d+$/.test(c.runId),'config');
 check(/^[a-f0-9]{40}$/.test(c.workflowSha??'')&&/^[a-f0-9]{40}$/.test(c.sourceSha??'')&&digest(c.workflowInventorySha256)&&digest(c.sourcePolicySha256),'pins');
 check(main?.object?.sha===c.workflowSha&&source?.object?.sha===c.sourceSha,'source_changed');
 const m=c.localMaintenance;
 check(m&&m.scheduler==='satnam-satoshi-foundation-and-launch-follow-up'&&m.schedulerDisabled===true&&m.publisherProcesses===0&&m.otherKnownDirectWriters===0&&m.ownerMaintainsStop===true&&digest(m.observationSha256)&&Number.isFinite(m.observedAt)&&m.observedAt<=now&&now-m.observedAt<300000,'local_stop');
 check(c.cloudPublicationEnabled===false&&c.softwarePublicationEnabled===false&&c.sourcePolicyPaused===true,'publication_enabled');
 check(Array.isArray(inventory)&&inventory.length===5,'inventory');let selfCount=0;
 for(let i=0;i<5;i++){
  const page=inventory[i];check(page.status===['queued','in_progress','waiting','pending','requested'][i]&&Number.isInteger(page.total_count)&&page.total_count<=100&&page.total_count===page.workflow_runs?.length,'inventory_incomplete');
  for(const r of page.workflow_runs){selfCount++;check(String(r.id)===c.runId&&r.head_sha===c.workflowSha&&r.run_attempt===1&&r.head_branch==='main'&&r.event==='workflow_dispatch'&&r.path==='.github/workflows/ltc-f33-paused-retirement.yml'&&r.status==='in_progress','other_active_run');}
 }
 check(selfCount===1,'current_run_missing');
 return Object.freeze({observedAt:now,expiresAt:Math.min(now+300000,m.observedAt+300000),scope:'cooperative-known-writers'});
}
export function createBoundedWriterBarrier({config,readGithub,clock=Date.now}){
 check(typeof readGithub==='function'&&typeof clock==='function','reader');const c=structuredClone(config);let pinnedScope,proof,revoked=false;
 return Object.freeze({
  async acquireBarrier(scope){
   check(!pinnedScope&&!revoked,'already_acquired');check(scope?.incident==='gha-43608206507-1/fence33'&&scope.action==='retire-paused-only'&&digest(scope.reviewSha256)&&digest(scope.expectedSnapshotSha256)&&typeof scope.expectedRevision==='string'&&scope.expectedRevision.length>0&&typeof scope.nonce==='string','scope');
   const started=clock();const main=await readGithub('git/ref/heads/main');const source=await readGithub('git/ref/heads/agent/wall-street-20261011');const inventory=[];
   for(const status of ['queued','in_progress','waiting','pending','requested'])inventory.push({status,...await readGithub('actions/runs?status='+status+'&per_page=100')});
   check(clock()>=started&&clock()-started<30000,'read_window');proof=validateWriterWindow({config:c,main,source,inventory,now:started});pinnedScope=structuredClone(scope);
   return Object.freeze({assertHeld(next){check(!revoked&&same(next,pinnedScope)&&clock()>=proof.observedAt&&clock()<proof.expiresAt,'lost');return true;}});
  },
  revoke(){revoked=true;}
 });
}
