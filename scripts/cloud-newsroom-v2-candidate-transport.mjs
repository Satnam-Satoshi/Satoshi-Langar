/** Exact data-only Git transport using existing authenticated connector callbacks.
 * No credential discovery, autonomous schedule, Vercel call or implicit activation.
 * Default: prepare in memory only. A separate flag plus fresh actual evaluator
 * result is required to advance the source ref. Journal CAS must be durable.
 * Object-write uncertainty holds; ref-update uncertainty is reconciled read-only.
 */
import {createHash} from 'node:crypto';
import {projectReceiptToPdfRegistry} from './lib/ltc-pdf-receipt.mjs';
import {V2_CONNECTOR_SCOPE as S} from './cloud-newsroom-v2-connector-adapters.mjs';
const REGISTRY='content/ltc-pdf/issues.json',MAX=32*1024*1024;
const sha=(b,kind='sha256')=>createHash(kind).update(b).digest('hex');
const gitHash=(type,b)=>sha(Buffer.concat([Buffer.from(`${type} ${b.length}\0`),b]),'sha1');
const hex=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v);
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const eq=(a,b)=>canonical(a)===canonical(b);
const safePath=p=>typeof p==='string'&&p.length<=500&&/^[a-zA-Z0-9_./@+\[\]-]+$/.test(p)&&!p.startsWith('/')&&p.split('/').every(x=>x&&x!=='.'&&x!=='..'&&x.toLowerCase()!=='.git');
function payload(r){if(r?.isError)throw Error('connector_error');let p=r?.structuredContent;if(!p)for(const b of r?.content??[])if(b.type==='text'){try{p=JSON.parse(b.text);break;}catch{}}if(p?.error||!p)throw Error('unknown_connector_result');return p.result??p;}
function fetched(r){const p=payload(r);if(typeof p.content!=='string')throw Error('fetch_json_required');return JSON.parse(p.content);}
function blobBytes(r){const p=payload(r);if(p.encoding!=='base64'||!hex(p.sha,40)||typeof p.content!=='string'||p.content.length>MAX*1.4+10000)throw Error('base64_readback_required');const text=p.content.replace(/\s/g,'');if(!/^[A-Za-z0-9+/]*={0,2}$/.test(text)||text.length%4!==0)throw Error('invalid_base64');const bytes=Buffer.from(text,'base64');if(bytes.toString('base64')!==text||bytes.length>MAX||gitHash('blob',bytes)!==p.sha)throw Error('blob_readback_identity_mismatch');return {bytes,sha:p.sha};}
export function gitTreeFromFileEntries(entries){
 const root=new Map(),seen=new Set();
 for(const e of entries){if(!safePath(e.path)||e.mode!=='100644'||!hex(e.sha,40)||seen.has(e.path.toLowerCase()))throw Error('invalid_full_tree');seen.add(e.path.toLowerCase());let node=root;const parts=e.path.split('/');for(const part of parts.slice(0,-1)){if(node.has(part)&&!(node.get(part) instanceof Map))throw Error('tree_collision');if(!node.has(part))node.set(part,new Map());node=node.get(part);}const leaf=parts.at(-1);if(node.has(leaf))throw Error('tree_collision');node.set(leaf,e.sha);}
 const hashNode=node=>{const rows=[...node].map(([name,value])=>({name,dir:value instanceof Map,sha:value instanceof Map?hashNode(value):value})).sort((a,b)=>Buffer.compare(Buffer.from(a.name+(a.dir?'/':'')),Buffer.from(b.name+(b.dir?'/':''))));return gitHash('tree',Buffer.concat(rows.map(x=>Buffer.concat([Buffer.from(`${x.dir?'40000':'100644'} ${x.name}\0`),Buffer.from(x.sha,'hex')]))));};
 return hashNode(root);
}
/** tools: githubFetch, githubFetchFile, githubCreateBlob, githubCreateTree,
 * githubCreateCommit, githubUpdateRef (unchanged MCP argument/result envelopes).
 * readArtifact(copy)->Uint8Array from the accepted isolated bundle.
 * journal.read(key)->{version,value|null}; cas(key,version,value)->{ok,version}.
 * Journal contains public-safe fingerprints, not receipt/source/private paths.
 */
export function createCloudNewsroomV2CandidateTransport({tools,readArtifact,journal,clock,allowMutations=false,allowRefUpdate=false}){
 for(const k of ['githubFetch','githubFetchFile','githubCreateBlob','githubCreateTree','githubCreateCommit','githubUpdateRef'])if(typeof tools?.[k]!=='function')throw Error('explicit_git_connectors_required');
 if(typeof readArtifact!=='function'||typeof journal?.read!=='function'||typeof journal.cas!=='function'||typeof clock!=='function')throw Error('explicit_io_journal_clock_required');
 const url=path=>`https://api.github.com/repos/${S.repository}/git/${path}`;
 const fetchJson=async path=>fetched(await tools.githubFetch({url:url(path)}));
 const head=async()=>{const r=await fetchJson('ref/heads/'+S.branch);if(r.ref!==`refs/heads/${S.branch}`||r.object?.type!=='commit'||!hex(r.object.sha,40))throw Error('unknown_branch_head');return r.object.sha;};
 const tree=async id=>{const r=await fetchJson(`trees/${id}?recursive=1`);if(r.sha!==id||r.truncated!==false||!Array.isArray(r.tree)||r.tree.length>30000)throw Error('incomplete_remote_tree');const files=r.tree.filter(e=>e.type!=='tree').map(e=>({path:e.path,mode:e.mode,sha:e.sha}));if(gitTreeFromFileEntries(files)!==id)throw Error('remote_tree_identity_mismatch');return files;};
 const commit=async(id,treeSha,parent)=>{const r=await fetchJson(`commits/${id}`);if(r.sha!==id||r.tree?.sha!==treeSha||parent&&(!Array.isArray(r.parents)||r.parents.length!==1||r.parents[0].sha!==parent))throw Error('commit_identity_mismatch');return r;};
 return Object.freeze({advance:async function(input){
  const out=(status,reason,extra={})=>({status,reason,...extra,publishingAuthorized:false,repository:S.repository,branch:S.branch});
  try{
   const {receipt,baseline,runId}=input??{};
   if(!/^[A-Za-z0-9_-]{1,80}$/.test(runId??'')||!hex(baseline?.commitSha,40)||!hex(baseline?.treeSha,40)||!Array.isArray(baseline.files)||baseline.files.length>20000||typeof baseline.registryText!=='string'||Buffer.byteLength(baseline.registryText)>1024*1024)throw Error('trusted_baseline_required');
   if(receipt?.status!=='accepted-receipt'||receipt.operational!==false||receipt.effects?.length!==0||receipt.errors?.length!==0)throw Error('accepted_actual_receipt_required');
   if(gitTreeFromFileEntries(baseline.files)!==baseline.treeSha)throw Error('baseline_tree_hash_mismatch');
   const registryBlob=gitHash('blob',Buffer.from(baseline.registryText));if(baseline.files.find(e=>e.path===REGISTRY)?.sha!==registryBlob)throw Error('baseline_registry_mismatch');
   const projection=projectReceiptToPdfRegistry(JSON.parse(baseline.registryText),receipt),files=[];
   for(const copy of projection.assetCopies){if(baseline.files.some(e=>e.path===copy.destination))throw Error('historical_destination_exists');const bytes=await readArtifact(copy);if(!(bytes instanceof Uint8Array)||bytes.length!==copy.bytes||bytes.length<1||bytes.length>MAX||sha(bytes)!==copy.sha256)throw Error('actual_bundle_bytes_mismatch');const b=Buffer.from(bytes);files.push({path:copy.destination,mode:'100644',sha:gitHash('blob',b),sha256:sha(b),bytes:b});}
   const registry=Buffer.from(JSON.stringify(projection.registry,null,2)+'\n');files.push({path:REGISTRY,mode:'100644',sha:gitHash('blob',registry),sha256:sha(registry),bytes:registry});
   const candidateFiles=[...baseline.files.filter(e=>e.path!==REGISTRY),...files.map(({path,mode,sha})=>({path,mode,sha}))],candidateTree=gitTreeFromFileEntries(candidateFiles),binding={schemaVersion:1,kind:'cloud-newsroom-v2-candidate-transport',runId,baselineCommit:baseline.commitSha,baselineTree:baseline.treeSha,candidateTree,issueId:projection.issue.id,pdfSha256:projection.issue.sha256,registrySha256:sha(registry),files:files.map(f=>({path:f.path,sha:f.sha,sha256:f.sha256,bytes:f.bytes.length}))},planDigest=sha(canonical(binding));
   if(allowMutations!==true)return out('prepared-only','mutations_disabled',{binding,planDigest});
   const key='cloud-newsroom-v2-candidate/'+runId;let record=await journal.read(key),state=record?.value;
   if(state&&(state.planDigest!==planDigest||!eq(state.binding,binding)))throw Error('durable_candidate_intent_conflict');
   const save=async value=>{const r=await journal.cas(key,record.version,value);if(r?.ok!==true)throw Error('journal_cas_conflict');const read=await journal.read(key);if(read.version!==r.version||!eq(read.value,value))throw Error('journal_readback_mismatch');record=read;state=read.value;};
   const verifyFiles=async shaCommit=>{await commit(shaCommit,candidateTree,baseline.commitSha);if(!eq((await tree(candidateTree)).sort((a,b)=>a.path.localeCompare(b.path)),candidateFiles.slice().sort((a,b)=>a.path.localeCompare(b.path))))throw Error('unexpected_candidate_tree');for(const f of files){const actual=blobBytes(await tools.githubFetchFile({repository_full_name:S.repository,ref:shaCommit,path:f.path,encoding:'base64'}));if(actual.sha!==f.sha||actual.bytes.length!==f.bytes.length||sha(actual.bytes)!==f.sha256)throw Error('candidate_file_readback_mismatch');}};
   if(state?.phase==='ref-intent'||state?.phase==='complete'){
    const current=await head();if(current!==state.candidateCommit)return out('hold',current===baseline.commitSha?'ref_outcome_not_committed_no_blind_retry':'branch_drift_requires_review',{candidateCommit:state.candidateCommit});await verifyFiles(state.candidateCommit);
    if(state.phase!=='complete')await save({...state,phase:'complete'});return out('candidate-source-verified','exact_ref_and_files_verified',{candidateCommit:state.candidateCommit,candidateTree,planDigest});
   }
   if(state?.phase==='object-intent')return out('hold','object_result_uncertain_requires_reconciliation');
   if(!state){
    if(await head()!==baseline.commitSha)throw Error('baseline_branch_changed');await commit(baseline.commitSha,baseline.treeSha);if(!eq((await tree(baseline.treeSha)).sort((a,b)=>a.path.localeCompare(b.path)),baseline.files.slice().sort((a,b)=>a.path.localeCompare(b.path))))throw Error('baseline_remote_tree_mismatch');
    await save({planDigest,binding,phase:'object-intent'});
    for(const f of files){const r=payload(await tools.githubCreateBlob({repository_full_name:S.repository,encoding:'base64',content:f.bytes.toString('base64')}));if((r.sha??r.blob_sha)!==f.sha)throw Error('created_blob_hash_mismatch');}
    const r=payload(await tools.githubCreateTree({repository_full_name:S.repository,base_tree_sha:baseline.treeSha,tree_elements:files.map(f=>({path:f.path,mode:'100644',type:'blob',sha:f.sha}))}));if((r.sha??r.tree_sha)!==candidateTree)throw Error('created_tree_hash_mismatch');
    const c=payload(await tools.githubCreateCommit({repository_full_name:S.repository,tree_sha:candidateTree,parent_sha:baseline.commitSha,additional_parent_shas:[],message:`Cloud newsroom v2 immutable edition ${projection.issue.id}`})),candidateCommit=c.sha??c.commit_sha;if(!hex(candidateCommit,40))throw Error('created_commit_unknown');await verifyFiles(candidateCommit);await save({planDigest,binding,phase:'candidate-verified',candidateCommit});
    return out('candidate-verified-awaiting-admission','unreferenced_commit_readback_verified',{candidateCommit,candidateTree,planDigest});
   }
   if(state.phase!=='candidate-verified')throw Error('unknown_transport_phase');
   const a=input.admission,p=a?.proposal,now=Date.parse(await clock());
   if(allowRefUpdate!==true||a?.status!=='eligible-for-preview-review'||a.errors?.length!==0||a.effects?.length!==0||a.promotionAuthorized!==false||p?.candidateCommit!==state.candidateCommit||p.priorCommit!==baseline.commitSha||p.reviewedSourceCommit!==receipt.validation.manifest.sourceCommit||p.registrySha256!==binding.registrySha256||p.issueId!==binding.issueId||!eq([...(p.artifactPaths??[])].sort(),files.filter(f=>f.path!==REGISTRY).map(f=>f.path).sort())||!Number.isFinite(now)||!(Date.parse(p.expiresAt)>now))return out('candidate-verified-awaiting-admission','fresh_exact_evaluator_and_ref_permission_required',{candidateCommit:state.candidateCommit,candidateTree,planDigest});
   await verifyFiles(state.candidateCommit);if(await head()!==baseline.commitSha)throw Error('baseline_branch_changed');if(!(Date.parse(p.expiresAt)>Date.parse(await clock())))throw Error('admission_expired_before_ref');
   await save({...state,phase:'ref-intent'});if(!(Date.parse(p.expiresAt)>Date.parse(await clock())))return out('hold','admission_expired_after_intent_no_ref_write',{candidateCommit:state.candidateCommit});
   try{await tools.githubUpdateRef({repository_full_name:S.repository,branch_name:S.branch,sha:state.candidateCommit,expected_sha:baseline.commitSha,force:false});}catch{return out('awaiting-ref-reconciliation','ref_result_uncertain_no_retry',{candidateCommit:state.candidateCommit});}
   // Success/error envelopes are not proof. Next advance independently reads head.
   return out('awaiting-ref-reconciliation','ref_requested_readback_required',{candidateCommit:state.candidateCommit});
  }catch{return out('hold','transport_validation_connector_or_journal_failure');}
 }});
}
