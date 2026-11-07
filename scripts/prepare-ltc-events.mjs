import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { validateEvents } from './lib/ltc-events.mjs';
const args = process.argv.slice(2);
if (args.length !== 3 || args[0] !== '--snapshot' || args[2] !== '--apply') throw Error('Use --snapshot PRIVATE_SNAPSHOT --apply');
const bytes = await readFile(args[1]);
if (bytes.length > 64_000) throw Error('Event snapshot too large');
const snapshot = validateEvents(JSON.parse(bytes));
const latestPath = 'content/ltc-events/latest.json', datedPath = `content/ltc-events/${snapshot.asOf}.json`;
await mkdir('content/ltc-events', { recursive: true });
let previous;
try { previous = validateEvents(JSON.parse(await readFile(latestPath, 'utf8')), { maxAgeMs: Infinity }); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (previous && previous.checkedAt > snapshot.checkedAt) throw Error('Older event check cannot replace latest');
for (const [index, row] of snapshot.events.entries()) {
  const prior = previous?.events[index];
  if (row.checkStatus === 'unavailable' && (row.lastConfirmedAt !== (prior?.lastConfirmedAt ?? null) || row.confirmedSourceSha256 !== (prior?.confirmedSourceSha256 ?? null))) throw Error('Unconfirmed event provenance changed');
}
let dated;
try { dated = await readFile(datedPath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const text = JSON.stringify(snapshot, null, 2) + '\n';
if (dated) {
  if (!previous || previous.asOf !== snapshot.asOf || dated !== await readFile(latestPath, 'utf8')) throw Error('Existing event pointer mismatch');
  console.log(JSON.stringify({ asOf: snapshot.asOf, status: 'already-recorded', deployed: false }));
} else {
  await writeFile(datedPath, text, { flag: 'wx' });
  await writeFile(latestPath, text);
  console.log(JSON.stringify({ asOf: snapshot.asOf, status: 'prepared', deployed: false }));
}
