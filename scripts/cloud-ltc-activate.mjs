import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { acceptFirstFreshGeneration } from './cloud-ltc-generation.mjs';
import { assertReviewedMigrationAcceptance } from './cloud-ltc-migration-gate.mjs';
import { receiptHash as hash } from './cloud-ltc-acceptance-proof.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { TARGET, verifyImplementation, readReviewedMigrationConfiguration, acceptedSourceConfig, assertControls } from './cloud-ltc-release.mjs';
import { assertVercelProjectPolicy, assertVercelDeploymentIdentity } from './cloud-ltc-release-providers.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { createControlledPromotionRuntime } from './cloud-ltc-promotion-runtime.mjs';
import { loadPreviousReleaseManifest } from './cloud-ltc-production.mjs';

const check = (value, code) => { if (!value) throw Error(code); };
export async function activateReviewedDailyPublication({ env, configuration, state, dependencies }) {
  check(env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_REPOSITORY === TARGET.repository && env.GITHUB_ACTOR_ID === '268053325' && env.LTC_CLOUD_PUBLISH === 'true' && env.LTC_ACCEPTANCE_ENVIRONMENT === 'ltc-production' && env.LTC_ACCEPTANCE_MANUAL === 'true' && /^[1-9]\d*$/.test(env.GITHUB_RUN_ID ?? '') && /^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'migration_activation_owner_required');
  check(configuration && hash(configuration) === env.LTC_MIGRATION_ACCEPTANCE_SHA256 && state instanceof DurableCloudState && state.key === 'website', 'migration_acceptance_pending');
  const snapshot = await state.adapter.read('website');
  const document = await new DurableCloudState({ read: async () => snapshot }, 'website').inspect();
  const proof = assertReviewedMigrationAcceptance({ document, configuration, currentControllerImplementationSha256: env.LTC_ACCEPTED_IMPLEMENTATION_SHA256 });
  check(document.lease === null && Object.values(document.intents).every(intent => ['confirmed', 'not-applied'].includes(intent.status)), 'migration_activation_state_held');
  await dependencies.sourceControlCheck();
  const project = await dependencies.vercel(`/v9/projects/${TARGET.project}`); assertVercelProjectPolicy(project, TARGET);
  check(project.name === 'https-github-com-satnam-satoshi-satoshi-langar' && !project.rollingRelease && Array.isArray(project.crons?.definitions) && project.crons.definitions.length === 0, 'migration_activation_project_changed');
  const expected = document.latestRelease?.deployment ?? configuration.pins.stagePins.previousDeployment;
  for (const domain of TARGET.domains) { const deployment = await dependencies.vercel(`/v13/deployments/${new URL(domain).hostname}`); assertVercelDeploymentIdentity(deployment, TARGET); check(deployment.id === expected, 'migration_activation_pointer_changed'); }
  const manifest = await dependencies.currentManifest(document);
  await dependencies.verifyPublic(manifest);
  const next = structuredClone(document);
  acceptFirstFreshGeneration(next, {env});
  next.paused = false;
  next.migrationActivation = { schemaVersion: 1, configurationSha256: hash(configuration), stageCompletionSha256: configuration.pins.stagePins.completionSha256, promotionCompletionSha256: configuration.pins.completionSha256, controllerImplementationSha256: env.LTC_ACCEPTED_IMPLEMENTATION_SHA256, runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, publicDeployment: expected, publicManifestSha256: hash(manifest), localWriterCutoverSha256: proof.localWriterCutoverSha256, retainedUnknownAccepted: false, websiteOnly: true };
  await new DurableCloudState({ read: async () => ({ value: next }) }, 'website').inspect();
  await state.adapter.conditionalWrite('website', next, snapshot.version); // One CAS; no retry after ambiguity.
  check(hash((await state.adapter.read('website')).value) === hash(next), 'migration_activation_readback_mismatch');
  const result = { mode: 'reviewed-website-activation', status: 'website-durable-admission-enabled', configurationSha256: hash(configuration), publicationPerformed: false, socialActivationPerformed: false, retainedUnknownAccepted: false };
  await dependencies.save(result); return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = {};
    for (let n = 2; n < process.argv.length; n += 2) { const key = { '--state-config': 'website', '--social-state-config': 'social', '--evidence-config': 'evidence', '--receipt': 'receipt' }[process.argv[n]]; check(key && !options[key] && process.argv[n + 1], 'invalid_activation_arguments'); options[key] = process.argv[n + 1]; }
    check(['website', 'social', 'evidence', 'receipt'].every(key => options[key]), 'invalid_activation_arguments');
    const env = process.env; await verifyImplementation(process.cwd(), env.LTC_ACCEPTED_IMPLEMENTATION_SHA256);
    const configuration = readReviewedMigrationConfiguration(env); check(configuration, 'migration_acceptance_pending');
    const json = async file => JSON.parse(await readFile(file, 'utf8'));
    const config = await json(options.website), socialConfig = await json(options.social), evidenceConfig = await json(options.evidence), bindings = configuration.pins.stagePins.bindings;
    check(config.documentId === bindings.websiteDocumentId && config.folderId === bindings.folderId && socialConfig.documentId === bindings.socialDocumentId && socialConfig.folderId === bindings.folderId && socialConfig.ledgerKey === 'social', 'private_storage_required');
    const website = await createGoogleStateRuntime({ config, env }), social = await createGoogleStateRuntime({ config: socialConfig, env });
    const state = new DurableCloudState(website.stateAdapter, 'website'), directory = await mkdtemp(path.join(tmpdir(), 'ltc-reviewed-activation-'));
    await writeFile(options.receipt, JSON.stringify({ mode: 'reviewed-website-activation', status: 'starting', directory }) + '\n', { flag: 'wx', mode: 0o600 });
    const save = value => writeFile(options.receipt, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    const runtime = await createControlledPromotionRuntime({ env, review: { stagePins: configuration.pins.stagePins }, evidenceConfig, directory, save, socialState: { inspect: async () => (await social.stateAdapter.read('social')).value } });
    const accepted = acceptedSourceConfig(await json('config/ltc-cloud-source.json'));
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const result = await activateReviewedDailyPublication({ env, configuration, state, dependencies: { ...runtime,
      sourceControlCheck: async () => { const ref = await runtime.github(`/git/ref/heads/${accepted.branch}`), policy = await runtime.github(`/contents/config/ltc-publication.json?ref=${encodeURIComponent(accepted.branch)}`); assertControls({ policy: JSON.parse(Buffer.from(policy.content, 'base64')), cloudValue: 'true', remoteHead: ref.object?.sha, expectedHead: head }); },
      currentManifest: async document => document.latestRelease ? loadPreviousReleaseManifest({ state, evidenceConfig, env }) : (await runtime.restore(document.promotionAcceptance.stageSnapshot)).previousManifest,
    } }); console.log(JSON.stringify(result));
  } catch { console.error('reviewed_website_activation_withheld'); process.exitCode = 1; }
}
