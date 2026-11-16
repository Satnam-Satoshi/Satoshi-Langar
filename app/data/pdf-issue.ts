import rawRegistry from '../../content/ltc-pdf/issues.json';
import { validatePdfRegistry, pdfDisplayIssues, pdfStaticRouteIds } from '../../scripts/lib/ltc-pdf-registry.mjs';
import { ltcEditions, ltcPublicationDays } from './editions';
export type PdfIssue = {
 id:string; date:string; revision:number; title:string; dek:string; preparedDate:string;
 page:string; pdf:string; cover:string; pages:number; size:string; bytes:number; sha256:string;
 coverBytes:number; coverSha256:string; coverWidth:number; coverHeight:number;
 reader?:{path:string;sha256:string;bytes:number};
 correction:null|{replacesId:string;reason:string};
};
export const pdfRegistry = validatePdfRegistry(rawRegistry, {legacyRouteIds:[...ltcEditions.map(issue=>issue.id),...ltcPublicationDays.map(day=>day.date)]});
export const pdfIssues = pdfDisplayIssues(pdfRegistry) as readonly PdfIssue[];
export const pdfIssue: PdfIssue = pdfIssues.find(issue=>issue.id===pdfRegistry.current)!;
export function getPdfIssueByRoute(id:string):PdfIssue|undefined{return pdfIssues.find(issue=>issue.id===id || (issue.revision===1 && issue.date===id));}
export function requirePdfIssue(date:string,revision:number):PdfIssue{const issue=pdfIssues.find(issue=>issue.date===date&&issue.revision===revision);if(!issue)throw new Error(`Missing immutable PDF edition ${date} r${revision}`);return issue;}
export const pdfEditionRouteIds = pdfStaticRouteIds(pdfRegistry) as string[];
// Compatibility name is permanently pinned, never a rotating "previous" pointer.
export const previousPdfIssue: PdfIssue = requirePdfIssue('2026-11-15',1);
