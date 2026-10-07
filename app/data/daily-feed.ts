import { open, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { LtcEdition } from './editions';
import { publicationUpdates } from './edition-calendar';

export const dailyFeedOrigin = 'https://ltcmagazine.org';
export const dailyFeedPath = '/conversations/daily.xml';

export function escapeFeedXml(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/gu, '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

type CoverEnclosure = { url: string; length: number; type: string };
const mimeTypes: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// Build-time local reads only: never fetch, guess a cover, or substitute another edition's artwork.
export async function savedCoverEnclosure(edition: LtcEdition, publicRoot: string): Promise<CoverEnclosure | null> {
  const asset = edition.presentation?.artDirection?.coverAsset;
  if (!asset) return null;
  if (!/^[a-z0-9][a-z0-9/_-]*\.(?:jpe?g|png|webp)$/i.test(asset)) throw new Error(`Invalid saved cover path: ${edition.id}`);
  const base = await realpath(path.join(publicRoot, 'magazine'));
  const file = await realpath(path.join(base, asset));
  if (!file.startsWith(base + path.sep)) throw new Error(`Saved cover escapes public magazine directory: ${edition.id}`);
  const handle = await open(file, 'r');
  try {
    const info = await handle.stat();
    if (!info.isFile() || !Number.isSafeInteger(info.size) || info.size <= 0) throw new Error(`Invalid saved cover file: ${edition.id}`);
    const header = Buffer.alloc(12);
    await handle.read(header, 0, header.length, 0);
    const detected = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff ? 'image/jpeg'
      : header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
        : header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : null;
    if (!detected || detected !== mimeTypes[path.extname(asset).toLowerCase()]) throw new Error(`Saved cover MIME mismatch: ${edition.id}`);
    return { url: `${dailyFeedOrigin}/magazine/${asset}`, length: info.size, type: detected };
  } finally { await handle.close(); }
}

function publishedDate(value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error('Invalid daily feed publication timestamp');
  return new Date(time).toUTCString();
}

export async function buildDailyFeed(records: readonly LtcEdition[], publicRoot = path.resolve('public')) {
  const updates = publicationUpdates(records);
  const items = await Promise.all(updates.map(async edition => {
    if (!/^\d{4}-\d{2}-\d{2}-r[1-9]\d*$/.test(edition.id) || edition.status !== 'published') throw new Error('Invalid daily feed edition');
    const enclosure = await savedCoverEnclosure(edition, publicRoot);
    const corrected = edition.corrections.length > 0;
    const title = `${corrected ? '[Correction] ' : ''}${edition.date} — ${edition.title} (r${edition.revision})`;
    const sources = edition.sources.map(source => `${source.title}: checked ${source.checkedAt}; source as of ${source.sourceAsOf ?? 'not supplied'}; ${source.status}; ${source.url}`).join(' | ');
    const description = [
      edition.dek,
      `AI attribution: ${edition.byline}. Human review: ${edition.humanReview}.`,
      `Edition date: ${edition.date} (${edition.timezone}). Prepared: ${edition.preparedAt}. Published: ${edition.publishedAt}.`,
      `Source dates: ${sources || 'No source records supplied.'}`,
      `Coverage gaps: ${edition.coverageGaps.length ? edition.coverageGaps.join(' | ') : 'None recorded in this saved edition.'}`,
      ...edition.corrections.map(correction => `Correction to ${correction.correctsEditionId}: ${correction.reason}`),
      enclosure ? 'Cover enclosure: the saved artwork attached to this edition.' : 'Cover enclosure: no saved image attached to this edition.',
      'Read the immutable edition for source evidence, missing coverage and corrections.',
    ].join('\n\n');
    return `<item><title>${escapeFeedXml(title)}</title><link>${dailyFeedOrigin}/conversations/editions/${edition.id}/</link><guid isPermaLink="false">ltc:edition:${edition.id}</guid><pubDate>${publishedDate(edition.publishedAt)}</pubDate><description>${escapeFeedXml(description)}</description><category>Daily edition</category><category>${escapeFeedXml(edition.classification)}</category><category>AI-prepared</category>${corrected ? '<category>Correction</category>' : ''}${enclosure ? `<enclosure url="${escapeFeedXml(enclosure.url)}" length="${enclosure.length}" type="${enclosure.type}"/>` : ''}</item>`;
  }));
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>LTC Media — Daily editions</title><link>${dailyFeedOrigin}/conversations/</link><description>Published daily LTC editions and their corrections only. AI attribution, source dates, coverage gaps and human-review status remain attached to every edition.</description><language>en</language><atom:link href="${dailyFeedOrigin}${dailyFeedPath}" rel="self" type="application/rss+xml"/>${updates[0] ? `<lastBuildDate>${publishedDate(updates[0].publishedAt)}</lastBuildDate>` : ''}${items.join('')}</channel></rss>`;
}
