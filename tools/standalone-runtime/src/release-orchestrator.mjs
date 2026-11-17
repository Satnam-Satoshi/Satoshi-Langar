/** Concrete bounded preview/QA/archive slice. No promotion path. */
import {prepareGitObjectPlan,createGitHubCandidateObjects} from './adapters/github-candidate-objects.mjs';
import {createFirestoreGitObjectJournal} from './firestore-git-object-journal.mjs';
import {createGitHubCandidateRef,CANDIDATE_BRANCH} from './adapters/github-candidate-ref.mjs';
import {createFirestoreCandidateRefJournal} from './firestore-candidate-ref-journal.mjs';
import {createFirestoreVercelJournal} from './firestore-vercel-journal.mjs';
import {createVercelRelease} from './adapters/vercel-release.mjs';
import {createVercelReadOnly} from './adapters/vercel-readonly.mjs';
import {createReleaseQa} from './release-qa.mjs';
import {createFirestoreReleasePhase,releaseCanonical as c,releaseSha as sha} from './firestore-release-phase.mjs';
import {createQaProofArchive} from './qa-proof-archive.mjs';
const instant=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x?Date.parse(x):NaN;
const held=reason=>({status:'held',reason,publicationVerified:false,promotionAllowed:false,retryAuthorized:false});
export function createReleaseOrchestrator({store,github,vercel,drive,pins:input,qaTemplate:template,projectName,hookPolicySha256,objectPlan=null,loadObjectApproval=null,loadRefApproval,loadPreviewApproval,loadSourceAdmission,read,clock,networkEnabled=false,mutationsEnabled=false}={}){
 for(const v of [store,github,vercel,drive])if(!v||Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).length!==Object.keys(v).length||Object.values(Object.getOwnPropertyDescriptors(v)).some(p=>p.get||p.set||!p.enumerable))throw Error('plain-release-boundaries-required');
 const pins=JSON.parse(c(input)),qaTemplate=JSON.parse(c(template));
 if(typeof networkEnabled!=='boolean'||typeof mutationsEnabled!=='boolean'||typeof clock!=='function'||[loadRefApproval,loadPreviewApproval,loadSourceAdmission,read].some(f=>typeof f!=='function')||!store||!github||github.branch!==CANDIDATE_BRANCH||!vercel||!drive||typeof projectName!=='string'||!/^[a-z0-9][a-z0-9-]{0,99}$/.test(projectName)||!/^[a-f0-9]{64}$/.test(hookPolicySha256)||Object.hasOwn(qaTemplate,'deploymentId')||Object.hasOwn(qaTemplate,'previewHostname')||qaTemplate.branch!==CANDIDATE_BRANCH||qaTemplate.sourceCommit!==pins.candidateCommit||qaTemplate.editionDate!==pins.editionDate||qaTemplate.revision!==pins.revision||qaTemplate.baselineSourceCommit!==pins.baselineCommit||!Array.isArray(qaTemplate.artifacts)||qaTemplate.artifacts.length!==4||new Set(qaTemplate.artifacts.map(a=>a.role)).size!==4||qaTemplate.artifacts.some(a=>pins.artifactDigests[a.role]!==a.sha256))throw Error('independent-release-crossbindings-required');
 const preparedObjects=objectPlan===null?null:prepareGitObjectPlan(objectPlan);if(preparedObjects&&(c(preparedObjects.plan.pins)!==c(pins)||typeof loadObjectApproval!=='function'))throw Error('exact-object-plan-pins-required');
 const cfg={Firestore:store.Firestore,expectedProjectId:store.expectedProjectId,expectedDatabaseId:store.expectedDatabaseId,claim:JSON.parse(c(store.claim)),clock,mutationEnabled:mutationsEnabled};
 const gh={fetch:github.fetch,resolveSecret:github.resolveSecret,secretReference:github.secretReference,branch:github.branch},vc={fetch:vercel.fetch,resolveSecret:vercel.resolveSecret,secretReference:vercel.secretReference},dc={fetch:drive.fetch,resolveSecret:drive.resolveSecret,secretReference:drive.secretReference,folderId:drive.folderId,ownerPermissionId:drive.ownerPermissionId,loadApproval:drive.loadApproval};
 createReleaseQa({plan:{...qaTemplate,deploymentId:'dpl_Validation',previewHostname:'validation.vercel.app'},vercel:vc,read,clock,networkEnabled:false});
 const manifestSha256=sha(c(qaTemplate.artifacts));
 const previewIdentity={repository:'Satnam-Satoshi/Satoshi-Langar',repositoryId:1181242402,projectId:qaTemplate.projectId,projectName,teamId:qaTemplate.teamId,branch:CANDIDATE_BRANCH,sourceCommit:pins.candidateCommit,manifestSha256};
 const identity={sourceCommit:pins.candidateCommit,projectId:qaTemplate.projectId,manifestSha256,configurationSha256:sha(c({pins,qaTemplate,projectName,hookPolicySha256,archiveFolderId:dc.folderId,archiveOwnerPermissionId:dc.ownerPermissionId,objectPlanSha256:preparedObjects?.identity.planSha256??null}))};
 let busy=false;
 async function run(readOnly){if(!networkEnabled||!readOnly&&!mutationsEnabled)return held('release-orchestration-disabled');if(busy)return held('release-orchestration-busy');busy=true;try{
  const phase=createFirestoreReleasePhase({...cfg,identity,mutationEnabled:mutationsEnabled&&!readOnly});let frozen=await phase.read();
  if(!frozen){if(readOnly)return held('no-frozen-preview-qa');
   if(preparedObjects){const journal=createFirestoreGitObjectJournal({...cfg,identity:preparedObjects.identity});const objects=await createGitHubCandidateObjects({plan:preparedObjects.plan,github:gh,claim:cfg.claim,journal,loadApproval:loadObjectApproval,clock,networkEnabled:true,mutationsEnabled:true}).advance();if(objects.status==='candidate-object-provider-observed')return {status:'candidate-object-prepared-progress',cursor:objects.cursor,publicationVerified:false,promotionAllowed:false,previewRequested:false};if(objects.status!=='candidate-objects-provider-observed')return held('candidate-objects-pending-or-unverified-no-retry');}
   const refIdentity={repository:previewIdentity.repository,branch:CANDIDATE_BRANCH,pins},refJournal=createFirestoreCandidateRefJournal({...cfg,identity:refIdentity,hookPolicySha256});
   const ref=await createGitHubCandidateRef({github:gh,pins,claim:cfg.claim,journal:refJournal,loadApproval:loadRefApproval,clock,networkEnabled:true,refUpdateEnabled:true}).advance();if(ref.status!=='candidate-ref-observed')return held('candidate-ref-not-observed');
   const previewJournal=createFirestoreVercelJournal({...cfg,mode:'preview',identity:previewIdentity});
   const preview=await createVercelRelease({...vc,...previewIdentity,journal:previewJournal,loadApproval:loadPreviewApproval,loadSourceAdmission,clock,networkEnabled:true,previewEnabled:true}).advancePreview();
   if(preview.status!=='preview-deployment-observed'||preview.readyState!=='READY')return held('preview-not-ready-or-unknown-no-retry');
   const observed=await createVercelReadOnly({...vc,projectId:qaTemplate.projectId,teamId:qaTemplate.teamId,expectedBranch:CANDIDATE_BRANCH,readEnabled:true}).getDeployment({deploymentId:preview.deploymentId,expectedCommit:pins.candidateCommit});
   if(observed.status!=='deployment-observed'||observed.target!==null||observed.readyState!=='READY'||!observed.deploymentHostname)return held('preview-provider-identity-unverified');
   const plan={...qaTemplate,deploymentId:observed.deploymentId,previewHostname:observed.deploymentHostname};
   const proof=await createReleaseQa({plan,vercel:vc,read,clock,networkEnabled:true}).verifyPreview();
   if(proof.status!=='preview-qa-verified'||proof.fresh!==true||proof.manifestSha256!==manifestSha256||proof.planSha256!==sha(c(plan)))return held('preview-qa-not-verified');
   if(!await phase.freeze(c(proof)))return held('preview-qa-freeze-conflict');frozen=await phase.read();
  }
  const proof=JSON.parse(frozen.proofJson);if(proof.sourceCommit!==identity.sourceCommit||proof.projectId!==identity.projectId||proof.manifestSha256!==manifestSha256||proof.expectedBaselineDeploymentId!==qaTemplate.expectedBaselineDeploymentId)return held('frozen-proof-crossbinding');
  // Recover only provider-generated host/ID from the frozen actual QA, never caller callback.
  const hostname=proof.domainObservations?.[0]?.domain,plan={...qaTemplate,deploymentId:proof.candidateDeploymentId,previewHostname:hostname};
  if(proof.domainObservations?.length!==1||typeof hostname!=='string'||!hostname.endsWith('.vercel.app')||proof.planSha256!==sha(c(plan)))return held('frozen-plan-crossbinding');
  const archive=createQaProofArchive({store:{Firestore:cfg.Firestore,expectedProjectId:cfg.expectedProjectId,expectedDatabaseId:cfg.expectedDatabaseId,claim:cfg.claim},drive:dc,binding:{phase:'preview',projectId:identity.projectId,sourceCommit:identity.sourceCommit,candidateDeploymentId:proof.candidateDeploymentId,planSha256:proof.planSha256,manifestSha256},proofJson:frozen.proofJson,clock,networkEnabled:true,mutationsEnabled:mutationsEnabled&&!readOnly});
  const archived=readOnly||frozen.version===2?await archive.readback():await archive.advance();if(archived.status!=='qa-proof-archived')return held('qa-archive-unverified-no-retry');
  if(archived.receipt.sha256!==sha(frozen.proofJson)||archived.receipt.bytes!==Buffer.byteLength(frozen.proofJson)||frozen.receipt&&c(frozen.receipt)!==c(archived.receipt))return held('qa-archive-exact-receipt-mismatch');
  if(frozen.version===1&&!readOnly){if(!await phase.archive(frozen.proofJson,archived.receipt))return held('qa-archive-phase-conflict');}
  const finishedAt=clock(),finished=instant(finishedAt),archiveAt=instant(archived.checkedAt),proofAt=instant(proof.checkedAt),expiry=instant(proof.expiresAt);if(![finished,archiveAt,proofAt,expiry].every(Number.isFinite)||finished<archiveAt||finished<proofAt||typeof archived.fresh!=='boolean')return held('final-archive-clock-invalid-or-backward');
  return {status:readOnly?'preview-qa-archive-readback':'preview-qa-archived',sourceCommit:identity.sourceCommit,deploymentId:proof.candidateDeploymentId,manifestSha256,qaProofSha256:archived.receipt.sha256,qaProofBytes:archived.receipt.bytes,proofFresh:archived.fresh===true&&finished<expiry,publicationVerified:false,promotionAllowed:false,promotionHoldReason:'final-prepromotion-qa-archive-and-promotion-phase-not-composed',privateArchiveReadbackVerified:true,atomic:false,worm:false};
 }catch{return held('release-orchestration-failed-no-retry');}finally{busy=false;}}
 return Object.freeze({advance:()=>run(false),reconcile:()=>run(true),promote:async()=>held('final-prepromotion-qa-archive-not-composed')});
}
