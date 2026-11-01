import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectPolicy } from './lib/ltc-policy.mjs';

export { collectPolicy, validatePolicySnapshot, policyRecordSummary } from './lib/ltc-policy.mjs';

async function main() {
  const args = process.argv.slice(2);
  const output = args.length === 2 && args[0] === '--output' && args[1] && !args[1].startsWith('--') ? resolve(args[1]) : null;
  if (!(args.length === 1 && args[0] === '--stdout') && !output) throw new Error('Usage: node scripts/collect-ltc-policy.mjs --stdout | --output PRIVATE_PATH');
  const snapshot = await collectPolicy();
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (output) {
    // Exclusive creation keeps earlier retrieval evidence intact. No public default path.
    await writeFile(output, serialized, { flag: 'wx', mode: 0o600 });
    console.log(`Policy snapshot saved to ${output}; ${snapshot.sources.filter(source => source.status === 'collected').length} of ${snapshot.sources.length} feeds collected. No publication performed.`);
  } else process.stdout.write(serialized);
  if (snapshot.sources.every(source => source.status === 'unavailable')) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
