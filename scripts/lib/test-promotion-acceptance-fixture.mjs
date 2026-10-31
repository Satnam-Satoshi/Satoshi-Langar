import assert from 'node:assert/strict';
import { stageReceiptFixture } from './test-acceptance-proof-fixture.mjs';
import { receiptHash as hash } from '../cloud-ltc-acceptance-proof.mjs';
import { DurableCloudState, MemoryStateAdapter } from '../cloud-ltc-state.mjs';
import { TARGET } from '../cloud-ltc-release.mjs';

export async function promotionFixture() {
  const manifest = [{ file: 'index.html', sha256: hash('candidate bytes') }], previousManifest = [{ file: 'index.html', sha256: hash('previous bytes') }];
  const staged = stageReceiptFixture({ withIncident: true, candidateManifest: manifest, previousManifest });
  const review = { schemaVersion: 1, kind: 'founder-approved-controlled-promotion-rollback', approved: true, actorId: '268053325', approvedAt: '2026-10-31T00:00:00Z', approvalId: 'explicit-proof-1', controllerImplementationSha256: staged.currentControllerImplementationSha256,
    allProjectProductionAliasesApproved: true, temporaryPublicExposureApproved: true, rollbackRequired: true, productionAuthorized: false, allowReadOnlyReconciliation: true, action: 'exercise', stagePins: staged.pins,
    retainedIncident: { sha256: staged.pins.setupIncidentSha256, originalOutcome: 'UNKNOWN', accepted: false, productionAuthorized: false, allowedAction: 'controlled-promotion-rollback' } };
  const env = { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: TARGET.repository, GITHUB_ACTOR_ID: '268053325', GITHUB_RUN_ID: '125', GITHUB_RUN_ATTEMPT: '1', LTC_ACCEPTANCE_ENVIRONMENT: 'ltc-production', LTC_ACCEPTANCE_MANUAL: 'true', LTC_CLOUD_PUBLISH: 'false', LTC_ACCEPTED_IMPLEMENTATION_SHA256: staged.currentControllerImplementationSha256, LTC_CONTROLLED_PROMOTION_REVIEW_SHA256: hash(review) };
  const adapter = new MemoryStateAdapter(); await adapter.conditionalWrite('website', staged.document, null); const state = new DurableCloudState(adapter, 'website', { clock: () => Date.parse('2026-10-31T00:10:00Z') });
  const stage = Object.values(staged.document.intents).find(intent => intent.payload.kind === 'vercel-stage');
  const deployments = new Map(); const identity = id => ({ id, projectId: TARGET.project, ownerId: TARGET.team, team: { id: TARGET.team, slug: TARGET.scope }, readyState: 'READY', target: 'production', url: id === 'dpl_Candidate' ? 'fixture-candidate.vercel.app' : 'fixture-previous.vercel.app' });
  deployments.set('dpl_Candidate', { ...identity('dpl_Candidate'), meta: { ltcOperationId: stage.operationId, ltcPayloadSha256: stage.payloadSha256, ltcSourceCommit: staged.pins.source, ltcBuildOutputSha256: staged.document.acceptance.plan.buildOutputSha256 } }); deployments.set('dpl_Fixture', identity('dpl_Fixture'));
  let pointer = 'dpl_Fixture'; const events = [], saved = [], flags = {};
  const dependencies = {
    now: () => Date.parse('2026-10-31T00:10:00Z'), wait: async () => {},
    github: async endpoint => { const match = /^\/actions\/runs\/(\d+)\/attempts\/(\d+)$/.exec(endpoint); assert.ok(match); events.push(`github:${match[1]}`); return { id: Number(match[1]), run_attempt: Number(match[2]), status: flags.originRunning ? 'in_progress' : 'completed', conclusion: 'success', event: 'workflow_dispatch', head_branch: 'main', repository: { full_name: TARGET.repository }, path: '.github/workflows/ltc-daily-publication.yml', actor: { id: 268053325 } }; },
    vercel: async endpoint => { if (endpoint.startsWith('/v9/projects/')) return { id: TARGET.project, accountId: TARGET.team, name: 'https-github-com-satnam-satoshi-satoshi-langar', crons: { definitions: [] } }; const key = endpoint.split('/').at(-1); return deployments.get(TARGET.domains.some(domain => new URL(domain).hostname === key) ? pointer : key); },
    socialState: { inspect: async () => ({ paused: true, lease: null, records: {} }) },
    restore: async document => { assert.equal(hash(document), hash(staged.document)); events.push('restore'); return { manifest, previousManifest }; },
    verifyProtected: async (deployment, records) => { assert.equal(deployment.id, 'dpl_Candidate'); assert.equal(hash(records), hash(manifest)); events.push('protected'); },
    verifyPublic: async records => { const candidate = hash(records) === hash(manifest); assert.equal(pointer, candidate ? 'dpl_Candidate' : 'dpl_Fixture'); events.push(candidate ? 'public:candidate' : 'public:previous'); if (candidate && flags.badCandidateBytes) throw Error('mismatched candidate'); },
    mutate: async args => { events.push(args[0]); if (args[0] === 'promote') { pointer = 'dpl_Candidate'; if (flags.lostPromotion) throw Error('lost promote response'); } else if (args[0] === 'rollback') { pointer = 'dpl_Fixture'; if (flags.lostRollback) throw Error('lost rollback response'); } else assert.fail('unapproved effect'); },
    save: async record => { saved.push(structuredClone(record)); },
  };
  return { ...staged, review, env, state, dependencies, flags, events, saved, manifest, previousManifest, pointer: () => pointer };
}
