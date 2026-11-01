import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectCommunity } from './lib/ltc-community.mjs';

export { collectCommunity, validateCommunitySnapshot } from './lib/ltc-community.mjs';

async function main() {
  const allArgs = process.argv.slice(2);
  const deferFoundation = allArgs.includes('--defer-foundation');
  if (allArgs.filter(arg => arg === '--defer-foundation').length > 1) throw new Error('Duplicate defer flag');
  const args = allArgs.filter(arg => arg !== '--defer-foundation');
  const stdout = args[0] === '--stdout';
  const output = args[0] === '--output' && args[1] && !args[1].startsWith('--') ? resolve(args[1]) : null;
  const rest = args.slice(stdout ? 1 : 2);
  const evidenceDir = rest.length === 2 && rest[0] === '--evidence-dir' && rest[1] && !rest[1].startsWith('--') ? resolve(rest[1]) : null;
  if ((!stdout && !output) || (rest.length && !evidenceDir) || !args.length) throw new Error('Usage: node scripts/collect-ltc-community.mjs (--stdout | --output NEW_PRIVATE_PATH) [--evidence-dir NEW_PRIVATE_DIRECTORY] [--defer-foundation]');
  if (evidenceDir) {
    const rel = relative(process.cwd(), evidenceDir);
    if (rel === '' || (!rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && rel !== '..' && !isAbsolute(rel))) throw new Error('Raw evidence must be outside the application directory');
    // The parent must already exist; existing directories are refused.
    await mkdir(evidenceDir, { mode: 0o700 });
  }
  const snapshot = await collectCommunity({ deferFoundation, onEvidence: evidenceDir ? async ({ sourceId, checkedAt, bytes, sha256 }) => {
    await writeFile(join(evidenceDir, `${sourceId}.body`), bytes, { flag: 'wx', mode: 0o600 });
    await writeFile(join(evidenceDir, `${sourceId}.receipt.json`), `${JSON.stringify({ sourceId, checkedAt, sha256, bytes: bytes.length }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  } : undefined });
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (output) await writeFile(output, serialized, { flag: 'wx', mode: 0o600 });
  else process.stdout.write(serialized);
  if (evidenceDir) await writeFile(join(evidenceDir, 'snapshot.json'), serialized, { flag: 'wx', mode: 0o600 });
  if (output) console.log(`Community snapshot saved to ${output}; ${snapshot.sourceStatus.filter(source => source.status === 'collected').length} of ${snapshot.sourceStatus.length} sources collected. No publication performed.`);
  if (snapshot.sourceStatus.every(source => source.status === 'unavailable')) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
