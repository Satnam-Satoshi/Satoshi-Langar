import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw Error(message);};
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;};
/** Exact bytes, bounded PNG structure/decompression. No renderer or publication claim. */
export function inspectMarketingPng(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<57||bytes.length>5*1024*1024)fail('png-byte-limit');
 if(![137,80,78,71,13,10,26,10].every((byte,index)=>bytes[index]===byte))fail('png-signature');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let offset=8,width,height,channels,ended=false,idatEnded=false;const compressed=[];
 while(offset<bytes.length){
  if(offset+12>bytes.length)fail('png-truncated');const size=view.getUint32(offset),end=offset+12+size;
  if(end>bytes.length)fail('png-truncated');const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));
  if(crc32(bytes.subarray(offset+4,end-4))!==view.getUint32(end-4))fail('png-crc');
  if(offset===8&&type!=='IHDR')fail('png-header');
  if(type==='IHDR'){
   if(offset!==8||size!==13)fail('png-header');width=view.getUint32(offset+8);height=view.getUint32(offset+12);
   if(width!==1080||height!==1350)fail('png-dimensions');
   const header=bytes.subarray(offset+16,offset+21);if(header[0]!==8||![2,6].includes(header[1])||header[2]||header[3]||header[4])fail('png-profile');channels=header[1]===2?3:4;
  }else if(type==='IDAT'){if(idatEnded)fail('png-idat-order');compressed.push(bytes.subarray(offset+8,end-4));}
  else if(type==='IEND'){if(size!==0||end!==bytes.length||!compressed.length)fail('png-end');ended=true;}
  else{if(!['sRGB','gAMA','pHYs','cHRM'].includes(type))fail('png-unsupported-chunk');if(compressed.length)idatEnded=true;}
  offset=end;
 }
 if(!ended)fail('png-end');const joined=new Uint8Array(compressed.reduce((n,b)=>n+b.length,0));let cursor=0;for(const b of compressed){joined.set(b,cursor);cursor+=b.length;}
 const row=width*channels+1,expected=row*height;let decoded;try{decoded=inflateSync(joined,{maxOutputLength:expected});}catch{fail('png-pixel-data');}
 if(decoded.length!==expected)fail('png-pixel-data');for(let y=0;y<height;y++)if(decoded[y*row]>4)fail('png-filter');
 return {sha256:hash(bytes),bytes:bytes.length,width,height,verification:'actual-png-bytes-crc-and-bounded-inflate',mimeType:'image/png',renderVerified:false};
}
const keys=(object,allowed)=>{if(!object||typeof object!=='object'||Array.isArray(object)||Object.keys(object).some(k=>!allowed.includes(k)))fail('unexpected-fields');};
const plain=(v,max=500)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[<>\u0000-\u001f\u007f]/.test(v);
const https=url=>{try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&parsed.href===url;}catch{return false;}};
/** NONPUBLISHING plan only. All trusted* arguments and receipt MUST come from
 * independent coordinator-owned ingestion/evidence, never the producer envelope.
 * Shape checks are not provenance authentication. No files/network/copies/effects.
 * This is deliberately NOT connected to the four-artifact admission gate.
 */
export function planCloudNewsroomV2MarketingAssets({receipt,trustedOutline,envelope,observedAssets,sourceEvidence,tagEvidence,existingInventory}){
 const m=receipt?.validation?.manifest,p=receipt?.publication;
 if(receipt?.status!=='accepted-receipt'||receipt?.errors?.length!==0||receipt?.validation?.status!=='validated-description'||m?.generation!=='cloud-newsroom-v2'||m.kind!=='daily'||!Number.isSafeInteger(m.revision)||m.revision<1||!/^\d{4}-\d{2}-\d{2}$/.test(m.editionDate))fail('accepted-daily-receipt-required');
 const issueId=`${m.editionDate}-r${m.revision}`,page=`/conversations/editions/${m.editionDate}${m.revision===1?'':`-r${m.revision}`}/`;
 if(p?.registryId!==issueId||p.page!==page||p.canonicalUrl!==`https://ltcmagazine.org${page}`)fail('receipt-identity');
 if(receipt.artifacts?.length!==4||m.artifacts?.length!==4)fail('receipt-artifacts');
 for(const role of ['pdf','html','cover','promo']){
  const actual=receipt.artifacts.filter(a=>a.role===role),declared=m.artifacts.filter(a=>a.role===role);
  if(actual.length!==1||declared.length!==1)fail('receipt-artifacts');const a=actual[0],d=declared[0];
  if(a.verification!=='actual-local-file-bytes'||a.editionId!==m.editionId||a.revision!==m.revision||!sha(a.sha256)||!Number.isSafeInteger(a.bytes)||a.bytes<1||!['path','sha256','bytes'].every(k=>a[k]===d[k]))fail('receipt-artifact-identity');
 }
 const pdf=receipt.artifacts.find(a=>a.role==='pdf'),reader=receipt.artifacts.find(a=>a.role==='html');
 if(reader.htmlSafety?.status!=='accepted-inert-subset'||reader.htmlSafety.profile!=='ltc-inert-html-v1'||reader.htmlSafety.sanitized!==false||reader.htmlSafety.resourceFetchesAllowed!==false)fail('receipt-reader-profile');
 if(!Array.isArray(trustedOutline)||!trustedOutline.length||![observedAssets,sourceEvidence,tagEvidence,existingInventory].every(map=>map instanceof Map))fail('trusted-inputs-required');
 const stories=new Map();
 for(const story of trustedOutline){
  if(!/^\d+(?:\.\d+)*$/.test(story.nodePath)||story.fragment!==`story-${issueId}-${story.nodePath.replaceAll('.','-')}`||!sha(story.contentSha256)||story.readerSha256!==reader.sha256||stories.has(story.fragment))fail('trusted-outline-identity');
  stories.set(story.fragment,story);
 }
 keys(envelope,['schemaVersion','kind','issueId','stories']);
 if(envelope.schemaVersion!==1||envelope.kind!=='canonicaldaily-marketing-assets'||envelope.issueId!==issueId||!Array.isArray(envelope.stories)||envelope.stories.length<1||envelope.stories.length>2)fail('bounded-canonicaldaily-envelope-required');
 const copies=[],selected=new Set(),admitted=[];
 for(const candidate of envelope.stories){
  keys(candidate,['storyId','fragment','nodePath','contentSha256','readerSha256','pdfSha256','canonicalStoryUrl','claim','sourceIds','tags','asset']);
  const story=stories.get(candidate.storyId);
  if(!story||selected.has(candidate.storyId)||candidate.storyId!==candidate.fragment||!['fragment','nodePath','contentSha256','readerSha256'].every(k=>candidate[k]===story[k])||candidate.pdfSha256!==pdf.sha256||candidate.canonicalStoryUrl!==p.canonicalUrl+'#'+story.fragment)fail('story-binding');
  selected.add(candidate.storyId);
  const evidence=sourceEvidence.get(candidate.storyId);
  if(!plain(candidate.claim)||!Array.isArray(candidate.sourceIds)||!candidate.sourceIds.length||new Set(candidate.sourceIds).size!==candidate.sourceIds.length||!evidence||evidence.verified!==true||evidence.contentSha256!==story.contentSha256||evidence.readerSha256!==reader.sha256||evidence.claim!==candidate.claim||!equal(evidence.sourceIds,candidate.sourceIds))fail('independent-story-evidence-required');
  if(!sha(evidence.evidenceSha256)||!Number.isFinite(Date.parse(evidence.checkedAt))||!Array.isArray(evidence.sourceUrls)||!evidence.sourceUrls.length||!evidence.sourceUrls.every(https))fail('independent-source-snapshot-required');
  if(!Array.isArray(candidate.tags)||candidate.tags.length>3)fail('tag-list-required');const usedTags=new Set();
  for(const tag of candidate.tags){
   keys(tag,['platform','handle','officialSourceUrl','linkedTarget','evidenceSha256','checkedAt']);const key=`${tag.platform}:${tag.handle}`,known=tagEvidence.get(key);
   if(!['X','Instagram'].includes(tag.platform)||!/^@[a-zA-Z0-9_.]{1,30}$/.test(tag.handle)||!https(tag.officialSourceUrl)||usedTags.has(key)||known?.verified!==true||!https(tag.linkedTarget)||!sha(tag.evidenceSha256)||!Number.isFinite(Date.parse(tag.checkedAt))||!['platform','handle','officialSourceUrl','linkedTarget','evidenceSha256','checkedAt'].every(k=>known[k]===tag[k]))fail('independent-tag-evidence-required');usedTags.add(key);
  }
  keys(candidate.asset,['path','sha256','bytes','altText','aiAssisted']);const asset=candidate.asset;
  if(!plain(asset.altText,1000)||typeof asset.aiAssisted!=='boolean')fail('asset-description-required');
  if(typeof asset.path!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*\.png$/.test(asset.path)||asset.path.split('/').some(p=>['.','..',''].includes(p)))fail('unsafe-asset-source');
  const observed=inspectMarketingPng(observedAssets.get(asset.path));if(asset.sha256!==observed.sha256||asset.bytes!==observed.bytes)fail('asset-byte-identity');
  const destination=`public/magazine/${issueId}/marketing/${story.fragment}.png`;
  const binding={issueId,storyId:story.fragment,contentSha256:story.contentSha256,readerSha256:reader.sha256,pdfSha256:pdf.sha256};
  const prior=existingInventory.get(destination);
  if(prior&&(!equal(prior.binding,binding)||prior.sha256!==observed.sha256||prior.bytes!==observed.bytes))fail('immutable-asset-collision');
  copies.push({source:asset.path,destination,...observed,altText:asset.altText,aiAssisted:asset.aiAssisted,binding,action:prior?'already-present':'copy-new'});
  admitted.push({storyId:story.fragment,canonicalStoryUrl:candidate.canonicalStoryUrl,tags:candidate.tags.map(t=>({...t})),tagAuthority:'none'});
 }
 const remainingStoryIds=[...stories.keys()].filter(id=>!selected.has(id)&&!([...existingInventory.entries()].some(([destination,a])=>destination===`public/magazine/${issueId}/marketing/${id}.png`&&a.binding?.issueId===issueId&&a.binding.storyId===id&&a.binding.contentSha256===stories.get(id).contentSha256&&a.binding.readerSha256===reader.sha256&&a.binding.pdfSha256===pdf.sha256&&sha(a.sha256)&&Number.isSafeInteger(a.bytes)&&a.bytes>0)));
 return freeze({status:'nonpublishing-marketing-asset-plan',publishAllowed:false,operational:false,effects:[],assetCopies:copies,stories:admitted,remainingStoryIds,coverageComplete:remainingStoryIds.length===0,integration:'standalone-not-four-artifact-admitted'});
}
