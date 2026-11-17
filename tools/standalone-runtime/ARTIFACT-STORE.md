# Dormant durable private artifact bundle composition

Mission: retain exact draft bytes and recover them after process restart without rerendering, resending an uncertain upload or publicly sharing files. This composes the actual direct Drive upload/private readback adapters with inventory-backed Firestore upload journals and a bound bundle index. All dependencies are injected; defaults networkEnabled/mutationsEnabled are false. No real provider request, credential, resource, IAM or sharing change is included.

## API

`createDriveArtifactStore({Firestore,expectedProjectId,expectedDatabaseId,claim,clock,fetch,resolveSecret,secretReference,folderId,ownerPermissionId,loadApproval,binding,networkEnabled:false,mutationsEnabled:false})`

Binding is exactly `{runId,editionId,eventSha256,sourceCommit,sourceInventorySha256,manifestSha256}`. It binds the canonical daily event and one preparation manifest before store construction. Source identity is a pin, not semantic approval, source freshness or execution-image attestation.

- `putBundle({manifestBytes,artifacts:[{name,bytes:Uint8Array}]})`: exact preparation-worker schema, five fixed artifacts. On success returns `status:'durable-private-bundle'`, private `receipt:{manifestSha256}`, and actual readback `output` in that same schema.
- `readBundle({manifestSha256})`: restart lookup through the configured event's authenticated durable index; requires no in-memory receipt or caller-supplied Drive IDs. Returns `status:'durable-private-bundle-readback'` plus actual bytes. With mutationsEnabled:false it cannot upload or write a journal/index.
- `reconcileBundle({manifestSha256})`: explicit provider-readonly recovery for an interrupted final index only. It requires networkEnabled and mutationsEnabled because it may finalize the private index under current live control. No provider POST is made.

Failures return a bounded held reason and retryAuthorized:false; no credentials or provider responses are logged. Raw bytes are returned only through the explicit artifact-read API, not inserted in logs or summary proofs.

## Bytes and durable records

The fixed public-role draft files are edition.pdf, reader.html, cover.png and promo.png. The fifth file, renderer-provenance.json, is the exact local renderer manifest bytes: draft flags, issue ID, runtime fingerprint and all four hashes/lengths are checked. The worker manifest separately binds all five filenames/MIME/hashes/lengths to run/source/source-inventory. Each upload is limited to 5,000,000 bytes by the reviewed direct upload path; oversize holds rather than truncating or changing format.

The store uploads five artifact byte sequences, the canonical worker manifest, then a private bundle descriptor binding event/source, all IDs, provider versions, bytes, MIME and hashes. That is seven uploads for distinct content. Content-identical bytes with the same MIME/folder/owner intentionally reuse one content-addressed upload identity; roles remain separate in manifests.

Each upload uses `createDriveArchiveRuntime` and an exact content-identity `createFirestoreUploadJournal`. It records intent before POST, retains returned file ID/version, then verifies owner-only metadata/permissions, actual bytes/hash and unchanged file/folder version. Unknown POST outcome stays attempting and is never retried. The actual uploader's proof is required; a local saved manifest or asserted upload success is insufficient.

`createDriveArchive.readVerifiedArtifact(fileId)` is a narrow explicit extension: it returns verifiedBytes from the **same** bounded media read checked between pre/post owner-only metadata/version observations. Existing `verifyExisting` remains proof-only. The bundle store rechecks the returned byte length/hash, file/version/folder/MIME and matching verified upload journal. There is no second unverified download after proof.

## Authoritative index and initialization

Existing private bundle root: `newsroomPrivateArtifactBundlesV1/inventory`, generation `standalone-artifact-bundles-v1`, schema `{schemaVersion:1,generation,initialized:true,revision,claims:{<eventSha256>:{bindingSha256,stateSha256,version}}}`.

Bundle rows: `newsroomPrivateArtifactBundleV1/<eventSha256>`, generation `standalone-artifact-bundle-v1`, envelope `{schemaVersion:1,generation,version,payloadJson}`. Canonical payload contains exact binding, retained worker-manifest base64, status and receipt. Version 1 is preparing with null receipt; version 2 is complete. Inventory digest binds exact row bytes and phase. One canonical event cannot allocate a different manifest/source binding later. Known missing rows, orphans, mismatched digests and changed binding hold.

Both root and upload inventory must already be initialized and correctly migrated by a separately approved process. No global empty root is synthesized. First bundle preparing claim is atomic under existing controller owner/fence/stop/expiry; all upload allocations and completion writes separately require live control. Index caps are 100 lifetime bundle events and 64 KiB; upload inventory caps are 1,000 identities and 256 KiB. No rotation, deletion, overwrite or silent counter rollover exists. Privacy depends on real IAM, not the private path name.

## Restart and interruption semantics

A successful complete bundle can be opened by a fresh process from the binding+manifest digest: Firestore resolves private receipts, descriptor bytes are verified against the index, original worker manifest and all five artifacts are fetched and rehashed through actual private readback. The returned bytes are validated again as a preparation-worker output. No renderer, uploader or mutation-enabled runtime is invoked.

A preparing bundle does **not** automatically resume uploads or rerender. `reconcileBundle` derives expected file identities from its retained manifest and requires all five artifact journals, the worker-manifest journal and the derived descriptor journal already to be version 3/verified. It uses those exact saved IDs/versions, rereads every file and checks descriptor/source/event binding. Only then may a live-control-gated transaction finalize the unchanged index. Missing/attempting/readback-pending journals hold; no guessed file ID, new file or POST is permitted. Unknown completion writes are read/reconciled, never blindly retried.

This supports verified-all-files/final-index interruption recovery, **not** arbitrary partial-upload recovery. An interrupted or unknown earlier upload requires separate review; it remains safe but may block that bundle. Retention is `subject-to-account-policy`, not WORM, permanent retention or atomic multi-file storage. File deletion, ACL/version change or unavailable provider later makes readback hold. Neither storage nor a historical readback implies current editorial freshness, visual QA, public availability, publication or campaign delivery.

## Tests and remaining deployment work

Unit integration uses actual upload, archive and Firestore-journal code with a synthetic serialized SDK/mock Drive provider. Tests persist JSON rows and raw-file base64 to disk, restore a fresh fixture, then recover exact bytes with zero additional POST. Unknown uploads, ACL/byte changes, binding substitutions, lost roots/rows, known-null reset, capacity and safe-counter boundaries hold. A final-index interruption test verifies seven preexisting files and records completion with zero provider writes. These are mocked provider proofs, not claims about a real account.

The separate offline orchestrator exercises real local renderer output with this same composition. Real credentials, approved roots/migration, IAM, service identity, private folder/owner authority, action approvals, retention operations, deployed execution and actual production readbacks remain unconfigured. npm start and production effects remain disabled.
