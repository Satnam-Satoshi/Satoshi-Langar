# Dormant private Firestore upload journal

Mission: protect one approved Drive artifact identity from accidental repeat uploads. Human owner approval, IAM, initialization and operator reconciliation remain external. No network/SDK construction occurs on import. Only injected official-SDK-shaped dependencies are used. Tests are synthetic; no production Firestore or Drive operation was performed.

`createFirestoreUploadJournal({Firestore,expectedProjectId,expectedDatabaseId,identity,claim:{owner,fence},clock,mutationEnabled:false})` implements the existing uploader's `read({key})` and `cas({key,expectedVersion,next})`. Project/database options are explicit; namespace is fixed to `newsroomPrivateUploadJournalV1/<sha256(canonical identity)>`. An optional expectedDocumentPrefix must equal that constant. Emulator overrides are rejected. Clock must be a pure local callback. Constructor inputs are snapshotted, not looked up from ambient credentials.

Canonical identity is exactly `{folderId,ownerPermissionId,name,mimeType,bytes,sha256}` with sorted JSON keys. Name derives from hash and allowed MIME suffix; size is bounded to the uploader's 5,000,000 bytes. Treat this collection as private: it contains owner/folder and later file IDs. This module does not configure security rules or assert privacy merely from the namespace.

## Existing global inventory; atomic genuine-new-key allocation

The independently initialized private root is fixed at `newsroomPrivateUploadInventoryV1/root`, generation `standalone-upload-inventory-v1`, schema `{schemaVersion:1,generation,initialized:true,revision,claims:{<identityKey>:<same identityKey>}}`. No initializer is provided. Approved migration must preserve every prior claimed upload identity; an empty replacement root cannot be used to forget uploads.

Reads transactionally check root and exact content-identity row. Only unclaimed-plus-absent returns virtual `{version:0,record:null}` without writing. First CAS atomically adds a claim and creates version-1/attempting, under the existing live controller lease. No manual per-artifact initialization is needed. Missing root, orphan row, known missing row, or known version-0/null row all hold. Existing null rows cannot automatically be migrated as fresh.

Inventory is capped at 1,000 lifetime claims and 256 KiB; exhaustion holds without rotation. The last safe revision remains readable; a further increment is rejected before writes. Actual effect row envelope remains `{schemaVersion:1,generation:'standalone-upload-journal-v1',initialized:true,key,identityJson:canonical(identity),version,payloadJson:canonical(state)}`.

`claim` is captured in the factory because uploader requests have no owner/fence fields. Every CAS checks existing `newsroomControl/standalone-v1` initialized revision, emergency-stop off and matching live owner/fence lease in the same transaction. Control is never written. This gate does not itself approve a Drive upload; the uploader still requires exact approval and private-folder preflight.

## Transitions and uncertainty

Only existing-row updates are allowed, with version increment and these exact stages: null/0 → attempting/1 → readback-pending/2 → verified/3. Identity, key, approval reference and known provider file identity cannot change. Verified is terminal. No reset, replacement, deletion, version rollback, state genesis or control mutation is provided. SDK transaction callbacks contain only read/update operations plus the pure clock, no external effects. A successful CAS requires an exact post-commit readback. Stale expected version returns `{applied:false}`.

Any transaction or readback exception latches mutation in that instance. Reads remain available; restart with mutations disabled for reconciliation. `attempting` survives unknown upload outcomes and the actual uploader refuses another POST. `readback-pending` can resume independent read-only provider verification before marking verified. Verification is not an exactly-once or WORM guarantee, nor evidence that an operator may reset the row. A late unknown commit must be read/reconciled, not blindly retried.

## Remaining integration seams

- No global inventory initializer, lease acquisition, production wiring, credentials, IAM, scheduler or vendor recovery is added.
- A lease can expire or stop can change after the CAS transaction. The unchanged uploader has no final control re-read immediately before HTTP. This adapter cannot promise revocation fencing or provider-enforced fencing across that gap; deployment remains dormant pending reviewed orchestration.
- Read-only re-verification of an already verified artifact is permitted without a live mutation lease. Marking a pending artifact verified still requires a current independently supplied matching lease.
- The SDK constructor and configured project identity are trusted injection boundaries, not authenticated by this module.

Tests compose the actual Drive uploader, actual read-only Drive archive verifier and this journal over a shared fake SDK/mock HTTP transport. Actual synthetic bytes and metadata/owner checks are verified. Restart after success repeats read-only verification without a second POST; unknown HTTP leaves durable attempting and never retries. These are not real cloud integration tests.
