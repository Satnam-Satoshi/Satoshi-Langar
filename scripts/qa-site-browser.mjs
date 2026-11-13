import { publicEditions } from './lib/ltc-public-editions.mjs';
import { publicationDays } from '../app/data/edition-calendar.ts';
// Credential-free rendered QA of the built export. All browser traffic is
// intercepted; production and third-party services are never contacted.
import assert from 'node:assert/strict';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve('dist'), output = path.resolve(process.env.QA_OUTPUT || 'site-qa');
await mkdir(output, { recursive: true });
const origin = 'https://satnamsatoshi.com';
const records = JSON.parse(await readFile('content/ltc/index.json', 'utf8'));
const exclusions = JSON.parse(await readFile('config/ltc-publication-exclusions.json', 'utf8'));
const latestIssue = publicationDays(publicEditions(records, exclusions))[0].latest.id;
const routes = [`/conversations/editions/${latestIssue}/`, '/conversations/daily/', '/conversations/updates/', '/conversations/specials/litecoin-builders-november/', '/conversations/specials/litecoin-to-the-moon/', '/mission/', '/langar/', '/agents/', '/', '/conversations/', '/conversations/archive/', '/conversations/desks/', '/conversations/desks/bitcoin-products/', '/conversations/litecoin/', '/conversations/litecoin-distribution/', '/conversations/start/', '/conversations/finance/', '/conversations/timechain/', '/conversations/community/', '/about/', '/sikh-bitcoin/', '/miikey/', '/join/', '/donate/'];
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml' };
const results = [], errors = [];
try {
  for (const [engine, launcher, widths] of [['chromium', chromium, [1440, 390, 320]], ['webkit', webkit, [390]]]) {
    const browser = await launcher.launch({ headless: true });
    try {
      for (const width of widths) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
        const missing = [], pageErrors = [];
        await context.route('**/*', async route => {
          const request = route.request(), url = new URL(request.url());
          if (url.origin !== origin || request.method() !== 'GET') return route.abort('blockedbyclient');
          if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ schemaVersion: 1, status: 'unavailable', checkedAt: new Date().toISOString(), reason: 'offline_visual_fixture' }) });
          let relative;
          try { relative = decodeURIComponent(url.pathname).replace(/^\/+/, ''); } catch { return route.abort(); }
          const file = path.resolve(root, relative || 'index.html');
          if (!file.startsWith(root + path.sep)) return route.abort();
          try {
            const resolved = (await stat(file)).isDirectory() ? path.join(file, 'index.html') : file;
            return route.fulfill({ status: 200, contentType: mime[path.extname(resolved)] || 'application/octet-stream', body: await readFile(resolved) });
          } catch {
            missing.push(url.pathname); return route.fulfill({ status: 404, body: 'Missing local export asset' });
          }
        });
        const page = await context.newPage();
        page.on('pageerror', error => pageErrors.push(error.message));
        for (const route of routes) {
          await page.goto(origin + route, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
          if (dimensions.content > dimensions.width + 1) {
            await page.screenshot({path:path.join(output,`${engine}-${width}-overflow.png`),fullPage:true,animations:'disabled'});
            const offenders=await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,20).map(el=>({tag:el.tagName,classes:el.className,right:Math.round(el.getBoundingClientRect().right)})));
            await writeFile(path.join(output,`${engine}-${width}-overflow.json`),JSON.stringify({route,offenders},null,2));
          }
          assert.ok(dimensions.content <= dimensions.width + 1, `${engine}/${width}${route} horizontal overflow: ${dimensions.content}`);
          assert.ok(await page.locator('h1').count(), `${route} missing main heading`);
          assert.deepEqual(await page.locator('img').evaluateAll(images => images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.getAttribute('src'))), [], `${route} broken image`);
          const name = `${engine}-${width}-${route.replace(/[^a-z0-9]+/gi, '_') || 'home'}.png`;
          await page.screenshot({ path: path.join(output, name), fullPage: false, animations: 'disabled' });
          results.push({ engine, width, route, screenshot: name, overflow: false });
          if (route === '/' || route === '/conversations/' || route === '/conversations/litecoin/') {
            const nav = page.locator(route === '/' ? '.launch-header' : '.publication-header');
            const menu = nav.locator('details summary');
            if (width < 500) await menu.click();
            assert.ok(await nav.getByRole('link', {name:'Explore Litecoin', exact:true}).count(), `${route} must expose Explore Litecoin in its header`);
            if (width < 500) await menu.click();
          }
          if (route === '/conversations/litecoin/') {
            const weight = await page.locator('h1 em').evaluate(el => getComputedStyle(el).fontWeight);
            assert.ok(Number(weight) >= 800, 'Fieldbook hero emphasis must retain bold approved typography');
          }
          if (route === '/conversations/daily/') {
            assert.equal(await page.locator('[data-cover-mode=edition]').count(), 1, 'Daily entry must render the actual edition cover');
            assert.equal(await page.locator('[aria-label="Edition reading paths"]').count(), 1);
            assert.equal(await page.getByText('October 2 design review', { exact: false }).count(), 0);
            await page.locator('#daily-briefings').scrollIntoViewIfNeeded();
            await page.screenshot({path:path.join(output,`${engine}-${width}-daily-interior.png`),animations:'disabled'});
          }
          if (route === '/' || route === '/conversations/') {
            assert.ok(await page.locator('a[href*="specials/litecoin-to-the-moon/"]').count(), `${route} missing Moon promotion`);
            assert.ok(await page.locator('img[src*="litecoin-to-the-moon/cover-r2.png"]').count(), `${route} missing refreshed Moon cover`);
            for (const href of ['https://litecoinregister.com/','https://www.mnav.com/','https://bitbo.io/treasuries/latest-changes/']) {
              assert.ok(await page.locator(`a[href="${href}"]`).count(), `${route} missing treasury research link ${href}`);
            }
          }
          if (route === '/conversations/specials/litecoin-to-the-moon/') {
            await page.locator('#sources').scrollIntoViewIfNeeded();
            await page.screenshot({ path:path.join(output,`${engine}-${width}-moon-sourcebook.png`),animations:'disabled' });
          }
          if (route === '/conversations/archive/') {
            const moon = page.locator('[data-editorial-special="litecoin-to-the-moon-r2"]');
            await moon.scrollIntoViewIfNeeded();
            assert.equal(await moon.locator('[data-full-cover] img').count(),1);
            assert.equal(await moon.locator('[data-full-cover] h3').count(),0);
            await page.screenshot({ path:path.join(output,`${engine}-${width}-moon-shelf.png`),animations:'disabled' });
          }
          if (route === '/conversations/updates/') {
            assert.equal(await page.locator('[aria-labelledby="newsroom-reading"]').count(), 1);
          }
        }
        if (width < 500) {
          for (const route of ['/', '/conversations/']) {
            await page.goto(origin + route, { waitUntil: 'networkidle' });
            const menu = page.locator(route === '/' ? 'details.mobile-menu' : 'details.publication-menu').first();
            await menu.locator('summary').click();
            assert.equal(await menu.getAttribute('open'), '', `${route} menu failed to open`);
            const destination = route === '/' ? '/miikey/index.html' : '/conversations/archive/index.html';
            const link = menu.locator('a').filter({ hasText: route === '/' ? 'MiiKey' : 'Archive' }).first();
            // Portable export rewrites hrefs to relative index.html URLs.
            assert.equal(new URL(await link.getAttribute('href'), page.url()).pathname, destination);
            await link.click();
            await page.waitForURL(url => url.pathname === destination);
            await page.goBack({ waitUntil: 'networkidle' });
            assert.equal(new URL(page.url()).pathname, route);
            const returned = page.locator(route === '/' ? 'details.mobile-menu' : 'details.publication-menu').first();
            if (await returned.getAttribute('open') !== null) await returned.locator('summary').click();
            assert.equal(await returned.getAttribute('open'), null);
            results.push({ engine, width, route, menu: 'open-navigate-back-close passed' });
          }
        }
        assert.deepEqual(missing, [], `Missing export assets in ${engine}/${width}`);
        assert.deepEqual(pageErrors, [], `Browser exceptions in ${engine}/${width}`);
        await context.close();
      }
    } finally { await browser.close(); }
  }
} catch (error) { errors.push(error.message); process.exitCode = 1; }
await writeFile(path.join(output, 'results.json'), JSON.stringify({ schemaVersion: 1, source: process.env.SOURCE_SHA, offline: true, externalRequestsPermitted: false, apiMode: 'explicit unavailable fixture; live APIs verified separately before promotion', results, errors }, null, 2) + '\n');
if (errors.length) console.error(errors.join('\n')); else console.log(`Rendered QA passed: ${results.length} route/viewport/interaction checks.`);
