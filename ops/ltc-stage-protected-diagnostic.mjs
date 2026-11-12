// Fixed incident probe, never a full stage proof or recovery authorization.
import { createHash } from 'node:crypto';
export const FIXED = Object.freeze({
  candidate: 'dpl_4EsXwLjRaNFAZ4NFxufbtMob7BHo',
  hostname: 'https-github-com-satnam-satoshi-satoshi-langar-4lzb3e146.vercel.app',
  project: 'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx', team: 'team_yc5ZBvCbWT2M7iGyj3vQDOzk',
});
export const RECORDS = Object.freeze([
  {file:'index.html',sha256:'3a71f6769eb5b94e73b56a5f97ba02f3c5a3e5c27e10ee51cb8881fe7de533ce'},
  {file:'brand/ltc-avatar.png',sha256:'8c351a09fcb677cc639c73bcace632df66c05e4972e0f4a45d6e0cfa1ae951fa'},
  {file:'conversations/specials/litecoin-at-15/1/index.html',sha256:'b131d9943ac1a7b661c1b77ffbbf8efe7e525d93b7525bfe273431c425dc8fd2'},
]);
export const API_ROUTES = Object.freeze(['/api/market-prices','/api/litecoin-chain','/api/litecoin-register','/api/morpho-markets']);
export const CANONICAL_RECORD = Object.freeze({file:'conversations/specials/proof-of-birthday/index.html',sha256:'ea8ba32bfa1b63ae05d8c99e24407adeeda72c9cf888bf68e4a9847c6d651bb6'});
const canonical = '/conversations/specials/proof-of-birthday/';
const routes = ['/', '/brand/ltc-avatar.png', '/conversations/specials/litecoin-at-15/1/', canonical, ...API_ROUTES];
const check = (value, code) => { if (!value) throw Error(code); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const safeErrors = new Set(['acceptance_cli_failed','pinned_cli_version_mismatch','acceptance_protected_read_binding_failed','acceptance_existing_bypass_required','acceptance_project_name_changed','unexpected_artifact_status','invalid_protected_http_response','reviewed_redirect_changed','redirect_target_missing_from_manifest','response_too_large','deployed_artifact_mismatch','software_api_invalid','diagnostic_transport_unavailable','diagnostic_read_unavailable','diagnostic_response_too_large','diagnostic_invalid_json','diagnostic_scope_changed','diagnostic_command_forbidden','diagnostic_budget_exhausted']);
const safeError = error => safeErrors.has(error?.message) ? error.message : 'diagnostic_check_failed';

// Inspect, but never normalize away, a proxy/informational header block. The
// original response bytes still go unchanged to the accepted production parser.
export function headerObservation(raw, expectedHash) {
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw), blocks = [];
  let offset=0, firstBody=0;
  while (blocks.length < 5) {
    const end=bytes.indexOf('\r\n\r\n',offset);
    if(end<offset || end-offset>65536) break;
    const lines=bytes.subarray(offset,end).toString('latin1').split('\r\n');
    const status=/^HTTP\/(?:1\.[01]|2|3) ([1-5]\d\d)(?: [^\r\n]*)?$/.exec(lines[0]);
    if(!status) break;
    const locations=lines.slice(1).filter(line=>/^location:/i.test(line));
    blocks.push({status:Number(status[1]),locationPresent:locations.length>0,locationMatchesCanonical:locations.length===1 && locations[0].replace(/^location:\s*/i,'')===canonical,jsonContentType:lines.some(line=>/^content-type:\s*application\/json(?:;|$)/i.test(line))});
    offset=end+4; if(blocks.length===1)firstBody=offset;
    if(!/^HTTP\/(?:1\.[01]|2|3) /.test(bytes.subarray(offset,offset+16).toString('latin1')))break;
  }
  return {headerChain:blocks,parserBodyHashMatches:expectedHash ? hash(bytes.subarray(firstBody))===expectedHash : null,finalBodyHashMatches:expectedHash ? hash(bytes.subarray(offset))===expectedHash : null};
}

export async function inspectProtectedStage({env, directory, createLinkedClient, validateApi, execute, fetcher=fetch}) {
  check(env.GITHUB_REPOSITORY==='Satnam-Satoshi/Satoshi-Langar' && env.GITHUB_REF==='refs/heads/main' && env.GITHUB_EVENT_NAME==='workflow_dispatch' && env.GITHUB_ACTOR_ID==='268053325' && env.GITHUB_RUN_ATTEMPT==='1' && env.LTC_CLOUD_PUBLISH==='false' && env.LTC_SOFTWARE_RELEASE_ENABLED==='false' && env.LTC_VERCEL_CLI_VERSION==='65.9.0','diagnostic_scope_changed');
  const result={schemaVersion:1,kind:'fixed-stage-protected-partial-diagnostic',candidate:FIXED.candidate,fullStageProof:false,fullManifestVerified:false,recoveryAuthorized:false,journalRead:false,stateChanged:false,effectsReissued:false,probes:[]};
  let active, requests=0, commands=0;
  const vercel=async endpoint=>{
    check([`/v13/deployments/${FIXED.candidate}`,`/v9/projects/${FIXED.project}`].includes(endpoint),'diagnostic_scope_changed');
    check(++requests<=16,'diagnostic_budget_exhausted');
    active.phase=endpoint.startsWith('/v13/')?'deployment-identity':'existing-project-bypass';
    let response;try{response=await fetcher(`https://api.vercel.com${endpoint}?teamId=${FIXED.team}`,{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${env.VERCEL_TOKEN}`,Accept:'application/json'}});}catch{throw Error('diagnostic_transport_unavailable');}
    check(response.status===200&&!response.redirected&&response.body,'diagnostic_read_unavailable');
    const reader=response.body.getReader(),chunks=[];let length=0;
    try{while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;check(length<=2000000,'diagnostic_response_too_large');chunks.push(part.value);}}finally{await reader.cancel().catch(()=>{});}
    let data;try{data=JSON.parse(Buffer.concat(chunks));}catch{throw Error('diagnostic_invalid_json');}
    if(endpoint.startsWith('/v13/'))check(data.id===FIXED.candidate&&data.url===FIXED.hostname,'diagnostic_scope_changed');
    return data;
  };
  const boundedExecute=(binary,args,options)=>{
    check(binary==='vercel','diagnostic_command_forbidden');
    check(++commands<=9,'diagnostic_budget_exhausted');
    if(JSON.stringify(args)===JSON.stringify(['--version']))return execute(binary,args,{...options,timeout:10000,maxBuffer:100000});
    const expected=['curl',args[1],'--','--include','--silent','--show-error','--max-time','30','--max-redirs','0','--proto','=https'];
    check(JSON.stringify(args)===JSON.stringify(expected)&&routes.some(route=>args[1]===`https://${FIXED.hostname}${route}`),'diagnostic_command_forbidden');
    active.phase='protected-get';
    const raw=execute(binary,args,{...options,timeout:45000,maxBuffer:13*1024*1024});
    active.responses.push(headerObservation(raw,args[1]===`https://${FIXED.hostname}${canonical}` ? CANONICAL_RECORD.sha256 : args[1].includes('/litecoin-at-15/') ? undefined : active.expectedHash));active.phase='accepted-parser';
    return raw;
  };
  const client=createLinkedClient({env:{...env,LTC_VERCEL_CLI:'vercel'},vercel,directory,execute:boundedExecute,report:async()=>{}});
  active={probe:'cli-version',phase:'cli-version',responses:[]};result.probes.push(active);
  try{await client.verifyVersion();active.passed=true;}catch(error){active.passed=false;active.error=safeError(error);return result;}
  const declaration={id:FIXED.candidate,url:FIXED.hostname};
  for(const record of RECORDS){
    active={probe:record.file,phase:'manifest-check',responses:[],expectedHash:record.sha256};result.probes.push(active);
    try{await client.readProtected(declaration,[record],[...RECORDS,CANONICAL_RECORD]);active.passed=true;}catch(error){active.passed=false;active.error=safeError(error);}delete active.expectedHash;
  }
  for(const route of API_ROUTES){
    active={probe:route,phase:'api-check',responses:[]};result.probes.push(active);
    try{const raw=await client.readProtectedApi(declaration,route);validateApi(raw);active.passed=true;}catch(error){active.passed=false;active.error=safeError(error);}
  }
  result.managementGets=requests;result.cliCalls=commands;return result;
}
