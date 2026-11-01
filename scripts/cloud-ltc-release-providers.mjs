import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const check = (value, code) => { if (!value) throw new Error(code); };
const hash = value => createHash('sha256').update(value).digest('hex');
const gitObject = (type, bytes) => createHash('sha1').update(`${type} ${bytes.length}\0`).update(bytes).digest('hex');
const sha1 = value => /^[a-f0-9]{40}$/.test(value ?? '');
const sha256 = value => /^[a-f0-9]{64}$/.test(value ?? '');
const id = value => /^[a-z0-9][a-z0-9_-]{0,79}$/.test(value ?? '');
const unknown = context => ({ operationId: context.operationId, payloadSha256: context.payloadSha256, status: 'unknown' });
const applied = (context, proof) => ({ operationId: context.operationId, payloadSha256: context.payloadSha256, status: 'applied', proof });
function bindPayload(expected, context) { check(JSON.stringify(expected) === JSON.stringify(context.payload) && hash(JSON.stringify(expected)) === context.payloadSha256, 'provider_payload_mismatch'); }
function provider(payload, apply, readback) {
  return {
    async apply(context) { bindPayload(payload, context); return apply(context); },
    async readback(context) { bindPayload(payload, context); try { return await readback(context); } catch { return unknown(context); } },
  };
}

// Plan hashes are determined locally BEFORE any remote write. Git's immutable
// content addresses make even lost blob/tree/commit responses recoverable.
export async function prepareGitReleasePlan({ root, base, changes, editionId, branch, committedAt, github, beforeMutation }) {
  check(sha1(base) && /^\d{4}-\d{2}-\d{2}-r1$/.test(editionId ?? '') && /^agent\/[a-z0-9/-]+$/.test(branch ?? '') && !branch.includes('..') && Array.isArray(changes) && typeof github === 'function' && typeof beforeMutation === 'function', 'invalid_git_release_plan');
  const stamp = new Date(committedAt); check(Number.isFinite(stamp.valueOf()), 'invalid_git_release_plan');
  const date = stamp.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const directory = await mkdtemp(path.join(tmpdir(), 'ltc-git-plan-'));
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, LANG: 'C', GIT_INDEX_FILE: path.join(directory, 'index') };
  const git = (args, input) => execFileSync('git', args, { cwd: root, env, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  const steps = []; const entries = []; const known = new Set();
  const baseTree = git(['rev-parse', `${base}^{tree}`]);
  try {
    git(['read-tree', base]);
    for (const change of [...changes].sort((a, b) => a.file.localeCompare(b.file))) {
      check(typeof change.file === 'string' && !change.file.startsWith('/') && !change.file.split('/').some(part => ['..', '.', ''].includes(part)) && ['A', 'M', '??'].includes(change.status), 'invalid_git_release_plan');
      const bytes = await readFile(path.join(root, change.file));
      const expected = gitObject('blob', bytes);
      check(git(['hash-object', '-w', '--stdin'], bytes) === expected, 'git_plan_mismatch');
      git(['update-index', '--add', '--cacheinfo', `100644,${expected},${change.file}`]);
      entries.push({ path: change.file, mode: '100644', type: 'blob', sha: expected });
      if (known.has(expected)) continue;
      known.add(expected);
      const payload = { kind: 'git-blob', sha: expected, sha256: hash(bytes), bytes: bytes.length };
      steps.push({ kind: 'source', operationId: `blob-${expected}`, payload, provider: provider(payload, async () => {
        await beforeMutation(base);
        const result = await github('/git/blobs', 'POST', { content: bytes.toString('base64'), encoding: 'base64' });
        check(result.sha === expected, 'git_plan_mismatch');
      }, async context => {
        const result = await github(`/git/blobs/${expected}`);
        check(result.sha === expected && result.encoding === 'base64', 'git_readback_mismatch');
        const saved = Buffer.from(result.content, 'base64');
        check(saved.length === bytes.length && hash(saved) === payload.sha256 && gitObject('blob', saved) === expected, 'git_readback_mismatch');
        return applied(context, { kind: payload.kind, sha: expected, sha256: hash(saved), bytes: saved.length });
      }) });
    }
    if (!changes.length) return { commitSha: base, steps: [] };
    const tree = git(['write-tree']);
    const treePayload = { kind: 'git-tree', sha: tree, baseTree, entries };
    steps.push({ kind: 'source', operationId: `tree-${tree}`, payload: treePayload, provider: provider(treePayload, async () => {
      await beforeMutation(base);
      const result = await github('/git/trees', 'POST', { base_tree: baseTree, tree: entries });
      check(result.sha === tree, 'git_plan_mismatch');
    }, async context => {
      const result = await github(`/git/trees/${tree}`);
      check(result.sha === tree && result.truncated === false && Array.isArray(result.tree), 'git_readback_mismatch');
      const ordered = [...result.tree].sort((a, b) => Buffer.compare(Buffer.from(a.path + (a.type === 'tree' ? '/' : '')), Buffer.from(b.path + (b.type === 'tree' ? '/' : ''))));
      const raw = Buffer.concat(ordered.map(entry => {
        check(typeof entry.path === 'string' && !entry.path.includes('/') && !entry.path.includes('\0') && sha1(entry.sha) && /^(?:040000|100644|100755|120000|160000)$/.test(entry.mode), 'git_readback_mismatch');
        return Buffer.concat([Buffer.from(`${entry.mode === '040000' ? '40000' : entry.mode} ${entry.path}\0`), Buffer.from(entry.sha, 'hex')]);
      }));
      check(gitObject('tree', raw) === tree, 'git_readback_mismatch');
      return applied(context, { kind: 'git-tree', sha: tree, entryCount: result.tree.length });
    }) });
    const identity = { name: 'LTC Cloud Publisher', email: 'ltc-cloud@users.noreply.github.com', date };
    const message = `Publish LTC source edition ${editionId}\n`;
    const epoch = Math.floor(stamp.valueOf() / 1000);
    const raw = Buffer.from(`tree ${tree}\nparent ${base}\nauthor ${identity.name} <${identity.email}> ${epoch} +0000\ncommitter ${identity.name} <${identity.email}> ${epoch} +0000\n\n${message}`);
    const commit = gitObject('commit', raw);
    const commitPayload = { kind: 'git-commit', sha: commit, tree, parents: [base], author: identity, committer: identity, message };
    const verifyCommit = result => {
      check(result.sha === commit && result.tree?.sha === tree && result.parents?.length === 1 && result.parents[0].sha === base && result.message.replace(/\n?$/, '\n') === message, 'git_readback_mismatch');
      for (const field of ['author', 'committer']) check(result[field]?.name === identity.name && result[field]?.email === identity.email && new Date(result[field]?.date).toISOString() === date.replace('Z', '.000Z'), 'git_readback_mismatch');
    };
    steps.push({ kind: 'source', operationId: `commit-${commit}`, payload: commitPayload, provider: provider(commitPayload, async () => {
      await beforeMutation(base);
      const result = await github('/git/commits', 'POST', { tree, parents: [base], author: identity, committer: identity, message });
      check(result.sha === commit, 'git_plan_mismatch');
    }, async context => { const result = await github(`/git/commits/${commit}`); verifyCommit(result); return applied(context, { kind: 'git-commit', sha: commit, tree, parent: base }); }) });
    const refPayload = { kind: 'git-ref', branch, previous: base, commit };
    steps.push({ kind: 'source', operationId: `ref-${commit}`, payload: refPayload, provider: provider(refPayload, async () => {
      await beforeMutation(base);
      const result = await github(`/git/refs/heads/${branch}`, 'PATCH', { sha: commit, force: false });
      check(result.object?.sha === commit, 'git_ref_mismatch');
    }, async context => {
      const ref = await github(`/git/ref/heads/${branch}`);
      check(ref.object?.sha === commit, 'git_ref_mismatch');
      verifyCommit(await github(`/git/commits/${commit}`));
      return applied(context, { kind: 'git-ref', branch, commit, previous: base, tree });
    }) });
    return { commitSha: commit, steps };
  } finally { await rm(directory, { recursive: true, force: true }); }
}

export function assertVercelProjectPolicy(project, target) {
  check(project?.id === target.project && project.accountId === target.team, 'wrong_vercel_project');
  if (!project.link) return { nativeGit: 'detached' };
  const link = project.link;
  check(project.commandForIgnoringBuildStep === 'exit 0' && link.type === 'github' && link.org === 'Khlnayak' && link.repo === 'https-github.com-Satnam-Satoshi-Satoshi-Langar' && link.repoId === 1246313844 && link.productionBranch === 'main' && link.sourceless === true && Array.isArray(link.deployHooks) && link.deployHooks.length === 0, 'native_git_link_requires_owner_resolution');
  return { nativeGit: 'reviewed-legacy-link-suppressed' };
}
export function assertVercelDeploymentIdentity(deployment, target) {
  check(/^dpl_[A-Za-z0-9]+$/.test(deployment?.id ?? '') && deployment.projectId === target.project && deployment.ownerId === target.team && deployment.team?.id === target.team && (deployment.teamId === undefined || deployment.teamId === target.team) && (deployment.team?.slug === undefined || deployment.team.slug === target.scope) && deployment.readyState === 'READY' && deployment.target === 'production' && /^[a-z0-9-]+\.vercel\.app$/.test(deployment.url ?? ''), 'deployment_identity_mismatch');
}
export function createVercelReleaseProviders({ target, vercel, cli, verifyProtected, verifyPublic, beforeMutation, readbackAttempts = 3, readbackDelayMs = 1000, readbackWait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  check(Number.isSafeInteger(readbackAttempts) && readbackAttempts >= 1 && readbackAttempts <= 5 && Number.isSafeInteger(readbackDelayMs) && readbackDelayMs >= 0 && readbackDelayMs <= 2000 && typeof readbackWait === 'function', 'invalid_vercel_readback_policy');
  check(target?.project && target?.team && Array.isArray(target.domains) && target.domains.length === 2 && [vercel, cli, verifyProtected, verifyPublic, beforeMutation].every(fn => typeof fn === 'function'), 'invalid_vercel_provider_configuration');
  const pointers = async expected => {
    const records = [];
    for (const domain of target.domains) {
      const deployment = await vercel(`/v13/deployments/${new URL(domain).hostname}`);
      assertVercelDeploymentIdentity(deployment, target); check(deployment.id === expected, 'competing_production_release');
      records.push({ domain, deployment: deployment.id });
    }
    return records;
  };
  // Only reads are retried. Old/mixed old+expected aliases can be propagation;
  // a third deployment or invalid ownership is a competing outcome and holds.
  const settledPointers = async (expected, previous) => {
    for (let attempt = 0; attempt < readbackAttempts; attempt++) {
      try {
        const records = []; let ready = true;
        for (const domain of target.domains) {
          const deployment = await vercel(`/v13/deployments/${new URL(domain).hostname}`);
          assertVercelDeploymentIdentity(deployment, target);
          check(deployment.id === expected || deployment.id === previous, 'competing_production_release');
          ready &&= deployment.id === expected;
          records.push({ domain, deployment: deployment.id });
        }
        if (ready) return records;
      } catch (error) {
        if (['deployment_identity_mismatch', 'competing_production_release'].includes(error?.message)) throw error;
      }
      if (attempt + 1 < readbackAttempts) await readbackWait(readbackDelayMs);
    }
    throw Error('vercel_pointer_readback_unsettled');
  };
  const onceThenRead = async args => {
    try { await cli(args); }
    catch (error) {
      // The fixed POST transport labels an uncertain acknowledgement. Let the
      // coordinator inspect its authorized target without ever issuing it again.
      if (error?.message !== 'controlled_vercel_write_uncertain') throw error;
    }
  };
  return {
    stage(payload) {
      check(sha1(payload.commit) && sha256(payload.buildOutputSha256) && sha256(payload.artifactManifestSha256), 'invalid_stage_payload');
      return provider(payload, async context => {
        await beforeMutation(payload.commit);
        await cli(['deploy', '--prebuilt', '--prod', '--skip-domain', '--yes', '--meta', `ltcOperationId=${context.operationId}`, '--meta', `ltcPayloadSha256=${context.payloadSha256}`, '--meta', `ltcSourceCommit=${payload.commit}`, '--meta', `ltcBuildOutputSha256=${payload.buildOutputSha256}`]);
      }, async context => {
        let until = ''; let found = []; let complete = false; const pages = new Set();
        for (let page = 0; page < 10; page++) {
          const result = await vercel(`/v6/deployments?projectId=${target.project}&target=production&limit=100${until ? `&until=${encodeURIComponent(until)}` : ''}`);
          check(Array.isArray(result.deployments), 'invalid_deployment_listing');
          found.push(...result.deployments.filter(item => item.meta?.ltcOperationId === context.operationId));
          const next = result.pagination?.next;
          if (next === null || next === undefined) { complete = true; break; }
          check((typeof next === 'number' || typeof next === 'string') && !pages.has(String(next)), 'invalid_deployment_listing');
          pages.add(String(next)); until = String(next);
        }
        check(complete && found.length === 1, 'deployment_discovery_uncertain');
        const deployment = await vercel(`/v13/deployments/${found[0].uid ?? found[0].id}`);
        assertVercelDeploymentIdentity(deployment, target);
        check(deployment.meta?.ltcOperationId === context.operationId && deployment.meta.ltcPayloadSha256 === context.payloadSha256 && deployment.meta.ltcSourceCommit === payload.commit && deployment.meta.ltcBuildOutputSha256 === payload.buildOutputSha256, 'deployment_identity_mismatch');
        await verifyProtected(deployment, payload);
        return applied(context, { kind: 'vercel-stage', deployment: deployment.id, url: deployment.url, source: payload.commit, buildOutputSha256: payload.buildOutputSha256, artifactManifestSha256: payload.artifactManifestSha256 });
      });
    },
    promote(payload) {
      check(/^dpl_[A-Za-z0-9]+$/.test(payload.deployment ?? '') && /^dpl_[A-Za-z0-9]+$/.test(payload.previous ?? '') && payload.deployment !== payload.previous && sha1(payload.commit), 'invalid_promote_payload');
      return provider(payload, async () => {
        await beforeMutation(payload.commit);
        await pointers(payload.previous);
        const deployment = await vercel(`/v13/deployments/${payload.deployment}`); assertVercelDeploymentIdentity(deployment, target);
        check(deployment.meta?.ltcSourceCommit === payload.commit, 'deployment_identity_mismatch');
        await onceThenRead(['promote', `https://${deployment.url}`, '--yes']);
      }, async context => applied(context, { kind: 'vercel-promote', pointers: await settledPointers(payload.deployment, payload.previous), previous: payload.previous, deployment: payload.deployment }));
    },
    rollback(payload) {
      check(/^dpl_[A-Za-z0-9]+$/.test(payload.failed ?? '') && /^dpl_[A-Za-z0-9]+$/.test(payload.restore ?? '') && payload.failed !== payload.restore && sha256(payload.previousManifestSha256), 'invalid_rollback_payload');
      return provider(payload, async () => {
        await beforeMutation(payload.commit);
        await pointers(payload.failed);
        const deployment = await vercel(`/v13/deployments/${payload.restore}`); assertVercelDeploymentIdentity(deployment, target);
        await onceThenRead(['rollback', payload.restore, '--non-interactive']);
      }, async context => {
        const records = await settledPointers(payload.restore, payload.failed); await verifyPublic(payload.previousManifestSha256);
        return applied(context, { kind: 'vercel-rollback', pointers: records, restored: payload.restore, previousManifestSha256: payload.previousManifestSha256 });
      });
    },
    async discoverStage(operation) {
      const result = await this.stage(operation.payload).readback({ ...operation, payloadSha256: hash(JSON.stringify(operation.payload)) });
      check(result.status === 'applied', 'deployment_discovery_uncertain'); return result.proof;
    },
  };
}

export async function executeReleaseOperation(coordinator, operation) {
  // Never use execute as an automatic recovery retry. An uncertain durable
  // intent remains blocked; reconciliation is a separate explicit command/path.
  const receipt = await coordinator.execute(operation);
  check(receipt.status === 'confirmed', 'release_operation_not_confirmed');
  return receipt;
}
