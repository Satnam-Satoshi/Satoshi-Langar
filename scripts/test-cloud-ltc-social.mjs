import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createBufferMcpClient, BUFFER_TARGET, validateBufferArguments, planDailyCampaign, localSlot, CloudSocialLedger, createSocialPostProvider, assertCloudSocialAcceptance, probeBufferCloud, executePreparedCampaign, loadAcceptedSocialInputs, runCloudCampaign, publicBufferProbeStructure } from './cloud-ltc-social.mjs';
import { MemoryStateAdapter } from './cloud-ltc-state.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const token = 'unit-test-buffer-key-never-real';
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const str = { type: 'string' };
const properties = {
  get_account: object({}), list_channels: object({ organizationId: str }),
  list_posts: { ...object({ organizationId: str, channelIds: { type: 'array', items: str }, status: { type: 'array', items: str }, first: { type: 'integer', maximum: 100 } }), properties: { organizationId: str, channelIds: { type: 'array', items: str }, status: { type: 'array', items: str }, first: { type: 'integer', maximum: 100 }, after: str } },
  get_post: object({ postId: str }),
  create_post: { type: 'object', properties: { channelId: str, schedulingType: { enum: ['automatic', 'notification'] }, text: str, assets: { type: 'array', items: object({ type: { enum: ['image'] }, url: { type: 'string', format: 'uri' }, altText: str }) }, saveToDraft: { type: 'boolean' }, metadata: { type: 'object' } }, required: ['channelId', 'schedulingType', 'text', 'assets', 'saveToDraft'], additionalProperties: false },
  edit_post: object({ postId: str, schedulingType: { enum: ['automatic'] }, mode: { enum: ['customScheduled'] }, dueAt: { type: 'string', format: 'date-time' }, saveToDraft: { type: 'boolean' } }),
};
function transport({ sse = false, failCall = null, status = null, incorrectId = false } = {}) {
  const calls = []; let session;
  const fetchImpl = async (url, options) => {
    assert.equal(url, BUFFER_TARGET.endpoint); assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, `Bearer ${token}`);
    const request = JSON.parse(options.body); calls.push({ ...request, headers: options.headers });
    if (request.method !== 'initialize') { assert.equal(options.headers['Mcp-Session-Id'], session); assert.equal(options.headers['MCP-Protocol-Version'], '2025-06-18'); }
    if (request.method === 'notifications/initialized') return new Response(null, { status: 202 });
    if (status && request.method === 'tools/call') return new Response(null, { status, headers: { 'retry-after': '30' } });
    if (failCall && request.method === 'tools/call') throw Error(`${token} private transport failure`);
    let result;
    if (request.method === 'initialize') { session = 'fixture-session'; result = { protocolVersion: '2025-06-18', capabilities: { tools: {} } }; }
    else if (request.method === 'tools/list') result = { tools: [...Object.entries(properties).map(([name, inputSchema]) => ({ name, inputSchema })), { name: 'graphql', inputSchema: object({ query: str }) }] };
    else {
      const name = request.params.name;
      const data = name === 'get_account' ? { organizations: [{ id: BUFFER_TARGET.organization }], timezone: 'America/New_York' } : name === 'list_channels' ? { channels: [{ id: BUFFER_TARGET.channels.x, service: 'twitter', isDisconnected: false }, { id: BUFFER_TARGET.channels.instagram, service: 'instagram', connectionStatus: 'connected' }] } : name === 'list_posts' ? { posts: [], pageInfo: { hasNextPage: false } } : {};
      result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
    const body = { jsonrpc: '2.0', id: incorrectId && request.method === 'tools/call' ? request.id + 100 : request.id, result };
    return new Response(sse ? `: heartbeat\n\ndata: ${JSON.stringify(body)}\n\n` : JSON.stringify(body), { headers: { 'content-type': sse ? 'text/event-stream' : 'application/json', ...(request.method === 'initialize' ? { 'mcp-session-id': session } : {}) } });
  };
  return { calls, fetchImpl };
}
test('official MCP initialization/session/schema discovery supports bounded JSON and SSE; probe never writes', async () => {
  for (const sse of [false, true]) {
    const f = transport({ sse }); const client = createBufferMcpClient({ env: { LTC_BUFFER_API_KEY: token }, fetchImpl: f.fetchImpl });
    const receipt = await probeBufferCloud({ client });
    assert.equal(receipt.writesPerformed, false); assert.equal(receipt.cloudPublishingActive, false);
    assert.equal(Object.keys(receipt.schemaHashes).length, 6);
    assert.deepEqual(f.calls.map(call => call.method), ['initialize', 'notifications/initialized', 'tools/list', 'tools/call', 'tools/call', 'tools/call']);
    assert.ok(f.calls.filter(call => call.method === 'tools/call').every(call => ['get_account', 'list_channels', 'list_posts'].includes(call.params.name)));
    assert.ok(!JSON.stringify(receipt).includes(token));
  }
});
test('no credential discovery, generic tools, unknown posts, wrong accounts or undiscovered arguments', async () => {
  assert.throws(() => createBufferMcpClient({ env: {} }), /buffer_cloud_key_required/);
  const f = transport(); const client = createBufferMcpClient({ env: { LTC_BUFFER_API_KEY: token }, fetchImpl: f.fetchImpl });
  await assert.rejects(client.callTool('get_account', {}), /buffer_tool_not_discovered/); await client.discover();
  await assert.rejects(client.callTool('graphql', { query: 'mutation' }), /buffer_tool_not_discovered/);
  await assert.rejects(client.callTool('list_channels', { organizationId: 'another-account' }), /wrong_buffer_organization/);
  await assert.rejects(client.callTool('get_post', { postId: 'a'.repeat(24) }), /unknown_buffer_post_id/);
  await assert.rejects(client.callTool('get_account', { ignored: true }), /buffer_arguments_invalid/);
  assert.equal(f.calls.filter(call => call.method === 'tools/call').length, 0);
});
test('write opt-in, accepted discovered schemas, exact channel and future custom schedule are enforced', async () => {
  const f = transport(); const client = createBufferMcpClient({ env: { LTC_BUFFER_API_KEY: token }, fetchImpl: f.fetchImpl }); await client.discover();
  const args = { channelId: BUFFER_TARGET.channels.x, schedulingType: 'automatic', text: 'private', assets: [], saveToDraft: true };
  await assert.rejects(client.callTool('create_post', args), /buffer_cloud_writes_disabled/);
  const unaccepted = createBufferMcpClient({ env: { LTC_BUFFER_API_KEY: token }, fetchImpl: transport().fetchImpl, allowWrites: true }); await unaccepted.discover();
  await assert.rejects(unaccepted.callTool('create_post', args), /buffer_schema_acceptance_required/);
  assert.throws(assertCloudSocialAcceptance, /cloud_social_acceptance_pending/);
});
test('HTTP rate limit/session loss, mismatched responses and network failures never replay a call or expose key', async () => {
  for (const options of [{ status: 429 }, { status: 404 }, { incorrectId: true }, { failCall: true }]) {
    const f = transport(options); const client = createBufferMcpClient({ env: { LTC_BUFFER_API_KEY: token }, fetchImpl: f.fetchImpl }); await client.discover();
    await assert.rejects(client.callTool('get_account', {}), error => { assert.ok(!error.message.includes(token)); if (options.status === 429) assert.equal(error.retryAfterSeconds, 30); return true; });
    assert.equal(f.calls.filter(call => call.method === 'tools/call').length, 1);
  }
});
test('schema constraints validate actual discovered shapes and unknown validators fail closed', () => {
  assert.equal(validateBufferArguments(object({ channelId: { pattern: '^[a-f0-9]{24}$', type: 'string' } }), { channelId: BUFFER_TARGET.channels.x }), true);
  assert.throws(() => validateBufferArguments({ type: 'object', patternProperties: {} }, {}), /buffer_schema_unsupported/);
  assert.throws(() => validateBufferArguments(object({ date: { type: 'string', format: 'date-time' } }), { date: 'tomorrow' }), /buffer_arguments_invalid/);
});
async function planningInput() {
  const edition = JSON.parse(await readFile(new URL('../content/ltc/2026-10-15-r1.json', import.meta.url), 'utf8'));
  const sourceDesk = { schemaVersion: 1, id: 'source-desk-2026-10-15-r1', checkedAt: '2026-10-15T18:15:00Z', stories: [
    { id: 'policy-one', desk: 'Policy', title: 'Agency publishes a consultation notice', sourceName: 'SEC', url: 'https://www.sec.gov/news/a', publishedAt: '2026-10-15T12:00:00Z', checkedAt: '2026-10-15T18:15:00Z' },
    { id: 'builder-one', desk: 'Builders', title: 'Node software adds a documented upgrade', sourceName: 'LitVM', url: 'https://www.litvm.com/blog/upgrade', publishedAt: '2026-10-14', checkedAt: '2026-10-15T18:15:00Z' },
  ] };
  const graphic = { editionId: edition.id, width: 1200, height: 630, pngSha256: hash('original PNG') };
  return { edition, sourceDesk, graphic, canonicalLedger: { schemaVersion: 1, enabled: true, paused: false, timezone: 'America/New_York', posts: [] }, now: '2026-10-15T18:30:00Z', releaseProof: { status: 'verified-live', edition: edition.id, source: 'a'.repeat(40), editionSha256: hash(JSON.stringify(edition)), sourceDeskSha256: hash(JSON.stringify(sourceDesk)), dailyGraphicSha256: graphic.pngSha256, verifiedAt: '2026-10-15T18:15:00Z' } };
}
test('daily campaign is deterministic, date/source-specific, respects DST and never invents new breaking dates', async () => {
  const input = await planningInput(); const first = planDailyCampaign(input); assert.deepEqual(planDailyCampaign(input), first);
  assert.equal(first.posts.filter(post => post.platform === 'x').length, 3); assert.equal(first.posts.filter(post => post.platform === 'instagram').length, 1);
  assert.ok(first.posts.every(post => !/breaking|\$|@/i.test(post.text)));
  assert.ok(first.posts.some(post => post.text.includes('2026-10-14')));
  assert.equal(localSlot('2026-10-31', '10:45'), '2026-10-31T14:45:00.000Z'); assert.equal(localSlot('2026-11-01', '10:45'), '2026-11-01T15:45:00.000Z');
  assert.throws(() => planDailyCampaign({ ...input, now: '2026-10-16T18:30:00Z' }), /current_published_edition_required/);
  assert.throws(() => planDailyCampaign({ ...input, releaseProof: { ...input.releaseProof, editionSha256: hash('changed') } }), /published_evidence_proof_required/);
});
test('all canonical reservations consume caps, same source event is never duplicated and existing records stay untouched', async () => {
  const input = await planningInput();
  input.canonicalLedger.posts = Array.from({ length: 8 }, (_, i) => ({ key: `existing-${i}`, platform: i % 2 ? 'instagram' : 'x', date: i < 4 ? '2026-10-15' : i < 6 ? '2026-10-16' : '2026-10-17', type: 'owner-special', status: 'scheduled', bufferPostId: i.toString(16).padStart(24, '0'), dueAt: `2026-10-${i < 4 ? '15' : i < 6 ? '16' : '17'}T22:00:00Z` }));
  const saved = JSON.stringify(input.canonicalLedger); const plan = planDailyCampaign(input);
  assert.ok(plan.posts.filter(post => post.platform === 'x').length <= 2); assert.equal(plan.posts.filter(post => post.platform === 'instagram').length, 0);
  assert.equal(JSON.stringify(input.canonicalLedger), saved);
});
async function ledgerFixture(post, { migration = true } = {}) {
  const adapter = new MemoryStateAdapter(); const ledger = new CloudSocialLedger(adapter, { clock: () => Date.parse('2026-10-15T18:30:00Z') });
  if (migration) await adapter.conditionalWrite('social', { schemaVersion: 1, kind: 'ltc-cloud-social', paused: false, migration: { canonicalSha256: hash('canonical'), cutoverReceiptSha256: hash('accepted owner cutover') }, fence: 0, lease: null, records: {} }, null);
  const lease = migration ? await ledger.acquire('test-social-job', hash('canonical')) : null; return { ledger, lease, adapter };
}
test('durable reservation is CAS-safe; competing jobs and unknown outcomes hold rather than consume another slot', async () => {
  const post = planDailyCampaign(await planningInput()).posts[0]; const f = await ledgerFixture(post);
  const reserved = await Promise.allSettled([f.ledger.reserve(f.lease, post), f.ledger.reserve(f.lease, post)]); assert.ok(reserved.some(result => result.status === 'fulfilled'));
  assert.equal(Object.keys((await f.ledger.inspect()).records).length, 1);
  await f.ledger.authorize(f.lease, post.key, 'create');
  await assert.rejects(f.ledger.authorize(f.lease, post.key, 'create'), /social_reconciliation_required/);
  await assert.rejects(f.ledger.release(f.lease), /social_reconciliation_required/);
  await assert.rejects(f.ledger.acquire('competing-job', hash('canonical')), /social_lease_held/);
  await assert.rejects(f.ledger.reserve(f.lease, { ...post, text: 'changed', contentHash: hash('changed') }), /social_idempotency_conflict/);
});
test('canonical import is paused and preserves known future IDs; missing live reservation proof prevents migration', async () => {
  const adapter = new MemoryStateAdapter(); const ledger = new CloudSocialLedger(adapter);
  const canonical = { schemaVersion: 1, enabled: true, paused: false, timezone: 'America/New_York', posts: [{ key: 'reserved-owner', platform: 'x', date: '2026-10-30', status: 'scheduled', bufferPostId: 'a'.repeat(24) }] };
  await assert.rejects(ledger.importCanonical(canonical, { expectedSha256: hash(JSON.stringify(canonical)), verifiedPostIds: [] }), /social_migration_reconciliation_required/);
  await ledger.importCanonical(canonical, { expectedSha256: hash(JSON.stringify(canonical)), verifiedPostIds: ['a'.repeat(24)] });
  const document = await ledger.inspect(); assert.equal(document.paused, true); assert.equal(document.records['reserved-owner'].postId, 'a'.repeat(24));
  await assert.rejects(ledger.acquire('unaccepted-job', hash(JSON.stringify(canonical))), /social_cutover_required/);
});
test('post provider creates private draft once, saves ID immediately, schedules that same ID and reconciles a lost schedule response', async () => {
  const post = planDailyCampaign(await planningInput()).posts[0]; const f = await ledgerFixture(post); const calls = []; let saved; let loseSchedule = true;
  const client = { schema: name => properties[name], rememberPostId: () => {}, callTool: async (name, args) => {
    calls.push(name);
    if (name === 'create_post') { assert.equal((await f.ledger.inspect()).records[post.key].status, 'create-uncertain'); saved = { id: 'b'.repeat(24), channelId: post.channelId, text: post.text, assets: [{ source: post.mediaURL, altText: post.altText }], status: 'draft', allowedActions: ['editPost'] }; }
    if (name === 'edit_post') { assert.equal(args.postId, saved.id); saved = { ...saved, status: 'scheduled', dueAt: post.dueAt }; if (loseSchedule) throw Error('buffer_write_uncertain'); }
    return { structuredContent: { post: saved } };
  } };
  const provider = createSocialPostProvider({ client, ledger: f.ledger, lease: f.lease, post, editAction: 'editPost' });
  await provider.createDraft(); await provider.createDraft(); assert.equal(calls.filter(name => name === 'create_post').length, 1);
  await assert.rejects(provider.scheduleKnownDraft(), /buffer_write_uncertain/); await assert.rejects(provider.scheduleKnownDraft(), /social_known_draft_required/);
  loseSchedule = false; await provider.reconcileKnownPost(); assert.equal((await f.ledger.inspect()).records[post.key].status, 'scheduled');
  assert.equal(calls.filter(name => name === 'edit_post').length, 1);
});

test('prepared job accounts for the live queue and never claims scheduled posts are publicly published', async () => {
  const input = await planningInput(); const plan = planDailyCampaign(input); plan.posts = plan.posts.slice(0, 1);
  const adapter = new MemoryStateAdapter(); const ledger = new CloudSocialLedger(adapter, { clock: () => Date.parse(input.now) });
  await adapter.conditionalWrite('social', { schemaVersion: 1, kind: 'ltc-cloud-social', paused: false, migration: { canonicalSha256: plan.canonicalLedgerSha256, cutoverReceiptSha256: hash('accepted cutover') }, fence: 0, lease: null, records: {} }, null);
  const calls = []; let saved; let unexpectedDraft = false;
  const client = { discover: async () => Object.fromEntries(Object.entries(properties).map(([name, schema]) => [name, hash(JSON.stringify(schema))])), schema: name => properties[name], rememberPostId: () => {}, callTool: async (name, args) => {
    calls.push(name); let data;
    if (name === 'get_account') data = { organizations: [{ id: BUFFER_TARGET.organization }], timezone: 'America/New_York' };
    if (name === 'list_channels') data = { channels: [{ id: BUFFER_TARGET.channels.x, service: 'twitter', isDisconnected: false }, { id: BUFFER_TARGET.channels.instagram, service: 'instagram', isDisconnected: false }] };
    if (name === 'list_posts') data = { posts: unexpectedDraft ? [{ id: 'c'.repeat(24), channelId: BUFFER_TARGET.channels.x, status: 'draft', text: 'unreconciled', dueAt: null }] : [], pageInfo: { hasNextPage: false } };
    if (name === 'create_post') { saved = { id: 'b'.repeat(24), channelId: args.channelId, text: args.text, assets: args.assets.map(asset => ({ source: asset.url, altText: asset.altText })), status: 'draft', allowedActions: ['editPost'] }; data = { post: saved }; }
    if (name === 'get_post') data = { post: saved };
    if (name === 'edit_post') { saved = { ...saved, dueAt: args.dueAt, status: 'scheduled' }; data = { post: saved }; }
    return { structuredContent: data };
  } };
  unexpectedDraft = true;
  await assert.rejects(executePreparedCampaign({ client, ledger, plan, runId: 'job-one', editAction: 'editPost', verifyPublicMedia: async () => {} }), /social_external_queue_unreconciled/);
  assert.ok(!calls.includes('create_post'));
  unexpectedDraft = false;
  const result = await executePreparedCampaign({ client, ledger, plan, runId: 'job-two', editAction: 'editPost', verifyPublicMedia: async post => assert.equal(post.mediaSha256, input.graphic.pngSha256) });
  assert.equal(result.publiclyPublished, false); assert.equal(result.receipts[0].status, 'scheduled');
  await assert.rejects(runCloudCampaign({ fetchImpl: async () => { throw Error('must never reach provider'); } }), /cloud_social_acceptance_pending/);
});
test('cloud job consumes actual accepted website checkpoint and exact public/source bytes, not stale local files', async () => {
  const input = await planningInput(); const editionBytes = Buffer.from(JSON.stringify(input.edition, null, 2)); const deskBytes = Buffer.from(JSON.stringify(input.sourceDesk, null, 2));
  const accepted = { editionId: input.edition.id, source: input.releaseProof.source, verifiedAt: input.releaseProof.verifiedAt, publicationProvenance: { editionSha256: hash(editionBytes), sourceDeskSha256: hash(deskBytes), dailyGraphicSha256: input.graphic.pngSha256 } };
  const paths = [];
  const loaded = await loadAcceptedSocialInputs({ websiteState: { inspect: async () => ({ paused: false, latestRelease: accepted }) }, socialDocument: { kind: 'ltc-cloud-social', records: {}, policy: input.canonicalLedger, migration: { canonicalSha256: hash(JSON.stringify(input.canonicalLedger)) } }, now: input.now, env: {}, fetchImpl: async (url, options) => {
    paths.push(url); assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error');
    if (url.includes('api.github.com')) { assert.ok(url.endsWith('ref=' + accepted.source)); return new Response(JSON.stringify({ encoding: 'base64', content: deskBytes.toString('base64') })); }
    if (url.endsWith('graphic.json')) return new Response(JSON.stringify(input.graphic)); return new Response(editionBytes);
  } });
  assert.equal(planDailyCampaign(loaded).editionId, input.edition.id); assert.equal(paths.length, 3);
  await assert.rejects(loadAcceptedSocialInputs({ websiteState: { inspect: async () => ({ paused: true, latestRelease: accepted }) }, socialDocument: {}, now: input.now }), /cloud_website_release_proof_required/);
});
test('social ledger warns before capacity and never expires or discards an uncertain post', async () => {
  const f = await ledgerFixture();
  const { value, version } = await f.adapter.read('social'); value.records.held = { status: 'create-uncertain', text: 'x'.repeat(510000) };
  await f.adapter.conditionalWrite('social', value, version);
  const document = await f.ledger.inspect(); assert.equal(document.capacity.archiveAttentionRequired, true); assert.equal(document.records.held.status, 'create-uncertain');
  await f.ledger.setPaused(true); assert.ok((await f.ledger.inspect()).capacity.warningFirstObservedAt === undefined || (await f.ledger.inspect()).capacity.archiveAttentionRequired);
  await assert.rejects(f.ledger.release(f.lease), /social_reconciliation_required/);
});

test('public probe summary exposes protocol shapes, never account values, post text or secret material', () => {
  const privateReceipt = { mode: 'read-only-buffer-cloud-probe', identityVerified: false, schemaHashes: { get_account: hash('schema') }, toolSchemas: { get_account: { type: 'object', properties: {}, description: 'private@example.invalid' } }, outputSchemas: {}, accountEvidence: { structuredContent: { account: { email: 'private@example.invalid', organizations: [{ id: 'private-org-id' }] } } }, queueEvidence: { posts: [{ id: 'private-post-id', text: 'unpublished caption' }] }, queue: [] };
  const publicSummary = JSON.stringify(publicBufferProbeStructure(privateReceipt));
  for (const secret of ['private@example.invalid', 'private-org-id', 'private-post-id', 'unpublished caption']) assert.ok(!publicSummary.includes(secret));
  assert.ok(publicSummary.includes('email')); assert.ok(publicSummary.includes('string'));
});
