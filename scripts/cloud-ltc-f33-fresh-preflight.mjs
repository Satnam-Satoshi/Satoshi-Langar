import {f33Digest,proposeF33FreshAdmission,assertF33Transition} from './cloud-ltc-f33-fresh-admission.mjs';
import {verifyFinishedF33Receipt} from './cloud-ltc-f33-fresh-activation.mjs';
import {assertReviewedMigrationAcceptance} from './cloud-ltc-migration-gate.mjs';
import {assertFreshGenerationAdmission} from './cloud-ltc-generation.mjs';
import {assertDailyPublicationAvailable,publicationDate} from './cloud-ltc-daily-admission.mjs';
import {validateDocument} from './cloud-ltc-state.mjs';
import {assertControls} from './cloud-ltc-release.mjs';
const check=(v,c)=>{if(!v)throw Error('f33_preflight_'+c);};
// Credential-free real-bundle preflight. Caller passes exact downloaded ledger,
// finished receipt, proposed protected config and reviewed source policy. No I/O,
// writes, API credentials or synthetic replacement of historical evidence.
export function preflightFreshPublication({snapshot,receipt,admission,migration,policy,env,now}) {
 check(f33Digest(migration)===env.LTC_MIGRATION_ACCEPTANCE_SHA256&&
  admission.implementationSha256===env.LTC_ACCEPTED_IMPLEMENTATION_SHA256,'configuration');
 verifyFinishedF33Receipt(receipt,snapshot,admission);
 const candidate=proposeF33FreshAdmission(snapshot,admission);validateDocument(candidate);
 assertF33Transition(snapshot,candidate,admission,{now});
 assertControls({policy,cloudValue:'true',remoteHead:admission.sourceCommit,expectedHead:admission.sourceCommit});
 assertReviewedMigrationAcceptance({document:candidate,configuration:migration,currentControllerImplementationSha256:env.LTC_ACCEPTED_IMPLEMENTATION_SHA256});
 assertFreshGenerationAdmission(candidate,{env,now});
 assertDailyPublicationAvailable(candidate,publicationDate(now));
 return Object.freeze({status:'offline-fresh-publication-preflight-passed',publicationPerformed:false,providerCalls:0,
  snapshotSha256:f33Digest(snapshot),admissionSha256:f33Digest(admission),nextFence:candidate.fence+1});
}
