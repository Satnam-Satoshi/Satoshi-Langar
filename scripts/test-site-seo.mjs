import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applySiteSeo, buildSeoSitemaps, routeSeoPolicy, safeSeoJson, SEO_SITES, validatePageSeo } from './lib/site-seo.mjs';

const editions = [
  { id: '2026-10-05-r2', date: '2026-10-05', revision: 2, status: 'published', title: 'A corrected record', dek: 'Original facts with a visible correction.', publishedAt: '2026-10-05T17:00:00.000Z' },
  { id: '2026-10-05-r1', date: '2026-10-05', revision: 1, status: 'published', title: 'The original record', dek: 'Original archived facts.', publishedAt: '2026-10-05T04:21:21.525Z' },
  { id: '2026-10-04-r1', date: '2026-10-04', revision: 1, status: 'published', title: 'The earlier day', dek: 'A different day.', publishedAt: '2026-10-04T14:00:00.000Z' },
];
const doc = ({ title = 'A real page title', description = 'A real page description.', head = '', main = '' } = {}) => `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>${title}</title><meta name="description" content="${description}"/>${head}</head><body><main><h1>Visible heading</h1><a href="../../join/index.html#start">Join</a>${main}</main></body></html>`;
const assets = new Set(['brand/satnam-launch-share.png', 'brand/ltc-launch-share.png', 'magazine/daily/cover.jpg', 'magazine/proof-of-birthday/front.jpg', 'home/community.jpg']);
const render = (file, input = doc()) => applySiteSeo(input, file, { editions });
const validate = (html, file, assetPaths = assets) => validatePageSeo(html, file, { editions, assetPaths }).failures;
const structured = html => JSON.parse(html.match(/<script type="application\/ld\+json" data-site-seo="v1">([\s\S]*?)<\/script>/)[1]);

test('route policy assigns every brand correctly and refuses traversal/URL-like exported paths', () => {
  assert.equal(routeSeoPolicy('index.html').canonical, 'https://satnamsatoshi.com/');
  assert.equal(routeSeoPolicy('langar/index.html').canonical, 'https://satnamsatoshi.com/langar/');
  assert.equal(routeSeoPolicy('conversations/index.html').canonical, 'https://ltcmagazine.org/conversations/');
  assert.equal(routeSeoPolicy('conversations/specials/proof-of-birthday/84/index.html').canonical, 'https://ltcmagazine.org/conversations/specials/proof-of-birthday/84/');
  for (const file of ['../index.html', 'conversations/../index.html', '/index.html', 'https://evil.example/index.html', 'conversations\\index.html', 'index.html?fake']) assert.throws(() => routeSeoPolicy(file));
});

test('current revision aliases canonicalize to their day while older correction records remain individually addressable', () => {
  const unchanged = JSON.stringify(editions);
  assert.equal(routeSeoPolicy('conversations/editions/2026-10-05-r2/index.html', editions).canonical, 'https://ltcmagazine.org/conversations/editions/2026-10-05/');
  assert.equal(routeSeoPolicy('conversations/editions/2026-10-05/index.html', editions).edition.id, '2026-10-05-r2');
  assert.equal(routeSeoPolicy('conversations/editions/2026-10-05-r1/index.html', editions).canonical, 'https://ltcmagazine.org/conversations/editions/2026-10-05-r1/');
  assert.equal(routeSeoPolicy('conversations/editions/2026-10-04-r1/index.html', editions).canonical, 'https://ltcmagazine.org/conversations/editions/2026-10-04/');
  assert.equal(JSON.stringify(editions), unchanged);
});

test('community content aliases share their destination canonical without changing their reading links', () => {
  const models = [];
  for (const [alias, destination] of [['community', 'connect'], ['support', 'donate'], ['projects', 'ecosystem']]) {
    const input = doc({ main: `<a href="../${alias}/index.html">Existing alias link</a>` });
    const { html, model } = render(`${alias}/index.html`, input);
    models.push(model, render(`${destination}/index.html`).model);
    assert.equal(model.canonical, `https://satnamsatoshi.com/${destination}/`);
    assert.equal(model.noindex, false);
    assert.equal(html.split('</head>')[1], input.split('</head>')[1]);
    assert.deepEqual(validate(html, `${alias}/index.html`), []);
  }
  const sitemap = buildSeoSitemaps(models)['sitemap-community.xml'];
  assert.equal((sitemap.match(/<url>/g) ?? []).length, 3);
  for (const alias of ['community', 'support', 'projects']) assert.ok(!sitemap.includes(`/${alias}/`));
});

test('actual title/description become unique branded large share metadata, replacing inherited values', () => {
  const input = doc({ title: 'Proof of Birthday · Litecoin at 15', description: 'An 84-page advance edition.', head: '<link rel="canonical" href="https://old.example/"/><meta property="og:title" content="Wrong parent"/><meta name="twitter:title" content="Wrong parent"/><meta name="twitter:card" content="summary"/>' });
  const { html } = render('conversations/specials/proof-of-birthday/index.html', input);
  assert.deepEqual(validate(html, 'conversations/specials/proof-of-birthday/index.html'), []);
  assert.ok(!html.includes('Wrong parent')); assert.ok(!html.includes('https://old.example'));
  assert.ok(html.includes('property="og:site_name" content="LTC Magazine"'));
  assert.ok(html.includes('name="twitter:title" content="Proof of Birthday · Litecoin at 15"'));
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
});

test('uses a valid existing cover, then a real content image, then the appropriate local fallback', () => {
  const og = render('conversations/index.html', doc({ head: '<meta property="og:image" content="https://satnamsatoshi.com/magazine/daily/cover.jpg"/>', main: '<img src="/magazine/proof-of-birthday/front.jpg"/>' }));
  assert.equal(og.model.image, 'https://ltcmagazine.org/magazine/daily/cover.jpg');
  const body = render('conversations/specials/proof-of-birthday/index.html', doc({ head: '<meta property="og:image" content="https://evil.example/tracker.jpg"/>', main: '<img src="/brand/ltc-media-logo.svg"/><img src="/magazine/proof-of-birthday/front.jpg"/>' }));
  assert.equal(body.model.image, 'https://ltcmagazine.org/magazine/proof-of-birthday/front.jpg');
  assert.equal(render('langar/index.html').model.image, `${SEO_SITES.community.origin}${SEO_SITES.community.fallbackImage}`);
  assert.equal(render('conversations/archive/index.html').model.image, `${SEO_SITES.magazine.origin}${SEO_SITES.magazine.fallbackImage}`);
  assert.match(validate(og.html, 'conversations/index.html', new Set()).join(' '), /share image is absent/);
});

test('auth/private entry, error, print and retired routes are explicitly noindex and excluded from discovery', () => {
  const paths = ['auth/callback/index.html', 'sign-in/index.html', 'welcome/index.html', 'account-help/index.html', '404.html', '_not-found/index.html', 'conversations/specials/proof-of-birthday/print/index.html', 'conversations/specials/litecoin-at-15/1/index.html'];
  const models = [];
  for (const file of paths) {
    const { html, model } = render(file); models.push(model);
    assert.equal(model.noindex, true); assert.match(html, /name="robots" content="noindex,/);
    assert.ok(!html.includes('application/ld+json')); assert.deepEqual(validate(html, file), []);
  }
  const sitemaps = buildSeoSitemaps(models);
  assert.ok(!sitemaps['sitemap-community.xml'].includes('<url>'));
  assert.ok(!sitemaps['sitemap-magazine.xml'].includes('<url>'));
  assert.ok(!sitemaps['robots.txt'].includes('Disallow: /auth/'), 'Google must be able to read the explicit noindex');
});

test('named sitemaps contain only their canonical domains, de-duplicate aliases and have no invented lastmod', () => {
  const models = ['index.html', 'langar/index.html', 'conversations/index.html', 'conversations/editions/2026-10-05/index.html', 'conversations/editions/2026-10-05-r2/index.html', 'conversations/editions/2026-10-05-r1/index.html', 'welcome/index.html'].map(file => render(file).model);
  const result = buildSeoSitemaps(models);
  assert.equal((result['sitemap-community.xml'].match(/<url>/g) ?? []).length, 2);
  assert.equal((result['sitemap-magazine.xml'].match(/<url>/g) ?? []).length, 3);
  assert.ok(!result['sitemap-community.xml'].includes('ltcmagazine.org'));
  assert.ok(!result['sitemap-magazine.xml'].includes('satnamsatoshi.com'));
  assert.ok(!result['sitemap-magazine.xml'].includes('2026-10-05-r2/'));
  assert.ok(result['sitemap-magazine.xml'].includes('2026-10-05-r1/'));
  assert.ok(result['sitemap.xml'].includes('<sitemapindex '));
  assert.ok(result['robots.txt'].includes('Sitemap: https://satnamsatoshi.com/sitemap-community.xml'));
  assert.ok(result['robots.txt'].includes('Sitemap: https://ltcmagazine.org/sitemap-magazine.xml'));
  assert.ok(!JSON.stringify(result).includes('vercel.app'));
  assert.ok(!result['sitemap-community.xml'].includes('lastmod'));
  assert.ok(result['sitemap-magazine.xml'].includes('<loc>https://ltcmagazine.org/conversations/</loc></url>'));
  assert.ok(result['sitemap-magazine.xml'].includes(`<loc>https://ltcmagazine.org/conversations/editions/2026-10-05/</loc><lastmod>${editions[0].publishedAt}</lastmod>`));
  assert.ok(result['sitemap-magazine.xml'].includes(`<loc>https://ltcmagazine.org/conversations/editions/2026-10-05-r1/</loc><lastmod>${editions[1].publishedAt}</lastmod>`));
  assert.equal((result['sitemap-magazine.xml'].match(/<lastmod>/g) ?? []).length, 2);
  assert.deepEqual(buildSeoSitemaps([...models].reverse()), result);
});

test('corrections preserve first publication and each archived revision uses only its own recorded modification', () => {
  const original = editions[1].publishedAt;
  const newest = { ...editions[0], id: '2026-10-05-r3', revision: 3, publishedAt: '2026-10-06T09:00:00.000Z' };
  const draft = { ...newest, id: '2026-10-05-r4', revision: 4, status: 'draft', publishedAt: '2099-01-01T00:00:00.000Z' };
  const records = [draft, ...editions, newest];
  const models = [];
  for (const [id, modified] of [['2026-10-05', newest.publishedAt], ['2026-10-05-r3', newest.publishedAt], ['2026-10-05-r2', editions[0].publishedAt], ['2026-10-05-r1', null]]) {
    const file = `conversations/editions/${id}/index.html`;
    const { html, model } = applySiteSeo(doc(), file, { editions: records }); models.push(model);
    const article = structured(html)['@graph'].find(node => node['@type'] === 'Article');
    assert.equal(article.datePublished, original);
    assert.equal(article.dateModified, modified ?? undefined);
    assert.deepEqual(validatePageSeo(html, file, { editions: records, assetPaths: assets }).failures, []);
  }
  const xml = buildSeoSitemaps(models)['sitemap-magazine.xml'];
  assert.ok(!xml.includes('2099'));
  assert.ok(xml.includes(`<loc>https://ltcmagazine.org/conversations/editions/2026-10-05-r2/</loc><lastmod>${editions[0].publishedAt}</lastmod>`));
});

test('publication date metadata fails closed on invalid records or revisions preceding the original', () => {
  const file = 'conversations/editions/2026-10-05/index.html';
  for (const records of [
    editions.map(item => item.revision === 1 && item.date === '2026-10-05' ? { ...item, publishedAt: 'not-a-date' } : item),
    editions.map(item => item.revision === 2 ? { ...item, publishedAt: '2026-02-30T17:00:00.000Z' } : item),
    editions.map(item => item.revision === 2 ? { ...item, publishedAt: '2026-10-04T17:00:00.000Z' } : item),
  ]) assert.throws(() => applySiteSeo(doc(), file, { editions: records }), /publication|precedes/);
});

test('structured data uses actual saved publication fields without inventing author people or advance cover dates', () => {
  const daily = structured(render('conversations/editions/2026-10-05-r1/index.html').html);
  const article = daily['@graph'].find(node => node['@type'] === 'Article');
  assert.equal(article.datePublished, editions[1].publishedAt); assert.equal(article.headline, editions[1].title);
  assert.equal(article.author['@type'], 'Organization'); assert.ok(!Object.hasOwn(article, 'dateModified'));
  const special = structured(render('conversations/specials/proof-of-birthday/index.html').html);
  assert.ok(!JSON.stringify(special).includes('datePublished'));
  assert.ok(!JSON.stringify(special).includes('dateModified'));
  assert.ok(!JSON.stringify(special).includes('Person')); assert.ok(!JSON.stringify(special).includes('sameAs'));
  const site = structured(render('conversations/index.html').html)['@graph'].find(node => node['@type'] === 'WebSite');
  assert.equal(site.url, 'https://ltcmagazine.org/'); assert.equal(site.name, 'LTC Magazine');
});

test('JSON-LD cannot terminate its non-executable element, and there are no executable source instructions', () => {
  const value = { title: '</script><script src="https://evil.example/x.js">&\u2028\u2029' };
  const json = safeSeoJson(value);
  assert.ok(!/[<>&\u2028\u2029]/u.test(json)); assert.deepEqual(JSON.parse(json), value);
  const input = doc({ title: '&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;', description: 'A &quot;quoted&quot; description &amp; context.' });
  const { html } = render('langar/index.html', input);
  assert.equal((html.match(/<script\b/g) ?? []).length, 1);
  assert.match(html, /<script type="application\/ld\+json" data-site-seo="v1">/);
  assert.deepEqual(validate(html, 'langar/index.html'), []);
  assert.equal(structured(html)['@graph'][0].name, '</script><script>alert(1)</script>');
});

test('metadata processing preserves content, portable links, legitimate enhancements and existing RSS links', () => {
  const input = doc({ head: '<link rel="alternate" type="application/rss+xml" href="../feed.xml"/>', main: '<script src="../../scripts/learning.js" defer></script><img src="../../magazine/daily/cover.jpg"/>' });
  const { html } = render('sikh-bitcoin/intro/index.html', input);
  assert.equal(html.split('</head>')[1], input.split('</head>')[1]);
  assert.ok(html.includes('href="../feed.xml"')); assert.ok(html.includes('href="../../join/index.html#start"'));
  assert.ok(html.includes('src="../../scripts/learning.js"')); assert.equal(render('sikh-bitcoin/intro/index.html', html).html, html);
});

test('export validator rejects wrong canonical, duplicated share tags, unsafe JSON-LD attrs and fabricated dates', () => {
  const file = 'conversations/editions/2026-10-05/index.html'; const { html } = render(file);
  const cases = [
    html.replace('rel="canonical" href="https://ltcmagazine.org', 'rel="canonical" href="https://evil.example'),
    html.replace('</head>', '<meta name="twitter:card" content="summary"/></head>'),
    html.replace('type="application/ld+json" data-site-seo="v1"', 'type="application/ld+json" data-site-seo="v1" src="https://evil.example/x.js"'),
    html.replace('"datePublished":"2026-10-05T04:21:21.525Z"', '"datePublished":"2026-10-15T17:00:00.000Z"'),
    html.replace('"dateModified":"2026-10-05T17:00:00.000Z"', '"dateModified":"2026-10-15T17:00:00.000Z"'),
    html.replace('"headline":"A corrected record"', '"headline":"Invented headline"'),
  ];
  for (const altered of cases) assert.ok(validate(altered, file).length > 0);
});
