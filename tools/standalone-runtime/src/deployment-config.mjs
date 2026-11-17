/** Pure dormant configuration boundary. Never reads env, constructs clients or activates work. */
import {createHash} from 'node:crypto';
import {dailyEditionEvent} from './schedule-monitor.mjs';
const fail=code=>Object.assign(new Error(code),{code});
const hash=s=>createHash('sha256').update(s).digest('hex');
const hex=(s,n=64)=>typeof s==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(s);
const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===keys;
const clone=v=>{let n=0;const walk=(x,d=0)=>{if(++n>500||d>8)throw fail('configuration-bound');if(x===null||typeof x==='boolean'||Number.isSafeInteger(x))return x;if(typeof x==='string'&&x.length<=1000)return x;if(x&&Object.getPrototypeOf(x)===Object.prototype){const descriptors=Object.getOwnPropertyDescriptors(x);if(Object.getOwnPropertySymbols(x).length||Object.keys(descriptors).length!==Object.keys(x).length||Object.values(descriptors).some(p=>p.get||p.set)||Object.keys(x).some(k=>['__proto__','prototype','constructor'].includes(k)))throw fail('plain-configuration-required');return Object.fromEntries(Object.keys(x).sort().map(k=>[k,walk(x[k],d+1)]));}throw fail('plain-configuration-required');};return walk(v);};
const canonical=v=>JSON.stringify(clone(v));
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const DEPLOYMENT_STORE_CONTRACT=freeze({
 control:{path:'newsroomControl/standalone-v1',generation:'standalone-v1'},
 scheduler:{path:'newsroomPrivateScheduleV1/inventory',generation:'standalone-schedule-store-v1'},
 effects:{path:'newsroomPrivateEffectInventoryV1/root',generation:'standalone-effect-inventory-v1'},
 preparation:{path:'newsroomPrivatePreparationV1/inventory',generation:'standalone-preparation-v1'},
 preparationWork:{path:'newsroomPrivatePreparationWorkV1',generation:'standalone-preparation-work-v1'},
 consumer:{path:'newsroomPrivateConsumerV1/inventory',generation:'standalone-consumer-v1'},
 canonicalHistory:{path:'newsroomPrivateCanonicalEditionsV1',generation:'standalone-canonical-edition-v1'},
 scheduleEffects:{path:'newsroomPrivateScheduleEffectsV1',generation:'standalone-schedule-effect-v1'},
 cloudRunEffects:{path:'newsroomPrivateCloudRunEffectsV1',generation:'standalone-cloud-run-journal-v1'},
 brevoEffects:{path:'newsroomPrivateBrevoAlertsV1',generation:'standalone-brevo-alert-journal-v1'},
 consumerInbox:{path:'newsroomPrivateConsumerInboxV1',generation:'standalone-consumer-inbox-v1'},
 releaseOutbox:{path:'newsroomStandaloneOutboxV1',generation:'standalone-outbox-v1'},
 uploadInventory:{path:'newsroomPrivateUploadInventoryV1/root',generation:'standalone-upload-inventory-v1'},
 artifactBundleInventory:{path:'newsroomPrivateArtifactBundlesV1/inventory',generation:'standalone-artifact-bundles-v1'},
 artifactBundles:{path:'newsroomPrivateArtifactBundleV1',generation:'standalone-artifact-bundle-v1'},
 uploadJournal:{path:'newsroomPrivateUploadJournalV1',generation:'standalone-upload-journal-v1'},
 candidateRefInventory:{path:'newsroomPrivateCandidateRefsV1/inventory',generation:'standalone-candidate-ref-inventory-v1'},
 candidateRefIntents:{path:'newsroomPrivateCandidateRefIntentsV1',generation:'standalone-candidate-ref-intent-v1'},
 gitObjectInventory:{path:'newsroomPrivateGitObjectsV1/inventory',generation:'standalone-git-object-inventory-v1'},
 gitObjectPlans:{path:'newsroomPrivateGitObjectPlansV1',generation:'standalone-git-object-plan-v1'},
 vercelPreviewInventory:{path:'newsroomPrivateVercelPreviewsV1/inventory',generation:'standalone-vercel-preview-inventory-v1'},
 vercelPreviewIntents:{path:'newsroomPrivateVercelPreviewIntentsV1',generation:'standalone-vercel-preview-intent-v1'},
 vercelPromotionInventory:{path:'newsroomPrivateVercelPromotionsV1/inventory',generation:'standalone-vercel-promotion-inventory-v1'},
 vercelPromotionIntents:{path:'newsroomPrivateVercelPromotionIntentsV1',generation:'standalone-vercel-promotion-intent-v1'},
 releaseQaInventory:{path:'newsroomPrivateReleaseQaV1/inventory',generation:'standalone-release-qa-v1'},
 releaseQaProofs:{path:'newsroomPrivateReleaseQaProofsV1',generation:'standalone-release-qa-proof-v1'},
});
const FLAG_NAMES='alerts|dispatch|mutations|network|producer|promotion|publication|render';
const SECRET_NAMES='brevo|drive|github|vercel';
/** Digest helper is not a signature, approval, migration proof or service observation. */
export const deploymentConfigSha256=config=>hash(canonical(config));
export function deploymentConfigTemplate(){return {
 schemaVersion:1,mode:'dormant-only',projectId:null,region:null,jobName:null,expectedEtag:null,
 databaseId:'(default)',source:{repository:'Satnam-Satoshi/Satoshi-Langar',branch:null,commit:null},
 image:{uri:null,sha256:null},stores:structuredClone(DEPLOYMENT_STORE_CONTRACT),
 secretReferences:{brevo:null,drive:null,github:null,vercel:null},
 prerequisites:{ownerReviewSha256:null,canonicalMigrationSha256:null,inventoryMigrationSha256:null,approvalPolicySha256:null},
 effects:{alerts:false,dispatch:false,mutations:false,network:false,producer:false,promotion:false,publication:false,render:false},
 };}
export function validateDeploymentConfig({config:input,reviewedPins:inputPins}={}){
 const c=clone(input),pins=clone(inputPins);
 if(!exact(c,'databaseId|effects|expectedEtag|image|jobName|mode|prerequisites|projectId|region|schemaVersion|secretReferences|source|stores')||c.schemaVersion!==1||c.mode!=='dormant-only'||typeof c.projectId!=='string'||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(c.projectId)||typeof c.region!=='string'||!/^[a-z]+(?:-[a-z]+)+[0-9]$/.test(c.region)||typeof c.databaseId!=='string'||!(c.databaseId==='(default)'||/^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(c.databaseId))||typeof c.jobName!=='string'||!new RegExp(`^projects/${c.projectId}/locations/${c.region}/jobs/[a-z][a-z0-9-]{0,61}[a-z0-9]$`).test(c.jobName)||typeof c.expectedEtag!=='string'||!c.expectedEtag||c.expectedEtag.length>200||/[\x00-\x20\x7f]/.test(c.expectedEtag))throw fail('fixed-deployment-identity-required');
 if(!exact(c.source,'branch|commit|repository')||c.source.repository!=='Satnam-Satoshi/Satoshi-Langar'||typeof c.source.branch!=='string'||!/^agent\/[a-z0-9][a-z0-9/_-]{0,150}$/.test(c.source.branch)||c.source.branch.includes('//')||!hex(c.source.commit,40))throw fail('exact-reviewed-source-required');
 if(!exact(c.image,'sha256|uri')||!hex(c.image.sha256)||typeof c.image.uri!=='string'||!new RegExp(`^${c.region}-docker\\.pkg\\.dev/${c.projectId}/[a-z][a-z0-9_-]{0,62}/[a-z][a-z0-9_/-]{0,150}@sha256:${c.image.sha256}$`).test(c.image.uri)||c.image.uri.includes('//')||c.image.uri.split('/').some(p=>p==='.'||p==='..'))throw fail('immutable-reviewed-image-required');
 if(canonical(c.stores)!==canonical(DEPLOYMENT_STORE_CONTRACT))throw fail('fixed-store-generations-required');
 if(!exact(c.effects,FLAG_NAMES)||Object.values(c.effects).some(v=>v!==false))throw fail('dormant-effects-required');
 if(!exact(c.secretReferences,SECRET_NAMES))throw fail('named-secret-references-only');
 for(const value of Object.values(c.secretReferences))if(value!==null&&(typeof value!=='string'||!new RegExp(`^projects/${c.projectId}/secrets/[A-Za-z][A-Za-z0-9_-]{0,100}/versions/[1-9][0-9]{0,9}$`).test(value)))throw fail('version-pinned-secret-reference-required');
 if(!exact(c.prerequisites,'approvalPolicySha256|canonicalMigrationSha256|inventoryMigrationSha256|ownerReviewSha256')||Object.values(c.prerequisites).some(v=>!hex(v)))throw fail('reviewed-prerequisite-digests-required');
 const configSha256=deploymentConfigSha256(c);
 if(!exact(pins,'configSha256|imageSha256|jobName|projectId|region|sourceCommit')||pins.configSha256!==configSha256||pins.imageSha256!==c.image.sha256||pins.jobName!==c.jobName||pins.projectId!==c.projectId||pins.region!==c.region||pins.sourceCommit!==c.source.commit)throw fail('independent-reviewed-pins-required');
 return freeze({status:'validated-dormant-configuration',config:c,configSha256,authorizationVerified:false,migrationVerified:false,serviceIdentityVerified:false,effectsEnabled:false});
}
/** Explicit disabled worker request contract. This does not invoke any worker/SDK.
 * No callback, process/env fallback, CLI override, secret value or approval boolean. */
export function prepareDisabledWorkerEntry({config,reviewedPins,request}={}){
 const validated=validateDeploymentConfig({config,reviewedPins});const r=clone(request);
 if(!exact(r,'configSha256|event|operation')||r.operation!=='prepare-daily'||r.configSha256!==validated.configSha256)throw fail('fixed-worker-request-required');
 const event=dailyEditionEvent(r.event?.editionDate);if(canonical(r.event)!==canonical(event))throw fail('canonical-daily-event-required');
 return freeze({status:'deployment-disabled',reason:'reviewed-runtime-and-live-prerequisites-required',operation:r.operation,event,configSha256:validated.configSha256,sourceCommit:validated.config.source.commit,imageSha256:validated.config.image.sha256,jobName:validated.config.jobName,effects:[],dispatchPerformed:false,publicationVerified:false,authorizationVerified:false,prerequisiteDigests:validated.config.prerequisites});
}
