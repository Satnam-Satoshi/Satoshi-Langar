/**
 * Simulated adapter verification using the actual exported Supabase browser bundle.
 * Build dist first. No provider, account, credential or external network is used.
 *
 * PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node --test scripts/test-auth-browser.mjs
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const releaseRoot = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const siteOrigin = 'https://community.satnam-fixture.test';
const authOrigin = 'https://auth.satnam-fixture.test';
const mirrorOrigin = 'https://mirror.satnam-fixture.test';
const publicKey = 'sb_publishable_simulated_adapter_test';
const userId = '00000000-0000-4000-8000-000000000026';
const authStorageKey = 'satnam-auth-v1';
const testUser = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'fixture-user@example.test',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: { name: 'Fixture User' },
  created_at: '2026-10-01T00:00:00.000Z',
};
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
// Intentionally unsigned fixture token; accepted only by our intercepted transport.
const accessToken = [
  encode({ alg: 'HS256', typ: 'JWT' }),
  encode({ sub: userId, aud: 'authenticated', role: 'authenticated', iss: `${authOrigin}/auth/v1`, exp: Math.floor(Date.now() / 1000) + 3600 }),
  Buffer.from('not-a-real-signature').toString('base64url'),
].join('.');
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};
let browser;

before(async () => {
  await stat(path.join(releaseRoot, 'scripts/auth.js'));
  await stat(path.join(releaseRoot, 'sign-in/index.html'));
  await stat(path.join(releaseRoot, 'auth/callback/index.html'));
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); });

async function fixture(t, { providers = ['google'], tokenFailure = false, userFailure = false } = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const requests = [];
  const unexpected = [];
  const pageErrors = [];
  let authorization;
  const config = {
    enabled: true, url: authOrigin, siteOrigin, publishableKey: publicKey,
    providers, privacyEmail: 'privacy@example.test',
  };
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => pageErrors.push(error.message));
  const cors = {
    'access-control-allow-origin': siteOrigin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  };
  const jsonResponse = (route, status, body) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === authOrigin) {
      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      const entry = { method: request.method(), pathname: url.pathname, search: url.searchParams, headers: request.headers(), body: request.postDataJSON() };
      requests.push(entry);
      if (url.pathname === '/auth/v1/authorize' && request.method() === 'GET') {
        authorization = new URL(url);
        await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Simulated provider</title><h1>Simulated identity provider</h1>' });
        return;
      }
      if (url.pathname === '/auth/v1/token' && request.method() === 'POST') {
        if (tokenFailure) {
          await jsonResponse(route, 400, { code: 'bad_code_verifier', msg: 'Simulated expired code' });
        } else {
          await jsonResponse(route, 200, {
            access_token: accessToken, refresh_token: 'simulated-refresh-token-not-a-credential',
            expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer', user: testUser,
          });
        }
        return;
      }
      if (url.pathname === '/auth/v1/user' && request.method() === 'GET') {
        await jsonResponse(route, userFailure ? 401 : 200, userFailure ? { code: 'session_not_found', msg: 'Simulated invalid session' } : testUser);
        return;
      }
      if (url.pathname === '/auth/v1/logout' && request.method() === 'POST') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
    }
    if (url.origin === siteOrigin || url.origin === mirrorOrigin) {
      if (url.pathname === '/data/community-auth.json') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(config) });
        return;
      }
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const file = path.resolve(releaseRoot, relative || 'index.html');
      if (file === releaseRoot || file.startsWith(releaseRoot + path.sep)) {
        try {
          const resolved = (await stat(file)).isDirectory() ? path.join(file, 'index.html') : file;
          const body = await readFile(resolved);
          const headers = {
            // An active fixture allows only this explicit fake Auth origin.
            'content-security-policy': `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${authOrigin}; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
            'referrer-policy': 'no-referrer',
            'x-content-type-options': 'nosniff',
          };
          await route.fulfill({ status: 200, headers, contentType: contentTypes[path.extname(resolved)] || 'application/octet-stream', body });
          return;
        } catch {
          // Unknown assets and endpoints fail the test; never fall through to a network request.
        }
      }
    }
    unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
    await route.abort('blockedbyclient');
  });
  t.after(async () => {
    await context.close();
    assert.deepEqual(unexpected, [], 'Every request must be handled by local fixtures');
    assert.deepEqual(pageErrors, [], 'The exported adapter must not throw browser errors');
  });
  return { page, requests, get authorization() { return authorization; } };
}

async function waitForStatus(page, text) {
  await page.waitForFunction(expected => document.querySelector('[data-auth-status]')?.textContent.includes(expected), text);
}

async function startGoogle(f) {
  await f.page.goto(`${siteOrigin}/sign-in/index.html`);
  await waitForStatus(f.page, 'Choose a provider');
  await f.page.locator('[data-auth-consent]').check();
  await Promise.all([
    f.page.waitForURL(url => url.origin === authOrigin && url.pathname === '/auth/v1/authorize'),
    f.page.locator('[data-provider="google"]').click(),
  ]);
  assert.ok(f.authorization, 'The real adapter must construct an OAuth authorization URL');
}

function assertExchange(f) {
  const exchanges = f.requests.filter(request => request.pathname === '/auth/v1/token');
  assert.equal(exchanges.length, 1);
  const exchange = exchanges[0];
  assert.equal(exchange.search.get('grant_type'), 'pkce');
  assert.equal(exchange.body.auth_code, 'simulated-auth-code');
  assert.match(exchange.body.code_verifier, /^[A-Za-z0-9._~-]{43,128}$/);
  assert.equal(createHash('sha256').update(exchange.body.code_verifier).digest('base64url'), f.authorization.searchParams.get('code_challenge'), 'The callback must use the same S256 verifier created before leaving the site');
  assert.equal(exchange.headers.apikey, publicKey);
  return exchange;
}

test('configured provider requires consent, gates unavailable providers, and starts real PKCE', async t => {
  const f = await fixture(t);
  await f.page.goto(`${siteOrigin}/sign-in/index.html`);
  await waitForStatus(f.page, 'Choose a provider');
  for (const provider of ['google', 'github', 'apple', 'facebook']) {
    assert.equal(await f.page.locator(`[data-provider="${provider}"]`).isDisabled(), true);
  }
  assert.equal(f.requests.length, 0, 'Reading the form must not contact an identity provider');
  assert.equal(await f.page.locator('[data-privacy-contact]').getAttribute('href'), 'mailto:privacy@example.test');
  await f.page.locator('[data-auth-consent]').check();
  assert.equal(await f.page.locator('[data-provider="google"]').isEnabled(), true);
  for (const provider of ['github', 'apple', 'facebook']) {
    assert.equal(await f.page.locator(`[data-provider="${provider}"]`).isDisabled(), true);
  }
  await f.page.locator('[data-auth-consent]').uncheck();
  assert.equal(await f.page.locator('[data-provider="google"]').isDisabled(), true);
  await f.page.locator('[data-auth-consent]').check();
  await Promise.all([f.page.waitForURL(url => url.origin === authOrigin), f.page.locator('[data-provider="google"]').click()]);
  const authorization = f.authorization;
  assert.equal(authorization.searchParams.get('provider'), 'google');
  assert.equal(authorization.searchParams.get('redirect_to'), `${siteOrigin}/auth/callback/index.html`);
  assert.equal(authorization.searchParams.get('code_challenge_method'), 's256');
  assert.match(authorization.searchParams.get('code_challenge'), /^[A-Za-z0-9_-]{43}$/);
  assert.equal(authorization.searchParams.has('access_token'), false);
  assert.equal(authorization.searchParams.has('code_verifier'), false);
});

test('callback exchanges the original verifier, verifies the user, and signs out locally', async t => {
  const f = await fixture(t);
  await startGoogle(f);
  await f.page.goto(`${siteOrigin}/auth/callback/index.html?code=simulated-auth-code`);
  await waitForStatus(f.page, 'Signed in as fixture-user@example.test');
  assertExchange(f);
  assert.equal(new URL(f.page.url()).search, '', 'Callback code must leave the visible URL');
  const userRequests = f.requests.filter(request => request.pathname === '/auth/v1/user');
  assert.ok(userRequests.length >= 1, 'A token response alone must not be shown as a verified account');
  assert.equal(userRequests.at(-1).headers.authorization, `Bearer ${accessToken}`);
  assert.equal(await f.page.locator('[data-sign-out]').isVisible(), true);
  assert.equal(await f.page.evaluate(key => Boolean(sessionStorage.getItem(key)), authStorageKey), true);
  assert.equal(await f.page.evaluate(key => localStorage.getItem(key), authStorageKey), null, 'Auth session must not persist in localStorage');
  await Promise.all([
    f.page.waitForURL(url => url.origin === siteOrigin && url.pathname === '/sign-in/index.html'),
    f.page.locator('[data-sign-out]').click(),
  ]);
  await waitForStatus(f.page, 'Choose a provider');
  const logout = f.requests.filter(request => request.pathname === '/auth/v1/logout');
  assert.equal(logout.length, 1);
  assert.equal(logout[0].search.get('scope'), 'local');
  assert.equal(await f.page.evaluate(key => sessionStorage.getItem(key), authStorageKey), null);
});

test('canceled callback strips provider parameters and offers a direct retry', async t => {
  const f = await fixture(t);
  await f.page.goto(`${siteOrigin}/auth/callback/index.html?error=access_denied&error_description=fixture-cancellation`);
  await waitForStatus(f.page, 'Sign-in was canceled or declined');
  assert.equal(new URL(f.page.url()).search, '');
  assert.equal(f.requests.length, 0);
  const retry = f.page.getByRole('link', { name: 'Return to sign-in', exact: true });
  assert.equal(await retry.isVisible(), true);
  await retry.click();
  await waitForStatus(f.page, 'Choose a provider');
});

test('missing callback code recovers without attempting a token exchange', async t => {
  const f = await fixture(t);
  await f.page.goto(`${siteOrigin}/auth/callback/index.html`);
  await waitForStatus(f.page, 'No sign-in response was received');
  assert.equal(f.requests.length, 0);
  assert.equal(await f.page.getByRole('link', { name: 'Return to sign-in', exact: true }).isVisible(), true);
});

test('rejected authorization code never displays a signed-in user', async t => {
  const f = await fixture(t, { tokenFailure: true });
  await startGoogle(f);
  await f.page.goto(`${siteOrigin}/auth/callback/index.html?code=simulated-auth-code`);
  await waitForStatus(f.page, 'The sign-in link expired');
  assertExchange(f);
  assert.equal(new URL(f.page.url()).search, '');
  assert.equal(f.requests.some(request => request.pathname === '/auth/v1/user'), false);
  assert.equal(await f.page.locator('[data-sign-out]').isVisible(), false);
  assert.equal(await f.page.getByRole('link', { name: 'Return to sign-in', exact: true }).isVisible(), true);
});

test('failed account verification has callback-specific recovery rather than invisible provider choices', async t => {
  const f = await fixture(t, { userFailure: true });
  await startGoogle(f);
  await f.page.goto(`${siteOrigin}/auth/callback/index.html?code=simulated-auth-code`);
  await waitForStatus(f.page, 'We could not verify your account session');
  assertExchange(f);
  assert.equal(await f.page.locator('[data-sign-out]').isVisible(), false);
  assert.equal(await f.page.getByRole('link', { name: 'Return to sign-in', exact: true }).isVisible(), true);
});

test('noncanonical mirror refuses auth without writing a session or contacting the provider', async t => {
  const f = await fixture(t);
  await f.page.goto(`${mirrorOrigin}/sign-in/index.html`);
  await waitForStatus(f.page, 'Sign-in is available only on our configured community website');
  assert.equal(f.requests.length, 0);
  assert.equal(await f.page.getByRole('link', { name: 'Open community sign-in →' }).getAttribute('href'), `${siteOrigin}/sign-in/`);
  for (const provider of ['google', 'github', 'apple', 'facebook']) {
    assert.equal(await f.page.locator(`[data-provider="${provider}"]`).isDisabled(), true);
  }
  assert.equal(await f.page.evaluate(key => sessionStorage.getItem(key), authStorageKey), null);
});
