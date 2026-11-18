import type { Metadata } from 'next';
import LtcPdfIssue from '../../components/LtcPdfIssue';
export const metadata: Metadata = { title: 'Latest daily edition · LTC Magazine', description: 'Read the November 16, 2026 Next Build, the canonical PDF used for email and the website.', alternates: { canonical: 'https://ltcmagazine.org/conversations/editions/2026-11-16/' } };
export default function DailyPage() { return <main><LtcPdfIssue full/><p style={{padding:'1.5rem'}}><a href="/conversations/editions/2026-11-16/">Permanent November 16 edition link →</a></p></main>; }
