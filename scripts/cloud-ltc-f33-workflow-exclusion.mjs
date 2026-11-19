import { createHash } from 'node:crypto';
const check=(v,c)=>{if(!v)throw Error('f33_exclusion_'+c);};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const LEGACY_CREDENTIAL_WORKFLOWS=Object.freeze({
  373667484:'.github/workflows/ltc-daily-publication.yml',
  418831379:'.github/workflows/ltc-f33-paused-retirement.yml',
  416149325:'.github/workflows/ltc-software-release.yml',
  416286211:'.github/workflows/ltc-software-stage-recovery.yml',
  418639004:'.github/workflows/receipt-bootstrap-once.yml',
  416352694:'.github/workflows/ltc-failed-file-diagnostic.yml',
  418704475:'.github/workflows/ltc-readonly-recovery.yml',
  417757637:'.github/workflows/ltc-software-preflight.yml',
  416227939:'.github/workflows/ltc-stage-metadata-diagnostic.yml',
  416251046:'.github/workflows/ltc-stage-protected-diagnostic.yml',
});
// Registered after the original cutover review. No executable revision has
// been accepted as a cooperative writer here; require disabled identities.
export const EXCLUDED_RESEARCH_WORKFLOWS=Object.freeze({
  420517244:'.github/workflows/cloud-newsroom-v2-research.yml',
  420870150:'.github/workflows/standalone-newsroom-source.yml',
});
export const READ_ONLY_WORKFLOWS=Object.freeze({
  296665138:'.github/workflows/ci.yml',402325333:'.github/workflows/ltc-cloud-review.yml',
  418872624:'.github/workflows/ltc-f33-readonly-smoke.yml',377055323:'.github/workflows/ltc-migration-validation.yml',
  415595285:'.github/workflows/site-visual-qa.yml',
});
const freshPaths=['.github/workflows/ltc-f33-fresh-activation.yml','.github/workflows/ltc-fresh-daily-publication.yml'];
const replacementPaths=[...freshPaths,'.github/workflows/ltc-social-maintenance-v2.yml'];
export function validateWorkflowExclusion({config:c,workflows,inventory,main,source,now}){
  check(c && /^[1-9]\d*$/.test(c.runId) && Number.isSafeInteger(c.workflowId) && c.workflowId>0 &&
    freshPaths.includes(c.workflowPath) && /^[a-f0-9]{40}$/.test(c.workflowSha) && /^[a-f0-9]{40}$/.test(c.sourceSha) &&
    c.sourceBranch==='agent/wall-street-20261011' && c.group==='ltc-production-publication' && c.cancelInProgress===false,'config');
  check(Array.isArray(c.newWorkflows) && c.newWorkflows.length===3 && new Set(c.newWorkflows.map(w=>w.id)).size===3 &&
    c.newWorkflows.every(w=>Number.isSafeInteger(w.id)&&w.id>0&&!Object.hasOwn(LEGACY_CREDENTIAL_WORKFLOWS,w.id)&&!Object.hasOwn(READ_ONLY_WORKFLOWS,w.id)&&!Object.hasOwn(EXCLUDED_RESEARCH_WORKFLOWS,w.id)) &&
    replacementPaths.every(p=>c.newWorkflows.filter(w=>w.path===p).length===1) &&
    c.newWorkflows.some(w=>w.id===c.workflowId&&w.path===c.workflowPath),'new_identity');
  check(main?.object?.sha===c.workflowSha && (c.workflowPath===freshPaths[0] ? source?.object?.sha===c.sourceSha : /^[a-f0-9]{40}$/.test(source?.object?.sha??'')),'source_changed');
  // Daily writer source movement is checked by its existing controller before
  // Git/Vercel effects; its own accepted Git commit can advance the source branch.
  check(workflows?.total_count===20 && Array.isArray(workflows.workflows) && workflows.workflows.length===20 &&
    new Set(workflows.workflows.map(w=>w.id)).size===20,'complete_inventory');
  const allowed={...LEGACY_CREDENTIAL_WORKFLOWS,...EXCLUDED_RESEARCH_WORKFLOWS,...READ_ONLY_WORKFLOWS,...Object.fromEntries(c.newWorkflows.map(w=>[w.id,w.path]))};
  for(const w of workflows.workflows){
    check(allowed[w.id]===w.path,'unknown_workflow');
    if(Object.hasOwn(LEGACY_CREDENTIAL_WORKFLOWS,w.id)||Object.hasOwn(EXCLUDED_RESEARCH_WORKFLOWS,w.id))check(w.state==='disabled_manually','legacy_enabled');
    else check(w.state==='active','replacement_not_ready');
  }
  check(Array.isArray(inventory)&&inventory.length===5,'run_inventory');let self=0;
  for(const [i,page] of inventory.entries()){
    check(page.status===['queued','in_progress','waiting','pending','requested'][i] && Number.isSafeInteger(page.total_count)&&page.total_count<=100&&page.workflow_runs?.length===page.total_count,'run_inventory');
    for(const run of page.workflow_runs){
      check(String(run.id)===c.runId && run.workflow_id===c.workflowId && run.run_attempt===1 && run.head_branch==='main' &&
        run.head_sha===c.workflowSha && run.path===c.workflowPath && run.status==='in_progress' &&
        ['workflow_dispatch','schedule'].includes(run.event),'other_active_run');self++;
    }
  }
  check(self===1 && Number.isFinite(now),'current_run');
  return Object.freeze({workflowInventorySha256:hash(workflows),observedAt:now,expiresAt:now+300000});
}

// GitHub documents disabled workflows cannot rerun. Readback of disabled IDs plus
// an empty nonterminal inventory excludes their queued cached secrets. New IDs
// must stay distinct; never re-enable old daily workflow to restore scheduling.
// This is a cooperative-writer barrier, not protection against owner/admin edits.
export function createWorkflowExclusion({config,readGitHub,assertLocalStop,clock=Date.now}){
  check(typeof readGitHub==='function'&&typeof assertLocalStop==='function','capabilities');
  const c=structuredClone(config);let binding,proof,revoked=false;
  async function refresh(){
    check(!revoked,'revoked');const started=clock();
    const main=await readGitHub('git/ref/heads/main');
    const source=await readGitHub('git/ref/heads/'+c.sourceBranch);
    const workflows=await readGitHub('actions/workflows?per_page=100');const inventory=[];
    for(const status of ['queued','in_progress','waiting','pending','requested'])inventory.push({status,...await readGitHub('actions/runs?status='+status+'&per_page=100')});
    check(clock()>=started && clock()-started<30000 && assertLocalStop()===true,'window_or_local_stop');
    proof=validateWorkflowExclusion({config:c,workflows,inventory,main,source,now:started});return proof;
  }
  return Object.freeze({
    async acquire({binding:b,configuration}){
      check(!binding&&configuration?.writerExclusionSha256===hash(c),'review_binding');binding=JSON.stringify(b);await refresh();
      return Object.freeze({assertHeld(next){check(!revoked&&JSON.stringify(next)===binding&&clock()>=proof.observedAt&&clock()<proof.expiresAt&&assertLocalStop()===true,'lost');return true;}});
    },
    refresh,
    revoke(){revoked=true;},
  });
}
