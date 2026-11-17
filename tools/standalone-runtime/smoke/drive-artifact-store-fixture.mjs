/** Synthetic only: no SDK, network, credentials or real user data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {FIRESTORE_STATE_DOCUMENT} from '../src/firestore-state.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>JSON.stringify(sort(v));
const sort=v=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;
export function createArtifactStoreFixture(){
 const rows=new Map(),files=new Map(),counters={posts:0,gets:0};let now='2026-11-17T14:10:00.000Z',serial=Promise.resolve();
 const control={schemaVersion:1,generation:'standalone-v1',initialized:true,revision:1,fence:1,emergencyStop:false,lease:{owner:'worker',fence:1,expiresAt:'2026-11-17T15:00:00.000Z'},jobs:{}};
 rows.set(FIRESTORE_STATE_DOCUMENT,{schemaVersion:1,generation:'standalone-v1',revision:1,payloadJson:canonical(control)});
 rows.set('newsroomPrivateUploadInventoryV1/root',{schemaVersion:1,generation:'standalone-upload-inventory-v1',initialized:true,revision:1,claims:{}});
 rows.set('newsroomPrivateArtifactBundlesV1/inventory',{schemaVersion:1,generation:'standalone-artifact-bundles-v1',initialized:true,revision:1,claims:{}});
 const snap=(map,path)=>{const present=map.has(path),value=structuredClone(map.get(path));return {exists:present,data:()=>structuredClone(value)};};
 const sdk={databaseId:'(default)',doc:path=>({path,get:async()=>snap(rows,path)}),runTransaction:cb=>{
  const run=serial.then(async()=>{const transactionRows=new Map([...rows].map(([k,v])=>[k,structuredClone(v)])),pending=[];let writeStarted=false;
   const result=await cb({get:async ref=>{assert.equal(writeStarted,false,'all transaction reads must precede writes');return snap(transactionRows,ref.path);},create:(ref,value)=>{writeStarted=true;assert.equal(transactionRows.has(ref.path),false,'create must be absent');assert.equal(pending.some(([p])=>p===ref.path),false);pending.push([ref.path,structuredClone(value)]);},update:(ref,value)=>{writeStarted=true;assert.equal(transactionRows.has(ref.path),true,'update must exist');assert.equal(pending.some(([p])=>p===ref.path),false);pending.push([ref.path,{...structuredClone(transactionRows.get(ref.path)),...structuredClone(value)}]);}});
   for(const [path,value]of pending)rows.set(path,value);return result;
  });serial=run.catch(()=>{});return run;
 }};
 function Firestore(options){assert.deepEqual(options,{projectId:'synthetic-project',databaseId:'(default)',ignoreUndefinedProperties:false});return sdk;}
 const owner={permissionId:'fixture-owner',me:true},folderId='fixture-folder';
 const response=(url,data,mime='application/json')=>({url,status:200,redirected:false,headers:new Headers({'content-type':mime}),body:new Response(data instanceof Uint8Array?data:JSON.stringify(data)).body});
 function metadata(id){const f=files.get(id);assert.ok(id===folderId||f,'unknown fixture file');return {id,name:id===folderId?'Synthetic private folder':f.name,mimeType:id===folderId?'application/vnd.google-apps.folder':f.mimeType,version:id===folderId?'1':f.version,trashed:false,ownedByMe:true,shared:false,owners:[owner],capabilities:{canAddChildren:true,canDownload:true},...(id===folderId?{}:{parents:[folderId],size:String(f.bytes.length),sha256Checksum:sha(f.bytes)})};}
 const fetch=async(url,o)=>{
  const u=new URL(url);assert.equal(u.origin,'https://www.googleapis.com');assert.equal(o.redirect,'manual');assert.match(o.headers.Authorization,/^Bearer synthetic-/);
  if(o.method==='POST'){
   assert.equal(u.pathname,'/upload/drive/v3/files');assert.equal(u.searchParams.get('uploadType'),'multipart');assert.equal(u.searchParams.get('fields'),'id,version');counters.posts++;
   const ct=o.headers['Content-Type'],match=/^multipart\/related; boundary=(ltc_[a-f0-9]{64})$/.exec(ct);assert.ok(match);const boundary=match[1],body=Buffer.from(o.body),prefix=Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`);assert.ok(body.subarray(0,prefix.length).equals(prefix));const divider=Buffer.from(`\r\n--${boundary}\r\nContent-Type: `),split=body.indexOf(divider,prefix.length);assert.ok(split>prefix.length);const meta=JSON.parse(body.subarray(prefix.length,split).toString('utf8'));assert.deepEqual(Object.keys(meta).sort(),['mimeType','name','parents']);assert.deepEqual(meta.parents,[folderId]);const headerStart=split+divider.length,headerEnd=body.indexOf(Buffer.from('\r\n\r\n'),headerStart);assert.ok(headerEnd>headerStart);assert.equal(body.subarray(headerStart,headerEnd).toString(),meta.mimeType);const end=Buffer.from(`\r\n--${boundary}--\r\n`);assert.ok(body.subarray(-end.length).equals(end));const bytes=Buffer.from(body.subarray(headerEnd+4,body.length-end.length));assert.equal(boundary,'ltc_'+sha(bytes));const id=`fixture-file-${counters.posts}`;assert.equal(files.has(id),false);files.set(id,{id,version:'1',name:meta.name,mimeType:meta.mimeType,bytes});return response(url,{id,version:'1'});
  }
  assert.equal(o.method,'GET');counters.gets++;
  if(u.pathname==='/drive/v3/about')return response(url,{user:owner});
  const match=/^\/drive\/v3\/files\/([A-Za-z0-9_-]+)(\/permissions)?$/.exec(u.pathname);assert.ok(match,'fixed Drive GET route');const id=match[1];assert.ok(id===folderId||files.has(id));
  if(match[2])return response(url,{permissions:[{id:owner.permissionId,type:'user',role:'owner',deleted:false}]});
  if(u.searchParams.get('alt')==='media'){assert.ok(files.has(id));const f=files.get(id);return response(url,Buffer.from(f.bytes),f.mimeType);}return response(url,metadata(id));
 };
 const config={Firestore,expectedProjectId:'synthetic-project',expectedDatabaseId:'(default)',claim:{owner:'worker',fence:1},clock:()=>now,fetch,resolveSecret:async()=> 'synthetic-fixture-access-token',secretReference:'synthetic-fixture-secret-reference',folderId,ownerPermissionId:owner.permissionId,loadApproval:async({identity})=>({action:'create-private-drive-artifact',reference:'synthetic-artifact-approval',identity:structuredClone(identity),notBefore:'2026-11-17T14:00:00.000Z',expiresAt:'2026-11-17T15:00:00.000Z'}),networkEnabled:true,mutationsEnabled:true};
 function snapshot(){return JSON.parse(JSON.stringify({now,rows:[...rows],files:[...files].map(([id,f])=>[id,{...f,bytes:Buffer.from(f.bytes).toString('base64')}]),counters:{...counters}}));}
 function restore(s){const copy=typeof s==='string'?JSON.parse(s):structuredClone(s);rows.clear();files.clear();for(const [k,v]of copy.rows)rows.set(k,v);for(const [k,f]of copy.files)files.set(k,{...f,bytes:Buffer.from(f.bytes,'base64')});Object.assign(counters,copy.counters);now=copy.now;return fixture;}
 const fixture={config,rows,files,counters,snapshot,restore,get now(){return now;},set now(v){now=v;}};return fixture;
}
