import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { TARGET } from './cloud-ltc-release.mjs';
import { packageArtifactEvidence } from './cloud-ltc-evidence.mjs';
import { planSoftwareReviewEvidence } from './lib/ltc-recovery-manifest.mjs';
import { restoreSoftwareStageContext, verifySoftwareStageCandidate, softwareRecoveryArguments, safeSoftwareRecoveryFailure, softwareRecoveryFailureReceipt, softwareRecoveryInitialReceipt, softwareRecoverySuccessReceipt } from './cloud-ltc-resume-software.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const hash = value => sha(JSON.stringify(value));

function candidateFixture() {
  const manifest = [{ file: 'index.html', sha256: 'a'.repeat(64) }, { file: 'deep/index.html', sha256: 'b'.repeat(64) }];
  const buildOutput = [{ file: 'config.json', sha256: 'c'.repeat(64) }];
  const review = { stageOperationId: 'stage-test', artifactSource: '1'.repeat(40), candidateDeployment: 'dpl_Candidate',
    artifactPackageManifestSha256: '2'.repeat(64), artifactManifestSha256: hash(manifest), buildOutputSha256: hash(buildOutput) };
  const payload = { kind: 'vercel-stage', editionId: '2026-11-11-r1', artifactPackageManifestSha256: review.artifactPackageManifestSha256,
    commit: review.artifactSource, buildOutputSha256: review.buildOutputSha256, artifactManifestSha256: review.artifactManifestSha256 };
  const stage = { operationId: review.stageOperationId, payload, payloadSha256: hash(payload) };
  const deployment = { id: review.candidateDeployment, projectId: TARGET.project, ownerId: TARGET.team, team: { id: TARGET.team },
    readyState: 'READY', target: 'production', url: 'reviewed-candidate.vercel.app', meta: { ltcOperationId: stage.operationId,
      ltcPayloadSha256: stage.payloadSha256, ltcSourceCommit: review.artifactSource, ltcBuildOutputSha256: review.buildOutputSha256 } };
  const calls = [];
  const linked = {
    async readProtected(value, records, all) { calls.push(['manifest', value, records]); assert.deepEqual(records, manifest); assert.deepEqual(all, manifest); },
    async readProtectedApi(value, route) { calls.push(['api', route]); return Buffer.from('HTTP/2 200\r\ncontent-type: application/json\r\n\r\n' + JSON.stringify({ schemaVersion: 1, checkedAt: '2026-11-12T16:00:00Z' })); },
  };
  const vercel = async endpoint => { calls.push(['get', endpoint]); return endpoint.startsWith('/v6/') ? { deployments: [{ uid: deployment.id, meta: { ltcOperationId: stage.operationId } }], pagination: { next: null } } : structuredClone(deployment); };
  return { review, stage, manifest, buildOutput, deployment, calls, linked, vercel };
}

test('existing stage proof requires complete manifest and exactly all four API handlers', async () => {
  const f = candidateFixture(), proof = await verifySoftwareStageCandidate(f);
  assert.deepEqual(f.calls.map(c => c[0]), ['get', 'get', 'manifest', 'api', 'api', 'api', 'api', 'get', 'get']);
  assert.deepEqual(f.calls.filter(c => c[0] === 'manifest').flatMap(c => c[2]), f.manifest);
  assert.deepEqual(f.calls.filter(c => c[0] === 'api').map(c => c[1]), ['/api/market-prices', '/api/litecoin-chain', '/api/litecoin-register', '/api/morpho-markets']);
  assert.deepEqual(proof, { kind: 'vercel-stage', deployment: f.deployment.id, url: f.deployment.url, source: f.review.artifactSource,
    buildOutputSha256: f.review.buildOutputSha256, artifactManifestSha256: f.review.artifactManifestSha256 });
});

test('each metadata binding and deployment ownership must match before any protected read', async () => {
  for (const change of [f => f.deployment.id = 'dpl_Other', f => f.deployment.projectId = 'other', f => f.deployment.ownerId = 'other',
    f => f.deployment.team.id = 'other', f => f.deployment.readyState = 'BUILDING', f => f.deployment.target = 'preview',
    ...['ltcOperationId', 'ltcPayloadSha256', 'ltcSourceCommit', 'ltcBuildOutputSha256'].map(key => f => delete f.deployment.meta[key])]) {
    const f = candidateFixture(); change(f); await assert.rejects(verifySoftwareStageCandidate(f));
    assert.ok(f.calls.every(c => c[0] === 'get'));
  }
});

test('wrong artifact or stage payload is rejected before network', async () => {
  for (const change of [f => f.manifest.pop(), f => f.buildOutput[0].sha256 = 'd'.repeat(64),
    f => f.stage.payload.commit = '0'.repeat(40), f => f.stage.operationId = 'another', f => f.stage.payloadSha256 = 'f'.repeat(64)]) {
    const f = candidateFixture(); change(f); await assert.rejects(verifySoftwareStageCandidate(f), /candidate_changed/); assert.equal(f.calls.length, 0);
  }
});

test('partial static/API readback never produces a proof; unexpected provider errors remain failures', async () => {
  const staticFail = candidateFixture(); staticFail.linked.readProtected = async () => { throw Error('missing_page'); };
  await assert.rejects(verifySoftwareStageCandidate(staticFail), /missing_page/);
  for (let failAt = 0; failAt < 4; failAt++) {
    const f = candidateFixture(); let api = 0;
    f.linked.readProtectedApi = async () => api++ === failAt ? Buffer.from('HTTP/2 200\r\ncontent-type: text/html\r\n\r\nlogin') : Buffer.from('HTTP/2 503\r\ncontent-type: application/json\r\n\r\n{"schemaVersion":1,"checkedAt":"2026-11-12T16:00:00Z","status":"unavailable"}');
    await assert.rejects(verifySoftwareStageCandidate(f), /software_api_invalid/); assert.equal(api, failAt + 1);
  }
});

test('candidate metadata is rechecked after slow protected reads', async () => {
  const f = candidateFixture(); let reads = 0;
  const original = f.vercel;
  f.vercel = async endpoint => { if (endpoint.startsWith('/v13/') && ++reads === 2) f.deployment.meta.ltcSourceCommit = '0'.repeat(40); return original(endpoint); };
  await assert.rejects(verifySoftwareStageCandidate(f), /candidate_changed/); assert.equal(reads, 2);
});

function archiveFixture() {
  const originalReview = { approvalId: 'reviewed' }, originalContext = { kind: 'software-only', note: 'retained' };
  const files = [{ path: 'evidence/software-review.json', bytes: Buffer.from(JSON.stringify({ review: originalReview, softwareRelease: originalContext })) },
    { path: 'source/unneeded.bin', bytes: Buffer.alloc(4300000, 5) }, { path: 'source/unneeded-2.bin', bytes: Buffer.alloc(4300000, 8) }, { path: 'static/index.html', bytes: Buffer.from('page') },
    { path: 'build-output/static/index.html', bytes: Buffer.from('page') }, { path: 'build-output/config.json', bytes: Buffer.from('{}') }];
  const pkg = packageArtifactEvidence(files);
  const select = prefix => files.filter(f => f.path.startsWith(prefix)).map(f => ({ file: f.path.slice(prefix.length), sha256: sha(f.bytes) })).sort((a, b) => a.file.localeCompare(b.file));
  const manifest = select('static/'), buildOutput = select('build-output/'), previousManifest = [{ file: 'index.html', sha256: '0'.repeat(64) }];
  const evidenceConfig = { folderId: 'owner-folder', ownerPermissionId: 'owner-id' };
  const document = { intents: {}, receipts: {}, latestRelease: { artifactManifestSha256: hash(previousManifest) } };
  for (const [index, bundle] of pkg.bundles.entries()) {
    const payload = { kind: 'drive-evidence', role: 'release-artifacts', artifactBundleIndex: index, artifactBundleCount: pkg.bundles.length,
      artifactPackageManifestSha256: pkg.manifestSha256, fileId: `private-file-${index}`, folderId: evidenceConfig.folderId, sha256: bundle.sha256, bytes: bundle.length };
    const operationId = `archive-${index}`, proof = { operationId, payloadSha256: hash(payload), status: 'applied',
      proof: { fileId: payload.fileId, folderId: payload.folderId, sha256: payload.sha256, length: payload.bytes, ownerOnly: true, downloadVerified: true, ownerPermissionId: evidenceConfig.ownerPermissionId } };
    const row = { operationId, runId: 'software-43249080067-1', fence: 27, status: 'confirmed', payload, payloadSha256: hash(payload), proof, evidenceSha256: hash(proof) };
    document.intents[operationId] = row; document.receipts[operationId] = { receipt: structuredClone(row), sha256: hash(row) };
  }
  const review = { snapshotSha256: hash(document), origin: { runId: '43249080067', attempt: '1', fence: 27 }, artifactPartCount: pkg.bundles.length,
    artifactPackageManifestSha256: pkg.manifestSha256, artifactManifestSha256: hash(manifest), buildOutputSha256: hash(buildOutput),
    originalReviewSha256: hash(originalReview), originalContextSha256: hash(originalContext), bindings: { ...evidenceConfig } };
  const reads = [], download = async (receipt, options) => { reads.push(receipt.fileId); assert.equal(options.config.folderId, evidenceConfig.folderId); assert.equal(options.config.ownerPermissionId, evidenceConfig.ownerPermissionId); return { bundle: pkg.bundles[Number(receipt.fileId.split('-').at(-1))] }; };
  return { review, document, evidenceConfig, download, previousManifest, changedPaths: ['app/page.tsx'], pkg, reads, originalReview, originalContext };
}

test('selective restoration preserves archive receipts and downloads only independently pinned needed bundles', async () => {
  const f = archiveFixture(), before = structuredClone(f.document);
  const r = await restoreSoftwareStageContext(f);
  const plan = planSoftwareReviewEvidence(f.pkg.bundles[0], { artifactPackageManifestSha256: f.review.artifactPackageManifestSha256,
    staticManifestSha256: f.review.artifactManifestSha256, buildOutputSha256: f.review.buildOutputSha256 });
  assert.deepEqual(f.reads, [0, ...plan.downloadBundleIndexes].map(i => `private-file-${i}`));
  assert.ok(f.reads.length < f.pkg.bundles.length); assert.deepEqual(f.document, before);
  assert.deepEqual(r.originalReview, f.originalReview); assert.deepEqual(r.originalContext, f.originalContext); assert.deepEqual(r.previousManifest, f.previousManifest);
});

test('wrong snapshot, owner folder or prior manifest is rejected without accepting a restored context', async () => {
  for (const change of [f => f.review.snapshotSha256 = '0'.repeat(64), f => f.evidenceConfig.folderId = 'wrong',
    f => f.evidenceConfig.ownerPermissionId = 'wrong', f => f.previousManifest = [], f => f.review.originalReviewSha256 = 'f'.repeat(64)]) {
    const f = archiveFixture(); change(f); await assert.rejects(restoreSoftwareStageContext(f));
  }
});

test('receipt owner/status/hash/index corruption fails before downloads even when snapshot is repinned', async () => {
  for (const change of [f => f.document.intents['archive-0'].status = 'uncertain', f => f.document.receipts['archive-0'].sha256 = '0'.repeat(64),
    f => f.document.intents['archive-0'].proof.proof.ownerOnly = false, f => f.document.intents['archive-0'].payload.artifactBundleIndex = 99,
    f => delete f.document.receipts['archive-0']]) {
    const f = archiveFixture(); change(f); f.review.snapshotSha256 = hash(f.document); await assert.rejects(restoreSoftwareStageContext(f), /archive_changed/); assert.equal(f.reads.length, 0);
  }
});

test('missing or corrupt downloaded evidence is not synthesized or restored', async () => {
  for (const result of [null, {}, { bundle: { sha256: '0'.repeat(64) } }]) {
    const f = archiveFixture(); f.download = async () => result; await assert.rejects(restoreSoftwareStageContext(f), /download_unknown/);
  }
});

test('stage uniqueness scans all pages and rejects duplicates, wrong IDs, cycles, and incomplete listings', async () => {
  const f = candidateFixture(), base = f.vercel; let pages = 0;
  f.vercel = async endpoint => !endpoint.startsWith('/v6/') ? base(endpoint) : ++pages % 2 === 1
    ? { deployments: [], pagination: { next: 1234 } }
    : { deployments: [{ uid: f.deployment.id, meta: { ltcOperationId: f.stage.operationId } }], pagination: { next: null } };
  await verifySoftwareStageCandidate(f); assert.equal(pages, 4);
  for (const listing of [null, { deployments: [] }, { deployments: [{ uid: 'dpl_Wrong', meta: { ltcOperationId: 'stage-test' } }] },
    { deployments: Array(2).fill({ uid: 'dpl_Candidate', meta: { ltcOperationId: 'stage-test' } }) }, { deployments: [], pagination: { next: 1234 } }]) {
    const bad = candidateFixture(); bad.vercel = async () => listing; await assert.rejects(verifySoftwareStageCandidate(bad));
    assert.equal(bad.calls.length, 0);
  }
  const forever = candidateFixture(); let n = 0; forever.vercel = async () => ({ deployments: [], pagination: { next: ++n } });
  await assert.rejects(verifySoftwareStageCandidate(forever), /stage_not_unique/); assert.equal(n, 10);
});

test('static failure records exact ordinal/public path/hash but never raw error or partial success', async () => {
  const f = candidateFixture(), reports = [];
  f.save = async report => reports.push(report);
  f.linked.readProtected = async (deployment, records, all, onFailure) => {
    await onFailure({ phase: 'protected-manifest', ordinal: 2, total: 2, file: records[1].file,
      expectedSha256: records[1].sha256, code: 'secret raw provider response', httpStatus: 503 });
    throw Error('secret raw provider response');
  };
  await assert.rejects(verifySoftwareStageCandidate(f));
  assert.deepEqual(reports, [{ protectedFailure: { phase: 'protected-manifest', ordinal: 2, total: 2,
    file: f.manifest[1].file, expectedSha256: f.manifest[1].sha256, code: 'software_recovery_details_withheld', httpStatus: 503 } }]);
});

test('CLI requires all distinct paths, rejects duplicate or unknown arguments and missing values', () => {
  const argv = ['--review-file', '/tmp/review', '--state-config', '/tmp/state', '--evidence-config', '/tmp/evidence', '--receipt', '/tmp/receipt'];
  assert.deepEqual(softwareRecoveryArguments(argv), { review: '/tmp/review', state: '/tmp/state', evidence: '/tmp/evidence', receipt: '/tmp/receipt' });
  for (const args of [[], argv.slice(0, -1), [...argv, '--review-file', '/tmp/other'], [...argv, '--publish', 'true'], [...argv.slice(0, -1), '/tmp/state']]) assert.throws(() => softwareRecoveryArguments(args), /arguments_required/);
});

test('unsafe error text is withheld and runtime contains no build/deploy/Git-write path', async () => {
  assert.equal(safeSoftwareRecoveryFailure(Error('secret-value-DO-NOT-LOG')), 'software_recovery_details_withheld');
  assert.equal(safeSoftwareRecoveryFailure(Error('software_recovery_candidate_changed')), 'software_recovery_candidate_changed');
  const source = await readFile(new URL('./cloud-ltc-resume-software.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\.deploy\(|\bpnpm\b|\['push'|\['commit'|restoreArtifactEvidence|createPortableDeploymentWorkspace/);
  assert.match(source, /historicalStage, assertPromotionFreshness/);
  assert.match(source, /\['promote', 'rollback'\]\.includes\(args\[0\]\)/);
  assert.match(source, /requireDurableAdapter\(stateAdapter\)/);
});

test('failure receipt preserves uncertain claim, promotion, summary and rollback phases', () => {
  const error = Error('secret provider response');
  const before = softwareRecoveryFailureReceipt({ status: 'checking-existing-software-stage', published: false }, error);
  assert.equal(before.status, 'software-recovery-withheld'); assert.equal(before.publicationOutcome, 'not-attempted');
  assert.equal(before.requiresJournalReconciliation, false); assert.equal(before.failurePhase, 'checking-existing-software-stage');
  for (const phase of ['claiming-software-recovery-fence', 'applying-first-promotion', 'applying-verified-rollback', 'applying-final-private-summary', 'rolled-back']) {
    const receipt = { status: phase, fence: 28, published: false }, copy = structuredClone(receipt);
    const result = softwareRecoveryFailureReceipt(receipt, error);
    assert.equal(result.status, phase); assert.equal(result.failurePhase, phase); assert.equal(result.requiresJournalReconciliation, true);
    assert.equal(result.publicationOutcome, phase === 'rolled-back' ? 'rolled-back' : 'unconfirmed');
    assert.equal(result.failure, 'software_recovery_details_withheld'); assert.deepEqual(receipt, copy);
  }
});

test('receipt separates reviewed identity from a confirmed published deployment', () => {
  const { review } = candidateFixture(); review.controllerSource = '9'.repeat(40);
  const initial = softwareRecoveryInitialReceipt(review);
  assert.equal(initial.source, review.artifactSource); assert.equal(initial.controllerSource, review.controllerSource);
  assert.equal(initial.artifactManifestSha256, review.artifactManifestSha256); assert.equal(initial.buildOutputSha256, review.buildOutputSha256);
  assert.equal(initial.published, false); assert.equal(Object.hasOwn(initial, 'deployment'), false);
  assert.equal(Object.hasOwn(initial, 'candidateDeployment'), false);
  const result = { published: true, softwarePublished: true, dailyPublished: false, stageReissued: false,
    releaseCommit: review.artifactSource, candidateDeployment: review.candidateDeployment, recoveryFence: 28, originalFence: 27, operationReceipts: [] };
  const success = softwareRecoverySuccessReceipt(review, result);
  assert.equal(success.status, 'software-recovery-published'); assert.equal(success.publicationOutcome, 'published');
  assert.equal(success.requiresJournalReconciliation, false); assert.equal(success.deployment, review.candidateDeployment);
  assert.equal(success.source, review.artifactSource); assert.equal(success.controllerSource, review.controllerSource);
  assert.equal(success.artifactManifestSha256, review.artifactManifestSha256); assert.equal(success.buildOutputSha256, review.buildOutputSha256);
  assert.equal(success.recoveryFence, 28); assert.equal(success.artifactRebuilt, false);
  for (const change of [r => r.published = false, r => r.softwarePublished = false, r => r.dailyPublished = true, r => r.stageReissued = true,
    r => r.releaseCommit = review.controllerSource, r => r.candidateDeployment = 'dpl_Other', r => delete r.candidateDeployment]) {
    const invalid = structuredClone(result); change(invalid);
    assert.throws(() => softwareRecoverySuccessReceipt(review, invalid), /software_recovery_result_changed/);
  }
});
