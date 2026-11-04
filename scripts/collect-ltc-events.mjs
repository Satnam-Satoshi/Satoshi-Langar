import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { collectEvents } from './lib/ltc-events.mjs';
const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== '--output' || args[2] !== '--evidence-dir') throw Error('Use --output PRIVATE_SNAPSHOT --evidence-dir PRIVATE_DIRECTORY');
let previous = null;
try { previous = JSON.parse(await readFile('content/ltc-events/latest.json', 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(args[3], { recursive: true });
const snapshot = await collectEvents({ previous, saveEvidence: (id, bytes) => writeFile(path.join(args[3], `${id}.html`), bytes, { flag: 'wx', mode: 0o600 }) });
await writeFile(args[1], JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ checkedAt: snapshot.checkedAt, confirmed: snapshot.events.filter(event => event.checkStatus === 'confirmed').length, total: snapshot.events.length, deployed: false }));
