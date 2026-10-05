import { ltcEditions } from '../../data/editions';
import { buildDailyFeed } from '../../data/daily-feed';

export const dynamic = 'force-static';

export async function GET() {
  return new Response(await buildDailyFeed(ltcEditions), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
