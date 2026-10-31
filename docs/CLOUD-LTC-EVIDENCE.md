# Selected-folder private evidence adapter — acceptance pending

Mission: preserve founder-authorized release evidence and prove exact recovery before cloud publication is enabled. Responsibilities: canonical packaging, digest verification, selected-folder upload, owner-only metadata/permission checks, bounded download and exclusive clean restore. Knowledge sources: Google Drive v3 API documentation; existing reviewed release operation coordinator. Permission scope: code and offline tests only in this integration checkout. Human owner: founder. Memory: supplied evidence bytes and returned private receipts only, never environment/credential discovery. Audit trail: immutable operation intent and downloaded proof. Stop on owner pause, uncertain remote state, permission mismatch, digest mismatch or changed reviewed configuration. Nothing in this module changes an activation gate.

## Interface

```js
const bundle = packageEvidence([{path: 'sources/base.json', bytes: Buffer.from(raw)}]);
const payload = {fileId: config.fileId, folderId: config.folderId,
  sha256: bundle.sha256, bytes: bundle.length};
const provider = createDriveEvidenceProvider({bundle,
  config: {folderId, fileId, ownerPermissionId}, getAccessToken, fetcher});
await coordinator.execute({operationId, payload, provider});
```

`createDriveEvidenceProvider` accepts the coordinator's context with `operationId`, `payload`, `payloadSha256`. It verifies the payload digest and its file/folder/content/length match before remote reads or effects. `apply` uploads once and immediately verifies metadata, private permissions and exact downloaded bytes. `readback` only reads the predetermined ID and returns `applied` or `unknown`; it never retries creation. `getAccessToken` is a bounded owner-authorized token closure supplied by the caller. It must not log or expose tokens. The module never reads credentials or process.env.

`packageEvidence` explicitly packages at most 128 caller-selected files with at most 2,500,000 raw bytes and 3,500,000 encoded bundle bytes. Files are sorted with deterministic ASCII ordering. Every entry contains a length and SHA-256. Duplicate, absolute, dot, dotfile, traversal and conflicting parent/file paths are rejected. Canonical re-encoding rejects duplicate/extra manifest fields and noncanonical encodings. Empty file content is allowed; an empty bundle is not. There is no filesystem crawler. The caller must exclude credentials, personal account files, keys and unrelated private documents. Large releases require multiple bounded bundles; do not silently omit excess evidence or weaken limits.

## Predetermined identities and privacy

The exact founder-selected private Drive folder is configuration only. A pre-generated Drive file ID must be obtained through a separately authorized, supported mechanism and durably recorded in the operation payload BEFORE an upload is authorized. The module does not generate IDs, create folders, change sharing or grant permissions. Owner permission ID is separately reviewed configuration, not inferred from an email address.

Google supports passing a pre-generated ID in `files.create` for stored JSON/binary uploads. The multipart create includes that ID, one configured parent, content-addressed name and appProperties binding the bundle hash, operation ID and operation payload hash. The upload body is under Google's 5 MB multipart recommendation. An existing ID is never overwritten. It is accepted only if its exact metadata, identity and downloaded bytes match.

Before creation and readback, the folder must be a non-trashed owned folder with exactly one owner permission matching the configured owner permission ID. Readback requires the same owner-only condition on the file, exactly the selected parent, the expected JSON MIME type, name, size and operation properties. Any additional, paginated, inherited/shared or uninspectable permissions fail closed. This strict policy may reject a usable but shared folder; it will not silently broaden the owner-only policy.

Only fixed `https://www.googleapis.com` Drive file metadata, permissions, media and upload routes are used. Redirects are rejected. Responses are streamed with limits and each request has a deadline. Error internals and tokens are never returned in evidence proofs. A timeout or uncertain create becomes `evidence_upload_outcome_unknown`. No automatic upload retry, DELETE, PATCH, permission write, folder search or arbitrary host is implemented. A 404 can mean inaccessible as well as absent; readback returns `unknown`, never definitive non-application.

## Clean restore

`downloadEvidence(receipt, options)` returns verified bundle and proof. `restoreEvidence(bundle, {directory})` creates an entirely new 0700 directory, writes new 0600 files and hashes their readback. Existing directories, symlinks and overwrites are refused. A failed restore may leave a private partial directory; it is not a successful restore and should be retained for diagnostics or removed only under the caller's reviewed cleanup policy. No archive extraction or executable file permissions occur. Restored evidence is data, not instructions.

## Required live acceptance — still blocked

Offline fixture tests prove software behavior, not access or service recovery. Keep cloud activation disabled until supported selected-folder authorization is available and the owner-approved configuration has passed: private folder validation; known-ID upload; downloaded-byte comparison; fresh-process restore; private metadata/ACL verification; crash-after-create/lost-response reconciliation; durable lease and promotion/rollback acceptance. Never count an offline test or local evidence directory as durable cloud recovery.

Official API references:
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
- https://developers.google.com/workspace/drive/api/guides/create-file
- https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get
- https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/list

Tests: `node --test scripts/test-cloud-ltc-evidence.mjs` (offline only).

## Multi-bundle evidence sets

`chunkEvidence(files)` sorts the full selected path set deterministically and returns an array of independently hashed bundles using the limits above. Global duplicates and parent/file collisions are rejected across all chunks. The set is bounded to 4,096 selected files, 64 bundles and 160 MB raw evidence. An individual file larger than 2.5 MB is explicitly rejected; it is never truncated or silently omitted. Existing supported raw response collectors are capped below this per-file limit. If a new artifact exceeds it, that artifact requires a separately reviewed splitting/manifest format.

The runner must require an exact count of preallocated `config.fileIds`, persist every chunk's file ID/hash/byte count in the durable release plan before the first upload, and reconcile each operation separately. Restore each chunk into its own newly created private directory; use the authenticated chunk-set manifest to reconstruct paths if a combined workspace is needed. Do not treat a subset of confirmed chunks as a complete evidence set. Access-token closure is called for each API request so the runner can safely refresh supported authorization without exposing credentials.

## Runtime ID allocation

`preallocateEvidenceIds({count, config:{folderId, ownerPermissionId}, getAccessToken, fetcher})` verifies the exact owner-only folder, then makes one fixed GET to `files.generateIds?count=N&space=drive&type=files` for 1–64 unique IDs. It does not create a file/folder, mutate permissions or retry. The runner must persist each returned ID in the durable operation payload before authorizing upload. A crash before persistence leaves an unused ID, not an uploaded object. An existing operation must reuse its recorded ID; allocation must not replace an uncertain operation's identity.

## Full artifact packaging and restore

Use `packageArtifactEvidence(files)` rather than raw `chunkEvidence` for large artwork, Git bundles, source files and Build Output function configuration. Input is an explicitly gathered list of `{path, bytes}`; this helper never discovers files. Paths must start with `source/`, `static/`, `build-output/` or `evidence/`. Absolute paths, backslashes, control characters, dot/dot-dot/empty components, duplicate paths and parent/file conflicts are rejected. Known reviewed hidden components are accepted only within those prefixes: `.github`, `.vercel`, `.vc-config.json`, `.env.example`, `.gitignore`, `.gitattributes`, `.gitkeep`, `.nvmrc`, `.release`, `.well-known`. Other hidden paths fail closed. An example environment template is not permission to include a real `.env`, credential file or environment export. The caller still must exclude private account/credential files from selection.

Every original file has a full SHA-256 and exact length in a canonical manifest. Large files are split into 2 MB parts, each separately hashed and stored under a safe `parts/<whole-file-hash>/<index>` name. Duplicate content is shared across source/public, portable static and Build Output copies without removing any original path from the manifest. Original hidden names are JSON manifest data, not extraction instructions. Dynamic route names such as `[slug]` and readable filenames with spaces are preserved.

Return shape: `{bundles, manifest, manifestSha256}`. The manifest explicitly records actual file counts per scope and total original bytes. It does not claim completeness merely because some files exist in each scope. The runner must compare the manifest against its full Git source/changes, static output, function/output configuration and raw evidence inventories; preserve a Git bundle or equivalent full history where rollback requires it. The helper caps selection at 8,192 files and 1 GB original bytes, with the existing deduplicated bundle-set limits still enforced. Exceeding a bound is an error, never a reason to silently omit an artifact.

`restoreArtifactEvidence(bundles,{directory,expectedManifestSha256})` verifies every downloaded bundle, canonical manifest, part index/length/hash, complete-file length/hash, global path uniqueness and absence of unreferenced payloads BEFORE creating the destination. It reconstructs the exact original paths and bytes into one new 0700 directory with 0600 files, including function `.vc-config.json`. File execute modes are intentionally not granted; this is a private byte-exact evidence restore, not execution of restored code. Recover Git modes from the verified source history as part of a separately reviewed build/rollback rehearsal. The function returns actual restored counts and manifest hash. Missing chunks, hash mismatches, unexpected manifest fields or existing destination paths fail closed. The runner must compare expected manifest hash and coverage before calling recovery accepted.

Twelve offline tests currently pass, including allocation, large binary segmentation, cross-scope deduplication, hidden configuration and dynamic-route path recovery, missing chunks and exact byte readback. Live selected-folder upload, downloaded recovery and release rollback acceptance are still unproven by these tests.
