#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectIntelligence, validateIntelligence } from './lib/ltc-intelligence.mjs';
export async function main(argv = process.argv.slice(2)) {
  let output; let evidenceDir; let stdout = false; const deferredSources=[];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--stdout') stdout = true;
    else if (argv[i] === '--defer-litecoin') deferredSources.push('litecoin-blocks');
    else if (argv[i] === '--output' && argv[i + 1]) output = path.resolve(argv[++i]);
    else if (argv[i] === '--evidence-dir' && argv[i + 1]) evidenceDir = path.resolve(argv[++i]);
    else throw Error('Usage: node scripts/collect-ltc-intelligence.mjs [--stdout] [--output path] [--evidence-dir path] [--defer-litecoin]');
  }
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  const result = await collectIntelligence({ deferredSources, onEvidence: evidenceDir ? async ({ source, raw }) => {
    const stem = `${source.id}-${source.index}-${source.retrievedAt.replace(/[:.]/g, '-')}`;
    if (raw !== null) await writeFile(path.join(evidenceDir, `${stem}.body.json`), raw, { flag: 'wx', mode: 0o600 });
    await writeFile(path.join(evidenceDir, `${stem}.metadata.json`), JSON.stringify(source, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  } : undefined });
  validateIntelligence(result);
  const json = JSON.stringify(result, null, 2) + '\n';
  if (output) { await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, json, { flag: 'wx', mode: 0o600 }); }
  if (stdout || !output) process.stdout.write(json);
  else process.stdout.write(JSON.stringify({ status: 'collected', output, network: result.network.status, markets: result.markets.map(m => ({ routeId: m.routeId, status: m.status })) }) + '\n');
  return result.sources.some(s => s.status === 'retrieved') ? 0 : 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 1; });
