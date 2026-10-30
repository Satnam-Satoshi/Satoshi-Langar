import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DurableCloudState, MemoryStateAdapter } from './cloud-ltc-state.mjs';
import { inspectPersistedOperations, createReadOnlyReleaseClients } from './cloud-ltc-reconcile.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
async function setup(payload, operationId = 'fixture-operation', pending = false) {
  const adapter = new MemoryStateAdapter(); const state = new DurableCloudState(adapter, 'website'); await state.setPaused(false); const lease = await state.acquire('recovery-fixture');
  await state.intend(lease, operationId, hash(JSON.stringify(payload)), payload); if (!pending) await state.assertMayMutate(lease, operationId);
  return { state, before: JSON.stringify(await state.inspect()) };
}
const defaults = { evidenceConfig: { folderId: 'selected-folder', ownerPermissionId: 'selected-owner' }, directory: '/unused-recovery-test-directory', getAccessToken: async () => { throw Error('unexpected token request'); }, readProtected: async () => { throw Error('unexpected protected request'); }, readPublic: async () => { throw Error('unexpected public request'); } };

test('read-only command proves a lost Git blob response by exact immutable bytes without clearing state or replay', async () => {
  const bytes = Buffer.from('exact immutable source'); const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  const payload = { kind: 'git-blob', sha, sha256: hash(bytes), bytes: bytes.length }; const { state, before } = await setup(payload);
  let calls = 0;
  const result = await inspectPersistedOperations({ ...defaults, state, github: async endpoint => { calls++; assert.equal(endpoint, `/git/blobs/${sha}`); return { sha, encoding: 'base64', content: bytes.toString('base64') }; } });
  assert.equal(result.results[0].observed, 'applied'); assert.equal(result.stateChanged, false); assert.equal(result.effectsReissued, false); assert.equal(result.leaseHeld, true); assert.equal(result.requiresExplicitReview, true);
  assert.equal(JSON.stringify(await state.inspect()), before); assert.equal(calls, 1);
});

test('missing proof remains unknown and pending intent is only reported not-authorized', async () => {
  const payload = { kind: 'git-blob', sha: 'a'.repeat(40), sha256: hash('expected'), bytes: 8 }; const uncertain = await setup(payload);
  const missing = await inspectPersistedOperations({ ...defaults, state: uncertain.state, github: async () => { throw Error('404 / private details'); } });
  assert.equal(missing.results[0].observed, 'unknown'); assert.equal(JSON.stringify(await uncertain.state.inspect()), uncertain.before);
  const pending = await setup(payload, 'pending-fixture', true); let calls = 0;
  const notAuthorized = await inspectPersistedOperations({ ...defaults, state: pending.state, github: async () => { calls++; } });
  assert.equal(notAuthorized.results[0].observed, 'not-authorized'); assert.equal(calls, 0); assert.equal(JSON.stringify(await pending.state.inspect()), pending.before);
});

test('Vercel read-only reconciliation requires restored exact manifests and protected bytes, never CLI mutations', async () => {
  const manifest = [{ file: 'index.html', sha256: hash('html') }];
  const payload = { kind: 'vercel-stage', editionId: '2026-10-30-r1', commit: 'a'.repeat(40), artifactManifestSha256: hash(JSON.stringify(manifest)), buildOutputSha256: hash('build'), artifactPackageManifestSha256: hash('complete package') };
  const operationId = 'stage-recovery-fixture'; const { state, before } = await setup(payload, operationId); let protectedReads = 0;
  const deployment = { id: 'dpl_Fixture', projectId: TARGET.project, ownerId: TARGET.team, team: { id: TARGET.team, slug: TARGET.scope }, readyState: 'READY', target: 'production', url: 'fixture.vercel.app', meta: { ltcOperationId: operationId, ltcPayloadSha256: hash(JSON.stringify(payload)), ltcSourceCommit: payload.commit, ltcBuildOutputSha256: payload.buildOutputSha256 } };
  const options = { ...defaults, state, vercel: async endpoint => endpoint.startsWith('/v6/deployments') ? { deployments: [deployment], pagination: { next: null } } : deployment,
    recoverManifests: async input => { assert.equal(input.artifactPackageManifestSha256, payload.artifactPackageManifestSha256); return { current: manifest, currentSha256: hash(JSON.stringify(manifest)) }; },
    readProtected: async (record, editionId, restored) => { protectedReads++; assert.equal(record.id, deployment.id); assert.equal(editionId, payload.editionId); assert.deepEqual(restored, manifest); },
  };
  assert.equal((await inspectPersistedOperations(options)).results[0].observed, 'applied'); assert.equal(protectedReads, 1); assert.equal(JSON.stringify(await state.inspect()), before);
  assert.equal((await inspectPersistedOperations({ ...options, recoverManifests: async () => { throw Error('missing archive piece'); } })).results[0].observed, 'unknown');
  assert.equal((await inspectPersistedOperations({ ...options, readProtected: async () => { throw Error('hash mismatch'); } })).results[0].observed, 'unknown');
});

test('provider clients are fixed-origin scoped GET-only and conceal authorization/network failures', async () => {
  const calls = [];
  const clients = createReadOnlyReleaseClients({ env: { GITHUB_TOKEN: 'fixture-github-token', VERCEL_TOKEN: 'fixture-vercel-token' }, fetcher: async (url, options) => { calls.push({ url, options }); return new Response('{}', { headers: { 'content-type': 'application/json' } }); } });
  await clients.github('/git/blobs/' + 'a'.repeat(40)); await clients.vercel('/v6/deployments?limit=1');
  for (const call of calls) { assert.equal(call.options.method, 'GET'); assert.equal(call.options.redirect, 'error'); }
  assert.equal(new URL(calls[0].url).origin, 'https://api.github.com'); assert.ok(new URL(calls[0].url).pathname.startsWith(`/repos/${TARGET.repository}/`));
  assert.equal(new URL(calls[1].url).searchParams.get('teamId'), TARGET.team);
  await assert.rejects(clients.github('https://evil.example'), /provider_read_authorization_required/);
  await assert.rejects(createReadOnlyReleaseClients({ env: {} }).github('/git/blobs/fixture'), /provider_read_authorization_required/);
});
