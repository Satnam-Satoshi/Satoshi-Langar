import {receiptProvenance,receiptBody} from './cloud-ltc-receipt-provenance.mjs';
import {createScopedGoogleAuthorization} from './cloud-ltc-google-auth.mjs';
// Fixed-endpoint publisher transport only. No workflow, receipt reservation,
// general request API, secret logging, sharing, deletion, or ledger writes.
const diagnostics=new WeakMap();
const phases=new Set(['auth','guard','transport','http-status','content-type','size','body','json']);
const resources=new Set(['drive-metadata','drive-permissions','native-create','docs-document']);
export function receiptTransportDiagnostic(error){return error&&typeof error==='object'?diagnostics.get(error)??null:null;}
const check=(v,c)=>{if(!v)throw Error('receipt_transport_'+c);};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,160}$/.test(v);
export function createReceiptBootstrapTransport({config,env,fetchImpl=fetch,timeoutMs=15000,clock=Date.now,authorizationClock=()=>performance.now()}){
 check(config&&id(config.folderId)&&id(config.ownerPermissionId)&&receiptProvenance(config)&&typeof config.publisherClientId==='string'&&config.publisherClientId===env?.LTC_GOOGLE_CLIENT_ID,'configuration');
 check(typeof fetchImpl==='function'&&typeof clock==='function'&&typeof authorizationClock==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=10&&timeoutMs<=30000,'configuration');
 const c=Object.freeze({folderId:config.folderId,ownerPermissionId:config.ownerPermissionId,...receiptProvenance(config),publisherClientId:config.publisherClientId});
 const fetcher=fetchImpl,now=()=>{const value=clock();check(Number.isFinite(value),'clock');return value;};
 const authorize=createScopedGoogleAuthorization({env,fetchImpl:fetcher,clock:authorizationClock});
 let createInvoked=false;
 const createdIds=new Set();
 async function request(url,{method='GET',body,limit=65536,beforeSend,resource}={}){
  const controller=new AbortController();let timer,cancelRead=()=>{},phase='auth',httpStatus=null;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('receipt_transport_timeout'));},timeoutMs);});
  try{return await Promise.race([authorize(async(access,grant)=>{
   phase='guard';check(!controller.signal.aborted,'timeout');grant.assertUsable();
   if(beforeSend){check(beforeSend()===undefined,'guard');phase='guard';check(!controller.signal.aborted,'timeout');grant.assertUsable();}
   // No await between final guard and fixed endpoint POST.
   phase='transport';const response=await fetcher(url,{method,redirect:'error',cache:'no-store',signal:controller.signal,headers:{authorization:`Bearer ${access.LTC_GOOGLE_ACCESS_TOKEN}`,accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   phase='http-status';httpStatus=response.status;check(!response.redirected&&response.status===200,'response');
   phase='content-type';
   check(/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??''),'content_type');
   phase='size';const length=response.headers.get('content-length');check(length===null||(/^\d+$/.test(length)&&Number(length)<=limit),'size');
   phase='body';check(response.body&&typeof response.body.getReader==='function','body');
   const reader=response.body.getReader();cancelRead=()=>{void reader.cancel().catch(()=>{});};let bytes=0;const parts=[];
   try{for(;;){const {done,value}=await reader.read();check(!controller.signal.aborted,'timeout');if(done)break;bytes+=value.byteLength;if(bytes>limit){phase='size';throw Error('receipt_transport_size');}parts.push(Buffer.from(value));}}finally{void reader.cancel().catch(()=>{});}
   phase='json';const parsed=JSON.parse(Buffer.concat(parts).toString('utf8'));check(parsed&&typeof parsed==='object'&&!Array.isArray(parsed),'json');return parsed;
  }),deadline]);}catch{const error=Error('receipt_transport_unconfirmed');diagnostics.set(error,Object.freeze({resource:resources.has(resource)?resource:'unknown',phase:phases.has(phase)?phase:'unknown',httpStatus:Number.isInteger(httpStatus)&&httpStatus>=100&&httpStatus<=599?httpStatus:null,timedOut:controller.signal.aborted}));throw error;}finally{clearTimeout(timer);controller.abort();cancelRead();}
 }
 const fields='id,name,mimeType,parents,trashed,ownedByMe,shared,driveId,capabilities,appProperties';
 async function readMetadata(fileId){
  const observedAt=now();
  const file=await request(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=${encodeURIComponent(fields)}`,{resource:'drive-metadata'});
  const perms=await request(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=${encodeURIComponent('nextPageToken,permissions(id,type,role,deleted)')}&pageSize=100`,{resource:'drive-permissions'});
  check(file.id===fileId,'identity');
  return {...file,permissions:perms.permissions,nextPageToken:perms.nextPageToken,observedAt};
 }
 return Object.freeze({
  now,
  assertPublisherIdentity(binding){return binding?.folderId===c.folderId&&binding?.ownerPermissionId===c.ownerPermissionId&&binding?.runId===c.runId&&binding?.incident===c.incident&&binding?.attempt===1;},
  async readFolder(folderId){check(folderId===c.folderId,'folder');return readMetadata(c.folderId);},
  async createNativeDocument(body,{binding,beforeCreate}={}){
   check(!createInvoked,'already_attempted');createInvoked=true;
   const expected=receiptBody(c);
   check(JSON.stringify(body)===JSON.stringify(expected)&&binding?.folderId===c.folderId&&binding?.ownerPermissionId===c.ownerPermissionId&&binding?.runId===c.runId&&binding?.incident===c.incident&&binding?.attempt===1&&typeof beforeCreate==='function','create_scope');
   const result=await request('https://www.googleapis.com/drive/v3/files?fields=id',{method:'POST',body:expected,beforeSend:beforeCreate,resource:'native-create'});
   check(id(result.id),'created_id');createdIds.add(result.id);return {id:result.id};
  },
  async readDocument(documentId){
   check(createdIds.has(documentId),'document');
   const metadata=await readMetadata(documentId);
   const document=await request(`https://docs.googleapis.com/v1/documents/${documentId}?includeTabsContent=true&suggestionsViewMode=SUGGESTIONS_INLINE`,{limit:262144,resource:'docs-document'});
   check(document.documentId===documentId,'document');return {...metadata,document};
  }
 });
}
