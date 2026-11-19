export type PublishedIssue = {date:string;title:string;page:string;dek:string;format:'pdf'|'web';cover?:string};
// Inputs are published records only; do not infer an issue from today's date.
export function selectPublishedIssue(pdf:PublishedIssue,web:PublishedIssue|null):PublishedIssue {
  for(const issue of [pdf,web])if(issue && (!/^\d{4}-\d{2}-\d{2}$/.test(issue.date)||new Date(issue.date+'T00:00:00Z').toISOString().slice(0,10)!==issue.date))throw Error('invalid_published_issue_date');
  return web && web.date>pdf.date?web:pdf;
}
export function previousPublicationDays<T extends {date:string}>(days:T[],current:PublishedIssue,limit=4):T[]{return days.filter(day=>day.date<current.date).slice(0,limit);}

// Saved artDirection assets are relative to public/magazine, matching the
// edition cover renderer and feed enclosure rules. Consumers need a root URL.
export function publishedIssueCoverPath(asset:string|undefined):string|undefined {
  if(!asset)return undefined;
  if(!/^[a-z0-9][a-z0-9/_-]*\.(?:jpe?g|png|webp)$/i.test(asset)||asset.includes('//'))throw Error('invalid_published_issue_cover');
  return `/magazine/${asset}`;
}
