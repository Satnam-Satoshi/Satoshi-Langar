/** Read-only concrete bridge to the reviewed immutable route snapshot adapter. */
import {createHash} from 'node:crypto';
import {readPinnedSnapshot} from '../route-freshness/snapshot.mjs';
import {adaptExistingDesks,DESK_SOURCE_PATHS} from './source-adapter.mjs';
export function readDeskStatusDraft({repoRoot,sourceCommit,now,...observations}){
 const snapshot=readPinnedSnapshot(repoRoot,sourceCommit),byPath=new Map(snapshot.files.map(f=>[f.path,f.text]));
 const texts=Object.fromEntries(Object.entries(DESK_SOURCE_PATHS).map(([key,path])=>{if(!byPath.has(path))throw Error('required-desk-source-missing:'+path);return [key,byPath.get(path)];}));
 const inputs=Object.fromEntries(Object.entries(texts).filter(([k])=>k!=='treasury').map(([k,t])=>[k,JSON.parse(t)]));
 const view=adaptExistingDesks({...observations,...inputs,now,sourceCommit,treasurySource:texts.treasury});
 return {view,provenance:{sourceCommit,files:Object.entries(DESK_SOURCE_PATHS).map(([key,path])=>({path,sha256:createHash('sha256').update(texts[key]).digest('hex')})),snapshotKind:'verified-git-object-bytes',publicationReadbackPerformed:false}};
}
