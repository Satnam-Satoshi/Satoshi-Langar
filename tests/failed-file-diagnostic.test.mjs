import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {FIXED,RECORD,EXPECTED_BYTES,inspectFailedFile,observeResponse,nativeFailureObservation} from '../ops/ltc-failed-file-diagnostic.mjs';
const controller='9fc3d385fbe461bc169cda9eb521f4a14859b7d0';
const directory=await mkdtemp(path.join(tmpdir(),'failed-file-test-'));
execFileSync('tar',['-x','-C',directory],{input:execFileSync('git',['archive',controller,'scripts'],{maxBuffer:32*1024*1024})});
after(()=>rm(directory,{recursive:true,force:true}));
const {createAcceptanceLinkedClient}=await import(pathToFileURL(path.join(directory,'scripts/cloud-ltc-acceptance.mjs')));
const image=execFileSync('git',['show',FIXED.source+':public/'+RECORD.file],{maxBuffer:2*1024*1024});
const secret='fixture-secret-never-output',bypass='fixture-bypass-never-output';
const env={GITHUB_REPOSITORY:'Satnam-Satoshi/Satoshi-Langar',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_ACTOR_ID:'268053325',GITHUB_RUN_ATTEMPT:'1',LTC_CLOUD_PUBLISH:'false',LTC_SOFTWARE_RELEASE_ENABLED:'false',LTC_VERCEL_CLI_VERSION:'65.9.0',VERCEL_TOKEN:secret};
const raw=(status,body=image)=>Buffer.concat([Buffer.from(`HTTP/2 ${status}\r\nContent-Type: image/jpeg\r\nPrivate: ${secret}\r\n\r\n`),body]);
function fixture({error,body,wrongMeta=false,managementStatus=200}={}){
 const gets=[],calls=[];
 const fetcher=async(url,options)=>{
  gets.push(url);assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.body,undefined);assert.equal(options.headers.Authorization,'Bearer '+secret);assert.equal(new URL(url).searchParams.get('teamId'),FIXED.team);
  const value=url.includes('/v13/')?{id:FIXED.candidate,url:FIXED.hostname,projectId:FIXED.project,ownerId:FIXED.team,team:{id:FIXED.team},readyState:'READY',target:'production',meta:{ltcOperationId:FIXED.operation,ltcPayloadSha256:FIXED.payload,ltcSourceCommit:wrongMeta?'wrong':FIXED.source,ltcBuildOutputSha256:FIXED.output}}:{id:FIXED.project,accountId:FIXED.team,name:'https-github-com-satnam-satoshi-satoshi-langar',protectionBypass:{[bypass]:{scope:'automation-bypass'}}};
  return new Response(JSON.stringify(value),{status:managementStatus});
 };
 const execute=(binary,args,options)=>{
  calls.push(args);assert.equal(binary,'vercel');assert.ok(options.timeout<=45000);assert.ok(options.maxBuffer<=13*1024*1024);
  if(args[0]==='--version')return '65.9.0';
  assert.equal(args[1],`https://${FIXED.hostname}/${RECORD.file}`);assert.equal(options.env.VERCEL_TOKEN,secret);assert.equal(options.env.VERCEL_AUTOMATION_BYPASS_SECRET,bypass);assert.ok(!args.join(' ').includes(secret)&&!args.join(' ').includes(bypass));
  if(error)throw error;return body??raw(200);
 };
 return {gets,calls,run:()=>inspectFailedFile({env,directory,createLinkedClient:createAcceptanceLinkedClient,execute,fetcher})};
}
const noSecrets=result=>{assert.ok(!JSON.stringify(result).includes(secret));assert.ok(!JSON.stringify(result).includes(bypass));};
test('one exact stored image passes actual current accepted parser, without claiming past cause or full stage proof',async()=>{
 assert.equal(image.length,EXPECTED_BYTES);assert.equal(createHash('sha256').update(image).digest('hex'),RECORD.sha256);
 const f=fixture(),r=await f.run();assert.equal(r.probes.length,2);assert.ok(r.probes.every(p=>p.passed));assert.equal(f.gets.length,2);assert.equal(f.calls.length,2);assert.equal(r.cliCalls,2);
 assert.deepEqual(r.probes[1].response,{statuses:[200],rateLimitObserved:false,bodyBytes:EXPECTED_BYTES,expectedLengthMatches:true,parserBodyHashMatches:true,finalBodyHashMatches:true});
 for(const k of ['fullStageProof','fullManifestVerified','recoveryAuthorized','journalRead','stateChanged','effectsReissued','priorFailureCauseEstablished'])assert.equal(r[k],false);noSecrets(r);
});
test('native timeout retains fixed code, accepted safe enum and wrapper status, with no retry or leaked error text',async()=>{
 const error=Object.assign(Error(secret),{status:1,stderr:Buffer.from(`private ${bypass}\ncurl: (28) Operation timed out private ${secret}\n`),stdout:Buffer.alloc(0),spawnargs:[secret]});
 const f=fixture({error}),r=await f.run();assert.equal(f.calls.length,2);assert.equal(r.probes[1].error,'acceptance_cli_failed');
 assert.deepEqual(r.probes[1].nativeFailure,{category:'curl-timeout',nativeCurlCode:28});assert.deepEqual(r.probes[1].safeCliFailure,{operation:'protected-read',category:'cli-exited',exitStatus:1});noSecrets(r);
});
test('429 is observed only from an actual response header; transport messages alone do not fabricate HTTP status',async()=>{
 const f=fixture({body:raw(429,Buffer.from(secret))}),r=await f.run();assert.equal(r.probes[1].error,'unexpected_artifact_status');assert.equal(r.probes[1].response.rateLimitObserved,true);assert.equal(f.calls.length,2);noSecrets(r);
 const e=Object.assign(Error('429 '+secret),{status:1,stderr:Buffer.from('429 '+bypass)});assert.deepEqual(nativeFailureObservation(e),{category:'unclassified',nativeCurlCode:null});
 const partial=fixture({error:Object.assign(e,{stdout:raw(429,Buffer.from(secret))})}),p=await partial.run();assert.equal(p.probes[1].partialResponse.rateLimitObserved,true);assert.equal(p.probes[1].partialResponse.parserBodyHashMatches,null);noSecrets(p);
 const management=fixture({managementStatus:429}),m=await management.run();assert.equal(management.calls.length,1);assert.equal(m.probes[1].managementStatus,429);assert.equal(m.probes[1].error,'diagnostic_read_unavailable');
});
test('wrong fixed metadata blocks protected GET; wrong bytes and interim headers still fail accepted verification',async()=>{
 const wrong=fixture({wrongMeta:true}),w=await wrong.run();assert.equal(wrong.calls.length,1);assert.equal(w.probes[1].error,'diagnostic_scope_changed');
 const mismatch=await fixture({body:raw(200,Buffer.from(secret))}).run();assert.equal(mismatch.probes[1].error,'deployed_artifact_mismatch');
 const proxy=await fixture({body:Buffer.concat([Buffer.from(`HTTP/1.1 200 Connection established\r\nPrivate: ${bypass}\r\n\r\n`),raw(200)])}).run();assert.equal(proxy.probes[1].passed,false);assert.deepEqual(proxy.probes[1].response.statuses,[200,200]);assert.equal(proxy.probes[1].response.finalBodyHashMatches,true);assert.equal(proxy.probes[1].response.parserBodyHashMatches,false);noSecrets(proxy);
});
test('native diagnostics are bounded fixed enums even for poisoned errors',()=>{
 for(const [code,category]of[['ETIMEDOUT','process-timeout'],['ENOBUFS','process-output-limit']])assert.deepEqual(nativeFailureObservation({code,status:999,stderr:bypass}),{category,nativeCurlCode:null});
 for(const code of [0,999,429])assert.deepEqual(nativeFailureObservation({stderr:`curl: (${code}) ${secret}`}),{category:'unclassified',nativeCurlCode:null});
 assert.equal(nativeFailureObservation({stderr:'x'.repeat(65536)+'\ncurl: (28) '+secret}).nativeCurlCode,null);
 for(const code of [5,6,7,18,22,23,28,35,47,52,55,56,60,92])assert.equal(nativeFailureObservation({stderr:`curl: (${code}) ${secret}`}).nativeCurlCode,code);
 assert.deepEqual(observeResponse(Buffer.from(secret),false).statuses,[]);
});
test('wrong context blocks before any action and wrappers reject mutation, other route and repetition',async()=>{
 for(const key of Object.keys(env).filter(k=>k!=='VERCEL_TOKEN'))await assert.rejects(inspectFailedFile({env:{...env,[key]:'wrong'}}),/diagnostic_scope_changed/);
 for(const action of ['url','mutation','route','repeat']){
  let calls=0;const args=['curl',`https://${FIXED.hostname}/${RECORD.file}`,'--','--include','--silent','--show-error','--max-time','30','--max-redirs','0','--proto','=https'];
  const createLinkedClient=({vercel,execute})=>({verifyVersion:async()=>{},readProtected:async()=>{if(action==='url')await vercel('/v13/deployments/other');else if(action==='mutation')execute('vercel',['deploy','--prod'],{});else if(action==='route')execute('vercel',[...args.slice(0,1),'https://outside.invalid/',...args.slice(2)],{});else{execute('vercel',args,{});execute('vercel',args,{});}}});
  const r=await inspectFailedFile({env,directory,createLinkedClient,execute:()=>{calls++;return raw(200);},fetcher:()=>{calls++;}});assert.equal(calls,action==='repeat'?1:0);assert.equal(r.probes[1].passed,false);noSecrets(r);
 }
});
test('workflow embedded module is exact, current controller guard precedes only existing credential and CI includes real parser test',async()=>{
 const y=await readFile('.github/workflows/ltc-failed-file-diagnostic.yml','utf8'),code=await readFile('ops/ltc-failed-file-diagnostic.mjs','utf8');
 const embedded=y.split('          // BEGIN FAILED FILE DIAGNOSTIC\n')[1].split('\n          // END FAILED FILE DIAGNOSTIC')[0].split('\n').map(l=>l?l.slice(10):'').join('\n');assert.equal(embedded,code.trimEnd());
 assert.match(y,new RegExp('ref: '+controller));assert.match(y,/ad080e6e06dcf3a87a8ac3a166061fb7ad93ae102035d49403b0113030675395/);assert.deepEqual([...y.matchAll(/secrets\.([A-Z_]+)/g)].map(x=>x[1]),['VERCEL_TOKEN']);assert.ok(y.indexOf('Verify fixed source')<y.indexOf('secrets.VERCEL_TOKEN'));assert.ok(y.indexOf('npm install --global vercel@65.9.0')<y.indexOf('secrets.VERCEL_TOKEN'));
 assert.match(y,/group: ltc-production-publication\n  cancel-in-progress: false/);assert.match(y,/github.run_attempt == 1/);assert.match(y,/contents: read/);assert.doesNotMatch(y,/schedule:|upload-artifact|--publish|--prebuilt|method: 'POST'|createShare|--retry/);
 for(const[,block]of y.matchAll(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/g)){const input=block.split('\n').map(l=>l?l.slice(10):'').join('\n');assert.equal(spawnSync(process.execPath,['--check','--input-type=module'],{input,encoding:'utf8'}).status,0);}
 const ci=await readFile('.github/workflows/ci.yml','utf8');assert.ok(ci.includes('git fetch --no-tags --depth=1 origin '+controller));assert.ok(ci.includes('tests/failed-file-diagnostic.test.mjs'));assert.ok(ci.indexOf('git fetch --no-tags --depth=1 origin '+controller)<ci.indexOf('tests/failed-file-diagnostic.test.mjs'));assert.doesNotMatch(ci,/secrets\./);
});
