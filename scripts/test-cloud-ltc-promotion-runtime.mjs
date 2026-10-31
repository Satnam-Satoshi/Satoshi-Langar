import test from 'node:test';
import assert from 'node:assert/strict';
import { createDurableVercelCommand, createControlledVercelMutation, createPortableDeploymentWorkspace } from './cloud-ltc-promotion-runtime.mjs';
import { TARGET, readReviewedMigrationConfiguration, assertMigrationAcceptance, builtManifest, builtOutputManifest } from './cloud-ltc-release.mjs';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

async function portableFixture() {
 const directory=await mkdtemp(path.join(tmpdir(),'ltc-portable-artifact-')),sourceRoot=path.join(directory,'source'),destination=path.join(directory,'portable');
 await mkdir(path.join(sourceRoot,'.git'),{recursive:true});
 for(const [file,bytes]of [['vercel.json','{"framework":null}'],['.env','private-input-never-copied'],['package.json','{"name":"source-never-copied"}'],['.vercel/output/config.json','{"version":3}'],['.vercel/output/static/index.html','exact html'],['.vercel/output/functions/api.func/.vc-config.json','{}'],['.vercel/output/functions/api.func/worker.js','exact function']]){const target=path.join(sourceRoot,file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);}
 const buildOutput=await builtOutputManifest(path.join(sourceRoot,'.vercel/output'));
 return{directory,sourceRoot,destination,buildOutput};
}
test('routine stage uses exact gitless portable output with only reviewed config/link and durable attribution',async()=>{
 const f=await portableFixture();try{
  const portable=await createPortableDeploymentWorkspace({...f,directory:f.destination});await portable.verify();
  const records=await builtManifest(portable.root);
  assert.deepEqual(records.map(r=>r.file).sort(),['vercel.json','.vercel/project.json',...f.buildOutput.map(r=>'.vercel/output/'+r.file)].sort());
  assert.equal(await readFile(path.join(portable.root,'.vercel/output/functions/api.func/worker.js'),'utf8'),'exact function');
  const lease={runId:'run',fence:8},payload={kind:'vercel-stage',commit:'a'.repeat(40),buildOutputSha256:portable.buildOutputSha256};
  const intent={runId:'run',fence:8,status:'uncertain',operationId:'op',payload,payloadSha256:hash(payload)};
  let deployed=false;const command=createDurableVercelCommand({env:{},state:{inspect:async()=>({lease,paused:false,intents:{op:intent}})},lease,root:portable.root,linked:{deploy:async(args,cwd)=>{await portable.verify();assert.equal(cwd,f.destination);assert(args.includes('ltcSourceCommit='+payload.commit));assert(!cwd.startsWith(f.sourceRoot));deployed=true;}}});
  const args=['deploy','--prebuilt','--prod','--skip-domain','--yes','--meta','ltcOperationId=op','--meta','ltcPayloadSha256='+hash(payload),'--meta','ltcSourceCommit='+payload.commit,'--meta','ltcBuildOutputSha256='+payload.buildOutputSha256];
  await command(args);assert.equal(deployed,true);
 }finally{await rm(f.directory,{recursive:true,force:true});}
});
test('unknown files, Git discovery, config/output drift and symlinks invalidate the portable workspace',async()=>{
 for(const change of [f=>writeFile(path.join(f.destination,'extra.txt'),'unknown'),f=>mkdir(path.join(f.destination,'.git')),f=>writeFile(path.join(f.destination,'.vercel/output/static/index.html'),'drift'),f=>writeFile(path.join(f.sourceRoot,'.vercel/output/static/index.html'),'source drift'),f=>writeFile(path.join(f.destination,'vercel.json'),'{}'),f=>symlink('config.json',path.join(f.destination,'.vercel/output/unknown-link'))]){
  const f=await portableFixture();try{const portable=await createPortableDeploymentWorkspace({...f,directory:f.destination});await change(f);await assert.rejects(portable.verify());}finally{await rm(f.directory,{recursive:true,force:true});}
 }
 const f=await portableFixture();try{await writeFile(path.join(f.sourceRoot,'.vercel/output/unknown'),'unreviewed');await assert.rejects(createPortableDeploymentWorkspace({...f,directory:f.destination}));}finally{await rm(f.directory,{recursive:true,force:true});}
});

test('routine stage command requires one uncertain current-fence intent and exact durable metadata',async()=>{
 const lease={runId:'run',fence:8}, payload={kind:'vercel-stage',commit:'a'.repeat(40),buildOutputSha256:'b'.repeat(64)};
 const intent={runId:'run',fence:8,status:'uncertain',operationId:'op',payload,payloadSha256:hash(payload)};
 const document={lease,paused:false,intents:{op:intent}}, calls=[];
 const command=createDurableVercelCommand({env:{},state:{inspect:async()=>document},lease,root:'/exact',linked:{deploy:async(args,root)=>calls.push({args,root})}});
 const args=['deploy','--prebuilt','--prod','--skip-domain','--yes',...Object.entries({ltcOperationId:'op',ltcPayloadSha256:hash(payload),ltcSourceCommit:payload.commit,ltcBuildOutputSha256:payload.buildOutputSha256}).flatMap(([key,value])=>['--meta',key+'='+value])];
 await command(args);assert.equal(calls.length,1);assert.equal(calls[0].root,'/exact');
 for(const change of [()=>intent.status='pending',()=>{intent.status='uncertain';intent.fence=7;},()=>{intent.fence=8;document.paused=true;}]){change();await assert.rejects(command(args));}
 assert.equal(calls.length,1);
});
test('routine alias commands reject historical stage receipts and mismatched deployment identities before POST',async()=>{
 const lease={runId:'run',fence:8}, payload={kind:'vercel-promote',deployment:'dpl_Candidate',previous:'dpl_Previous',commit:'a'.repeat(40)};
 const intent={runId:'run',fence:8,status:'uncertain',payload};
 const stage={runId:'old',fence:7,status:'confirmed',payload:{kind:'vercel-stage',commit:payload.commit},proof:{proof:{deployment:payload.deployment,url:'candidate.vercel.app'}}};
 const document={lease,paused:false,intents:{intent,stage}}, posts=[];
 const command=createDurableVercelCommand({env:{VERCEL_TOKEN:'private-test-token-only'},state:{inspect:async()=>document},lease,vercel:async()=>({id:payload.deployment,projectId:'wrong',ownerId:TARGET.team,team:{id:TARGET.team},meta:{ltcSourceCommit:payload.commit},url:'candidate.vercel.app'}),fetchImpl:async(...args)=>posts.push(args)});
 await assert.rejects(command(['promote','https://candidate.vercel.app','--yes'])); stage.runId='run';stage.fence=8;
 await assert.rejects(command(['promote','https://candidate.vercel.app','--yes']));assert.equal(posts.length,0);
});
test('mutation denial/network errors reveal no provider body or token and never retry',async()=>{
 for(const failure of ['denied','network']){
  let count=0;const command=createControlledVercelMutation({env:{VERCEL_TOKEN:'private-test-token-only'},review:{stagePins:{candidateDeployment:'dpl_Candidate',previousDeployment:'dpl_Previous'}},fetchImpl:async()=>{count++;if(failure==='network')throw Error('private-body-token');return new Response('private-body-token',{status:403});}});
  await assert.rejects(command(['promote','https://candidate.vercel.app','--yes'],{candidate:'dpl_Candidate',previous:'dpl_Previous',candidateUrl:'candidate.vercel.app'}),error=>error.message==='controlled_vercel_write_uncertain');assert.equal(count,1);
 }
});
test('routine promotion and rollback derive only current stage identity and exact durable targets',async()=>{
 const lease={runId:'run',fence:8}, commit='a'.repeat(40), candidate='dpl_Candidate', previous='dpl_Previous';
 const stage={runId:'run',fence:8,status:'confirmed',payload:{kind:'vercel-stage',commit},proof:{proof:{deployment:candidate,url:'candidate.vercel.app'}}};
 const current={runId:'run',fence:8,status:'uncertain',payload:{kind:'vercel-promote',deployment:candidate,previous,commit}};
 const document={lease,paused:false,intents:{stage,current}}, posts=[];
 const command=createDurableVercelCommand({env:{VERCEL_TOKEN:'private-test-token-only'},state:{inspect:async()=>document},lease,vercel:async endpoint=>{assert.equal(endpoint,'/v13/deployments/'+candidate);return{id:candidate,projectId:TARGET.project,ownerId:TARGET.team,team:{id:TARGET.team},meta:{ltcSourceCommit:commit},url:'candidate.vercel.app'};},fetchImpl:async(url,options)=>{posts.push({url,options});return new Response(null,{status:204});}});
 await command(['promote','https://candidate.vercel.app','--yes']);
 current.payload={kind:'vercel-rollback',failed:candidate,restore:previous,commit};
 await command(['rollback',previous,'--non-interactive']);
 assert(posts[0].url.includes('/promote/'+candidate));assert(posts[1].url.includes('/rollback/'+previous));
 for(const post of posts){assert.equal(post.options.redirect,'error');assert.equal(post.options.method,'POST');assert.equal(post.options.body,'{}');assert.equal(post.options.headers.Authorization,'Bearer private-test-token-only');}
 await assert.rejects(command(['rollback','dpl_Other','--non-interactive']));assert.equal(posts.length,2);
});
test('routine gate stays closed without separately protected configuration and exact canonical hash',()=>{
 assert.throws(()=>assertMigrationAcceptance(),/migration_acceptance_pending/);assert.equal(readReviewedMigrationConfiguration({}),null);
 for(const env of [{LTC_MIGRATION_ACCEPTANCE_JSON:'{}'},{LTC_MIGRATION_ACCEPTANCE_JSON:'{}',LTC_MIGRATION_ACCEPTANCE_SHA256:'a'.repeat(64)}])assert.throws(()=>readReviewedMigrationConfiguration(env));
 const config={schemaVersion:1};assert.deepEqual(readReviewedMigrationConfiguration({LTC_MIGRATION_ACCEPTANCE_JSON:JSON.stringify(config),LTC_MIGRATION_ACCEPTANCE_SHA256:hash(config)}),config);
});
