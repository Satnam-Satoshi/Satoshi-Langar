import { createAcceptanceLinkedClient, restoreAcceptanceArtifactPackage } from './cloud-ltc-acceptance.mjs';
import { createReadOnlyReleaseClients } from './cloud-ltc-reconcile.mjs';
import { withGoogleCloudAuthorization } from './cloud-ltc-google-auth.mjs';
import { downloadEvidence } from './cloud-ltc-evidence.mjs';
import { TARGET, verifyPublicDomains } from './cloud-ltc-release.mjs';
import { builtManifest, builtOutputManifest } from './cloud-ltc-release.mjs';
import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assertPublicationDate } from './cloud-ltc-daily-admission.mjs';
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
export function createDurableVercelCommand({ env, state, lease, vercel, linked, root, verifyPromotionFreshness, assertPromotionFreshness, historicalStage, fetchImpl = fetch }) {
  const owner = Object.freeze({ runId: lease.runId, fence: lease.fence });
  const historical = historicalStage ? structuredClone(historicalStage) : null;
  const assertHistorical = document => {
    const claim = document.softwareStageRecovery;
    check(historical && claim?.status === 'claimed' && claim.owner?.runId === owner.runId && claim.owner.fence === owner.fence && JSON.stringify(claim.stageBinding) === JSON.stringify(historical) && claim.reviewSha256 === historical.reviewSha256, 'controlled_vercel_scope_mismatch');
  };
  const assertLive = document => {
    const now = typeof state.clock === 'function' ? state.clock() : Date.now();
    check(Number.isFinite(now) && document.fence === owner.fence && document.lease?.runId === owner.runId && document.lease.fence === owner.fence && Number.isFinite(document.lease.expiresAt) && document.lease.expiresAt > now && document.paused === false && document.restoreHold === false, 'controlled_vercel_scope_mismatch');
    assertPublicationDate(document.lease, now);
    return now;
  };
  return async args => {
    const kind = { deploy: 'vercel-stage', promote: 'vercel-promote', rollback: 'vercel-rollback' }[args[0]];
    check(kind, 'controlled_vercel_action_forbidden');
    const document = await state.inspect();
    assertLive(document);
    if (historical) assertHistorical(document);
    const claimSha256 = historical ? bytesHash(JSON.stringify(document.softwareStageRecovery)) : null;
    const matching = document => Object.entries(document.intents).filter(([, intent]) => intent.runId === owner.runId && intent.fence === owner.fence && intent.status === 'uncertain' && intent.payload?.kind === kind);
    const intents = matching(document);
    check(intents.length === 1, 'controlled_vercel_scope_mismatch');
    const [intentKey, intent] = intents[0], payload = structuredClone(intent.payload);
    const intentSha256 = bytesHash(JSON.stringify(intent));
    let stageKey, stageSha256;
    // Every awaited provider/file/freshness read can outlive a lease or race an
    // emergency hold. Recheck at the actual effect boundary, never renew here.
    const beforeEffect = async () => {
      const current = await state.inspect(); const now = assertLive(current);
      const rows = matching(current);
      check(rows.length === 1 && rows[0][0] === intentKey && bytesHash(JSON.stringify(rows[0][1])) === intentSha256, 'controlled_vercel_scope_mismatch');
      if (stageKey) check(current.intents[stageKey] && bytesHash(JSON.stringify(current.intents[stageKey])) === stageSha256, 'controlled_vercel_scope_mismatch');
      if (historical) { assertHistorical(current); check(bytesHash(JSON.stringify(current.softwareStageRecovery)) === claimSha256, 'controlled_vercel_scope_mismatch'); }
      // Must be synchronous: no later provider/state await may consume the
      // remaining first-promotion review window. Rollback remains lease-bound.
      if (kind === 'vercel-promote' && assertPromotionFreshness) {
        const result = assertPromotionFreshness(current, now);
        check(result === undefined, 'controlled_vercel_scope_mismatch');
      }
    };
    if (kind === 'vercel-stage') {
      check(!historical, 'controlled_vercel_action_forbidden');
      const expectedArgs = ['deploy', '--prebuilt', '--prod', '--skip-domain', '--yes', '--meta', `ltcOperationId=${intent.operationId}`, '--meta', `ltcPayloadSha256=${intent.payloadSha256}`, '--meta', `ltcSourceCommit=${payload.commit}`, '--meta', `ltcBuildOutputSha256=${payload.buildOutputSha256}`];
      check(JSON.stringify(args) === JSON.stringify(expectedArgs), 'controlled_vercel_scope_mismatch');
      const metadata = args.flatMap((arg, index) => arg === '--meta' ? [args[index + 1]] : []);
      check(metadata.length === 4 && metadata.includes(`ltcOperationId=${intent.operationId}`) && metadata.includes(`ltcPayloadSha256=${intent.payloadSha256}`) && metadata.includes(`ltcSourceCommit=${payload.commit}`) && metadata.includes(`ltcBuildOutputSha256=${payload.buildOutputSha256}`), 'controlled_vercel_scope_mismatch');
      return linked.deploy(args, root, beforeEffect);
    }
    const candidateId = kind === 'vercel-promote' ? payload.deployment : payload.failed;
    const previousId = kind === 'vercel-promote' ? payload.previous : payload.restore;
    let stageEntry;
    if (historical) {
      assertHistorical(document);
      const record = document.intents[historical.operationId];
      check(record && bytesHash(JSON.stringify(record)) === historical.intentSha256 && record.status === 'confirmed' && record.payload?.kind === 'vercel-stage' && record.payload.commit === payload.commit && record.proof?.proof?.deployment === candidateId && record.fence < owner.fence, 'controlled_vercel_scope_mismatch');
      stageEntry = [historical.operationId, record];
    } else stageEntry = Object.entries(document.intents).find(([, record]) => record.runId === owner.runId && record.fence === owner.fence && record.status === 'confirmed' && record.payload?.kind === 'vercel-stage' && record.payload.commit === payload.commit && record.proof?.proof?.deployment === candidateId);
    check(stageEntry, 'controlled_vercel_scope_mismatch');
    const [key, stage] = stageEntry; stageKey = key; stageSha256 = bytesHash(JSON.stringify(stage));
    const candidate = await vercel(`/v13/deployments/${candidateId}`);
    check(candidate?.id === candidateId && candidate.projectId === TARGET.project && candidate.ownerId === TARGET.team && candidate.team?.id === TARGET.team && candidate.meta?.ltcSourceCommit === payload.commit && candidate.url === stage.proof.proof.url, 'controlled_vercel_scope_mismatch');
    if(kind==='vercel-promote')await verifyPromotionFreshness?.();
    await beforeEffect();
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
