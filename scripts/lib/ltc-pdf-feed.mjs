import {pdfDisplayIssues} from './ltc-pdf-registry.mjs';
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
/** No fabricated publication timestamp: preparedDate is described, not used as pubDate. */
export function pdfFeedItems(registry){return pdfDisplayIssues(registry).map(issue=>`<item><title>${escape(`${issue.correction?'[Correction] ':''}${issue.date} — ${issue.title} (r${issue.revision})`)}</title><link>https://ltcmagazine.org${issue.page}</link><guid isPermaLink="false">ltc:pdf:${issue.id}</guid><description>${escape(`${issue.dek} Canonical ${issue.pages}-page PDF. Prepared ${issue.preparedDate}. Source dates, scope and coverage notes are preserved inside the PDF.${issue.correction?` Correction of ${issue.correction.replacesId}: ${issue.correction.reason}`:''}`)}</description><category>Daily PDF edition</category><enclosure url="https://ltcmagazine.org${issue.pdf}" length="${issue.bytes}" type="application/pdf"/></item>`).join('');}
export function withPdfFeedItems(xml,registry){
 if(!xml.includes('</channel>'))throw Error('invalid-base-rss');
 if(xml.includes('<guid isPermaLink="false">ltc:pdf:'))throw Error('duplicate-pdf-feed-integration');
 return xml.replace(/<lastBuildDate>[^<]*<\/lastBuildDate>/g,'').replace('</channel>',`${pdfFeedItems(registry)}</channel>`);
}
