import {receiptTransportDiagnostic} from './cloud-ltc-receipt-bootstrap-transport.mjs';
import {createHash} from 'node:crypto';
// LOCAL INJECTED DRAFT: no credentials, HTTP client, CLI, sharing or ledger API.
// Native Google Docs cannot use pre-generated Drive IDs. An external durable
// singleton admission capability is REQUIRED before this one create attempt.
const check=(v,c)=>{if(!v)throw Error('receipt_bootstrap_'+c);};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,160}$/.test(v);
function privateResource(p,config,mime,now){
 check(Number.isFinite(now),'clock');
 check(p?.capabilities?.[mime.endsWith('folder')?'canAddChildren':'canEdit']===true,'capability');
 check(p&&p.id===(mime.endsWith('folder')?config.folderId:p.id)&&id(p.id)&&p.mimeType===mime&&p.trashed===false&&p.ownedByMe===true&&p.shared===false&&!p.driveId,'privacy');
 check(Array.isArray(p.permissions)&&p.permissions.length===1&&p.permissions[0].id===config.ownerPermissionId&&p.permissions[0].type==='user'&&p.permissions[0].role==='owner'&&p.permissions[0].deleted!==true&&!p.nextPageToken,'owner');
 check(Number.isFinite(p.observedAt)&&p.observedAt<=now&&now-p.observedAt<=30000,'stale_read');
}
export function createReceiptBootstrap(config,adapters){return createBootstrap(config,adapters,'durable-reservation');}
export function createBoundedInvocationReceiptBootstrap(config,adapters){return createBootstrap(config,adapters,'bounded-single-invocation');}
function createBootstrap(config,adapters,mode){
 const admissionMethod=mode==='durable-reservation'?'reserveOnce':'oneInvocationAdmission';
 const assertionMethod=mode==='durable-reservation'?'assertReserved':'assertInvocation';
 check(config&&id(config.folderId)&&id(config.ownerPermissionId)&&/^[a-f0-9]{64}$/.test(config.bootstrapKey??''),'configuration');
 for(const name of ['now','assertPublisherIdentity',admissionMethod,'readFolder','createNativeDocument','readDocument'])check(typeof adapters?.[name]==='function','adapter');
 const a=Object.freeze(Object.fromEntries(['now','assertPublisherIdentity',admissionMethod,'readFolder','createNativeDocument','readDocument'].map(k=>[k,adapters[k].bind(adapters)])));
 const c=Object.freeze({folderId:config.folderId,ownerPermissionId:config.ownerPermissionId,bootstrapKey:config.bootstrapKey});
 const body=Object.freeze({name:'LTC private recovery receipt',mimeType:'application/vnd.google-apps.document',parents:Object.freeze([c.folderId]),appProperties:Object.freeze({ltcReceiptBootstrap:c.bootstrapKey})});
 const binding=Object.freeze({...c,bodySha256:hash(body),action:'create-one-private-receipt-document'});
 let consumed=false;
 return async function bootstrap(){
  check(!consumed,'already_attempted');consumed=true;
  let phase='identity',calls=0,createBoundary=false;
  try{
   check(a.assertPublisherIdentity(binding)===true,'publisher_identity');
   phase='reservation';const cap=await a[admissionMethod](binding);
   check(cap&&typeof cap[assertionMethod]==='function','reservation');
   const reserved=cap[assertionMethod].bind(cap);
   phase='folder';const folder=structuredClone(await a.readFolder(c.folderId));
   privateResource(folder,c,'application/vnd.google-apps.folder',a.now());
   const beforeCreate=()=>{
    check(++calls===1,'duplicate_create');
    check(a.assertPublisherIdentity(binding)===true&&reserved(binding)===true,'authority');
    privateResource(folder,c,'application/vnd.google-apps.folder',a.now());
    createBoundary=true;
   };
   phase='create';
   // Trusted transport MUST invoke beforeCreate synchronously AFTER OAuth waits,
   // immediately before its only POST. Never retry, even for HTTP errors.
   const result=await a.createNativeDocument(body,{binding,beforeCreate});
   check(calls===1&&createBoundary&&id(result?.id),'create_ack');
   const documentId=result.id;
   phase='readback';const doc=structuredClone(await a.readDocument(documentId));
   privateResource(doc,c,'application/vnd.google-apps.document',a.now());
   check(doc.id===documentId&&doc.name===body.name&&Array.isArray(doc.parents)&&doc.parents.length===1&&doc.parents[0]===c.folderId&&doc.appProperties?.ltcReceiptBootstrap===c.bootstrapKey,'binding');
   const native=doc.document,tabs=native?.tabs,tab=tabs?.[0],content=tab?.documentTab?.body?.content,paragraph=content?.[1],elements=paragraph?.paragraph?.elements;
   check(native?.documentId===documentId&&typeof native.revisionId==='string'&&native.revisionId.length>0&&!native.body&&Array.isArray(tabs)&&tabs.length===1&&!tab.childTabs?.length&&typeof tab.tabProperties?.tabId==='string'&&Array.isArray(content)&&content.length===2&&content[0].sectionBreak&&content[0].endIndex===1&&paragraph.startIndex===1&&paragraph.endIndex===2&&!paragraph.table&&!paragraph.tableOfContents&&Array.isArray(elements)&&elements.length===1&&elements[0].startIndex===1&&elements[0].endIndex===2&&elements[0].textRun?.content==='\n','blank_native_document');
   const rejectSuggestions=v=>{if(!v||typeof v!=='object')return;for(const [key,value]of Object.entries(v)){check(!((key.startsWith('suggested')||key==='suggestions')&&value&&(typeof value!=='object'||Object.keys(value).length)),'blank_native_document');rejectSuggestions(value);}};
   rejectSuggestions(native);
   for(const container of [native,tab.documentTab])for(const field of ['headers','footers','footnotes','inlineObjects','positionedObjects','namedRanges'])check(!container[field]||Object.keys(container[field]).length===0,'blank_native_document');
   check(!paragraph.paragraph.bullet&&!elements[0].textRun.textStyle?.link,'blank_native_document');
   return Object.freeze({status:'verified-private-document',documentId:doc.id,bootstrapKey:c.bootstrapKey,retryAllowed:false,...(mode==='bounded-single-invocation'?{admissionMode:mode,exactlyOnceGuaranteed:false}:{})});
  }catch(error){
   const diagnostic=receiptTransportDiagnostic(error);
   return Object.freeze({...(diagnostic?{diagnostic}:{}),status:(createBoundary||(phase==='create'&&calls===0))?'outcome-uncertain':'blocked',phase, retryAllowed:false,...(mode==='bounded-single-invocation'?{admissionMode:mode,exactlyOnceGuaranteed:false}:{})});
  }
 };
}
