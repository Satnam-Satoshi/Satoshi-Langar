import { readFile, writeFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ReleaseOperationCoordinator } from './cloud-ltc-operations.mjs';
import { prepareGitReleasePlan, createVercelReleaseProviders, executeReleaseOperation, assertVercelDeploymentIdentity } from './cloud-ltc-release-providers.mjs';
import { chunkEvidence, packageEvidence, packageArtifactEvidence, createDriveEvidenceProvider, preallocateEvidenceIds, downloadEvidence } from './cloud-ltc-evidence.mjs';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
import { collectReleaseArtifacts } from './cloud-ltc-artifacts.mjs';
const check = (value, code) => { if (!value) throw new Error(code); };
const hash = value => createHash('sha256').update(value).digest('hex');

export async function selectedEvidenceFiles(directory) {
  const files = [];
  async function visit(relative = '') {
    for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      check(!entry.isSymbolicLink(), 'non_regular_evidence_file');
      if (entry.isDirectory()) await visit(name);
      else { check(entry.isFile() && (await lstat(path.join(directory, name))).isFile(), 'non_regular_evidence_file'); files.push({ path: name, bytes: await readFile(path.join(directory, name)) }); }
    }
  }
  await visit(); return files;
}

// This function is only reachable after the runner's closed acceptance gate.
// Each effect has a separate durable intent; no provider mutation bypasses it.
export async function performCoordinatedRelease(options) {
  const { admission, root, source, changes, editionId, acceptedSource, startedAt, target, github, vercel, cli, controls, verifyProtected, verifyPublic, verifyImplementation, verifyBuildOutput, manifest, buildOutput, rollbackManifest, evidenceDirectory, evidenceConfig, env = process.env, fetchImpl = fetch, saveReceipt } = options;
  check(admission?.state && admission?.lease && Array.isArray(rollbackManifest) && rollbackManifest.length > 0 && rollbackManifest.every(record => typeof record.file === 'string' && /^[a-f0-9]{64}$/.test(record.sha256 ?? '')) && typeof saveReceipt === 'function', 'invalid_production_release_configuration');
  check(evidenceConfig && typeof evidenceConfig.folderId === 'string' && typeof evidenceConfig.ownerPermissionId === 'string' && (!evidenceConfig.fileIds || (Array.isArray(evidenceConfig.fileIds) && new Set(evidenceConfig.fileIds).size === evidenceConfig.fileIds.length)), 'invalid_evidence_configuration');
  const coordinator = new ReleaseOperationCoordinator(admission);
  const operationReceipts = [];
  const execute = async operation => {
    const receipt = await executeReleaseOperation(coordinator, operation);
    operationReceipts.push({ operationId: operation.operationId, payload: operation.payload, ...receipt });
    await saveReceipt({ operationReceipts });
    return receipt;
  };
  const beforeMutation = async commit => {
    await admission.state.renew(admission.lease, 3_600_000);
    await verifyImplementation(); await verifyBuildOutput(); await controls(commit);
  };
  await beforeMutation(source);
  const previous = [];
  for (const domain of target.domains) {
    const deployment = await vercel(`/v13/deployments/${new URL(domain).hostname}`);
    assertVercelDeploymentIdentity(deployment, target);
    previous.push(deployment.id);
  }
  check(new Set(previous).size === 1, 'competing_production_release');
  // Verify archived previous bytes before making any remote changes.
  await verifyPublic(rollbackManifest);
  if (hash(JSON.stringify(rollbackManifest)) === hash(JSON.stringify(manifest))) {
    await admission.state.release(admission.lease);
    return { status: 'already-live', published: false, releaseCommit: source, candidateDeployment: previous[0], operationReceipts: [] };
  }
  const plan = await prepareGitReleasePlan({ root, base: source, changes, editionId, branch: acceptedSource.branch, committedAt: startedAt, github, beforeMutation });
  const sourcePlan = { source, commit: plan.commitSha, startedAt, editionId, operations: plan.steps.map(({ operationId, payload }) => ({ operationId, payload })) };
  await writeFile(path.join(evidenceDirectory, 'source-operation-plan.json'), JSON.stringify(sourcePlan), { flag: 'wx', mode: 0o600 });
  await writeFile(path.join(evidenceDirectory, 'artifact-manifest.json'), JSON.stringify(manifest), { flag: 'wx', mode: 0o600 });
  await writeFile(path.join(evidenceDirectory, 'build-output-manifest.json'), JSON.stringify(buildOutput), { flag: 'wx', mode: 0o600 });
  await writeFile(path.join(evidenceDirectory, 'rollback-manifest.json'), JSON.stringify({ deployment: previous[0], manifest: rollbackManifest }), { flag: 'wx', mode: 0o600 });
  const artifactFiles = await collectReleaseArtifacts({ root, changedFiles: changes.map(change => change.file), staticDirectory: path.join(root, 'dist'), outputDirectory: path.join(root, '.vercel/output'), evidenceDirectory });
  const artifactPackage = packageArtifactEvidence(artifactFiles);
  check(['source', 'static', 'build-output', 'evidence'].every(scope => artifactPackage.manifest.scopes[scope] > 0), 'incomplete_release_artifact_backup');
  const bundles = artifactPackage.bundles;
  const token = () => withGoogleCloudAuthorization({ env, fetchImpl }, access => access.LTC_GOOGLE_ACCESS_TOKEN);
  const existing = await admission.state.inspect();
  const missing = bundles.filter(bundle => !existing.intents[`evidence-${bundle.sha256}`]);
  const allocate = options.preallocateIds ?? preallocateEvidenceIds;
  const allocated = evidenceConfig.fileIds ?? (missing.length ? await allocate({ count: missing.length, config: evidenceConfig, getAccessToken: token, fetcher: fetchImpl }) : []);
  check(allocated.length === missing.length, 'evidence_file_ids_required');
  const providerFactory = options.evidenceProviderFactory ?? createDriveEvidenceProvider;
  let allocatedIndex = 0;
  const evidenceOperations = bundles.map(bundle => {
    const payload = { kind: 'drive-evidence', role: 'release-artifacts', artifactPackageManifestSha256: artifactPackage.manifestSha256, artifactBundleCount: bundles.length, artifactBundleIndex: bundles.indexOf(bundle), fileId: existing.intents[`evidence-${bundle.sha256}`]?.payload?.fileId ?? allocated[allocatedIndex++], folderId: evidenceConfig.folderId, sha256: bundle.sha256, bytes: bundle.length };
    return { operationId: `evidence-${bundle.sha256}`, payload, provider: providerFactory({ bundle, config: { ...evidenceConfig, fileId: payload.fileId }, getAccessToken: token, fetcher: fetchImpl }) };
  });
  // All IDs/hashes are durably saved before the first upload. An uncertain write
  // during this phase produces no external upload and still fails closed.
  for (const operation of evidenceOperations) await admission.state.intend(admission.lease, operation.operationId, hash(JSON.stringify(operation.payload)), operation.payload);
  for (const operation of evidenceOperations) await execute(operation);
  for (const operation of plan.steps) await execute(operation);
  await saveReceipt({ releaseCommit: plan.commitSha, rollbackDeployment: previous[0] });
  const providers = createVercelReleaseProviders({ target, vercel, cli, beforeMutation,
    verifyProtected: async deployment => verifyProtected(deployment),
    verifyPublic: async expected => { check(expected === hash(JSON.stringify(rollbackManifest)), 'rollback_manifest_changed'); await verifyPublic(rollbackManifest); },
  });
  const stage = { operationId: `stage-${editionId}-${hash(JSON.stringify(manifest)).slice(0, 24)}`, payload: { kind: 'vercel-stage', editionId, artifactPackageManifestSha256: artifactPackage.manifestSha256, commit: plan.commitSha, buildOutputSha256: hash(JSON.stringify(buildOutput)), artifactManifestSha256: hash(JSON.stringify(manifest)) } };
  await execute({ ...stage, provider: providers.stage(stage.payload) });
  const candidate = await providers.discoverStage(stage);
  await saveReceipt({ candidateDeployment: candidate.deployment, candidateUrl: `https://${candidate.url}` });
  const payload = { kind: 'vercel-promote', editionId, artifactPackageManifestSha256: artifactPackage.manifestSha256, artifactManifestSha256: hash(JSON.stringify(manifest)), deployment: candidate.deployment, previous: previous[0], commit: plan.commitSha };
  let promotion;
  try {
    promotion = await execute({ operationId: `promote-${hash(candidate.deployment).slice(0, 40)}`, payload, provider: providers.promote(payload) });
    await verifyPublic(manifest);
  } catch (error) {
    // An uncertain promotion is NOT permission to roll back a potentially running
    // request. Rollback only follows positively confirmed promotion + bad bytes.
    if (promotion?.status === 'confirmed') {
      const rollback = { kind: 'vercel-rollback', artifactPackageManifestSha256: artifactPackage.manifestSha256, failed: candidate.deployment, restore: previous[0], commit: plan.commitSha, previousManifestSha256: hash(JSON.stringify(rollbackManifest)) };
      await execute({ operationId: `rollback-${hash(candidate.deployment).slice(0, 40)}`, payload: rollback, provider: providers.rollback(rollback) });
      await saveReceipt({ status: 'rolled-back' });
    }
    throw error;
  }
  // Archive final receipts + an exact next-run rollback manifest before the
  // terminal checkpoint. Failure here leaves the lease held for reconciliation.
  const backup = await admission.state.backup();
  const summary = packageEvidence([
    { path: 'artifact-manifest.json', bytes: Buffer.from(JSON.stringify(manifest)) },
    { path: 'release-receipt.json', bytes: Buffer.from(JSON.stringify({ source: plan.commitSha, deployment: candidate.deployment, operationReceipts, artifactPackageManifestSha256: artifactPackage.manifestSha256 })) },
    { path: 'ledger-backup.json', bytes: Buffer.from(JSON.stringify(backup)) },
  ]);
  const summaryId = `summary-${summary.sha256}`;
  const knownSummary = (await admission.state.inspect()).intents[summaryId]?.payload;
  const [newId] = knownSummary ? [] : await allocate({ count: 1, config: evidenceConfig, getAccessToken: token, fetcher: fetchImpl });
  const summaryPayload = { kind: 'drive-evidence', role: 'release-summary', archivedStateSha256: backup.sha256, fileId: knownSummary?.fileId ?? newId, folderId: evidenceConfig.folderId, sha256: summary.sha256, bytes: summary.length };
  await execute({ operationId: summaryId, payload: summaryPayload, provider: providerFactory({ bundle: summary, config: { ...evidenceConfig, fileId: summaryPayload.fileId }, getAccessToken: token, fetcher: fetchImpl }) });
  await admission.state.recordLatestRelease(admission.lease, { source: plan.commitSha, deployment: candidate.deployment, artifactManifestSha256: hash(JSON.stringify(manifest)), artifactPackageManifestSha256: artifactPackage.manifestSha256, summary: { archivedStateSha256: backup.sha256, operationId: summaryId, payloadSha256: hash(JSON.stringify(summaryPayload)), fileId: summaryPayload.fileId, folderId: evidenceConfig.folderId, sha256: summary.sha256, length: summary.length } });
  await admission.state.compactArchivedState(admission.lease, { backup, summaryBundle: summary, summaryOperationId: summaryId });
  await admission.state.release(admission.lease);
  return { published: true, releaseCommit: plan.commitSha, candidateDeployment: candidate.deployment, operationReceipts };
}

export async function loadPreviousReleaseManifest({ state, evidenceConfig, env = process.env, fetchImpl = fetch }) {
  const previous = (await state.inspect()).latestRelease;
  check(previous?.summary && /^[a-f0-9]{64}$/.test(previous.artifactManifestSha256 ?? '') && previous.summary.folderId === evidenceConfig.folderId, 'bootstrap_rollback_manifest_required');
  const getAccessToken = () => withGoogleCloudAuthorization({ env, fetchImpl }, access => access.LTC_GOOGLE_ACCESS_TOKEN);
  const restored = await downloadEvidence(previous.summary, { config: { ...evidenceConfig, fileId: previous.summary.fileId }, getAccessToken, fetcher: fetchImpl });
  check(restored?.bundle, 'rollback_manifest_unavailable');
  const record = JSON.parse(restored.bundle.bytes.toString('utf8')).files.find(file => file.path === 'artifact-manifest.json');
  check(record, 'rollback_manifest_unavailable');
  const bytes = Buffer.from(record.contentBase64, 'base64');
  check(hash(bytes) === previous.artifactManifestSha256, 'rollback_manifest_changed');
  return JSON.parse(bytes.toString('utf8'));
}
