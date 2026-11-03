import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateCommunitySnapshot } from './lib/ltc-community.mjs';
import { communityRecordId } from './lib/community-archive.mjs';

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--snapshot') throw new Error('Use --snapshot <fresh privately collected snapshot.json>');
const bytes = await readFile(path.resolve(args[1]));
if (bytes.length > 100000) throw new Error('Snapshot too large');
const snapshot = JSON.parse(bytes);
validateCommunitySnapshot(snapshot, { now: new Date().toISOString() });
const id = communityRecordId(snapshot);
const latest = path.resolve('content/ltc-community/latest.json');
const previous = JSON.parse(await readFile(latest, 'utf8'));
if (Date.parse(previous.collectedAt) > Date.parse(snapshot.collectedAt)) throw new Error('A newer community snapshot already exists');
const directory = path.resolve('content/ltc-community/archive');
await mkdir(directory, { recursive: true });
const canonical = JSON.stringify(snapshot, null, 2) + '\n';
const file = path.join(directory, `${id}.json`);
try { await writeFile(file, canonical, { flag: 'wx' }); }
catch (error) {
  if (error.code !== 'EEXIST' || await readFile(file, 'utf8') !== canonical) throw error;
}
// The archive is written before the pointer; no prior record is overwritten.
await writeFile(latest, canonical);
console.log(`Archived ${id}; original source dates retained. Website publication is a separate step.`);
