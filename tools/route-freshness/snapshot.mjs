// Read-only adapter: immutable Git objects only, never working-tree file bytes.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const defaultRun = (repo,args,options={}) => execFileSync('git',['-C',repo,...args],{maxBuffer:128*1024*1024,...options});
export function readPinnedSnapshot(repo,expectedCommit,{run=defaultRun}={}) {
 if (!/^[a-f0-9]{40}$/.test(expectedCommit??'')) throw new Error('Exact SHA-1 commit required');
 const head=run(repo,['rev-parse','HEAD']).toString('utf8').trim();
 if(head!==expectedCommit) throw new Error('Snapshot commit differs; review adapter pin');
 // HEAD, index and working tree can now change without changing this snapshot.
 const entries=run(repo,['ls-tree','-rz','--full-tree',expectedCommit]).toString('utf8').split('\0').filter(Boolean).map(record=>{
  const match=/^(\d{6}) (\w+) ([a-f0-9]{40})\t([\s\S]+)$/.exec(record);
  if(!match)throw new Error('Invalid tree record');
  return {mode:match[1],type:match[2],oid:match[3],path:match[4]};
 }).filter(e=>/\.(?:tsx?|jsx?|mjs|json|css)$/.test(e.path)&&/^(?:app|content|config|components|lib|data|scripts)\//.test(e.path));
 for(const e of entries)if(e.type!=='blob'||!['100644','100755'].includes(e.mode))throw new Error('Selected file is not a regular blob');
 if(!entries.length)throw new Error('Empty source snapshot');
 const bytes=run(repo,['cat-file','--batch'],{input:entries.map(e=>e.oid+'\n').join('')});
 if(!Buffer.isBuffer(bytes))throw new Error('Blob transport must return bytes');
 let offset=0;
 const files=entries.map(e=>{
  const nl=bytes.indexOf(10,offset); if(nl<0)throw new Error('Missing blob header');
  const header=bytes.subarray(offset,nl).toString('ascii');
  const m=/^([a-f0-9]{40}) blob (\d+)$/.exec(header);
  if(!m||m[1]!==e.oid)throw new Error('Blob identity mismatch');
  const size=Number(m[2]); if(!Number.isSafeInteger(size)||size<0||size>128*1024*1024)throw new Error('Blob size invalid');
  const start=nl+1,end=start+size;
  if(end>=bytes.length||bytes[end]!==10)throw new Error('Truncated blob');
  const data=bytes.subarray(start,end);
  const oid=createHash('sha1').update(Buffer.from(`blob ${size}\0`)).update(data).digest('hex');
  if(oid!==e.oid)throw new Error('Blob content hash mismatch');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(data);
  offset=end+1;return {path:e.path,text};
 });
 if(offset!==bytes.length)throw new Error('Unexpected trailing blob bytes');
 return {commit:expectedCommit,files};
}
