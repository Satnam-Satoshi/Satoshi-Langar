# Dormant human OAuth refresh boundary for My Drive

This source and its tests never obtain, create or use real credentials. Live refresh creates a provider credential and requires the owner's explicit approval of the OAuth application, account, destination, scopes and encrypted credential storage. A paid Drive storage subscription does not supply runtime credentials or permission to extract a connected app's tokens.

`createDriveOAuthRefresh` returns only `resolveSecret({reference,purpose})` and sanitized `status()`. The former is a deliberately secret-bearing interface for the trusted existing Drive adapters, not a chat/result/log API. It returns an access-token string only for the configured accessReference and exact Drive read/upload purposes. No token is included in status, alert proposals, journal or errors. No token is read from environment, files, CLI login or ambient client state. Strings remain in process memory; this is not a memory-zeroization guarantee.

## Exact independent inputs

Identity binds clientId, version-pinned clientSecretReference and refreshTokenReference, consentRecordSha256, folderId, ownerPermissionId, exact scope `https://www.googleapis.com/auth/drive.file` and tokenBinding `unbound-web-server`. The consent digest is a reference, not proof of real consent. The encrypted resolver must authenticate its service and enforce exact approved secret versions. No Secret Manager client/permission/provisioning is implemented here.

`loadPolicy({action:'refresh-approved-drive-token',identity,key})` must independently verify current owner approval and stop/revocation state, returning exact `{action,identitySha256,reference,notBefore,expiresAt}`. Policy is loaded on EVERY resolve, including cached access, after secret awaits, after durable intent readback immediately before POST, after response, and before returning a new token. It must not return an eternal constructor boolean. This module checks bindings/time, not the caller's authority. Policy/service truth and a race after the final check remain external limitations.

The independently initialized durable journal supplies read/cas keyed by canonical identity hash. No bootstrap occurs. Exact version0/null is the only empty state. Attempt N is version2N-1/attempting, then version2N/succeeded. Records contain only attempt, identitySha256, phase, startedAt and expiresAt (null while attempting). Intent CAS and exact readback precede the single POST. Lost/uncertain outcomes, rejection, rotation or malformed responses leave attempting; fresh processes HOLD without retry. Missing known rows must be rejected by the actual authenticated store/inventory, not represented as new version0. The concrete durable journal implementation and its controlled initialization remain integration work.

Only a known succeeded attempt permits a later refresh. Access tokens are cached only in the current process, not stored in the journal. A fresh process after success can refresh again under current policy. Singleflight is per instance; competing processes rely on CAS. There is no automatic recovery from unknown refresh or rotation, because a refresh may change provider token state. Owner recovery must reconcile/re-enroll the exact new credential version deliberately, preserving uncertain history.

## Fixed request and strict response

One POST goes to `https://oauth2.googleapis.com/token`, using URL-encoded client_id, client_secret, refresh_token and grant_type=refresh_token. No scope parameter, consent UI, code exchange, revocation endpoint, token-info endpoint, arbitrary URL or automatic retry is exposed. Network/refresh flags default false. Redirects, oversized/non-JSON responses and total timeout hold. Clock must be finite strict UTC milliseconds and monotonic across requests.

Success requires exactly access_token, expires_in, scope and token_type. Scope must exactly equal drive.file; missing or combined scopes HOLD rather than silently widen. Token type must Bearer, lifetime 61–7200 seconds. Cache expiry is conservatively based on pre-request time and bounded by current policy, with a 60-second safety margin. Unsupported DPoP nonce/bound configuration, returned refresh_token rotation, unknown fields or unsupported response formats HOLD. This restricted compatibility has not been verified against a live OAuth account. It does not prove that a Bearer string is unbound; the approved credential enrollment must establish that.

`invalid_grant` becomes a sanitized authorization-revoked-or-expired HOLD. Other errors expose no raw descriptions or credentials. Deterministic alert proposals have credentials-unavailable and sendAllowed:false; a separately approved durable alert process must deduplicate/deliver them. This module sends no alerts. The in-memory latch prevents reuse after failures, while durable attempting records prevent repeat refresh after unknown provider outcomes across restart.

## Actual deployment acceptance still missing

Verify actual founder-owned OAuth app audience, publishing status and granted scopes. External OAuth apps left in Testing may issue seven-day refresh tokens for Drive scopes. Confirm drive.file supports the intended approved folder and authorized files; do not infer access to old descendants from a folder selection or broaden scopes automatically. Exercise token revocation, expiry, process restart, owner-only metadata/ACL and exact file bytes, alert delivery and owner-led recovery. Successful refresh does not prove folder access, private retention, unattended longevity or publication readiness. No billing, account, permission, key or scheduled service is activated here.

Official contracts consulted November17,2026:
- https://developers.google.com/identity/protocols/oauth2/web-server (refresh grant, response and optional DPoP)
- https://developers.google.com/identity/protocols/oauth2 (token expiration)
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth (drive.file scope)
