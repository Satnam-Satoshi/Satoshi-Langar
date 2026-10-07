import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readEditionArchive } from './prepare-ltc-edition.mjs';
import { validateFlagshipRecord } from './lib/ltc-flagship-record.mjs';

const defaultDirectory = fileURLToPath(new URL('../content/ltc/', import.meta.url));

export async function validateLtcArchive({ directory = defaultDirectory } = {}) {
  // Validates every immutable file at its original preparation time.
  const archived = await readEditionArchive(directory);
  const index = JSON.parse(await readFile(path.join(directory, 'index.json'), 'utf8'));
  if (!Array.isArray(index)) throw new Error('invalid_edition_index');
  index.forEach(validateFlagshipRecord);
  if (JSON.stringify(index) !== JSON.stringify(archived)) throw new Error('edition_index_archive_mismatch');
  return archived;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  validateLtcArchive().then(records => console.log(`PASS: ${records.length} archived editions; flagship evidence and index validated at saved preparation times.`)).catch(error => { console.error(`LTC archive rejected: ${error.message}`); process.exitCode = 1; });
}
