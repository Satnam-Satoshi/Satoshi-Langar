import type { Metadata } from 'next';
import LtcPdfIssue from '../../../components/LtcPdfIssue';
export const metadata: Metadata = {title:'November 15, 2026 · The Evidence Issue · LTC Magazine',description:'The original 28-page LTC Magazine daily PDF: capital, code and clear distinctions.',alternates:{canonical:'https://ltcmagazine.org/conversations/editions/2026-11-15/'}};
export default function PdfEditionPage(){return <main><nav aria-label="Magazine navigation" style={{padding:'1.5rem'}}><a href="/conversations/">← LTC Magazine</a></nav><LtcPdfIssue full/></main>}
