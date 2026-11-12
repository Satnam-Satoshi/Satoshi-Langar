import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TARGET, acceptedSourceConfig, apiClients, controls, cleanEnvironment, verifyImplementation, builtManifest, builtOutputManifest, verifyPublicDomains, readReviewedMigrationConfiguration, assertMigrationAcceptance, requireDurableAdapter, releaseUnusedAdmission } from './cloud-ltc-release.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { assertFreshGenerationAdmission } from './cloud-ltc-generation.mjs';
import { assertVercelProjectPolicy } from './cloud-ltc-release-providers.mjs';
import { performCoordinatedRelease, loadPreviousReleaseManifest } from './cloud-ltc-production.mjs';
import { createPortableDeploymentWorkspace, createDurableVercelCommand } from './cloud-ltc-promotion-runtime.mjs';
import { createAcceptanceLinkedClient } from './cloud-ltc-acceptance.mjs';
import { assertSoftwareBaseline, validateSoftwareReview, assertSoftwareContext, assertSoftwarePublicData, softwareHash, validateSoftwareApiReadback, assertSoftwarePromotionWindow } from './lib/ltc-software-release.mjs';

const check = (value, code) => { if (!value) throw Error(code); };
const command = (root, file, args) => execFileSync(file, args, { cwd: root, env: cleanEnvironment(process.env), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 900000, maxBuffer: 32 * 1024 * 1024 });
const git = (root, args) => command(root, 'git', args).trim();
const json = async file => JSON.parse(await readFile(file, 'utf8'));

export function assertSoftwareActionsContext(env) {
  check(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === TARGET.repository && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_ACTOR_ID === '268053325' && env.GITHUB_WORKFLOW_REF === `${TARGET.repository}/.github/workflows/ltc-software-release.yml@refs/heads/main`, 'software_manual_context_required');
  check(env.LTC_SOFTWARE_RELEASE_ENABLED === 'true' && env.LTC_CLOUD_PUBLISH === 'true' && /^[1-9][0-9]{0,29}$/.test(env.GITHUB_RUN_ID ?? '') && /^[1-9][0-9]{0,5}$/.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'software_release_disabled');
}

export async function verifySoftwareVisualQa(github, runId, source) {
  const run = await github(`/actions/runs/${runId}`);
  check(run?.id?.toString() === runId && run.head_sha === source && run.repository?.full_name === TARGET.repository && run.head_repository?.full_name === TARGET.repository && run.path === '.github/workflows/site-visual-qa.yml' && run.status === 'completed' && run.conclusion === 'success', 'software_visual_qa_required');
  const artifacts = await github(`/actions/runs/${runId}/artifacts?per_page=100`);
  check(artifacts.total_count <= 100 && artifacts.artifacts?.some(item => item.name === `site-visual-qa-${source}` && item.expired === false && item.workflow_run?.head_sha === source), 'software_visual_artifact_required');
}

// Build and plan are credential-free. There are no collectors, content writes,
// Git pushes, social calls, acceptance changes or scheduler changes in this path.
export async function runSoftwareRelease(options, env = process.env) {
  const root = path.resolve(options.root ?? process.cwd());
  const expected = env.LTC_ACCEPTED_IMPLEMENTATION_SHA256;
  await verifyImplementation(root, expected);
  const source = git(root, ['rev-parse', 'HEAD']);
  check(source === options.source && !git(root, ['status', '--porcelain=v1', '--untracked-files=no']), 'software_source_changed');
  const acceptedSource = acceptedSourceConfig(await json(path.join(root, 'config/ltc-cloud-source.json')));
  git(root, ['merge-base', '--is-ancestor', acceptedSource.acceptedBaseline, source]);
  command(root, 'pnpm', ['install', '--frozen-lockfile']);
  command(root, 'pnpm', ['check']);
  command(root, 'pnpm', ['release:prepare']);
  await verifyImplementation(root, expected);
  check(!git(root, ['status', '--porcelain=v1', '--untracked-files=no']), 'software_source_changed');
  const manifest = await builtManifest(path.join(root, 'dist'));
  const buildOutput = await builtOutputManifest(path.join(root, '.vercel/output'));
  // Required API bundles/routes cannot disappear behind a successful static build.
  const config = await json(path.join(root, '.vercel/output/config.json'));
  for (const name of ['market-prices', 'litecoin-chain', 'litecoin-register', 'morpho-markets']) {
    check(config.routes?.some(route => route.src === `/api/${name}` && route.dest === `/api/${name}`), 'software_api_missing');
    for (const file of ['.vc-config.json', 'serve.cjs', 'bundle.cjs']) check(buildOutput.some(record => record.file === `functions/api/${name}.func/${file}`), 'software_api_missing');
  }
  const scratch = await mkdtemp(path.join(tmpdir(), 'ltc-software-'));
  const record = { schemaVersion: 1, mode: options.publish ? 'software-publish' : 'software-plan', source, implementationSha256: expected, artifactManifestSha256: softwareHash(manifest), buildOutputSha256: softwareHash(buildOutput), published: false, dailyPublished: false };
  const receipt = path.resolve(options.receipt ?? path.join(scratch, 'receipt.json'));
  await mkdir(path.dirname(receipt), { recursive: true });
  const save = async update => { Object.assign(record, update); await writeFile(receipt, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 }); };
  await save({ status: 'software-plan-ready' });
  if (!options.publish) return record;

  assertSoftwareActionsContext(env);
  check(options.stateConfig && options.evidenceConfig, 'software_private_configuration_required');
  const review = JSON.parse(env.LTC_SOFTWARE_RELEASE_REVIEW_JSON ?? 'null');
  check(softwareHash(review) === env.LTC_SOFTWARE_RELEASE_REVIEW_SHA256, 'software_review_hash_mismatch');
  const migration = readReviewedMigrationConfiguration(env);
  check(migration, 'migration_acceptance_pending');
  const { github, vercel } = apiClients(env);
  await controls(github, source, acceptedSource);
  await verifySoftwareVisualQa(github, review.visualQaRunId, source);
  const stateConfig = await json(path.resolve(options.stateConfig));
  const evidenceConfig = await json(path.resolve(options.evidenceConfig));
  const bindings = migration.pins.stagePins.bindings;
  check(stateConfig.documentId === bindings.websiteDocumentId && stateConfig.folderId === bindings.folderId && evidenceConfig.folderId === bindings.folderId && evidenceConfig.ownerPermissionId === bindings.ownerPermissionId, 'private_storage_required');
  const { stateAdapter } = await createGoogleStateRuntime({ config: stateConfig, env });
  requireDurableAdapter(stateAdapter);
  const state = new DurableCloudState(stateAdapter, 'website');
  const baseline = await state.inspect();
  assertMigrationAcceptance({ document: baseline, configuration: migration, currentControllerImplementationSha256: expected });
  assertSoftwareBaseline(baseline);
  git(root, ['merge-base', '--is-ancestor', baseline.latestRelease.source, source]);
  // --no-renames exposes both old and new names. Mode-only changes also appear.
  const changedPaths = command(root, 'git', ['diff', '--no-renames', '--name-only', '-z', baseline.latestRelease.source, source]).split('\0').filter(Boolean);
  const softwareRelease = validateSoftwareReview(review, { source, implementationSha256: expected, manifest, buildOutput, changedPaths, document: baseline, target: TARGET });
  const rollbackManifest = await loadPreviousReleaseManifest({ state, evidenceConfig, env });
  assertSoftwarePublicData(rollbackManifest, manifest);
  assertVercelProjectPolicy(await vercel(`/v9/projects/${TARGET.project}`), TARGET);
  let admission;
  try {
    const lease = await state.acquire(`software-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`, 3600000, document => {
      assertSoftwarePromotionWindow(review, state.clock());
      assertMigrationAcceptance({ document, configuration: migration, currentControllerImplementationSha256: expected });
      assertFreshGenerationAdmission(document, { env, now: state.clock() });
      assertSoftwareContext(document, softwareRelease, state.clock());
    });
    admission = { state, lease, firstFreshGeneration: null };
    const evidenceDirectory = path.join(scratch, 'evidence');
    await mkdir(evidenceDirectory, { mode: 0o700 });
    await writeFile(path.join(evidenceDirectory, 'software-review.json'), JSON.stringify({ review, softwareRelease }), { flag: 'wx', mode: 0o600 });
    const portable = await createPortableDeploymentWorkspace({ sourceRoot: root, directory: path.join(scratch, 'portable'), buildOutput });
    const linked = createAcceptanceLinkedClient({ env, vercel, directory: portable.root, report: async diagnostic => save({ safeCliFailure: diagnostic }) });
    await linked.verifyVersion();
    const cli = createDurableVercelCommand({ env, state, lease, vercel, linked, root: portable.root, verifyPromotionFreshness: async () => { assertSoftwarePromotionWindow(review); assertSoftwareContext(await state.inspect(), softwareRelease); } });
    const verifyBindings = async () => {
      assertSoftwareActionsContext(env);
      await verifyImplementation(root, expected);
      assertMigrationAcceptance({ document: await state.inspect(), configuration: migration, currentControllerImplementationSha256: expected });
      assertSoftwareContext(await state.inspect(), softwareRelease);
    };
    const result = await performCoordinatedRelease({
      admission, root, source, changes: [], editionId: softwareRelease.editionId, acceptedSource,
      startedAt: new Date().toISOString(), target: TARGET, github, vercel, cli,
      controls: commit => controls(github, commit, acceptedSource), verifyImplementation: verifyBindings,
      verifyMigration: verifyBindings,
      verifyBuildOutput: async () => { check(softwareHash(await builtOutputManifest(path.join(root, '.vercel/output'))) === softwareRelease.buildOutputSha256, 'software_artifact_changed'); await portable.verify(); },
      verifyProtected: async deployment => {
        await linked.readProtected(deployment, manifest, manifest);
        const apiReadbacks = {};
        for (const name of ['market-prices', 'litecoin-chain', 'litecoin-register', 'morpho-markets']) apiReadbacks[name] = validateSoftwareApiReadback(await linked.readProtectedApi(deployment, `/api/${name}`));
        await save({ apiReadbacks });
      },
      verifyPublic: expectedManifest => verifyPublicDomains(expectedManifest),
      manifest, buildOutput, rollbackManifest, evidenceDirectory, evidenceConfig,
      publicationProvenance: softwareRelease.publicationProvenance, softwareRelease, env, saveReceipt: save,
    });
    await save({ ...result, status: result.published ? 'software-published' : result.status });
    return record;
  } catch (error) {
    if (admission) await releaseUnusedAdmission(admission);
    // Any intent, ambiguous result, or post-effect failure retains the lease.
    await save({ status: 'software-release-withheld', failure: /^[a-z][a-z0-9_]{0,100}$/.test(error.message) ? error.message : 'software_release_failed' });
    throw Error(record.failure);
  }
}

function parseArgs(argv) {
  const result = { publish: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--publish') { result.publish = true; continue; }
    if (argv[i] === '--plan') continue;
    const key = { '--root': 'root', '--source': 'source', '--receipt': 'receipt', '--state-config': 'stateConfig', '--evidence-config': 'evidenceConfig' }[argv[i]];
    check(key && argv[i + 1] && !argv[i + 1].startsWith('--'), 'invalid_arguments'); result[key] = argv[++i];
  }
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) runSoftwareRelease(parseArgs(process.argv.slice(2))).then(record => console.log(JSON.stringify({ status: record.status, source: record.source, published: record.published, dailyPublished: false }))).catch(() => { console.error('Software release withheld; inspect the private receipt.'); process.exitCode = 1; });
