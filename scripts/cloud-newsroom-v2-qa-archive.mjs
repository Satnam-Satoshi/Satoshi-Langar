import {createHash} from 'node:crypto';
const MAX_BYTES=2*1024*1024;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw Error(message);};
const exactKeys=(object,allowed)=>{if(!object||typeof object!=='object'||Array.isArray(object)||Object.keys(object).some(k=>!allowed.includes(k)))fail('unapproved-proof-field');};
const hex=(value,length)=>typeof value==='string'&&new RegExp(`^[a-f0-9]{${length}}$`).test(value);
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(value);
const hostname=value=>typeof value==='string'&&/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(value)&&!value.includes('..');
const timestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)&&Number.isFinite(Date.parse(value));
const limitations=['Byte identity is not source truth.','Provider deployment/source/domain ownership requires separate readback.'];
/** Canonical JSON of supported plain values. Rejects accessors, exotic objects,
 * cycles, undefined, holes and secret-bearing names/strings before serialization.
 * No coercion, lossy fields or executable toJSON callbacks.
 */
function canonical(value,ancestors=new Set(),depth=0){
 if(depth>30)fail('proof-depth-limit');
 if(value===null||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){if(!Number.isSafeInteger(value)||value<0)fail('invalid-proof-number');return String(value);}
 if(typeof value==='string'){
  if(value.length>10000||/[\u0000-\u001f\u007f]/.test(value)||/(?:bearer\s|basic\s|(?:access[_-]?token|api[_-]?key|authorization|cookie|password|client[_-]?secret|protection-bypass)\s*[:=])/i.test(value))fail('secret-or-unsafe-proof-string');
  for(const matched of value.matchAll(/https?:\/\/[^\s"<>]+/gi)){let url;try{url=new URL(matched[0]);}catch{fail('unsafe-proof-url');}if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.href!==matched[0])fail('secret-or-unsafe-proof-url');}
  return JSON.stringify(value);
 }
 if(!value||typeof value!=='object'||ancestors.has(value))fail('noncanonical-proof-value');
 const proto=Object.getPrototypeOf(value);if(!Array.isArray(value)&&proto!==Object.prototype&&proto!==null)fail('nonplain-proof-object');
 if(Object.getOwnPropertySymbols(value).length)fail('noncanonical-proof-symbol');
 const descriptors=Object.getOwnPropertyDescriptors(value);for(const [key,d]of Object.entries(descriptors)){if(d.get||d.set)fail('proof-accessor');if(!d.enumerable&&!(Array.isArray(value)&&key==='length'))fail('noncanonical-proof-property');if(/token|cookie|authorization|password|secret|credential|bearer|bypass|api.?key/i.test(key))fail('secret-proof-field');}
 ancestors.add(value);let result;
 if(Array.isArray(value)){if(value.length>1000||Object.keys(value).length!==value.length)fail('invalid-proof-array');result='['+Array.from({length:value.length},(_,i)=>canonical(value[i],ancestors,depth+1)).join(',')+']';}
 else{const keys=Object.keys(value).sort();if(keys.length>100)fail('proof-key-limit');result='{'+keys.map(k=>JSON.stringify(k)+':'+canonical(value[k],ancestors,depth+1)).join(',')+'}';}
 ancestors.delete(value);return result;
}
function validateProof(p){
 exactKeys(p,['passed','phase','deploymentId','sourceCommit','artifactSha256','artifactSha256Kind','pdfSha256','projectId','readerSha256','editionDate','checkedAt','completedAt','expiresAt','domains','previewHostname','domainObservations','limitations','effects']);
 if(p.passed!==true||!['preview','public'].includes(p.phase)||!id(p.deploymentId)||!id(p.projectId)||!hex(p.sourceCommit,40)||!hex(p.artifactSha256,64)||!hex(p.pdfSha256,64)||p.artifactSha256!==p.pdfSha256||p.artifactSha256Kind!=='pdf-bytes-sha256'||!hex(p.readerSha256,64)||!/^\d{4}-\d{2}-\d{2}$/.test(p.editionDate))fail('bound-successful-qa-proof-required');
 if(![p.checkedAt,p.completedAt,p.expiresAt].every(timestamp)||Date.parse(p.checkedAt)>Date.parse(p.completedAt)||Date.parse(p.completedAt)>=Date.parse(p.expiresAt)||Date.parse(p.expiresAt)-Date.parse(p.checkedAt)>120000)fail('bounded-qa-proof-clock-required');
 if(!Array.isArray(p.effects)||p.effects.length||!Array.isArray(p.limitations)||p.limitations.length!==2||p.limitations.some((l,i)=>l!==limitations[i]))fail('unapproved-proof-text-or-effects');
 const domains=p.phase==='public'?p.domains:[p.previewHostname];
 if(p.phase==='public'?(Object.hasOwn(p,'previewHostname')||!Array.isArray(domains)||domains.length!==2||JSON.stringify([...domains].sort())!==JSON.stringify(['ltcmagazine.org','satnamsatoshi.com'])):(Object.hasOwn(p,'domains')||!hostname(p.previewHostname)||!/^[a-z0-9-]+\.vercel\.app$/.test(p.previewHostname)))fail('exact-qa-host-scope-required');
 if(!Array.isArray(p.domainObservations)||p.domainObservations.length!==domains.length||new Set(p.domainObservations.map(o=>o.domain)).size!==domains.length)fail('complete-qa-domain-observations-required');
 for(const o of p.domainObservations){
  exactKeys(o,['domain','routesPassed','pdfBytesPassed','pdfSha256','readerBytesPassed','readerSha256','coverBytesPassed','coverSha256','promoBytesPassed','promoSha256','observations']);
  if(!domains.includes(o.domain)||o.routesPassed!==true||o.pdfBytesPassed!==true||o.pdfSha256!==p.pdfSha256||o.readerBytesPassed!==true||o.readerSha256!==p.readerSha256||o.coverBytesPassed!==true||!hex(o.coverSha256,64)||o.promoBytesPassed!==true||!hex(o.promoSha256,64)||!Array.isArray(o.observations)||o.observations.length<5||o.observations.length>30)fail('complete-qa-artifact-observations-required');
  const urls=new Set();for(const item of o.observations){
   exactKeys(item,['role','url','bytes','sha256','mimeType']);let u;try{u=new URL(item.url);}catch{fail('invalid-qa-observation-url');}
   if(u.protocol!=='https:'||u.hostname!==o.domain||u.port||u.username||u.password||u.search||u.hash||u.href!==item.url||urls.has(item.url)||!Number.isSafeInteger(item.bytes)||item.bytes<1||item.bytes>32*1024*1024||!hex(item.sha256,64)||(item.role!==undefined&&!['cover','promo'].includes(item.role))||(item.mimeType!==undefined&&!['image/png','image/jpeg','image/webp'].includes(item.mimeType)))fail('invalid-qa-observation');urls.add(item.url);
  }
  for(const [key,suffix]of [['pdfSha256','edition.pdf'],['readerSha256','reader.html'],['coverSha256','cover.png']])if(!o.observations.some(a=>a.sha256===o[key]&&new URL(a.url).pathname.endsWith('/'+suffix)))fail('missing-qa-artifact-readback');
  if(!o.observations.some(a=>a.role==='promo'&&a.sha256===o.promoSha256&&/\/promo\.(png|jpg|webp)$/.test(new URL(a.url).pathname)))fail('missing-qa-promo-readback');
 }
}
/** No upload occurs without invoking persistQa. Callback implementations and private
 * folder access policy must be separately supplied/authorized and independently
 * verified. A locator's shape does NOT prove Drive ACLs or durable provider state.
 * This module proves write/read byte identity only, not operational activation.
 */
export function createCloudNewsroomV2QaArchive({transport,approvedFolderId}){
 if(typeof transport?.writeImmutable!=='function'||typeof transport?.read!=='function'||typeof transport?.inspectMetadata!=='function'||!id(approvedFolderId))fail('explicit-private-archive-adapter-required');
 return Object.freeze({async persistQa(request){
  const serialized=canonical(request),bytes=new TextEncoder().encode(serialized+'\n');if(bytes.length>MAX_BYTES)fail('qa-receipt-size-limit');
  const snapshot=JSON.parse(serialized);exactKeys(snapshot,['proof','phase','deploymentId','sourceCommit','projectId']);validateProof(snapshot.proof);if(!['phase','deploymentId','sourceCommit','projectId'].every(k=>snapshot[k]===snapshot.proof[k]))fail('qa-archive-request-identity');const sha256=hash(bytes),name=`ltc-qa-${sha256}.json`;
  const ownerOnly=item=>item?.shared===false&&item.trashed===false&&Array.isArray(item.permissions)&&item.permissions.length>0&&item.permissions.every(permission=>permission.type==='user'&&permission.role==='owner'&&permission.deleted!==true);
  let folder;try{folder=await transport.inspectMetadata({locator:Object.freeze({provider:'google-drive',folderId:approvedFolderId,fileId:approvedFolderId})});}catch{fail('qa-archive-folder-unconfirmed');}
  if(!ownerOnly(folder)||folder.id!==approvedFolderId||folder.mimeType!=='application/vnd.google-apps.folder')fail('qa-archive-private-folder-required');
  // Pass a disposable copy: a callback may not mutate the retained reference.
  let written;try{written=await transport.writeImmutable({name,bytes:bytes.slice(),mimeType:'application/json'});}catch{fail('qa-archive-write-unconfirmed');}const locator=written?.locator;
  exactKeys(locator,['provider','folderId','fileId']);if(locator.provider!=='google-drive'||locator.folderId!==approvedFolderId||!id(locator.fileId))fail('unapproved-private-archive-locator');
  const boundLocator=Object.freeze({...locator});
  let metadata;try{metadata=await transport.inspectMetadata({locator:boundLocator});}catch{fail('qa-archive-metadata-unconfirmed');}
  if(!ownerOnly(metadata)||metadata.id!==boundLocator.fileId||metadata.name!==name||metadata.mimeType!=='application/json'||String(metadata.size)!==String(bytes.length)||!Array.isArray(metadata.parents)||metadata.parents.length!==1||metadata.parents[0]!==approvedFolderId||!ownerOnly(metadata.parent)||metadata.parent.id!==approvedFolderId||metadata.parent.mimeType!=='application/vnd.google-apps.folder')fail('qa-archive-private-metadata-required');

  let readback;try{readback=await transport.read({locator:boundLocator,maxBytes:bytes.length});}catch{fail('qa-archive-readback-unconfirmed');}
  if(!(readback instanceof Uint8Array)||readback.length!==bytes.length||hash(readback)!==sha256||!readback.every((b,i)=>b===bytes[i]))fail('qa-archive-readback-mismatch');
  return Object.freeze({verified:true,sha256,bytes:bytes.length,locator:boundLocator,kind:'private-qa-receipt',deploymentId:snapshot.deploymentId,sourceCommit:snapshot.sourceCommit,projectId:snapshot.projectId,phase:snapshot.phase});
 }});
}
