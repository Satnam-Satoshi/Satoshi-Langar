import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Daily authority covers edition data only. Compare this digest with the last
// explicitly accepted implementation before releasing from a changed branch.
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
const hash = createHash('sha256');
for (const file of files) {
  if (/^content\/ltc\/(?:index|\d{4}-\d{2}-\d{2}-r[1-9]\d?)\.json$/.test(file) || file === 'public/data/ltc-snapshot.json') continue;
  hash.update(file + '\0');
  hash.update(await readFile(file));
  hash.update('\0');
}
const digest = hash.digest('hex');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--expect' || !/^[a-f0-9]{64}$/.test(args[1]))) throw new Error('Use --expect with the accepted implementation SHA-256.');
if (args[1] && args[1] !== digest) throw new Error('Implementation changed. Daily publication withheld pending code review.');
console.log(digest);
