import test from 'node:test';
import assert from 'node:assert/strict';
import { probePrivateGoogleFolder, configuredLedgerTargets, probePausedLedgers, probeVercelProject } from './cloud-ltc-access-probe.mjs';
import { TARGET } from './cloud-ltc-release.mjs';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const env = { LTC_STATE_FOLDER_ID: 'selected-folder-id', LTC_GOOGLE_CLIENT_ID: 'fixture-client-123.apps.googleusercontent.com', LTC_GOOGLE_CLIENT_SECRET: 'fixture-secret-never-real', LTC_GOOGLE_REFRESH_TOKEN: 'fixture-refresh-never-real' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const authorized = () => json({ token_type: 'Bearer', expires_in: 3600, scope: 'https://www.googleapis.com/auth/drive.file', access_token: 'fixture-access-token-only' });
test('protected folder probe performs only OAuth refresh plus exact selected-folder GET, no resource creation', async () => {
  const calls = [];
  const receipt = await probePrivateGoogleFolder({ env, fetchImpl: async (url, options) => {
    calls.push({ url, options }); if (url === 'https://oauth2.googleapis.com/token') return authorized();
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.ok(url.startsWith('https://www.googleapis.com/drive/v3/files/' + env.LTC_STATE_FOLDER_ID + '?'));
    return json({ id: env.LTC_STATE_FOLDER_ID, mimeType: 'application/vnd.google-apps.folder', trashed: false, ownedByMe: true, shared: false, capabilities: { canEdit: true }, permissions: [{ type: 'user', role: 'owner' }] });
  } });
  assert.equal(calls.length, 2); assert.equal(receipt.folderPrivateVerified, true); assert.equal(receipt.writesPerformed, false);
  assert.ok(!JSON.stringify(receipt).includes(env.LTC_STATE_FOLDER_ID)); assert.ok(!JSON.stringify(receipt).includes(env.LTC_GOOGLE_REFRESH_TOKEN));
});
test('disabled service, denied access and unproved privacy are different safe outcomes', async () => {
  for (const [status, body, reason] of [[403, { error: { details: [{ reason: 'SERVICE_DISABLED' }], message: 'private provider project details' } }, 'provider-api-disabled'], [403, { error: {} }, 'provider-access-denied'], [200, { id: env.LTC_STATE_FOLDER_ID, shared: true }, 'private-ownership-unproven']]) {
    const receipt = await probePrivateGoogleFolder({ env, fetchImpl: async url => url === 'https://oauth2.googleapis.com/token' ? authorized() : json(body, status) });
    assert.equal(receipt.folderPrivateVerified, false); assert.equal(receipt.reason, reason); assert.ok(!JSON.stringify(receipt).includes('private provider project details'));
  }
});

const ledgerEnv = { ...env, LTC_STATE_DOCUMENT_ID: 'configured-website-doc', LTC_SOCIAL_STATE_DOCUMENT_ID: 'configured-social-doc' };
const website = () => ({ schemaVersion: 1, paused: true, restoreHold: false, fence: 0, lease: null, intents: {}, receipts: {} });
const social = () => ({ schemaVersion: 1, kind: 'ltc-cloud-social', paused: true, migration: null, fence: 0, lease: null, records: {} });
function ledgerTransport({ websiteState = website(), socialState = social(), moved = false, suggestions = false, swappedNamespace = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url === 'https://oauth2.googleapis.com/token') { assert.equal(options.method, 'POST'); return authorized(); }
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.ok(!url.includes('batchUpdate') && !url.includes('upload'));
    const id = new URL(url).pathname.split('/').at(-1);
    if (url.includes('/drive/v3/files/')) return json({ id, mimeType: id === env.LTC_STATE_FOLDER_ID ? 'application/vnd.google-apps.folder' : 'application/vnd.google-apps.document', trashed: false, ownedByMe: true, shared: false, capabilities: { canEdit: true }, permissions: [{ type: 'user', role: 'owner' }], parents: [moved && id === ledgerEnv.LTC_SOCIAL_STATE_DOCUMENT_ID ? 'other-folder' : env.LTC_STATE_FOLDER_ID] });
    assert.ok(url.startsWith('https://docs.googleapis.com/v1/documents/'));
    const isSocial = id === ledgerEnv.LTC_SOCIAL_STATE_DOCUMENT_ID;
    const text = JSON.stringify({ schemaVersion: 1, key: isSocial && !swappedNamespace ? 'social' : 'website', value: isSocial ? socialState : websiteState }) + '\n';
    return json({ documentId: id, revisionId: 'opaque-read-revision', tabs: [{ tabProperties: { tabId: 'only-tab' }, documentTab: { body: { content: [{ endIndex: 1, sectionBreak: {} }, { startIndex: 1, endIndex: text.length + 1, paragraph: { elements: [{ startIndex: 1, endIndex: text.length + 1, textRun: { content: text }, ...(suggestions ? { suggestedInsertionIds: ['unaccepted-edit'] } : {}) }] } }] } } }] });
  };
  return { calls, fetchImpl };
}
test('both exact configured private ledgers validate their raw paused schemas with provider reads only', async () => {
  const f = ledgerTransport(); const beforeWebsite = JSON.stringify(website()), beforeSocial = JSON.stringify(social());
  const receipt = await probePausedLedgers({ env: ledgerEnv, fetchImpl: f.fetchImpl });
  assert.equal(receipt.allLedgersVerified, true); assert.equal(receipt.writesPerformed, false);
  for (const key of ['website', 'social']) assert.ok(Object.values(receipt.ledgers[key]).every(value => value === true));
  for (const value of [env.LTC_STATE_FOLDER_ID, ledgerEnv.LTC_STATE_DOCUMENT_ID, ledgerEnv.LTC_SOCIAL_STATE_DOCUMENT_ID, env.LTC_GOOGLE_CLIENT_SECRET, env.LTC_GOOGLE_REFRESH_TOKEN]) assert.ok(!JSON.stringify(receipt).includes(value));
  assert.ok(f.calls.some(call => call.url.includes(ledgerEnv.LTC_STATE_DOCUMENT_ID)) && f.calls.some(call => call.url.includes(ledgerEnv.LTC_SOCIAL_STATE_DOCUMENT_ID)));
  assert.equal(JSON.stringify(website()), beforeWebsite); assert.equal(JSON.stringify(social()), beforeSocial);
});
test('missing, reused or guessed ledger selections fail before any provider access', async () => {
  let calls = 0;
  for (const changed of [{ LTC_SOCIAL_STATE_DOCUMENT_ID: undefined }, { LTC_SOCIAL_STATE_DOCUMENT_ID: ledgerEnv.LTC_STATE_DOCUMENT_ID }, { LTC_STATE_DOCUMENT_ID: '../wrong' }]) await assert.rejects(probePausedLedgers({ env: { ...ledgerEnv, ...changed }, fetchImpl: async () => { calls++; } }), /exact_private_ledgers_required/);
  assert.equal(calls, 0); assert.equal(configuredLedgerTargets(ledgerEnv)[1].ledgerKey, 'social');
});
test('unpaused, moved, suggested or wrong-namespace state never passes the paused-ledger probe', async () => {
  const unpaused = social(); unpaused.paused = false;
  for (const options of [{ socialState: unpaused }, { moved: true }, { suggestions: true }, { swappedNamespace: true }, { websiteState: { ...website(), schemaVersion: 99 } }]) {
    const f = ledgerTransport(options); const receipt = await probePausedLedgers({ env: ledgerEnv, fetchImpl: f.fetchImpl });
    assert.equal(receipt.allLedgersVerified, false); assert.equal(receipt.writesPerformed, false);
    assert.ok(f.calls.every(call => call.options.method === (call.url === 'https://oauth2.googleapis.com/token' ? 'POST' : 'GET')));
  }
});
test('active leases and unresolved outcomes remain untouched and prevent acceptance', async () => {
  const active = website(); active.fence = 1; active.lease = { runId: 'existing-run', fence: 1, expiresAt: Date.now() + 60000 };
  const uncertain = social(); uncertain.records.example = { status: 'create-uncertain' };
  const f = ledgerTransport({ websiteState: active, socialState: uncertain });
  const receipt = await probePausedLedgers({ env: ledgerEnv, fetchImpl: f.fetchImpl });
  assert.equal(receipt.ledgers.website.schemaVerified, true); assert.equal(receipt.ledgers.website.leaseAbsentVerified, false);
  assert.equal(receipt.ledgers.social.unresolvedEffectsAbsentVerified, false); assert.equal(receipt.allLedgersVerified, false);
  assert.equal(active.lease.runId, 'existing-run'); assert.equal(uncertain.records.example.status, 'create-uncertain');
});
const knownProject = () => ({ id: TARGET.project, accountId: TARGET.team, commandForIgnoringBuildStep: 'exit 0', link: { type: 'github', org: 'Khlnayak', repo: 'https-github.com-Satnam-Satoshi-Satoshi-Langar', repoId: 1246313844, productionBranch: 'main', sourceless: true, deployHooks: [] } });
const vercelPaths = [`/v9/projects/${TARGET.project}?teamId=${TARGET.team}`, '/v2/user', `/teams/${TARGET.team}`];
const knownVercelBody = pathname => pathname === vercelPaths[0] ? knownProject() : pathname === vercelPaths[1] ? { user: { id: 'private-user-id', username: 'private-user-name', email: 'private-user@example.invalid' } } : { id: TARGET.team, slug: TARGET.scope, name: 'private-team-name' };
test('Vercel probe performs only three fixed GETs with private authorization and emits safe statuses/booleans', async () => {
  const token = 'fixture-project-only-vercel-token'; const calls = [];
  const receipt = await probeVercelProject({ env: { VERCEL_TOKEN: token, LTC_VERCEL_PROJECT_ID: 'ignored-other-project' }, fetchImpl: async (url, options) => {
    calls.push({ url, options }); assert.ok(vercelPaths.map(pathname => `https://api.vercel.com${pathname}`).includes(url)); assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, `Bearer ${token}`); assert.equal(options.body, undefined);
    return json({ ...knownVercelBody(url.slice('https://api.vercel.com'.length)), privateProviderDetails: 'must-not-surface' });
  } });
  assert.deepEqual(calls.map(call => call.url), vercelPaths.map(pathname => `https://api.vercel.com${pathname}`)); assert.equal(receipt.projectMetadataVerified, true); assert.equal(receipt.writesPerformed, false); assert.equal(receipt.cliPreflightVerified, true);
  for (const key of ['projectHttpStatus', 'userHttpStatus', 'teamHttpStatus']) assert.equal(receipt[key], 200);
  for (const key of ['userShapeVerified', 'teamIdentityVerified', 'teamSlugVerified']) assert.equal(receipt[key], true);
  for (const value of [token, TARGET.project, TARGET.team, TARGET.scope, 'must-not-surface', 'private-user-id', 'private-user-name', 'private-user@example.invalid', 'private-team-name']) assert.ok(!JSON.stringify(receipt).includes(value));
});
test('wrong Vercel account/project/control metadata or denied/ambiguous responses fail closed without retries', async () => {
  for (const response of [() => json({ ...knownProject(), accountId: 'team_other' }), () => json({ ...knownProject(), id: 'prj_other' }), () => json({ ...knownProject(), commandForIgnoringBuildStep: 'exit 1' }), () => json({ error: 'private diagnostics' }, 403), () => ({ status: 200, redirected: true }), () => new Response('malformed', { headers: { 'content-type': 'application/json' } })]) {
    let calls = 0; const receipt = await probeVercelProject({ env: { VERCEL_TOKEN: 'fixture-project-only-vercel-token' }, fetchImpl: async url => { calls++; const pathname = url.slice('https://api.vercel.com'.length); return pathname === vercelPaths[0] ? response() : json(knownVercelBody(pathname)); } });
    assert.equal(receipt.projectMetadataVerified, false); assert.equal(receipt.writesPerformed, false); assert.equal(receipt.cliPreflightVerified, false); assert.equal(receipt.userShapeVerified, true); assert.equal(receipt.teamIdentityVerified, true); assert.equal(calls, 3);
  }
  await assert.rejects(probeVercelProject({ env: {}, fetchImpl: async () => { throw Error('must not reach network'); } }), /vercel_project_credential_required/);
});
test('denied user/team lookups retain successful project policy and safe 403 status without leaking provider bodies', async () => {
  for (const deniedPath of vercelPaths.slice(1)) {
    const calls = []; const receipt = await probeVercelProject({ env: { VERCEL_TOKEN: 'fixture-project-only-vercel-token' }, fetchImpl: async (url, options) => { calls.push(url); assert.equal(options.headers.Authorization, 'Bearer fixture-project-only-vercel-token'); const pathname = url.slice('https://api.vercel.com'.length); return pathname === deniedPath ? json({ error: { message: 'private-denied-user-and-token-details' } }, 403) : json(knownVercelBody(pathname)); } });
    assert.equal(receipt.projectMetadataVerified, true); assert.equal(receipt.cliPreflightVerified, false); assert.equal(receipt[deniedPath === vercelPaths[1] ? 'userHttpStatus' : 'teamHttpStatus'], 403); assert.equal(calls.length, 3); assert.ok(!JSON.stringify(receipt).includes('private-denied'));
  }
});
test('CLI lookups fail closed for missing/wrong shapes, non-JSON, redirects, oversized responses and network failures independently', async () => {
  const failures = [
    { make: () => json(null), status: 200 },
    { make: () => json({ uid: 'not-the-CLI-user-shape' }), status: 200 },
    { make: () => new Response('private HTML response', { headers: { 'content-type': 'text/html' } }), status: 200 },
    { make: () => new Response('private malformed JSON', { headers: { 'content-type': 'application/json' } }), status: 200 },
    { make: () => json({ privateBody: 'x'.repeat(70_000) }), status: 200 },
    { make: () => new Response(null, { status: 307, headers: { location: 'https://untrusted.invalid/' } }), status: 307 },
    { make: () => { const response = json({ privateRedirectedBody: true }); Object.defineProperty(response, 'redirected', { value: true }); return response; }, status: 200 },
    { make: () => { throw Error('private network diagnostic token'); }, status: null },
  ];
  for (const target of vercelPaths.slice(1)) for (const failure of failures) {
    const calls = []; const receipt = await probeVercelProject({ env: { VERCEL_TOKEN: 'fixture-project-only-vercel-token' }, fetchImpl: async (url, options) => { calls.push(url); assert.equal(options.redirect, 'error'); assert.equal(options.method, 'GET'); const pathname = url.slice('https://api.vercel.com'.length); return pathname === target ? failure.make() : json(knownVercelBody(pathname)); } });
    assert.equal(receipt.projectMetadataVerified, true); assert.equal(receipt.cliPreflightVerified, false); assert.equal(receipt[target === vercelPaths[1] ? 'userHttpStatus' : 'teamHttpStatus'], failure.status); assert.equal(receipt[target === vercelPaths[1] ? 'userShapeVerified' : 'teamIdentityVerified'], false); assert.equal(calls.length, 3);
    for (const key of ['projectMetadataVerified', 'userShapeVerified', 'teamIdentityVerified', 'teamSlugVerified', 'cliPreflightVerified']) assert.equal(typeof receipt[key], 'boolean');
    assert.ok(!JSON.stringify(receipt).includes('private')); assert.ok(!JSON.stringify(receipt).includes('untrusted.invalid'));
  }
  for (const [pathname, body] of [[vercelPaths[1], { user: { uid: 'wrong-user-field' } }], [vercelPaths[1], { user: { id: '' } }], [vercelPaths[2], { id: 'team_other', slug: TARGET.scope }], [vercelPaths[2], { id: TARGET.team, slug: 'other-team' }]]) {
    const receipt = await probeVercelProject({ env: { VERCEL_TOKEN: 'fixture-project-only-vercel-token' }, fetchImpl: async url => { const target = url.slice('https://api.vercel.com'.length); return json(target === pathname ? body : knownVercelBody(target)); } }); assert.equal(receipt.cliPreflightVerified, false); assert.equal(receipt.projectMetadataVerified, true);
  }
});
test('acceptance workflow keeps provider credentials isolated to exact read-only probe steps', async () => {
  const workflow = await readFile(new URL('../ops/ltc-daily-workflow.yml', import.meta.url), 'utf8');
  const ledgerStep = workflow.split('- name: Read exact configured website and social paused ledgers')[1].split('- name: Read fixed Vercel project')[0];
  const vercelStep = workflow.split('- name: Read fixed Vercel project and team deployment controls')[1].split('- name: Discover official Buffer')[0];
  assert.ok(ledgerStep.includes('vars.LTC_STATE_DOCUMENT_ID') && ledgerStep.includes('vars.LTC_SOCIAL_STATE_DOCUMENT_ID') && ledgerStep.includes('--ledgers'));
  assert.ok(!ledgerStep.includes('VERCEL_TOKEN') && !ledgerStep.includes('LTC_BUFFER_API_KEY'));
  assert.ok(vercelStep.includes('secrets.VERCEL_TOKEN') && vercelStep.includes('--vercel'));
  assert.ok(!vercelStep.includes('LTC_GOOGLE_') && !vercelStep.includes('LTC_BUFFER_API_KEY'));
  assert.equal((workflow.match(/^  schedule:/gm) ?? []).length, 1);
});

test('actual workflow summary writes false defaults and fails until all five proof flags are strictly true', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const workflow = await readFile(path.join(root, 'ops/ltc-daily-workflow.yml'), 'utf8');
  const marker = "          node --input-type=module <<'NODE'\n";
  const summaryStep = workflow.indexOf('      - name: Report only safe protocol shapes and access outcomes');
  assert.ok(summaryStep >= 0);
  const start = workflow.indexOf(marker, summaryStep) + marker.length;
  const script = workflow.slice(start, workflow.indexOf('          NODE', start)).split('\n').map(line => line.replace(/^          /, '')).join('\n');
  const good = { 'ltc-google-folder-probe.json': { folderPrivateVerified: true }, 'ltc-paused-ledgers-probe.json': { allLedgersVerified: true }, 'ltc-vercel-project-probe.json': { projectMetadataVerified: true }, 'ltc-buffer-cloud-probe.json': { identityVerified: true, queueReadComplete: true, queue: [] } };
  const cases = [
    { files: {}, success: false },
    { files: Object.fromEntries(Object.entries(good).filter(([name]) => !name.includes('buffer'))), success: false },
    { files: { ...good, 'ltc-buffer-cloud-probe.json': { identityVerified: true, queueReadComplete: false, queue: [] } }, success: false },
    { files: { ...good, 'ltc-buffer-cloud-probe.json': { identityVerified: true, queueReadComplete: 'true', queue: [] } }, success: false },
    { files: good, success: true },
  ];
  for (const entry of cases) {
    const directory = await mkdtemp(path.join(tmpdir(), 'ltc-probe-summary-'));
    try {
      for (const [name, value] of Object.entries(entry.files)) await writeFile(path.join(directory, name), JSON.stringify(value));
      const summaryPath = path.join(directory, 'summary.md');
      const result = spawnSync(process.execPath, ['--input-type=module'], { cwd: root, input: script, encoding: 'utf8', env: { PATH: process.env.PATH, RUNNER_TEMP: directory, GITHUB_STEP_SUMMARY: summaryPath } });
      assert.equal(result.status, entry.success ? 0 : 1, result.stderr);
      const summary = await readFile(summaryPath, 'utf8');
      const value = JSON.parse(summary.match(/```json\n([\s\S]*?)\n```/)[1]);
      assert.equal(value.allReadOnlyProbesVerified, entry.success); assert.equal(value.cloudPublishingActive, false);
      for (const [name, file] of [['google', 'ltc-google-folder-probe.json'], ['buffer', 'ltc-buffer-cloud-probe.json'], ['ledgers', 'ltc-paused-ledgers-probe.json'], ['vercel', 'ltc-vercel-project-probe.json']]) assert.equal(value[name].readResultAvailable, Object.hasOwn(entry.files, file));
      if (!Object.keys(entry.files).length) { assert.equal(value.google.folderPrivateVerified, false); assert.equal(value.buffer.identityVerified, false); assert.equal(value.buffer.queueReadComplete, false); }
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
});

test('quarantined unknown setup remains visible and prevents generic resource acceptance even with empty active intents',async()=>{
 const state={...website(),fence:2,unresolvedSetupIncident:{outcome:'UNKNOWN',accepted:false},retiredSetupIncidents:{privateIncident:{outcome:'UNKNOWN'}}};
 const before=JSON.stringify(state),f=ledgerTransport({websiteState:state});
 const receipt=await probePausedLedgers({env:ledgerEnv,fetchImpl:f.fetchImpl});
 assert.equal(receipt.ledgers.website.schemaVerified,true);
 assert.equal(receipt.ledgers.website.setupIncidentAbsentVerified,false);
 assert.equal(receipt.ledgers.website.unresolvedEffectsAbsentVerified,false);
 assert.equal(receipt.ledgers.website.readOnlyReady,false);assert.equal(receipt.allLedgersVerified,false);
 assert.equal(receipt.writesPerformed,false);assert.equal(JSON.stringify(state),before);
 assert.equal(JSON.stringify(receipt).includes('privateIncident'),false);
});
