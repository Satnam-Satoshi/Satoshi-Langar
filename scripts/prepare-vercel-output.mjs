import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Only the checked portable release is uploaded. Source, private records and
// local credentials never enter this Build Output API directory.
const root = process.cwd();
const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
await readFile(path.join(root, 'dist/index.html'));
const output = path.join(root, '.vercel/output');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, 'dist'), path.join(output, 'static'), { recursive: true });
const headers = Object.fromEntries(config.headers.find(rule => rule.source === '/(.*)').headers.map(h => [h.key, h.value]));
await writeFile(path.join(output, 'config.json'), JSON.stringify({
  version: 3,
  routes: [
    { src: '/(.*)', headers, continue: true },
    { src: '/conversations/feed.xml', headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' }, continue: true },
    { src: '/magazine/litecoin-15/Litecoin-at-15-84-page-advance-edition.pdf', status: 308, headers: { Location: '/magazine/proof-of-birthday/Proof-of-Birthday-LTC-84-pages-r2.pdf' } },
    { src: '/conversations/specials/litecoin-at-15(?:/.*)?', status: 308, headers: { Location: '/conversations/specials/proof-of-birthday/' } },
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/404.html', status: 404 },
  ],
}, null, 2) + '\n');
console.log('Prepared checked static files for the existing Vercel project; no deployment performed.');
