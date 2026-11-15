import {readFile,lstat,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const check=(v,c)=>{if(!v)throw Error('inspection_cli_'+c);};
const hash=x=>createHash('sha256').update(x).digest('hex');
export const INSPECTION_SOURCE_FILES=Object.freeze(["scripts/cloud-ltc-docs-state.mjs", "scripts/cloud-ltc-evidence.mjs", "scripts/cloud-ltc-f33-readonly-cli.mjs", "scripts/cloud-ltc-f33-readonly.mjs", "scripts/cloud-ltc-google-auth.mjs", "scripts/cloud-ltc-google-client.mjs", "scripts/cloud-ltc-google-runtime.mjs", "scripts/cloud-ltc-native-inspection-authority.mjs", "scripts/cloud-ltc-receipt-provenance-lookup.mjs", "scripts/cloud-ltc-receipt-provenance.mjs", "scripts/cloud-ltc-state-envelope.mjs"]);
export async function verifyInspectionSource({root,config,read=readFile,gitHead=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}){
 check(/^[a-f0-9]{40}$/.test(config?.github?.sourceSha??'')&&gitHead()===config.github.sourceSha,'source');
 const m=config.sourceManifest;check(m&&Object.keys(m).sort().join('\n')===[...INSPECTION_SOURCE_FILES].sort().join('\n')&&hash(JSON.stringify(m))===config.sourceManifestSha256,'manifest');for(const f of INSPECTION_SOURCE_FILES)check(/^[a-f0-9]{64}$/.test(m[f])&&hash(await read(path.join(root,f)))===m[f],'source_bytes');
}

export async function readInspectionOrigin({config,token,fetcher,timeoutMs=10000}){
 const id=config.originRunId,attempt=config.originAttempt;check(/^[1-9][0-9]{0,19}$/.test(id)&&attempt===1&&Number.isInteger(timeoutMs)&&timeoutMs>=10&&timeoutMs<=10000,'origin');
 const controller=new AbortController();let timer,reader;
 try{return await Promise.race([(async()=>{const response=await fetcher(`https://api.github.com/repos/Satnam-Satoshi/Satoshi-Langar/actions/runs/${id}/attempts/${attempt}`,{method:'GET',redirect:'error',signal:controller.signal,headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json'}});check(response.status===200&&!response.redirected&&/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??''),'origin_read');reader=response.body?.getReader();check(reader,'origin_body');const parts=[];let size=0;for(;;){const {done,value}=await reader.read();check(!controller.signal.aborted,'origin_timeout');if(done)break;size+=value.byteLength;check(size<=131072,'origin_size');parts.push(Buffer.from(value));}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('inspection_origin_read_unconfirmed'));},timeoutMs);})]);}
 catch{throw Error('inspection_origin_read_unconfirmed');}finally{clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{});}
}

export async function runF33InspectionCli({env=process.env,root=process.cwd(),read=readFile,stat=lstat,write=writeFile,gitHead,fetchImpl=fetch}={}){
 check(env.GITHUB_RUN_ATTEMPT==='1'&&typeof env.RUNNER_TEMP==='string'&&path.isAbsolute(env.RUNNER_TEMP),'runtime');
 const file=path.join(env.RUNNER_TEMP,'ltc-readonly-recovery-private.json'),info=await stat(file);check(info.isFile()&&!info.isSymbolicLink()&&(info.mode&0o077)===0,'private_config');const config=JSON.parse(await read(file,'utf8'));
 check(config.github.runId===env.GITHUB_RUN_ID&&config.github.executedSourceSha===config.github.sourceSha,'run');await verifyInspectionSource({root,config,read,...(gitHead?{gitHead}:{})});
 const {inspectionReadOnlyFetch,inspectF33ReadOnly,inspectionPublicStatus}=await import('./cloud-ltc-f33-readonly.mjs');
 const {createNativeInspectionApprovalReader}=await import('./cloud-ltc-native-inspection-authority.mjs');
 const {createReceiptLookup}=await import('./cloud-ltc-receipt-provenance-lookup.mjs');
 const {createGoogleStateRuntime}=await import('./cloud-ltc-google-runtime.mjs');
 const {createScopedGoogleAuthorization}=await import('./cloud-ltc-google-auth.mjs');
 const {downloadEvidence}=await import('./cloud-ltc-evidence.mjs');
 const fetcher=inspectionReadOnlyFetch(fetchImpl),googleEnv={LTC_GOOGLE_CLIENT_ID:env.LTC_GOOGLE_CLIENT_ID,LTC_GOOGLE_CLIENT_SECRET:env.LTC_GOOGLE_CLIENT_SECRET,LTC_GOOGLE_REFRESH_TOKEN:env.LTC_GOOGLE_REFRESH_TOKEN};
 check(config.lookup?.identitySource==='protected-publisher-credential'&&!Object.hasOwn(config.lookup,'publisherClientId')&&config.lookup.folderId===config.state.folderId&&config.state.ledgerKey==='website'&&config.state.publicationEnabled===false&&config.incident.folderId===config.lookup.folderId&&config.incident.ownerPermissionId===config.lookup.ownerPermissionId,'private_binding');
 const native=createNativeInspectionApprovalReader({config:config.github,token:env.GITHUB_TOKEN,fetchImpl:fetcher});
 const authorize=async()=>{const proof=await native();return {assertInspection(){const now=Date.now();check(proof.runId===env.GITHUB_RUN_ID&&now>=proof.observedAt&&now<proof.expiresAt,'approval_expired');return true;}};};
 // Lazy initialization ensures native approval precedes all OAuth or Google access.
 let runtime,lookup,auth;const init=async()=>{if(!runtime)runtime=await createGoogleStateRuntime({config:config.state,env:googleEnv,fetchImpl:fetcher,beforeWrite:()=>{throw Error('inspection_read_only');}});return runtime;};
 const result=await inspectF33ReadOnly({config:config.incident,authorize,
  lookup:async()=>{lookup??=createReceiptLookup({config:{...config.lookup,publisherClientId:googleEnv.LTC_GOOGLE_CLIENT_ID},env:googleEnv,fetchImpl:fetcher});return lookup.lookup();},
  readState:async()=>{const r=await init();return r.stateAdapter.read('website');},
  readOrigin:()=>readInspectionOrigin({config:config.incident,token:env.GITHUB_TOKEN,fetcher}),
  readEvidence:async(row,onDiagnostic)=>{auth??=createScopedGoogleAuthorization({env:googleEnv,fetchImpl:fetcher});const p=row.payload;return downloadEvidence({...p,length:p.bytes,operationId:row.operationId,payloadSha256:row.payloadSha256},{config:{folderId:config.incident.folderId,ownerPermissionId:config.incident.ownerPermissionId,fileId:p.fileId},getAccessToken:()=>auth(a=>a.LTC_GOOGLE_ACCESS_TOKEN),fetcher,onDiagnostic});}
 });
 try{await write(path.join(env.RUNNER_TEMP,'ltc-readonly-recovery-result.json'),JSON.stringify(result)+'\n',{flag:'wx',mode:0o600});}catch{return {status:'private-result-retention-failed',stateChanged:false,creationPerformed:false,publicationPerformed:false,retryAuthorized:false};}return inspectionPublicStatus(result);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{check(process.argv.length===2,'arguments');const r=await runF33InspectionCli();console.log(JSON.stringify(r));if(r.status!=='read-only-inspection-complete')process.exitCode=1;}catch{console.error('readonly_recovery_inspection_blocked');process.exitCode=1;}}
