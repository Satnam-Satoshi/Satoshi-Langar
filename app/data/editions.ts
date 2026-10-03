import storedEditions from '../../content/ltc/index.json';
import { publicationDays, publicationMonths } from './edition-calendar';

export type LtcObservation = {
  metric: string; label: string; value: string; unit: string;
  effectiveAt: string; timePrecision: 'date' | 'second'; classification: string;
};
export type LtcEditionSource = {
  id: string; title: string; url: string; kind: 'primary' | 'secondary';
  checkedAt: string; sourceAsOf: string | null; sourceSha256: string | null;
  parserVersion: string; status: 'collected' | 'reference-retrieved' | 'unavailable';
  freshness: string; httpStatus: number | null; errorCode: string | null;
  observations: LtcObservation[] | null;
};
export type LtcBrief = {
  id: string; desk: string; headline: string; paragraphs: string[];
  sourceIds: string[]; effectiveAt: string;
};
export type LtcEditionPresentation = {
  schemaVersion: 1;
  cover: {
    theme: string; palette: 'ember' | 'cobalt' | 'forest' | 'ochre';
    motif: 'orbits' | 'timechain' | 'signal' | 'constellation' | 'ledger' | 'horizon' | 'weave';
    title: string; subtitle: string; kicker: string; seed: string;
  };
  backPage: { title: string; prompt: string; practice: string; closingLine: string };
  readingOrder: string[];
};
export type LtcEdition = {
  schemaVersion: 1; id: string; date: string; revision: number; title: string; dek: string;
  preparedAt: string; publishedAt: string; timezone: 'America/New_York';
  status: 'published'; classification: 'Automated source briefing'; byline: string;
  humanReview: string; sourceSnapshotSha256: string; publicationPolicy: 'bounded-daily-v1';
  briefs: LtcBrief[]; sources: LtcEditionSource[]; coverageGaps: string[];
  corrections: { reason: string; correctsEditionId: string }[];
  presentation?: LtcEditionPresentation;
};

export const ltcPublicationDays = publicationDays(storedEditions as LtcEdition[]);
export const ltcPublicationMonths = publicationMonths(ltcPublicationDays);
export const ltcEditions = ltcPublicationDays.flatMap(day => day.revisions);
export const latestLtcEdition: LtcEdition | undefined = ltcPublicationDays[0]?.latest;
export function formatEditionDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
export function editionHref(id: string) { return `/conversations/editions/${id}/`; }
export function editionDateHref(date: string) { return editionHref(date); }
export function archiveMonthHref(month: string) { return `/conversations/archive/${month}/`; }
