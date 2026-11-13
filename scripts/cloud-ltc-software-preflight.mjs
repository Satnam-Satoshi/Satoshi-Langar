// Diagnostic only. Execute from a separately reviewed trusted control checkout;
// --root identifies the unchanged, pinned artifact checkout. No publication API.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const GUARDS = Object.freeze(['source_identity','implementation','build_plan','review_hash','migration_configuration','remote_controls','visual_qa','private_bindings','private_runtime','baseline_read','migration_acceptance','software_baseline','source_ancestry','review_scope','rollback_manifest','protected_daily_data','project_policy','fresh_generation','promotion_window','software_context']);
const check = value => { if (!value) throw Error('preflight_invalid'); };
export function readonlyClient(client) {
  return (endpoint, method = 'GET', body) => {
    check(method === 'GET' && body === undefined);
    return client(endpoint, 'GET');
  };
}
export function readonlyState(state) {
  return Object.freeze({ inspect: () => state.inspect(), clock: () => state.clock() });
}
export function denyWrite() { throw Error('preflight_write_forbidden'); }
export async function inspectNamedGuards(steps, report = () => {}) {
  check(steps.length === GUARDS.length && steps.every((step, index) => step.name === GUARDS[index] && typeof step.check === 'function'));
  const results = [];
  for (const step of steps) {
    try { await step.check(); results.push({ guard: step.name, status: 'passed' }); }
    catch { results.push({ guard: step.name, status: 'failed' }); }
    // Never output exceptions, API responses, review objects or resource IDs.
    await report({ ...results.at(-1) });
    if (results.at(-1).status === 'failed') return { status: 'preflight-withheld', published: false, results };
  }
  return { status: 'preflight-passed', published: false, results };
}
export function assertPreflightContext(env) {
  check(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === 'Satnam-Satoshi/Satoshi-Langar' && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_ACTOR_ID === '268053325' && env.GITHUB_WORKFLOW_REF === 'Satnam-Satoshi/Satoshi-Langar/.github/workflows/ltc-software-preflight.yml@refs/heads/main');
  // Deliberately no release gate check or activation. This cannot publish.
}
export async function preflight(options, env = process.env, report) {
  assertPreflightContext(env);
  const root = path.resolve(options.root);
  check(/^[a-f0-9]{40}$/.test(options.source ?? ''));
  // Verify the exact artifact source before importing its reviewed code.
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
  check(git(['rev-parse','HEAD']) === options.source && !git(['status','--porcelain=v1','--untracked-files=no']));
  const load = file => import(pathToFileURL(path.join(root, 'scripts', file)).href);
  const release = await load('cloud-ltc-release.mjs');
  const software = await load('cloud-ltc-software-release.mjs');
  const lib = await load('lib/ltc-software-release.mjs');
  const { DurableCloudState } = await load('cloud-ltc-state.mjs');
  const { createGoogleStateRuntime } = await load('cloud-ltc-google-runtime.mjs');
  const { loadPreviousReleaseManifest } = await load('cloud-ltc-production.mjs');
  const { assertVercelProjectPolicy } = await load('cloud-ltc-release-providers.mjs');
  const { assertFreshGenerationAdmission } = await load('cloud-ltc-generation.mjs');
  const json = async file => JSON.parse(await readFile(file, 'utf8'));
  const expected = env.LTC_ACCEPTED_IMPLEMENTATION_SHA256;
  let acceptedSource, review, migration, github, vercel, stateConfig, evidenceConfig, state, baseline, manifest, buildOutput, changedPaths, context, rollback;
  const steps = [
    () => { check(git(['rev-parse','HEAD']) === options.source); },
    async () => { await release.verifyImplementation(root, expected); acceptedSource = release.acceptedSourceConfig(await json(path.join(root,'config/ltc-cloud-source.json'))); },
    async () => {
      // Existing plan returns before any credentialed guard or remote mutation.
      await software.runSoftwareRelease({ root, source: options.source, publish: false }, env);
      manifest = await release.builtManifest(path.join(root,'dist'));
      buildOutput = await release.builtOutputManifest(path.join(root,'.vercel/output'));
    },
    () => { review = JSON.parse(env.LTC_SOFTWARE_RELEASE_REVIEW_JSON ?? 'null'); check(lib.softwareHash(review) === env.LTC_SOFTWARE_RELEASE_REVIEW_SHA256); },
    () => { migration = release.readReviewedMigrationConfiguration(env); check(migration); const clients = release.apiClients(env); github = readonlyClient(clients.github); vercel = readonlyClient(clients.vercel); },
    () => release.controls(github, options.source, acceptedSource),
    () => software.verifySoftwareVisualQa(github, review.visualQaRunId, options.source),
    async () => { stateConfig = await json(path.resolve(options.stateConfig)); evidenceConfig = await json(path.resolve(options.evidenceConfig)); const b = migration.pins.stagePins.bindings; check(stateConfig.documentId === b.websiteDocumentId && stateConfig.folderId === b.folderId && evidenceConfig.folderId === b.folderId && evidenceConfig.ownerPermissionId === b.ownerPermissionId); },
    async () => { const { stateAdapter } = await createGoogleStateRuntime({ config: stateConfig, env, beforeWrite: denyWrite }); release.requireDurableAdapter(stateAdapter); state = readonlyState(new DurableCloudState(stateAdapter, 'website')); },
    async () => { baseline = await state.inspect(); },
    () => release.assertMigrationAcceptance({ document: baseline, configuration: migration, currentControllerImplementationSha256: expected }),
    () => lib.assertSoftwareBaseline(baseline),
    () => { git(['merge-base','--is-ancestor',baseline.latestRelease.source,options.source]); changedPaths = execFileSync('git',['diff','--no-renames','--name-only','-z',baseline.latestRelease.source,options.source],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean); },
    () => { context = lib.validateSoftwareReview(review,{source:options.source,implementationSha256:expected,manifest,buildOutput,changedPaths,document:baseline,target:release.TARGET}); },
    async () => { rollback = await loadPreviousReleaseManifest({state,evidenceConfig,env}); },
    () => lib.assertSoftwarePublicData(rollback,manifest),
    async () => assertVercelProjectPolicy(await vercel(`/v9/projects/${release.TARGET.project}`),release.TARGET),
    () => assertFreshGenerationAdmission(baseline,{env,now:state.clock()}),
    () => lib.assertSoftwarePromotionWindow(review,state.clock()),
    () => lib.assertSoftwareContext(baseline,context,state.clock()),
  ];
  return inspectNamedGuards(steps.map((fn,index)=>({name:GUARDS[index],check:fn})),report);
}
export function parsePreflightArgs(argv) {
  const result = {};
  for(let i=0;i<argv.length;i++) { const name = {'--root':'root','--source':'source','--state-config':'stateConfig','--evidence-config':'evidenceConfig'}[argv[i]]; check(name && argv[i+1] && !argv[i+1].startsWith('--') && result[name] === undefined); result[name]=argv[++i]; }
  check(Object.keys(result).length === 4); return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  preflight(parsePreflightArgs(process.argv.slice(2)),process.env,item=>console.log(JSON.stringify(item))).then(result=>{console.log(JSON.stringify(result));process.exitCode=result.status==='preflight-passed'?0:1;}).catch(()=>{console.error('preflight_context_or_source_invalid');process.exitCode=1;});
}
