/** Pure nonproduction tree-diff admission. All observations and pins are supplied
 * independently; this module does not read Git or grant deployment authority. */
import {createHash} from 'node:crypto';
import {deskDataSha256,planDeskRevisionAppend} from './desk-revisions.mjs';
export const DESK_MODULE_PATH='content/desks/revisions.json';
const fail=m=>{throw Error('Desk data admission: '+m);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const h=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const git=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function tree(o,commit,pin){if(!git(commit)||!git(pin)||o?.sourceCommit!==commit||o?.treeGitSha!==pin||!Array.isArray(o.entries)||o.entries.length>10000)fail('independent observed Git identity required');const map=new Map();let last='';for(const e of o.entries){if(!e||Object.keys(e).sort().join('|')!=='bytes|mode|path|sha256'||typeof e.path!=='string'||e.path.length>500||!e.path||e.path.startsWith('/')||e.path.includes('\\')||e.path.split('/').some(s=>!s||s==='.'||s==='..')||/[\x00-\x1f\x7f]/.test(e.path)||!Number.isSafeInteger(e.bytes)||e.bytes<0||e.bytes>32*1024*1024||e.path<=last||!h(e.sha256)||!['100644','100755'].includes(e.mode)||map.has(e.path))fail('invalid complete tree entry');last=e.path;map.set(e.path,e);}return map;}
export function deskTreeInventorySha256(entries){
 if(!Array.isArray(entries)||entries.length>10000)fail('inventory count bound');
 let total=2;const rows=[...entries].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0).map(e=>{if(!e||Object.keys(e).sort().join('|')!=='bytes|mode|path|sha256'||typeof e.path!=='string'||e.path.length>500||typeof e.mode!=='string'||e.mode.length>6||!h(e.sha256)||!Number.isSafeInteger(e.bytes)||e.bytes<0||e.bytes>32*1024*1024)fail('inventory serialization shape');const row=JSON.stringify({bytes:e.bytes,mode:e.mode,path:e.path,sha256:e.sha256});total+=Buffer.byteLength(row)+1;if(total>8*1024*1024)fail('inventory serialization bound');return row;});return hash('['+rows.join(',')+']');
}
function bytes(input){if(!(input instanceof Uint8Array)||!input.byteLength||input.byteLength>4*1024*1024)fail('bounded actual module bytes required');let text,value;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(input);value=JSON.parse(text);}catch{fail('strict UTF8 JSON required');}return {text,value,sha256:hash(input)};}
export function planDeskDataAdmission({now,registry,trustedRegistrySha256,priorObservation,candidateObservation,trustedPins,priorModuleBytes,candidateModuleBytes,trustedPriorModuleSha256,sourcePolicies,evidenceInventory}={}){
 if(!trustedPins)fail('independent pins required');const before=tree(priorObservation,trustedPins.priorSourceCommit,trustedPins.priorTreeGitSha),after=tree(candidateObservation,trustedPins.candidateSourceCommit,trustedPins.candidateTreeGitSha);
 if(!h(trustedPins.priorInventorySha256)||deskTreeInventorySha256(priorObservation.entries)!==trustedPins.priorInventorySha256)fail('prior full inventory pin mismatch');
 if(!h(trustedPins.candidateInventorySha256)||deskTreeInventorySha256(candidateObservation.entries)!==trustedPins.candidateInventorySha256)fail('candidate full inventory pin mismatch');
 // Bootstrap is a distinct reviewed operation, not implicit absent=empty.
 if(!before.has(DESK_MODULE_PATH)||!after.has(DESK_MODULE_PATH))fail('existing canonical module required; bootstrap separate');
 if(before.size!==after.size)fail('no additions or deletions outside existing module');
 for(const [path,e] of before){const n=after.get(path);if(!n)fail('file deletion');if(n.mode!==e.mode||path===DESK_MODULE_PATH&&n.mode!=='100644')fail('mode change or executable data');if(path!==DESK_MODULE_PATH&&(n.sha256!==e.sha256||n.bytes!==e.bytes))fail('unrelated file change');}
 const prior=bytes(priorModuleBytes),candidate=bytes(candidateModuleBytes);if(priorModuleBytes.byteLength!==before.get(DESK_MODULE_PATH).bytes||candidateModuleBytes.byteLength!==after.get(DESK_MODULE_PATH).bytes)fail('actual byte count mismatch');if(prior.sha256!==before.get(DESK_MODULE_PATH).sha256||candidate.sha256!==after.get(DESK_MODULE_PATH).sha256)fail('actual bytes/tree mismatch');
 if(!Array.isArray(prior.value?.records)||!Array.isArray(candidate.value?.records)||prior.value.records.length>500||candidate.value.records.length>500||candidate.value.records.length<prior.value.records.length)fail('history truncation');
 if(!h(trustedPriorModuleSha256)||prior.sha256!==trustedPriorModuleSha256)fail('independent prior module byte pin mismatch');
 // Existing planner verifies prefix history, exact field sets, immutable chain,
 // registry and independent new source bytes/policies at the injected clock.
 const checkedPrior=planDeskRevisionAppend({now,registry,trustedRegistrySha256,prior:prior.value,trustedPriorSha256:trustedPriorModuleSha256,proposed:[],evidenceInventory:[]});
 if(checkedPrior.moduleJson!==prior.text)fail('prior module not canonical');
 for(let i=0;i<prior.value.records.length;i++)if(deskDataSha256(prior.value.records[i])!==deskDataSha256(candidate.value.records[i]))fail('historical record changed');
 const proposal=planDeskRevisionAppend({now,registry,trustedRegistrySha256,prior:prior.value,trustedPriorSha256:trustedPriorModuleSha256,proposed:candidate.value.records.slice(prior.value.records.length),sourcePolicies,evidenceInventory});
 if(proposal.moduleJson!==candidate.text||proposal.moduleSha256!==candidate.sha256)fail('candidate must be exact canonical append output');
 const changed=prior.sha256!==candidate.sha256;if(changed&&!proposal.appendedIds.length||!changed&&proposal.appendedIds.length)fail('append/diff mismatch');
 return freeze({status:changed?'eligible-for-nonproduction-review':'no-op',path:DESK_MODULE_PATH,moduleSha256:candidate.sha256,appendedIds:proposal.appendedIds,coverage:proposal.coverage,expiresAt:changed?proposal.expiresAt:null,sourceCommit:candidateObservation.sourceCommit,treeGitSha:candidateObservation.treeGitSha,effects:[],writeAuthorized:false,publicationAuthorized:false});
}
