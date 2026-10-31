import { DurableCloudState } from './cloud-ltc-state.mjs';
import { buildOwnerQuarantinedSetupTransition, hash, FOUNDER_ACTOR_ID } from './cloud-ltc-setup-quarantine.mjs';
import { assertVercelProjectPolicy, assertVercelDeploymentIdentity } from './cloud-ltc-release-providers.mjs';
import { TARGET } from './cloud-ltc-release.mjs';

const check = (condition, code) => { if (!condition) throw Error(code); };
const plain = value => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fresh = (at, now) => Number.isFinite(Date.parse(at)) && Date.parse(at) <= now && now - Date.parse(at) <= 300_000;
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const projectName = 'https-github-com-satnam-satoshi-satoshi-langar';

function protectedReview(env, supplied) {
  check(env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_REPOSITORY === TARGET.repository && env.GITHUB_ACTOR_ID === FOUNDER_ACTOR_ID && env.LTC_ACCEPTANCE_ENVIRONMENT === 'ltc-production' && env.LTC_ACCEPTANCE_MANUAL === 'true' && env.LTC_CLOUD_PUBLISH === 'false', 'quarantine_protected_context_required');
  check(/^[1-9]\d*$/.test(env.GITHUB_RUN_ID ?? '') && /^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT ?? '') && /^[1-9]\d*$/.test(env.LTC_ACCEPTANCE_FENCE ?? '') && Number.isSafeInteger(Number(env.LTC_ACCEPTANCE_FENCE)) && digest(env.LTC_ACCEPTANCE_PLAN_SHA256) && digest(env.LTC_ACCEPTED_IMPLEMENTATION_SHA256) && /^[a-f0-9]{40}$/.test(env.LTC_ACCEPTANCE_SOURCE_COMMIT ?? ''), 'quarantine_protected_pins_required');
  const encoded = env.LTC_SETUP_QUARANTINE_REVIEW_JSON;
  check(typeof encoded === 'string' && Buffer.byteLength(encoded) <= 65_536, 'quarantine_protected_review_required');
  let pinned;
  try { pinned = JSON.parse(encoded); } catch { throw Error('quarantine_protected_review_required'); }
  check(plain(pinned) && Object.keys(pinned).sort().join(',') === 'archiveProof,decision,isolation' && plain(supplied) && hash(pinned) === hash(supplied), 'quarantine_review_pin_mismatch');
  const review = structuredClone(pinned), decision = review.decision;
  check(plain(decision) && decision.planSha256 === env.LTC_ACCEPTANCE_PLAN_SHA256 && decision.source === env.LTC_ACCEPTANCE_SOURCE_COMMIT && decision.fence === Number(env.LTC_ACCEPTANCE_FENCE) && decision.controllerImplementationSha256 === env.LTC_ACCEPTED_IMPLEMENTATION_SHA256, 'quarantine_protected_pins_required');
  for (const [key, value] of [['decisionRunId', env.GITHUB_RUN_ID], ['decisionAttempt', env.GITHUB_RUN_ATTEMPT]]) {
    check(!Object.hasOwn(decision, key) || decision[key] === value, 'quarantine_runtime_run_mismatch');
    decision[key] = value; // These two runtime identities are the only filled fields.
  }
  return review;
}

async function readOnly(call, code) {
  try { return await call(); } catch { throw Error(code); }
}

// Review-only controller. The trusted caller must verify its CURRENT source
// implementation before private config reads and supply protected environment
// pins. There is no CLI, provider apply, upload, acceptance or production action.
export async function applyOwnerSetupQuarantine({ env, stateAdapter, review, previousManifest, dependencies }) {
  const pinned = protectedReview(env, review);
  check(stateAdapter && typeof stateAdapter.read === 'function' && typeof stateAdapter.conditionalWrite === 'function' && dependencies && ['github', 'vercel', 'verifyPublic', 'save'].every(key => typeof dependencies[key] === 'function') && typeof dependencies.socialState?.inspect === 'function', 'quarantine_dependencies_required');
  const now = dependencies.now ?? Date.now;
  check(typeof now === 'function', 'quarantine_clock_required');
  const startedAt = now();
  check(Number.isFinite(startedAt) && fresh(pinned.decision.preparedAt, startedAt) && fresh(pinned.isolation?.checkedAt, startedAt) && fresh(pinned.isolation?.publicBaselineCheckedAt, startedAt) && fresh(pinned.archiveProof?.checkedAt, startedAt), 'quarantine_fresh_review_required');

  // Exactly one operational snapshot is captured. Validation reads this exact
  // in-memory revision, never a second snapshot that could change the subject.
  const snapshot = await readOnly(() => stateAdapter.read('website'), 'quarantine_state_read_failed');
  check(plain(snapshot?.value) && ((typeof snapshot.version === 'string' && snapshot.version.length > 0 && snapshot.version.length <= 2048) || (Number.isSafeInteger(snapshot.version) && snapshot.version > 0)), 'quarantine_snapshot_required');
  const captured = structuredClone(snapshot);
  const document = await new DurableCloudState({ read: async () => captured }, 'website').inspect();
  const originalBytes = JSON.stringify(document), originalHash = hash(originalBytes), plan = document.acceptance?.plan;
  check(plan && hash(plan) === env.LTC_ACCEPTANCE_PLAN_SHA256 && plan.source === env.LTC_ACCEPTANCE_SOURCE_COMMIT && document.fence === Number(env.LTC_ACCEPTANCE_FENCE) && pinned.decision.originalStateSha256 === originalHash && pinned.archiveProof.originalStateSha256 === originalHash && pinned.archiveProof.downloadedSha256 === originalHash && pinned.archiveProof.bytes === Buffer.byteLength(originalBytes), 'quarantine_archive_snapshot_mismatch');
  check(Array.isArray(previousManifest) && previousManifest.length > 0 && hash(previousManifest) === plan.previousPublicManifestSha256 && hash(previousManifest) === pinned.isolation.publicManifestSha256, 'quarantine_public_manifest_mismatch');
  // Fail structural/approval/archive/static-isolation checks before any provider
  // access. This does not replace the independent live reads below.
  buildOwnerQuarantinedSetupTransition({ document, ...pinned, now: startedAt });

  const origin = pinned.decision.origin;
  const run = await readOnly(() => dependencies.github(`/actions/runs/${origin.runId}/attempts/${origin.attempt}`), 'quarantine_origin_read_failed');
  const actualOrigin = { status: run?.status, runId: String(run?.id), attempt: String(run?.run_attempt), repository: run?.repository?.full_name, path: run?.path, event: run?.event, headBranch: run?.head_branch };
  check(Object.entries(actualOrigin).every(([key, value]) => pinned.isolation.origin[key] === value) && actualOrigin.status === 'completed', 'quarantine_origin_changed');
  // The owner-approved packet binds the actual environment-only read proof.
  // Independently verify that proof's exact attempt; a later failed stage lookup
  // may make its run conclusion non-success, so completed is required, not green.
  const linked = pinned.isolation.linkedCliReadProof;
  const linkedRun = await readOnly(() => dependencies.github(`/actions/runs/${linked.runId}/attempts/${linked.attempt}`), 'quarantine_linked_read_run_unavailable');
  check(String(linkedRun?.id) === linked.runId && String(linkedRun?.run_attempt) === linked.attempt && linkedRun.status === 'completed' && linkedRun.event === 'workflow_dispatch' && linkedRun.head_branch === 'main' && linkedRun.repository?.full_name === TARGET.repository && linkedRun.path === '.github/workflows/ltc-daily-publication.yml' && String(linkedRun.actor?.id) === FOUNDER_ACTOR_ID, 'quarantine_linked_read_run_changed');
  const project = await readOnly(() => dependencies.vercel(`/v9/projects/${TARGET.project}`), 'quarantine_project_read_failed');
  assertVercelProjectPolicy(project, TARGET);
  check(project.name === projectName && Array.isArray(project.crons?.definitions) && project.crons.definitions.length === 0 && pinned.isolation.projectCronCount === 0, 'quarantine_project_isolation_changed');
  const hooks = project.link ? project.link.deployHooks : [];
  check(Array.isArray(hooks) && hooks.length === 0 && pinned.isolation.deployHookCount === 0, 'quarantine_project_isolation_changed');
  for (const domain of TARGET.domains) {
    const deployment = await readOnly(() => dependencies.vercel(`/v13/deployments/${new URL(domain).hostname}`), 'quarantine_pointer_read_failed');
    assertVercelDeploymentIdentity(deployment, TARGET);
    check(deployment.id === plan.previousDeployment && deployment.id === pinned.isolation.previousDeployment, 'quarantine_public_pointer_changed');
  }
  const social = await readOnly(() => dependencies.socialState.inspect(), 'quarantine_social_read_failed');
  const statuses = new Set(['published', 'scheduled', 'sent', 'draft', 'reserved', 'error', 'failed', 'scheduled-verified', 'needs_approval', 'sending', 'create-uncertain', 'schedule-uncertain']);
  check(social?.schemaVersion === 1 && social.kind === 'ltc-cloud-social' && social.paused === true && social.lease === null && plain(social.records) && Object.values(social.records).every(record => plain(record) && statuses.has(record.status)), 'quarantine_social_isolation_changed');
  const unknown = Object.values(social.records).filter(record => ['sending', 'create-uncertain', 'schedule-uncertain'].includes(record.status)).length;
  check(pinned.isolation.socialPaused === social.paused && pinned.isolation.socialLease === social.lease && unknown === 0 && pinned.isolation.socialUnknownOperations === unknown, 'quarantine_social_isolation_changed');
  const publicRead = await readOnly(() => dependencies.verifyPublic(previousManifest), 'quarantine_public_read_failed');
  check(publicRead !== false, 'quarantine_public_read_failed');

  // Root's external webhook/integration/static-artifact and manual owner-Drive
  // archive attestations remain exactly as pinned, including their real times.
  // No project-token lookup is misrepresented as team-wide inspection, and no
  // manual archive receipt is represented as a cloud-identity restore.
  const transition = buildOwnerQuarantinedSetupTransition({ document, ...pinned, now: now() });
  const nextHash = hash(transition.nextDocument);
  const prepared = { mode: 'owner-setup-stage-quarantine', status: 'prepared-awaiting-single-cas', incidentSha256: transition.incidentSha256, originalStateSha256: originalHash, nextStateSha256: nextHash, originalOutcome: 'UNKNOWN', accepted: false, productionAuthorized: false, newFence: transition.nextDocument.fence };
  await readOnly(() => dependencies.save(prepared), 'quarantine_receipt_save_failed');
  try { await stateAdapter.conditionalWrite('website', transition.nextDocument, captured.version); }
  catch (error) {
    const code = error?.message === 'state_conflict' ? 'state_conflict' : 'quarantine_write_uncertain';
    try { await dependencies.save({ ...prepared, status: code }); } catch {}
    throw Error(code); // No retry, clear, terminalization or automatic rerun.
  }
  const readback = await readOnly(() => stateAdapter.read('website'), 'quarantine_readback_unavailable');
  check(plain(readback?.value) && hash(readback.value) === nextHash, 'quarantine_readback_mismatch');
  await new DurableCloudState({ read: async () => readback }, 'website').inspect();
  const result = { mode: 'owner-setup-stage-quarantine', status: 'owner-quarantined-unaccepted', incidentSha256: transition.incidentSha256, originalOutcome: 'UNKNOWN', accepted: false, productionAuthorized: false, newFence: transition.nextDocument.fence, activeLeaseRetired: true };
  await readOnly(() => dependencies.save(result), 'quarantine_receipt_save_failed');
  return result;
}
