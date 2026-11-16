import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validatePdfRegistry} from './ltc-pdf-registry.mjs';
/** Build-time validation of exact admitted assets; no network access. */
export async function verifyPdfRegistryAssets(input, publicRoot){
 const registry=validatePdfRegistry(input),root=await realpath(publicRoot),paths=[];
 for(const issue of registry.issues){
  for(const role of ['pdf','cover']){
   const assetPath=issue[role],resolved=await realpath(path.join(root,assetPath.slice(1)));
   if(!resolved.startsWith(root+path.sep))throw Error('pdf-asset-escapes-public-root');
   const bytes=await readFile(resolved),length=role==='pdf'?issue.bytes:issue.coverBytes,hash=role==='pdf'?issue.sha256:issue.coverSha256;
   if(bytes.length!==length||createHash('sha256').update(bytes).digest('hex')!==hash)throw Error(`pdf-registry-asset-mismatch:${issue.id}:${role}`);
   if(role==='pdf'&&!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('invalid-pdf-signature');
   if(role==='cover'){
    if(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.toString('ascii',12,16)!=='IHDR')throw Error('unsupported-cover-dimensions-require-png');
    if(bytes.readUInt32BE(16)!==issue.coverWidth||bytes.readUInt32BE(20)!==issue.coverHeight)throw Error('cover-dimensions-mismatch');
   }
   paths.push(assetPath.slice(1));
  }
 }
 return paths;
}
