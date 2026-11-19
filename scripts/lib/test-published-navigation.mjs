import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {publicEditions} from './ltc-public-editions.mjs';
const metadata=readFileSync('app/data/pdf-issue.ts','utf8');
const row=/export const pdfIssue: PdfIssue = \{ date: '([^']+)', title: '([^']+)', page: '([^']+)'/.exec(metadata);
assert.ok(row,'Canonical PDF metadata must remain readable by navigation verification');
export const latestPdf={date:row[1],title:row[2],page:row[3]};
const records=publicEditions(JSON.parse(readFileSync('content/ltc/index.json')),JSON.parse(readFileSync('config/ltc-publication-exclusions.json')));
export const newestWeb=records.filter(r=>r.status==='published').sort((a,b)=>b.date.localeCompare(a.date)||b.revision-a.revision)[0];
// Independent expected outcome from published data, not the UI selector.
export const expectedLatest=newestWeb&&newestWeb.date>latestPdf.date?{...newestWeb,page:`/conversations/editions/${newestWeb.date}/`}:latestPdf;
export const expectedDateLabel=new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'UTC'}).format(new Date(expectedLatest.date+'T12:00:00Z'));
export const expectedWebLabel=newestWeb&&newestWeb.date>latestPdf.date?'Latest published web issue':'Latest web briefing';
export function assertCurrentNotice(html,route){
 const notice=/<aside\b[^>]*aria-label="Latest published magazine issue"[^>]*>([\s\S]*?)<\/aside>/.exec(html)?.[1];
 assert.ok(notice,`${route}: global issue notice exists`);
 assert.ok(notice.includes(`Latest published · ${expectedDateLabel}`),`${route}: latest date matches published records`);
 const href=/<a\b[^>]*href="([^"]+)"/.exec(notice)?.[1];
 assert.equal(new URL(href,`https://example.test/${route.endsWith('.html')?route:route.replace(/\/$/,'')+'/'}`).pathname.replace(/index\.html$/,''),expectedLatest.page,`${route}: global latest URL`);
}
