import {readFile,lstat,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const check=(v,c)=>{if(!v)throw Error('bootstrap_cli_'+c);};
const hash=x=>createHash('sha256').update(x).digest('hex');
export const BOOTSTRAP_SOURCE_FILES=Object.freeze(['scripts/cloud-ltc-bootstrap-pin-discovery.mjs','scripts/cloud-ltc-receipt-bootstrap-cli.mjs','scripts/cloud-ltc-receipt-bootstrap.mjs','scripts/cloud-ltc-receipt-bootstrap-transport.mjs','scripts/cloud-ltc-bootstrap-github-admission.mjs','scripts/cloud-ltc-bootstrap-invocation-admission.mjs','scripts/cloud-ltc-google-auth.mjs']);
export async function verifyBootstrapSource({root,config,read=readFile,gitHead=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}){
 check(/^[a-f0-9]{40}$/.test(config?.github?.sourceSha??'')&&gitHead()===config.github.sourceSha,'source');
 const manifest=config.sourceManifest;
 check(manifest&&Object.keys(manifest).sort().join('\n')===[...BOOTSTRAP_SOURCE_FILES].sort().join('\n')&&hash(JSON.stringify(manifest))===config.sourceManifestSha256,'manifest');
 for(const file of BOOTSTRAP_SOURCE_FILES)check(/^[a-f0-9]{64}$/.test(manifest[file])&&hash(await read(path.join(root,file)))===manifest[file],'source_bytes');
}
// Fixed entrypoint. All injection seams below are test/trusted-code only; not CLI
// arguments or workflow inputs. Protected config provenance is a deployment prerequisite.
export async function runReceiptBootstrapCli({env=process.env,root=process.cwd(),read=readFile,stat=lstat,write=writeFile,gitHead,fetchImpl=fetch,admissionFactory,pinReaderFactory,transportFactory}={}){
 check(typeof env.RUNNER_TEMP==='string'&&path.isAbsolute(env.RUNNER_TEMP)&&env.GITHUB_RUN_ATTEMPT==='1','runtime');
 const filename=path.join(env.RUNNER_TEMP,'ltc-receipt-bootstrap-private.json');
 const info=await stat(filename);check(info.isFile()&&!info.isSymbolicLink()&&(info.mode&0o077)===0,'private_config');
 const config=JSON.parse(await read(filename,'utf8'));
 check(config?.github?.runId===env.GITHUB_RUN_ID&&config.github.executedSourceSha===config.github.sourceSha,'run');
 await verifyBootstrapSource({root,config,read,...(gitHead?{gitHead}:{})});
 const {createBoundedInvocationReceiptBootstrap}=await import('./cloud-ltc-receipt-bootstrap.mjs');
 const github=await import('./cloud-ltc-bootstrap-github-admission.mjs');
 const google=await import('./cloud-ltc-receipt-bootstrap-transport.mjs');
 admissionFactory??=github.createBoundedOneInvocationAdmission;pinReaderFactory??=github.createGitHubBootstrapPinReader;transportFactory??=google.createReceiptBootstrapTransport;
 // No Google credential parsing or transport construction occurs before code
 // integrity verification. Authenticated GitHub admission precedes OAuth usage.
 const readVerifiedAdmission=pinReaderFactory({config:config.github,token:env.GITHUB_TOKEN,fetchImpl});
 const oneInvocationAdmission=admissionFactory({readVerifiedAdmission});
 const googleEnv={LTC_GOOGLE_CLIENT_ID:env.LTC_GOOGLE_CLIENT_ID,LTC_GOOGLE_CLIENT_SECRET:env.LTC_GOOGLE_CLIENT_SECRET,LTC_GOOGLE_REFRESH_TOKEN:env.LTC_GOOGLE_REFRESH_TOKEN};
 const transport=transportFactory({config:config.publisher,env:googleEnv,fetchImpl});
 const bootstrap=createBoundedInvocationReceiptBootstrap(config.publisher,{...transport,oneInvocationAdmission});
 const result=await bootstrap();
 // Result is private; only categorical status is printed by the executable below.
 // Failure to retain the outcome never authorizes another creation attempt.
 try{await write(path.join(env.RUNNER_TEMP,'ltc-receipt-bootstrap-result.json'),JSON.stringify(result)+'\n',{flag:'wx',mode:0o600});}
 catch{return {status:'outcome-retention-uncertain',admissionMode:'bounded-single-invocation',exactlyOnceGuaranteed:false,retryAllowed:false};}
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{check(process.argv.length===2,'arguments');const r=await runReceiptBootstrapCli();console.log(JSON.stringify({status:r.status,admissionMode:r.admissionMode,exactlyOnceGuaranteed:false,retryAllowed:false,...(r.diagnostic?{diagnostic:r.diagnostic}:{})}));if(r.status!=='verified-private-document')process.exitCode=1;}
 catch{console.error('receipt_bootstrap_cli_blocked');process.exitCode=1;}
}
