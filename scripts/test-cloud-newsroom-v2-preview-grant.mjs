import test from 'node:test';import assert from 'node:assert/strict';
import{permitsCloudPreviewGrant,verifySignedPreviewGrant,readCloudPreviewGrant,evaluateCloudPreviewGrant,PREVIEW_GRANT_URL}from'./cloud-newsroom-v2-preview-grant.mjs';
const now=Date.parse('2026-11-16T20:00:00Z'),sha='a'.repeat(40),tree='b'.repeat(40);
const env={VERCEL_PROJECT_ID:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_GIT_REPO_OWNER:'Satnam-Satoshi',VERCEL_GIT_REPO_SLUG:'Satoshi-Langar',VERCEL_GIT_COMMIT_REF:'agent/cloud-newsroom-v2-20261116',VERCEL_GIT_COMMIT_SHA:sha};
const grant=()=>({schemaVersion:1,generation:'cloud-newsroom-v2',kind:'preview-admission',productionAuthorized:false,repository:'Satnam-Satoshi/Satoshi-Langar',branch:env.VERCEL_GIT_COMMIT_REF,projectId:'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',candidateCommit:sha,candidateTreeGitSha:tree,approvedCodeCommit:'c'.repeat(40),receiptSha256:'d'.repeat(64),reviewDigest:'e'.repeat(64),owner:'root-v2',fence:1,notBefore:new Date(now-1000).toISOString(),expiresAt:new Date(now+600000).toISOString()});
test('only exact short-lived preview tree grant is eligible',()=>assert.equal(permitsCloudPreviewGrant(grant(),env,{head:sha,tree},now),true));
test('production missing context wrong repo branch commit tree denied',()=>{for(const key of Object.keys(env))for(const v of [undefined,'production','bad'])assert.equal(permitsCloudPreviewGrant(grant(),{...env,[key]:v},{head:sha,tree},now),false);for(const o of [{head:'f'.repeat(40),tree},{head:sha,tree:'f'.repeat(40)}])assert.equal(permitsCloudPreviewGrant(grant(),env,o,now),false);});
test('future expired long-lived malformed authority denied',()=>{for(const mutate of [g=>g.productionAuthorized=true,g=>g.projectId='other',g=>g.fence=0,g=>g.owner='a/b',g=>g.receiptSha256='bad',g=>g.approvedCodeCommit='bad',g=>g.expiresAt=new Date(now).toISOString(),g=>g.notBefore=new Date(now+1).toISOString(),g=>g.expiresAt=new Date(now+1000000).toISOString()]){const g=grant();mutate(g);assert.equal(permitsCloudPreviewGrant(g,env,{head:sha,tree},now),false);}});
test('fixed HTTPS source, no redirects, bounded JSON',async()=>{const g=await readCloudPreviewGrant(async(url,opts)=>{assert.equal(url,PREVIEW_GRANT_URL);assert.equal(opts.redirect,'manual');return new Response(JSON.stringify(grant()),{status:200});});assert.equal(g.candidateCommit,sha);for(const response of [new Response('',{status:302}),new Response('x'.repeat(32769)),new Response('not-json'),new Response('{}',{headers:{'content-length':'40000'}})])await assert.rejects(()=>readCloudPreviewGrant(async()=>response));});
test('production never fetches and network/git failures deny',async()=>{let n=0;assert.equal(await evaluateCloudPreviewGrant({env:{...env,VERCEL_ENV:'production'},git:()=>{throw Error();},now,fetcher:()=>{n++;throw Error();}}),false);assert.equal(n,0);assert.equal(await evaluateCloudPreviewGrant({env,git:()=>{throw Error();},now,fetcher:async()=>new Response(JSON.stringify(grant()))}),false);assert.equal(await evaluateCloudPreviewGrant({env,git:()=>sha,now,fetcher:async()=>{throw Error();}}),false);});

import {generateKeyPairSync,sign} from 'node:crypto';
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
test('only independently pinned Ed25519 key validates grant; state cannot supply key',async()=>{
 const a=generateKeyPairSync('ed25519'),b=generateKeyPairSync('ed25519'),publicKey=a.publicKey.export({type:'spki',format:'pem'});
 const payload=grant(),envelope={algorithm:'Ed25519',payload,signature:sign(null,Buffer.from(canonical(payload)),a.privateKey).toString('base64')};
 assert.deepEqual(verifySignedPreviewGrant(envelope,publicKey),payload);
 assert.equal(verifySignedPreviewGrant(envelope,null),null);assert.equal(verifySignedPreviewGrant({...envelope,publicKey},null),null);
 assert.equal(verifySignedPreviewGrant(envelope,b.publicKey.export({type:'spki',format:'pem'})),null);
 const tampered=structuredClone(envelope);tampered.payload.candidateCommit='f'.repeat(40);assert.equal(verifySignedPreviewGrant(tampered,publicKey),null);
 assert.equal(await evaluateCloudPreviewGrant({env,now,git:r=>r==='HEAD'?sha:tree,trustedPublicKey:publicKey,fetcher:async()=>new Response(JSON.stringify(envelope))}),true);
 assert.equal(await evaluateCloudPreviewGrant({env,now,git:r=>r==='HEAD'?sha:tree,fetcher:async()=>new Response(JSON.stringify(envelope))}),false);
});
