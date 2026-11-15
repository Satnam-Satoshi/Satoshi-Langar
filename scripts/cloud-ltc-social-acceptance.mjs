// Finite founder-controlled bootstrap/private-draft proof. Never schedules,
// deletes, publishes, unpauses a ledger or removes the daily acceptance gate.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CloudSocialLedger,BUFFER_TARGET,createBufferMcpClient,probeBufferCloud,bufferToolData,validateBufferArguments} from './cloud-ltc-social.mjs';
import {createGoogleStateRuntime} from './cloud-ltc-google-runtime.mjs';
import {implementationDigest} from './cloud-ltc-release.mjs';
const check=(value,code)=>{if(!value)throw Error(code);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const sha=value=>/^[a-f0-9]{64}$/.test(value??'');
const postId=value=>/^[a-f0-9]{24}$/.test(value??'');
const plain=value=>value&&Object.getPrototypeOf(value)===Object.prototype;
const exact=(value,keys)=>plain(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const methods=['get_account','list_channels','list_posts','get_post','create_post','edit_post'];
function paused(value){check(value?.schemaVersion===1&&value.kind==='ltc-cloud-social'&&value.paused===true&&value.lease===null&&plain(value.records),'social_acceptance_requires_paused_ledger');}
function finiteSwitches(env){check(env.LTC_CLOUD_PUBLISH==='false'&&['LTC_CLOUD_SOCIAL_PUBLISH','LTC_SOCIAL_CLOUD_PUBLISH','LTC_SOCIAL_PUBLISH'].every(key=>env[key]===undefined||env[key]==='false'),'finite_social_publication_gates_required');}
export async function guardSocialAcceptanceSource({root,env=process.env,git,computeDigest=implementationDigest}){
 finiteSwitches(env);check(sha(env.LTC_ACCEPTED_IMPLEMENTATION_SHA256),'accepted_social_implementation_required');
 check(!git(['status','--porcelain=v1','--untracked-files=all']),'clean_reviewed_source_required');git(['ls-files','--error-unmatch','scripts/cloud-ltc-social-acceptance.mjs']);
 const source=git(['rev-parse','HEAD']),implementationSha256=await computeDigest(root);check(implementationSha256===env.LTC_ACCEPTED_IMPLEMENTATION_SHA256,'accepted_social_implementation_mismatch');return{source,implementationSha256};
}
export async function loadGuardedSocialAcceptanceInputs({root,env=process.env,git,configPath,policyPath,readPrivateFile=readFile,computeDigest=implementationDigest}){
 // This guard runs before reading any private resource selection/policy file or
 // constructing a credential-owning provider. Test seams never weaken CLI use.
 const accepted=await guardSocialAcceptanceSource({root,env,git,computeDigest});
 const config=JSON.parse(await readPrivateFile(path.resolve(configPath),'utf8')),policyBytes=await readPrivateFile(path.resolve(policyPath));const policy=JSON.parse(policyBytes),policySha256=hash(policyBytes);
 validateSocialAcceptancePolicy(policy,{...accepted,policySha256,env,config});return{...accepted,config,policy,policySha256};
}
export function validateSocialAcceptancePolicy(policy,{policySha256,env,source,implementationSha256,config,now=new Date().toISOString()}){
 finiteSwitches(env);check(sha(env.LTC_ACCEPTED_IMPLEMENTATION_SHA256)&&env.LTC_ACCEPTED_IMPLEMENTATION_SHA256===implementationSha256,'accepted_social_implementation_mismatch');
 check(env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='Satnam-Satoshi/Satoshi-Langar'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_ACTOR_ID==='268053325'&&/^[0-9]{1,30}$/.test(env.GITHUB_RUN_ID??'')&&/^[0-9]{1,6}$/.test(env.GITHUB_RUN_ATTEMPT??''),'founder_manual_actions_required');
 check(sha(policySha256)&&env.LTC_SOCIAL_ACCEPTANCE_POLICY_SHA256===policySha256,'social_owner_policy_hash_required');
 check(exact(policy,['schemaVersion','purpose','mode','ownerId','source','implementationSha256','folderId','documentId','canonicalSha256','canonicalCount','unmappedHistoricalPostIds','historicalCopyEvidenceSha256','expectedRevision','acceptedSchemaHashes','expiresAt','draft'])&&policy.schemaVersion===1&&policy.purpose==='finite-social-bootstrap-private-draft-only'&&['bootstrap','private-draft','reconcile-private-draft'].includes(policy.mode)&&policy.ownerId===268053325&&policy.source===source&&policy.implementationSha256===implementationSha256&&sha(implementationSha256)&&policy.folderId===config.folderId&&policy.documentId===config.documentId&&config.ledgerKey==='social'&&sha(policy.canonicalSha256)&&policy.canonicalCount===100&&typeof policy.expectedRevision==='string'&&policy.expectedRevision.length>0&&Number.isFinite(Date.parse(policy.expiresAt))&&Date.parse(policy.expiresAt)>Date.parse(now)&&Date.parse(policy.expiresAt)-Date.parse(now)<=86400000,'invalid_social_acceptance_policy');
 check(policy.historicalCopyEvidenceSha256===null||sha(policy.historicalCopyEvidenceSha256),'historical_copy_evidence_required');
 check(Array.isArray(policy.unmappedHistoricalPostIds)&&policy.unmappedHistoricalPostIds.every(postId)&&new Set(policy.unmappedHistoricalPostIds).size===policy.unmappedHistoricalPostIds.length,'historical_queue_review_required');
 check(exact(policy.acceptedSchemaHashes,methods)&&methods.every(name=>sha(policy.acceptedSchemaHashes[name])),'social_schema_acceptance_required');
 if(policy.mode==='bootstrap'){check(policy.draft===null,'invalid_social_acceptance_policy');return policy;}
 const draft=policy.draft;
 check(exact(draft,['platform','text','mediaURL','mediaSha256','altText','instagramMetadata'])&&draft.platform==='instagram'&&typeof draft.text==='string'&&draft.text.length>0&&draft.text.length<=2200&&draft.text.includes('Private cloud acceptance')&&draft.text.includes('AI-prepared')&&!/@|\$/.test(draft.text)&&draft.mediaURL==='https://ltcmagazine.org/brand/ltc-launch-share.png'&&sha(draft.mediaSha256)&&typeof draft.altText==='string'&&draft.altText.length>0&&draft.altText.length<=1000&&exact(draft.instagramMetadata,['type','shouldShareToFeed','isAiGenerated'])&&draft.instagramMetadata.type==='post'&&draft.instagramMetadata.shouldShareToFeed===true&&draft.instagramMetadata.isAiGenerated===true,'invalid_private_draft_policy');
 return policy;
}
function normalized(result){const raw=bufferToolData(result);const value=raw.post??raw;check(postId(value.id),'private_draft_identity_unverified');return value;}
function verifyDraft(value,planned){
 check(value.channelId===BUFFER_TARGET.channels.instagram&&value.text===planned.text&&value.status==='draft'&&value.dueAt===null&&value.sentAt===null&&Array.isArray(value.assets)&&value.assets.length===1,'private_draft_readback_mismatch');
 const asset=value.assets[0];check((asset.source??asset.url)===planned.mediaURL&&(asset.altText??asset.image?.altText)===planned.altText,'private_draft_readback_mismatch');
 const metadata=value.metadata?.instagram??value.metadata;check(metadata?.type==='post'&&metadata.shouldShareToFeed===true&&metadata.isAiGenerated===true,'private_draft_ai_disclosure_unverified');
}
function canonicalCopyMatches(original,actual,historical){
 if(typeof original.text==='string'||typeof original.copy==='string')return actual.text===(original.text??original.copy);
 if(original.status!=='published'||actual.status!=='sent'||typeof actual.text!=='string')return false;
 if(sha(original.copySha256)&&hash(actual.text)===original.copySha256)return true;
 if(!historical||original.copySha256!=='dee9d3ab1cf17e51b505fc2e0158cf1364e22b4e10f5d2359fdb9b17a30769f9'||original.copyEvidence!=='2026-10-06/delorean-extra-copy/social-copy-r3.json')return false;
 if(original.key==='delorean-extra-r2:x:2026-10-06:owner-requested'&&original.platform==='x')return actual.text===historical.xThread[0].text;
 if(original.key==='delorean-extra-r2:instagram:2026-10-06:owner-requested'&&original.platform==='instagram')return actual.text===historical.instagramCaption;
 return false;
}
export async function readCanonicalProof({canonical,client,probe,policy,historicalCopyEvidence=null}){
 check(canonical?.schemaVersion===1&&canonical.enabled===true&&canonical.paused===false&&canonical.campaign?.enabled===true&&Array.isArray(canonical.posts)&&canonical.posts.length===100&&hash(JSON.stringify(canonical))===policy.canonicalSha256,'canonical_100_reservation_proof_required');
 const originals=canonical.posts;const ids=originals.map(post=>post.bufferPostId).filter(Boolean);
 check(ids.every(postId)&&new Set(ids).size===ids.length&&probe.queueReadComplete===true&&probe.identityVerified===true&&probe.queue.length===100&&new Set(probe.queue.map(post=>post.id)).size===100&&probe.queue.every(post=>ids.includes(post.id)||(policy.unmappedHistoricalPostIds.includes(post.id)&&post.status==='sent'))&&policy.unmappedHistoricalPostIds.every(id=>!ids.includes(id)&&probe.queue.some(post=>post.id===id&&post.status==='sent')),'canonical_queue_mismatch');
 const verified=[];
 let historical=null;if(policy.historicalCopyEvidenceSha256){check(Buffer.isBuffer(historicalCopyEvidence)&&hash(historicalCopyEvidence)===policy.historicalCopyEvidenceSha256,'historical_copy_evidence_required');historical=JSON.parse(historicalCopyEvidence);check(historical.id==='delorean-extra-social-20261006-r2'&&Array.isArray(historical.xThread)&&typeof historical.xThread[0]?.text==='string'&&typeof historical.instagramCaption==='string','historical_copy_evidence_invalid');}
 for(const original of originals){if(!original.bufferPostId){check(original.status==='published','unlinked_pending_canonical_record');continue;}const actual=probe.queue.find(post=>post.id===original.bufferPostId);const expectedChannel=BUFFER_TARGET.channels[original.platform];check(expectedChannel&&actual.channelId===expectedChannel&&canonicalCopyMatches(original,actual,historical)&&(!original.dueAt||Date.parse(actual.dueAt)===Date.parse(original.dueAt)),'canonical_queue_mismatch');
  if(['draft','scheduled','sending','uncertain','scheduled-verified','needs_approval'].includes(original.status)){
   client.rememberPostId(actual.id);const saved=normalized(await client.callTool('get_post',{postId:actual.id}));check(saved.channelId===expectedChannel&&saved.text===actual.text&&['scheduled','sent'].includes(saved.status)&&Date.parse(saved.dueAt)===Date.parse(original.dueAt),'canonical_pending_readback_mismatch');verified.push(actual.id);
  }
 }
 return verified;
}
export async function bootstrapSocialLedger({adapter,canonical,client,probe,policy,historicalCopyEvidence=null}){
 const current=await adapter.read('social');paused(current.value);check(current.version===policy.expectedRevision,'social_bootstrap_revision_changed');
 const verifiedPostIds=await readCanonicalProof({canonical,client,probe,policy,historicalCopyEvidence});
 const ledger=new CloudSocialLedger(adapter);const result=await ledger.importCanonical(canonical,{expectedSha256:policy.canonicalSha256,verifiedPostIds,expectedVersion:policy.expectedRevision});
 const saved=await adapter.read('social');paused(saved.value);check(saved.value.migration?.canonicalSha256===policy.canonicalSha256&&Object.keys(saved.value.records).length===100,'social_bootstrap_readback_mismatch');
 return{mode:'bootstrap',...result,canonicalSha256:policy.canonicalSha256,postReadbacks:verifiedPostIds.length,stateSha256:hash(JSON.stringify(saved.value)),version:saved.version,cloudSocialActive:false};
}
function verifyAcceptanceBinding(value,binding){
 paused(value);const acceptance=value.privateDraftAcceptance;
 check(value.migration?.canonicalSha256===binding.canonicalSha256&&hash(JSON.stringify(value.migration))===binding.migrationSha256&&Object.keys(value.records).length===100&&hash(JSON.stringify(value.records))===binding.recordsSha256&&value.fence===binding.fence&&acceptance?.canonicalSha256===binding.canonicalSha256&&acceptance.policySha256===binding.policySha256&&acceptance.runId===binding.runId&&acceptance.runAttempt===binding.runAttempt&&hash(JSON.stringify(acceptance.planned))===binding.plannedSha256,'private_draft_state_binding_changed');
}
async function updateAcceptance(adapter,binding,transform){const current=await adapter.read('social');verifyAcceptanceBinding(current.value,binding);const result=transform(current.value);await adapter.conditionalWrite('social',current.value,current.version);return result;}
export async function acceptPrivateDraft({adapter,client,probe,policy,policySha256,runId,runAttempt,verifyMedia,saveReceipt=async()=>{},reconcile=false}){
 check(probe.identityVerified===true&&probe.queueReadComplete===true&&typeof verifyMedia==='function','private_draft_configuration_invalid');
 const initial=await adapter.read('social');paused(initial.value);check(initial.value.migration?.canonicalSha256===policy.canonicalSha256&&Object.keys(initial.value.records).length===100,'social_bootstrap_required');
 if(!reconcile)check(initial.version===policy.expectedRevision,'social_acceptance_revision_changed');
 const reservationIds=new Set([...Object.values(initial.value.records).map(record=>record.postId),...policy.unmappedHistoricalPostIds]);
 const knownAcceptance=initial.value.privateDraftAcceptance;
 const intendedAcceptance=reconcile?knownAcceptance:{schemaVersion:1,status:'create-uncertain',policySha256,canonicalSha256:policy.canonicalSha256,runId,runAttempt,postId:null,planned:structuredClone(policy.draft)};
 check(plain(intendedAcceptance)&&sha(intendedAcceptance.policySha256)&&intendedAcceptance.canonicalSha256===policy.canonicalSha256&&typeof intendedAcceptance.runId==='string'&&typeof intendedAcceptance.runAttempt==='string'&&JSON.stringify(intendedAcceptance.planned)===JSON.stringify(policy.draft),'private_draft_reconciliation_required');
 const binding={canonicalSha256:policy.canonicalSha256,migrationSha256:hash(JSON.stringify(initial.value.migration)),recordsSha256:hash(JSON.stringify(initial.value.records)),fence:initial.value.fence,policySha256:intendedAcceptance.policySha256,runId:intendedAcceptance.runId,runAttempt:intendedAcceptance.runAttempt,plannedSha256:hash(JSON.stringify(intendedAcceptance.planned))};
 check(probe.queue.every(post=>reservationIds.has(post.id)||post.id===knownAcceptance?.postId),'social_external_queue_unreconciled');
 const args={channelId:BUFFER_TARGET.channels.instagram,schedulingType:'automatic',text:policy.draft.text,assets:[{image:{url:policy.draft.mediaURL,metadata:{altText:policy.draft.altText}}}],saveToDraft:true,metadata:{instagram:policy.draft.instagramMetadata}};
 validateBufferArguments(client.schema('create_post'),args);
 if(!reconcile){
  check(!knownAcceptance,'private_draft_already_attempted');await verifyMedia(policy.draft);
  // Use the exact owner-reviewed snapshot/revision captured before media reads.
  // Any concurrent paused-state change must conflict before create authorization.
  initial.value.privateDraftAcceptance=intendedAcceptance;
  await adapter.conditionalWrite('social',initial.value,initial.version);
  await saveReceipt({mode:'private-draft',status:'create-uncertain',policySha256,cloudSocialActive:false});
  let response;try{response=await client.callTool('create_post',args);}catch{throw Error('private_draft_create_uncertain');}
  const raw=bufferToolData(response),candidateId=(raw.post??raw).id;check(postId(candidateId),'private_draft_unknown_create');
  // Save returned identity privately before further provider/Docs reads.
  await saveReceipt({mode:'private-draft',status:'create-uncertain',postId:candidateId,policySha256,cloudSocialActive:false});
  await updateAcceptance(adapter,binding,value=>{check(value.privateDraftAcceptance.status==='create-uncertain'&&!value.privateDraftAcceptance.postId,'private_draft_state_conflict');value.privateDraftAcceptance.postId=candidateId;});
 }
 const current=await adapter.read('social');verifyAcceptanceBinding(current.value,binding);const acceptance=current.value.privateDraftAcceptance;
 check(acceptance&&['create-uncertain','draft-verified'].includes(acceptance.status)&&postId(acceptance.postId)&&acceptance.canonicalSha256===policy.canonicalSha256&&JSON.stringify(acceptance.planned)===JSON.stringify(policy.draft),'private_draft_reconciliation_required');
 client.rememberPostId(acceptance.postId);const saved=normalized(await client.callTool('get_post',{postId:acceptance.postId}));verifyDraft(saved,policy.draft);
 const proof={mode:'private-draft',status:'draft-verified',postId:saved.id,channelId:saved.channelId,dueAt:null,sentAt:null,readbackSha256:hash(JSON.stringify(saved)),originPolicySha256:acceptance.policySha256,controllerPolicySha256:policySha256,cloudSocialActive:false,schedulingAccepted:false};
 await updateAcceptance(adapter,binding,value=>{check(value.privateDraftAcceptance.postId===saved.id&&value.privateDraftAcceptance.policySha256===acceptance.policySha256,'private_draft_state_conflict');value.privateDraftAcceptance={...value.privateDraftAcceptance,status:'draft-verified',proof};});await saveReceipt(proof);return proof;
}
async function verifyMedia(planned){const response=await fetch(planned.mediaURL,{redirect:'error',signal:AbortSignal.timeout(15000)});check(response.ok&&!response.redirected&&response.body,'private_media_unverified');let length=0;const chunks=[];for await(const chunk of response.body){length+=chunk.byteLength;check(length<=1000000,'private_media_unverified');chunks.push(chunk);}const bytes=Buffer.concat(chunks);check(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&hash(bytes)===planned.mediaSha256,'private_media_unverified');}
async function main(){
 const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){const key={'--mode':'mode','--social-state-config':'config','--canonical-ledger':'canonical','--historical-copy-evidence':'historicalCopyEvidence','--policy':'policy','--receipt':'receipt'}[args[i]];check(key&&!options[key]&&args[i+1],'invalid_social_acceptance_arguments');options[key]=args[i+1];}check(['inspect','bootstrap','private-draft','reconcile-private-draft'].includes(options.mode)&&options.config&&options.policy&&options.receipt,'invalid_social_acceptance_arguments');
 const root=process.cwd();const git=argv=>execFileSync('git',argv,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 const json=async file=>JSON.parse(await readFile(path.resolve(file),'utf8'));const{config,policy,policySha256}=await loadGuardedSocialAcceptanceInputs({root,git,configPath:options.config,policyPath:options.policy});check(options.mode==='inspect'||options.mode===policy.mode,'social_policy_mode_mismatch');
 const{stateAdapter:adapter}=await createGoogleStateRuntime({config});const client=createBufferMcpClient({allowWrites:options.mode==='private-draft',acceptedSchemaHashes:policy.acceptedSchemaHashes});const probe=await probeBufferCloud({client});check(probe.identityVerified&&probe.queueReadComplete&&methods.every(name=>probe.schemaHashes[name]===policy.acceptedSchemaHashes[name]),'social_schema_probe_mismatch');
 const saveReceipt=async value=>writeFile(path.resolve(options.receipt),JSON.stringify(value,null,2)+'\n',{mode:0o600});
 let result;if(options.mode==='inspect'){const state=await adapter.read('social');paused(state.value);result={mode:'inspect',paused:true,version:state.version,stateSha256:hash(JSON.stringify(state.value)),records:Object.keys(state.value.records).length,queueRecords:probe.queue.length,cloudSocialActive:false};}
 else if(options.mode==='bootstrap'){check(options.canonical,'canonical_snapshot_required');result=await bootstrapSocialLedger({adapter,canonical:await json(options.canonical),client,probe,policy,historicalCopyEvidence:options.historicalCopyEvidence?await readFile(path.resolve(options.historicalCopyEvidence)):null});}
 else result=await acceptPrivateDraft({adapter,client,probe,policy,policySha256,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,verifyMedia,saveReceipt,reconcile:options.mode==='reconcile-private-draft'});
 await saveReceipt(result);console.log(JSON.stringify({mode:result.mode,status:result.status??'completed',cloudSocialActive:false,schedulingAccepted:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('Finite social acceptance withheld; inspect private state and reconcile before retrying.');process.exitCode=1;});
