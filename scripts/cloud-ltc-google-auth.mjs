// Supported owner OAuth refresh only. No browser/session discovery or credential creation.
// Credentials are provided by the protected runner; never available to collectors/builds.
const scope = 'https://www.googleapis.com/auth/drive.file';
const ensure = (ok, code) => { if (!ok) throw new Error(code); };
export async function withGoogleCloudAuthorization({ env = process.env, fetchImpl = fetch }, use) {
  ensure(typeof use === 'function' && typeof fetchImpl === 'function', 'invalid_google_authorization_configuration');
  const clientId = env.LTC_GOOGLE_CLIENT_ID;
  const secret = env.LTC_GOOGLE_CLIENT_SECRET;
  const refresh = env.LTC_GOOGLE_REFRESH_TOKEN;
  ensure(typeof clientId === 'string' && /^[A-Za-z0-9._-]{10,250}\.apps\.googleusercontent\.com$/.test(clientId) && [secret, refresh].every(v => typeof v === 'string' && v.length >= 16 && v.length <= 8192 && !/[\s\x00-\x1f\x7f]/.test(v)), 'google_refresh_credentials_required');
  let authorization;
  try {
    const response = await fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId, client_secret: secret, refresh_token: refresh }).toString(),
    });
    ensure(response.status === 200 && !response.redirected && response.headers.get('content-type')?.includes('application/json'), 'google_refresh_failed');
    const length = response.headers.get('content-length');
    ensure(length === null || (/^\d+$/.test(length) && Number(length) <= 16_384), 'google_refresh_failed');
    const reader = response.body.getReader(); const parts = []; let bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        bytes += chunk.value.byteLength; ensure(bytes <= 16_384, 'google_refresh_failed'); parts.push(chunk.value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    authorization = JSON.parse(Buffer.concat(parts).toString('utf8'));
    ensure(authorization && authorization.token_type === 'Bearer' && Number.isInteger(authorization.expires_in) && authorization.expires_in >= 60 && authorization.expires_in <= 3600 && typeof authorization.access_token === 'string' && /^[A-Za-z0-9._~+\/-]{16,8192}={0,2}$/.test(authorization.access_token), 'google_refresh_failed');
    // Refresh commonly omits scope. Existing consent must separately prove drive.file;
    // a returned broader scope is never silently accepted.
    ensure(authorization.scope === undefined || authorization.scope === scope, 'google_refresh_scope_mismatch');
  } catch (error) {
    throw new Error(error?.message === 'google_refresh_scope_mismatch' ? error.message : 'google_refresh_failed');
  }
  // Callback errors are not rewritten: normal state/recovery failures must remain visible.
  // Only the access token goes downstream, never the refresh token or client secret.
  const access = Object.freeze({ LTC_GOOGLE_ACCESS_TOKEN: authorization.access_token });
  authorization = null;
  return use(access);
}
