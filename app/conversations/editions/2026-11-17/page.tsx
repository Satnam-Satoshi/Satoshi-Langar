import type { Metadata } from 'next';
import November17Issue from '../../../components/November17Issue';
export const metadata: Metadata = {
  title: 'The Filing Clock · November 17, 2026 · LTC Magazine',
  description: 'A connected editorial edition: Bitcoin filings, fund flows, Litecoin holdings, Morpho markets, builders and the dates behind the numbers.',
  alternates: { canonical: 'https://ltcmagazine.org/conversations/editions/2026-11-17/' },
  openGraph: { title: 'The Filing Clock · LTC Magazine', description: 'Read the filing. Respect the date. The November 17, 2026 web edition.' },
};
export default function Page() { return <November17Issue/>; }
