import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { TARGET, acceptedSourceConfig, controls, cleanEnvironment, verifyImplementation, verifyPublicDomains, readReviewedMigrationConfiguration, requireDurableAdapter, safeFailure } from './cloud-ltc-release.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
import { createReadOnlyReleaseClients } from './cloud-ltc-reconcile.mjs';
import { downloadEvidence, createDriveEvidenceProvider, preallocateEvidenceIds } from './cloud-ltc-evidence.mjs';
import { createAcceptanceLinkedClient, ACCEPTANCE_PROJECT_NAME } from './cloud-ltc-acceptance.mjs';
import { createDurableVercelCommand } from './cloud-ltc-promotion-runtime.mjs';
import { assertVercelProjectPolicy, assertVercelDeploymentIdentity } from './cloud-ltc-release-providers.mjs';
import { assertReviewedMigrationAcceptance } from './cloud-ltc-migration-gate.mjs';
import { loadPreviousReleaseManifest } from './cloud-ltc-production.mjs';
import { validateSoftwareApiReadback } from './lib/ltc-software-release.mjs';
import { extractRecoveryManifests, planSoftwareReviewEvidence, assembleSoftwareReviewEvidence } from './lib/ltc-recovery-manifest.mjs';
import { validateSoftwareStageRecoveryReview, softwareRecoveryHash as hash } from './cloud-ltc-software-stage-recovery-policy.mjs';
import { continueReviewedSoftwareStage } from './cloud-ltc-software-stage-recovery.mjs';

const check = (ok, code) => { if (!ok) throw Error(code); };
const same = (a, b) => hash(a) === hash(b);
const APIs = Object.freeze(['market-prices', 'litecoin-chain', 'litecoin-register', 'morpho-markets']);
const protectedCodes = new Set(['acceptance_cli_failed', 'acceptance_protected_read_binding_failed', 'invalid_candidate_manifest',
  'candidate_identity_failed', 'invalid_protected_http_response', 'unexpected_artifact_status', 'reviewed_redirect_changed',
  'redirect_target_missing_from_manifest', 'deployed_artifact_mismatch', 'software_api_invalid', 'protected_manifest_check_failed']);
const protectedFailureCode = error => protectedCodes.has(error?.message) ? error.message : 'software_recovery_details_withheld';
const git = (root, args) => execFileSync('git', args, { cwd: root, env: cleanEnvironment(process.env), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
const json = async file => { const bytes = await readFile(file); check(bytes.length <= 65536, 'software_recovery_configuration_too_large'); return JSON.parse(bytes.toString('utf8')); };

/** Selectively restores only manifest metadata and the original software review.
 * Every read uses a receipt already present in the exact reviewed snapshot.
 * No build, Git write, artifact materialization or upload occurs here. */
export async function restoreSoftwareStageContext({ review, document, evidenceConfig, token, fetchImpl = fetch,
  download = downloadEvidence, previousManifest, changedPaths }) {
  check(hash(document) === review.snapshotSha256, 'software_recovery_snapshot_changed');
  check(evidenceConfig.folderId === review.bindings.folderId && evidenceConfig.ownerPermissionId === review.bindings.ownerPermissionId, 'software_recovery_private_config_changed');
  const rows = Object.values(document.intents).filter(row => row.fence === review.origin.fence && row.payload?.kind === 'drive-evidence');
  rows.sort((a, b) => a.payload.artifactBundleIndex - b.payload.artifactBundleIndex);
  check(rows.length === review.artifactPartCount && new Set(rows.map(row => row.payload.fileId)).size === rows.length, 'software_recovery_archive_changed');
  for (const [index, row] of rows.entries()) {
    const p = row.payload, proof = row.proof, receipt = document.receipts[row.operationId];
    check(document.intents[row.operationId] === row && row.status === 'confirmed' && row.runId === `software-${review.origin.runId}-${review.origin.attempt}` &&
      p.role === 'release-artifacts' && p.artifactBundleIndex === index && p.artifactBundleCount === rows.length && p.folderId === evidenceConfig.folderId &&
      p.artifactPackageManifestSha256 === review.artifactPackageManifestSha256 && hash(p) === row.payloadSha256 && proof?.status === 'applied' &&
      proof.operationId === row.operationId && proof.payloadSha256 === row.payloadSha256 && hash(proof) === row.evidenceSha256 &&
      receipt?.sha256 === hash(row) && same(receipt.receipt, row) && proof.proof?.ownerOnly === true && proof.proof.downloadVerified === true &&
      proof.proof.ownerPermissionId === evidenceConfig.ownerPermissionId && proof.proof.fileId === p.fileId && proof.proof.folderId === p.folderId &&
      proof.proof.sha256 === p.sha256 && proof.proof.length === p.bytes, 'software_recovery_archive_changed');
  }
  const get = async index => {
    const row = rows[index]; check(row, 'software_recovery_archive_changed');
    const p = row.payload;
    const result = await download({ ...p, length: p.bytes, operationId: row.operationId, payloadSha256: row.payloadSha256 },
      { config: { ...evidenceConfig, fileId: p.fileId }, getAccessToken: token, fetcher: fetchImpl });
    check(result?.bundle && result.bundle.sha256 === p.sha256, 'software_recovery_download_unknown');
    return result.bundle;
  };
  const pins = { artifactPackageManifestSha256: review.artifactPackageManifestSha256, staticManifestSha256: review.artifactManifestSha256, buildOutputSha256: review.buildOutputSha256 };
  const zero = await get(0), metadata = extractRecoveryManifests(zero, pins);
  check(metadata.archiveBundleCount === rows.length, 'software_recovery_archive_changed');
  const plan = planSoftwareReviewEvidence(zero, pins), downloads = [];
  for (const index of plan.downloadBundleIndexes) downloads.push({ index, bundle: await get(index), expectedSha256: rows[index].payload.sha256 });
  const restored = assembleSoftwareReviewEvidence(zero, downloads, pins);
  check(hash(restored.originalReview) === review.originalReviewSha256 && hash(restored.originalContext) === review.originalContextSha256 &&
    hash(previousManifest) === document.latestRelease.artifactManifestSha256, 'software_recovery_restored_context_changed');
  return { originalReview: restored.originalReview, originalContext: restored.originalContext, manifest: metadata.manifest,
    buildOutput: metadata.buildOutput, changedPaths, previousManifest };
}

/** Proves the existing candidate, never stages another deployment. */
export async function verifySoftwareStageCandidate({ review, stage, manifest, buildOutput, vercel, linked, save = async () => {} }) {
  check(stage?.operationId === review.stageOperationId && stage.payload?.kind === 'vercel-stage' &&
    hash(stage.payload) === stage.payloadSha256 && stage.payload.commit === review.artifactSource &&
    stage.payload.artifactPackageManifestSha256 === review.artifactPackageManifestSha256 &&
    stage.payload.artifactManifestSha256 === review.artifactManifestSha256 && stage.payload.buildOutputSha256 === review.buildOutputSha256 &&
    hash(manifest) === review.artifactManifestSha256 && hash(buildOutput) === review.buildOutputSha256, 'software_recovery_candidate_changed');
  const validate = deployment => {
    assertVercelDeploymentIdentity(deployment, TARGET);
    check(deployment.id === review.candidateDeployment && deployment.meta?.ltcOperationId === stage.operationId &&
      deployment.meta.ltcPayloadSha256 === stage.payloadSha256 && deployment.meta.ltcSourceCommit === review.artifactSource &&
      deployment.meta.ltcBuildOutputSha256 === review.buildOutputSha256, 'software_recovery_candidate_changed');
    return deployment;
  };
  const uniqueOperation = async () => {
    let until = '', complete = false; const seen = new Set(), matches = [];
    for (let page = 0; page < 10; page++) {
      const listing = await vercel(`/v6/deployments?projectId=${TARGET.project}&target=production&limit=100${until ? `&until=${encodeURIComponent(until)}` : ''}`);
      check(Array.isArray(listing?.deployments) && listing.deployments.length <= 100, 'software_recovery_stage_listing_invalid');
      matches.push(...listing.deployments.filter(item => item?.meta?.ltcOperationId === stage.operationId));
      check(matches.length <= 1, 'software_recovery_stage_not_unique');
      const next = listing.pagination?.next;
      if (next === null || next === undefined) { complete = true; break; }
      check((typeof next === 'string' && /^[0-9]{1,20}$/.test(next) || Number.isSafeInteger(next) && next > 0) && !seen.has(String(next)), 'software_recovery_stage_listing_invalid');
      seen.add(String(next)); until = String(next);
    }
    check(complete && matches.length === 1 && (matches[0].uid ?? matches[0].id) === review.candidateDeployment, 'software_recovery_stage_not_unique');
  };
  await uniqueOperation();
  const candidate = validate(await vercel(`/v13/deployments/${review.candidateDeployment}`));
  const declaration = { id: candidate.id, url: candidate.url };
  // One complete pass. The accepted client's per-record callback supplies only
  // fixed safe metadata and does not add candidate/project GETs for every file.
  await linked.readProtected(declaration, manifest, manifest, async failure => {
    const record = manifest[failure.ordinal - 1];
    if (!record || failure.file !== record.file || failure.expectedSha256 !== record.sha256) return;
    await save({ protectedFailure: { phase: 'protected-manifest', ordinal: failure.ordinal, total: manifest.length,
      file: record.file, expectedSha256: record.sha256, code: protectedFailureCode({ message: failure.code }),
      httpStatus: Number.isInteger(failure.httpStatus) && failure.httpStatus >= 100 && failure.httpStatus <= 599 ? failure.httpStatus : null } });
  });
  for (const name of APIs) {
    try { validateSoftwareApiReadback(await linked.readProtectedApi(declaration, `/api/${name}`)); }
    catch (error) { await save({ protectedFailure: { phase: 'api-handler', route: `/api/${name}`, code: protectedFailureCode(error) } }); throw error; }
  }
  await uniqueOperation();
  check(validate(await vercel(`/v13/deployments/${review.candidateDeployment}`)).url === candidate.url, 'software_recovery_candidate_changed');
  return { kind: 'vercel-stage', deployment: candidate.id, url: candidate.url, source: review.artifactSource,
    buildOutputSha256: review.buildOutputSha256, artifactManifestSha256: review.artifactManifestSha256 };
}

export async function createSoftwareStageRecoveryRuntime({ env, review, configuration, state, evidenceConfig, directory, root, save, fetchImpl = fetch }) {
  const bindings = configuration?.pins?.stagePins?.bindings;
  check(bindings && bindings.websiteDocumentId === review.bindings.websiteDocumentId && bindings.folderId === review.bindings.folderId &&
    bindings.ownerPermissionId === review.bindings.ownerPermissionId && evidenceConfig.folderId === bindings.folderId &&
    evidenceConfig.ownerPermissionId === bindings.ownerPermissionId, 'software_recovery_private_config_changed');
  const clients = createReadOnlyReleaseClients({ env, fetcher: fetchImpl });
  const linked = createAcceptanceLinkedClient({ env, vercel: clients.vercel, directory, report: diagnostic => save({ safeCliFailure: diagnostic }) });
  await linked.verifyVersion();
  const token = () => withGoogleCloudAuthorization({ env, fetchImpl }, access => access.LTC_GOOGLE_ACCESS_TOKEN);
  const accepted = acceptedSourceConfig(await json(path.join(root, 'config/ltc-cloud-source.json')));
  const expectedPolicy = await json(path.join(root, 'config/ltc-publication.json'));
  const verifyProject = async () => {
    const project = await clients.vercel(`/v9/projects/${TARGET.project}`); assertVercelProjectPolicy(project, TARGET);
    check(project.name === ACCEPTANCE_PROJECT_NAME && !project.rollingRelease && Array.isArray(project.crons?.definitions) && project.crons.definitions.length === 0, 'software_recovery_project_changed');
  };
  let restoredContext;
  return { ...clients, now: Date.now, save, evidenceConfig, token, fetchImpl, allocate: preallocateEvidenceIds, providerFactory: createDriveEvidenceProvider,
    async verifyControllerAndPolicy() {
      await verifyImplementation(root, review.controllerImplementationSha256);
      check(git(root, ['rev-parse', 'HEAD']).trim() === review.controllerSource && !git(root, ['status', '--porcelain=v1', '--untracked-files=no']).trim(), 'software_recovery_controller_changed');
      git(root, ['merge-base', '--is-ancestor', review.artifactSource, review.controllerSource]);
      await controls(clients.github, review.controllerSource, accepted);
      const remote = await clients.github(`/contents/config/ltc-publication.json?ref=${encodeURIComponent(accepted.branch)}`);
      check(same(JSON.parse(Buffer.from(remote.content, 'base64')), expectedPolicy), 'software_recovery_source_policy_changed');
      assertReviewedMigrationAcceptance({ document: await state.inspect(), configuration, currentControllerImplementationSha256: review.controllerImplementationSha256 });
      await verifyProject();
    },
    async verifyProjectAndPointers() {
      await verifyProject();
      for (const domain of TARGET.domains) {
        const deployment = await clients.vercel(`/v13/deployments/${new URL(domain).hostname}`); assertVercelDeploymentIdentity(deployment, TARGET);
        check(deployment.id === review.previousDeployment, 'software_recovery_previous_pointer_changed');
      }
    },
    async restore(currentReview, document) {
      check(same(currentReview, review) && hash(document) === review.snapshotSha256, 'software_recovery_snapshot_changed');
      git(root, ['merge-base', '--is-ancestor', document.latestRelease.source, review.artifactSource]);
      const changedPaths = git(root, ['diff', '--no-renames', '--name-only', '-z', document.latestRelease.source, review.artifactSource]).split('\0').filter(Boolean);
      const previousManifest = await loadPreviousReleaseManifest({ state, evidenceConfig, env, fetchImpl });
      restoredContext = await restoreSoftwareStageContext({ review, document, evidenceConfig, token, fetchImpl, previousManifest, changedPaths });
      return restoredContext;
    },
    verifyProtectedCandidate: args => verifySoftwareStageCandidate({ ...args, vercel: clients.vercel, linked, save }),
    async verifyProtected(deployment, manifest) {
      check(restoredContext && deployment.id === review.candidateDeployment && hash(manifest) === review.artifactManifestSha256, 'software_recovery_candidate_changed');
      const stage = (await state.inspect()).intents[review.stageOperationId];
      await verifySoftwareStageCandidate({ review, stage, manifest, buildOutput: restoredContext.buildOutput, vercel: clients.vercel, linked, save });
    },
    verifyPublic: verifyPublicDomains,
    createMutation({ state: ownerState, lease, historicalStage, assertPromotionFreshness }) {
      check(ownerState === state && restoredContext, 'software_recovery_runtime_not_ready');
      const guarded = createDurableVercelCommand({ env, state, lease, vercel: clients.vercel, linked, root: directory, historicalStage, assertPromotionFreshness, fetchImpl });
      return args => { check(Array.isArray(args) && ['promote', 'rollback'].includes(args[0]), 'software_recovery_effect_outside_scope'); return guarded(args); };
    },
  };
}

export function softwareRecoveryArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = { '--review-file': 'review', '--state-config': 'state', '--evidence-config': 'evidence', '--receipt': 'receipt' }[argv[index]];
    check(name && !options[name] && typeof argv[index + 1] === 'string' && argv[index + 1] && !argv[index + 1].startsWith('--'), 'software_recovery_arguments_required');
    options[name] = path.resolve(argv[index + 1]);
  }
  check(['review', 'state', 'evidence', 'receipt'].every(key => options[key]) && new Set(Object.values(options)).size === 4, 'software_recovery_arguments_required');
  return options;
}

const failureCodes = new Set(['software_recovery_arguments_required', 'software_recovery_configuration_too_large', 'software_recovery_snapshot_changed',
  'software_recovery_private_config_changed', 'software_recovery_archive_changed', 'software_recovery_download_unknown', 'software_recovery_restored_context_changed',
  'software_recovery_candidate_changed', 'software_recovery_project_changed', 'software_recovery_controller_changed', 'software_recovery_source_policy_changed',
  'software_recovery_previous_pointer_changed', 'software_recovery_runtime_not_ready', 'software_recovery_effect_outside_scope', 'software_recovery_review_expired',
  'software_recovery_controller_pin_required', 'software_recovery_owner_required', 'software_recovery_claim_readback_changed', 'software_recovery_history_changed',
  'software_recovery_checkpoint_changed', 'software_recovery_checkpoint_readback_changed', 'software_recovery_result_changed']);
for (const code of ['software_recovery_stage_listing_invalid', 'software_recovery_stage_not_unique', 'software_api_invalid',
  'acceptance_cli_failed', 'acceptance_protected_read_binding_failed', 'protected_readback_incomplete', 'protected_artifact_mismatch']) failureCodes.add(code);
export function safeSoftwareRecoveryFailure(error) {
  if (failureCodes.has(error?.message)) return error.message;
  const code = safeFailure(error); return code === 'release_failed_details_withheld' ? 'software_recovery_details_withheld' : code;
}

export function softwareRecoveryFailureReceipt(receipt, error) {
  const claimMayExist = Number.isSafeInteger(receipt.fence) && receipt.fence > 0;
  // The claim status is written before CAS. Even a failed CAS may have an
  // uncertain acknowledgement, so never turn a post-claim failure into a claim
  // that nothing happened. Keep the last phase, including confirmed rollback.
  return { status: claimMayExist ? receipt.status : 'software-recovery-withheld', failurePhase: receipt.status,
    failure: safeSoftwareRecoveryFailure(error), requiresJournalReconciliation: claimMayExist,
    publicationOutcome: receipt.status === 'rolled-back' ? 'rolled-back' : claimMayExist ? 'unconfirmed' : 'not-attempted' };
}

// These pins identify the already validated review, not a successful release.
// In particular, a candidate named in that review is never a deployment receipt.
export function softwareRecoveryInitialReceipt(review) {
  return { mode: 'finite-existing-software-stage-recovery', status: 'starting', published: false, dailyPublished: false,
    artifactRebuilt: false, stageReissued: false, source: review.artifactSource, controllerSource: review.controllerSource,
    artifactManifestSha256: review.artifactManifestSha256, buildOutputSha256: review.buildOutputSha256 };
}

export function softwareRecoverySuccessReceipt(review, result) {
  check(result?.published === true && result.softwarePublished === true && result.dailyPublished === false && result.stageReissued === false &&
    result.releaseCommit === review.artifactSource && result.candidateDeployment === review.candidateDeployment,
  'software_recovery_result_changed');
  return { ...result, source: result.releaseCommit, controllerSource: review.controllerSource, deployment: result.candidateDeployment,
    artifactManifestSha256: review.artifactManifestSha256, buildOutputSha256: review.buildOutputSha256,
    status: 'software-recovery-published', publicationOutcome: 'published', requiresJournalReconciliation: false, artifactRebuilt: false };
}

export async function runSoftwareStageRecovery(options, env = process.env) {
  const root = process.cwd(), review = await json(options.review);
  validateSoftwareStageRecoveryReview({ env, review });
  check(env.GITHUB_WORKFLOW_REF === `${TARGET.repository}/.github/workflows/ltc-software-stage-recovery.yml@refs/heads/main`, 'software_recovery_owner_required');
  await verifyImplementation(root, review.controllerImplementationSha256);
  check(git(root, ['rev-parse', 'HEAD']).trim() === review.controllerSource, 'software_recovery_controller_changed');
  const configuration = readReviewedMigrationConfiguration(env); check(configuration, 'migration_acceptance_pending');
  const config = await json(options.state), evidenceConfig = await json(options.evidence);
  check(config.documentId === review.bindings.websiteDocumentId && config.folderId === review.bindings.folderId && (config.ledgerKey ?? 'website') === 'website', 'software_recovery_private_config_changed');
  const { stateAdapter } = await createGoogleStateRuntime({ config, env }); requireDurableAdapter(stateAdapter);
  const state = new DurableCloudState(stateAdapter, 'website'), directory = await mkdtemp(path.join(tmpdir(), 'ltc-software-recovery-'));
  const receipt = softwareRecoveryInitialReceipt(review);
  await writeFile(options.receipt, JSON.stringify(receipt) + '\n', { flag: 'wx', mode: 0o600 });
  const save = async update => { Object.assign(receipt, update); await writeFile(options.receipt, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 }); };
  try {
    const dependencies = await createSoftwareStageRecoveryRuntime({ env, review, configuration, state, evidenceConfig, directory, root, save });
    const result = await continueReviewedSoftwareStage({ env, state, review, dependencies });
    const confirmed = softwareRecoverySuccessReceipt(review, result); await save(confirmed); return confirmed;
  } catch (error) {
    try { await save(softwareRecoveryFailureReceipt(receipt, error)); } catch { /* Never retry or clear an uncertain effect. */ }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  Promise.resolve().then(() => runSoftwareStageRecovery(softwareRecoveryArguments(process.argv.slice(2))))
    .then(result => console.log(JSON.stringify({ status: result.status, published: result.published, dailyPublished: false, stageReissued: false })))
    .catch(error => { console.error('software_stage_recovery_withheld: ' + safeSoftwareRecoveryFailure(error)); process.exitCode = 1; });
}
