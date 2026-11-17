/** Local draft-only execution, no cloud provider or publication. */
import {mkdtemp,writeFile,readFile,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {createHash} from 'node:crypto';
const execute=promisify(execFile),hash=b=>createHash('sha256').update(b).digest('hex');
const renderer=fileURLToPath(new URL('../renderer/render.py',import.meta.url));
const names=['edition.pdf','reader.html','cover.png','promo.png'];
export async function prepareLocalArtifacts({input,workRoot,executeEnabled=false}={}){
 if(executeEnabled!==true)return {status:'disabled',publicationExecuted:false,renderAttempted:false};
 if(typeof workRoot!=='string'||!path.isAbsolute(workRoot)||await realpath(workRoot)!==workRoot)throw Error('explicit-real-work-root-required');
 const root=await lstat(workRoot);if(!root.isDirectory()||root.isSymbolicLink())throw Error('work-root-directory-required');
 const json=JSON.stringify(input);if(typeof json!=='string'||Buffer.byteLength(json)>256*1024)throw Error('bounded-render-input-required');
 const dir=await mkdtemp(path.join(workRoot,'draft-render-')),inputFile=path.join(dir,'input.json'),output=path.join(dir,'artifacts');
 await writeFile(inputFile,json,{flag:'wx',mode:0o600});
 try{
  await execute('/usr/bin/python3',['-I','-B',renderer,'--input',inputFile,'--output',output],{timeout:30000,maxBuffer:65536,env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',PYTHONDONTWRITEBYTECODE:'1'}});
  const manifestPath=path.join(output,'render-manifest.json'),meta=await lstat(manifestPath);
  if(!meta.isFile()||meta.isSymbolicLink()||meta.size>65536)throw Error('manifest-shape');
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  if(manifest.schemaVersion!==1||manifest.issueId!==input.issueId||manifest.mode!=='draft-only'||manifest.publishable!==false||manifest.publicationExecuted!==false||Object.keys(manifest.artifacts??{}).sort().join('|')!==names.slice().sort().join('|'))throw Error('bound-draft-manifest-required');
  const artifacts={};
  for(const name of names){const target=path.join(output,name),stat=await lstat(target);if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>32*1024*1024)throw Error('artifact-file-bound');const bytes=await readFile(target);if(manifest.artifacts[name].bytes!==bytes.length||manifest.artifacts[name].sha256!==hash(bytes))throw Error('artifact-byte-mismatch');if(name.endsWith('.png')&&(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.length<24||bytes.readUInt32BE(16)!==(name==='cover.png'?1080:1200)||bytes.readUInt32BE(20)!==(name==='cover.png'?1350:630)))throw Error('png-dimensions');if(name==='edition.pdf'&&!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('pdf-signature');artifacts[name]={path:target,bytes:bytes.length,sha256:hash(bytes)};}
  return {status:'local-draft-artifacts-byte-verified',renderAttempted:true,publishable:false,publicationExecuted:false,visualQaVerified:false,artifactDirectory:output,manifestSha256:hash(await readFile(manifestPath)),artifacts};
 }catch{return {status:'held-local-render-or-readback',renderAttempted:true,publishable:false,publicationExecuted:false,partialWorkDirectory:dir,retryPerformed:false};}
}
