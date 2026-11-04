import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { litecoinChainResponse, CHAIN_URL } from './lib/litecoin-chain-service.mjs';

export async function collectCheckpoint({ fetcher = fetch, clock = Date.now } = {}) {
  const response = await litecoinChainResponse(new Request('https://localhost/api/litecoin-chain'), { fetcher, clock, timeoutMs: 15_000 });
  const checked = await response.json();
  if (!response.ok) return { schemaVersion: 1, checkedAt: checked.checkedAt, checkStatus: 'unavailable', observation: null };
  return { schemaVersion: 1, checkedAt: checked.checkedAt, checkStatus: 'confirmed', observation: { height: checked.height, hash: checked.hash, blockTimestamp: checked.blockTimestamp, observedAt: checked.observedAt, checkedAt: checked.checkedAt, source: CHAIN_URL, blockSource: checked.source.blockURL, provider: 'BlockCypher · provider observation, not our own full node', status: 'dated-checkpoint' } };
}
export function validateCheckpoint(record, now = Date.now()) {
  const time = Date.parse(record?.checkedAt);
  if (record?.schemaVersion !== 1 || !Number.isFinite(time) || time > now || now - time > 3 * 3_600_000) throw Error('Invalid checkpoint check');
  if (record.checkStatus === 'unavailable' && record.observation === null) return record;
  const d = record.observation;
  if (record.checkStatus !== 'confirmed' || !d || !Number.isSafeInteger(d.height) || d.height <= 0 || d.height > 53_760_000 || !/^[a-f0-9]{64}$/.test(d.hash) || d.source !== CHAIN_URL || d.blockSource !== `${CHAIN_URL}/blocks/${d.hash}?txstart=1&limit=1` || d.checkedAt !== record.checkedAt || d.status !== 'dated-checkpoint') throw Error('Invalid checkpoint observation');
  for (const [value, age] of [[d.observedAt, 1_200_000], [d.blockTimestamp, 7_200_000]]) if (!Number.isFinite(Date.parse(value)) || Date.parse(value) > time + 60_000 || time - Date.parse(value) > age) throw Error('Stale checkpoint observation');
  return record;
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || !['--output','--apply'].includes(args[0])) throw Error('Use --output PRIVATE_SNAPSHOT or --apply PRIVATE_SNAPSHOT');
  if (args[0] === '--output') {
    const record = validateCheckpoint(await collectCheckpoint());
    await writeFile(args[1], JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ status: record.checkStatus, checkedAt: record.checkedAt, deployed: false }));
  } else {
    const bytes = await readFile(args[1]);
    if (bytes.length > 10_000) throw Error('Oversized checkpoint');
    const record = validateCheckpoint(JSON.parse(bytes));
    // A failure never advances the saved observation's timestamp.
    if (record.checkStatus === 'confirmed') await writeFile('content/research/litecoin-clock-latest.json', JSON.stringify(record.observation, null, 2) + '\n');
    console.log(JSON.stringify({ status: record.checkStatus, applied: record.checkStatus === 'confirmed', deployed: false }));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
