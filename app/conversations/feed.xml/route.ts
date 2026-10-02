import { magazineArticles, articleHref, magazineIssue } from '../../data/magazine';
export const dynamic = 'force-static';
const canonicalBase = 'https://https-github-com-satnam-satoshi-sat.vercel.app';
const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
export function GET() {
  const stories = [
    ...magazineArticles.map(article => ({ title: article.title, description: article.dek, path: articleHref(article.slug), category: article.desk })),
    { title: 'What mNAV can—and cannot—tell us.', description: 'A founding explainer on company ratios, source dates, debt and dilution.', path: '/conversations/methodology/', category: 'Markets & institutions' },
  ];
  const items = stories.map(story => `<item><title>${escapeXml(`[Editorial preview] ${story.title}`)}</title><link>${canonicalBase}${story.path}</link><guid isPermaLink="false">${escapeXml(`ltc:${magazineIssue.id}:${story.path}:preview-v1`)}</guid><description>${escapeXml(`${story.description} Prepared with AI. Human editorial review pending. Sources checked October 1, 2026. This is an editorial preview, not a scheduled or independently audited report.`)}</description><category>${escapeXml(story.category)}</category></item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>LTC — editorial previews</title><link>${canonicalBase}/conversations/</link><description>Original Lunch Time Conversations editorial previews. AI-prepared; human editorial review pending. No automatic daily publication is active.</description><language>en</language><atom:link href="${canonicalBase}/conversations/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
