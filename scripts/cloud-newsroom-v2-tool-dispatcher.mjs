/** Explicit agent-runtime callback composition, NOT a standalone MCP client.
 * Only reviewed code may instantiate this factory with approved authenticated
 * callbacks. There is no credential lookup, arbitrary tool dispatch or retry.
 * Preview methods never promote. Production requires separate independently
 * configured request loader, archive policy and archive adapter plus coordinator gates.
 */
import {createCloudNewsroomV2JournalInventory,JOURNAL_INVENTORY_PATH} from './cloud-newsroom-v2-journal-inventory.mjs';
import {randomUUID} from 'node:crypto';
import {createCloudNewsroomV2PublicationRunner} from './cloud-newsroom-v2-publication-runner.mjs';
import {createCloudNewsroomV2ConnectorAdapters,V2_CONNECTOR_SCOPE as S} from './cloud-newsroom-v2-connector-adapters.mjs';
import {createCloudNewsroomV2Coordinator} from './cloud-newsroom-v2-coordinator.mjs';
import {createCloudNewsroomV2HttpQa} from './cloud-newsroom-v2-http-qa.mjs';
import {createCloudNewsroomV2LibraryTransport} from './cloud-newsroom-v2-library-transport.mjs';
import {createCloudNewsroomV2LibraryQaArchive} from './cloud-newsroom-v2-library-qa-archive.mjs';
export const DISPATCHER_TOOL_NAMES=Object.freeze(['githubFetch','githubFetchFile','githubCreateBlob','githubCreateTree','githubCreateCommit','githubUpdateRef','githubUpdateFile','vercelCreateDeployment','vercelGetDeployment','vercelPromote']);
const writes=new Set(['githubCreateBlob','githubCreateTree','githubCreateCommit','githubUpdateRef','githubUpdateFile','vercelCreateDeployment','vercelPromote']);
const hex=(x,n)=>typeof x==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(x);
const path=x=>typeof x==='string'&&x.length<=500&&/^[A-Za-z0-9_./@+\[\]-]+$/.test(x)&&!x.startsWith('/')&&!x.split('/').some(v=>!v||v==='.'||v==='..'||v.toLowerCase()==='.git');
const exact=(a,keys)=>a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).every(k=>keys.includes(k));
function scoped(op,a){
 if(op==='githubFetch'){
  if(!exact(a,['url'])||typeof a.url!=='string')return false;
  const base=`https://api.github.com/repos/${S.repository}/git/`;
  return a.url===base+'ref/heads/'+S.branch||new RegExp('^'+base.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:commits/[a-f0-9]{40}|trees/[a-f0-9]{40}\\?recursive=1)$').test(a.url);
 }
 if(op.startsWith('github')){
  if(a?.repository_full_name!==S.repository)return false;
  if(op==='githubFetchFile')return exact(a,['repository_full_name','ref','path','encoding'])&&((a.ref===S.stateBranch&&[S.statePath,JOURNAL_INVENTORY_PATH].includes(a.path)&&a.encoding==='utf-8')||(hex(a.ref,40)&&path(a.path)&&a.encoding==='base64'));
  if(op==='githubCreateBlob')return exact(a,['repository_full_name','encoding','content'])&&a.encoding==='base64'&&typeof a.content==='string'&&a.content.length<=44739244&&/^[A-Za-z0-9+/]*={0,2}$/.test(a.content);
  if(op==='githubCreateTree')return exact(a,['repository_full_name','base_tree_sha','tree_elements'])&&hex(a.base_tree_sha,40)&&Array.isArray(a.tree_elements)&&a.tree_elements.length===5&&a.tree_elements.every(e=>exact(e,['path','mode','type','sha'])&&path(e.path)&&e.mode==='100644'&&e.type==='blob'&&hex(e.sha,40));
  if(op==='githubCreateCommit')return exact(a,['repository_full_name','tree_sha','parent_sha','additional_parent_shas','message'])&&hex(a.tree_sha,40)&&hex(a.parent_sha,40)&&Array.isArray(a.additional_parent_shas)&&!a.additional_parent_shas.length&&typeof a.message==='string'&&/^Cloud newsroom v2 immutable edition \d{4}-\d{2}-\d{2}-r[1-9][0-9]*$/.test(a.message);
  if(op==='githubUpdateRef')return exact(a,['repository_full_name','branch_name','sha','expected_sha','force'])&&a.branch_name===S.branch&&hex(a.sha,40)&&hex(a.expected_sha,40)&&a.force===false;
  if(op==='githubUpdateFile'){
   if(!exact(a,['repository_full_name','branch','path','sha','message','content'])||a.branch!==S.stateBranch||!hex(a.sha,40)||typeof a.content!=='string'||Buffer.byteLength(a.content)>24*1024)return false;
   if(a.path===S.statePath)return a.message==='Cloud newsroom v2 coordinated state transition';
   if(a.path!==JOURNAL_INVENTORY_PATH||a.message!=='Reserve cloud newsroom v2 journal identity before effect')return false;
   try{const v=JSON.parse(a.content),j=v.journalInventory;
    return exact(v,['schemaVersion','generation','journalInventory'])&&v.schemaVersion===1&&v.generation==='cloud-newsroom-v2-journal-inventory'&&exact(j,['schemaVersion','roots'])&&j.schemaVersion===1&&j.roots&&typeof j.roots==='object'&&!Array.isArray(j.roots)&&Object.keys(j.roots).length<=16&&Object.entries(j.roots).every(([id,r])=>hex(id,64)&&exact(r,['id','keys'])&&r.id===id&&r.keys&&typeof r.keys==='object'&&!Array.isArray(r.keys)&&Object.keys(r.keys).length<=128&&Object.entries(r.keys).every(([key,value])=>hex(key,64)&&value===true));
   }catch{return false;}
  }
 }
 if(op==='vercelPromote')return exact(a,['deploymentId','projectId','teamId'])&&a.projectId===S.projectId&&a.teamId===S.teamId&&/^dpl_[A-Za-z0-9_-]{1,160}$/.test(a.deploymentId??'');
 if(op==='vercelGetDeployment')return exact(a,['idOrUrl','teamId'])&&a.teamId===S.teamId&&(S.domains.includes(a.idOrUrl)||/^dpl_[A-Za-z0-9_-]{1,160}$/.test(a.idOrUrl??''));
 if(op==='vercelCreateDeployment'){
  const b=a?.requestBody,g=b?.gitSource;
  return exact(a,['teamId','requestBody'])&&a.teamId===S.teamId&&exact(b,['name','project','target','gitSource','meta'])&&b.name==='https-github-com-satnam-satoshi-satoshi-langar'&&b.project===S.projectId&&b.target==='staging'&&exact(g,['type','repoId','ref','sha'])&&g.type==='github'&&g.repoId===S.repositoryId&&g.ref===S.branch&&hex(g.sha,40)&&exact(b.meta,['purpose','runId','fence','artifactSha256'])&&b.meta?.purpose==='cloud-newsroom-v2-preview';
 }
 return false;
}
/** tools: exact DISPATCHER_TOOL_NAMES, official MCP arguments/results unchanged.
 * libraryTransport: existing archive contract createOwnedRoot/list/materialize;
 * materialize must run official helper then read actual bytes+xattrs, not metadata.
 * loadQaPlan(identity): trusted receipt+criticalRoutes+previewHostname+fixed domains.
 * httpTransport.read: existing bounded no-redirect byte QA contract.
 * publication: {loadTrust,readArtifact,journal,prepareCandidateObservation?,repoRoot?,
 * observeCandidate?}. Source trust/evidence must be independently supplied, not
 * producer assertions. Explicit checkout hook may bind reviewed isolated helper.
 * allowEffects controls connectors/archive; publicationPermissions independently
 * controls staging/ref/preview. Both default off. Production is a separate
 * independently loaded run request and explicit archive-policy/backend path.
 */
export function createCloudNewsroomV2ToolDispatcher({tools,clock,grantObserver,loadQaPlan,httpTransport,libraryTransport,publication,allowEffects=false,publicationPermissions={},production=null}={}){
 if(typeof clock!=='function'||typeof grantObserver!=='function'||typeof loadQaPlan!=='function'||typeof httpTransport?.read!=='function')throw Error('explicit_runtime_dependencies_required');
 if(!tools||Object.keys(tools).some(k=>!DISPATCHER_TOOL_NAMES.includes(k))||DISPATCHER_TOOL_NAMES.some(k=>typeof tools[k]!=='function'))throw Error('exact_approved_tool_map_required');
 const call=async(op,args)=>{
  if(!DISPATCHER_TOOL_NAMES.includes(op)||!scoped(op,args))throw Error('operation_outside_fixed_scope');
  if(op==='vercelPromote')throw Error('production_dispatch_requires_separate_gate');
  if(writes.has(op)&&allowEffects!==true)throw Error('effects_disabled');
  // Unknown outcomes propagate once to durable coordinator/transport intents.
  const reply=await tools[op](structuredClone(args));
  if(reply?.structuredContent?.result&&typeof reply.structuredContent.result==='object'&&!reply.structuredContent.error)return {...reply,structuredContent:reply.structuredContent.result};
  return reply;
 };
 const callbacks=Object.fromEntries(DISPATCHER_TOOL_NAMES.map(op=>[op,args=>call(op,args)]));
 callbacks.vercelPromote=async()=>{throw Error('nonproduction_dispatcher_never_promotes');};
 const archive=createCloudNewsroomV2LibraryQaArchive({mode:'test-only',transport:Object.fromEntries(['createOwnedRoot','list','materialize'].map(k=>[k,async args=>{if(allowEffects!==true)throw Error('archive_effects_disabled');if(typeof libraryTransport?.[k]!=='function')throw Error('explicit_library_adapter_required');return libraryTransport[k](args); }]))});
 let adapters;
 const verify=async(kind,request)=>{
  const plan=await loadQaPlan(structuredClone(request));
  if(plan?.projectId!==S.projectId||JSON.stringify([...(plan?.domains??[])].sort())!==JSON.stringify([...S.domains].sort()))throw Error('qa_scope_mismatch');
  const d=await adapters.provider.getDeployment({deploymentId:request.deploymentId,projectId:S.projectId});
  if(d.id!==request.deploymentId||d.projectId!==S.projectId||d.sourceCommit!==request.sourceCommit||d.repository!==S.repository||d.target!==(kind==='verify'?'preview':'production')||d.status!=='READY'||d.url!==plan.previewHostname)throw Error('qa_provider_binding_mismatch');
  return createCloudNewsroomV2HttpQa({transport:httpTransport,clock,trustedPlan:plan})[kind](request);
 };
 adapters=createCloudNewsroomV2ConnectorAdapters({tools:callbacks,clock,allowMutations:allowEffects===true,allowPromotion:false,grantObserver,qaVerifier:{verify:r=>verify('verify',r),verifyPublic:r=>verify('verifyPublic',r)},qaArchive:archive});
 const productionReady=allowEffects===true&&production?.enabled===true&&production.repository===S.repository&&production.projectId===S.projectId&&JSON.stringify([...(production.domains??[])].sort())===JSON.stringify([...S.domains].sort())&&production.archivePolicy?.kind==='owned-library-limited-assurance'&&production.archivePolicy.accepted===true&&production.archivePolicy.accessAssurance==='owned-root-create-no-sharing-in-workflow'&&production.archivePolicy.aclVerified===false&&production.archivePolicy.worm===false&&production.archivePolicy.retention==='subject-to-account-policy'&&typeof production.loadBoundRequest==='function'&&typeof production.archive?.persistQa==='function';
 const productionAdvance=async({runId}={})=>{
  if(!productionReady)return {status:'hold',reason:'production_disabled_or_independent_archive_policy_missing',promotionAuthorized:false};
  if(typeof runId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(runId))return {status:'hold',reason:'run_id_required',promotionAuthorized:false};
  const request=await production.loadBoundRequest({runId});
  if(request?.runId!==runId)return {status:'hold',reason:'independent_run_identity_mismatch',promotionAuthorized:false};
  const prodTools={...callbacks,vercelPromote:async args=>{if(!scoped('vercelPromote',args))throw Error('production_scope_mismatch');return tools.vercelPromote(structuredClone(args));}};
  const prodAdapters=createCloudNewsroomV2ConnectorAdapters({tools:prodTools,clock,allowMutations:true,allowPromotion:true,grantObserver,qaVerifier:{verify:r=>verify('verify',r),verifyPublic:r=>verify('verifyPublic',r)},qaArchive:production.archive});
  return createCloudNewsroomV2Coordinator(prodAdapters).advance(request);
 };
 const runner=createCloudNewsroomV2PublicationRunner({...publication,clock,gitTools:callbacks,coordinatorAdapters:adapters,permissions:allowEffects===true?publicationPermissions:{}});
 let busy=false;
 const exclusive=fn=>async input=>{if(busy)return {status:'hold',reason:'dispatcher_call_in_progress',promotionAuthorized:false};busy=true;try{return await fn(input);}finally{busy=false;}};
 return Object.freeze({advancePublication:exclusive(r=>runner.advance(r)),reconcilePublication:exclusive(r=>runner.reconcile(r)),advanceCoordinator:exclusive(r=>{const request=structuredClone(r);delete request.approval;return createCloudNewsroomV2Coordinator(adapters).advance(request);}),advanceProduction:exclusive(productionAdvance),mode:'preview-default-production-separately-gated',promotionAuthorized:false});
}

/** Bounded Node↔agent process bridge for approved callbacks only. The agent reads
 * emitted JSON and invokes its already available exact tools via functions; Node
 * cannot import tools. No generic HTTP operation is exposed. Independent trust,
 * HTTP byte transport and checkout preparation remain local reviewed dependencies.
 * Library callbacks must implement the documented actual tool+official-helper
 * sequence, not return metadata claims in place of bytes/xattrs.
 */
export function createCloudNewsroomV2ToolRpc({send,allowEffects=false,allowPromotion=false,timeoutMs=120000,libraryWorkRoot=null}={}){
 if(typeof send!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw Error('rpc_configuration');
 const names=[...DISPATCHER_TOOL_NAMES,'libraryCreateAndApply','libraryListOwnedRoot','libraryMaterializeAndObserve'];
 const normalizedAbsolute=p=>typeof p==='string'&&p.startsWith('/')&&!p.includes('\\')&&!p.includes('\0')&&p.length<=1000&&p.split('/').slice(1).every(v=>v&&v!=='.'&&v!=='..');
 if(libraryWorkRoot!==null&&!normalizedAbsolute(libraryWorkRoot))throw Error('rpc_library_workroot_invalid');
 const qaName=n=>typeof n==='string'&&/^ltc-qa-[a-f0-9]{64}\.json$/.test(n);
 const id=(v,prefix)=>typeof v==='string'&&new RegExp('^'+prefix+'[A-Za-z0-9_-]{1,200}$').test(v);
 const libraryScope=(operation,a)=>{
  if(operation==='libraryListOwnedRoot')return JSON.stringify(a)===JSON.stringify({surface:'library',library_path:'/',recursive:false,limit:200,sort:'created_at',sort_order:'desc'});
  if(!libraryWorkRoot)return false;
  if(operation==='libraryCreateAndApply')return exact(a,['file','library_artifact_type'])&&a.library_artifact_type==='other'&&normalizedAbsolute(a.file)&&a.file.startsWith(libraryWorkRoot+'/')&&qaName(a.file.slice(libraryWorkRoot.length+1));
  if(operation!=='libraryMaterializeAndObserve'||!exact(a,['items','destination','created'])||!Array.isArray(a.items)||a.items.length!==1||!exact(a.destination,['directory'])||!normalizedAbsolute(a.destination.directory)||!a.destination.directory.startsWith(libraryWorkRoot+'/readback-')||a.destination.directory.slice(libraryWorkRoot.length+1).includes('/'))return false;
  const item=a.items[0],c=a.created;
  return exact(item,['file_id','file_name','library_file_id'])&&id(item.file_id,'file_')&&id(item.library_file_id,'libfile_')&&qaName(item.file_name)&&exact(c,['operation','status','path','file_id','library_file_id','file_name','current_version_number','restored_from_version_number','xattrs','directory_id','mime_type','library_artifact_type','file_size_bytes','external_connectors_accessed'])&&c.operation==='create_library_file'&&c.status==='succeeded'&&c.file_id===item.file_id&&c.library_file_id===item.library_file_id&&c.file_name===item.file_name&&c.path==='/'+item.file_name&&c.current_version_number===0&&c.restored_from_version_number===null&&id(c.directory_id,'libdir_')&&c.mime_type==='application/json'&&c.library_artifact_type==='other'&&Number.isSafeInteger(c.file_size_bytes)&&c.file_size_bytes>0&&c.file_size_bytes<=4*1024*1024&&c.external_connectors_accessed===false&&JSON.stringify(c.xattrs)===JSON.stringify([{name:'user.library-file-version',value:'0'}]);
 };

 const modifying=new Set([...writes,'libraryCreateAndApply','libraryMaterializeAndObserve']);
 const pending=new Map();const session=randomUUID();let serial=0,closed=false,uncertain=false;
 const max=48*1024*1024;
 const call=(operation,args)=>new Promise((resolve,reject)=>{
  if(closed||!names.includes(operation))return reject(Error('rpc_closed_or_unknown'));
  if(DISPATCHER_TOOL_NAMES.includes(operation)&&!scoped(operation,args))return reject(Error('rpc_operation_outside_fixed_scope'));
  if(operation.startsWith('library')&&!libraryScope(operation,args))return reject(Error('rpc_library_outside_fixed_scope'));
  if(modifying.has(operation)&&(allowEffects!==true||uncertain)||operation==='vercelPromote'&&allowPromotion!==true)return reject(Error('rpc_effect_denied_or_uncertain'));
  const id='ltc-v2-'+session+'-'+(++serial),wire=JSON.stringify({schemaVersion:1,kind:'ltc-v2-tool-request',id,operation,args});
  if(Buffer.byteLength(wire)>max)return reject(Error('rpc_request_bounds'));
  const unknown=()=>{pending.delete(id);if(modifying.has(operation))uncertain=true;reject(Error('rpc_result_unknown_no_retry'));};
  const timer=setTimeout(unknown,timeoutMs);pending.set(id,{resolve,reject,timer,operation});
  try{send(wire);}catch{clearTimeout(timer);unknown();}
 });
 const receive=line=>{
  if(typeof line!=='string'||Buffer.byteLength(line)>max)throw Error('rpc_response_bounds');
  const r=JSON.parse(line),p=pending.get(r.id);
  if(r.schemaVersion!==1||r.kind!=='ltc-v2-tool-response'||Object.keys(r).sort().join(',')!=='id,kind,result,schemaVersion'||!p)throw Error('rpc_unknown_or_replayed_response');
  clearTimeout(p.timer);pending.delete(r.id);p.resolve(r.result);
 };
 const close=()=>{closed=true;for(const p of pending.values()){clearTimeout(p.timer);if(modifying.has(p.operation))uncertain=true;p.reject(Error('rpc_closed_result_unknown_no_retry'));}pending.clear();};
 return Object.freeze({tools:Object.freeze(Object.fromEntries(DISPATCHER_TOOL_NAMES.map(k=>[k,a=>call(k,a)]))),libraryCallbacks:Object.freeze({createAndApply:a=>call('libraryCreateAndApply',a),listOwnedRoot:a=>call('libraryListOwnedRoot',a),materializeAndObserve:a=>call('libraryMaterializeAndObserve',a)}),receive,close,operations:Object.freeze(names),status:()=>({closed,uncertain,pending:pending.size})});
}


/** Binds the real private Library transport without touching disk at construction.
 * callbacks can be rpc.libraryCallbacks from createCloudNewsroomV2ToolRpc.
 * They execute actual approved tools in the agent, then the official-helper local
 * recipe. Unknown upload outcomes stay in the durable effect journal. No retries.
 * Production archive requires explicit archiveMode production-limited-assurance
 * and the exact independently accepted archivePolicy. Missing mode holds production.
 */
export function createCloudNewsroomV2DispatcherWithLibraryCallbacks({library,...options}={}){
 if(!library||typeof library.workRoot!=='string'||typeof library.journal?.runOnce!=='function'||['createAndApply','listOwnedRoot','materializeAndObserve'].some(k=>typeof library.callbacks?.[k]!=='function'))throw Error('explicit_private_library_callback_configuration');
 let initialized;
 // Rehydrated from createOwnedRoot's durable runOnce result on EVERY archive
 // attempt, including a later wake. Never infer the original row from item IDs.
 const createdRows=new Map();
 const materializeAndObserve=async args=>{
  const item=args?.items?.[0],key=item?.library_file_id+'|'+item?.file_id,created=createdRows.get(key);
  if(args?.items?.length!==1||!created||created.file_name!==item.file_name)throw Error('durably_replayed_original_create_required');
  return library.callbacks.materializeAndObserve({...args,created:structuredClone(created)});
 };
 const transport=()=>{if(options.allowEffects!==true)throw Error('library_effects_disabled');return initialized??=createCloudNewsroomV2LibraryTransport({workRoot:library.workRoot,journal:library.journal,...library.callbacks,materializeAndObserve});};
 const archiveTransport={
  createOwnedRoot:async a=>{const created=await (await transport()).createOwnedRoot(a);createdRows.set(created.library_file_id+'|'+created.file_id,structuredClone(created));return created;},
  list:async a=>(await transport()).list(a),materialize:async a=>(await transport()).materialize(a)
 };
 // Dormant production archive is a separately named mode with exact policy. It
 // shares durable official callbacks, never a secretly reused test-only factory.
 let production=options.production?{...options.production,archive:undefined}:undefined;
 if(production?.archiveMode==='production-limited-assurance')production.archive=createCloudNewsroomV2LibraryQaArchive({mode:'production-limited-assurance',acceptancePolicy:production.archivePolicy,transport:archiveTransport});
 return createCloudNewsroomV2ToolDispatcher({...options,production,libraryTransport:archiveTransport});
}

/** Fixed read-only live wiring probe. Agent operation map:
 * githubFetchFile -> tools.mcp__codex_apps__github_fetch_file(args)
 * vercelGetDeployment -> tools.mcp__codex_apps__vercel_get_deployment(args)
 * Discover exact installed names before binding; never construct arbitrary names.
 * vercelPromote -> official Vercel request_promote tool (never create_deployment
 * target production). Discover its exact installed tool name before binding.
 * Other dispatcher operations map one-to-one to official GitHub/Vercel tools.
 * Library callbacks are compound official tool + private local helper operations,
 * NOT direct MCP tool names. No callback is operational until an agent runs it.
 */
export async function runCloudNewsroomV2ReadOnlyProbe(rpc){
 const parse=r=>{if(r?.isError)throw Error('probe_connector_error');let p=r?.structuredContent;if(!p)for(const x of r?.content??[])if(x.type==='text'){try{p=JSON.parse(x.text);break;}catch{}}if(!p||p.error)throw Error('probe_unknown_result');return p.result??p;};
 const rawState=parse(await rpc.tools.githubFetchFile({repository_full_name:S.repository,ref:S.stateBranch,path:S.statePath,encoding:'utf-8'}));
 if(rawState.encoding!=='utf-8'||!hex(rawState.sha,40)||typeof rawState.content!=='string'||Buffer.byteLength(rawState.content)>24*1024)throw Error('probe_state_shape');
 const state=JSON.parse(rawState.content);if(state.schemaVersion!==1||state.generation!=='cloud-newsroom-v2')throw Error('probe_state_namespace');
 const rawDeployment=parse(await rpc.tools.vercelGetDeployment({idOrUrl:'ltcmagazine.org',teamId:S.teamId})),d=rawDeployment.deployment??rawDeployment;
 if(typeof d.id!=='string'||d.project?.id!==S.projectId)throw Error('probe_alias_shape');
 return {status:'read-only-callbacks-observed',stateBlob:rawState.sha,enabled:state.enabled===true,previewEnabled:state.previewEnabled===true,publicationEnabled:state.publicationEnabled===true,alias:'ltcmagazine.org',deploymentId:d.id,readyState:d.readyState??d.state,effects:[],activationPerformed:false};
}

// Only explicit fixed read-only mode has a CLI. No activation flags or user URLs.
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length!==3||process.argv[2]!=='--read-only-probe')throw Error('usage: --read-only-probe');
 const rpc=createCloudNewsroomV2ToolRpc({send:line=>process.stdout.write(line+'\n')});
 const input=createInterface({input:process.stdin,crlfDelay:Infinity});
 input.on('line',line=>{try{rpc.receive(line);}catch{rpc.close();input.close();}});
 input.on('close',()=>rpc.close());
 try{const result=await runCloudNewsroomV2ReadOnlyProbe(rpc);process.stdout.write(JSON.stringify({schemaVersion:1,kind:'ltc-v2-tool-result',result})+'\n');}
 catch{process.stdout.write(JSON.stringify({schemaVersion:1,kind:'ltc-v2-tool-result',result:{status:'hold',reason:'read-only-probe-unverified',effects:[]}})+'\n');process.exitCode=1;}
 finally{rpc.close();input.close();}
}

/** Separate public-safe hash inventory for private journal roots/keys. The existing
 * adapter owns read/conditional-write/readback and append behavior. Fixed path,
 * not coordinator state. Constructor alone performs no calls or initialization.
 */
export function createCloudNewsroomV2RpcJournalInventory({rpc,namespace,allowEffects=false}){
 const normalize=r=>r?.structuredContent?.result&&!r.structuredContent.error?{...r,structuredContent:r.structuredContent.result}:r;
 return createCloudNewsroomV2JournalInventory({namespace,allowMutations:allowEffects===true,tools:{githubFetchFile:async a=>normalize(await rpc.tools.githubFetchFile(a)),githubUpdateFile:async a=>normalize(await rpc.tools.githubUpdateFile(a))}});
}
