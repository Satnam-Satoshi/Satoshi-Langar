import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { recoverUploadOnlyLease, uploadRecoveryHash as hash } from './cloud-ltc-upload-only-recovery.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
import { downloadEvidence } from './cloud-ltc-evidence.mjs';
import { createReadOnlyReleaseClients } from './cloud-ltc-reconcile.mjs';
import { TARGET, verifyImplementation, verifyPublicRootRouting, verifyPublicManifestRecord } from './cloud-ltc-release.mjs';
import { assertVercelProjectPolicy, assertVercelDeploymentIdentity } from './cloud-ltc-release-providers.mjs';
import { loadPreviousReleaseManifest } from './cloud-ltc-production.mjs';

const check = (v, code) => { if (!v) throw Error(code); };
const stamp = () => new Date().toISOString();
const workflowPath = '.github/workflows/ltc-daily-publication.yml';

// Read-only provider seams. No upload, dispatch, deploy, alias or gate setters.
export function createUploadRecoveryDependencies({env, review, state, evidenceConfig, root, writerEvidenceFile, fetchImpl = fetch}) {
  check(evidenceConfig.folderId === review.folderId && evidenceConfig.ownerPermissionId === review.ownerPermissionId,
    'upload_recovery_private_binding_changed');
  const clients = createReadOnlyReleaseClients({env, fetcher:fetchImpl});
  const token = () => withGoogleCloudAuthorization({env,fetchImpl}, a => a.LTC_GOOGLE_ACCESS_TOKEN);
  return {
    now: Date.now,
    async readOrigin(origin) {
      const run = await clients.github(`/actions/runs/${origin.runId}/attempts/${origin.attempt}`);
      check(run.repository?.full_name === TARGET.repository, 'upload_recovery_origin_changed');
      return {...run, repository:run.repository.full_name, observedAt:stamp()};
    },
    async verifyStoppedWriters() {
      await verifyImplementation(root, review.controllerImplementationSha256);
      check(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim() === review.sourceHead,
        'upload_recovery_controller_changed');
      const source = JSON.parse(await readFile(path.join(root,'config/ltc-cloud-source.json'),'utf8'));
      check(source.repository === TARGET.repository && source.branch === env.LTC_SOURCE_BRANCH,
        'upload_recovery_source_changed');
      const ref = await clients.github(`/git/ref/heads/${source.branch}`);
      const main = await clients.github('/git/ref/heads/main');
      const file = await clients.github(`/contents/config/ltc-publication.json?ref=${review.sourceHead}`);
      check(file.encoding === 'base64', 'upload_recovery_policy_unavailable');
      const policy = JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));
      check(ref.object?.sha === review.sourceHead && main.object?.sha === review.operatorWorkflowHead &&
        hash(policy) === review.sourcePolicySha256, 'upload_recovery_source_changed');
      // Read the actual repository switch, not a possibly stale job environment.
      const gate = await clients.github('/actions/variables/LTC_CLOUD_PUBLISH');
      check(gate.name === 'LTC_CLOUD_PUBLISH' && gate.value === 'false', 'upload_recovery_gate_open');
      const active = [];
      for (const status of ['queued','in_progress','waiting','requested','pending']) {
        const page = await clients.github(`/actions/runs?status=${status}&per_page=100`);
        check(Number.isInteger(page.total_count) && page.total_count <= 100 && Array.isArray(page.workflow_runs) &&
          page.workflow_runs.length === page.total_count, 'upload_recovery_writer_inventory_incomplete');
        for (const run of page.workflow_runs) {
          if (run.path !== workflowPath) continue;
          if (String(run.id) === env.GITHUB_RUN_ID && String(run.run_attempt) === env.GITHUB_RUN_ATTEMPT) continue;
          active.push(run.id);
        }
      }
      check(active.length === 0, 'upload_recovery_other_writer_active');
      // A fresh, separately recorded local-writer shutdown observation is
      // required. A powered-off laptop or historical cutover is not evidence.
      const local = JSON.parse(await readFile(writerEvidenceFile,'utf8'));
      const observed = Date.parse(local.observedAt);
      check(hash(local) === review.writerEvidenceSha256 && local.repository === TARGET.repository &&
        local.kind === 'verified-local-website-writer-stop' && local.disabled === true &&
        local.activeWriterCount === 0 && Number.isFinite(observed) && observed <= Date.now() &&
        Date.now()-observed <= 300000, 'upload_recovery_local_writer_proof_required');
      return {observedAt:stamp(), repository:TARGET.repository, sourceHead:ref.object.sha,
        sourcePolicySha256:hash(policy), cloudPublicationEnabled:false, localPublisherDisabled:true,
        otherWritersStopped:true, writerEvidenceSha256:hash(local)};
    },
    async verifyPublicBaseline(latest) {
      const project = await clients.vercel(`/v9/projects/${TARGET.project}`);
      assertVercelProjectPolicy(project,TARGET);
      check(!project.rollingRelease, 'upload_recovery_public_policy_changed');
      const manifest = await loadPreviousReleaseManifest({state,evidenceConfig,env,fetchImpl});
      check(hash(manifest) === latest.artifactManifestSha256, 'upload_recovery_public_manifest_changed');
      const domains = [];
      for (const domain of TARGET.domains) {
        const verifyPointer = async () => {
          const deployment = await clients.vercel(`/v13/deployments/${new URL(domain).hostname}`);
          assertVercelDeploymentIdentity(deployment,TARGET);
          check(deployment.id === latest.deployment && deployment.meta?.ltcSourceCommit === latest.source &&
            deployment.readyState === 'READY' && deployment.target === 'production', 'upload_recovery_public_changed');
        };
        await verifyPointer();
        await verifyPublicRootRouting(domain,manifest,{fetchImpl});
        for (const record of manifest) await verifyPublicManifestRecord(domain,record,manifest,{fetchImpl});
        await verifyPointer();
        domains.push({domain,deployment:latest.deployment,allManifestBytesVerified:true,verifiedCount:manifest.length});
      }
      return {observedAt:stamp(),artifactManifestSha256:hash(manifest),manifestCount:manifest.length,domains};
    },
    async verifyConfirmedUpload(row) {
      const p=row.payload;
      const result=await downloadEvidence({operationId:row.operationId,payloadSha256:row.payloadSha256,
        fileId:p.fileId,folderId:p.folderId,sha256:p.sha256,length:p.bytes},
        {config:{...evidenceConfig,fileId:p.fileId},getAccessToken:token,fetcher:fetchImpl});
      check(result?.proof,'upload_recovery_confirmed_readback_unavailable');
      return {observedAt:stamp(),operationId:row.operationId,payloadSha256:row.payloadSha256,...result.proof};
    },
  };
}

export async function runUploadRecovery(options, env=process.env) {
  // No credentials are read before code and review acceptance.
  await verifyImplementation(options.root ?? process.cwd(),env.LTC_ACCEPTED_IMPLEMENTATION_SHA256);
  const readJSON=async file=>JSON.parse(await readFile(file,'utf8'));
  const review=await readJSON(options.review);
  check(hash(review) === env.LTC_UPLOAD_ONLY_RECOVERY_REVIEW_SHA256 &&
    review.controllerImplementationSha256 === env.LTC_ACCEPTED_IMPLEMENTATION_SHA256 &&
    review.operatorWorkflowHead === env.GITHUB_SHA && env.GITHUB_REPOSITORY === TARGET.repository &&
    env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_ACTOR_ID === '268053325' &&
    env.LTC_CLOUD_PUBLISH === 'false', 'upload_recovery_protected_review_required');
  const config=await readJSON(options.stateConfig), evidenceConfig=await readJSON(options.evidenceConfig);
  check(config.documentId === review.websiteDocumentId && config.folderId === review.folderId &&
    (config.ledgerKey ?? 'website') === 'website', 'upload_recovery_private_binding_changed');
  // Reserve the independent receipt before any possible state mutation.
  await writeFile(options.receipt,JSON.stringify({status:'started',reviewSha256:hash(review)})+'\n',{flag:'wx',mode:0o600});
  const runtime=await createGoogleStateRuntime({config,env});
  const state=new DurableCloudState(runtime.stateAdapter,'website');
  const result=await recoverUploadOnlyLease({state,review,expectedReviewSha256:env.LTC_UPLOAD_ONLY_RECOVERY_REVIEW_SHA256,
    dependencies:createUploadRecoveryDependencies({env,review,state,evidenceConfig,root:options.root ?? process.cwd(),writerEvidenceFile:options.writerEvidence})});
  await writeFile(options.receipt,JSON.stringify(result)+'\n',{mode:0o600});
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  Promise.resolve().then(async()=>{
    const options={};
    for(let n=2;n<process.argv.length;n+=2) {
      const key={'--review-file':'review','--state-config':'stateConfig','--evidence-config':'evidenceConfig',
        '--writer-evidence':'writerEvidence','--receipt':'receipt'}[process.argv[n]];
      check(key && !options[key] && process.argv[n+1], 'upload_recovery_arguments_required');
      options[key]=path.resolve(process.argv[n+1]);
    }
    check(Object.keys(options).length===5 && new Set(Object.values(options)).size===5,'upload_recovery_arguments_required');
    const result=await runUploadRecovery(options);
    console.log(JSON.stringify({status:result.status,publicationPerformed:false,effectsReissued:false}));
  }).catch(()=>{console.error('upload_recovery_withheld_or_uncertain; inspect private receipt before any retry');process.exitCode=1;});
}
