import type { Metadata } from 'next';
import { previousPdfIssue } from '../../../data/pdf-issue';
import LtcPdfIssue from '../../../components/LtcPdfIssue';
export const metadata: Metadata = {title:'November 16, 2026 · The Next Build · LTC Magazine',description:'The canonical 29-page LTC Magazine daily PDF: a source-led briefing for a new week.',alternates:{canonical:'https://ltcmagazine.org/editions/2026-11-16/'}};
export default function PdfEditionPage(){return <main><nav aria-label="Magazine navigation" style={{padding:'1.5rem'}}><a href="/conversations/">← LTC Magazine</a></nav><LtcPdfIssue full issue={previousPdfIssue}/></main>}
