# Direct Google Drive archive, independent of ChatGPT

Use the owner's existing Drive for user-facing editions, source evidence, graphics and backups. GCS is optional, not mandatory. Drive storage does not supply a Node/Python runtime, scheduler, transactional ledger or provider-effect fence. A separate reviewed execution/state service remains necessary.

No OAuth app, token, folder, permission, billing or API action has been created by this source package. Current connected-app access is not a portable credential and must not be extracted or repurposed.

## Proposed least-privilege path, pending approval

Use a founder-owned OAuth web-server application with offline consent and the recommended per-file `drive.file` scope. Store refresh token and OAuth client secret in approved encrypted runtime secret storage, never in Drive artifacts, logs, source code or CI outputs. Either explicitly authorize a new dedicated private archive folder created by that app, or select the existing intended folder through Google's supported Picker permission flow. Do not assume access to pre-existing descendants merely because a folder was selected. Migration must enumerate and independently verify only authorized files.

A service account cannot solve personal My Drive ownership/storage by being shared into a folder. Shared Drives are a different account/product capability; do not assume their availability or create one without approval.

Production OAuth consent configuration must be reviewed: external apps left in Testing can receive refresh tokens expiring after seven days for Drive scopes. Revocation/expiry must HOLD publication and alert through a separately approved channel, not trigger repeated login or widen scopes. Never promise uninterrupted autonomy from a single successful token exchange.

## Archive contract to implement and verify

Exact artifact identity includes file ID, version, content hash, byte count, MIME type, owner/access policy and destination. Read actual metadata including trash state and authorized permissions, then actual media bytes, then recheck version; fail closed on mismatch, redirect/error, unavailable fields or uncertain upload. Persist upload intent before effect, reconcile uncertain outcome without duplicate upload, and preserve immutable edition/revision identities. Drive versions/retention are not WORM. Private source evidence and operational ledgers must not become public website assets.

Keep canonical publication/outbox state in a transactional store with explicit migration and CAS. Drive backups of that state are backups, not evidence that concurrent writes are serialized. Existing history and pending attempts must be retained; do not initialize an empty ledger or copy legacy enabled flags.

## Runtime choices are not deployment decisions

Cloud Run can execute the reviewed OCI/Node/Python toolchain. Apps Script can supply bounded scheduled HTTP orchestration, but cannot directly execute that toolchain and has execution-time quotas. A hybrid with GitHub Actions would require an additional authenticated dispatch/build path and durable coordination, not merely a Drive subscription. No runtime, permission or paid service is activated here.

Official references verified November 17, 2026:
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/drive/api/guides/folder
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/identity/protocols/oauth2/resources/best-practices
- https://developers.google.com/identity/protocols/oauth2#expiration
- https://developers.google.com/workspace/drive/api/guides/handle-errors
- https://developers.google.com/workspace/drive/api/guides/about-shareddrives
- https://developers.google.com/workspace/drive/api/guides/limits

API quotas and potential future overage pricing must be checked before activation; existing storage payment is not a promise of unlimited API or compute use.
