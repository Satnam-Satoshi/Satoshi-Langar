/** Read-only complete SHA-1 Git object observation. No checkout/index or network. */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {deskTreeInventorySha256,DESK_MODULE_PATH} from './desk-data-admission.mjs';
const oid=(type,b)=>createHash('sha1').update(`${type} ${b.length}\0`).update(b).digest('hex');
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=m=>{throw Error('Desk Git observer: '+m);};
const pin=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const env={PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C',HOME:'/nonexistent',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1'};
export function observeDeskGitObjects({repoRoot,sourceCommit,treeGitSha}){
 if(!pin(sourceCommit)||!pin(treeGitSha)||typeof repoRoot!=='string'||!repoRoot.startsWith('/'))fail('explicit repository and commit/tree pins required');
 const root=realpathSync(repoRoot);const git=(args,input)=>execFileSync('/usr/bin/git',['-C',root,'-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','protocol.allow=never',...args],{env,input,maxBuffer:128*1024*1024,timeout:30000});
 const format=git(['rev-parse','--show-object-format']).toString().trim();if(format!=='sha1')fail('only reviewed SHA-1 format supported');
 const commit=git(['cat-file','commit',sourceCommit]);if(commit.length>1024*1024||oid('commit',commit)!==sourceCommit||commit.toString('utf8').split('\n')[0]!==`tree ${treeGitSha}`)fail('commit/tree identity mismatch');
 // ls-tree discovers candidate objects; raw tree traversal below proves completeness.
 const listed=git(['ls-tree','-r','-t','-z',treeGitSha]).toString('utf8').split('\0').filter(Boolean);if(listed.length>20000)fail('tree entry count');
 const ids=new Set([treeGitSha]);for(const line of listed){const m=/^(\d{6}) (blob|tree) ([a-f0-9]{40})\t/.exec(line);if(!m||!['100644','100755','040000'].includes(m[1]))fail('nonregular object mode');ids.add(m[3]);}
 const order=[...ids],check=git(['cat-file','--batch-check'],order.join('\n')+'\n').toString().trim().split('\n');let total=0;for(let i=0;i<check.length;i++){const m=/^([a-f0-9]{40}) (blob|tree) (\d+)$/.exec(check[i]);if(!m||m[1]!==order[i])fail('missing object');const n=Number(m[3]);if(!Number.isSafeInteger(n)||n>32*1024*1024)fail('object byte bound');total+=n;if(total>96*1024*1024)fail('total object byte bound');}if(check.length!==order.length)fail('object count mismatch');
 const batch=git(['cat-file','--batch'],order.join('\n')+'\n'),objects=new Map();let offset=0;for(const expected of order){const end=batch.indexOf(10,offset);if(end<0)fail('batch header');const m=/^([a-f0-9]{40}) (blob|tree) (\d+)$/.exec(batch.subarray(offset,end).toString());if(!m||m[1]!==expected)fail('batch identity');const size=Number(m[3]),start=end+1,stop=start+size;if(stop>=batch.length||batch[stop]!==10)fail('truncated object');const bytes=batch.subarray(start,stop);if(oid(m[2],bytes)!==expected)fail('object OID mismatch');objects.set(expected,{type:m[2],bytes});offset=stop+1;}if(offset!==batch.length)fail('trailing batch bytes');
 const entries=[];let fileBytes=0,moduleBytes=null;const decoder=new TextDecoder('utf-8',{fatal:true});
 function walk(id,prefix,depth){if(depth>32)fail('tree depth');const object=objects.get(id);if(object?.type!=='tree')fail('missing traversed tree');let i=0;const seen=new Set();while(i<object.bytes.length){const space=object.bytes.indexOf(32,i),nul=object.bytes.indexOf(0,space+1);if(space<i||nul<space||nul+21>object.bytes.length)fail('malformed raw tree');const mode=object.bytes.subarray(i,space).toString('ascii');let name;try{name=decoder.decode(object.bytes.subarray(space+1,nul));}catch{fail('nonUTF8 path');}if(!name||name==='.'||name==='..'||name.includes('/')||name.includes('\\')||/[\x00-\x1f\x7f]/.test(name)||seen.has(name))fail('unsafe raw path');seen.add(name);const child=object.bytes.subarray(nul+1,nul+21).toString('hex'),path=prefix+name;i=nul+21;if(path.length>500)fail('path bound');if(mode==='40000')walk(child,path+'/',depth+1);else{if(!['100644','100755'].includes(mode))fail('nonregular raw mode');const blob=objects.get(child);if(blob?.type!=='blob')fail('missing raw blob');fileBytes+=blob.bytes.length;if(fileBytes>96*1024*1024)fail('total expanded file bytes');entries.push({path,sha256:sha(blob.bytes),bytes:blob.bytes.length,mode});if(entries.length>10000)fail('file count');if(path===DESK_MODULE_PATH)moduleBytes=Uint8Array.from(blob.bytes);}}}
 walk(treeGitSha,'',0);entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 return {observation:{sourceCommit,treeGitSha,entries},inventorySha256:deskTreeInventorySha256(entries),moduleBytes,verification:'raw-commit-tree-blob-OIDs',effects:[]};
}
