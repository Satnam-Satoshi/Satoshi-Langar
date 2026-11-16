import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import path from 'node:path';
import {inspectCloudNewsroomV2Html,MAX_INERT_HTML_BYTES} from '../cloud-newsroom-v2-html-safety.mjs';
const decode=text=>text.replace(/&(amp|lt|gt|quot|apos);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[key]));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
/** Reconstructs a small typed tree only AFTER inspection of the exact hashed bytes.
 * Not a general HTML parser/sanitizer. Text stays text; React escapes it on output.
 */
export function parseVerifiedPdfReader(bytes,reader){
 if(!(bytes instanceof Uint8Array)||!reader||bytes.byteLength!==reader.bytes||bytes.byteLength>MAX_INERT_HTML_BYTES||createHash('sha256').update(bytes).digest('hex')!==reader.sha256)throw Error('reader-byte-identity-mismatch');
 const safety=inspectCloudNewsroomV2Html(bytes);if(safety.status!=='accepted-inert-subset')throw Error('reader-inert-profile-required:'+safety.reason);
 const html=new TextDecoder('utf-8',{fatal:true}).decode(bytes),body=html.slice(html.indexOf('<body>')+6,html.lastIndexOf('</body>'));
 const root={tag:'body',attrs:{},children:[]},stack=[root];
 for(const token of body.match(/<[^>]+>|[^<]+/g)||[]){
  if(token.startsWith('</')){stack.pop();continue;}
  if(!token.startsWith('<')){stack.at(-1).children.push({text:decode(token)});continue;}
  const match=/^<([a-z][a-z0-9]*)([^>]*)>$/.exec(token),attrs={};
  for(const [,key,value] of match[2].matchAll(/ ([a-z][a-z0-9-]*)="([^"]*)"/g))attrs[key]=value;
  const node={tag:match[1],attrs,children:[]};stack.at(-1).children.push(node);if(!['br','hr'].includes(node.tag))stack.push(node);
 }
 const review=(node,insideTable=false)=>{
  if(!node.tag)return;
  if(node.tag==='table'){
   if(insideTable)throw Error('reader-nested-table-not-supported');
   const captions=node.children.filter(child=>child.tag==='caption');
   if(captions.length!==1||!captions[0].children.some(child=>child.text?.trim()||child.tag))throw Error('reader-table-caption-required');
   let headers=0;const count=child=>{if(child.tag==='th'){headers++;if(!['row','col'].includes(child.attrs.scope))throw Error('reader-table-header-scope-required');}child.children?.forEach(count);};count(node);
   if(!headers)throw Error('reader-table-headers-required');
  }
  node.children?.forEach(child=>review(child,insideTable||node.tag==='table'));
 };
 root.children.forEach(node=>review(node));
 return freeze({profile:safety.profile,nodes:root.children});
}
/** Build-time local read, no network. No active markup can reach the renderer. */
export function readVerifiedPdfReader(reader,publicRoot){
 if(!reader||!/^\/magazine\/daily\/[a-zA-Z0-9_./-]+\.html$/.test(reader.path)||reader.path.includes('..')||reader.path.includes('//'))throw Error('unsafe-reader-path');
 const root=realpathSync(publicRoot),file=realpathSync(path.join(root,reader.path.slice(1)));
 if(!file.startsWith(root+path.sep))throw Error('reader-escapes-public-root');
 const info=statSync(file);if(!info.isFile()||info.size!==reader.bytes||info.size>MAX_INERT_HTML_BYTES)throw Error('reader-byte-identity-mismatch');
 return parseVerifiedPdfReader(readFileSync(file),reader);
}
