import {receiptBody} from './cloud-ltc-receipt-provenance.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {runReceiptBootstrapCli,BOOTSTRAP_SOURCE_FILES} from './cloud-ltc-receipt-provenance-cli.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function fixture(){const files=Object.fromEntries(BOOTSTRAP_SOURCE_FILES.map(f=>[f,Buffer.from('fixture '+f)])),manifest=Object.fromEntries(Object.entries(files).map(([f,b])=>[f,hash(b)]));const config={github:{workflowPath:'.github/workflows/receipt-bootstrap-once.yml',runId:'123',sourceSha:'a'.repeat(40),executedSourceSha:'a'.repeat(40)},publisher:{publisherClientId:'fixture-client.apps.googleusercontent.com',folderId:'fixture_folder',ownerPermissionId:'fixture_owner',incident:'Fixture incident',runId:'123',attempt:1},sourceManifest:manifest,sourceManifestSha256:hash(JSON.stringify(manifest))};let constructed=0,reads=0,posts=0,writes=[];const env={RUNNER_TEMP:'/private-temp',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',GITHUB_TOKEN:'read-token',LTC_GOOGLE_CLIENT_ID:'fixture-client.apps.googleusercontent.com',LTC_GOOGLE_CLIENT_SECRET:'SECRET',LTC_GOOGLE_REFRESH_TOKEN:'SECRET'};
const deps={env,root:'/source',stat:async()=>({isFile:()=>true,isSymbolicLink:()=>false,mode:0o100600}),gitHead:()=>config.github.sourceSha,read:async p=>{if(p.endsWith('ltc-receipt-bootstrap-private.json'))return JSON.stringify(config);reads++;return files[p.replace('/source/','')];},write:async(...args)=>writes.push(args),pinReaderFactory:()=>async()=>({}),admissionFactory:()=>async()=>({assertInvocation:()=>true}),transportFactory:()=>{constructed++;const r=(id,mime)=>({id,mimeType:mime,trashed:false,ownedByMe:true,shared:false,permissions:[{id:'fixture_owner',type:'user',role:'owner'}],capabilities:{canEdit:true,canAddChildren:true},observedAt:1000});return {now:()=>1000,assertPublisherIdentity:()=>true,readFolder:async()=>r('fixture_folder','application/vnd.google-apps.folder'),createNativeDocument:async(_,g)=>{g.beforeCreate();posts++;return {id:'fixture_document'};},readDocument:async()=>({...r('fixture_document','application/vnd.google-apps.document'),name:receiptBody(config.publisher).name,parents:['fixture_folder'],appProperties:receiptBody(config.publisher).appProperties,document:{documentId:'fixture_document',revisionId:'r',tabs:[{tabProperties:{tabId:'t'},documentTab:{body:{content:[{sectionBreak:{},endIndex:1},{startIndex:1,endIndex:2,paragraph:{elements:[{startIndex:1,endIndex:2,textRun:{content:'\n'}}]}}]}}}]}})};}};
return {config,files,deps,stats:()=>({constructed,reads,posts,writes})};}
test('fixed CLI verifies all source files before transport and retains private result exclusively',async()=>{const f=fixture(),r=await runReceiptBootstrapCli(f.deps);assert.equal(r.status,'verified-private-document');assert.equal(r.admissionMode,'bounded-single-invocation');assert.equal(r.exactlyOnceGuaranteed,false);assert.equal(f.stats().reads,BOOTSTRAP_SOURCE_FILES.length);assert.equal(f.stats().posts,1);assert.deepEqual(f.stats().writes[0][2],{flag:'wx',mode:0o600});});
for(const [name,change]of [['rerun',f=>f.deps.env.GITHUB_RUN_ATTEMPT='2'],['wrongrun',f=>f.deps.env.GITHUB_RUN_ID='456'],['head',f=>f.deps.gitHead=()=> 'c'.repeat(40)],['manifest',f=>f.config.sourceManifestSha256='c'.repeat(64)],['changedbytes',f=>f.files[BOOTSTRAP_SOURCE_FILES[0]]=Buffer.from('changed')],['symlink',f=>f.deps.stat=async()=>({isFile:()=>true,isSymbolicLink:()=>true,mode:0o600})],['permissions',f=>f.deps.stat=async()=>({isFile:()=>true,isSymbolicLink:()=>false,mode:0o644})]])test(name+' fails before Google transport',async()=>{const f=fixture();change(f);await assert.rejects(runReceiptBootstrapCli(f.deps));assert.equal(f.stats().constructed,0);assert.equal(f.stats().posts,0);});
test('failed provider admission never calls create',async()=>{const f=fixture();f.deps.admissionFactory=()=>async()=>{throw Error('SECRET');};const r=await runReceiptBootstrapCli(f.deps);assert.equal(r.status,'blocked');assert.equal(f.stats().posts,0);assert(!JSON.stringify(r).includes('SECRET'));});
test('failed result retention does not authorize retry',async()=>{const f=fixture();f.deps.write=async()=>{throw Error('private path');};const r=await runReceiptBootstrapCli(f.deps);assert.equal(r.status,'outcome-retention-uncertain');assert.equal(r.retryAllowed,false);assert.equal(f.stats().posts,1);});

test('protected credential identity derived only in create step, never persisted in config/result',async()=>{const f=fixture();f.config.publisher.identitySource='protected-publisher-credential';delete f.config.publisher.publisherClientId;const factory=f.deps.transportFactory;let observed;f.deps.transportFactory=options=>{observed=options;return factory(options);};const r=await runReceiptBootstrapCli(f.deps);assert.equal(r.status,'verified-private-document');assert.equal(observed.config.publisherClientId,f.deps.env.LTC_GOOGLE_CLIENT_ID);assert.equal(observed.env.LTC_GOOGLE_CLIENT_ID,f.deps.env.LTC_GOOGLE_CLIENT_ID);assert(!Object.hasOwn(f.config.publisher,'publisherClientId'));assert(!JSON.stringify(r).includes('apps.googleusercontent.com'));assert(!f.stats().writes[0][1].includes('apps.googleusercontent.com'));});
for(const [name,mutate]of [['protected override',f=>{f.config.publisher.identitySource='protected-publisher-credential';}],['unknown mode',f=>{f.config.publisher.identitySource='any-account';}],['missing credential',f=>{delete f.deps.env.LTC_GOOGLE_CLIENT_ID;}],['malformed credential',f=>{f.deps.env.LTC_GOOGLE_CLIENT_ID='not-a-client';}],['explicit mismatch',f=>{f.config.publisher.publisherClientId='different-client.apps.googleusercontent.com';}]])test(name+' rejects before transport',async()=>{const f=fixture();mutate(f);await assert.rejects(runReceiptBootstrapCli(f.deps));assert.equal(f.stats().constructed,0);assert.equal(f.stats().posts,0);});
test('explicit identity mode remains supported',async()=>{const f=fixture();f.config.publisher.identitySource='explicit-client-id';assert.equal((await runReceiptBootstrapCli(f.deps)).status,'verified-private-document');});

test('null identity mode is not silently treated as legacy',async()=>{const f=fixture();f.config.publisher.identitySource=null;await assert.rejects(runReceiptBootstrapCli(f.deps),/identity_source/);assert.equal(f.stats().posts,0);});

function defaultPathFixture(priorConclusion='skipped'){
 const f=fixture(),calls=[];delete f.deps.admissionFactory;delete f.deps.pinReaderFactory;delete f.deps.transportFactory;
 f.config.github.workflowSha='c'.repeat(40);f.config.github.environmentId=42;
 f.deps.env.LTC_GOOGLE_CLIENT_SECRET='synthetic-secret-not-real';f.deps.env.LTC_GOOGLE_REFRESH_TOKEN='synthetic-refresh-not-real';
 const current={id:123,run_attempt:1,repository:{full_name:'Satnam-Satoshi/Satoshi-Langar'},path:f.config.github.workflowPath,event:'workflow_dispatch',head_branch:'main',head_sha:f.config.github.workflowSha,status:'in_progress',conclusion:null};
 const prior={...current,id:122,status:'completed',conclusion:'failure'};
 const job=(id,name,status,conclusion,run_id=123)=>({id,name,status,conclusion,run_id,run_attempt:1,head_sha:current.head_sha});
 let posted;
 f.deps.fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method});
  assert.equal(options.redirect,'error');
  if(url.startsWith('https://api.github.com/')){
   assert.equal(options.method,'GET');assert.equal(options.headers.authorization,'Bearer read-token');
   if(url.includes('/workflows/receipt-bootstrap-once.yml/runs?'))return Response.json({total_count:2,workflow_runs:[current,prior]});
   if(url.endsWith('/runs/123'))return Response.json(current);
   if(url.endsWith('/runs/122'))return Response.json(prior);
   if(url.includes('/122/attempts/1/jobs?'))return Response.json({total_count:1,jobs:[{...job(9,'previous-create','completed','failure',122),steps:[{name:'Create private receipt once',status:'completed',conclusion:priorConclusion}]}]});
   if(url.includes('/123/attempts/1/jobs?'))return Response.json({total_count:2,jobs:[job(10,'owner-approval','completed','success'),job(11,'create-private-receipt-once','in_progress',null)]});
   if(url.endsWith('/runs/123/approvals'))return Response.json([{state:'approved',user:{id:268053325,type:'User'},environments:[{id:42,name:'ltc-receipt-owner-approval'}]}]);
   throw Error('unexpected mocked GitHub endpoint');
  }
  if(url==='https://oauth2.googleapis.com/token'){
   assert.equal(options.method,'POST');const form=new URLSearchParams(options.body);assert.equal(form.get('client_id'),f.deps.env.LTC_GOOGLE_CLIENT_ID);
   return Response.json({access_token:'synthetic-access-token',token_type:'Bearer',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file'});
  }
  assert.equal(options.headers.authorization,'Bearer synthetic-access-token');
  if(url==='https://www.googleapis.com/drive/v3/files?fields=id'){
   assert.equal(options.method,'POST');assert.equal(posted,undefined);posted=JSON.parse(options.body);assert.deepEqual(posted,receiptBody(f.config.publisher));return Response.json({id:'fixture_document'});
  }
  assert.equal(options.method,'GET');
  if(url.includes('/permissions?'))return Response.json({permissions:[{id:'fixture_owner',type:'user',role:'owner'}]});
  if(url.startsWith('https://docs.googleapis.com/v1/documents/fixture_document?'))return Response.json({documentId:'fixture_document',revisionId:'private-revision',tabs:[{tabProperties:{tabId:'tab'},documentTab:{body:{content:[{sectionBreak:{},endIndex:1},{startIndex:1,endIndex:2,paragraph:{elements:[{startIndex:1,endIndex:2,textRun:{content:'\n'}}]}}]}}}]});
  const folder=url.startsWith('https://www.googleapis.com/drive/v3/files/fixture_folder?');
  assert.ok(folder||url.startsWith('https://www.googleapis.com/drive/v3/files/fixture_document?'));
  return Response.json({...(folder?{}:posted),id:folder?'fixture_folder':'fixture_document',mimeType:folder?'application/vnd.google-apps.folder':'application/vnd.google-apps.document',trashed:false,ownedByMe:true,shared:false,capabilities:{canEdit:true,canAddChildren:true}});
 };
 return {...f,calls};
}
test('default CLI factories integrate inventory, native approval, OAuth and single private create/readback',async()=>{
 const f=defaultPathFixture(),r=await runReceiptBootstrapCli(f.deps);assert.equal(r.status,'verified-private-document');assert.equal(r.documentId,'fixture_document');
 const urls=f.calls.map(c=>c.url),oauth=urls.indexOf('https://oauth2.googleapis.com/token'),approval=urls.findIndex(u=>u.endsWith('/approvals')),create=urls.indexOf('https://www.googleapis.com/drive/v3/files?fields=id');
 assert.equal(urls.filter(u=>u.includes('/workflows/receipt-bootstrap-once.yml/runs?')).length,2);
 assert.ok(urls.findIndex(u=>u.includes('/122/attempts/1/jobs?'))<approval&&approval<oauth&&oauth<create);
 assert.ok(urls.findIndex(u=>u.includes('/fixture_folder/permissions?'))<create);
 assert.equal(f.calls.filter(c=>c.method==='POST'&&c.url.includes('/drive/')).length,1);
 assert.ok(urls.at(-1).startsWith('https://docs.googleapis.com/'));assert.equal(f.stats().writes.length,1);assert.deepEqual(f.stats().writes[0][2],{flag:'wx',mode:0o600});
});
for(const conclusion of ['failure','success',null])test(`default CLI blocks uncertain/executed prior create ${conclusion} before native approval or OAuth`,async()=>{
 const f=defaultPathFixture(conclusion),r=await runReceiptBootstrapCli(f.deps);assert.equal(r.status,'blocked');assert.equal(r.retryAllowed,false);assert.ok(f.calls.every(c=>c.method==='GET'&&c.url.startsWith('https://api.github.com/')));assert.ok(!f.calls.some(c=>c.url.endsWith('/approvals')));
});
