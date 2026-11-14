import {createScopedGoogleAuthorization} from './cloud-ltc-google-auth.mjs';
// Same-app READ-ONLY recovery. No CLI, stdout, artifact upload, create/update,
// sharing, deletion, ledger API or automatic retry. Returned IDs are private.
const check=(v,c)=>{if(!v)throw Error(`receipt_lookup_${c}`);};
const opaque=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,160}$/.test(v);
export function createReceiptLookup({config,env,fetchImpl=fetch,clock=Date.now,timeoutMs=10000}){
 check(config&&opaque(config.folderId)&&opaque(config.ownerPermissionId)&&/^[a-f0-9]{64}$/.test(config.bootstrapKey??'')&&typeof config.publisherClientId==='string'&&config.publisherClientId===env?.LTC_GOOGLE_CLIENT_ID,'config');
 check(typeof fetchImpl==='function'&&typeof clock==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=10&&timeoutMs<=30000,'config');
 const c=Object.freeze({...config}),auth=createScopedGoogleAuthorization({env,fetchImpl}),fetcher=fetchImpl;
 async function get(url){
  const controller=new AbortController();let timer,reader;
  try{return await Promise.race([auth(async(access,grant)=>{check(!controller.signal.aborted,'timeout');grant.assertUsable();
   const r=await fetcher(url,{method:'GET',redirect:'error',cache:'no-store',signal:controller.signal,headers:{authorization:`Bearer ${access.LTC_GOOGLE_ACCESS_TOKEN}`,accept:'application/json'}});
   check(r.status===200&&!r.redirected&&/^application\/json(?:\s*;|$)/i.test(r.headers.get('content-type')??''),'response');reader=r.body?.getReader();check(reader,'body');let length=0;const chunks=[];
   for(;;){const x=await reader.read();check(!controller.signal.aborted,'timeout');if(x.done)break;length+=x.value.byteLength;check(length<=262144,'size');chunks.push(Buffer.from(x.value));}
   const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));check(value&&typeof value==='object'&&!Array.isArray(value),'json');return value;
  }),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},timeoutMs);})]);}
  finally{clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{});}
 }
 async function privateMetadata(id,mime){
  const file=await get(`https://www.googleapis.com/drive/v3/files/${id}?fields=${encodeURIComponent('id,name,mimeType,parents,trashed,ownedByMe,shared,driveId,appProperties,capabilities')}`);
  const permissions=await get(`https://www.googleapis.com/drive/v3/files/${id}/permissions?fields=${encodeURIComponent('nextPageToken,permissions(id,type,role,deleted)')}&pageSize=100`);
  check(file.id===id&&file.mimeType===mime&&file.trashed===false&&file.ownedByMe===true&&file.shared===false&&!file.driveId,'privacy');
  check(!permissions.nextPageToken&&Array.isArray(permissions.permissions)&&permissions.permissions.length===1,'permissions');const p=permissions.permissions[0];check(p.id===c.ownerPermissionId&&p.type==='user'&&p.role==='owner'&&p.deleted!==true,'owner');return file;
 }
 return Object.freeze({async lookup(){
  try{
   const started=clock();check(Number.isFinite(started),'clock');
   const fresh=()=>{const now=clock();check(Number.isFinite(now)&&now>=started&&now-started<=120000,'stale');return now;};
   await privateMetadata(c.folderId,'application/vnd.google-apps.folder');fresh();
   const q=`'${c.folderId}' in parents and appProperties has { key='ltcReceiptBootstrap' and value='${c.bootstrapKey}' }`;
   let pageToken,finished=false;const ids=new Set(),tokens=new Set();
   for(let page=0;page<5;page++){
    const query=new URLSearchParams({q,spaces:'drive',corpora:'user',pageSize:'2',fields:'nextPageToken,incompleteSearch,files(id)',...(pageToken?{pageToken}:{})});
    const listing=await get(`https://www.googleapis.com/drive/v3/files?${query}`);fresh();
    check(listing.incompleteSearch===false&&Array.isArray(listing.files)&&listing.files.length<=2,'incomplete');
    for(const f of listing.files){check(opaque(f.id)&&!ids.has(f.id),'list_identity');ids.add(f.id);}
    if(ids.size>1)return Object.freeze({status:'multiple-matches',retryCreateAllowed:false});
    if(!listing.nextPageToken){finished=true;break;}
    check(typeof listing.nextPageToken==='string'&&listing.nextPageToken.length<=2048&&!tokens.has(listing.nextPageToken),'pagination');pageToken=listing.nextPageToken;tokens.add(pageToken);
   }
   check(finished,'page_limit');if(ids.size===0)return Object.freeze({status:'not-observed-unknown',retryCreateAllowed:false});
   const documentId=[...ids][0],file=await privateMetadata(documentId,'application/vnd.google-apps.document');fresh();
   check(file.capabilities?.canEdit===true&&file.name==='LTC private recovery receipt'&&Array.isArray(file.parents)&&file.parents.length===1&&file.parents[0]===c.folderId&&file.appProperties?.ltcReceiptBootstrap===c.bootstrapKey,'binding');
   const doc=await get(`https://docs.googleapis.com/v1/documents/${documentId}?includeTabsContent=true&suggestionsViewMode=SUGGESTIONS_INLINE`);fresh();
   const tab=doc.tabs?.[0],content=tab?.documentTab?.body?.content,paragraph=content?.[1],elements=paragraph?.paragraph?.elements;
   check(doc.documentId===documentId&&typeof doc.revisionId==='string'&&doc.revisionId.length>0&&!doc.body&&Array.isArray(doc.tabs)&&doc.tabs.length===1&&!tab.childTabs?.length&&typeof tab.tabProperties?.tabId==='string'&&Array.isArray(content)&&content.length===2&&content[0].sectionBreak&&content[0].endIndex===1&&paragraph.startIndex===1&&paragraph.endIndex===2&&!paragraph.table&&!paragraph.tableOfContents&&Array.isArray(elements)&&elements.length===1&&elements[0].startIndex===1&&elements[0].endIndex===2&&elements[0].textRun?.content==='\n'&&!paragraph.paragraph.bullet&&!elements[0].textRun.textStyle?.link,'document_shape');
   // namedStyles contains normal default styles in native Docs, not content.
   for(const container of [doc,tab.documentTab])for(const k of ['headers','footers','footnotes','inlineObjects','positionedObjects','namedRanges'])check(!container[k]||Object.keys(container[k]).length===0,'hidden_content');
   const rejectSuggestions=v=>{if(!v||typeof v!=='object')return;for(const[k,value]of Object.entries(v)){if(k.startsWith('suggested')||k==='suggestions')check(!value||(typeof value==='object'&&Object.keys(value).length===0),'suggestions');rejectSuggestions(value);}};rejectSuggestions(doc);
   return Object.freeze({status:'verified-existing-private-receipt',documentId,revisionId:doc.revisionId,bootstrapKey:c.bootstrapKey,observedAt:fresh(),retryCreateAllowed:false,creationPerformed:false});
  }catch{return Object.freeze({status:'lookup-unconfirmed',retryCreateAllowed:false});}
 }});
}
// Only this projection may go to public runner logs; never serialize lookup().
export function receiptLookupPublicStatus(result){return Object.freeze({status:['multiple-matches','not-observed-unknown','verified-existing-private-receipt','lookup-unconfirmed'].includes(result?.status)?result.status:'lookup-unconfirmed',creationPerformed:false,retryCreateAllowed:false});}
