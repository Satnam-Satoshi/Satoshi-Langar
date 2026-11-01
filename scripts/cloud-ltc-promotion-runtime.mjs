import { createAcceptanceLinkedClient, restoreAcceptanceArtifactPackage } from './cloud-ltc-acceptance.mjs';
import { createReadOnlyReleaseClients } from './cloud-ltc-reconcile.mjs';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
import { downloadEvidence } from './cloud-ltc-evidence.mjs';
import { TARGET, verifyPublicDomains } from './cloud-ltc-release.mjs';
import { builtManifest, builtOutputManifest } from './cloud-ltc-release.mjs';
import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const check = (value, code) => { if (!value) throw Error(code); };
const bytesHash = bytes => createHash('sha256').update(bytes).digest('hex');

// Deploy only the reviewed portable artifact, never a Git working tree. CLI
// attribution therefore comes from the explicit durable metadata rather than
// auto-detected commit authors. Source/ref/implementation checks remain on the
// independent source checkout before every effect.
export async function createPortableDeploymentWorkspace({ sourceRoot, directory, buildOutput }) {
  check(path.isAbsolute(sourceRoot) && path.isAbsolute(directory) && directory !== sourceRoot && !directory.startsWith(sourceRoot + path.sep) && Array.isArray(buildOutput), 'invalid_portable_workspace');
  const output = path.join(sourceRoot, '.vercel/output');
  const expectedHash = bytesHash(JSON.stringify(buildOutput));
  check(bytesHash(JSON.stringify(await builtOutputManifest(output))) === expectedHash, 'built_output_changed');
  const configPath = path.join(sourceRoot, 'vercel.json'), configInfo = await lstat(configPath);
  check(configInfo.isFile() && !configInfo.isSymbolicLink(), 'invalid_portable_workspace');
  const configBytes = await readFile(configPath), config = JSON.parse(configBytes);
  check(config && typeof config === 'object' && !Array.isArray(config) && !Object.hasOwn(config, 'scope'), 'invalid_portable_workspace');
  const linkBytes = Buffer.from(JSON.stringify({ projectId: TARGET.project, orgId: TARGET.team, projectName: 'https-github-com-satnam-satoshi-satoshi-langar' }));
  await mkdir(directory, { mode: 0o700 }); // Exclusive new sibling, not a checkout.
  await mkdir(path.join(directory, '.vercel'), { mode: 0o700 });
  await writeFile(path.join(directory, 'vercel.json'), configBytes, { flag: 'wx', mode: 0o600 });
  await writeFile(path.join(directory, '.vercel/project.json'), linkBytes, { flag: 'wx', mode: 0o600 });
  for (const record of buildOutput) {
    check(typeof record.file === 'string' && !record.file.includes('\\') && !record.file.split('/').some(part => !part || part === '.' || part === '..'), 'invalid_portable_workspace');
    const from = path.join(output, record.file), info = await lstat(from);
    check(info.isFile() && !info.isSymbolicLink(), 'built_output_changed');
    const bytes = await readFile(from);
    check(bytesHash(bytes) === record.sha256, 'built_output_changed');
    const to = path.join(directory, '.vercel/output', record.file);
    await mkdir(path.dirname(to), { recursive: true, mode: 0o700 });
    await writeFile(to, bytes, { flag: 'wx', mode: info.mode & 0o111 ? 0o700 : 0o600 });
  }
  const expected = [{ file: 'vercel.json', sha256: bytesHash(configBytes) }, { file: '.vercel/project.json', sha256: bytesHash(linkBytes) }, ...buildOutput.map(record => ({ file: `.vercel/output/${record.file}`, sha256: record.sha256 }))].sort((a,b) => a.file.localeCompare(b.file));
  const verify = async () => {
    for (const relative of ['', '.vercel', '.vercel/output']) {
      const info = await lstat(path.join(directory, relative));
      check(info.isDirectory() && !info.isSymbolicLink(), 'invalid_portable_workspace');
    }
    // No Git ancestor or extra credential/source file may change CLI discovery.
    for (let parent = directory; ; parent = path.dirname(parent)) {
      try { await lstat(path.join(parent, '.git')); throw Error('portable_workspace_contains_git'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (parent === path.dirname(parent)) break;
    }
    check(bytesHash(await readFile(configPath)) === bytesHash(configBytes) && bytesHash(JSON.stringify(await builtOutputManifest(output))) === expectedHash && bytesHash(JSON.stringify(await builtManifest(directory))) === bytesHash(JSON.stringify(expected)), 'portable_workspace_changed');
  };
  await verify();
  return { root: directory, verify, buildOutputSha256: expectedHash, vercelConfigSha256: bytesHash(configBytes) };
}

// Official endpoints used by pinned Vercel CLI 65.9 requestPromote/requestRollback
// (commands-core.js). CLI owner discovery requires unavailable user/team reads;
// this narrow bridge keeps existing coordinator/provider checks and exact scope.
export function createControlledVercelMutation({ env, review, fetchImpl = fetch }) {
  const token = env.VERCEL_TOKEN, pins = review.stagePins;
  check(typeof token === 'string' && token.length >= 16 && token.length <= 8192 && !/[\s\x00-\x1f\x7f]/.test(token) && /^dpl_[A-Za-z0-9]+$/.test(pins?.candidateDeployment ?? '') && /^dpl_[A-Za-z0-9]+$/.test(pins?.previousDeployment ?? '') && pins.candidateDeployment !== pins.previousDeployment, 'controlled_vercel_configuration_required');
  return async (args, context) => {
    check(context.candidate === pins.candidateDeployment && context.previous === pins.previousDeployment && /^[a-z0-9-]+\.vercel\.app$/.test(context.candidateUrl), 'controlled_vercel_scope_mismatch');
    let endpoint;
    if (JSON.stringify(args) === JSON.stringify(['promote', `https://${context.candidateUrl}`, '--yes'])) endpoint = `/v10/projects/${TARGET.project}/promote/${pins.candidateDeployment}`;
    else if (JSON.stringify(args) === JSON.stringify(['rollback', pins.previousDeployment, '--non-interactive'])) endpoint = `/v9/projects/${TARGET.project}/rollback/${pins.previousDeployment}`;
    else throw Error('controlled_vercel_action_forbidden');
    let response;
    try { response = await fetchImpl(`https://api.vercel.com${endpoint}?teamId=${TARGET.team}`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: '{}' }); }
    catch { throw Error('controlled_vercel_write_uncertain'); }
    check(!response.redirected && [200, 201, 202, 204].includes(response.status), 'controlled_vercel_write_uncertain');
    await response.body?.cancel().catch(() => {});
    // Never infer application from this acknowledgement; provider readback owns it.
  };
}

// Routine production uses the same project-scoped transport, but derives each
// exact target from the already-authorized current-fence durable intent. This
// cannot invent an alias mutation or execute a historical acceptance operation.
export function createDurableVercelCommand({ env, state, lease, vercel, linked, root, verifyPromotionFreshness, fetchImpl = fetch }) {
  return async args => {
    const kind = { deploy: 'vercel-stage', promote: 'vercel-promote', rollback: 'vercel-rollback' }[args[0]];
    check(kind, 'controlled_vercel_action_forbidden');
    const document = await state.inspect();
    check(document.lease?.runId === lease.runId && document.lease.fence === lease.fence && document.paused === false, 'controlled_vercel_scope_mismatch');
    const intents = Object.values(document.intents).filter(intent => intent.runId === lease.runId && intent.fence === lease.fence && intent.status === 'uncertain' && intent.payload?.kind === kind);
    check(intents.length === 1, 'controlled_vercel_scope_mismatch');
    const intent = intents[0], payload = intent.payload;
    if (kind === 'vercel-stage') {
      const expectedArgs = ['deploy', '--prebuilt', '--prod', '--skip-domain', '--yes', '--meta', `ltcOperationId=${intent.operationId}`, '--meta', `ltcPayloadSha256=${intent.payloadSha256}`, '--meta', `ltcSourceCommit=${payload.commit}`, '--meta', `ltcBuildOutputSha256=${payload.buildOutputSha256}`];
      check(JSON.stringify(args) === JSON.stringify(expectedArgs), 'controlled_vercel_scope_mismatch');
      const metadata = args.flatMap((arg, index) => arg === '--meta' ? [args[index + 1]] : []);
      check(metadata.length === 4 && metadata.includes(`ltcOperationId=${intent.operationId}`) && metadata.includes(`ltcPayloadSha256=${intent.payloadSha256}`) && metadata.includes(`ltcSourceCommit=${payload.commit}`) && metadata.includes(`ltcBuildOutputSha256=${payload.buildOutputSha256}`), 'controlled_vercel_scope_mismatch');
      return linked.deploy(args, root);
    }
    const candidateId = kind === 'vercel-promote' ? payload.deployment : payload.failed;
    const previousId = kind === 'vercel-promote' ? payload.previous : payload.restore;
    const stage = Object.values(document.intents).find(record => record.runId === lease.runId && record.fence === lease.fence && record.status === 'confirmed' && record.payload?.kind === 'vercel-stage' && record.payload.commit === payload.commit && record.proof?.proof?.deployment === candidateId);
    check(stage, 'controlled_vercel_scope_mismatch');
    const candidate = await vercel(`/v13/deployments/${candidateId}`);
    check(candidate?.id === candidateId && candidate.projectId === TARGET.project && candidate.ownerId === TARGET.team && candidate.team?.id === TARGET.team && candidate.meta?.ltcSourceCommit === payload.commit && candidate.url === stage.proof.proof.url, 'controlled_vercel_scope_mismatch');
    if(kind==='vercel-promote')await verifyPromotionFreshness?.();
    return createControlledVercelMutation({ env, review: { stagePins: { candidateDeployment: candidateId, previousDeployment: previousId } }, fetchImpl })(args, { candidate: candidateId, previous: previousId, candidateUrl: candidate.url });
  };
}

export async function createControlledPromotionRuntime({ env, review, evidenceConfig, socialState, directory, save, allowMutation = false, fetchImpl = fetch }) {
  check(evidenceConfig.folderId === review.stagePins.bindings.folderId && evidenceConfig.ownerPermissionId === review.stagePins.bindings.ownerPermissionId, 'promotion_private_resource_mismatch');
  const clients = createReadOnlyReleaseClients({ env, fetcher: fetchImpl });
  const linked = createAcceptanceLinkedClient({ env, vercel: clients.vercel, directory, report: async diagnostic => { await save({ safeCliFailure: diagnostic }); } });
  await linked.verifyVersion();
  const getAccessToken = () => withGoogleCloudAuthorization({ env, fetchImpl }, access => access.LTC_GOOGLE_ACCESS_TOKEN);
  return {
    ...clients, socialState, save, now: Date.now,
    wait: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
    mutate: allowMutation ? createControlledVercelMutation({ env, review, fetchImpl }) : async () => { throw Error('promotion_read_only'); },
    async restore(document) {
      const plan = document.acceptance.plan;
      const operations = Object.values(document.intents).filter(intent => intent.fence === document.acceptance.fence && intent.payload?.kind === 'drive-evidence').sort((a, b) => a.payload.artifactBundleIndex - b.payload.artifactBundleIndex);
      const restored = await restoreAcceptanceArtifactPackage(plan, operations, { directory, download: receipt => downloadEvidence(receipt, { config: { ...evidenceConfig, fileId: receipt.fileId }, getAccessToken, fetcher: fetchImpl }) });
      return { manifest: restored.manifest, previousManifest: restored.previousManifest };
    },
    verifyProtected: (deployment, manifest) => linked.readProtected(deployment, manifest, manifest),
    verifyPublic: verifyPublicDomains,
  };
}
