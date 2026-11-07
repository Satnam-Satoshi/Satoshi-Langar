import test from 'node:test';
import assert from 'node:assert/strict';
import {createUploadRecoveryDependencies} from './cloud-ltc-upload-recovery-runtime.mjs';
const base=()=>({env:{GITHUB_TOKEN:'fixture-github-token',VERCEL_TOKEN:'fixture-vercel-token'},
  review:{folderId:'private-folder',ownerPermissionId:'owner-identity'},
  evidenceConfig:{folderId:'private-folder',ownerPermissionId:'owner-identity'},root:'/unused',state:{},writerEvidenceFile:'/unused'});
test('runtime rejects mismatched private evidence bindings before any request',()=>{
  for(const key of ['folderId','ownerPermissionId']) {
    const options=base(); options.evidenceConfig[key]='different';
    assert.throws(()=>createUploadRecoveryDependencies(options),/private_binding_changed/);
  }
});
test('origin read uses exact attempt, authenticated GET and repository identity',async()=>{
  const requests=[];
  const d=createUploadRecoveryDependencies({...base(),fetchImpl:async(url,options)=>{
    requests.push({url,options});
    return new Response(JSON.stringify({id:90,run_attempt:1,repository:{full_name:'Satnam-Satoshi/Satoshi-Langar'},status:'completed'}),{status:200});
  }});
  const result=await d.readOrigin({runId:'90',attempt:'1'});
  assert.equal(requests.length,1);
  assert.equal(requests[0].url,'https://api.github.com/repos/Satnam-Satoshi/Satoshi-Langar/actions/runs/90/attempts/1');
  assert.equal(requests[0].options.method,'GET');
  assert.equal(requests[0].options.redirect,'error');
  assert.equal(result.repository,'Satnam-Satoshi/Satoshi-Langar');
  assert.ok(Number.isFinite(Date.parse(result.observedAt)));
  assert.equal(JSON.stringify(result).includes('fixture-github-token'),false);
});
test('wrong repository, unavailable origin and redirects cannot produce origin proof',async()=>{
  for(const fetchImpl of [async()=>new Response(JSON.stringify({repository:{full_name:'other/repo'}})),
    async()=>new Response('{}',{status:403}), async()=>{throw Error('credential-private');}]) {
    const d=createUploadRecoveryDependencies({...base(),fetchImpl});
    await assert.rejects(d.readOrigin({runId:'90',attempt:'1'}),/origin_changed|provider_read_unavailable/);
  }
});
