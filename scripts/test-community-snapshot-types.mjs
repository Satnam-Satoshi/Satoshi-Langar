import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { renderToStaticMarkup } from 'react-dom/server';
import { collectCommunity, COMMUNITY_SOURCES } from './lib/ltc-community.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const now = '2026-10-05T16:00:00.000Z';
const feed = '<?xml version="1.0"?><rss version="2.0"><channel><title>Litecoin News</title><link>https://litecoin.com</link><description>Official source</description><item><title>Community fixture</title><link>https://litecoin.com/news/community-fixture</link><pubDate>Mon, 05 Oct 2026 10:00:00 -0400</pubDate></item></channel></rss>';

// Compile the real component and its data boundary against isolated JSON inputs.
// Never replace the checkout's live/latest snapshot or run a network collector.
async function fixture(snapshot, use) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ltc-community-types-'));
  try {
    for (const folder of ['app/components', 'app/data', 'content/ltc-community']) await mkdir(path.join(directory, folder), { recursive: true });
    await symlink(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
    await copyFile(path.join(root, 'app/components/NewsroomUpdate.tsx'), path.join(directory, 'app/components/NewsroomUpdate.tsx'));
    await copyFile(path.join(root, 'app/data/community-wire.ts'), path.join(directory, 'app/data/community-wire.ts'));
    await symlink(path.join(root, 'scripts'), path.join(directory, 'scripts'), 'dir');
    await writeFile(path.join(directory, 'content/ltc-community/latest.json'), JSON.stringify(snapshot));
    await writeFile(path.join(directory, 'app/components/newsroom-update.module.css'), '');
    await writeFile(path.join(directory, 'styles.d.ts'), "declare module '*.module.css' { const styles: Record<string, string>; export default styles; }");
    await writeFile(path.join(directory, 'app/data/newsroom.ts'), `export const newsroom = { preparedAt: '${now}', intelligence: { markets: [{ routeId: 'fixture', chain: 'Arc', marketId: 'fixture-market', chainId: 5042, collateral: { symbol: 'LTC' }, state: { supplyApy: null as string|null, borrowApy: null as string|null, asOf: null as string|null, freshness: 'unavailable' } }] } };`);
    const config = JSON.parse(await readFile(path.join(root, 'tsconfig.json'), 'utf8'));
    config.compilerOptions.incremental = false;
    config.compilerOptions.types = ['react', 'node'];
    config.include = ['app/**/*.ts', 'app/**/*.tsx', 'styles.d.ts'];
    await writeFile(path.join(directory, 'tsconfig.json'), JSON.stringify(config));
    const compile = () => spawnSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--project', path.join(directory, 'tsconfig.json'), '--pretty', 'false'], { cwd: directory, encoding: 'utf8', timeout: 30_000 });
    const render = async () => {
      const outfile = path.join(directory, 'component.cjs');
      await build({ entryPoints: [path.join(directory, 'app/components/NewsroomUpdate.tsx')], outfile, bundle: true, platform: 'node', format: 'cjs', external: ['react', 'react/jsx-runtime'], logLevel: 'silent', plugins: [{ name: 'fixture-styles', setup(builder) { builder.onLoad({ filter: /\.module\.css$/ }, () => ({ contents: 'export default {};', loader: 'js' })); } }] });
      const component = createRequire(import.meta.url)(outfile).default;
      return renderToStaticMarkup(component());
    };
    return await use({ compile, render });
  } finally { await rm(directory, { recursive: true, force: true }); }
}

test('unavailable sources produce a valid empty snapshot that compiles and renders its gap', async () => {
  const snapshot = await collectCommunity({ now, fetcher: async () => new Response('Unavailable', { status: 403 }) });
  assert.deepEqual(snapshot.items, []);
  await fixture(snapshot, async ({ compile, render }) => {
    const result = compile(); assert.equal(result.status, 0, result.stdout + result.stderr);
    const html = await render();
    assert.match(html, /No recent source records passed collection/);
    for (const source of COMMUNITY_SOURCES) assert.ok(html.includes(source.url));
    assert.doesNotMatch(html, /Community fixture/);
  });
});

test('deferred/empty feeds compile without changing source visibility or inventing records', async () => {
  const snapshot = await collectCommunity({ now, deferFoundation: true, fetcher: async () => new Response('[]', { headers: { 'content-type': 'application/json' } }) });
  assert.deepEqual(snapshot.items, []);
  await fixture(snapshot, async ({ compile, render }) => {
    const result = compile(); assert.equal(result.status, 0, result.stdout + result.stderr);
    const html = await render();
    assert.match(html, /No recent source records passed collection/);
    assert.match(html, /not requested in this run/);
    assert.match(html, /Earlier access failure; no repeat request/);
  });
});

test('accepted records still compile and render original links, titles and publication times', async () => {
  const snapshot = await collectCommunity({ now, fetcher: async url => new Response(url === COMMUNITY_SOURCES[0].url ? feed : '[]', { headers: { 'content-type': url === COMMUNITY_SOURCES[0].url ? 'application/rss+xml' : 'application/json' } }) });
  assert.equal(snapshot.items.length, 1);
  await fixture(snapshot, async ({ compile, render }) => {
    const result = compile(); assert.equal(result.status, 0, result.stdout + result.stderr);
    const html = await render();
    assert.match(html, /Community fixture/);
    assert.match(html, /https:\/\/litecoin\.com\/news\/community-fixture/);
    assert.match(html, /2026-10-05T14:00:00\.000Z/);
    assert.doesNotMatch(html, /No recent source records passed collection/);
  });
});

test('the typed JSON boundary rejects incompatible populated records instead of casting them away', async () => {
  const snapshot = await collectCommunity({ now, fetcher: async url => new Response(url === COMMUNITY_SOURCES[0].url ? feed : '[]', { headers: { 'content-type': url === COMMUNITY_SOURCES[0].url ? 'application/rss+xml' : 'application/json' } }) });
  snapshot.items[0].title = 42;
  await fixture(snapshot, ({ compile }) => {
    const result = compile(); assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /title/);
    assert.match(result.stdout + result.stderr, /number.*string/);
  });
});
