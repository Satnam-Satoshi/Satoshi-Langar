import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {SCOPE,EXPECTED_META,inspectStageMetadata} from '../ops/ltc-stage-metadata-diagnostic.mjs';
const secret='fixture-never-print-this-token';
const deployment=id=>({id,projectId:SCOPE.project,ownerId:SCOPE.team,team:{id:SCOPE.team,slug:'baba-g-s-projects'},readyState:'READY',target:'production',url:'fixed-candidate.vercel.app',meta:{...EXPECTED_META,unrelatedSecret:secret}});
function fixture({mutate=x=>x,listings}={}) {
  const calls=[]; let list=0;
  const fetcher=async(url,options)=>{
    calls.push({url,options});assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.body,undefined);
    assert.equal(options.headers.Authorization,'Bearer '+secret);assert.equal(new URL(url).origin,'https://api.vercel.com');assert.equal(new URL(url).searchParams.get('teamId'),SCOPE.team);
    const path=new URL(url).pathname;
    const value=path==='/v6/deployments'?(listings?.[list++]??{deployments:[{uid:SCOPE.candidate,meta:{...EXPECTED_META}}],pagination:{next:null}}):deployment(path.endsWith(SCOPE.candidate)?SCOPE.candidate:SCOPE.previous);
    return new Response(JSON.stringify(mutate(value,path)),{status:200});
  };
  return{calls,fetcher};
}
test('fixed GETs verify identity/meta/aliases but never authorize recovery or expose raw data',async()=>{
  const f=fixture(),r=await inspectStageMetadata({token:secret,fetcher:f.fetcher});
  assert.equal(f.calls.length,5);assert.equal(r.metadataAndPointersMatch,true);assert.equal(r.recoveryAuthorized,false);assert.equal(r.journalRead,false);assert.equal(r.stateChanged,false);assert.equal(r.effectsReissued,false);assert.equal(r.protectedBytesVerified,false);assert.equal(r.apiHandlersVerified,false);
  assert.equal(JSON.stringify(r).includes(secret),false);assert.equal(JSON.stringify(r).includes('unrelatedSecret'),false);
  assert.deepEqual(f.calls.map(c=>new URL(c.url).pathname),[`/v13/deployments/${SCOPE.candidate}`,`/v13/deployments/${SCOPE.previous}`,'/v13/deployments/satnamsatoshi.com','/v13/deployments/ltcmagazine.org','/v6/deployments']);
});
test('raw identity/meta mismatches or changed aliases fail observation acceptance without writes',async()=>{
  for(const mutate of [
    (v,p)=>p.endsWith(SCOPE.candidate)?{...v,meta:{}}:v,
    (v,p)=>p.endsWith(SCOPE.candidate)?{...v,projectId:'wrong'}:v,
    (v,p)=>p.endsWith(SCOPE.candidate)?{...v,ownerId:'wrong'}:v,
    (v,p)=>p.endsWith(SCOPE.candidate)?{...v,readyState:'BUILDING'}:v,
    (v,p)=>p.endsWith(SCOPE.candidate)?{...v,url:'a'.repeat(254)+'.vercel.app'}:v,
    (v,p)=>p.endsWith('satnamsatoshi.com')?{...v,id:SCOPE.candidate}:v,
    (v,p)=>p==='/v6/deployments'?{deployments:[],pagination:{next:null}}:v,
    (v,p)=>p==='/v6/deployments'?{...v,deployments:[...v.deployments,...v.deployments]}:v,
  ]){const f=fixture({mutate});assert.equal((await inspectStageMetadata({token:secret,fetcher:f.fetcher})).metadataAndPointersMatch,false);}
});
test('pagination is bounded and cannot redirect the fixed GET endpoint',async()=>{
  const f=fixture({listings:Array.from({length:10},(_,i)=>({deployments:[],pagination:{next:100+i}}))});
  const r=await inspectStageMetadata({token:secret,fetcher:f.fetcher});assert.equal(f.calls.length,14);assert.equal(r.discovery.complete,false);assert.equal(r.metadataAndPointersMatch,false);
  for(const next of ['https://other.invalid',-1,'1&other=secret',{},1.2]){const f=fixture({listings:[{deployments:[],pagination:{next}}]});await assert.rejects(inspectStageMetadata({token:secret,fetcher:f.fetcher}),/listing_invalid_pagination/);}
  const repeated=fixture({listings:Array(2).fill({deployments:[],pagination:{next:100}})});await assert.rejects(inspectStageMetadata({token:secret,fetcher:repeated.fetcher}),/listing_invalid_pagination/);
});
test('credential, transport, redirect, size and JSON failures never report provider contents',async()=>{
  await assert.rejects(inspectStageMetadata({token:''}),/credential_unavailable/);
  for(const fetcher of [async()=>{throw Error(secret);},async()=>new Response(secret,{status:403}),async()=>({...new Response(),status:200,redirected:true}),async()=>new Response(secret),async()=>new Response('x'.repeat(2_000_001)),async()=>new Response('null')]){
    await assert.rejects(inspectStageMetadata({token:secret,fetcher}),e=>!e.message.includes(secret)&&/^(candidate_)/.test(e.message));
  }
});
test('workflow embeds reviewed code exactly and exposes only one existing credential after guard',async()=>{
  const y=await readFile(new URL('../.github/workflows/ltc-stage-metadata-diagnostic.yml',import.meta.url),'utf8');
  const code=await readFile(new URL('../ops/ltc-stage-metadata-diagnostic.mjs',import.meta.url),'utf8');
  const embedded=y.split('          // BEGIN GET-ONLY DIAGNOSTIC\n')[1].split('\n          // END GET-ONLY DIAGNOSTIC')[0].split('\n').map(l=>l?l.slice(10):'').join('\n');assert.equal(embedded,code.trimEnd());
  assert.deepEqual([...y.matchAll(/secrets\.([A-Z_]+)/g)].map(x=>x[1]),['VERCEL_TOKEN']);assert.ok(y.indexOf('Verify fixed source and implementation before credentials')<y.indexOf('secrets.VERCEL_TOKEN'));
  assert.match(y,/contents: read/);assert.match(y,/group: ltc-production-publication\n  cancel-in-progress: false/);assert.match(y,/timeout-minutes: 5/);assert.match(y,/GITHUB_RUN_ATTEMPT!==?'1'/);assert.match(y,/ref: b413419180635b34a88b3015944cfaee7a08f742/);
  assert.doesNotMatch(y,/schedule:|cron:|permissions:\s+contents: write|upload-artifact|npm install|pnpm|--publish|--prebuilt|method: 'POST'/);
  const condition=y.match(/^    if: (.*)$/m)[1];const context={github:{repository:'Satnam-Satoshi/Satoshi-Langar',ref:'refs/heads/main',event_name:'workflow_dispatch',actor_id:'268053325'}};assert.equal(vm.runInNewContext(condition,context),true);
  for(const [k,v]of Object.entries(context.github)){const changed=structuredClone(context);changed.github[k]='wrong';assert.equal(vm.runInNewContext(condition,changed),false);}
  const blocks=[...y.matchAll(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/g)];assert.equal(blocks.length,2);
  for(const[,block]of blocks){const input=block.split('\n').map(l=>l?l.slice(10):'').join('\n');const r=spawnSync(process.execPath,['--check','--input-type=module'],{input,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
});
