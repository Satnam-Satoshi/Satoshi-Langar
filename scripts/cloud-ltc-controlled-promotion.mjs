import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { verifyImplementation } from './cloud-ltc-release.mjs';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { createControlledPromotionRuntime } from './cloud-ltc-promotion-runtime.mjs';
import { validateControlledPromotionReview, runControlledPromotionRollback, reconcileControlledPromotionRollback, completeControlledRollback } from './cloud-ltc-promotion-acceptance.mjs';

function optionsFor(args) {
  const result = {};
  for (let n = 0; n < args.length; n += 2) { const key = { '--mode': 'mode', '--review': 'review', '--state-config': 'website', '--social-state-config': 'social', '--evidence-config': 'evidence', '--receipt': 'receipt', '--expected-fence': 'fence' }[args[n]]; if (!key || result[key] || !args[n + 1] || args[n + 1].startsWith('--')) throw Error('invalid_controlled_promotion_arguments'); result[key] = args[n + 1]; }
  if (!['exercise', 'reconcile', 'complete-rollback'].includes(result.mode) || !['review', 'website', 'social', 'evidence', 'receipt'].every(key => result[key]) || (result.mode !== 'exercise' && !/^[1-9]\d*$/.test(result.fence ?? ''))) throw Error('invalid_controlled_promotion_arguments');
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = optionsFor(process.argv.slice(2)), env = process.env;
    // Trusted workflow bootstrap must independently guard before executing us.
    await verifyImplementation(process.cwd(), env.LTC_ACCEPTED_IMPLEMENTATION_SHA256);
    const json = async file => JSON.parse(await readFile(path.resolve(file), 'utf8'));
    const review = await json(options.review); validateControlledPromotionReview({ env, review, mode: options.mode });
    const config = await json(options.website), socialConfig = await json(options.social), evidenceConfig = await json(options.evidence);
    const bindings = review.stagePins.bindings;
    if (config.documentId !== bindings.websiteDocumentId || (config.ledgerKey ?? 'website') !== 'website' || socialConfig.documentId !== bindings.socialDocumentId || socialConfig.ledgerKey !== 'social' || [config.folderId, socialConfig.folderId, evidenceConfig.folderId].some(id => id !== bindings.folderId)) throw Error('promotion_private_resource_mismatch');
    const website = await createGoogleStateRuntime({ config, env }), social = await createGoogleStateRuntime({ config: socialConfig, env });
    const directory = await mkdtemp(path.join(tmpdir(), 'ltc-controlled-promotion-'));
    const receipt = { mode: options.mode, status: 'starting', directory, productionAuthorized: false };
    await writeFile(options.receipt, JSON.stringify(receipt) + '\n', { flag: 'wx', mode: 0o600 });
    const save = async update => { Object.assign(receipt, update); await writeFile(options.receipt, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 }); };
    const dependencies = await createControlledPromotionRuntime({ env, review, evidenceConfig, directory, save, allowMutation: options.mode !== 'reconcile', socialState: { inspect: async () => { const { value } = await social.stateAdapter.read('social'); return value; } } });
    const state = new DurableCloudState(website.stateAdapter, 'website');
    const operation = { exercise: runControlledPromotionRollback, reconcile: reconcileControlledPromotionRollback, 'complete-rollback': completeControlledRollback }[options.mode];
    const result = await operation({ env, review, state, dependencies, expectedFence: Number(options.fence) });
    console.log(JSON.stringify(result));
  } catch { console.error('controlled_promotion_withheld_or_reconciliation_required'); process.exitCode = 1; }
}
