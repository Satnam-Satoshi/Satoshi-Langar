import { dailyPublicationFixture } from './lib/test-daily-publication-fixture.mjs';
import { softwareHash, assertSoftwarePromotionWindow } from './lib/ltc-software-release.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performCoordinatedRelease, confirmedStageFromState, assertReleaseCapacity } from './cloud-ltc-production.mjs';
import { releaseGeneration, generationEvidenceId } from './cloud-ltc-generation.mjs';
import { collectReleaseArtifacts } from './cloud-ltc-artifacts.mjs';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { encodeStateEnvelope } from './cloud-ltc-state-envelope.mjs';
import { assertDailyPublicationAvailable, DailyPublicationComplete, publicationDate } from './cloud-ltc-daily-admission.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
async function fixture({ uncertainStage = false, badPublishedBytes = false, uncertainPromotion = false, evidenceDiagnostic = false } = {}) {
  const scratch = await mkdtemp(path.join(tmpdir(), 'ltc-production-contract-')); const root = path.join(scratch, 'source'); const evidenceDirectory = path.join(scratch, 'evidence');
  await mkdir(root); await mkdir(evidenceDirectory);
  await writeFile(path.join(root, 'package.json'), '{}');
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' } }).trim();
  git(['init', '-q']); git(['add', '.']); git(['-c', 'commit.gpgsign=false', 'commit', '-qm', 'base']);
  const source = git(['rev-parse', 'HEAD']);
  for (const [file, bytes] of [['dist/index.html', 'new html'], ['.vercel/output/config.json', '{}'], ['.vercel/output/static/index.html', 'new html'], ['.vercel/output/functions/api.func/.vc-config.json', '{}'], ['.vercel/output/functions/api.func/index.js', 'export default () => {};']]) { const full = path.join(root, file); await mkdir(path.dirname(full), { recursive: true }); await writeFile(full, bytes); }
  await writeFile(path.join(evidenceDirectory, 'base.json'), '{"normalized":true}');
  const state = new DurableCloudState(new MemoryStateAdapter(), 'website'); await state.setPaused(false); const lease = await state.acquire('fixture-release', 3_600_000);
  const target = { project: 'prj_fixture', team: 'team_fixture', domains: ['https://first.example', 'https://second.example'] };
  const deployments = new Map(); let pointer = 'dpl_Previous'; let allocated = 0; const events = []; const saved = [];
  const identity = id => ({ id, projectId: target.project, ownerId: target.team, team: { id: target.team }, teamId: target.team, readyState: 'READY', target: 'production', url: `${id.toLowerCase().replaceAll('_', '-')}.vercel.app` });
  deployments.set(pointer, identity(pointer));
  const vercel = async endpoint => endpoint.startsWith('/v6/deployments') ? { deployments: [...deployments.values()].filter(record => record.meta), pagination: { next: null } } : deployments.get(endpoint.split('/').at(-1).endsWith('.example') ? pointer : endpoint.split('/').at(-1));
  const cli = async args => {
    events.push(args[0]);
    if (args[0] === 'deploy') { const meta = {}; for (let i = 0; i < args.length; i++) if (args[i] === '--meta') { const [key, value] = args[++i].split('='); meta[key] = value; } deployments.set('dpl_Candidate', { ...identity('dpl_Candidate'), meta }); if (uncertainStage) throw Error('lost stage response'); }
    if (args[0] === 'promote') { pointer = 'dpl_Candidate'; if (uncertainPromotion) throw Error('lost promotion response'); }
    if (args[0] === 'rollback') pointer = args[1];
  };
  const manifest = [{ file: 'index.html', sha256: hash('new html') }]; const rollbackManifest = [{ file: 'index.html', sha256: hash('old html') }];
  const options = {
    admission: { state, lease }, root, source, changes: [], editionId: '2026-10-30-r1', acceptedSource: { branch: 'agent/wall-street-20261011' }, startedAt: '2026-10-30T14:00:00Z', target,
    github: async () => { throw Error('no source changes means no GitHub mutations'); }, vercel, cli,
    controls: async expected => assert.equal(expected, source), verifyImplementation: async () => {}, verifyBuildOutput: async () => {},
    verifyProtected: async () => events.push('protected-readback'),
    verifyPublic: async expected => { const fresh = expected[0].sha256 === manifest[0].sha256; events.push(fresh ? 'new-public-readback' : 'old-public-readback'); if (fresh && badPublishedBytes) throw Error('deployed_artifact_mismatch'); },
    manifest, publicationProvenance: { editionSha256: hash('edition'), sourceDeskSha256: hash('desk'), dailyGraphicSha256: hash('graphic') }, buildOutput: [{ file: 'config.json', sha256: hash('{}') }, { file: 'static/index.html', sha256: hash('new html') }], rollbackManifest, evidenceDirectory,
    evidenceConfig: { folderId: 'fixture-folder', ownerPermissionId: 'fixture-owner' }, env: {},
    preallocateIds: async ({ count }) => Array.from({ length: count }, () => `file-fixture-${++allocated}`),
    evidenceProviderFactory: ({ bundle, config, onDiagnostic, beforeCreateAttempt }) => {
      let stored;
      return {
        async apply(context) {
          await beforeCreateAttempt(context);
          events.push('evidence-upload');
          if(evidenceDiagnostic){await onDiagnostic({phase:'upload-post',reason:'http-status',httpStatus:429,timedOut:false,postAttempted:true,raw:'PRIVATE_TOKEN response https://private.invalid/'});throw Error('PRIVATE_TOKEN provider response');}
          const intent = (await state.inspect()).intents[context.operationId];
          assert.equal(intent.status, 'uncertain');if(intent.payload.role==='release-artifacts'){assert.equal(intent.payload.generation,releaseGeneration(lease));assert.equal(intent.operationId,generationEvidenceId(releaseGeneration(lease),bundle.sha256));} assert.equal(intent.payload.fileId, config.fileId); assert.equal(intent.payload.sha256, bundle.sha256);
          stored = { operationId: context.operationId, payloadSha256: context.payloadSha256, status: 'applied', proof: { fileId: config.fileId, sha256: bundle.sha256, folderId: config.folderId, length: bundle.length, ownerOnly: true, downloadVerified: true } };
        },
        async readback(context) { return stored ?? { ...context, status: 'unknown' }; },
      };
    },
    saveReceipt: async update => { saved.push(structuredClone(update)); },
  };
  return { scratch, root, options, state, events, saved };
}

test('production wiring archives complete source/static/function evidence before staging and checkpoints next-run rollback manifest', async () => {
  const f = await fixture();
  try {
    const result = await performCoordinatedRelease(f.options);
    assert.equal(result.published, true);
    assert.ok(f.events.indexOf('evidence-upload') < f.events.indexOf('deploy'));
    assert.ok(f.events.indexOf('protected-readback') < f.events.indexOf('promote'));
    assert.ok(f.events.lastIndexOf('evidence-upload') > f.events.indexOf('new-public-readback'));
    const document = await f.state.inspect();
    assert.equal(document.lease, null); assert.equal(document.latestRelease.deployment, 'dpl_Candidate');
    assert.equal(document.latestRelease.artifactManifestSha256, hash(JSON.stringify(f.options.manifest)));
    const effectsBeforeDuplicate = [...f.events];
    const stateBeforeDuplicate = await f.state.backup();
    await assert.rejects(f.state.acquire('gha-duplicate-1',3_600_000,doc=>assertDailyPublicationAvailable(doc,publicationDate()),publicationDate()),DailyPublicationComplete);
    assert.deepEqual(f.events,effectsBeforeDuplicate);
    assert.deepEqual(await f.state.backup(),stateBeforeDuplicate);
    assert.ok(Object.values(document.intents).every(intent => intent.status === 'confirmed' && intent.payload && intent.proof));
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('uncertain stage leaves fenced lease and intent; no promotion, rollback or second deploy occurs', async () => {
  const f = await fixture({ uncertainStage: true });
  try {
    await assert.rejects(performCoordinatedRelease(f.options), /operation_outcome_uncertain/);
    assert.deepEqual(f.events.filter(event => ['deploy', 'promote', 'rollback'].includes(event)), ['deploy']);
    const document = await f.state.inspect(); assert.ok(document.lease);
    assert.equal(Object.values(document.intents).find(intent => intent.payload.kind === 'vercel-stage' && intent.operationId.startsWith('stage-')).status, 'uncertain');
    assert.equal(document.latestRelease, undefined);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('source implementation guard remains on the original checkout and is rechecked before deployment',async()=>{
 const f=await fixture();try{
  let checks=0;
  f.options.verifyImplementation=async()=>{checks++;assert.equal(await readFile(path.join(f.root,'package.json'),'utf8'),'{}','source implementation changed');};
  const factory=f.options.evidenceProviderFactory;
  f.options.evidenceProviderFactory=options=>{const provider=factory(options);return{...provider,apply:async context=>{await provider.apply(context);await writeFile(path.join(f.root,'package.json'),'{"changed":true}');}};};
  await assert.rejects(performCoordinatedRelease(f.options),/operation_outcome_uncertain/);
  assert(checks>=2);assert.equal(f.events.includes('deploy'),false);assert.equal(f.events.includes('promote'),false);
 }finally{await rm(f.scratch,{recursive:true,force:true});}
});

test('confirmed promotion with failed public bytes invokes separately fenced rollback', async () => {
  const f = await fixture({ badPublishedBytes: true });
  try {
    await assert.rejects(performCoordinatedRelease(f.options), /deployed_artifact_mismatch/);
    assert.deepEqual(f.events.filter(event => ['deploy', 'promote', 'rollback'].includes(event)), ['deploy', 'promote', 'rollback']);
    assert.ok(f.saved.some(record => record.status === 'rolled-back'));
    const document = await f.state.inspect(); assert.ok(document.lease); assert.equal(document.latestRelease, undefined);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('uncertain promotion never triggers automatic rollback even when service pointer changed', async () => {
  const f = await fixture({ uncertainPromotion: true });
  try {
    await assert.rejects(performCoordinatedRelease(f.options), /operation_outcome_uncertain/);
    assert.deepEqual(f.events.filter(event => ['deploy', 'promote', 'rollback'].includes(event)), ['deploy', 'promote']);
    assert.ok((await f.state.inspect()).lease);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('artifact collection preserves explicit hidden function configs and refuses source secrets and symlinks', async () => {
  const f = await fixture();
  try {
    const args = { root: f.root, staticDirectory: path.join(f.root, 'dist'), outputDirectory: path.join(f.root, '.vercel/output'), evidenceDirectory: f.options.evidenceDirectory };
    const files = await collectReleaseArtifacts(args);
    assert.ok(files.some(file => file.path === 'build-output/functions/api.func/.vc-config.json'));
    await writeFile(path.join(f.root, '.env'), 'must not be opened');
    await assert.rejects(collectReleaseArtifacts({ ...args, changedFiles: ['.env'] }), /credential_file_in_artifacts/);
    await assert.rejects(collectReleaseArtifacts({ ...args, changedFiles: ['.aws/credentials'] }), /credential_file_in_artifacts/);
    await symlink('index.html', path.join(f.root, 'dist/alias.html'));
    await assert.rejects(collectReleaseArtifacts(args), /non_regular_artifact_file/);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('exact same live bytes return no-op without archive upload, source write or deployment after compaction', async () => {
  const f = await fixture();
  try {
    f.options.manifest = f.options.rollbackManifest;
    const result = await performCoordinatedRelease(f.options);
    assert.equal(result.status, 'already-live'); assert.equal(result.published, false);
    assert.ok(!f.events.some(event => ['evidence-upload', 'deploy', 'promote', 'rollback'].includes(event)));
    assert.equal((await f.state.inspect()).lease, null);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('confirmed stage is consumed once: no second protected crawl can abort before promotion',async()=>{
 const f=await fixture();try{let reads=0;f.options.verifyProtected=async()=>{if(++reads>1)throw Error('second-protected-read-failed');};const result=await performCoordinatedRelease(f.options);assert.equal(result.published,true);assert.equal(reads,1);assert.deepEqual(f.events.filter(e=>['deploy','promote'].includes(e)),['deploy','promote']);}finally{await rm(f.scratch,{recursive:true,force:true});}
});
test('persisted stage proof requires exact current lease/fence, payload, leaf and immutable receipt',async()=>{
 const f=await fixture({badPublishedBytes:true});try{
  await assert.rejects(performCoordinatedRelease(f.options));const original=await f.state.inspect(),stage=Object.values(original.intents).find(i=>i.payload.kind==='vercel-stage');const operation={operationId:stage.operationId,payload:stage.payload};
  const candidate=await confirmedStageFromState({state:f.state,lease:f.options.admission.lease,operation});assert.equal(candidate.deployment,'dpl_Candidate');
  for(const change of [d=>d.lease.runId='other',d=>d.intents[stage.operationId].fence++,d=>d.intents[stage.operationId].status='uncertain',d=>d.intents[stage.operationId].payload.commit='f'.repeat(40),d=>d.intents[stage.operationId].proof.proof.source='f'.repeat(40),d=>d.receipts[stage.operationId].sha256='f'.repeat(64),d=>delete d.receipts[stage.operationId]]){
   const document=structuredClone(original);change(document);await assert.rejects(confirmedStageFromState({state:{inspect:async()=>document},lease:f.options.admission.lease,operation}),/confirmed_stage_receipt_invalid/);
  }
 }finally{await rm(f.scratch,{recursive:true,force:true});}
});

test('actual production evidence factory saves and logs only sanitized diagnostics before coordinator masks uncertainty',async t=>{
 const lines=[];t.mock.method(console,'error',line=>lines.push(line));const f=await fixture({evidenceDiagnostic:true});try{
  await assert.rejects(performCoordinatedRelease(f.options),/operation_outcome_uncertain/);
  const d=f.saved.find(v=>v.providerFailure)?.providerFailure;assert.deepEqual(d,{provider:'drive-evidence',phase:'upload-post',reason:'http-status',httpStatus:429,timedOut:false,postAttempted:true});
  assert.equal(lines.length,1);assert(!lines.join('').includes('PRIVATE_TOKEN'));assert(!JSON.stringify(f.saved).includes('PRIVATE_TOKEN'));assert.equal(Object.values((await f.state.inspect()).intents).filter(i=>i.status==='uncertain').length,1);assert(!f.events.includes('deploy'));
 }finally{await rm(f.scratch,{recursive:true,force:true});}
});

test('release capacity stops before allocating evidence IDs or authorizing effects', async () => {
  for (const [history, failure] of [
    ['x'.repeat(1_470_000), /state_capacity_exceeded/],
    ['\\'.repeat(700_000), /evidence_too_large/],
  ]) {
    const f = await fixture();
    try {
      const { value, version } = await f.state.adapter.read('website');
      value.fixtureHistory = history;
      await f.state.adapter.conditionalWrite('website', value, version);
      f.options.preallocateIds = async () => assert.fail('capacity must be checked before allocating evidence IDs');
      await assert.rejects(performCoordinatedRelease(f.options), failure);
      assert.deepEqual(f.events, ['old-public-readback']);
      assert.deepEqual((await f.state.inspect()).intents, {});
    } finally {
      await rm(f.scratch, { recursive: true, force: true });
    }
  }
});


test('release capacity reserves a 43-bundle generation against a representative recovered ledger', () => {
  const incident = { outcome: 'UNKNOWN', accepted: false };
  const document = { schemaVersion: 1, intents: {}, receipts: {}, incident, history: '' };
  document.history = 'r'.repeat(841_224 - Buffer.byteLength(JSON.stringify(document)));
  assert.equal(Buffer.byteLength(JSON.stringify(document)), 841_224);
  const plannedPayloads = Array.from({ length: 43 }, (_, index) => ({
    kind: 'drive-evidence', role: 'release-artifacts', generation: 'f23-1234567890abcdef',
    artifactPackageManifestSha256: hash('package'), artifactBundleCount: 43,
    artifactBundleIndex: index, fileId: 'x'.repeat(160), folderId: 'fixture-folder',
    sha256: hash(String(index)), bytes: 2_800_000,
  }));
  const manifest = Array.from({ length: 600 }, (_, index) => ({
    file: `conversations/example-${index}/index.html`, sha256: hash(String(index)), length: 50_000,
  }));
  const original = hash(JSON.stringify(document));
  assert.doesNotThrow(() => assertReleaseCapacity({ document, manifest, plannedPayloads }));
  assert.equal(hash(JSON.stringify(document)), original);
});


test('projected storage rejects a high-entropy ledger before its logical limit is exhausted', () => {
  const document = {
    schemaVersion: 1, intents: {}, receipts: {},
    history: randomBytes(637_500).toString('base64'),
  };
  const plannedPayloads = [{ kind: 'git-tree', entries: randomBytes(95_000).toString('base64') }];
  const logicalProjection = Buffer.byteLength(JSON.stringify(document)) +
    2 * Buffer.byteLength(JSON.stringify(plannedPayloads[0])) + 32_768 + 4_096;
  assert.ok(logicalProjection < 1_500_000);
  assert.doesNotThrow(() => encodeStateEnvelope('website', document));
  const projected = {
    ...document,
    intents: { tree: { payload: plannedPayloads[0] } },
    receipts: { tree: { receipt: { payload: plannedPayloads[0] } } },
  };
  assert.throws(() => encodeStateEnvelope('website', projected), /state_capacity_exceeded/);
  assert.throws(() => assertReleaseCapacity({ document, plannedPayloads, manifest: [] }), /state_capacity_exceeded/);
});

test('release preflight charges the actual provenance and continuation before alias effects', async () => {
  const f = await fixture();
  try {
    f.options.publicationProvenance.extra = 'x'.repeat(400_000);
    f.options.preallocateIds = async () => assert.fail('capacity must be checked before allocating evidence IDs');
    await assert.rejects(performCoordinatedRelease(f.options), /state_capacity_exceeded/);
    assert.deepEqual(f.events, ['old-public-readback']);
    const document = await f.state.inspect();
    assert.throws(() => assertReleaseCapacity({
      document, manifest: [], tailContext: { continuation: { detail: 'x'.repeat(400_000) } },
    }), /state_capacity_exceeded/);
  } finally {
    await rm(f.scratch, { recursive: true, force: true });
  }
});


test('a completed follow-up keeps the superseded retirement member immutable in capacity planning', () => {
  const original = { status: 'manual-admitted', archive: 'original UNKNOWN receipt;'.repeat(14_000) };
  const document = {
    schemaVersion: 1,
    history: 'stable retained records;'.repeat(14_000),
    routineUploadRetirement: original,
    routineUploadFollowupRetirement: { status: 'routine-enabled' },
    intents: { confirmed: { data: 'x'.repeat(57_000) } },
    receipts: { confirmed: { data: 'x'.repeat(61_000) } },
  };
  const plannedPayloads = Array.from({ length: 43 }, (_, index) => ({
    kind: 'drive-evidence', artifactBundleIndex: index, data: 'x'.repeat(540),
  }));
  const options = { document, plannedPayloads, manifest: [] };
  const before = hash(JSON.stringify(document));
  assert.doesNotThrow(() => assertReleaseCapacity(options));
  assert.equal(hash(JSON.stringify(document)), before);
  const withoutFollowup = { ...document };
  delete withoutFollowup.routineUploadFollowupRetirement;
  assert.throws(() => assertReleaseCapacity({ ...options, document: withoutFollowup }), /state_capacity_exceeded/);
});

test('capacity measures prior-fence terminal history exactly and reserves 43 bundles plus a source plan', () => {
  const fence = 25;
  const intents = {};
  const receipts = {};
  for (let index = 0; index < 87; index++) {
    const operationId = `artifact-${index}`;
    const status = index < 54 ? 'confirmed' : 'not-applied';
    const row = {
      operationId, fence: 23, status,
      payload: { kind: 'drive-evidence', id: hash(operationId), metadata: 'archived source evidence;'.repeat(37) },
      evidenceSha256: hash(status + operationId),
    };
    intents[operationId] = row;
    receipts[operationId] = { receipt: row, sha256: hash(JSON.stringify(row)) };
  }
  const document = { schemaVersion: 1, fence, intents, receipts, history: randomBytes(135_000).toString('base64'), padding: '' };
  document.padding = 'x'.repeat(995_454 - Buffer.byteLength(JSON.stringify(document)));
  const artifacts = Array.from({ length: 43 }, (_, index) => ({
    kind: 'drive-evidence', role: 'release-artifacts', generation: 'f25-1234567890abcdef',
    artifactPackageManifestSha256: hash('package'), artifactBundleCount: 43,
    artifactBundleIndex: index, fileId: 'x'.repeat(160), folderId: 'fixture-folder',
    sha256: hash(String(index)), bytes: 2_800_000,
  }));
  const source = Array.from({ length: 30 }, (_, index) => ({
    kind: 'git-blob', sha: hash(`blob-${index}`).slice(0, 40), sha256: hash(`bytes-${index}`), bytes: 100_000,
  }));
  source.push({ kind: 'git-tree', entries: source.map(({sha}, index) => ({ sha, path: `content/ltc/example-${index}.json` })) });
  source.push({ kind: 'git-commit', sha: hash('commit').slice(0, 40) }, { kind: 'git-ref', branch: 'agent/review', commit: hash('commit').slice(0, 40) });
  const options = { document, manifest: [], plannedPayloads: [...artifacts, ...source], tailContext: { deployment: 'x'.repeat(160), url: 'x'.repeat(253) } };
  const capacity = assertReleaseCapacity(options);
  assert.equal(capacity.logicalBytes, 995_454);
  assert.equal(capacity.storedCharacters, encodeStateEnvelope('website', document).length);
  assert.ok(capacity.projectedLogicalBytes < 1_500_000);
  assert.ok(capacity.projectedStoredCharacters < 900_000);

  // Changing only the fence makes the exact same history mutable, so the
  // conservative bound refuses the candidate before any provider effects.
  assert.throws(() => assertReleaseCapacity({ ...options, document: { ...document, fence: 23 } }), error => {
    assert.equal(error.message, 'state_capacity_exceeded');
    assert.ok(error.capacity.projectedStoredCharacters > 900_000);
    assert.ok(error.capacity.projectedLogicalBytes < 1_500_000);
    return true;
  });
});

async function softwareFixture({ today = false, ...faults } = {}) {
  const f = await fixture(faults);
  const stamp = new Date(Date.now() - (today ? 1000 : 26 * 3600000)).toISOString();
  const document = dailyPublicationFixture({ editionId: publicationDate(Date.parse(stamp)) + '-r1', verifiedAt: stamp });
  const preserved = { file: 'data/ltc-editions/index.json', sha256: hash('unchanged edition') };
  f.options.manifest.push(preserved); f.options.rollbackManifest.push(preserved);
  document.latestRelease.source = f.options.source;
  document.latestRelease.deployment = 'dpl_Previous';
  document.latestRelease.publicationProvenance = f.options.publicationProvenance;
  document.latestRelease.artifactManifestSha256 = hash(JSON.stringify(f.options.rollbackManifest));
  const current = await f.state.adapter.read('website');
  await f.state.adapter.conditionalWrite('website', document, current.version);
  const lease = await f.state.acquire('software-fixture', 3600000);
  Object.assign(f.options.admission.lease, lease);
  f.options.admission.firstFreshGeneration = null;
  f.options.editionId = document.latestRelease.editionId;
  f.options.softwareRelease = { schemaVersion: 1, kind: 'software-only', reviewSha256: 'a'.repeat(64), priorReleaseSha256: softwareHash(document.latestRelease), previousSource: f.options.source, previousDeployment: 'dpl_Previous', previousManifestSha256: document.latestRelease.artifactManifestSha256, editionId: f.options.editionId, dailyVerifiedAt: stamp, publicationProvenance: f.options.publicationProvenance, source: f.options.source, implementationSha256: 'b'.repeat(64), artifactManifestSha256: hash(JSON.stringify(f.options.manifest)), buildOutputSha256: hash(JSON.stringify(f.options.buildOutput)) };
  f.previous = structuredClone(document.latestRelease); return f;
}

test('software checkpoint compacts normally without consuming a fresh daily publication', async () => {
  for (const today of [false, true]) {
    const f = await softwareFixture({ today });
    try {
      const result = await performCoordinatedRelease(f.options);
      assert.equal(result.softwarePublished, true); assert.equal(result.dailyPublished, false);
      const document = await f.state.inspect();
      assert.equal(document.lease, null);
      assert.equal(document.latestRelease.verifiedAt, f.previous.verifiedAt);
      assert.equal(document.latestRelease.editionId, f.previous.editionId);
      assert.deepEqual(document.latestRelease.publicationProvenance, f.previous.publicationProvenance);
      assert.equal(document.latestRelease.artifactManifestSha256, hash(JSON.stringify(f.options.manifest)));
      assert.ok(Date.parse(document.latestRelease.softwareVerifiedAt) >= Date.parse(f.previous.verifiedAt));
      if (today) assert.throws(() => assertDailyPublicationAvailable(document, publicationDate()), DailyPublicationComplete);
      else assert.doesNotThrow(() => assertDailyPublicationAvailable(document, publicationDate()));
    } finally { await rm(f.scratch, { recursive: true, force: true }); }
  }
});

test('software stage uncertainty never replays or advances the daily checkpoint', async () => {
  const f = await softwareFixture({ uncertainStage: true });
  try {
    await assert.rejects(performCoordinatedRelease(f.options), /operation_outcome_uncertain/);
    assert.deepEqual(f.events.filter(event => ['deploy', 'promote', 'rollback'].includes(event)), ['deploy']);
    const document = await f.state.inspect(); assert.ok(document.lease); assert.deepEqual(document.latestRelease, f.previous);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('software verified promotion failure rolls back without changing the daily checkpoint', async () => {
  const f = await softwareFixture({ badPublishedBytes: true });
  try {
    await assert.rejects(performCoordinatedRelease(f.options), /deployed_artifact_mismatch/);
    assert.deepEqual(f.events.filter(event => ['deploy', 'promote', 'rollback'].includes(event)), ['deploy', 'promote', 'rollback']);
    assert.deepEqual((await f.state.inspect()).latestRelease, f.previous);
  } finally { await rm(f.scratch, { recursive: true, force: true }); }
});

test('expiration during failed public verification still permits the explicitly approved bounded rollback', async () => {
  const f=await softwareFixture({badPublishedBytes:true});
  try {
    let clock=Date.now();const review={expiryScope:'admission-and-first-promotion',expiresAt:new Date(clock+1000).toISOString()};
    const original=f.options.cli;
    f.options.cli=async args=>{if(args[0]==='promote')assertSoftwarePromotionWindow(review,clock);await original(args);if(args[0]==='promote')clock+=2000;};
    await assert.rejects(performCoordinatedRelease(f.options),/deployed_artifact_mismatch/);
    assert.throws(()=>assertSoftwarePromotionWindow(review,clock),/software_review_expired/);
    assert.deepEqual(f.events.filter(event=>['deploy','promote','rollback'].includes(event)),['deploy','promote','rollback']);
    assert.deepEqual((await f.state.inspect()).latestRelease,f.previous);
  } finally {await rm(f.scratch,{recursive:true,force:true});}
});
