/** Private read-only interpretation stage. Never exports public site data or
 * treats unsupported sources/failed retrievals as no news. No publisher imports.
 */
import {readFile,lstat,realpath,mkdir,writeFile} from 'node:fs/promises';
import {resolve,isAbsolute,relative,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateRegistry} from './cloud-newsroom-v2-scan.mjs';
import {CORE_RELEASE_SOURCE,extractCloudNewsroomV2CoreRelease} from './cloud-newsroom-v2-extract-core-release.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function readOwned(root,name,max){if(typeof name!=='string'||name.startsWith('/')||name.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('unsafe_evidence_locator');const p=join(root,name),s=await lstat(p);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>max||await realpath(p)!==p)throw Error('unsafe_or_oversized_evidence');const b=await readFile(p);if(b.length>max)throw Error('oversized_evidence');return b;}
export async function extractCloudNewsroomV2Scan({registry,scanDirectory,now,previousBySource={}}={}){
 validateRegistry(registry);if(typeof scanDirectory!=='string'||!isAbsolute(scanDirectory)||resolve(scanDirectory)!==scanDirectory||await realpath(scanDirectory)!==scanDirectory)throw Error('canonical_scan_directory_required');
 if(!Number.isFinite(Date.parse(now)))throw Error('extraction_clock_required');
 const coverageBytes=await readOwned(scanDirectory,'coverage.json',2*1024*1024),scan=JSON.parse(coverageBytes);
 if(scan.schemaVersion!==1||scan.generation!=='cloud-newsroom-v2'||scan.mode!=='read-only-source-scan'||scan.registrySha256!==sha(JSON.stringify(registry))||!Array.isArray(scan.observations)||scan.observations.length!==registry.sources.length)throw Error('scan_registry_identity_mismatch');
 const map=new Map();for(const o of scan.observations){if(!o||map.has(o.sourceId))throw Error('duplicate_scan_observation');map.set(o.sourceId,o);}
 const results=[];
 for(const source of registry.sources){const o=map.get(source.id);if(!o||o.url!==source.url)throw Error('source_observation_identity_mismatch');
  const gap=reason=>({sourceId:source.id,desk:source.desk??null,status:'gap',reason,retrievalStatus:o.status,claimVerified:false,publishable:false});
  if(o.status!=='retrieved-uninterpreted'){results.push(gap('source_not_retrieved'));continue;}
  const retrieved=Date.parse(o.checkedAt),policyDeadline=retrieved+(source.maxCheckAgeHours??24)*3600000;if(!Number.isFinite(retrieved)||!Number.isFinite(Date.parse(o.retrievalExpiresAt))||retrieved>Date.parse(now)||policyDeadline<=Date.parse(now)||Date.parse(o.retrievalExpiresAt)<=Date.parse(now)||Date.parse(o.retrievalExpiresAt)>policyDeadline){results.push(gap('registry_retrieval_policy_expired_or_mismatched'));continue;}
  if(source.id!==CORE_RELEASE_SOURCE.id||source.url!==CORE_RELEASE_SOURCE.url){results.push(gap('parser_not_implemented'));continue;}
  try{const e=o.evidence;if(!e||typeof e.locator!=='string'||!/^evidence\/core-[a-f0-9]{64}\.json$/.test(e.locator)||e.sha256!==o.sha256||e.bytes!==o.bytes||Date.parse(e.retrievedAt)!==Date.parse(o.checkedAt))throw Error('raw_evidence_binding_missing');
   const bytes=await readOwned(scanDirectory,e.locator,1_000_000);if(sha(bytes)!==e.sha256||bytes.length!==e.bytes)throw Error('raw_evidence_changed');
   const parsed=extractCloudNewsroomV2CoreRelease({rawBytes:bytes,observation:o,now,previousRelease:Object.hasOwn(previousBySource,source.id)?previousBySource[source.id]:null});
   results.push({...parsed,sourceId:source.id,desk:source.desk??null,rawEvidenceLocator:e.locator});
  }catch{results.push(gap('raw_evidence_unavailable_or_mismatched'));}
 }
 return {schemaVersion:1,generation:'cloud-newsroom-v2',mode:'private-story-extraction',checkedAt:now,registrySha256:scan.registrySha256,scanSha256:sha(coverageBytes),results,coverage:{attempted:results.length,extractedForReview:results.filter(r=>r.status==='candidate-for-review').length,gaps:results.filter(r=>r.status==='gap').map(r=>({sourceId:r.sourceId,reason:r.reason})),completeEcosystemCoverage:false},publication:{performed:false,publishable:false,reason:'Extraction candidates require independent editorial review; this stage does not produce or publish an edition.'}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--scan-dir'||args[2]!=='--output-dir')throw Error('usage_scan_dir_output_dir');const root=await realpath(resolve(process.env.RUNNER_TEMP??'/tmp')),out=resolve(args[3]);if(relative(root,out).startsWith('..')||out===root||await realpath(dirname(out))!==dirname(out))throw Error('output_new_runner_directory_required');const registry=JSON.parse(await readFile(new URL('../config/cloud-newsroom-v2-sources.json',import.meta.url),'utf8'));const result=await extractCloudNewsroomV2Scan({registry,scanDirectory:resolve(args[1]),now:new Date().toISOString()});await mkdir(out,{recursive:false,mode:0o700});await writeFile(join(out,'story-extraction.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({mode:result.mode,coverage:result.coverage,publication:result.publication}));}
