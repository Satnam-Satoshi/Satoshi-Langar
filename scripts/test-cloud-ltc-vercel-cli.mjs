import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ACCEPTANCE_CLI_VERSION, acceptanceProjectScopedAuth } from './cloud-ltc-acceptance.mjs';

async function pinnedParser() {
  let entry = process.env.LTC_TEST_VERCEL_CLI;
  if (!entry) {
    for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
      const candidate = path.join(directory, 'vercel');
      try { await access(candidate); entry = await realpath(candidate); break; } catch {}
    }
  }
  assert.ok(entry, 'Install the pinned Vercel CLI or set LTC_TEST_VERCEL_CLI for this contract test');
  entry = await realpath(entry);
  const root = path.dirname(path.dirname(entry));
  const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(metadata.name, 'vercel');
  assert.equal(metadata.version, ACCEPTANCE_CLI_VERSION);
  // The package/chunk is intentionally pinned with the reviewed CLI. Importing
  // its argument parser performs no API request or subprocess execution.
  return (await import(pathToFileURL(path.join(root, 'dist/chunks/chunk-QY5RG6BB.js')).href)).setupCurlLikeCommand;
}
const telemetry = { trackCliArgumentPath() {}, trackCliOptionDeployment() {}, trackCliOptionProtectionBypass() {} };
const target = 'https://fixture.vercel.app/';
const native = ['--include', '--silent', '--show-error', '--max-time', '30', '--max-redirs', '0', '--proto', '=https'];

test('actual pinned CLI parser receives only native flags with environment-only authentication', async () => {
  const parse = await pinnedParser();
  const args = acceptanceProjectScopedAuth(['curl', target, '--', ...native], 'fixture_not_a_real_credential');
  const result = parse({ argv: ['node', 'vercel', ...args], stderr: { columns: 80 } }, { name: 'curl' }, telemetry, { allowFullUrl: true, args });
  assert.equal(result.path, target);
  assert.equal(result.isFullUrl, true);
  assert.deepEqual(result.toolFlags, native);
  assert.equal(JSON.stringify(result).includes('fixture_not_a_real_credential'), false);
});

test('actual pinned CLI parser demonstrates why appended token authentication is forbidden', async () => {
  const parse = await pinnedParser();
  const args = ['curl', target, '--token', 'fixture_not_a_real_credential', '--', ...native];
  const result = parse({ argv: ['node', 'vercel', ...args], stderr: { columns: 80 } }, { name: 'curl' }, telemetry, { allowFullUrl: true, args });
  assert.deepEqual(result.toolFlags, ['--token', 'fixture_not_a_real_credential', ...native]);
  assert.ok(!acceptanceProjectScopedAuth(['curl', target, '--', ...native], 'fixture_not_a_real_credential').includes('--token'));
});
