/** Pure pinned-source reader outline for synthetic lifecycle testing. Derived from scripts/lib/ltc-pdf-reader.mjs at a168899; no filesystem or publication authority. */
import {createHash} from 'node:crypto';
import {inspectCloudNewsroomV2Html,MAX_INERT_HTML_BYTES} from '../src/lib/inert-reader-html.mjs';
const acceptedDocuments=new WeakSet();
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
 const document=freeze({profile:safety.profile,readerSha256:reader.sha256,nodes:root.children});
 acceptedDocuments.add(document);return document;
}
/** Deterministic navigation evidence, not a summary or an editorial assertion.
 * Only parser-produced documents are accepted. Hashes bind canonical parsed AST
 * node content; readerSha256 separately binds exact original artifact bytes.
 * Main/article/div are transparent; topmost headed sections are single stories.
 * Bare h1/h2 starts a sibling run; nested/table/list/header headings are not stories.
 */
export function extractPdfReaderOutline(document,issueId){
 if(!acceptedDocuments.has(document))throw Error('verified-reader-document-required');
 if(!/^\d{4}-\d{2}-\d{2}-r[1-9]\d*$/.test(issueId))throw Error('immutable-reader-issue-id-required');
 const text=node=>'text' in node?node.text:node.children.map(text).join(' ');
 const plain=node=>text(node).replace(/\s+/g,' ').trim();
 const outline=[];
 const add=(heading,nodes,nodePath)=>{
  const headingText=plain(heading);if(!headingText)return;
  outline.push({fragment:`story-${issueId}-${nodePath.join('-')}`,nodePath:nodePath.join('.'),headingText,
   excerpt:nodes.map(plain).join(' ').replace(/\s+/g,' ').trim().slice(0,280),
   contentSha256:createHash('sha256').update(JSON.stringify(nodes)).digest('hex'),readerSha256:document.readerSha256});
 };
 const walk=(nodes,prefix=[])=>{
  for(let index=0;index<nodes.length;index++){
   const node=nodes[index],position=[...prefix,index];if(!node.tag)continue;
   if(node.tag==='section'){
    const heading=node.children.find(child=>/^h[1-6]$/.test(child.tag));
    if(heading)add(heading,[node],position);else walk(node.children,position);
   }else if(['main','article','div'].includes(node.tag))walk(node.children,position);
   else if(['h1','h2'].includes(node.tag)){
    let end=index+1;while(end<nodes.length&&!['h1','h2','section','main','article','div'].includes(nodes[end].tag))end++;
    add(node,nodes.slice(index,end),position);index=end-1;
   }
  }
 };
 walk(document.nodes);return freeze(outline);
}
