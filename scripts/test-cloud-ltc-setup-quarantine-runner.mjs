import test from 'node:test';
import assert from 'node:assert/strict';
import { setupQuarantineFixture } from './lib/test-setup-quarantine-fixture.mjs';
import { hash } from './cloud-ltc-setup-quarantine.mjs';
import { applyOwnerSetupQuarantine } from './cloud-ltc-setup-quarantine-runner.mjs';
import { TARGET } from './cloud-ltc-release.mjs';

function fixture() {
  const f = setupQuarantineFixture();
  const previousManifest = [{ file: 'index.html', sha256: hash('original public bytes') }];
  const doc = f.document, plan = doc.acceptance.plan;
  plan.previousPublicManifestSha256 = hash(previousManifest);
  const ph = hash(plan), prefix = `accept-${ph.slice(0, 24)}`;
  doc.acceptance.planSha256 = ph;
  const original = Object.values(doc.intents); doc.intents = {}; doc.receipts = {};
  for (const intent of original) {
    intent.operationId = `${prefix}-${intent.payload.kind === 'vercel-stage' ? 'stage' : `e${intent.payload.artifactBundleIndex}`}`;
    intent.payload.acceptancePlanSha256 = ph; intent.payloadSha256 = hash(intent.payload); doc.intents[intent.operationId] = intent;
    if (intent.status === 'confirmed') doc.receipts[intent.operationId] = { receipt: structuredClone(intent), sha256: hash(intent) };
  }
  f.isolation.publicManifestSha256 = plan.previousPublicManifestSha256;
  f.isolation.linkedCliReadProof.previousManifestSha256 = plan.previousPublicManifestSha256;
  f.isolation.linkedCliReadProofSha256 = hash(f.isolation.linkedCliReadProof);
  f.decision.planSha256 = ph; f.decision.originalStateSha256 = hash(doc); f.decision.protectedIsolationSha256 = hash(f.isolation);
  Object.assign(f.archiveProof, { originalStateSha256: hash(doc), downloadedSha256: hash(doc), bytes: Buffer.byteLength(JSON.stringify(doc)) });
  f.decision.protectedArchiveProofSha256 = hash(f.archiveProof);
  Object.assign(f.decision.statement, { planSha256: ph, originalStateSha256: hash(doc), isolationSha256: hash(f.isolation), archiveProofSha256: hash(f.archiveProof) });
  f.decision.protectedDecisionSha256 = hash(f.decision.statement);
  const review = { decision: f.decision, isolation: f.isolation, archiveProof: f.archiveProof };
  const env = { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: TARGET.repository, GITHUB_ACTOR_ID: '268053325', GITHUB_RUN_ID: '124', GITHUB_RUN_ATTEMPT: '1', LTC_ACCEPTANCE_ENVIRONMENT: 'ltc-production', LTC_ACCEPTANCE_MANUAL: 'true', LTC_CLOUD_PUBLISH: 'false', LTC_ACCEPTANCE_FENCE: '1', LTC_ACCEPTANCE_PLAN_SHA256: ph, LTC_ACCEPTANCE_SOURCE_COMMIT: plan.source, LTC_ACCEPTED_IMPLEMENTATION_SHA256: f.decision.controllerImplementationSha256, LTC_SETUP_QUARANTINE_REVIEW_JSON: JSON.stringify(review) };
  const events = [], saved = [], flags = {};
  let current = { value: structuredClone(doc), version: 'original-revision' }, reads = 0, writes = 0;
  const stateAdapter = {
    async read(key) { assert.equal(key, 'website'); reads++; events.push(reads === 1 ? 'website-snapshot' : 'website-readback'); if (reads > 1 && flags.readbackMismatch) return { ...structuredClone(current), value: { ...current.value, paused: false } }; return structuredClone(current); },
    async conditionalWrite(key, value, version) { events.push('cas'); writes++; assert.equal(key, 'website'); assert.equal(version, 'original-revision');
      if (flags.conflict || version !== current.version) throw Error('state_conflict');
      if (flags.writeUncertain) throw Error('private provider write diagnostics');
      current = { value: structuredClone(value), version: 'next-revision' };
      if (flags.appliedThenLost) throw Error('private provider response lost');
      return current.version;
    },
  };
  const identity = { id: plan.previousDeployment, projectId: TARGET.project, ownerId: TARGET.team, team: { id: TARGET.team, slug: TARGET.scope }, readyState: 'READY', target: 'production', url: 'accepted-public.vercel.app' };
  const project = { id: TARGET.project, accountId: TARGET.team, name: 'https-github-com-satnam-satoshi-satoshi-langar', crons: { definitions: [] }, commandForIgnoringBuildStep: 'exit 0', link: { type: 'github', org: 'Khlnayak', repo: 'https-github.com-Satnam-Satoshi-Satoshi-Langar', repoId: 1246313844, productionBranch: 'main', sourceless: true, deployHooks: [] } };
  const social = { schemaVersion: 1, kind: 'ltc-cloud-social', paused: true, lease: null, records: {} };
  const origin = { id: 123, run_attempt: 1, status: 'completed', event: 'workflow_dispatch', head_branch: 'main', repository: { full_name: TARGET.repository }, path: '.github/workflows/ltc-daily-publication.yml' };
  const linkedRun = { ...structuredClone(origin), id: 125, actor: { id: 268053325 }, head_sha: 'd'.repeat(40), conclusion: 'failure' };
  const dependencies = {
    now: () => f.now,
    github: async endpoint => { if (endpoint === '/actions/runs/123/attempts/1') { events.push('origin'); return structuredClone(origin); } assert.equal(endpoint, '/actions/runs/125/attempts/1'); events.push('linked-read-run'); return structuredClone(linkedRun); },
    vercel: async endpoint => { if (endpoint === `/v9/projects/${TARGET.project}`) { events.push('project'); return structuredClone(project); } assert.ok(TARGET.domains.some(domain => endpoint === `/v13/deployments/${new URL(domain).hostname}`)); events.push('pointer'); return structuredClone(identity); },
    socialState: { inspect: async () => { events.push('social'); return structuredClone(social); } },
    verifyPublic: async manifest => { events.push('full-public'); assert.equal(hash(manifest), plan.previousPublicManifestSha256); if (flags.publicMismatch) throw Error('private URL/read diagnostic'); if (flags.changeRevision) current.version = 'concurrent-revision'; if (flags.expireFacts) f.now += 300001; },
    save: async record => { events.push(`save:${record.status}`); saved.push(structuredClone(record)); },
  };
  const apply = overrides => applyOwnerSetupQuarantine({ env, stateAdapter, review, previousManifest, dependencies, ...overrides });
  return { f, doc, review, env, stateAdapter, previousManifest, dependencies, project, social, identity, origin, linkedRun, events, flags, saved, apply, current: () => current, reads: () => reads, writes: () => writes };
}

test('all independent proofs precede one exact-revision CAS and exact readback; original UNKNOWN is never terminalized', async () => {
  const f = fixture(), original = JSON.stringify(f.doc), reviewBefore = JSON.stringify(f.review), result = await f.apply();
  assert.deepEqual(f.events, ['website-snapshot', 'origin', 'linked-read-run', 'project', 'pointer', 'pointer', 'social', 'full-public', 'save:prepared-awaiting-single-cas', 'cas', 'website-readback', 'save:owner-quarantined-unaccepted']);
  assert.equal(f.reads(), 2); assert.equal(f.writes(), 1); assert.equal(result.originalOutcome, 'UNKNOWN'); assert.equal(result.accepted, false); assert.equal(result.productionAuthorized, false); assert.equal(result.newFence, 2); assert.equal(result.activeLeaseRetired, true); assert.equal(Object.hasOwn(result, 'leaseReleased'), false);
  const next = f.current().value, incident = next.retiredSetupIncidents[result.incidentSha256]; assert.equal(next.paused, true); assert.equal(next.lease, null); assert.equal(incident.unknownStage.status, 'uncertain'); assert.equal(incident.outcome, 'UNKNOWN'); assert.deepEqual(incident.bannedOperationIds.length, 37); assert.equal(incident.originalStateSha256, hash(original)); assert.equal(JSON.stringify(f.review), reviewBefore); assert.equal(JSON.stringify(f.doc), original);
  assert.ok(!JSON.stringify(result).includes('private')); assert.equal(f.saved.at(-1).status, 'owner-quarantined-unaccepted');
});
test('runtime decision identities may only be filled from actual context; supplied mismatch is rejected', async () => {
  const f = fixture(); delete f.review.decision.decisionRunId; delete f.review.decision.decisionAttempt; f.env.LTC_SETUP_QUARANTINE_REVIEW_JSON = JSON.stringify(f.review);
  const result = await f.apply(); const decision = f.current().value.retiredSetupIncidents[result.incidentSha256].decision;
  assert.equal(decision.decisionRunId, '124'); assert.equal(decision.decisionAttempt, '1'); assert.equal(f.review.decision.decisionRunId, undefined);
  const other = fixture(); other.review.decision.decisionRunId = '999'; other.env.LTC_SETUP_QUARANTINE_REVIEW_JSON = JSON.stringify(other.review); await assert.rejects(other.apply(), /quarantine_runtime_run_mismatch/); assert.equal(other.reads(), 0);
});
test('missing protected approval, wrong actor/context/controller/source/plan/fence reject before private reads', async () => {
  for (const patch of [{ LTC_SETUP_QUARANTINE_REVIEW_JSON: undefined }, { GITHUB_ACTOR_ID: '222' }, { GITHUB_EVENT_NAME: 'schedule' }, { GITHUB_REF: 'refs/heads/other' }, { LTC_ACCEPTANCE_MANUAL: 'false' }, { LTC_CLOUD_PUBLISH: 'true' }, { LTC_ACCEPTED_IMPLEMENTATION_SHA256: 'f'.repeat(64) }, { LTC_ACCEPTANCE_SOURCE_COMMIT: 'f'.repeat(40) }, { LTC_ACCEPTANCE_PLAN_SHA256: 'f'.repeat(64) }, { LTC_ACCEPTANCE_FENCE: '2' }]) {
    const f = fixture(); await assert.rejects(f.apply({ env: { ...f.env, ...patch } })); assert.equal(f.reads(), 0); assert.equal(f.writes(), 0);
  }
  const f = fixture(); await assert.rejects(f.apply({ review: { ...f.review, archiveProof: { ...f.review.archiveProof, bytes: 1 } } }), /quarantine_review_pin_mismatch/); assert.equal(f.reads(), 0);
});
test('archive hash must cover the full captured value JSON, not a partial state or Docs envelope', async () => {
  for (const mutate of [f => { f.review.archiveProof.bytes--; }, f => { f.review.archiveProof.downloadedSha256 = hash('partial'); }, f => { f.review.archiveProof.originalStateSha256 = hash({ schemaVersion: 1, key: 'website', value: f.doc }); }]) {
    const f = fixture(); mutate(f); f.env.LTC_SETUP_QUARANTINE_REVIEW_JSON = JSON.stringify(f.review); await assert.rejects(f.apply(), /quarantine_archive_snapshot_mismatch/); assert.equal(f.writes(), 0); assert.deepEqual(f.events, ['website-snapshot']);
  }
});
test('wrong/running original attempt, project identity/name/policy/crons/hooks or public pointer fail before CAS', async () => {
  for (const mutate of [f => { f.origin.status = 'in_progress'; }, f => { f.origin.run_attempt = 2; }, f => { f.origin.path = 'other.yml'; }, f => { f.project.id = 'prj_other'; }, f => { f.project.accountId = 'team_other'; }, f => { f.project.name = 'other'; }, f => { f.project.crons.definitions = [{}]; }, f => { delete f.project.crons; }, f => { f.project.link.deployHooks = [{}]; }, f => { f.project.commandForIgnoringBuildStep = 'exit 1'; }, f => { f.identity.id = 'dpl_Other'; }, f => { f.identity.ownerId = 'team_other'; }]) {
    const f = fixture(); mutate(f); await assert.rejects(f.apply()); assert.equal(f.writes(), 0); assert.equal(f.reads(), 1); assert.equal(f.current().value.lease.fence, 1);
  }
});
test('conditional corrected-CLI proof requires a fresh exact founder/manual/main attempt before project reads or CAS', async () => {
  for (const mutate of [f => { f.linkedRun.id = 126; }, f => { f.linkedRun.run_attempt = 2; }, f => { f.linkedRun.status = 'in_progress'; }, f => { f.linkedRun.event = 'push'; }, f => { f.linkedRun.head_branch = 'agent/other'; }, f => { f.linkedRun.repository.full_name = 'Other/Repo'; }, f => { f.linkedRun.path = '.github/workflows/other.yml'; }, f => { f.linkedRun.actor.id = 222; }, f => { delete f.linkedRun.actor; }]) {
    const f = fixture(); mutate(f); await assert.rejects(f.apply(), /quarantine_linked_read_run_changed/); assert.equal(f.writes(), 0); assert.deepEqual(f.events, ['website-snapshot', 'origin', 'linked-read-run']);
  }
  const f = fixture(), get = f.dependencies.github;
  f.dependencies.github = async endpoint => { if (endpoint.includes('/125/')) throw Error('private provider diagnostics'); return get(endpoint); };
  await assert.rejects(f.apply(), /quarantine_linked_read_run_unavailable/); assert.equal(f.writes(), 0);
});
test('missing or wrongly bound environment-only read proof rejects before fresh provider reads even with repinned packet', async () => {
  for (const mutate of [f => { delete f.review.isolation.linkedCliReadProof; }, f => { f.review.isolation.linkedCliReadProof.authTransport = 'argv'; }, f => { f.review.isolation.linkedCliReadProof.controllerImplementationSha256 = 'f'.repeat(64); }, f => { f.review.isolation.linkedCliReadProof.deploymentSha256 = hash('different deployment'); }, f => { f.review.isolation.linkedCliReadProof.runId = '123'; }, f => { f.review.isolation.linkedCliReadProof.runId = '124'; }]) {
    const f = fixture(); mutate(f);
    if (f.review.isolation.linkedCliReadProof) f.review.isolation.linkedCliReadProofSha256 = hash(f.review.isolation.linkedCliReadProof);
    f.review.decision.protectedIsolationSha256 = hash(f.review.isolation); f.review.decision.statement.isolationSha256 = f.review.decision.protectedIsolationSha256; f.review.decision.protectedDecisionSha256 = hash(f.review.decision.statement); f.env.LTC_SETUP_QUARANTINE_REVIEW_JSON = JSON.stringify(f.review);
    await assert.rejects(f.apply(), /quarantine_linked_read_proof_required/); assert.equal(f.writes(), 0); assert.deepEqual(f.events, ['website-snapshot']);
  }
});
test('social active/unknown state, changed manifest or public bytes prevents CAS', async () => {
  for (const mutate of [f => { f.social.paused = false; }, f => { f.social.lease = {}; }, f => { f.social.records.pending = { status: 'create-uncertain' }; }, f => { f.social.records.pending = { status: 'unrecognized' }; }, f => { f.flags.publicMismatch = true; }]) {
    const f = fixture(); mutate(f); await assert.rejects(f.apply()); assert.equal(f.writes(), 0);
  }
  const f = fixture(); await assert.rejects(f.apply({ previousManifest: [{ file: 'index.html', sha256: hash('wrong bytes') }] }), /quarantine_public_manifest_mismatch/); assert.equal(f.writes(), 0);
  const denied = fixture(); denied.dependencies.verifyPublic = async () => false; await assert.rejects(denied.apply(), /quarantine_public_read_failed/); assert.equal(denied.writes(), 0);
});
test('timestamps/claims are never restamped; stale or future packet and expiry during proofs all fail', async () => {
  for (const field of ['decision', 'isolation', 'archiveProof']) {
    const f = fixture(); const target = f.review[field]; target[field === 'decision' ? 'preparedAt' : 'checkedAt'] = new Date(f.f.now - 300001).toISOString(); f.env.LTC_SETUP_QUARANTINE_REVIEW_JSON = JSON.stringify(f.review); const before = JSON.stringify(f.review); await assert.rejects(f.apply(), /quarantine_fresh_review_required/); assert.equal(JSON.stringify(f.review), before); assert.equal(f.writes(), 0);
  }
  const f = fixture(); f.flags.expireFacts = true; const before = JSON.stringify(f.review); await assert.rejects(f.apply()); assert.equal(JSON.stringify(f.review), before); assert.equal(f.writes(), 0);
});
test('CAS conflict has no retry or successful outcome, including revision changes during public verification', async () => {
  for (const flag of ['conflict', 'changeRevision']) { const f = fixture(); f.flags[flag] = true; await assert.rejects(f.apply(), /state_conflict/); assert.equal(f.writes(), 1); assert.equal(f.reads(), 1); assert.equal(f.current().value.lease.fence, 1); assert.equal(f.saved.at(-1).status, 'state_conflict'); }
});
test('uncertain write never retries, reads back or claims completion; original UNKNOWN survives either possible outcome', async () => {
  for (const flag of ['writeUncertain', 'appliedThenLost']) {
    const f = fixture(); f.flags[flag] = true; await assert.rejects(f.apply(), /quarantine_write_uncertain/); assert.equal(f.writes(), 1); assert.equal(f.reads(), 1); assert.equal(f.saved.at(-1).status, 'quarantine_write_uncertain');
    if (flag === 'writeUncertain') { assert.equal(f.current().value.lease.fence, 1); assert.ok(Object.values(f.current().value.intents).some(intent => intent.status === 'uncertain')); }
    else { assert.equal(f.current().value.unresolvedSetupIncident.outcome, 'UNKNOWN'); const before = f.writes(); await assert.rejects(f.apply(), /quarantine_archive_snapshot_mismatch/); assert.equal(f.writes(), before); }
  }
});
test('readback mismatch fails without another write or a success receipt', async () => {
  const f = fixture(); f.flags.readbackMismatch = true; await assert.rejects(f.apply(), /quarantine_readback_mismatch/); assert.equal(f.writes(), 1); assert.equal(f.reads(), 2); assert.equal(f.saved.some(record => record.status === 'owner-quarantined-unaccepted'), false);
});
