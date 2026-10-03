import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assertChanges, assertControls, cleanEnvironment, implementationDigest, isEditionData, pathsFor, safeFailure, verifyImplementation } from './cloud-ltc-release.mjs';

const id = '2026-10-02-r1';
const head = 'a'.repeat(40);
test('routine release permits only one new issue, index and snapshot; rejects edits, deletes, traversal and unrelated code', () => {
  assertChanges([{ status: '??', file: `content/ltc/${id}.json` }, { status: 'M', file: 'content/ltc/index.json' }, { status: 'M', file: 'public/data/ltc-snapshot.json' }], id);
  for (const change of [
    { status: 'M', file: `content/ltc/${id}.json` }, { status: 'D', file: 'content/ltc/index.json' },
    { status: 'M', file: 'app/page.tsx' }, { status: 'A', file: 'content/ltc/2026-10-01-r2.json' },
    { status: '??', file: 'content/ltc/../../app/page.tsx' },
  ]) assert.throws(() => assertChanges([change], id));
  assert.equal(isEditionData('content/ltc/2026-10-02-r1.json'), true);
  assert.equal(isEditionData('content/ltc/2026-10-02-r0.json'), false);
  assert.equal(isEditionData('content/ltc/../config/secret.json'), false);
});
test('pause, admission switch, policy mismatch and competing head fail closed', () => {
  const open = { policy: { policyId: 'bounded-daily-v1', enabled: true, paused: false }, cloudValue: 'true', remoteHead: head, expectedHead: head };
  assertControls(open);
  for (const delta of [{ cloudValue: 'false' }, { cloudValue: undefined }, { remoteHead: 'b'.repeat(40) }, { policy: { ...open.policy, paused: true } }, { policy: { ...open.policy, enabled: false } }, { policy: {} }]) assert.throws(() => assertControls({ ...open, ...delta }));
});
test('child process environment and errors never expose provider tokens', () => {
  const secrets = { GITHUB_TOKEN: 'ghp_thisisprivate', VERCEL_TOKEN: 'privateverceltoken', AWS_SECRET_ACCESS_KEY: 'privatecloudkey', NODE_OPTIONS: '--require ./untrusted.cjs' };
  assert.deepEqual(cleanEnvironment({ PATH: '/usr/bin', ...secrets }), { PATH: '/usr/bin' });
  for (const value of [...Object.values(secrets), 'command_failed_ghp_thisisprivate', 'url https://example.com?token=private']) assert.equal(safeFailure(new Error(value)), 'release_failed_details_withheld');
  assert.equal(safeFailure(new Error('publication_paused')), 'publication_paused');
  assert.equal(safeFailure(new Error('http_403')), 'http_403');
});
test('release verification covers date, exact revision, month, archive, RSS and JSON', () => {
  const files = pathsFor(id);
  for (const required of ['conversations/editions/2026-10-02/index.html', 'conversations/editions/2026-10-02-r1/index.html', 'conversations/archive/2026-10/index.html', 'conversations/feed.xml', 'data/ltc-editions/index.json']) assert.ok(files.includes(required));
  assert.throws(() => pathsFor('../auth'));
});
test('implementation digest rejects changed code before execution but permits dated data changes', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ltc-cloud-guard-'));
  const git = args => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  try {
    git(['init', '-q']);
    await mkdir(path.join(dir, 'content/ltc'), { recursive: true });
    await writeFile(path.join(dir, 'runner.mjs'), 'throw new Error("must not execute");');
    await writeFile(path.join(dir, 'content/ltc/index.json'), '[]');
    git(['add', '.']);
    const accepted = await implementationDigest(dir);
    await verifyImplementation(dir, accepted);
    await writeFile(path.join(dir, 'content/ltc/index.json'), '[{"dated":"data"}]');
    await verifyImplementation(dir, accepted);
    await writeFile(path.join(dir, 'runner.mjs'), 'throw new Error("changed");');
    await assert.rejects(verifyImplementation(dir, accepted), /implementation_changed/);
    await assert.rejects(verifyImplementation(dir, ''), /accepted_digest_required/);
    await symlink('runner.mjs', path.join(dir, 'alias.mjs')); git(['add', 'alias.mjs']);
    await assert.rejects(implementationDigest(dir), /non_regular_tracked_file/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
