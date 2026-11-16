import { pdfRegistry } from '../../data/pdf-issue';
import { withPdfFeedItems } from '../../../scripts/lib/ltc-pdf-feed.mjs';
import { ltcEditions } from '../../data/editions';
import { buildDailyFeed } from '../../data/daily-feed';

export const dynamic = 'force-static';

export async function GET() {
  return new Response(withPdfFeedItems(await buildDailyFeed(ltcEditions),pdfRegistry), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
