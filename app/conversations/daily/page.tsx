import type { Metadata } from 'next';
import LtcPdfIssue from '../../components/LtcPdfIssue';
import { pdfIssue } from '../../data/pdf-issue';
import { formatEditionDate } from '../../data/editions';
export const metadata: Metadata = { title: 'Latest daily edition · LTC Magazine', description: `${formatEditionDate(pdfIssue.date)} · ${pdfIssue.title}. The canonical PDF used for email and the website.`, alternates: { canonical: `https://ltcmagazine.org${pdfIssue.page}` } };
export default function DailyPage() { return <main><LtcPdfIssue full issue={pdfIssue}/><p style={{padding:'1.5rem'}}><a href={pdfIssue.page}>Permanent {formatEditionDate(pdfIssue.date)} edition link →</a></p></main>; }
