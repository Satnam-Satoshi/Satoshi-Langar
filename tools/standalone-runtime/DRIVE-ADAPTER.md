# Dormant direct Drive archive reader and upload planner

`createDriveArchive({fetch,resolveSecret,secretReference,folderId,ownerPermissionId,existingFiles:[],networkEnabled:false,mutationsEnabled:false})` exposes `preflight()`, `verifyExisting(fileId)` and `planUpload({bytes,mimeType})`. Only the three files introduced with this adapter are part of this change; existing DRIVE-ARCHIVE.md remains authoritative for account and OAuth prerequisites.

No upload, OAuth creation/refresh, folder creation, permission change, overwrite, trash/delete, sharing or mutation method exists. `mutationsEnabled:true` is rejected. Pure upload plans are content-addressed filenames and hashes, not upload authorization or proof of durable storage. The independently configured folder, owner permission ID, secret handle and existing file identity list must come from approved runtime configuration, not untrusted model content. Existing files bind exact file ID/version/name/MIME/size/SHA256. IDs and returned private locators must remain private operational data, not published metadata.

An explicitly enabled preflight makes GET requests only to fixed `https://www.googleapis.com/drive/v3/` endpoints. The approved resolver supplies a short-lived OAuth access token in memory; it never imports/extracts connected-app credentials. The authenticated `about.user` must match the owner. Folder metadata must show an untrashed owned personal My Drive folder, not Shared Drive, with add-children capability, `shared:false`, exactly one matching owner, and a complete owner-only permissions response. Missing fields or additional/paginated permissions HOLD. This intentionally narrow policy may reject legitimate shared configurations rather than guessing privacy.

Existing-file readback rechecks that same folder, reads file metadata and permissions, retrieves actual media, checks SHA256/bytes/MIME, then rereads file metadata/permissions and folder metadata/permissions. The expected file version and folder version must stay unchanged. This is an observed readback, not an atomic snapshot, immutable retention or WORM guarantee. There is no reusable freshness/approval token; a caller must record independent call clocks and revalidate near any consequential operation. Drive permissions can change after any observation.

Requests use manual redirects, fixed endpoints, bounded streams (256KiB metadata, 16MiB media), total operation deadline up to30s, no concurrent operation or automatic retry, and a fail-closed latch after error/timeout. Unknown response/error contents are not echoed. Late secret resolution cannot initiate requests after timeout. Returned results never include credentials or media bytes. Binary Google-native documents are unsupported; no export or MIME conversion is implied. SHA256 metadata must be available and match independently supplied identity.

## Remaining production archive work

This adapter **cannot save a new artifact**. A reviewed durable intent/outbox, explicit upload approval, actual direct upload transport, uncertain-result reconciliation against preexisting immutable identity, and readback binding must still be composed before any archive write. Do not retry an unknown upload from another component through a fresh plan. Content-addressed filenames alone are not unique IDs or atomic deduplication in Drive. Existing historical/pending archives must be migrated explicitly; no empty ledger is initialized here. Existing paid Drive storage does not provide runtime, CAS, scheduler or perpetual retention.

## Tests and reference

`node --test tools/standalone-runtime/test/drive-archive.test.mjs` uses10 synthetic fetch/metadata/media fixtures under Node22; no real Google API calls or credentials. It is not live account/schema compatibility proof.

Official documentation consulted November17,2026:
- https://developers.google.com/workspace/drive/api/reference/rest/v3/files
- https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get
- https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/list
- https://developers.google.com/workspace/drive/api/guides/manage-sharing
- https://developers.google.com/workspace/drive/api/guides/about-files

Follow existing DRIVE-ARCHIVE.md for owner OAuth, approved `drive.file` access/Picker and secret-storage requirements; no account or scope changes were performed.
