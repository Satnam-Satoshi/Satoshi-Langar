// Supported owner OAuth refresh only. No browser/session discovery or credential creation.
// Credentials are provided by the protected runner; never available to collectors/builds.
const scope = 'https://www.googleapis.com/auth/drive.file';
const ensure = (ok, code) => { if (!ok) throw new Error(code); };
const diagnosticPhases = new Set(['transport', 'http-status', 'content-type', 'body-size', 'json', 'token-shape', 'scope']);
const diagnostics = new WeakMap();
// Only categorical metadata is retained. No raw errors, response bodies,
// credentials, provider descriptions, request URLs, or cause chains are saved.
export function safeGoogleAuthorizationDiagnostic(value) {
  let phase, httpStatus, timedOut;
  try { phase = value?.phase; httpStatus = value?.httpStatus; timedOut = value?.timedOut; } catch { /* Untrusted getters must not escape. */ }
  return Object.freeze({ phase: diagnosticPhases.has(phase) ? phase : 'unknown',
    httpStatus: Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? httpStatus : null,
    timedOut: timedOut === true });
}
export function googleAuthorizationDiagnostic(error) {
  // WeakMap association cannot be forged by adding public properties to errors.
  return error !== null && (typeof error === 'object' || typeof error === 'function')
    ? diagnostics.get(error) ?? null : null;
}
export async function withGoogleCloudAuthorization({ env = process.env, fetchImpl = fetch }, use) {
  ensure(typeof use === 'function' && typeof fetchImpl === 'function', 'invalid_google_authorization_configuration');
  const clientId = env.LTC_GOOGLE_CLIENT_ID;
  const secret = env.LTC_GOOGLE_CLIENT_SECRET;
  const refresh = env.LTC_GOOGLE_REFRESH_TOKEN;
  ensure(typeof clientId === 'string' && /^[A-Za-z0-9._-]{10,250}\.apps\.googleusercontent\.com$/.test(clientId) && [secret, refresh].every(v => typeof v === 'string' && v.length >= 16 && v.length <= 8192 && !/[\s\x00-\x1f\x7f]/.test(v)), 'google_refresh_credentials_required');
  let authorization, phase = 'transport', httpStatus = null;
  const signal = AbortSignal.timeout(10_000);
  try {
    const response = await fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST', redirect: 'error', signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId, client_secret: secret, refresh_token: refresh }).toString(),
    });
    phase = 'http-status'; httpStatus = response.status;
    ensure(response.status === 200 && !response.redirected, 'google_refresh_failed');
    phase = 'content-type';
    ensure(response.headers.get('content-type')?.includes('application/json'), 'google_refresh_failed');
    phase = 'body-size';
    const length = response.headers.get('content-length');
    ensure(length === null || (/^\d+$/.test(length) && Number(length) <= 16_384), 'google_refresh_failed');
    const reader = response.body.getReader(); const parts = []; let bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        bytes += chunk.value.byteLength; ensure(bytes <= 16_384, 'google_refresh_failed'); parts.push(chunk.value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    phase = 'json';
    authorization = JSON.parse(Buffer.concat(parts).toString('utf8'));
    phase = 'token-shape';
    ensure(authorization && authorization.token_type === 'Bearer' && Number.isInteger(authorization.expires_in) && authorization.expires_in >= 60 && authorization.expires_in <= 3600 && typeof authorization.access_token === 'string' && /^[A-Za-z0-9._~+\/-]{16,8192}={0,2}$/.test(authorization.access_token), 'google_refresh_failed');
    // Refresh commonly omits scope. Existing consent must separately prove drive.file;
    // a returned broader scope is never silently accepted.
    phase = 'scope';
    ensure(authorization.scope === undefined || authorization.scope === scope, 'google_refresh_scope_mismatch');
  } catch (error) {
    const failure = new Error(phase === 'scope' ? 'google_refresh_scope_mismatch' : 'google_refresh_failed');
    diagnostics.set(failure, safeGoogleAuthorizationDiagnostic({ phase, httpStatus, timedOut: signal.aborted }));
    throw failure;
  }
  // Callback errors are not rewritten: normal state/recovery failures must remain visible.
  // Only the access token goes downstream, never the refresh token or client secret.
  const access = Object.freeze({ LTC_GOOGLE_ACCESS_TOKEN: authorization.access_token });
  const expiresIn = authorization.expires_in;
  authorization = null;
  return use(access, expiresIn);
}

// One protected runtime owns this cache. A refresh response is usable only
// within its conservative lifetime measured from the request start.
export function createScopedGoogleAuthorization({ env, fetchImpl, authorize = withGoogleCloudAuthorization, clock = () => performance.now() }) {
  const credentials = Object.freeze({
    LTC_GOOGLE_CLIENT_ID: env.LTC_GOOGLE_CLIENT_ID,
    LTC_GOOGLE_CLIENT_SECRET: env.LTC_GOOGLE_CLIENT_SECRET,
    LTC_GOOGLE_REFRESH_TOKEN: env.LTC_GOOGLE_REFRESH_TOKEN,
  });
  const skewMs = 30_000;
  const maxReuseMs = 5 * 60_000;
  let current;
  let pending;
  async function acquire() {
    if (current && clock() < current.reuseUntil) return current;
    if (!pending) {
      const startedAt = clock();
      pending = Promise.resolve().then(() => authorize({ env: credentials, fetchImpl }, (access, expiresIn) => {
        const timed = Number.isInteger(expiresIn) && expiresIn >= 60 && expiresIn <= 3600;
        const expiresAt = timed ? startedAt + expiresIn * 1000 : null;
        if (timed) ensure(clock() < expiresAt, 'google_refresh_failed');
        const grant = { access, expiresAt, reuseUntil: timed ? Math.min(expiresAt - skewMs, startedAt + maxReuseMs) : startedAt };
        if (clock() < grant.reuseUntil) current = grant;
        return grant;
      })).finally(() => { pending = null; });
    }
    return pending;
  }
  return async use => {
    const grant = await acquire();
    return use(grant.access, {
      assertUsable() {
        ensure(!grant.invalidated && (grant.expiresAt === null || clock() < grant.expiresAt), 'google_refresh_failed');
      },
      invalidate() {
        grant.invalidated = true;
        if (current === grant) current = null;
      },
    });
  };
}
