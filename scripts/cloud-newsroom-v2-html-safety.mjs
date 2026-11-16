/** Recognizer for LTC inert HTML v1, NOT a sanitizer or general HTML parser.
 * Deliberately rejects CSS, images, comments, foreign namespaces and unfamiliar
 * syntax. Feed accepted exact bytes only; never decode/transform after checking.
 * Ordinary allowlisted HTTPS links may navigate on click; no resource fetches.
 */
import { PRIMARY_HOSTS } from './cloud-newsroom-v2-plan.mjs';
export const MAX_INERT_HTML_BYTES=1024*1024;
const phrasing=new Set(['a','strong','em','b','i','span','small','br','code','sup','sub']);
const blocks=new Set(['main','article','section','header','footer','div','h1','h2','h3','h4','h5','h6','p','ul','ol','li','blockquote','pre','table','hr']);
const tags=new Set(['html','head','title','meta','body',...phrasing,...blocks,'caption','thead','tbody','tfoot','tr','th','td']);
const voids=new Set(['br','hr','meta']);
function textOK(s){
 if(/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(s))return false;
 // Only the five XML entities: avoids entity-obfuscated attributes and URLs.
 return !s.replace(/&(amp|lt|gt|quot|apos);/g,'').includes('&');
}
function allowedChild(parent,tag){
 if(parent==='html')return ['head','body'].includes(tag);
 if(parent==='head')return ['title','meta'].includes(tag);
 if(parent==='title')return false;
 if(parent==='table')return ['caption','thead','tbody','tfoot'].includes(tag);
 if(['thead','tbody','tfoot'].includes(parent))return tag==='tr';
 if(parent==='tr')return ['th','td'].includes(tag);
 if(['ul','ol'].includes(parent))return tag==='li';
 if(['p','h1','h2','h3','h4','h5','h6','pre','caption',...phrasing].includes(parent))return phrasing.has(tag);
 return ['body',...blocks,'td','th'].includes(parent)&&(phrasing.has(tag)||blocks.has(tag))&&tag!=='li';
}
export function inspectCloudNewsroomV2Html(bytes){
 const fail=reason=>Object.freeze({status:'hold',profile:'ltc-inert-html-v1',reason,sanitized:false});
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>MAX_INERT_HTML_BYTES)return fail('html_byte_bounds');
 let html;try{html=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{return fail('html_not_utf8');}
 if(!html.startsWith('<!doctype html>'))return fail('exact_doctype_required');
 let rest=html.slice(15),stack=[],seen={html:0,head:0,body:0,title:0,meta:0},count=0;
 while(rest.length){
  if(++count>100000)return fail('html_token_bounds');
  if(rest[0]!=='<'){
   const at=rest.indexOf('<'),s=at<0?rest:rest.slice(0,at);rest=at<0?'':rest.slice(at);
   if(!textOK(s))return fail('unsupported_text_or_entity');
   if(s.trim()&&(!stack.length||['html','head','table','thead','tbody','tfoot','tr','ul','ol'].includes(stack.at(-1))))return fail('text_in_structural_container');continue;
  }
  const end=/^<\/([a-z][a-z0-9]*)>/.exec(rest);
  if(end){if(stack.pop()!==end[1]||voids.has(end[1]))return fail('unbalanced_markup');rest=rest.slice(end[0].length);continue;}
  const start=/^<([a-z][a-z0-9]*)([^<>]*)>/.exec(rest);
  if(!start||!tags.has(start[1]))return fail('unsupported_tag_or_syntax');
  const tag=start[1],attrs={};let a=start[2];
  while(a.length){const m=/^ ([a-z][a-z0-9-]*)="([^"<>]*)"/.exec(a);if(!m||Object.hasOwn(attrs,m[1]))return fail('unsupported_attribute_syntax');attrs[m[1]]=m[2];a=a.slice(m[0].length);}
  for(const [key,value]of Object.entries(attrs)){
   if(!textOK(value)||value.includes('&')||/[\r\n\t]/.test(value))return fail('unsupported_attribute_value');
   if(key==='lang'&&tag==='html'&&/^[a-z]{2}(?:-[A-Z]{2})?$/.test(value))continue;
   if(key==='charset'&&tag==='meta'&&value==='utf-8')continue;
   if(key==='href'&&tag==='a'){
    try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!PRIMARY_HOSTS.includes(u.hostname)||u.href!==value||/[\\\s]/.test(value))return fail('unreviewed_link');}catch{return fail('invalid_link');}continue;
   }
   if(key==='scope'&&tag==='th'&&['row','col'].includes(value))continue;
   if(['colspan','rowspan'].includes(key)&&['td','th'].includes(tag)&&/^[1-9]$/.test(value))continue;
   return fail('unsupported_attribute');
  }
  if(tag==='meta'&&(attrs.charset!=='utf-8'||Object.keys(attrs).length!==1))return fail('charset_only_meta');
  if(tag==='a'&&!attrs.href)return fail('anchor_href_required');
  const parent=stack.at(-1);
  if(tag==='html'?(parent||seen.html):(!parent||!allowedChild(parent,tag)))return fail('invalid_nesting');
  if(tag==='a'&&stack.includes('a'))return fail('nested_anchor');
  if(Object.hasOwn(seen,tag)&&++seen[tag]>1)return fail('duplicate_document_element');
  if(tag==='body'&&seen.head!==1||tag==='head'&&seen.body)return fail('document_order');
  if(!voids.has(tag))stack.push(tag);if(stack.length>64)return fail('html_depth_bounds');rest=rest.slice(start[0].length);
 }
 if(stack.length||!seen.html||!seen.head||!seen.title||!seen.body)return fail('incomplete_document');
 return Object.freeze({status:'accepted-inert-subset',profile:'ltc-inert-html-v1',sanitized:false,resourceFetchesAllowed:false});
}
