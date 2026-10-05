// Static-export SEO has one route policy shared by HTML, sitemaps and checks.
// This module makes no requests and reads no credentials or private records.
export const SEO_SITES = Object.freeze({
  community: Object.freeze({ origin: 'https://satnamsatoshi.com', name: 'Satnam Satoshi', fallbackImage: '/brand/satnam-launch-share.png', about: '/about/' }),
  magazine: Object.freeze({ origin: 'https://ltcmagazine.org', name: 'LTC Magazine', fallbackImage: '/brand/ltc-launch-share.png', about: '/conversations/about/' }),
});
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>';
const SITE_SCHEMA = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const instant = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
export const escapeSeoText = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const decodeText = value => value.replace(/&(?:amp|lt|gt|quot|apos|#(?:x[0-9a-f]+|\d+));/gi, token => {
  const entity = token.slice(1, -1); const known = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  if (Object.hasOwn(known, entity)) return known[entity];
  if (!entity.startsWith('#')) return token;
  const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
  return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
});
const cleanText = value => decodeText(value).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
const attrsOf = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([, name, double, single]) => [name.toLowerCase(), decodeText(double ?? single)]));
const metaTags = head => [...head.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attrsOf(tag));
const metaValue = (head, name) => metaTags(head).find(attrs => (attrs.name ?? attrs.property)?.toLowerCase() === name)?.content;
const mainHtml = html => html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? '';

export function routeSeoPolicy(file, editions = []) {
  assert(typeof file === 'string' && /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.html$/.test(file) && !file.split('/').includes('..'), 'Invalid exported HTML path');
  const route = file === 'index.html' ? '/' : file.endsWith('/index.html') ? `/${file.slice(0, -10)}` : `/${file}`;
  const brand = route.startsWith('/conversations/') ? 'magazine' : 'community';
  const site = SEO_SITES[brand];
  const privateEntry = /^\/(?:auth|sign-in|welcome|account-help)(?:\/|\.html$)/.test(route);
  const excluded = privateEntry || /^\/(?:404|_not-found)(?:\/|\.html$)/.test(route) || route.endsWith('/print/') || route.startsWith('/conversations/specials/litecoin-at-15/');
  const editionMatch = /^\/conversations\/editions\/(\d{4}-\d{2}-\d{2})(?:-r([1-9]\d*))?\/$/.exec(route);
  let edition = null; let canonicalRoute = route;
  if (editionMatch) {
    const [, date, revision] = editionMatch;
    const day = editions.filter(item => item.date === date && item.status === 'published').sort((a, b) => b.revision - a.revision);
    edition = revision ? day.find(item => item.id === `${date}-r${revision}`) : day[0];
    if (edition && (!revision || edition.id === day[0].id)) canonicalRoute = `/conversations/editions/${date}/`;
  }
  return { route, canonicalRoute, canonical: `${site.origin}${canonicalRoute}`, brand, site, privateEntry, excluded, edition };
}

function imageCandidate(value, site) {
  if (typeof value !== 'string' || /[\s\\%?#]/.test(value)) return null;
  let url;
  try { url = new URL(value, site.origin); } catch { return null; }
  if (![SEO_SITES.community.origin, SEO_SITES.magazine.origin].includes(url.origin) || url.username || url.password || url.port) return null;
  if (!/^\/(?:brand|magazine|home|images|miikey|learning|community)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/i.test(url.pathname) || url.pathname.includes('/../')) return null;
  return `${site.origin}${url.pathname}`;
}

export function seoModel(html, file, { editions = [] } = {}) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert(head !== undefined, `Missing head: ${file}`);
  const policy = routeSeoPolicy(file, editions);
  const title = cleanText(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  assert(title.length > 0 && title.length <= 500, `Missing or excessive page title: ${file}`);
  const description = cleanText(metaValue(head, 'description') ?? '');
  assert(description.length <= 2000, `Excessive description: ${file}`);
  const candidate = imageCandidate(metaValue(head, 'og:image'), policy.site) ??
    [...mainHtml(html).matchAll(/<img\b[^>]*>/gi)].map(([tag]) => imageCandidate(attrsOf(tag).src, policy.site)).find(Boolean);
  const image = candidate ?? `${policy.site.origin}${policy.site.fallbackImage}`;
  const existingRobots = metaValue(head, 'robots') ?? '';
  const noindex = policy.excluded || /(?:^|[,\s])noindex(?:$|[,\s])/i.test(existingRobots);
  const robots = noindex ? `noindex, ${policy.privateEntry || /nofollow/i.test(existingRobots) ? 'nofollow' : 'follow'}` : 'index, follow, max-image-preview:large';
  const model = { ...policy, title, description, image, noindex, robots };
  return model;
}

// JSON-LD is data, not an executable enhancement. Escape HTML delimiters so
// even a hostile literal title cannot terminate this script element.
export function safeSeoJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
}

export function structuredSeo(model) {
  const { site, canonical, title, description, image, route, edition } = model;
  const website = `${site.origin}/#website`;
  const page = { '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical, name: title, ...(description ? { description } : {}), inLanguage: 'en', isPartOf: { '@id': website }, primaryImageOfPage: { '@type': 'ImageObject', url: image } };
  const graph = [page];
  if (route === '/' || route === '/conversations/') {
    graph.push({ '@type': 'WebSite', '@id': website, url: `${site.origin}/`, name: site.name, ...(model.brand === 'magazine' ? { alternateName: ['LTC Media', 'Lunch Time Conversations'] } : {}) });
  }
  if (edition) {
    assert(instant(edition.publishedAt), `Invalid saved publication timestamp: ${edition.id}`);
    graph.push({ '@type': 'Article', '@id': `${canonical}#article`, url: canonical, mainEntityOfPage: { '@id': `${canonical}#webpage` }, headline: edition.title, description: edition.dek, image: [image], datePublished: edition.publishedAt, author: { '@type': 'Organization', name: 'LTC Media', url: 'https://ltcmagazine.org/conversations/about/' }, publisher: { '@type': 'Organization', name: 'LTC Media', url: 'https://ltcmagazine.org/conversations/' } });
  }
  // Generic pages and advance specials receive no invented publication date,
  // legal status, human author, endorsement, review or external social profile.
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function applySiteSeo(html, file, options = {}) {
  const model = seoModel(html, file, options);
  const tag = (name, content, property = false) => `<meta ${property ? 'property' : 'name'}="${name}" content="${escapeSeoText(content)}"/>`;
  const metadata = `<link rel="canonical" href="${model.canonical}"/>` + tag('robots', model.robots) +
    tag('og:type', model.edition ? 'article' : 'website', true) + tag('og:site_name', model.site.name, true) + tag('og:title', model.title, true) + tag('og:description', model.description, true) + tag('og:url', model.canonical, true) + tag('og:image', model.image, true) + tag('og:image:alt', model.title, true) +
    tag('twitter:card', 'summary_large_image') + tag('twitter:title', model.title) + tag('twitter:description', model.description) + tag('twitter:image', model.image) + tag('twitter:image:alt', model.title) +
    (model.noindex ? '' : `<script type="application/ld+json" data-site-seo="v1">${safeSeoJson(structuredSeo(model))}</script>`);
  const output = html.replace(/<head\b[^>]*>([\s\S]*?)<\/head>/i, (whole, head) => {
    const cleaned = head.replace(/<link\b[^>]*>/gi, tag => attrsOf(tag).rel?.toLowerCase() === 'canonical' ? '' : tag)
      .replace(/<meta\b[^>]*>/gi, tag => { const attrs = attrsOf(tag); const name = (attrs.name ?? attrs.property ?? '').toLowerCase(); return name === 'robots' || name.startsWith('og:') || name.startsWith('twitter:') ? '' : tag; })
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, tag => attrsOf(tag).type?.toLowerCase() === 'application/ld+json' ? '' : tag);
    return whole.replace(head, `${cleaned}${metadata}`);
  });
  return { html: output, model };
}

export function buildSeoSitemaps(models) {
  const urls = { community: new Set(), magazine: new Set() };
  for (const model of models) if (!model.noindex) urls[model.brand].add(model.canonical);
  const file = brand => `${XML_HEAD}<urlset xmlns="${SITE_SCHEMA}">${[...urls[brand]].sort().map(url => `<url><loc>${escapeSeoText(url)}</loc></url>`).join('')}</urlset>\n`;
  const named = [`${SEO_SITES.community.origin}/sitemap-community.xml`, `${SEO_SITES.magazine.origin}/sitemap-magazine.xml`];
  return {
    'sitemap-community.xml': file('community'),
    'sitemap-magazine.xml': file('magazine'),
    'sitemap.xml': `${XML_HEAD}<sitemapindex xmlns="${SITE_SCHEMA}">${named.map(url => `<sitemap><loc>${url}</loc></sitemap>`).join('')}</sitemapindex>\n`,
    // Auth entry points are crawlable so their explicit noindex is visible.
    // These are public static pages, not a robots-based access-control boundary.
    'robots.txt': `User-agent: *\nAllow: /\n${named.map(url => `Sitemap: ${url}`).join('\n')}\n`,
  };
}

export function validatePageSeo(html, file, { editions = [], assetPaths } = {}) {
  const failures = []; let model;
  try { model = seoModel(html, file, { editions }); } catch (error) { return { failures: [error.message], model: null }; }
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)[1];
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attrsOf(tag)).filter(attrs => attrs.rel?.toLowerCase() === 'canonical');
  if (links.length !== 1 || links[0].href !== model.canonical) failures.push('canonical differs from route/domain policy');
  const tags = metaTags(head);
  const expected = { robots: model.robots, 'og:type': model.edition ? 'article' : 'website', 'og:site_name': model.site.name, 'og:title': model.title, 'og:description': model.description, 'og:url': model.canonical, 'og:image': model.image, 'twitter:card': 'summary_large_image', 'twitter:title': model.title, 'twitter:description': model.description, 'twitter:image': model.image };
  for (const [name, value] of Object.entries(expected)) {
    const matches = tags.filter(attrs => (attrs.name ?? attrs.property)?.toLowerCase() === name);
    if (matches.length !== 1 || matches[0].content !== value) failures.push(`invalid or duplicate ${name}`);
  }
  if (assetPaths && !assetPaths.has(new URL(model.image).pathname.slice(1))) failures.push(`share image is absent: ${model.image}`);
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(([, attrs]) => attrsOf(attrs).type?.toLowerCase() === 'application/ld+json');
  if (model.noindex ? blocks.length !== 0 : blocks.length !== 1) failures.push('unexpected structured-data block count');
  if (!model.noindex && blocks.length === 1) {
    const [, rawAttrs, rawJson] = blocks[0]; const attrs = attrsOf(rawAttrs);
    if (Object.keys(attrs).sort().join(',') !== 'data-site-seo,type' || attrs['data-site-seo'] !== 'v1' || /[<>&\u2028\u2029]/u.test(rawJson)) failures.push('structured data contains unsafe serialization or attributes');
    try { if (JSON.stringify(JSON.parse(rawJson)) !== JSON.stringify(structuredSeo(model))) failures.push('structured data differs from controlled page fields'); } catch { failures.push('invalid structured-data JSON'); }
  }
  return { failures, model };
}
