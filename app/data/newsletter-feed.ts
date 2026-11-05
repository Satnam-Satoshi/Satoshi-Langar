import path from 'node:path';
import type { LtcEdition } from './editions';
import { publicationUpdates } from './edition-calendar';
import { dailyFeedOrigin, escapeFeedXml, savedCoverEnclosure } from './daily-feed';

export const newsletterFeedPath = '/conversations/newsletter.xml';
const maximumItems = 20;
const metric = /(?:[$€£]\s*\d|\d[\d,.]*\s*%|\b(?:APY|APR)\b|\b(?:BTC|LTC|USD|USDC)\s*[:=]?\s*\d|\d[\d,.]*\s*(?:USD|USDC|BTC|LTC)\b)/i;
function text(value: unknown, limit: number): string {
 if(typeof value!=='string'||!value.trim())throw Error('Invalid newsletter text');
 const clean=value.replace(/\s+/g,' ').trim();
 return clean.length>limit?clean.slice(0,limit-1).trimEnd()+'…':clean;
}
function date(value: unknown): string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error('Invalid newsletter publication timestamp');
 return new Date(value).toUTCString();
}
function validate(edition: LtcEdition) {
 if(!edition||edition.status!=='published'||!/^\d{4}-\d{2}-\d{2}-r[1-9]\d*$/.test(edition.id)||edition.id!==`${edition.date}-r${edition.revision}`||!Number.isSafeInteger(edition.revision)||new Date(`${edition.date}T00:00:00Z`).toISOString().slice(0,10)!==edition.date)throw Error('Invalid newsletter edition');
 date(edition.publishedAt);text(edition.title,180);text(edition.byline,240);text(edition.humanReview,180);
 if(!Array.isArray(edition.corrections))throw Error('Invalid newsletter corrections');
 for(const correction of edition.corrections)if(!/^\d{4}-\d{2}-\d{2}-r[1-9]\d*$/.test(correction.correctsEditionId)||!correction.reason?.trim())throw Error('Invalid newsletter correction');
 if(edition.features){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(edition.features.issueDate)||!Array.isArray(edition.features.stories)||!Array.isArray(edition.features.sources))throw Error('Invalid newsletter features');
  text(edition.features.title,180);
  for(const story of edition.features.stories){text(story.title,180);text(story.dek,220);if(!Array.isArray(story.sourceIds))throw Error('Invalid newsletter story sources');}
 }
}
export function newsletterDescription(edition: LtcEdition) {
 validate(edition);
 const features=edition.features;
 const heading=features?.title??edition.title;
 const lines=[`Edition ${edition.date} · ${edition.timezone}.`,metric.test(heading)?'Open the saved edition for this issue’s headline.':text(heading,180)];
 if(features&&features.issueDate!==edition.date)lines.push(`Carried-forward feature reading dated ${features.issueDate}; not newly reported on the edition date.`);
 const stories=(features?.stories??[]).filter(story=>!metric.test(story.title)).slice(0,3);
 for(const story of stories){
  const dates=[...new Set(story.sourceIds.map(id=>features?.sources.find(source=>source.id===id)?.publishedAt).filter((value):value is string=>typeof value==='string'&&value.length>0))];
  const publicationDates=dates.slice(0,3).map(value=>text(value,60)).join('; ');
  lines.push(`${text(story.title,150)}${metric.test(story.dek)?'':` — ${text(story.dek,220)}`}\nOriginal source publication: ${publicationDates||'not supplied in this saved feature'}.`);
 }
 if(!stories.length)lines.push('Read this saved edition online for its reporting and dated sourcebook.');
 for(const correction of edition.corrections.slice(0,3))lines.push(`Correction to ${correction.correctsEditionId}: ${text(correction.reason,240)}`);
 lines.push(`AI attribution: ${text(edition.byline,240)}. Human review: ${text(edition.humanReview,180)}.`,`Read online + sourcebook: ${dailyFeedOrigin}/conversations/editions/${edition.id}/`);
 return lines.join('\n\n');
}
export async function buildNewsletterFeed(records: readonly LtcEdition[],publicRoot=path.resolve('public')) {
 records.forEach(validate);
 if(new Set(records.map(record=>record.id)).size!==records.length)throw Error('Duplicate newsletter edition');
 const updates=publicationUpdates(records).slice(0,maximumItems);
 const items=await Promise.all(updates.map(async edition=>{
  const enclosure=await savedCoverEnclosure(edition,publicRoot);
  const headline=edition.features?.title??edition.title;
  const title=`${edition.corrections.length?'[Correction] ':''}${edition.date} — ${metric.test(headline)?'The saved daily edition':text(headline,180)} (r${edition.revision})`;
  return `<item><title>${escapeFeedXml(title)}</title><link>${dailyFeedOrigin}/conversations/editions/${edition.id}/</link><guid isPermaLink="false">ltc:edition:${edition.id}</guid><pubDate>${date(edition.publishedAt)}</pubDate><description>${escapeFeedXml(newsletterDescription(edition))}</description><category>Daily edition</category><category>AI-prepared</category>${edition.corrections.length?'<category>Correction</category>':''}${enclosure?`<enclosure url="${escapeFeedXml(enclosure.url)}" length="${enclosure.length}" type="${enclosure.type}"/>`:''}</item>`;
 }));
 return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>LTC Magazine — Daily reading letter</title><link>${dailyFeedOrigin}/conversations/</link><description>Concise AI-prepared previews of saved daily editions. Source publication dates remain separate from edition dates; read each sourcebook for evidence, gaps and corrections.</description><language>en</language><atom:link href="${dailyFeedOrigin}${newsletterFeedPath}" rel="self" type="application/rss+xml"/>${updates[0]?`<lastBuildDate>${date(updates[0].publishedAt)}</lastBuildDate>`:''}${items.join('')}</channel></rss>`;
}
