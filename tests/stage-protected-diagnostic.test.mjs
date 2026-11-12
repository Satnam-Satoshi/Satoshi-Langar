import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {FIXED,RECORDS,CANONICAL_RECORD,API_ROUTES,inspectProtectedStage,headerObservation} from '../ops/ltc-stage-protected-diagnostic.mjs';
// Exercise the actual fixed accepted parsers, not a copied approximation.
const directory=await mkdtemp(path.join(tmpdir(),'protected-probe-test-'));
execFileSync('tar',['-x','-C',directory],{input:execFileSync('git',['archive','b413419180635b34a88b3015944cfaee7a08f742','scripts'],{maxBuffer:32*1024*1024})});
after(()=>rm(directory,{recursive:true,force:true}));
const {createAcceptanceLinkedClient}=await import(pathToFileURL(path.join(directory,'scripts/cloud-ltc-acceptance.mjs')));
const {validateSoftwareApiReadback}=await import(pathToFileURL(path.join(directory,'scripts/lib/ltc-software-release.mjs')));
const secret='fixture-secret-never-output', bypass='fixture-existing-bypass-never-output';
const env={GITHUB_REPOSITORY:'Satnam-Satoshi/Satoshi-Langar',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_ACTOR_ID:'268053325',GITHUB_RUN_ATTEMPT:'1',LTC_CLOUD_PUBLISH:'false',LTC_SOFTWARE_RELEASE_ENABLED:'false',LTC_VERCEL_CLI_VERSION:'65.9.0',VERCEL_TOKEN:secret};
const raw=(status,body,headers='Content-Type: application/json')=>Buffer.from(`HTTP/2 ${status}\r\n${headers}\r\n\r\n${body}`);
function fixture({proxy=false,wrongHost=false,failCli=false}={}){
 const gets=[],calls=[];
 const fetcher=async(url,options)=>{
  gets.push(url);assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.body,undefined);assert.equal(options.headers.Authorization,'Bearer '+secret);
  assert.equal(new URL(url).searchParams.get('teamId'),FIXED.team);
  const value=url.includes('/v13/')?{id:FIXED.candidate,url:wrongHost?'outside.vercel.app':FIXED.hostname,projectId:FIXED.project,ownerId:FIXED.team,team:{id:FIXED.team},readyState:'READY',target:'production'}:{id:FIXED.project,accountId:FIXED.team,name:'https-github-com-satnam-satoshi-satoshi-langar',protectionBypass:{[bypass]:{scope:'automation-bypass'}}};
  return new Response(JSON.stringify(value));
 };
 const execute=(binary,args,options)=>{
  calls.push(args);assert.equal(binary,'vercel');assert.ok(options.timeout<=45000);assert.ok(options.maxBuffer<=13*1024*1024);
  if(args[0]==='--version')return '65.9.0';
  assert.equal(args[0],'curl');assert.equal(options.env.VERCEL_TOKEN,secret);assert.equal(options.env.VERCEL_AUTOMATION_BYPASS_SECRET,bypass);assert.ok(!args.join(' ').includes(secret)&&!args.join(' ').includes(bypass));
  if(failCli)throw Object.assign(Error(secret),{stderr:Buffer.from(bypass),status:2});
  const route=new URL(args[1]).pathname;
  let bytes=route.includes('/litecoin-at-15/')?raw(308,'','Location: /conversations/specials/proof-of-birthday/'):route.startsWith('/api/')?raw(503,JSON.stringify({schemaVersion:1,status:'unavailable',checkedAt:'2026-11-12T12:00:00Z',private:secret})):raw(200,'not reviewed bytes '+secret);
  if(proxy)bytes=Buffer.concat([Buffer.from('HTTP/1.1 200 Connection established\r\nX-Secret: '+bypass+'\r\n\r\n'),bytes]);return bytes;
 };
 return{gets,calls,run:()=>inspectProtectedStage({env,directory,createLinkedClient:createAcceptanceLinkedClient,validateApi:validateSoftwareApiReadback,execute,fetcher})};
}
test('actual accepted linked client reads only fixed 3 records (including exact redirect) and all 4 APIs',async()=>{
 const f=fixture(),r=await f.run();assert.equal(r.probes.length,8);assert.equal(f.gets.length,14);assert.equal(f.calls.length,9);
 assert.deepEqual(r.probes.slice(1,4).map(x=>x.error),Array(3).fill('deployed_artifact_mismatch'));
 assert.ok(r.probes.slice(4).every(p=>p.passed&&p.responses[0].headerChain[0].status===503));
 assert.equal(r.probes[3].responses[0].headerChain[0].locationMatchesCanonical,true);
 assert.equal(r.probes[3].responses.length,2);assert.equal(r.recoveryAuthorized,false);assert.equal(r.fullStageProof,false);assert.equal(r.fullManifestVerified,false);assert.equal(r.stateChanged,false);
 assert.ok(!JSON.stringify(r).includes(secret)&&!JSON.stringify(r).includes(bypass));
});
test('header-chain diagnosis never changes accepted parser behavior or exports headers/body',async()=>{
 const f=fixture({proxy:true}),r=await f.run();assert.ok(r.probes.slice(1).every(p=>!p.passed));
 assert.deepEqual(r.probes[1].responses[0].headerChain.map(b=>b.status),[200,200]);
 const body=Buffer.from('bytes'),digest=createHash('sha256').update(body).digest('hex');
 const observation=headerObservation(Buffer.concat([Buffer.from('HTTP/1.1 200 Connection established\r\nSecret: hidden\r\n\r\nHTTP/2 200\r\n\r\n'),body]),digest);
 assert.equal(observation.parserBodyHashMatches,false);assert.equal(observation.finalBodyHashMatches,true);assert.ok(!JSON.stringify(observation).includes('hidden'));
});
test('wrong candidate hostname blocks curl; CLI private failures remain sanitized',async()=>{
 const wrong=fixture({wrongHost:true}),r=await wrong.run();assert.equal(wrong.calls.length,1);assert.ok(r.probes.slice(1).every(p=>p.error==='diagnostic_scope_changed'));
 const f=fixture({failCli:true}),bad=await f.run();assert.ok(bad.probes.slice(1).every(p=>p.error==='acceptance_cli_failed'));assert.ok(!JSON.stringify(bad).includes(secret)&&!JSON.stringify(bad).includes(bypass));
});
test('context mismatches reject before any operation',async()=>{
 for(const key of Object.keys(env).filter(k=>k!=='VERCEL_TOKEN'))await assert.rejects(inspectProtectedStage({env:{...env,[key]:'wrong'}}),/diagnostic_scope_changed/);
});
test('fixed hashes and workflow embedded code match; only existing Vercel secret is exposed after source guard',async()=>{
 assert.equal(RECORDS.length,3);assert.equal(API_ROUTES.length,4);assert.equal(CANONICAL_RECORD.sha256,'ea8ba32bfa1b63ae05d8c99e24407adeeda72c9cf888bf68e4a9847c6d651bb6');
 const y=await readFile('.github/workflows/ltc-stage-protected-diagnostic.yml','utf8'),code=await readFile('ops/ltc-stage-protected-diagnostic.mjs','utf8');
 const embedded=y.split('          // BEGIN PROTECTED DIAGNOSTIC\n')[1].split('\n          // END PROTECTED DIAGNOSTIC')[0].split('\n').map(l=>l?l.slice(10):'').join('\n');assert.equal(embedded,code.trimEnd());
 assert.deepEqual([...y.matchAll(/secrets\.([A-Z_]+)/g)].map(x=>x[1]),['VERCEL_TOKEN']);assert.ok(y.indexOf('Verify fixed source')<y.indexOf('secrets.VERCEL_TOKEN'));assert.ok(y.indexOf('npm install --global vercel@65.9.0')<y.indexOf('secrets.VERCEL_TOKEN'));
 assert.match(y,/group: ltc-production-publication\n  cancel-in-progress: false/);assert.match(y,/GITHUB_RUN_ATTEMPT!=='1'/);assert.match(y,/contents: read/);assert.match(y,/try \{\n            const \{createAcceptanceLinkedClient\}=await import/);assert.doesNotMatch(y,/schedule:|upload-artifact|--publish|--prebuilt|method: 'POST'/);
 for(const[,block]of y.matchAll(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/g)){const input=block.split('\n').map(l=>l?l.slice(10):'').join('\n');assert.equal(spawnSync(process.execPath,['--check','--input-type=module'],{input,encoding:'utf8'}).status,0);}
});
test('transport wrappers reject injected resource paths and mutation CLI commands',async()=>{
 for(const action of ['url','mutation','route']){
  let calls=0;
  const createLinkedClient=({vercel,execute})=>({verifyVersion:async()=>{},readProtected:async()=>{if(action==='url')await vercel('/v13/deployments/other');else execute('vercel',action==='mutation'?['deploy','--prod']:['curl','https://outside.invalid/','--','--include','--silent','--show-error','--max-time','30','--max-redirs','0','--proto','=https'],{});},readProtectedApi:async()=>{throw Error(secret);}});
  const r=await inspectProtectedStage({env,directory,createLinkedClient,validateApi:()=>{},execute:()=>{calls++;},fetcher:()=>{calls++;}});
  assert.equal(calls,0);assert.ok(r.probes.slice(1).every(p=>!p.passed));assert.ok(!JSON.stringify(r).includes(secret));
 }
});
test('main CI fetches only the pinned accepted commit before including the protected diagnostic boundary test',async()=>{
 const ci=await readFile('.github/workflows/ci.yml','utf8');
 const fetch='git fetch --no-tags --depth=1 origin b413419180635b34a88b3015944cfaee7a08f742';
 const run='node --test tests/social-dispatch.test.mjs tests/stage-metadata-diagnostic.test.mjs tests/stage-protected-diagnostic.test.mjs';
 assert.ok(ci.includes(fetch));assert.ok(ci.includes(run));assert.ok(ci.indexOf(fetch)<ci.indexOf(run));assert.doesNotMatch(ci,/secrets\./);
});
