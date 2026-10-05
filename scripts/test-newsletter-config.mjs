import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateNewsletterConfig, NEWSLETTER_CHECKS } from './lib/newsletter-config.mjs';

const valid = { enabled: true, provider: 'brevo', signupUrl: 'https://example.sibforms.com/serve/EXAMPLE-form_token', replyTo: 'editor@example.org', checkedAt: '2026-10-05', checks: Object.fromEntries(NEWSLETTER_CHECKS.map(name => [name, true])) };

test('saved newsletter configuration is inactive and cannot expose a signup URL', async () => {
  const saved = JSON.parse(await readFile(new URL('../config/newsletter.json', import.meta.url), 'utf8'));
  assert.equal(saved.enabled, false);
  const result = validateNewsletterConfig({ ...saved, signupUrl: 'https://unapproved.example.com/', unexpectedSecret: 'not-published' });
  assert.equal(result.enabled, false);
  assert.equal(result.signupUrl, null);
  assert.ok(Object.values(result.checks).every(value => value === false));
  assert.equal(result.unexpectedSecret, undefined);
});

test('complete confirmation allows only sanitized configured fields without activating a service', () => {
  assert.deepEqual(validateNewsletterConfig({ ...valid, ignored: 'not-public' }), valid);
  assert.throws(() => validateNewsletterConfig({ ...valid, enabled: 'true' }));
  assert.throws(() => validateNewsletterConfig({ ...valid, provider: 'other' }));
});

test('enabled signup rejects arbitrary hosts, redirects, credentials and URL ambiguity', () => {
  for (const signupUrl of ['https://sibforms.com/serve/test', 'https://example.sibforms.com.evil.com/serve/test', 'https://sibforms.com@evil.com/serve/test', 'https://u:p@example.sibforms.com/serve/test', 'http://example.sibforms.com/serve/test', 'https://example.sibforms.com:443/serve/test', 'https://example.sibforms.com:444/serve/test', 'https://example.sibforms.com/serve/test?next=evil', 'https://example.sibforms.com/serve/test#subscribe', 'https://example.sibforms.com/other/test', 'https://example.sibforms.com/serve/', 'https://example.sibforms.com/serve/%2Fsecret', 'https://example.sibforms.com./serve/test', '//example.sibforms.com/serve/test', 'https://example.sibforms.com/serve/test\n']) assert.throws(() => validateNewsletterConfig({ ...valid, signupUrl }), signupUrl);
});

test('every checklist item must be the boolean true', () => {
  for (const name of NEWSLETTER_CHECKS) for (const value of [false, null, undefined, 'true', 1]) assert.throws(() => validateNewsletterConfig({ ...valid, checks: { ...valid.checks, [name]: value } }), name);
});

test('reply address and review date are explicit valid values', () => {
  for (const replyTo of ['', null, 'editor', 'editor@example', 'editor@-example.org', 'editor..name@example.org', '.editor@example.org', 'editor.@example.org', 'editor@example.org\nBcc:other@example.org', '<editor@example.org>']) assert.throws(() => validateNewsletterConfig({ ...valid, replyTo }));
  for (const checkedAt of ['', null, 'October 5, 2026', '2026-02-30', '2026-13-01', '2026-10-05T00:00:00Z']) assert.throws(() => validateNewsletterConfig({ ...valid, checkedAt }));
  assert.equal(validateNewsletterConfig({ ...valid, checkedAt: '2028-02-29' }).checkedAt, '2028-02-29');
});
