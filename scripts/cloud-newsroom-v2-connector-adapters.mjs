/** Existing-connector wiring; no tokens, networking implementation or implicit mutation.
 * Caller passes authenticated MCP functions and separately authorized mutation flags.
 * Unknown tool outcomes throw; coordinator must reconcile instead of retrying.
 */
export const V2_CONNECTOR_SCOPE=Object.freeze({repository:'Satnam-Satoshi/Satoshi-Langar',branch:'agent/cloud-newsroom-v2-20261116',stateBranch:'agent/cloud-newsroom-v2-state',statePath:'state/cloud-newsroom-v2.json',repositoryId:1181242402,projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',teamId:'team_yc5ZBvCbWT2M7iGyj3vQDOzk',domains:['ltcmagazine.org','satnamsatoshi.com']});
const hex=(v,n)=>typeof v==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(v);
function payload(r){if(r?.isError)throw Error('connector_error');if(r?.structuredContent){if(r.structuredContent.error||r.structuredContent.error_code)throw Error('connector_error');return r.structuredContent;}for(const block of r?.content??[])if(block.type==='text'){try{const p=JSON.parse(block.text);if(p.error)throw Error('connector_error');return p.result??p;}catch(e){if(e.message==='connector_error')throw e;}}throw Error('unrecognized_connector_result');}
const dep=r=>{const p=payload(r);return p.deployment??p;};
const scope=V2_CONNECTOR_SCOPE;
export function createCloudNewsroomV2ConnectorAdapters({tools,qaVerifier,grantObserver,qaArchive,clock,allowMutations=false,allowPromotion=false}){
 for(const k of ['githubFetchFile','githubUpdateFile','vercelCreateDeployment','vercelGetDeployment','vercelPromote'])if(typeof tools?.[k]!=='function')throw Error('explicit_connector_required');
 if(typeof grantObserver!=='function'||typeof qaArchive?.persistQa!=='function')throw Error('explicit_grant_observer_and_qa_archive_required');
 if(typeof qaVerifier?.verify!=='function'||typeof qaVerifier?.verifyPublic!=='function'||typeof clock!=='function')throw Error('independent_qa_and_clock_required');
 const namespace=n=>{if(n!=='cloud-newsroom-v2')throw Error('foreign_state_namespace');};
 const mutation=()=>{if(allowMutations!==true)throw Error('mutations_not_enabled');};
 const project=p=>{if(p!==scope.projectId)throw Error('foreign_project');};
 return {
  clock,admission:{observeGrant:args=>grantObserver(args)},archive:{persistQa:args=>{mutation();return qaArchive.persistQa(args);}},qa:{verify:args=>qaVerifier.verify(args),verifyPublic:args=>qaVerifier.verifyPublic(args)},
  state:{
   async read(n){namespace(n);const p=payload(await tools.githubFetchFile({repository_full_name:scope.repository,ref:scope.stateBranch,path:scope.statePath,encoding:'utf-8'}));if(p.encoding!=='utf-8'||typeof p.content!=='string'||!hex(p.sha,40))throw Error('invalid_state_read');const value=JSON.parse(p.content);if(value.schemaVersion!==1||value.generation!=='cloud-newsroom-v2')throw Error('foreign_state');return{version:p.sha,value};},
   async cas(n,version,value){namespace(n);mutation();if(!hex(version,40)||value?.schemaVersion!==1||value.generation!=='cloud-newsroom-v2')throw Error('invalid_state_cas');const r=await tools.githubUpdateFile({repository_full_name:scope.repository,branch:scope.stateBranch,path:scope.statePath,sha:version,message:'Cloud newsroom v2 coordinated state transition',content:JSON.stringify(value)+'\n'});const error=r?.structuredContent?.error??r?.structuredContent; if(r?.isError&&(error?.status===409||error?.code==='CONFLICT'||error?.error_code==='CONFLICT'))return{ok:false};const p=payload(r);if(!hex(p.content_sha,40))throw Error('state_write_uncertain');return{ok:true,version:p.content_sha};}
  },
  provider:{
   async createPreview(r){mutation();project(r.projectId);if(r.repository!==scope.repository||r.production!==false||r.target!=='preview'||!hex(r.sourceCommit,40))throw Error('invalid_preview_scope');const d=dep(await tools.vercelCreateDeployment({teamId:scope.teamId,requestBody:{name:'https-github-com-satnam-satoshi-satoshi-langar',project:scope.projectId,target:'staging',gitSource:{type:'github',repoId:scope.repositoryId,ref:scope.branch,sha:r.sourceCommit},meta:{purpose:'cloud-newsroom-v2-preview',runId:String(r.runId),fence:String(r.fence),artifactSha256:r.artifactSha256}}}));if(typeof d.id!=='string'||!d.id)throw Error('preview_result_uncertain');return{id:d.id};},
   async getDeployment({deploymentId,projectId}){project(projectId);const d=dep(await tools.vercelGetDeployment({idOrUrl:deploymentId,teamId:scope.teamId}));return{id:d.id,projectId:d.project?.id,sourceCommit:d.meta?.githubCommitSha,repository:d.meta?.githubOrg&&d.meta?.githubRepo?d.meta.githubOrg+'/'+d.meta.githubRepo:null,target:d.target==='staging'?'preview':d.target,status:d.readyState??d.state,url:d.url};},
   async getDomainDeployment({domain,projectId}){project(projectId);if(!scope.domains.includes(domain))throw Error('foreign_domain');const d=dep(await tools.vercelGetDeployment({idOrUrl:domain,teamId:scope.teamId}));if(typeof d.id!=='string'||d.project?.id!==scope.projectId)throw Error('domain_state_unknown');return{deploymentId:d.id,projectId:d.project.id};},
   async promote(r){mutation();project(r.projectId);if(allowPromotion!==true||typeof r.deploymentId!=='string'||!hex(r.sourceCommit,40)||JSON.stringify([...(r.domains??[])].sort())!==JSON.stringify(scope.domains))throw Error('promotion_not_in_exact_scope');const reply=await tools.vercelPromote({deploymentId:r.deploymentId,projectId:scope.projectId,teamId:scope.teamId});if(reply?.isError)throw Error('promotion_result_uncertain');return{requested:true,verified:false};}
  }
 };
}
