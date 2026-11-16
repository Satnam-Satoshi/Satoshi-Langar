import {validatePdfRegistry,appendPdfIssue,pdfIssuePage} from './ltc-pdf-registry.mjs';
const plain=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[<>\u0000-\u001f\u007f]/.test(v);
/** Pure candidate projection. Does not copy files, authorize publication or assert live status.
 * Caller must obtain the receipt from actual ingestion, then recheck copied bytes at build.
 */
export function projectReceiptToPdfRegistry(registry,receipt){
 const prior=validatePdfRegistry(registry),m=receipt?.validation?.manifest,p=receipt?.publication;
 if(receipt?.status!=='accepted-receipt'||receipt?.errors?.length!==0||receipt?.validation?.status!=='validated-description'||!m||m.kind!=='daily'||m.generation!=='cloud-newsroom-v2'||!p||!plain(p.title,160)||!plain(p.dek,500))throw Error('accepted-daily-receipt-required');
 const id=`${m.editionDate}-r${m.revision}`,base=`public/magazine/daily/${m.editionDate}/r${m.revision}/`;
 if(p.registryId!==id||p.preparedDate!==m.editionDate||p.preparedAt!==m.preparedAt||p.page!==pdfIssuePage({date:m.editionDate,id,revision:m.revision})||p.canonicalUrl!==`https://ltcmagazine.org${p.page}`)throw Error('receipt-publication-identity-mismatch');
 const dimensions=receipt.coverDimensions;
 if(!dimensions||dimensions.verification!=='png-ihdr-with-crc')throw Error('verified-png-cover-dimensions-required');
 const roles=['pdf','html','cover','promo'],copies=[];
 if(receipt.artifacts?.length!==4||m.artifacts?.length!==4)throw Error('four-receipt-artifacts-required');
 for(const role of roles){
  const observed=receipt.artifacts.filter(a=>a.role===role),described=m.artifacts.filter(a=>a.role===role);
  if(observed.length!==1||described.length!==1)throw Error('duplicate-receipt-role');
  const a=observed[0],d=described[0];
  if(role==='html'){const h=a.htmlSafety;if(!h||Object.keys(h).sort().join(',')!=='profile,resourceFetchesAllowed,sanitized,status'||h.status!=='accepted-inert-subset'||h.profile!=='ltc-inert-html-v1'||h.sanitized!==false||h.resourceFetchesAllowed!==false)throw Error('verified-inert-html-profile-required');}
  if(a.verification!=='actual-local-file-bytes'||a.editionId!==m.editionId||a.revision!==m.revision||a.path!==d.path||a.sha256!==d.sha256||a.bytes!==d.bytes||!a.path.startsWith(`artifacts/${m.editionDate}/r${m.revision}/`)||a.path.includes('..'))throw Error('receipt-artifact-mismatch');
  const suffix=role==='pdf'&&d.mimeType==='application/pdf'?'edition.pdf':role==='html'&&d.mimeType==='text/html'?'reader.html':role==='cover'&&d.mimeType==='image/png'?'cover.png':role==='promo'?({'image/png':'promo.png','image/jpeg':'promo.jpg','image/webp':'promo.webp'}[d.mimeType]):null;
  if(!suffix)throw Error('unsupported-public-artifact-type');
  copies.push({role,source:a.path,destination:base+suffix,sha256:a.sha256,bytes:a.bytes});
 }
 const pdf=m.artifacts.find(a=>a.role==='pdf'),cover=m.artifacts.find(a=>a.role==='cover');
 let correction=null;
 if(m.revision>1){
  const replaced=prior.issues.find(issue=>issue.id===`${m.editionDate}-r${m.revision-1}`);
  if(!replaced||m.correction?.preserveOriginal!==true||m.correction.replacesRevision!==replaced.revision||m.correction.replacesPdfSha256!==replaced.sha256)throw Error('receipt-correction-history-mismatch');
  correction={replacesId:replaced.id,reason:m.correction.reason};
 }else if(m.correction!==null)throw Error('unexpected-receipt-correction');
 const html=copies.find(a=>a.role==='html');
 const reader={path:html.destination.slice(6),sha256:html.sha256,bytes:html.bytes};
 const issue={reader,id,date:m.editionDate,revision:m.revision,title:p.title,dek:p.dek,preparedDate:p.preparedDate,pdf:copies.find(a=>a.role==='pdf').destination.slice(6),cover:copies.find(a=>a.role==='cover').destination.slice(6),pages:pdf.pages,bytes:pdf.bytes,sha256:pdf.sha256,coverBytes:cover.bytes,coverSha256:cover.sha256,coverWidth:dimensions.width,coverHeight:dimensions.height,correction};
 return {status:'candidate-data-only',registry:appendPdfIssue(prior,issue),issue,assetCopies:copies,effects:[],operational:false};
}
