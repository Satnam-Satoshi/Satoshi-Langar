export const NEWSLETTER_CHECKS = Object.freeze([
  'ownerConfirmed', 'senderAuthenticated', 'doubleOptInTested', 'unsubscribeTested',
  'privacyPublished', 'dailyFeedDeliveryTested', 'sendLimitConfirmed',
]);

export function validateNewsletterConfig(input) {
  if (!input || typeof input !== 'object' || typeof input.enabled !== 'boolean' || input.provider !== 'brevo') throw new Error('Invalid newsletter configuration');
  const inactive = { enabled: false, provider: 'brevo', signupUrl: null, replyTo: null, checkedAt: null, checks: Object.fromEntries(NEWSLETTER_CHECKS.map(name => [name, false])) };
  if (!input.enabled) return inactive;
  if (typeof input.signupUrl !== 'string') throw new Error('Newsletter signup URL is required');
  let url;
  try { url = new URL(input.signupUrl); } catch { throw new Error('Invalid newsletter signup URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.href !== input.signupUrl
    || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+sibforms\.com$/.test(url.hostname)
    || !/^\/serve\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) throw new Error('Newsletter signup must use an exact HTTPS sibforms.com form URL without credentials, port, query or fragment');
  const replyTo = input.replyTo;
  if (typeof replyTo !== 'string' || replyTo.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(replyTo)
    || replyTo.split('@')[0].length > 64 || /^\.|\.@|\.\./.test(replyTo)) throw new Error('Newsletter replyTo must be a valid email address');
  if (typeof input.checkedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.checkedAt)
    || !Number.isFinite(Date.parse(`${input.checkedAt}T00:00:00Z`)) || new Date(`${input.checkedAt}T00:00:00Z`).toISOString().slice(0, 10) !== input.checkedAt) throw new Error('Newsletter checkedAt must be a valid ISO calendar date');
  if (NEWSLETTER_CHECKS.some(name => input.checks?.[name] !== true)) throw new Error('Every newsletter launch check must be explicitly confirmed');
  return { enabled: true, provider: 'brevo', signupUrl: url.href, replyTo, checkedAt: input.checkedAt, checks: Object.fromEntries(NEWSLETTER_CHECKS.map(name => [name, true])) };
}
