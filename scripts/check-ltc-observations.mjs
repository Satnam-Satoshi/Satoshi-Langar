import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { prepareEdition } from './prepare-ltc-edition.mjs';
import { refreshIntelligenceForPublication } from './lib/ltc-intelligence.mjs';
import { validatePolicySnapshot } from './lib/ltc-policy.mjs';
import { validateBuilderNews } from './collect-ltc-builder-news.mjs';
export function checkObservations({ snapshot, intelligence, policyRecords, builders, registry, policy, now = new Date().toISOString() }) {
  const base = prepareEdition(snapshot, registry, policy, { now });
  refreshIntelligenceForPublication(intelligence, { now, editionDate: base.date });
  validatePolicySnapshot(policyRecords, { now }); validateBuilderNews(builders, { now });
  return { valid: true, date: base.date };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2); const files = {};
    for (let i = 0; i < args.length; i += 2) { if (!['--snapshot', '--intelligence', '--policy', '--builders'].includes(args[i]) || !args[i + 1] || files[args[i]]) throw Error('invalid_arguments'); files[args[i]] = args[i + 1]; }
    if (Object.keys(files).length !== 4) throw Error('all_observations_required');
    const json = async file => JSON.parse(await readFile(file, 'utf8'));
    checkObservations({ snapshot: await json(files['--snapshot']), intelligence: await json(files['--intelligence']), policyRecords: await json(files['--policy']), builders: await json(files['--builders']), registry: await json('config/ltc-sources.json'), policy: await json('config/ltc-publication.json') });
    console.log('Observations validated before feature or edition writes.');
  } catch { console.error('observations_withheld'); process.exitCode = 1; }
}
