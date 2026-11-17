export type PdfIssue = { date: string; title: string; page: string; pdf: string; cover: string; pages: number; size: string; dek: string; publicDerivative?: boolean; webEdition?: boolean };
export const novemberFifteenPdfIssue: PdfIssue = { date: '2026-11-15', title: 'The Evidence Issue', page: '/conversations/editions/2026-11-15/', pdf: '/magazine/daily/LTC-2026-11-15-v1.0.pdf', cover: '/magazine/daily/LTC-2026-11-15-v1.0-cover.png', pages: 28, size: '130 KB', dek: 'Capital. Code. Clear distinctions.' };
export const previousPdfIssue: PdfIssue = { date: '2026-11-16', title: 'The Next Build', page: '/conversations/editions/2026-11-16/', pdf: '/magazine/daily/LTC-2026-11-16-v1.0.pdf', cover: '/magazine/daily/LTC-2026-11-16-v1.0-cover.png', pages: 29, size: '179 KB', dek: 'A source-led briefing for a new week.' };

export const pdfIssue: PdfIssue = { date: '2026-11-17', title: 'The Filing Clock', page: '/conversations/editions/2026-11-17/', pdf: '', cover: '/magazine/daily/LTC-2026-11-17-v1.0-public-cover.png', pages: 29, size: '', dek: 'Read the filing. Respect the date.', webEdition: true };
export const publishedPdfIssues = [pdfIssue, previousPdfIssue, novemberFifteenPdfIssue];
