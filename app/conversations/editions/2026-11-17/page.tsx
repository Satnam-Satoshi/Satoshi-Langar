import type { Metadata } from 'next';
import LtcPdfIssue from '../../../components/LtcPdfIssue';
export const metadata: Metadata={title:'November 17, 2026 · The Filing Clock · LTC Magazine',description:'The 29-page public web derivative of the November 17 LTC Magazine daily edition.',alternates:{canonical:'https://ltcmagazine.org/editions/2026-11-17/'}};
export default function Page(){return <main><nav aria-label="Magazine navigation" style={{padding:'1.5rem'}}><a href="/conversations/">← LTC Magazine</a></nav><LtcPdfIssue full/></main>}
