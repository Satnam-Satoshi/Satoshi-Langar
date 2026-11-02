import { readFile } from 'node:fs/promises';
import { renderDailyGraphic, saveDailyGraphic } from './render-ltc-daily-graphic.mjs';
try {
  const args = process.argv.slice(2);
  if (args.length !== 3 || args[0] !== '--edition' || args[2] !== '--publish') throw Error('invalid_arguments');
  const edition = JSON.parse(await readFile(args[1], 'utf8'));
  const result = await renderDailyGraphic(edition);
  const saved = await saveDailyGraphic(result);
  console.log(JSON.stringify({ edition: edition.id, pngSha256: result.metadata.pngSha256, saved: saved.saved, deployed: false }));
} catch { console.error('daily_graphic_withheld'); process.exitCode = 1; }
