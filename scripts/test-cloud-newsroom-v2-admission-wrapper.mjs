import { inspectCloudNewsroomV2Html } from './cloud-newsroom-v2-html-safety.mjs';
const inertHtmlFixture='<!doctype html><html><head><title>Synthetic fixture</title></head><body><p>Not publication evidence.</p></body></html>';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runCloudNewsroomV2Admission } from './cloud-newsroom-v2-admission-wrapper.mjs';
import { projectReceiptToPdfRegistry } from './lib/ltc-pdf-receipt.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex'),pin='a'.repeat(40),impl='b'.repeat(40),implHash='c'.repeat(64);
function receipt(date='2026-11-16'){
 const id=`ltc-daily-${date}`,artifacts=['pdf','html','cover','promo'].map((role,i)=>({role,path:`artifacts/${date}/r1/${role}`,editionId:id,editionDate:date,revision:1,sha256:hash(date+role),bytes:100+i,mimeType:i===0?'application/pdf':i===1?'text/html':'image/png',...(i===0?{pages:29}:{})}));
 return {status:'accepted-receipt',errors:[],operational:false,effects:[],artifacts:artifacts.map(a=>({...a,verification:'actual-local-file-bytes',...(a.role==='html'?{htmlSafety:inspectCloudNewsroomV2Html(Buffer.from(inertHtmlFixture))}:{})})),coverDimensions:{width:675,height:900,verification:'png-ihdr-with-crc',renderVerified:false},publication:{registryId:`${date}-r1`,page:`/conversations/editions/${date}/`,canonicalUrl:`https://ltcmagazine.org/conversations/editions/${date}/`,title:'Synthetic source-led daily',dek:'Test evidence, not a publication claim.',preparedAt:`${date}T18:59:30Z`,preparedDate:date},validation:{status:'validated-description',errors:[],manifest:{schemaVersion:1,generation:'cloud-newsroom-v2',kind:'daily',editionId:id,editionDate:date,revision:1,sourceCommit:pin,implementationCommit:impl,implementationSha256:implHash,preparedAt:`${date}T18:59:30Z`,artifacts,correction:null,sources:[{id:'btc',status:'verified',claimVerified:true,classification:'current',value:123,publishedAt:null,eventAt:null,effectiveAt:`${date}T18:58:00Z`,retrievedAt:`${date}T18:59:00Z`,maxRetrievalAgeSeconds:180,maxEffectiveAgeSeconds:300}]}}};
}
function fixture(){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'v2-wrapper-'))),repo=join(root,'repo');mkdirSync(repo);
 const git=(...args)=>execFileSync('/usr/bin/git',['-C',repo,...args],{env:{PATH:'/usr/bin:/bin',HOME:root,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'},stdio:['ignore','pipe','pipe']}).toString().trim();
 const put=(path,text)=>{mkdirSync(dirname(join(repo,path)),{recursive:true});writeFileSync(join(repo,path),text);};
 git('init','-b','daily');git('config','user.email','fixture@example.invalid');git('config','user.name','Offline fixture');git('remote','add','origin','https://github.com/test/news.git');
 const old={id:'2026-11-15-r1',date:'2026-11-15',revision:1,title:'Prior',dek:'Preserved historical record.',preparedDate:'2026-11-15',pdf:'/magazine/daily/old.pdf',cover:'/magazine/daily/old.png',pages:1,bytes:3,sha256:hash('pdf'),coverBytes:3,coverSha256:hash('png'),coverWidth:1,coverHeight:1,correction:null};
 const registry={schemaVersion:1,current:old.id,issues:[old]},priorFiles={'app/page.tsx':'reviewed','vercel.json':'unchanged','public/magazine/daily/old.pdf':'pdf','public/magazine/daily/old.png':'png'};
 for(const [p,b]of Object.entries(priorFiles))put(p,b);put('content/ltc-pdf/issues.json',JSON.stringify(registry));git('add','.');git('commit','-m','baseline');const prior=git('rev-parse','HEAD');
 const r=receipt();for(const artifacts of [r.artifacts,r.validation.manifest.artifacts])for(const a of artifacts){const b=a.role==='html'?inertHtmlFixture:'fixture '+a.role;a.bytes=Buffer.byteLength(b);a.sha256=hash(b);}
 const projection=projectReceiptToPdfRegistry(registry,r);for(const a of projection.assetCopies)put(a.destination,a.role==='html'?inertHtmlFixture:'fixture '+a.role);put('content/ltc-pdf/issues.json',JSON.stringify(projection.registry));git('add','.');git('commit','-m','candidate');
 const sourceTrust=policyFixture(r.validation.manifest.sources[0]);
 const receiptPath=join(root,'receipt.json');writeFileSync(receiptPath,JSON.stringify(r));
 const trust={repository:'test/news',branch:'daily',receiptSha256:hash(JSON.stringify(r)),trusted:{...sourceTrust,priorCommit:prior,legacyRouteIds:[],priorArtifactInventory:[],review:{sourceCommit:pin,implementationCommit:impl,implementationSha256:implHash,notBefore:'2026-11-16T18:00:00Z',expiresAt:'2026-11-16T20:00:00Z',invariantTree:Object.entries(priorFiles).map(([path,b])=>({path,mode:'100644',sha256:hash(b),bytes:Buffer.byteLength(b)}))}}};
 const trustPath=join(root,'trust.json');writeFileSync(trustPath,JSON.stringify(trust));
 const input={repoRoot:repo,trustPath,receiptPath,now:'2026-11-16T19:00:00Z',env:{VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_GIT_REPO_OWNER:'test',VERCEL_GIT_REPO_SLUG:'news',VERCEL_GIT_COMMIT_REF:'daily',VERCEL_GIT_COMMIT_SHA:git('rev-parse','HEAD')}};
 return {input,trust,git,put,root,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
function use(fn){const x=fixture();try{fn(x);}finally{x.cleanup();}}
const deny=x=>assert.equal(runCloudNewsroomV2Admission(x).status,'blocked');
test('actual immutable Git bytes yield preview review only, never promotion',()=>use(x=>{const r=runCloudNewsroomV2Admission(x.input);assert.equal(r.status,'eligible-for-preview-review',JSON.stringify(r));assert.equal(r.promotionAuthorized,false);assert.equal(r.providerEnforcement,false);assert.deepEqual(r.effects,[]);}));
test('uncommitted worktree bytes ignored; committed code mutation fails',()=>use(x=>{x.put('app/page.tsx','uncommitted evil');assert.equal(runCloudNewsroomV2Admission(x.input).status,'eligible-for-preview-review');x.git('add','.');x.git('commit','--amend','--no-edit');x.input.env.VERCEL_GIT_COMMIT_SHA=x.git('rev-parse','HEAD');deny(x.input);}));
test('committed artifact mismatch fails actual object hashing',()=>use(x=>{x.put('public/magazine/daily/2026-11-16/r1/reader.html','changed');x.git('add','.');x.git('commit','--amend','--no-edit');x.input.env.VERCEL_GIT_COMMIT_SHA=x.git('rev-parse','HEAD');deny(x.input);}));
test('no trust, inside checkout trust, symlink trust and substituted receipt deny',()=>use(x=>{deny({...x.input,trustPath:null});const internal=join(x.input.repoRoot,'trust.json');writeFileSync(internal,JSON.stringify(x.trust));deny({...x.input,trustPath:internal});const link=join(x.root,'linked.json');symlinkSync(x.input.trustPath,link);deny({...x.input,trustPath:link});writeFileSync(x.input.receiptPath,'{}');deny(x.input);}));
test('both preview variables, repository, branch and exact HEAD required',()=>use(x=>{for(const [key,value]of Object.entries({VERCEL_ENV:'production',VERCEL_TARGET_ENV:'production',VERCEL_GIT_REPO_OWNER:'other',VERCEL_GIT_COMMIT_REF:'main',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40)}))deny({...x.input,env:{...x.input.env,[key]:value}});deny({...x.input,env:{}});x.git('remote','set-url','origin','https://github.com/other/news.git');deny(x.input);}));
test('expired clock, symlink Git entries and detached HEAD deny',()=>use(x=>{deny({...x.input,now:'2026-11-17T19:00:00Z'});x.git('checkout','--detach');deny(x.input);x.git('checkout','daily');symlinkSync('app/page.tsx',join(x.input.repoRoot,'link'));x.git('add','.');x.git('commit','--amend','--no-edit');x.input.env.VERCEL_GIT_COMMIT_SHA=x.git('rev-parse','HEAD');deny(x.input);}));
test('CLI without explicit trust fails with machine marker',()=>{try{execFileSync(process.execPath,[new URL('./cloud-newsroom-v2-admission-wrapper.mjs',import.meta.url).pathname],{stdio:['ignore','pipe','pipe']});assert.fail('must deny');}catch(e){assert.equal(e.status,1);assert.match(e.stdout.toString(),/LTC_V2_ADMISSION_DENY/);}});

// Synthetic external coordinator observations only, never production trust creation.
function policyFixture(s){
 Object.assign(s,{url:'https://api.exchange.coinbase.com/products/BTC-USD/ticker',metricKind:'venue-quote',snapshotSha256:'e'.repeat(64),parserId:'coinbase-ticker',parserVersion:'1',publisherId:'coinbase',evidence:{path:'evidence/btc.json',sha256:'e'.repeat(64),retrievedAt:s.retrievedAt}});
 const key=JSON.stringify([s.id,s.url,s.metricKind]);
 return {trustedSourcePolicies:{[key]:{classification:'current',publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion,maxRetrievalAgeSeconds:7200,maxEffectiveAgeSeconds:7200}},trustedEvidence:{[key]:{bytesObserved:true,sourceId:s.id,url:s.url,snapshotSha256:s.snapshotSha256,path:s.evidence.path,retrievedAt:s.retrievedAt,publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion}}};
}
