import type { Metadata } from 'next';
import { latestLtcEdition, editionHref, formatEditionDate } from '../../data/editions';
import EditionPage from '../editions/[id]/page';

export const metadata: Metadata = {
  title: latestLtcEdition ? `LTC · Latest issue · ${formatEditionDate(latestLtcEdition.date)}` : 'LTC · Daily issue',
  description: latestLtcEdition?.dek ?? 'The latest published LTC Magazine edition, with dated sources and a permanent archive.',
  alternates: { canonical: latestLtcEdition ? `https://ltcmagazine.org${editionHref(latestLtcEdition.id)}` : 'https://ltcmagazine.org/conversations/archive/' },
};

// This stable entry point renders the real published record. Dated edition URLs
// and the historical design-review PDF remain unchanged in the archive.
export default async function DailyPage() {
  if (!latestLtcEdition) return <main className="launch-wrap reading-content"><h1>The daily issue</h1><p>No edition has been published yet.</p><a href="/conversations/archive/">Open the archive</a></main>;
  return <EditionPage params={Promise.resolve({ id: latestLtcEdition.id })}/>;
}
