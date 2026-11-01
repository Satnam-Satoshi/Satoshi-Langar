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

// The coordinator already confirmed full stage identity/protected byte readback.
// Reuse that exact immutable receipt instead of starting a second discovery and
// full protected crawl. Promotion still checks fresh identity and old pointers.
export async function confirmedStageFromState({ state, lease, operation }) {
  const document = await state.inspect(), intent = document.intents[operation.operationId], receipt = document.receipts[operation.operationId];
  check(document.lease?.runId === lease.runId && document.lease.fence === lease.fence && document.fence === lease.fence && intent?.runId === lease.runId && intent.fence === lease.fence && intent.operationId === operation.operationId && intent.status === 'confirmed', 'confirmed_stage_receipt_invalid');
  check(intent.payloadSha256 === hash(JSON.stringify(operation.payload)) && JSON.stringify(intent.payload) === JSON.stringify(operation.payload) && intent.payload.kind === 'vercel-stage' && receipt?.sha256 === hash(JSON.stringify(intent)) && JSON.stringify(receipt.receipt) === JSON.stringify(intent), 'confirmed_stage_receipt_invalid');
  const proof = intent.proof, leaf = proof?.proof;
  check(proof?.operationId === intent.operationId && proof.payloadSha256 === intent.payloadSha256 && proof.status === 'applied' && intent.evidenceSha256 === hash(JSON.stringify(proof)) && leaf?.kind === 'vercel-stage' && /^dpl_[A-Za-z0-9]+$/.test(leaf.deployment ?? '') && /^[a-z0-9-]+\.vercel\.app$/.test(leaf.url ?? '') && leaf.source === operation.payload.commit && leaf.buildOutputSha256 === operation.payload.buildOutputSha256 && leaf.artifactManifestSha256 === operation.payload.artifactManifestSha256, 'confirmed_stage_receipt_invalid');
  return structuredClone(leaf);
}

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
  const { admission, root, source, changes, editionId, acceptedSource, startedAt, target, github, vercel, cli, controls, verifyProtected, verifyPublic, verifyImplementation, verifyBuildOutput, manifest, buildOutput, rollbackManifest, evidenceDirectory, evidenceConfig, publicationProvenance, env = process.env, fetchImpl = fetch, saveReceipt } = options;
  check(admission?.state && admission?.lease && Array.isArray(rollbackManifest) && rollbackManifest.length > 0 && rollbackManifest.every(record => typeof record.file === 'string' && /^[a-f0-9]{64}$/.test(record.sha256 ?? '')) && typeof saveReceipt === 'function' && publicationProvenance && ['editionSha256', 'sourceDeskSha256', 'dailyGraphicSha256'].every(key => /^[a-f0-9]{64}$/.test(publicationProvenance[key] ?? '')), 'invalid_production_release_configuration');
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
    await verifyImplementation(); await verifyBuildOutput(); await options.verifyMigration?.(); await controls(commit);
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
  const candidate = await confirmedStageFromState({ state: admission.state, lease: admission.lease, operation: stage });
  await saveReceipt({ candidateDeployment: candidate.deployment, candidateUrl: `https://${candidate.url}` });
  return finishConfirmedStagedRelease({ admission, editionId, releaseCommit: plan.commitSha, candidate, previousDeployment: previous[0], manifest, rollbackManifest, artifactPackageManifestSha256: artifactPackage.manifestSha256, publicationProvenance, target, vercel, cli, beforeMutation, verifyProtected, verifyPublic, evidenceConfig, allocate, providerFactory, token, operationReceipts, saveReceipt, fetchImpl });
}


// Shared post-stage tail. It has no source/upload-artifacts/deploy operation:
// only first promotion, bounded rollback, final private summary and checkpoint.
export async function finishConfirmedStagedRelease({ admission, editionId, releaseCommit, candidate, previousDeployment, manifest, rollbackManifest, artifactPackageManifestSha256, publicationProvenance, target, vercel, cli, beforeMutation, verifyProtected, verifyPublic, evidenceConfig, allocate, providerFactory, token, operationReceipts, saveReceipt, continuation = null, completeCheckpoint, beforeSummary, verifyBackup, fetchImpl = fetch }) {
  const coordinator = new ReleaseOperationCoordinator(admission);
  const execute = async operation => {
    if(continuation)await saveReceipt({status:operation.payload.kind==='drive-evidence'?'applying-final-private-summary':operation.payload.kind==='vercel-promote'?'applying-first-promotion':'applying-verified-rollback'});
    const receipt = await executeReleaseOperation(coordinator, operation);
    operationReceipts.push({ operationId: operation.operationId, payload: operation.payload, ...receipt });
    await saveReceipt({ operationReceipts }); return receipt;
  };
  const providers = createVercelReleaseProviders({ target, vercel, cli, beforeMutation,
    verifyProtected, verifyPublic: async expected => { check(expected === hash(JSON.stringify(rollbackManifest)), 'rollback_manifest_changed'); await verifyPublic(rollbackManifest); },
  });
  const payload = { kind: 'vercel-promote', editionId, artifactPackageManifestSha256: artifactPackageManifestSha256, artifactManifestSha256: hash(JSON.stringify(manifest)), deployment: candidate.deployment, previous: previousDeployment, commit: releaseCommit };
  let promotion;
  try {
    promotion = await execute({ operationId: `promote-${hash(candidate.deployment).slice(0, 40)}`, payload, provider: providers.promote(payload) });
    await verifyPublic(manifest);
  } catch (error) {
    // An uncertain promotion is NOT permission to roll back a potentially running
    // request. Rollback follows confirmed promotion + failed public verification;
    // its provider freshly requires both pointers still belong to this candidate.
    if (promotion?.status === 'confirmed') {
      const rollback = { kind: 'vercel-rollback', artifactPackageManifestSha256: artifactPackageManifestSha256, failed: candidate.deployment, restore: previousDeployment, commit: releaseCommit, previousManifestSha256: hash(JSON.stringify(rollbackManifest)) };
      await execute({ operationId: `rollback-${hash(candidate.deployment).slice(0, 40)}`, payload: rollback, provider: providers.rollback(rollback) });
      await saveReceipt({ status: 'rolled-back' });
    }
    throw error;
  }
  // Archive final receipts + an exact next-run rollback manifest before the
  // terminal checkpoint. Failure here leaves the lease held for reconciliation.
  const publicVerifiedAt = new Date().toISOString();
  if (continuation) await beforeMutation(releaseCommit);
  await beforeSummary?.();
  const backup = await admission.state.backup();
  await verifyBackup?.(backup);
  const summary = packageEvidence([
    { path: 'artifact-manifest.json', bytes: Buffer.from(JSON.stringify(manifest)) },
    { path: 'release-receipt.json', bytes: Buffer.from(JSON.stringify({ source: releaseCommit, editionId, verifiedAt: publicVerifiedAt, deployment: candidate.deployment, operationReceipts, publicationProvenance, ...(continuation ? { continuation } : {}), artifactPackageManifestSha256: artifactPackageManifestSha256 })) },
    { path: 'ledger-backup.json', bytes: Buffer.from(JSON.stringify(backup)) },
  ]);
  const summaryId = `summary-${summary.sha256}`;
  const knownSummary = (await admission.state.inspect()).intents[summaryId]?.payload;
  const [newId] = knownSummary ? [] : await allocate({ count: 1, config: evidenceConfig, getAccessToken: token, fetcher: fetchImpl });
  const summaryPayload = { kind: 'drive-evidence', role: 'release-summary', archivedStateSha256: backup.sha256, fileId: knownSummary?.fileId ?? newId, folderId: evidenceConfig.folderId, sha256: summary.sha256, bytes: summary.length };
  await execute({ operationId: summaryId, payload: summaryPayload, provider: providerFactory({ bundle: summary, config: { ...evidenceConfig, fileId: summaryPayload.fileId }, getAccessToken: token, fetcher: fetchImpl }) });
  await admission.state.recordLatestRelease(admission.lease, { source: releaseCommit, editionId, verifiedAt: publicVerifiedAt, deployment: candidate.deployment, publicationProvenance, artifactManifestSha256: hash(JSON.stringify(manifest)), artifactPackageManifestSha256: artifactPackageManifestSha256, ...(continuation ? { continuation } : {}), summary: { archivedStateSha256: backup.sha256, operationId: summaryId, payloadSha256: hash(JSON.stringify(summaryPayload)), fileId: summaryPayload.fileId, folderId: evidenceConfig.folderId, sha256: summary.sha256, length: summary.length } });
  await admission.state.compactArchivedState(admission.lease, { backup, summaryBundle: summary, summaryOperationId: summaryId });
  if (completeCheckpoint) await completeCheckpoint({ summaryId, summaryPayload, backup, publicVerifiedAt });
  else await admission.state.release(admission.lease);
  return { published: true, releaseCommit: releaseCommit, candidateDeployment: candidate.deployment, operationReceipts };
}

export async function loadPreviousReleaseManifest({ state, evidenceConfig, publicationProvenance, env = process.env, fetchImpl = fetch }) {
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
