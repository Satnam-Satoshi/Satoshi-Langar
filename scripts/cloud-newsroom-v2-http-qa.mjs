import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hex=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v);
const fail=message=>{throw Error(message);};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const safePath=p=>typeof p==='string'&&/^\/[a-zA-Z0-9_./-]*$/.test(p)&&!p.includes('//')&&!p.split('/').includes('..')&&!p.split('/').includes('.');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
const sorted=value=>JSON.stringify([...value].sort());
const stamp=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(v)?Date.parse(v):NaN;
/** Read-only byte QA. Authenticated transport and trustedPlan come from the
 * coordinator, NOT producer metadata. transport.read MUST disable redirects and
 * honor headers Accept-Encoding:identity and redirect:error, bound streaming reads
 * at maxBytes, preserve identity response bytes (no auto-decompression), and report final
 * URL/status/headers. No credential discovery, network implementation or writes.
 * HTTP content does not attest provider deployment/source ownership or source truth;
 * coordinator separately checks provider identity and domain readback.
 */
export function createCloudNewsroomV2HttpQa({transport,clock,trustedPlan}){
 if(typeof transport?.read!=='function'||typeof clock!=='function')fail('explicit-transport-and-clock-required');
 const plan=structuredClone(trustedPlan),r=plan?.receipt,m=r?.validation?.manifest,p=r?.publication;
 if(!plan||typeof plan.deploymentId!=='string'||!plan.deploymentId||!hex(plan.sourceCommit,40)||!hex(plan.artifactSha256,64)||!hex(plan.pdfSha256,64)||typeof plan.projectId!=='string'||!plan.projectId)fail('trusted-identity-required');
 if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/.test(plan.previewHostname))fail('exact-preview-host-required');
 if(!Array.isArray(plan.domains)||plan.domains.length!==2||new Set(plan.domains).size!==2||plan.domains.some(d=>typeof d!=='string'||!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(d)||d.includes('..')))fail('exact-two-public-domains-required');
 if(r?.status!=='accepted-receipt'||r.errors?.length!==0||r.validation?.status!=='validated-description'||m?.kind!=='daily'||m.generation!=='cloud-newsroom-v2'||!/^\d{4}-\d{2}-\d{2}$/.test(m.editionDate)||!Number.isSafeInteger(m.revision)||m.revision<1)fail('accepted-daily-receipt-required');
 const id=`${m.editionDate}-r${m.revision}`,editionPath=`/conversations/editions/${m.editionDate}${m.revision===1?'':`-r${m.revision}`}/`;
 if(p?.registryId!==id||p.page!==editionPath||p.canonicalUrl!==`https://ltcmagazine.org${editionPath}`||typeof p.title!=='string'||!p.title||p.title.length>160||/[<>\u0000-\u001f]/.test(p.title))fail('receipt-edition-identity');
 if(r.artifacts?.length!==4||m.artifacts?.length!==4)fail('receipt-artifacts');
 for(const role of ['pdf','html','cover','promo']){const a=r.artifacts.filter(a=>a.role===role),d=m.artifacts.filter(a=>a.role===role);if(a.length!==1||d.length!==1||a[0].verification!=='actual-local-file-bytes'||a[0].editionId!==m.editionId||a[0].revision!==m.revision||!hex(a[0].sha256,64)||!Number.isSafeInteger(a[0].bytes)||a[0].bytes<1||a[0].bytes>32*1024*1024||!['path','bytes','sha256'].every(k=>a[0][k]===d[0][k]))fail('receipt-artifact-identity');}
 const pdf=r.artifacts.find(a=>a.role==='pdf'),reader=r.artifacts.find(a=>a.role==='html');
 if(plan.artifactSha256!==plan.pdfSha256||pdf.sha256!==plan.pdfSha256||reader.htmlSafety?.status!=='accepted-inert-subset'||reader.htmlSafety.profile!=='ltc-inert-html-v1'||reader.htmlSafety.sanitized!==false||reader.htmlSafety.resourceFetchesAllowed!==false)fail('receipt-pdf-reader-binding');
 if(!Array.isArray(plan.criticalRoutes)||!plan.criticalRoutes.length||plan.criticalRoutes.length>20||new Set(plan.criticalRoutes.map(r=>r.path)).size!==plan.criticalRoutes.length||plan.criticalRoutes.some(r=>!safePath(r.path)||!Array.isArray(r.markers)||!r.markers.length||r.markers.some(m=>typeof m!=='string'||!m||m.length>1000)))fail('critical-route-plan-required');
 const imageArtifacts=['cover','promo'].map(role=>{
  const observed=r.artifacts.find(a=>a.role===role),declared=m.artifacts.find(a=>a.role===role);
  const suffix=role==='cover'?(declared.mimeType==='image/png'?'cover.png':null):({'image/png':'promo.png','image/jpeg':'promo.jpg','image/webp':'promo.webp'}[declared.mimeType]);
  if(!suffix||(observed.mimeType!==undefined&&observed.mimeType!==declared.mimeType))fail('unsupported-or-mismatched-image-mime');
  return {...observed,mimeType:declared.mimeType,publicPath:`/magazine/daily/${m.editionDate}/r${m.revision}/${suffix}`};
 });
 const ttl=plan.proofTtlMs??60000;if(!Number.isSafeInteger(ttl)||ttl<1||ttl>120000)fail('bounded-proof-expiry-required');
 const htmlLimit=2*1024*1024,pdfPath=`/magazine/daily/${m.editionDate}/r${m.revision}/edition.pdf`,readerPath=`/magazine/daily/${m.editionDate}/r${m.revision}/reader.html`;
 freeze(plan);
 const fetchBytes=async(url,maxBytes,mime)=>{
  const result=await transport.read({url,maxBytes,headers:{'Accept-Encoding':'identity'},redirect:'error'});
  if(result?.status!==200||result.url!==url||result.redirected===true)fail('http-status-url-or-redirect');
  if(!(result.body instanceof Uint8Array)||result.body.length===0||result.body.length>maxBytes)fail('http-body-type-or-limit');
  if(!result.headers||typeof result.headers!=='object'||Array.isArray(result.headers))fail('http-headers-required');
  const headers=new Map();for(const [name,value]of Object.entries(result.headers)){const key=name.toLowerCase();if(headers.has(key)||typeof value!=='string')fail('http-ambiguous-headers');headers.set(key,value);}
  if(headers.has('location')||headers.has('content-range')||headers.has('content-encoding')&&headers.get('content-encoding')!=='identity')fail('http-redirect-range-or-encoded-body');
  if(headers.get('content-type')?.split(';')[0].trim().toLowerCase()!==mime)fail('http-content-type');
  if(headers.has('content-length')&&(!/^\d+$/.test(headers.get('content-length'))||Number(headers.get('content-length'))!==result.body.length))fail('http-truncated-length');
  return result.body;
 };
 const decode=bytes=>{try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('invalid-html-utf8');}};
 const html=async(url,markers)=>{const bytes=await fetchBytes(url,htmlLimit,'text/html'),text=decode(bytes).replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');if(!/^\s*<!doctype html>/i.test(text)||!/<\/html>\s*$/i.test(text)||markers.some(marker=>!text.includes(marker)))fail('html-markers-or-truncation');return {url,bytes:bytes.length,sha256:sha(bytes)};};
 const checkHost=async(host)=>{
  const origin=`https://${host}`,observations=[];
  const pdfBytes=await fetchBytes(origin+pdfPath,pdf.bytes,'application/pdf');
  if(pdfBytes.length!==pdf.bytes||String.fromCharCode(...pdfBytes.subarray(0,5))!=='%PDF-'||sha(pdfBytes)!==pdf.sha256)fail('pdf-bytes-signature-or-hash');
  observations.push({url:origin+pdfPath,bytes:pdfBytes.length,sha256:sha(pdfBytes)});
  const readerBytes=await fetchBytes(origin+readerPath,reader.bytes,'text/html');
  if(readerBytes.length!==reader.bytes||sha(readerBytes)!==reader.sha256)fail('reader-bytes-or-hash');
  observations.push({url:origin+readerPath,bytes:readerBytes.length,sha256:sha(readerBytes)});
  for(const image of imageArtifacts){
   const bytes=await fetchBytes(origin+image.publicPath,image.bytes,image.mimeType);
   const signature=image.mimeType==='image/png'?bytes.length>=33&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b):image.mimeType==='image/jpeg'?bytes.length>=5&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255&&bytes.at(-2)===255&&bytes.at(-1)===217:bytes.length>=20&&String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP'&&new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(4,true)+8===bytes.length;
   if(bytes.length!==image.bytes||sha(bytes)!==image.sha256||!signature)fail(`${image.role}-bytes-signature-or-hash`);
   observations.push({role:image.role,url:origin+image.publicPath,bytes:bytes.length,sha256:sha(bytes),mimeType:image.mimeType});
  }
  observations.push(await html(origin+editionPath,[`<link rel="canonical" href="${p.canonicalUrl}"`, `<h1>${escape(p.title)}</h1>`,`dateTime="${m.editionDate}"`,`href="${pdfPath}"`,'data-trusted-daily-reader="ltc-inert-html-v1"',`id="reader-${id}"`]));
  for(const route of plan.criticalRoutes)observations.push(await html(origin+route.path,route.markers));
  return {domain:host,routesPassed:true,pdfBytesPassed:true,pdfSha256:pdf.sha256,readerBytesPassed:true,readerSha256:reader.sha256,coverBytesPassed:true,coverSha256:imageArtifacts[0].sha256,promoBytesPassed:true,promoSha256:imageArtifacts[1].sha256,observations};
 };
 const verify=async(request,publicPhase)=>{
  try{
   if(!request||!['deploymentId','sourceCommit','artifactSha256','pdfSha256','projectId'].every(k=>request[k]===plan[k]))fail('request-identity-mismatch');
   if(publicPhase&&(!Array.isArray(request.domains)||sorted(request.domains)!==sorted(plan.domains)||request.editionDate!==m.editionDate))fail('public-domain-or-date-mismatch');
   const start=stamp(await clock());if(!Number.isFinite(start))fail('invalid-clock');
   const hosts=publicPhase?plan.domains:[plan.previewHostname],domainObservations=[];for(const host of hosts)domainObservations.push(await checkHost(host));
   const end=stamp(await clock());if(!Number.isFinite(end)||end<start||end-start>=ttl)fail('qa-clock-or-expired');
   return freeze({passed:true,phase:publicPhase?'public':'preview',deploymentId:plan.deploymentId,sourceCommit:plan.sourceCommit,artifactSha256:plan.artifactSha256,artifactSha256Kind:'pdf-bytes-sha256',pdfSha256:pdf.sha256,projectId:plan.projectId,readerSha256:reader.sha256,editionDate:m.editionDate,checkedAt:new Date(start).toISOString(),completedAt:new Date(end).toISOString(),expiresAt:new Date(start+ttl).toISOString(),...(publicPhase?{domains:[...plan.domains]}:{previewHostname:plan.previewHostname}),domainObservations,limitations:['Byte identity is not source truth.','Provider deployment/source/domain ownership requires separate readback.'],effects:[]});
  }catch(error){return {passed:false,phase:publicPhase?'public':'preview',reason:error instanceof Error?error.message:'qa-transport-failed',effects:[]};}
 };
 return Object.freeze({verify:request=>verify(request,false),verifyPublic:request=>verify(request,true)});
}
/** Optional real HTTP transport. Secrets are explicit constructor arguments only,
 * retained in closure and sent ONLY to the single approved preview hostname.
 * Public requests always omit credentials. Caller separately authorizes access.
 */
export function createCloudNewsroomV2FetchTransport({previewHostname,domains,previewHeaders={},fetchImpl=globalThis.fetch,timeoutMs=15000}){
 if(typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/.test(previewHostname)||!Array.isArray(domains)||sorted(domains)!==sorted(['ltcmagazine.org','satnamsatoshi.com']))fail('exact-fetch-transport-scope-required');
 const secrets={};for(const [name,value]of Object.entries(previewHeaders)){const key=name.toLowerCase();if(!['authorization','x-vercel-protection-bypass','cookie'].includes(key)||typeof value!=='string'||!value||/[\r\n]/.test(value)||Object.hasOwn(secrets,key))fail('invalid-preview-only-headers');secrets[key]=value;}
 const allowedHosts=new Set([previewHostname,...domains]);
 return Object.freeze({async read({url,maxBytes,headers,redirect}){
  let target;try{target=new URL(url);}catch{fail('invalid-transport-url');}
  if(target.protocol!=='https:'||target.port||target.username||target.password||target.hash||target.search||target.href!==url||!allowedHosts.has(target.hostname)||!safePath(target.pathname)||redirect!=='error'||headers?.['Accept-Encoding']!=='identity'||Object.keys(headers).length!==1||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>32*1024*1024)fail('transport-request-outside-scope');
  const controller=new AbortController();let timer,reader;
  const task=async()=>{
   const response=await fetchImpl(url,{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',signal:controller.signal,headers:{'Accept-Encoding':'identity',...(target.hostname===previewHostname?secrets:{})}});
   if(response.url!==url||response.redirected||!response.headers||typeof response.headers.entries!=='function')fail('transport-response-url-or-headers');
   const outputHeaders=Object.fromEntries(response.headers.entries()),length=response.headers.get('content-length'),encoding=response.headers.get('content-encoding');
   if(encoding&&encoding!=='identity')fail('transport-encoded-body');
   if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes))fail('transport-content-length-limit');
   if(!response.body||typeof response.body.getReader!=='function')fail('transport-stream-required');
   reader=response.body.getReader();const chunks=[];let size=0;
   while(true){const next=await reader.read();if(next.done)break;if(!(next.value instanceof Uint8Array))fail('transport-byte-stream-required');size+=next.value.length;if(size>maxBytes)fail('transport-stream-limit');chunks.push(next.value);}
   if(length!==null&&Number(length)!==size)fail('transport-truncated-body');
   const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
   return {status:response.status,url:response.url,body,headers:outputHeaders,redirected:false};
  };
  try{return await Promise.race([task(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('transport-timeout'));},timeoutMs);})]);}
  catch(error){controller.abort();throw Error(error instanceof Error&&/^transport-/.test(error.message)?error.message:'transport-read-failed');}
  finally{clearTimeout(timer);if(reader){try{void reader.cancel().catch(()=>{});}catch{/* no logs or credential leakage */}}}
 }});
}
