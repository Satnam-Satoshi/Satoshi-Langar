# Dormant direct one-shot archive upload executor

`createDriveUpload({...}).advance({bytes,mimeType})` is a separate, default-disabled upload executor. It does not modify the existing read-only archive adapter. Both `networkEnabled` and `mutationsEnabled` must be true; actual approval comes independently through `loadApproval`, not these flags. There are no credentials, real provider calls or OAuth setup in source/tests.

Constructor dependencies: injected fetch, resolveSecret and approved secretReference; fixed folderId/ownerPermissionId; `journal.read({key})` / `journal.cas({key,expectedVersion,next})`; `preflight()`; `verifyReadback(expectedIdentity)`; `loadApproval({identity,key})`; clock. External durable journal must already provide `{version:0,record:null}` for an independently initialized canonical key. Missing state is HOLD, not implicit genesis. CAS must be atomic and durable across processes, and readback authentic. This module cannot prove a callback is a real database. Existing artifacts/history and migration remain caller responsibilities.

Approval is `{action:'create-private-drive-artifact',reference,identity,notBefore,expiresAt}`. Identity exactly binds folder/owner/name/MIME/bytes/SHA256; timestamps use UTC millisecond format. Independent approval retrieval is a trusted boundary, not a model assertion or cryptographic signature. The code rereads approval expiry immediately before the provider effect. A new immutable bytes copy prevents caller mutation after planning.

The fixed official multipart create endpoint is `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id%2Cversion`. Only one POST is possible for each persisted identity. Files are bounded to5MB, names content-addressed, parent fixed, MIME allowlisted, and multipart boundary collisions rejected. No update/delete/sharing/search/list-by-name path exists. Response JSON is bounded to64KiB, IDs/version validated, redirects rejected and entire operation capped30seconds. Abort is best effort and never proof an already sent request was cancelled.

## Intent and uncertainty

Before POST, persist `attempting` with exact identity and approval reference, CAS then actual readback. On timeout, failure, corrupt response or uncertain durable write, stop. Restart encountering `attempting` **never retries upload** and requires manual independently reviewed reconciliation. No API idempotency is claimed, and there is no preallocated-ID flow. If HTTP succeeded but ID was lost, this implementation sacrifices automatic progress rather than creating a duplicate. Do not reset the record or search by filename to retry.

A validated response ID/version is persisted as `readback-pending`. Both that phase and `verified` may only invoke fresh read-only verification, never another upload. Readback failure leaves known identity available for later read-only reconciliation. Successful completion requires the existing read-only adapter's exact byte/size/MIME/folder/version and owner-only observations. To compose `verifyReadback`, construct the separately reviewed `createDriveArchive` with the same owner/folder and an allowlisted existingFiles row derived from this durable response identity, then call verifyExisting. Do not return a fabricated boolean. That factory binding is externally supplied; no live implementation or OAuth is installed here.

The durable callback can be an approved transactional outbox, but the included tests use in-memory synthetic CAS only. Provider-side fences, operational store initialization/migration, cross-artifact workflow, real OAuth/refresh lifecycle, actual account/ACL verification and production activation remain unimplemented/unproved. Results are private archive observations, not public publication, atomic privacy, WORM or perpetual retention. Supplied bytes may contain private source material and may only be transmitted under the exact independent approval.

## Verification performed

`node --test tools/standalone-runtime/test/drive-upload.test.mjs`:10 synthetic tests for default-off, intent-before-effect, success, restart, unknown response, timeout, readback mismatch and expiry. No actual uploads or external calls.

Official multipart contract reviewed November17,2026: https://developers.google.com/workspace/drive/api/guides/manage-uploads . Existing DRIVE-ARCHIVE.md and DRIVE-ADAPTER.md describe the prerequisite direct owner OAuth, secret handling and read-only verification constraints.
