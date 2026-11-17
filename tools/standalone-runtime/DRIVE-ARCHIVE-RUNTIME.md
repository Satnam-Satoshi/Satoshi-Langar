# Dormant direct Drive adapter composition

`createDriveArchiveRuntime({fetch,resolveSecret,secretReference,folderId,ownerPermissionId,journal,loadApproval,clock,networkEnabled:false,mutationsEnabled:false,timeoutMs:30000}).advance({bytes,mimeType})`

This factory composes the actual reviewed `createDriveUpload` and `createDriveArchive` implementations. It replaces opaque preflight/readback callbacks with their real direct-HTTP checks; tests simulate the HTTP provider, not fabricated verification booleans. Fixed owner, folder, secret reference and fetch are independently configured once. There is no per-call URL or arbitrary file-ID verification API.

Preflight uses a new read-only adapter with no file allowlist. Only the uploader's durable returned file ID/version and original immutable artifact identity create the narrowly allowlisted existing-file readback adapter. Both folder and owner must match the constructor. The read-only adapter actually checks authenticated owner, metadata, permissions, binary SHA256/size/MIME, parent, version and post-read metadata/permissions. A successful POST response alone never completes archival.

Both runtime flags default false. Enabling the flags is not approval: loadApproval still supplies exact independently approved artifact/folder/time scope, and the uploader still requires a preexisting authoritative journal record. No OAuth, account, folder, ledger or credential is created. New runtime instances retain no local dedup state; the external canonical journal controls restart. An attempting record remains an uncertain-upload HOLD, never an automatic repeat. A known readback-pending record runs only read-only checks. A verified record is freshly rechecked without changing journal version.

The factory shares the configured operation timeout with each read adapter. Outer timeout prevents the uploader from advancing or posting later; an already-started read-only sub-operation can finish within its own timeout. No second upload follows a timeout. Aborting an in-flight POST remains best effort, not proof of cancellation or absence of a created file. Recovery of an unknown file ID is still manual independently reviewed reconciliation, not search-by-name retry.

## Tested, not activated

Seven synthetic HTTP composition tests cover disabled operation, full preflight→POST→metadata/ACL/media→version/permission recheck, restart without duplicate, ACL or bytes mismatch, unknown response and timeout. Only injected mock fetch is used. No actual Drive calls, secrets, OAuth consent, uploads, migration or public-site changes occurred.

Run from repository root with Node22:

```
node --test tools/standalone-runtime/test/drive-archive-runtime.test.mjs
```

External approved HTTP/secret binding, canonical durable atomic journal, trusted approval source, independently initialized/migrated history and real owner-account compatibility remain operational prerequisites. The separately developed journal adapter must satisfy the uploader's actual read/cas contract; it is not silently substituted here. This composition does not connect the default disabled main entrypoint or schedule. Archive evidence is private, non-atomic and non-WORM, not publication or perpetual-retention proof. See DRIVE-ARCHIVE.md, DRIVE-ADAPTER.md and DRIVE-UPLOAD.md for policy/API boundaries.
