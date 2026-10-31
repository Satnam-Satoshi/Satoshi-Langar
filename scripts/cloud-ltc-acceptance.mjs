import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmod, cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectReleaseArtifacts } from './cloud-ltc-artifacts.mjs';
import { packageArtifactEvidence, preallocateEvidenceIds, createDriveEvidenceProvider, downloadEvidence, restoreArtifactEvidence } from './cloud-ltc-evidence.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { ReleaseOperationCoordinator } from './cloud-ltc-operations.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
import { createReadOnlyReleaseClients } from './cloud-ltc-reconcile.mjs';
import { createVercelReleaseProviders, assertVercelDeploymentIdentity, assertVercelProjectPolicy } from './cloud-ltc-release-providers.mjs';
import { TARGET, builtManifest, builtOutputManifest, verifyImplementation, verifyProtectedCandidate, verifyPublicDomains, cleanEnvironment, withVercelAuth, pathsFor, safeFailure } from './cloud-ltc-release.mjs';

const acceptanceFailureCodes = new Set(['acceptance_artifact_binding_changed', 'acceptance_artifacts_incomplete', 'acceptance_build_output_changed', 'acceptance_completion_invalid', 'acceptance_configuration_changed', 'acceptance_context_required', 'acceptance_deliberate_crash', 'acceptance_download_unknown', 'acceptance_durable_state_required', 'acceptance_effect_forbidden', 'acceptance_executable_missing', 'acceptance_file_ids_invalid', 'acceptance_initialized_ledger_required', 'acceptance_invalid_crash_boundary', 'acceptance_ledger_not_idle', 'acceptance_origin_still_running', 'acceptance_package_changed', 'acceptance_previous_manifest_changed', 'acceptance_previous_manifest_required', 'acceptance_promotion_forbidden', 'acceptance_public_pointer_changed', 'acceptance_recovery_context_missing', 'acceptance_recovery_fence_required', 'acceptance_recovery_unknown', 'acceptance_restored_artifact_mismatch', 'acceptance_social_ledger_invalid', 'acceptance_social_not_paused', 'acceptance_source_changed', 'acceptance_source_not_clean', 'acceptance_stage_unconfirmed', 'acceptance_static_incomplete', 'acceptance_static_output_mismatch', 'acceptance_wrong_ledger']);
export function safeAcceptanceFailure(error) {
  return acceptanceFailureCodes.has(error?.message) ? error.message : safeFailure(error);
}
const check = (condition, code) => { if (!condition) throw Error(code); };
export const acceptanceHash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const terminal = intent => ['confirmed', 'not-applied'].includes(intent.status);
const prefixFor = plan => `accept-${acceptanceHash(plan).slice(0, 24)}`;
const manifestFor = (files, scope) => files.filter(file => file.path.startsWith(scope + '/')).map(file => ({ file: file.path.slice(scope.length + 1), sha256: acceptanceHash(file.bytes) })).sort((a, b) => a.file.localeCompare(b.file));

// Acceptance-only atomic pause/lease transitions avoid a killed process leaving
// an unpaused ledger without a fence. All operational intent/proof transitions
// still use DurableCloudState and its coordinator unchanged.
async function acceptanceTransition(state, transform) {
  check(state.key === 'website', 'acceptance_wrong_ledger');
  const snapshot = await state.adapter.read('website');
  check(snapshot.value, 'acceptance_initialized_ledger_required');
  const document = await new DurableCloudState({ read: async () => snapshot }, 'website').inspect();
  const result = transform(document);
  await new DurableCloudState({ read: async () => ({ value: document }) }, 'website').inspect();
  await state.adapter.conditionalWrite('website', document, snapshot.version);
  return result;
}
function closeAcceptance(state, lease, { plan, env, mode, outcome, fullRestoreVerified, publicBaselineVerified }) {
  assertAcceptanceContext(plan, env, { recovery: mode === 'stage-only-recovery' });
  check(['stage-only', 'stage-only-recovery'].includes(mode) && ['stage-verified', 'incomplete-no-resume'].includes(outcome) && typeof fullRestoreVerified === 'boolean' && typeof publicBaselineVerified === 'boolean', 'acceptance_completion_invalid');
  return acceptanceTransition(state, document => {
    check(document.lease?.runId === lease.runId && document.lease.fence === lease.fence && Object.values(document.intents).every(terminal), 'acceptance_recovery_unknown');
    persistedAcceptancePlan(document, lease.fence, acceptanceHash(plan));
    const origin = /^accept-([1-9]\d*)-([1-9]\d*)$/.exec(lease.runId); check(origin, 'acceptance_completion_invalid');
    const intents = Object.values(document.intents).filter(intent => intent.fence === lease.fence).sort((a, b) => a.operationId.localeCompare(b.operationId));
    const stage = intents.find(intent => intent.operationId === `${prefixFor(plan)}-stage`);
    check(outcome !== 'stage-verified' || (fullRestoreVerified && publicBaselineVerified && stage?.status === 'confirmed'), 'acceptance_completion_invalid');
    const verification = { fullRestoreVerified, publicBaselineVerified, publicUnchangedVerified: publicBaselineVerified, protectedStageVerified: outcome === 'stage-verified', artifactPackageManifestSha256: plan.artifactPackageManifestSha256, sourceManifestSha256: plan.sourceManifestSha256, staticManifestSha256: plan.staticManifestSha256, buildOutputSha256: plan.buildOutputSha256, previousPublicManifestSha256: plan.previousPublicManifestSha256 };
    const completion = { schemaVersion: 1, outcome, planSha256: acceptanceHash(plan), source: plan.source, implementationSha256: plan.implementationSha256, controllerImplementationSha256: env.LTC_ACCEPTED_IMPLEMENTATION_SHA256, fence: lease.fence,
      origin: { runId: origin[1], attempt: origin[2] }, completedBy: { runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, mode },
      terminalProofSha256: acceptanceHash(intents.map(intent => ({ operationId: intent.operationId, payloadSha256: intent.payloadSha256, status: intent.status, evidenceSha256: intent.evidenceSha256, receiptSha256: document.receipts[intent.operationId].sha256 }))),
      verification, verificationSha256: acceptanceHash(verification) };
    const completionSha256 = acceptanceHash(completion);
    document.acceptance.status = 'completed'; document.acceptance.completion = completion; document.acceptance.completionSha256 = completionSha256;
    document.lease = null; document.paused = true;
    return completionSha256;
  });
}

function validatePlan(plan) {
  check(plan?.schemaVersion === 1 && plan.kind === 'ltc-stage-only-acceptance' && /^[a-z0-9][a-z0-9_-]{0,47}$/.test(plan.acceptanceId ?? '') && /^[a-f0-9]{40}$/.test(plan.source ?? '') &&
    ['implementationSha256', 'sourceManifestSha256', 'staticManifestSha256', 'buildOutputSha256', 'artifactPackageManifestSha256', 'previousPublicManifestSha256'].every(key => digest(plan[key])) &&
    /^\d{4}-\d{2}-\d{2}-r[1-9]\d*$/.test(plan.editionId ?? '') && /^dpl_[A-Za-z0-9]+$/.test(plan.previousDeployment ?? '') &&
    plan.repository === TARGET.repository && plan.project === TARGET.project && plan.team === TARGET.team && JSON.stringify(plan.domains) === JSON.stringify(TARGET.domains) &&
    Number.isInteger(plan.bundleCount) && plan.bundleCount > 0 && plan.bundleCount <= 64 && Array.isArray(plan.executablePaths) &&
    plan.executablePaths.every(file => /^(source|build-output)\//.test(file) && !file.split('/').some(part => !part || part === '.' || part === '..') && !file.includes('\\')) &&
    ['folderId', 'websiteDocumentId', 'socialDocumentId', 'ownerPermissionId'].every(key => /^[A-Za-z0-9_-]{10,160}$/.test(plan[key] ?? '')) &&
    plan.websiteDocumentId !== plan.socialDocumentId && ![plan.websiteDocumentId, plan.socialDocumentId].includes(plan.folderId), 'invalid_acceptance_plan');
}

function assertProtectedContext(env) {
  check(env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_REPOSITORY === TARGET.repository &&
    env.LTC_ACCEPTANCE_ENVIRONMENT === 'ltc-production' && env.LTC_ACCEPTANCE_MANUAL === 'true' && env.LTC_CLOUD_PUBLISH === 'false' &&
    digest(env.LTC_ACCEPTANCE_PLAN_SHA256) && digest(env.LTC_ACCEPTED_IMPLEMENTATION_SHA256) &&
    /^[1-9]\d*$/.test(env.GITHUB_RUN_ID ?? '') && /^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'acceptance_context_required');
}
export function assertAcceptanceContext(plan, env, { recovery = false } = {}) {
  validatePlan(plan); assertProtectedContext(env);
  check(env.LTC_ACCEPTANCE_PLAN_SHA256 === acceptanceHash(plan) && (recovery || env.LTC_ACCEPTED_IMPLEMENTATION_SHA256 === plan.implementationSha256) && env.LTC_ACCEPTANCE_SOURCE_COMMIT === plan.source, 'acceptance_context_required');
}
export async function verifyRecoveryController({ env, root = process.cwd(), verify = verifyImplementation }) {
  assertProtectedContext(env);
  await verify(root, env.LTC_ACCEPTED_IMPLEMENTATION_SHA256);
}
export function persistedAcceptancePlan(document, expectedFence, expectedHash) {
  const record = document.acceptance;
  check(document.lease?.fence === expectedFence && record?.fence === expectedFence && record.runId === document.lease.runId && record.planSha256 === expectedHash && acceptanceHash(record.plan) === expectedHash, 'acceptance_recovery_context_missing');
  validatePlan(record.plan); return record.plan;
}

// Offline preparation only. The private output must be reviewed/pinned before any effect.
export async function prepareStageAcceptance({ root, evidenceDirectory, editionId, acceptanceId, previousDeployment, previousManifest, implementationSha256, stateConfig, socialStateConfig, evidenceConfig }) {
  check(git(root, ['status', '--porcelain', '--untracked-files=normal']) === '', 'acceptance_source_not_clean');
  await verifyImplementation(root, implementationSha256);
  check(stateConfig.ledgerKey === undefined || stateConfig.ledgerKey === 'website', 'acceptance_wrong_ledger');
  check(socialStateConfig.ledgerKey === 'social' && stateConfig.folderId === socialStateConfig.folderId && stateConfig.folderId === evidenceConfig.folderId, 'acceptance_wrong_ledger');
  const files = await collectReleaseArtifacts({ root, staticDirectory: path.join(root, 'dist'), outputDirectory: path.join(root, '.vercel/output'), evidenceDirectory });
  check(Array.isArray(previousManifest) && previousManifest.length > 0 && previousManifest.length <= 8192 && new Set(previousManifest.map(record => record.file)).size === previousManifest.length && previousManifest.every(record => /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(record.file ?? '') && !record.file.split('/').some(part => part === '.' || part === '..') && digest(record.sha256)), 'acceptance_previous_manifest_required');
  files.push({ path: 'evidence/acceptance-previous-manifest.json', bytes: Buffer.from(JSON.stringify(previousManifest)) });
  const packed = packageArtifactEvidence(files);
  check(['source', 'static', 'build-output', 'evidence'].every(scope => packed.manifest.scopes[scope] > 0), 'acceptance_artifacts_incomplete');
  const staticManifest = await builtManifest(path.join(root, 'dist'));
  check(pathsFor(editionId).every(file => staticManifest.some(record => record.file === file)), 'acceptance_static_incomplete');
  check(acceptanceHash(staticManifest) === acceptanceHash(await builtManifest(path.join(root, '.vercel/output/static'))), 'acceptance_static_output_mismatch');
  const plan = { schemaVersion: 1, kind: 'ltc-stage-only-acceptance', acceptanceId, repository: TARGET.repository, project: TARGET.project, team: TARGET.team, domains: [...TARGET.domains],
    source: git(root, ['rev-parse', 'HEAD']), implementationSha256, editionId, previousDeployment,
    sourceManifestSha256: acceptanceHash(manifestFor(files, 'source')), staticManifestSha256: acceptanceHash(staticManifest), previousPublicManifestSha256: acceptanceHash(previousManifest),
    buildOutputSha256: acceptanceHash(await builtOutputManifest(path.join(root, '.vercel/output'))), artifactPackageManifestSha256: packed.manifestSha256, bundleCount: packed.bundles.length,
    executablePaths: files.filter(file => file.mode === 'executable' && /^(source|build-output)\//.test(file.path)).map(file => file.path).sort(),
    folderId: evidenceConfig.folderId, websiteDocumentId: stateConfig.documentId, socialDocumentId: socialStateConfig.documentId, ownerPermissionId: evidenceConfig.ownerPermissionId };
  validatePlan(plan); return { plan, packed, previousManifest };
}

async function controls(plan, dependencies) {
  const { socialState, vercel } = dependencies;
  const social = await socialState.inspect(); check(social.paused === true && !social.lease && !Object.values(social.records ?? {}).some(record => ['create-uncertain', 'schedule-uncertain'].includes(record.status)), 'acceptance_social_not_paused');
  assertVercelProjectPolicy(await vercel(`/v9/projects/${TARGET.project}`), TARGET);
  for (const domain of TARGET.domains) {
    const deployment = await vercel(`/v13/deployments/${new URL(domain).hostname}`);
    assertVercelDeploymentIdentity(deployment, TARGET); check(deployment.id === plan.previousDeployment, 'acceptance_public_pointer_changed');
  }
}

async function restorePackage(plan, operations, dependencies) {
  const bundles = [];
  for (const operation of operations) {
    const p = operation.payload;
    const downloaded = await dependencies.download({ ...p, length: p.bytes, operationId: operation.operationId, payloadSha256: acceptanceHash(p) });
    check(downloaded?.bundle, 'acceptance_download_unknown'); bundles.push(downloaded.bundle);
  }
  const destination = path.join(dependencies.directory, `restored-${acceptanceHash(plan).slice(0, 24)}`);
  const restored = await restoreArtifactEvidence(bundles, { directory: destination, expectedManifestSha256: plan.artifactPackageManifestSha256 });
  check(['source', 'static', 'build-output', 'evidence'].every(scope => restored.scopes[scope] > 0), 'acceptance_artifacts_incomplete');
  const source = await builtManifest(path.join(destination, 'source'));
  const manifest = await builtManifest(path.join(destination, 'static'));
  check(acceptanceHash(source) === plan.sourceManifestSha256 && acceptanceHash(manifest) === plan.staticManifestSha256 &&
    acceptanceHash(await builtOutputManifest(path.join(destination, 'build-output'))) === plan.buildOutputSha256 &&
    acceptanceHash(await builtManifest(path.join(destination, 'build-output/static'))) === plan.staticManifestSha256, 'acceptance_restored_artifact_mismatch');
  const previousManifest = JSON.parse(await readFile(path.join(destination, 'evidence/acceptance-previous-manifest.json'), 'utf8'));
  check(acceptanceHash(previousManifest) === plan.previousPublicManifestSha256, 'acceptance_previous_manifest_changed');
  for (const file of plan.executablePaths) { check(source.some(record => `source/${record.file}` === file) || (file.startsWith('build-output/') && (await builtManifest(path.join(destination, 'build-output'))).some(record => `build-output/${record.file}` === file)), 'acceptance_executable_missing'); await chmod(path.join(destination, file), 0o700); }
  const workspace = path.join(destination, 'source');
  await mkdir(path.join(workspace, '.vercel'), { recursive: true, mode: 0o700 });
  await cp(path.join(destination, 'build-output'), path.join(workspace, '.vercel/output'), { recursive: true, errorOnExist: true, force: false });
  await writeFile(path.join(workspace, '.vercel/project.json'), JSON.stringify({ projectId: TARGET.project, orgId: TARGET.team }), { flag: 'wx', mode: 0o600 });
  return { workspace, manifest, previousManifest, restored };
}

function stageOperation(plan, dependencies, manifest, workspace) {
  const payload = { kind: 'vercel-stage', acceptancePlanSha256: acceptanceHash(plan), editionId: plan.editionId, artifactPackageManifestSha256: plan.artifactPackageManifestSha256, commit: plan.source, buildOutputSha256: plan.buildOutputSha256, artifactManifestSha256: plan.staticManifestSha256 };
  const providers = createVercelReleaseProviders({ target: TARGET, vercel: dependencies.vercel,
    cli: args => { check(workspace && args[0] === 'deploy' && args.includes('--skip-domain'), 'acceptance_effect_forbidden'); return dependencies.cli(args, workspace); },
    beforeMutation: async () => { await controls(plan, dependencies); check(acceptanceHash(await builtOutputManifest(path.join(workspace, '.vercel/output'))) === plan.buildOutputSha256, 'acceptance_build_output_changed'); },
    verifyProtected: deployment => dependencies.verifyProtected(deployment, plan.editionId, manifest),
    verifyPublic: async () => { throw Error('acceptance_promotion_forbidden'); } });
  return { operationId: `${prefixFor(plan)}-stage`, payload, provider: providers.stage(payload) };
}

function afterEffect(provider, operationId, crashAfter, crashBoundary) {
  return { readback: context => provider.readback(context), apply: async context => { await provider.apply(context); if (crashAfter === operationId || crashAfter === 'first-effect') { if (crashBoundary) await crashBoundary(); throw Error('acceptance_deliberate_crash'); } } };
}

// No production runner call, Git write, alias change, promotion or rollback exists here.
export async function runStageAcceptance({ plan, packed, previousManifest, env, state, dependencies, crashAfter = null }) {
  assertAcceptanceContext(plan, env); check(state instanceof DurableCloudState, 'acceptance_durable_state_required');
  check(packed?.manifestSha256 === plan.artifactPackageManifestSha256 && acceptanceHash(JSON.stringify(packed.manifest) + '\n') === plan.artifactPackageManifestSha256 && packed.bundles.length === plan.bundleCount, 'acceptance_package_changed');
  const currentManifest = packed.manifest.files.filter(file => file.path.startsWith('static/')).map(file => ({ file: file.path.slice(7), sha256: file.sha256 })).sort((a, b) => a.file.localeCompare(b.file));
  check(acceptanceHash(currentManifest) === plan.staticManifestSha256, 'acceptance_package_changed');
  check(acceptanceHash(previousManifest) === plan.previousPublicManifestSha256, 'acceptance_previous_manifest_changed');
  check(crashAfter === null || crashAfter === 'first-effect' || crashAfter === `${prefixFor(plan)}-stage`, 'acceptance_invalid_crash_boundary');
  const initial = await state.inspect();
  check(initial.paused === true && !initial.restoreHold && !initial.lease && Object.values(initial.intents).every(terminal) && !Object.keys(initial.intents).some(id => id.startsWith(prefixFor(plan))), 'acceptance_ledger_not_idle');
  await controls(plan, dependencies); await dependencies.verifySource(); await dependencies.verifyPublic(previousManifest);
  // Once admitted, failures deliberately retain the fence; no catch/finally clears uncertainty.
  const lease = await acceptanceTransition(state, document => {
    check(document.paused && !document.restoreHold && !document.lease && Object.values(document.intents).every(terminal) && !Object.keys(document.intents).some(id => id.startsWith(prefixFor(plan))), 'acceptance_ledger_not_idle');
    document.paused = false; document.lease = { runId: `accept-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`, fence: ++document.fence, expiresAt: Date.now() + 3_600_000 };
    document.acceptance = { schemaVersion: 1, plan, planSha256: acceptanceHash(plan), runId: document.lease.runId, fence: document.lease.fence, status: 'admitted' }; return structuredClone(document.lease);
  });
  const coordinator = new ReleaseOperationCoordinator({ state, lease });
  await dependencies.save({ mode: 'stage-only', planSha256: acceptanceHash(plan), lease, status: 'admitted' });
  const ids = await dependencies.preallocate(plan.bundleCount);
  check(ids.length === plan.bundleCount && new Set(ids).size === ids.length, 'acceptance_file_ids_invalid');
  const operations = packed.bundles.map((bundle, index) => ({ operationId: `${prefixFor(plan)}-e${index}`, payload: { kind: 'drive-evidence', role: 'acceptance-artifacts', acceptancePlanSha256: acceptanceHash(plan), artifactPackageManifestSha256: plan.artifactPackageManifestSha256, artifactBundleCount: plan.bundleCount, artifactBundleIndex: index, fileId: ids[index], folderId: plan.folderId, sha256: bundle.sha256, bytes: bundle.length }, bundle }));
  // Persist EVERY ID/payload, including the planned stage, before the first upload.
  for (const operation of operations) await state.intend(lease, operation.operationId, acceptanceHash(operation.payload), operation.payload);
  const plannedStage = stageOperation(plan, dependencies, [], null);
  await state.intend(lease, plannedStage.operationId, acceptanceHash(plannedStage.payload), plannedStage.payload);
  for (const operation of operations) {
    await controls(plan, dependencies); await state.renew(lease, 3_600_000);
    const provider = dependencies.evidenceProvider(operation.bundle, operation.payload.fileId);
    await coordinator.execute({ ...operation, provider: afterEffect(provider, operation.operationId, crashAfter, dependencies.crashBoundary) });
  }
  const restored = await restorePackage(plan, operations, dependencies);
  await controls(plan, dependencies);
  const stage = stageOperation(plan, dependencies, restored.manifest, restored.workspace);
  await state.renew(lease, 3_600_000);
  const receipt = await coordinator.execute({ ...stage, provider: afterEffect(stage.provider, stage.operationId, crashAfter, dependencies.crashBoundary) });
  check(receipt.status === 'confirmed', 'acceptance_stage_unconfirmed');
  await controls(plan, dependencies); await dependencies.verifyPublic(restored.previousManifest);
  const completionSha256 = await closeAcceptance(state, lease, { plan, env, mode: 'stage-only', outcome: 'stage-verified', fullRestoreVerified: true, publicBaselineVerified: true });
  const result = { mode: 'stage-only', status: 'stage-verified', planSha256: acceptanceHash(plan), completionSha256, publicationEnabled: false, aliasesChanged: false, restored: restored.restored, stage: receipt, leaseReleased: true, websitePaused: true };
  await dependencies.save(result); return result;
}

// Explicit second job only: read remote proofs and write terminal ledger receipts.
// It never calls apply, creates an upload, stages a deployment or resumes remaining steps.
export async function recoverStageAcceptance({ plan, env, state, dependencies, expectedFence }) {
  assertAcceptanceContext(plan, env, { recovery: true }); check(state instanceof DurableCloudState, 'acceptance_durable_state_required');
  let document = await state.inspect(); const lease = document.lease;
  const origin = /^accept-([1-9]\d*)-([1-9]\d*)$/.exec(lease?.runId ?? '');
  check(origin && lease.fence === expectedFence && origin[1] !== env.GITHUB_RUN_ID, 'acceptance_recovery_fence_required');
  check(acceptanceHash(persistedAcceptancePlan(document, expectedFence, acceptanceHash(plan))) === acceptanceHash(plan), 'acceptance_recovery_context_missing');
  const run = await dependencies.github(`/actions/runs/${origin[1]}/attempts/${origin[2]}`);
  check(run.id === Number(origin[1]) && run.run_attempt === Number(origin[2]) && run.status === 'completed' && run.event === 'workflow_dispatch' && run.head_branch === 'main' && run.repository?.full_name === TARGET.repository && run.path === '.github/workflows/ltc-daily-publication.yml', 'acceptance_origin_still_running');
  const intents = Object.values(document.intents).filter(intent => intent.fence === lease.fence);
  check(intents.every(intent => intent.runId === lease.runId && intent.operationId.startsWith(prefixFor(plan)) && intent.payload?.acceptancePlanSha256 === acceptanceHash(plan) && acceptanceHash(intent.payload) === intent.payloadSha256 && ['drive-evidence', 'vercel-stage'].includes(intent.payload.kind)), 'acceptance_recovery_context_missing');
  await controls(plan, dependencies); await state.setPaused(true);
  const coordinator = new ReleaseOperationCoordinator({ state, lease });
  if (intents.every(intent => intent.status === 'pending')) {
    for (const intent of intents) { const proof = { kind: 'never-authorized', operationId: intent.operationId, fence: lease.fence, payloadSha256: intent.payloadSha256 }; await state.reconcile(intent.operationId, 'not-applied', acceptanceHash(proof), proof); }
    const completionSha256 = await closeAcceptance(state, lease, { plan, env, mode: 'stage-only-recovery', outcome: 'incomplete-no-resume', fullRestoreVerified: false, publicBaselineVerified: false });
    const result = { mode: 'stage-only-recovery', status: 'incomplete-no-resume', planSha256: acceptanceHash(plan), completionSha256, publicationEnabled: false, effectsReissued: false, websitePaused: true, leaseReleased: true };
    await dependencies.save(result); return result;
  }
  const evidence = intents.filter(intent => intent.payload.kind === 'drive-evidence').sort((a, b) => a.payload.artifactBundleIndex - b.payload.artifactBundleIndex);
  check(evidence.length === plan.bundleCount && evidence.every((intent, index) => intent.payload.artifactBundleIndex === index && intent.payload.artifactBundleCount === plan.bundleCount && intent.payload.folderId === plan.folderId && intent.payload.artifactPackageManifestSha256 === plan.artifactPackageManifestSha256) && new Set(evidence.map(intent => intent.payload.fileId)).size === evidence.length, 'acceptance_recovery_context_missing');
  for (const intent of evidence) {
    if (intent.status === 'uncertain') await coordinator.reconcile({ ...intent, provider: { readback: async context => { const p = context.payload; const result = await dependencies.download({ ...p, length: p.bytes, operationId: context.operationId, payloadSha256: context.payloadSha256 }); return { ...context, status: result?.proof ? 'applied' : 'unknown', proof: result?.proof ?? {} }; } } });
    else if (intent.status === 'pending') { const proof = { kind: 'never-authorized', operationId: intent.operationId, fence: lease.fence, payloadSha256: intent.payloadSha256 }; await state.reconcile(intent.operationId, 'not-applied', acceptanceHash(proof), proof); }
  }
  document = await state.inspect();
  const stages = intents.filter(intent => intent.payload.kind === 'vercel-stage'); check(stages.length === 1, 'acceptance_recovery_context_missing');
  const stage = stages[0];
  check(acceptanceHash(stage.payload) === acceptanceHash(stageOperation(plan, dependencies, [], null).payload), 'acceptance_recovery_context_missing');
  let restored;
  if (evidence.every(intent => document.intents[intent.operationId].status === 'confirmed')) restored = await restorePackage(plan, evidence, dependencies);
  if (stage.status === 'uncertain') { check(restored, 'acceptance_recovery_context_missing'); await coordinator.reconcile({ ...stageOperation(plan, dependencies, restored.manifest, null) }); }
  else if (stage.status === 'confirmed') {
    check(restored, 'acceptance_recovery_context_missing'); const operation = stageOperation(plan, dependencies, restored.manifest, null);
    const proof = await operation.provider.readback({ operationId: operation.operationId, payload: operation.payload, payloadSha256: acceptanceHash(operation.payload) });
    check(proof.status === 'applied' && proof.operationId === operation.operationId && proof.payloadSha256 === acceptanceHash(operation.payload), 'acceptance_recovery_unknown');
  }
  else if (stage.status === 'pending') { const proof = { kind: 'never-authorized', operationId: stage.operationId, fence: lease.fence, payloadSha256: stage.payloadSha256 }; await state.reconcile(stage.operationId, 'not-applied', acceptanceHash(proof), proof); }
  await controls(plan, dependencies); if (restored) await dependencies.verifyPublic(restored.previousManifest);
  document = await state.inspect(); check(Object.values(document.intents).every(terminal), 'acceptance_recovery_unknown');
  const outcome = document.intents[stage.operationId].status === 'confirmed' && restored ? 'stage-verified' : 'incomplete-no-resume';
  const completionSha256 = await closeAcceptance(state, lease, { plan, env, mode: 'stage-only-recovery', outcome, fullRestoreVerified: Boolean(restored), publicBaselineVerified: Boolean(restored) });
  const result = { mode: 'stage-only-recovery', status: outcome, planSha256: acceptanceHash(plan), completionSha256, publicationEnabled: false, effectsReissued: false, websitePaused: true, leaseReleased: true };
  await dependencies.save(result); return result;
}

function argumentsFor(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 2) { const key = { '--mode': 'mode', '--root': 'root', '--evidence-dir': 'evidenceDirectory', '--plan': 'planFile', '--state-config': 'stateConfig', '--social-state-config': 'socialStateConfig', '--evidence-config': 'evidenceConfig', '--receipt': 'receipt', '--edition-id': 'editionId', '--acceptance-id': 'acceptanceId', '--previous-deployment': 'previousDeployment', '--previous-manifest': 'previousManifestFile', '--expected-fence': 'expectedFence', '--crash-after': 'crashAfter' }[args[i]]; check(key && !result[key] && args[i + 1] && !args[i + 1].startsWith('--'), 'invalid_acceptance_arguments'); result[key] = args[i + 1]; }
  check(['plan', 'stage', 'recover'].includes(result.mode) && ['stateConfig', 'socialStateConfig', 'evidenceConfig', 'receipt'].every(key => result[key]), 'invalid_acceptance_arguments');
  check(result.mode === 'recover' ? /^[1-9]\d*$/.test(result.expectedFence ?? '') && !result.root && !result.crashAfter : result.root && result.evidenceDirectory && result.previousManifestFile && (result.mode === 'plan' ? result.editionId && result.previousDeployment && result.acceptanceId : result.planFile), 'invalid_acceptance_arguments');
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = argumentsFor(process.argv.slice(2)), env = process.env;
    // Authenticate the current recovery controller before even reading private
    // configs/ledger. Original plan implementation remains separately bound.
    if (options.mode === 'recover') await verifyRecoveryController({ env });
    const json = async file => JSON.parse(await readFile(path.resolve(file), 'utf8'));
    const stateConfig = await json(options.stateConfig), socialStateConfig = await json(options.socialStateConfig), evidenceConfig = await json(options.evidenceConfig);
    let plan = options.planFile ? await json(options.planFile) : null, prepared, website;
    if (options.mode === 'recover' && !plan) {
      assertProtectedContext(env); website = await createGoogleStateRuntime({ config: stateConfig });
      plan = persistedAcceptancePlan(await new DurableCloudState(website.stateAdapter, 'website').inspect(), Number(options.expectedFence), env.LTC_ACCEPTANCE_PLAN_SHA256);
    }
    if (options.mode !== 'recover') prepared = await prepareStageAcceptance({ ...options, root: path.resolve(options.root), evidenceDirectory: path.resolve(options.evidenceDirectory), previousManifest: await json(options.previousManifestFile), acceptanceId: plan?.acceptanceId ?? options.acceptanceId, editionId: plan?.editionId ?? options.editionId, previousDeployment: plan?.previousDeployment ?? options.previousDeployment, implementationSha256: env.LTC_ACCEPTED_IMPLEMENTATION_SHA256, stateConfig, socialStateConfig, evidenceConfig });
    if (options.mode === 'plan') { await writeFile(options.receipt, JSON.stringify(prepared.plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ mode: 'offline-plan', planSha256: acceptanceHash(prepared.plan), publicationEnabled: false })); }
    else {
      assertAcceptanceContext(plan, env, { recovery: options.mode === 'recover' });
      check(!prepared || acceptanceHash(prepared.plan) === acceptanceHash(plan), 'acceptance_artifact_binding_changed');
      check(stateConfig.documentId === plan.websiteDocumentId && (stateConfig.ledgerKey ?? 'website') === 'website' && socialStateConfig.documentId === plan.socialDocumentId && socialStateConfig.ledgerKey === 'social' && [stateConfig.folderId, socialStateConfig.folderId, evidenceConfig.folderId].every(id => id === plan.folderId) && evidenceConfig.ownerPermissionId === plan.ownerPermissionId, 'acceptance_configuration_changed');
      website ??= await createGoogleStateRuntime({ config: stateConfig }); const social = await createGoogleStateRuntime({ config: socialStateConfig });
      const state = new DurableCloudState(website.stateAdapter, 'website');
      const directory = await mkdtemp(path.join(tmpdir(), 'ltc-stage-acceptance-'));
      // Record scratch location before the first state/evidence mutation. Private, exclusive receipt.
      await writeFile(options.receipt, JSON.stringify({ mode: options.mode, planSha256: acceptanceHash(plan), directory, status: 'starting' }) + '\n', { flag: 'wx', mode: 0o600 });
      const clients = createReadOnlyReleaseClients({ env });
      const token = () => withGoogleCloudAuthorization({ env }, access => access.LTC_GOOGLE_ACCESS_TOKEN);
      const cliPath = env.LTC_VERCEL_CLI || 'vercel', cliVersion = env.LTC_VERCEL_CLI_VERSION;
      check(/^\d+\.\d+\.\d+$/.test(cliVersion ?? ''), 'pinned_cli_version_required');
      const installed = execFileSync(cliPath, ['--version'], { encoding: 'utf8', env: cleanEnvironment(env), stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      check([cliVersion, `Vercel CLI ${cliVersion}`].includes(installed), 'pinned_cli_version_mismatch');
      const execute = (args, cwd) => execFileSync(cliPath, withVercelAuth(args, env.VERCEL_TOKEN), { cwd, env: cleanEnvironment(env), stdio: ['ignore', 'pipe', 'pipe'], timeout: 900_000, maxBuffer: 32 * 1024 * 1024 });
      const dependencies = { ...clients, directory,
        crashBoundary: () => process.kill(process.pid, 'SIGKILL'),
        socialState: { inspect: async () => { const { value } = await social.stateAdapter.read('social'); check(value?.schemaVersion === 1 && value.kind === 'ltc-cloud-social' && value.records && typeof value.records === 'object' && !Array.isArray(value.records), 'acceptance_social_ledger_invalid'); return value; } },
        verifySource: async () => { check(git(options.root, ['rev-parse', 'HEAD']) === plan.source && git(options.root, ['status', '--porcelain', '--untracked-files=normal']) === '', 'acceptance_source_changed'); await verifyImplementation(options.root, plan.implementationSha256); },
        preallocate: count => preallocateEvidenceIds({ count, config: evidenceConfig, getAccessToken: token }),
        evidenceProvider: (bundle, fileId) => createDriveEvidenceProvider({ bundle, config: { ...evidenceConfig, fileId }, getAccessToken: token }),
        download: receipt => downloadEvidence(receipt, { config: { ...evidenceConfig, fileId: receipt.fileId }, getAccessToken: token }),
        cli: execute, verifyProtected: (deployment, editionId, manifest) => verifyProtectedCandidate(deployment.id, editionId, manifest, args => execute(args, directory)),
        verifyPublic: verifyPublicDomains,
        save: result => writeFile(options.receipt, JSON.stringify({ ...result, directory }, null, 2) + '\n', { mode: 0o600 }),
      };
      const result = options.mode === 'stage' ? await runStageAcceptance({ plan, packed: prepared.packed, previousManifest: prepared.previousManifest, env, state, dependencies, crashAfter: options.crashAfter ?? null }) : await recoverStageAcceptance({ plan, env, state, dependencies, expectedFence: Number(options.expectedFence) });
      console.log(JSON.stringify({ mode: result.mode, status: result.status, publicationEnabled: false, leaseReleased: result.leaseReleased }));
    }
  } catch (error) { console.error(`stage_acceptance_withheld_or_requires_recovery: ${safeAcceptanceFailure(error)}`); process.exitCode = 1; }
}
