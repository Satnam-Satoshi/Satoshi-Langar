import { ltcEditions } from '../../data/editions';
import { buildNewsletterFeed } from '../../data/newsletter-feed';
export const dynamic = 'force-static';
export async function GET() {
 return new Response(await buildNewsletterFeed(ltcEditions), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
