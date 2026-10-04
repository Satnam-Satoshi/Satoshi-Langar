import record from '../../content/specials/proof-of-birthday-r2.json';
import type { AnniversaryPage, AnniversarySource } from './litecoin-anniversary';
export type BirthdayPage = Omit<AnniversaryPage, 'diagram'> & { diagram?: { src?: string; kind: string; labels: string[]; caption: string }; design: string; accent: string; takehome: string; table?: { headings: string[]; rows: string[][]; note: string }; links?: { label: string; href: string }[] };
export const birthday = record as unknown as Omit<typeof record, 'pages' | 'sources'> & { pages: BirthdayPage[]; sources: AnniversarySource[] };
export const birthdayBase = '/conversations/specials/proof-of-birthday/';
export const birthdayPageHref = (page: number) => `${birthdayBase}${page}/`;
export const birthdaySources = new Map<string, AnniversarySource>(birthday.sources.map(source => [source.id, source]));
