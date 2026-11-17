import {createHash} from 'node:crypto';
import {createVercelReadOnly} from './adapters/vercel-readonly.mjs';
// Portable copy of reviewed quote-aware v2 start-tag tokenizer. Not a sanitizer.
function editionStartTags(text){
 if(typeof text!=='string'||text.length>2*1024*1024)return null;
 const tags=[];let i=0;
 const space=c=>c!==undefined&&/[\t\n\f\r ]/.test(c);
 while(i<text.length){
  i=text.indexOf('<',i);if(i<0)break;
  if(text.startsWith('<!--',i)){const end=text.indexOf('-->',i+4);if(end<0)return null;i=end+3;continue;}
  if(text.startsWith('</',i)||text.startsWith('<!',i)){const end=text.indexOf('>',i+2);if(end<0)return null;i=end+1;continue;}
  const name=/^[A-Za-z][A-Za-z0-9:-]*/.exec(text.slice(i+1));if(!name)return null;
  const tag=name[0].toLowerCase(),attrs=new Map();i+=1+name[0].length;
  let done=false;
  while(i<text.length){
   let separated=false;while(space(text[i])){separated=true;i++;}
   if(text[i]==='>'){i++;done=true;break;}
   if(text[i]==='/'&&text[i+1]==='>'){i+=2;done=true;break;}
   if(!separated)return null;
   const attribute=/^[A-Za-z_:][A-Za-z0-9_:.-]*/.exec(text.slice(i));if(!attribute)return null;
   const key=attribute[0].toLowerCase();if(attrs.has(key))return null;i+=attribute[0].length;
   const afterName=i;while(space(text[i]))i++;
   let value=null;
   if(text[i]==='='){
    i++;while(space(text[i]))i++;
    if(text[i]==='"'||text[i]==="'"){const quote=text[i++],end=text.indexOf(quote,i);if(end<0)return null;value=text.slice(i,end);i=end+1;}
    else {const unquoted=/^[^\t\n\f\r "'`=<>]+/.exec(text.slice(i));if(!unquoted)return null;value=unquoted[0];i+=value.length;}
   }
   if(value===null)i=afterName;
   attrs.set(key,value);
  }
  if(!done)return null;
  if(tag==='template')return null; // No partial nested-template DOM emulation.
  tags.push({tag,attrs,contentStart:i});
  if(['script','style','textarea','title','xmp','iframe','noembed','noframes'].includes(tag)){
   const close=new RegExp('</'+tag+'\\s*>','ig');close.lastIndex=i;const end=close.exec(text);if(!end)return null;i=close.lastIndex;
  }else if(tag==='plaintext')break;
 }
 return tags;
}
const DOMAINS=Object.freeze(['ltcmagazine.org','satnamsatoshi.com']);
const sha=b=>createHash('sha256').update(b).digest('hex');
const hex=(s,n)=>typeof s==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(s);
const time=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s?Date.parse(s):NaN;
const canonical=v=>JSON.stringify(v&&typeof v==='object'?sort(v):v);
const sort=v=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
const pathOK=p=>typeof p==='string'&&/^\/[A-Za-z0-9_./-]+$/.test(p)&&!p.includes('//')&&!p.split('/').some(s=>s==='.'||s==='..');
const fail=()=>{throw Error('qa-check-failed');};
function editionValid(text,plan,editionUrl){
 const tags=editionStartTags(text);if(!tags||tags.some(t=>['base','template','plaintext','noscript'].includes(t.tag)))return false;
 const matches=(tag,field,value)=>tags.filter(t=>t.tag===tag&&t.attrs.get(field)===value);
 const canonicalLinks=matches('link','rel','canonical');
 if(canonicalLinks.length!==1||canonicalLinks[0].attrs.get('href')!==`https://ltcmagazine.org${plan.editionPath}`)return false;
 const headings=tags.filter(t=>t.tag==='h1');
 if(headings.length!==1||!text.slice(headings[0].contentStart).startsWith(escape(plan.title)+'</h1>'))return false;
 if(matches('time','datetime',plan.editionDate).length!==1)return false;
 const hasArtifactLink=role=>tags.some(({tag,attrs})=>{
  const href=attrs.get('href');if(tag!=='a'||typeof href!=='string'||!href||!/^[/A-Za-z0-9._-]+$/.test(href)||href.includes('//'))return false;
  const base=new URL(editionUrl),resolved=new URL(href,base);
  return resolved.origin===base.origin&&resolved.pathname===plan.artifacts.find(a=>a.role===role).path&&!resolved.search&&!resolved.hash;
 });
 const readerId=`reader-${plan.editionDate}-r${plan.revision}`;
 const themed=tags.filter(t=>t.tag==='article'&&t.attrs.get('data-trusted-daily-reader')==='ltc-inert-html-v1'&&t.attrs.get('aria-labelledby')===readerId);
 return hasArtifactLink('pdf')&&(hasArtifactLink('reader')||themed.length===1&&tags.some(t=>t.tag==='h2'&&t.attrs.get('id')===readerId));
}
/** All transport is injected read-only. No bypass secrets or mutation capability. */
export function createReleaseQa({plan:given,vercel,read,clock,networkEnabled=false,timeoutMs=10000}={}){
 const plan=structuredClone(given);
 if(!plan||!/^dpl_[A-Za-z0-9]{1,100}$/.test(plan.deploymentId??'')||!/^dpl_[A-Za-z0-9]{1,100}$/.test(plan.expectedBaselineDeploymentId??'')||!hex(plan.sourceCommit,40)||!/^prj_[A-Za-z0-9]{1,100}$/.test(plan.projectId??'')||!/^team_[A-Za-z0-9]{1,100}$/.test(plan.teamId??'')||!/^agent\/[a-z0-9][a-z0-9/_-]{0,150}$/.test(plan.branch??'')||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/.test(plan.previewHostname??'')||typeof plan.title!=='string'||!plan.title||plan.title.length>160||/[<>\x00-\x1f]/.test(plan.title)||!/^\d{4}-\d{2}-\d{2}$/.test(plan.editionDate??'')||!Number.isFinite(Date.parse(plan.editionDate))||new Date(plan.editionDate).toISOString().slice(0,10)!==plan.editionDate||!new RegExp(`^/conversations/editions/${plan.editionDate}(?:-r[1-9][0-9]*)?/$`).test(plan.editionPath??'')||typeof read!=='function'||typeof clock!=='function'||typeof networkEnabled!=='boolean'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw Error('bound-release-qa-plan-required');
 if(canonical(plan.domains)!==canonical(DOMAINS)||!Array.isArray(plan.artifacts)||plan.artifacts.length!==4||new Set(plan.artifacts.map(a=>a.role)).size!==4||!Number.isFinite(time(plan.expiresAt))||!Array.isArray(plan.evidence)||!plan.evidence.length||plan.evidence.length>100)throw Error('immutable-manifest-and-deadlines-required');
 if(!Number.isSafeInteger(plan.revision)||plan.revision<1||plan.editionPath!==`/conversations/editions/${plan.editionDate}${plan.revision===1?'':`-r${plan.revision}`}/`)throw Error('edition-revision-required');
 const types={pdf:'application/pdf',reader:'text/html',cover:'image/png',promo:'image/png'};
 for(const a of plan.artifacts)if(!Object.hasOwn(types,a.role)||Object.keys(a).sort().join('|')!=='bytes|mimeType|path|role|sha256'||a.mimeType!==types[a.role]||!pathOK(a.path)||!a.path.startsWith('/magazine/')||!hex(a.sha256,64)||!Number.isSafeInteger(a.bytes)||a.bytes<1||a.bytes>32*1024*1024)throw Error('immutable-artifact-required');
 const names={pdf:'edition.pdf',reader:'reader.html',cover:'cover.png',promo:'promo.png'};
 if(plan.artifacts.some(a=>a.path!==`/magazine/daily/${plan.editionDate}/r${plan.revision}/${names[a.role]}`))throw Error('canonical-artifact-path-required');
 if(new Set(plan.artifacts.map(a=>a.path)).size!==4)throw Error('distinct-artifact-paths-required');
 for(const e of plan.evidence)if(!e||Object.keys(e).sort().join('|')!=='expiresAt|id|retrievedAt|sha256'||typeof e.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(e.id)||!hex(e.sha256,64)||!Number.isFinite(time(e.retrievedAt))||!(time(e.expiresAt)>time(e.retrievedAt)))throw Error('trusted-evidence-deadlines-required');
 if(new Set(plan.evidence.map(e=>e.id)).size!==plan.evidence.length)throw Error('duplicate-evidence');
 const manifestSha256=sha(canonical(plan.artifacts)),planSha256=sha(canonical(plan));
 const deadline=Math.min(time(plan.expiresAt),...plan.evidence.map(e=>time(e.expiresAt)));
 const api=createVercelReadOnly({...vercel,projectId:plan.projectId,teamId:plan.teamId,expectedBranch:plan.branch,readEnabled:networkEnabled});
 const baselineConfigured=hex(plan.baselineSourceCommit,40)&&typeof plan.baselineBranch==='string'&&/^agent\/[a-z0-9][a-z0-9/_-]{0,150}$/.test(plan.baselineBranch)&&!plan.baselineBranch.includes('//');
 const baselineApi=baselineConfigured?createVercelReadOnly({...vercel,projectId:plan.projectId,teamId:plan.teamId,expectedBranch:plan.baselineBranch,readEnabled:networkEnabled}):null;
 let preview=null,busy=false;
 const held=reason=>({status:'held',reason,publicationVerified:false,promotionAllowed:false,mutationPerformed:false});
 async function run(phase,reconcile=false){
  if(!networkEnabled)return held('network-disabled');if(busy)return held('qa-busy');busy=true;
  let timer;const controller=new AbortController();
  const freshAt=now=>Number.isFinite(now)&&now<deadline&&plan.evidence.every(e=>time(e.retrievedAt)<=now);
  try{return await Promise.race([(async()=>{
   const started=time(clock());if(!Number.isFinite(started))fail();
   if(!reconcile&&!baselineConfigured)return held('trusted-baseline-source-required');
   if(!reconcile&&!freshAt(started))return held('source-or-plan-expired');
   if(phase==='public'&&!reconcile&&(!preview||time(preview.expiresAt)<=started||preview.planSha256!==planSha256))return held('fresh-preview-required');
   const args={deploymentId:plan.deploymentId,expectedCommit:plan.sourceCommit};
   const provider=phase==='preview'?await api.getDeployment(args):await api.getProductionAliasObservation(args);
   if(controller.signal.aborted)fail();
   if(phase==='preview'?(provider.status!=='deployment-observed'||provider.readyState!=='READY'||provider.target==='production'||provider.deploymentHostname!==plan.previewHostname):(provider.status!=='production-alias-list-observed'||provider.bothDomainsListed!==true||canonical(provider.domains)!==canonical(DOMAINS)))fail();
   async function get(url,maxBytes,mime){
    const r=await read({url,maxBytes,signal:controller.signal,redirect:'error',headers:{'Accept-Encoding':'identity'}});
    if(controller.signal.aborted||!r||r.url!==url||r.status!==200||r.redirected!==false||!(r.body instanceof Uint8Array)||!r.body.length||r.body.length>maxBytes)fail();
    const header=k=>typeof r.headers?.get==='function'?r.headers.get(k):r.headers?.[k];
    if((header('content-type')??'').split(';')[0].trim().toLowerCase()!==mime||![undefined,null,'','identity'].includes(header('content-encoding')))fail();
    const len=header('content-length');if(len!==null&&len!==undefined&&(!/^\d+$/.test(len)||Number(len)!==r.body.length))fail();
    return new Uint8Array(r.body);
   }
   const observations=[];
   for(const domain of phase==='preview'?[plan.previewHostname]:DOMAINS){
    const artifacts=[];
    for(const a of plan.artifacts){const bytes=await get(`https://${domain}${a.path}`,a.bytes,a.mimeType);if(bytes.length!==a.bytes||sha(bytes)!==a.sha256)fail();
     if(a.role==='pdf'&&new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')fail();
     if(['cover','promo'].includes(a.role)&&!Buffer.from(bytes.subarray(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail();
     if(a.role==='reader'){const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(!/^<!doctype html>/i.test(text)||!/<html(?:\s|>)/i.test(text)||!/<body(?:\s|>)/i.test(text))fail();}
     artifacts.push({role:a.role,sha256:a.sha256,bytes:a.bytes,mimeType:a.mimeType});
    }
    const html=await get(`https://${domain}${plan.editionPath}`,2*1024*1024,'text/html');if(!editionValid(new TextDecoder('utf-8',{fatal:true}).decode(html),plan,`https://${domain}${plan.editionPath}`))fail();
    const readerMarkerObserved=editionStartTags(new TextDecoder('utf-8',{fatal:true}).decode(html)).some(t=>t.tag==='article'&&t.attrs.get('data-trusted-daily-reader')==='ltc-inert-html-v1'&&t.attrs.get('aria-labelledby')===`reader-${plan.editionDate}-r${plan.revision}`);
    observations.push({domain,artifacts,editionHtmlSha256:sha(html),routesPassed:true,readerArtifactBytesVerified:true,readerMarkerObserved,renderedContentEquivalence:false,visualQaVerified:false});
   }
   let baselineObservation=null;
   if(phase==='preview'){
    const b=await baselineApi.getProductionAliasObservation({deploymentId:plan.expectedBaselineDeploymentId,expectedCommit:plan.baselineSourceCommit});
    const observedAt=time(clock());if(controller.signal.aborted||!Number.isFinite(observedAt)||observedAt<started||b.status!=='production-alias-list-observed'||b.bothDomainsListed!==true||canonical(b.domains)!==canonical(DOMAINS))fail();
    baselineObservation={deploymentId:b.deploymentId,sourceCommit:b.commit,branch:plan.baselineBranch,domains:b.domains,responseSha256:b.responseSha256,checkedAt:new Date(observedAt).toISOString(),expiresAt:new Date(observedAt+120000).toISOString(),atomic:false};
   }else if(!reconcile)baselineObservation=structuredClone(preview.baselineObservation);
   const at=time(clock());if(!Number.isFinite(at)||at<started)fail();const fresh=freshAt(at),expiresAt=new Date(Math.min(deadline,at+120000,baselineObservation?time(baselineObservation.expiresAt):Infinity)).toISOString();
   if(!reconcile&&baselineObservation&&time(baselineObservation.expiresAt)<=at)return held('baseline-observation-expired');
   if(!reconcile&&!fresh)return held('expired-during-qa');
   const result={status:reconcile?'production-readback-observed':`${phase}-qa-verified`,phase,candidateDeploymentId:plan.deploymentId,sourceCommit:plan.sourceCommit,projectId:plan.projectId,expectedBaselineDeploymentId:plan.expectedBaselineDeploymentId,manifestSha256,planSha256,evidenceSha256:sha(canonical(plan.evidence)),checkedAt:new Date(at).toISOString(),expiresAt,fresh,domainObservations:observations,baselineObservation,providerResponseSha256:provider.responseSha256,publicationVerified:false,promotionAllowed:false,mutationPerformed:false,atomic:false,reconciliationOnly:reconcile};
   if(phase==='preview')preview=structuredClone(result);return result;
  })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error());},timeoutMs);})]);}catch{return held('readback-failed-no-mutation');}finally{controller.abort();clearTimeout(timer);busy=false;}
 }
 return Object.freeze({verifyPreview:()=>run('preview'),verifyPublic:()=>run('public'),reconcileProduction:()=>run('public',true)});
}
