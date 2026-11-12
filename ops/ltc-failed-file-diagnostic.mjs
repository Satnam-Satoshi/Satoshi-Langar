// One fixed protected GET only. Not a stage proof, recovery or retry policy.
import { createHash } from 'node:crypto';
export const FIXED = Object.freeze({
  candidate: 'dpl_4EsXwLjRaNFAZ4NFxufbtMob7BHo',
  hostname: 'https-github-com-satnam-satoshi-satoshi-langar-4lzb3e146.vercel.app',
  project: 'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx', team: 'team_yc5ZBvCbWT2M7iGyj3vQDOzk',
  source: 'b413419180635b34a88b3015944cfaee7a08f742',
  operation: 'stage-2026-11-11-r1-5c986c1983b7e3dfc25b90b1',
  payload: 'bc58fa7035385978ad83f66a5a860f73ea01c29ad7c891ba4f2cc8e16387473b',
  output: '00f19190ebc0189bec233b463f44342fd5eb31739c7ae35877db1295572624f6',
});
export const RECORD = Object.freeze({file:'images/learning/open-road.jpg',sha256:'068685f2205fb733a0ee7a36ec3137e2733f12e228dbba563ad78c32f3b8c63c'});
export const EXPECTED_BYTES = 649269;
const check = (value, code) => { if (!value) throw Error(code); };
const safeErrors = new Set(['acceptance_cli_failed','pinned_cli_version_mismatch','acceptance_protected_read_binding_failed','acceptance_existing_bypass_required','acceptance_project_name_changed','unexpected_artifact_status','invalid_protected_http_response','reviewed_redirect_changed','redirect_target_missing_from_manifest','response_too_large','deployed_artifact_mismatch','diagnostic_transport_unavailable','diagnostic_read_unavailable','diagnostic_response_too_large','diagnostic_invalid_json','diagnostic_scope_changed','diagnostic_command_forbidden','diagnostic_budget_exhausted']);
const safeError = error => safeErrors.has(error?.message) ? error.message : 'diagnostic_check_failed';
const cliCategories = new Set(['native-auth-flag-forwarded','cli-unavailable','cli-timeout','cli-output-limit','cli-exited','cli-execution-failed']);

// Observe only fixed numeric statuses, byte counts and hash equality. Original
// bytes go unchanged to the accepted parser; no headers or body are returned.
export function observeResponse(raw, includeHash = true) {
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw ?? ''), statuses = [];
  let offset=0, firstBody=0;
  while(statuses.length<5){
    const end=bytes.indexOf('\r\n\r\n',offset);if(end<offset||end-offset>65536)break;
    const first=bytes.subarray(offset,end).toString('latin1').split('\r\n')[0];
    const status=/^HTTP\/(?:1\.[01]|2|3) ([1-5]\d\d)(?: [^\r\n]*)?$/.exec(first);if(!status)break;
    statuses.push(Number(status[1]));offset=end+4;if(statuses.length===1)firstBody=offset;
    if(!/^HTTP\/(?:1\.[01]|2|3) /.test(bytes.subarray(offset,offset+16).toString('latin1')))break;
  }
  const hash = start => createHash('sha256').update(bytes.subarray(start)).digest('hex') === RECORD.sha256;
  return {statuses,rateLimitObserved:statuses.includes(429),bodyBytes:statuses.length?bytes.length-offset:null,
    expectedLengthMatches:includeHash&&statuses.length?bytes.length-offset===EXPECTED_BYTES:null,
    parserBodyHashMatches:includeHash&&statuses.length?hash(firstBody):null,finalBodyHashMatches:includeHash&&statuses.length?hash(offset):null};
}

// A diagnostic classification, never evidence that the earlier failed run had
// this cause. Do not echo raw stderr/stdout, URLs, headers, argv or credentials.
export function nativeFailureObservation(error) {
  const stderr=Buffer.isBuffer(error?.stderr)?error.stderr.toString('utf8'):typeof error?.stderr==='string'?error.stderr:'';
  const match=/(?:^|\r?\n)curl: \(([1-9][0-9]{0,2})\)(?: |$)/.exec(stderr.slice(0,65536));
  const code=match?Number(match[1]):null;
  const known={5:'proxy-resolution',6:'host-resolution',7:'connection',16:'http2',18:'partial-transfer',22:'http-error',23:'local-write',28:'curl-timeout',35:'tls-connect',47:'redirect-limit',52:'empty-response',55:'send',56:'receive',60:'certificate',92:'http2-stream',95:'http3'};
  const nativeCurlCode=Object.hasOwn(known,code)?code:null;
  return {category:error?.code==='ETIMEDOUT'?'process-timeout':error?.code==='ENOBUFS'?'process-output-limit':nativeCurlCode?known[nativeCurlCode]:'unclassified',nativeCurlCode};
}

export async function inspectFailedFile({env,directory,createLinkedClient,execute,fetcher=fetch}) {
  check(env.GITHUB_REPOSITORY==='Satnam-Satoshi/Satoshi-Langar'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_ACTOR_ID==='268053325'&&env.GITHUB_RUN_ATTEMPT==='1'&&env.LTC_CLOUD_PUBLISH==='false'&&env.LTC_SOFTWARE_RELEASE_ENABLED==='false'&&env.LTC_VERCEL_CLI_VERSION==='65.9.0','diagnostic_scope_changed');
  const result={schemaVersion:1,kind:'fixed-failed-file-transport-diagnostic',candidate:FIXED.candidate,file:RECORD.file,expectedSha256:RECORD.sha256,expectedBytes:EXPECTED_BYTES,fullStageProof:false,fullManifestVerified:false,recoveryAuthorized:false,journalRead:false,stateChanged:false,effectsReissued:false,priorFailureCauseEstablished:false,probes:[]};
  let active,requests=0,commands=0,dataCommands=0,versions=0;
  const vercel=async endpoint=>{
    check([`/v13/deployments/${FIXED.candidate}`,`/v9/projects/${FIXED.project}`].includes(endpoint),'diagnostic_scope_changed');check(++requests<=2,'diagnostic_budget_exhausted');
    active.phase=endpoint.startsWith('/v13/')?'deployment-identity':'existing-project-bypass';
    let response;try{response=await fetcher(`https://api.vercel.com${endpoint}?teamId=${FIXED.team}`,{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${env.VERCEL_TOKEN}`,Accept:'application/json'}});}catch{throw Error('diagnostic_transport_unavailable');}
    active.managementStatus=Number.isInteger(response.status)&&response.status>=100&&response.status<=599?response.status:null;
    check(response.status===200&&!response.redirected&&response.body,'diagnostic_read_unavailable');
    const reader=response.body.getReader(),chunks=[];let length=0;
    try{while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;check(length<=2000000,'diagnostic_response_too_large');chunks.push(part.value);}}finally{await reader.cancel().catch(()=>{});}
    let data;try{data=JSON.parse(Buffer.concat(chunks));}catch{throw Error('diagnostic_invalid_json');}
    if(endpoint.startsWith('/v13/'))check(data.id===FIXED.candidate&&data.url===FIXED.hostname&&data.meta?.ltcOperationId===FIXED.operation&&data.meta.ltcPayloadSha256===FIXED.payload&&data.meta.ltcSourceCommit===FIXED.source&&data.meta.ltcBuildOutputSha256===FIXED.output,'diagnostic_scope_changed');
    return data;
  };
  const boundedExecute=(binary,args,options)=>{
    check(binary==='vercel','diagnostic_command_forbidden');check(++commands<=2,'diagnostic_budget_exhausted');
    const version=JSON.stringify(args)===JSON.stringify(['--version']);
    if(version)check(++versions===1,'diagnostic_budget_exhausted');
    else {const expected=['curl',`https://${FIXED.hostname}/${RECORD.file}`,'--','--include','--silent','--show-error','--max-time','30','--max-redirs','0','--proto','=https'];check(JSON.stringify(args)===JSON.stringify(expected),'diagnostic_command_forbidden');check(++dataCommands===1,'diagnostic_budget_exhausted');active.phase='protected-get';}
    const started=Date.now();
    try {const raw=execute(binary,args,{...options,timeout:version?10000:45000,maxBuffer:version?100000:13*1024*1024});
      if(!version){active.response=observeResponse(raw);active.phase='accepted-parser';}return raw;
    } catch(error){active.nativeFailure=nativeFailureObservation(error);
      if(Buffer.isBuffer(error?.stdout)||typeof error?.stdout==='string')active.partialResponse=observeResponse(error.stdout,false);throw error;
    } finally {active.elapsedMs=Math.max(0,Math.min(60000,Date.now()-started));}
  };
  const client=createLinkedClient({env:{...env,LTC_VERCEL_CLI:'vercel'},vercel,directory,execute:boundedExecute,report:async diagnostic=>{
    if(['version','protected-read'].includes(diagnostic.operation)&&cliCategories.has(diagnostic.category))active.safeCliFailure={operation:diagnostic.operation,category:diagnostic.category,exitStatus:Number.isInteger(diagnostic.exitStatus)&&diagnostic.exitStatus>=0&&diagnostic.exitStatus<=255?diagnostic.exitStatus:null};
  }});
  active={probe:'cli-version',phase:'cli-version'};result.probes.push(active);
  try{await client.verifyVersion();active.passed=true;}catch(error){active.passed=false;active.error=safeError(error);result.managementGets=requests;result.cliCalls=commands;return result;}
  active={probe:RECORD.file,phase:'manifest-check'};result.probes.push(active);
  try{await client.readProtected({id:FIXED.candidate,url:FIXED.hostname},[RECORD],[RECORD]);active.passed=true;}catch(error){active.passed=false;active.error=safeError(error);}
  result.managementGets=requests;result.cliCalls=commands;return result;
}
