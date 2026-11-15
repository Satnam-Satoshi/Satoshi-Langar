import type { Metadata } from 'next';
import LtcPdfIssue from '../../components/LtcPdfIssue';
export const metadata: Metadata = { title: 'Latest daily edition · LTC Magazine', description: 'Read the November 15, 2026 Evidence Issue, the same original PDF delivered by email.', alternates: { canonical: 'https://ltcmagazine.org/conversations/editions/2026-11-15/' } };
export default function DailyPage() { return <main><LtcPdfIssue full/><p style={{padding:'1.5rem'}}><a href="/conversations/editions/2026-11-15/">Permanent November 15 edition link →</a></p></main>; }
