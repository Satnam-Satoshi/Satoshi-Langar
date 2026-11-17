# Dormant frozen QA proof archive

Mission: retain the exact QA JSON already frozen by the concrete release-phase journal, then verify its actual Drive bytes and owner-only observations. This helper does not run QA, authenticate the QA producer, approve facts, create a release phase, generate a new timestamped proof on restart, or grant promotion authority. No real Drive/Firestore calls, credentials or resources were used during implementation.

## Fixed interface

```
createQaProofArchive({
 store:{Firestore,expectedProjectId,expectedDatabaseId,claim},
 drive:{fetch,resolveSecret,secretReference,folderId,ownerPermissionId,loadApproval},
 binding:{phase:'preview',projectId,sourceCommit,candidateDeploymentId,
          planSha256,manifestSha256},
 proofJson, clock, networkEnabled:false, mutationsEnabled:false
})
```

`proofJson` must be the exact canonical UTF8 JSON loaded from the already-frozen release phase, not a newly recomputed QA result. It is at most128KiB, with bounded plain JSON, no duplicate keys, accessors or unknown top-level QA fields. Top-level preview status/identity/digests/time and explicit non-publication flags are checked against the fixed binding. Nested observation data is preserved, bounded and archived, not independently re-proven by this helper. An ordinary caller-supplied status or digest is not authentic QA evidence. The orchestrator must bind the full plan and obtain proof from the actual QA implementation and the concrete immutable phase record.

The phase journal owns the invariant **one frozen proof per phase identity**. This helper's content-addressed upload journal prevents retries of the same bytes; it cannot prevent a caller from constructing a new helper for unrelated/new bytes without that phase-level binding. Do not treat upload idempotency alone as release-phase idempotency.

`advance()` requires both flags true, creates the actual `createFirestoreUploadJournal` and `createDriveArchiveRuntime`, and attempts only the exact JSON artifact. Existing independently initialized upload inventory and controller lease are required. Missing roots, known missing/reset rows and uncertain upload intents hold; no initializer, name search or provider retry is supplied. Private filenames are content-addressed `ltc-archive-<sha256>.json`. The current independent upload approval binds the exact file identity, destination, owner and time window.

`readback()` is available with network enabled and mutation disabled. It reads a known file ID/version from the concrete upload journal and performs only actual Drive GET verification. A pending readback identity can be verified without rewriting its upload row. An unknown `attempting` state without a known provider ID cannot be recovered by searching filenames or uploading again.

Both methods use the existing direct Drive reader to verify actual media bytes, SHA256, MIME, size, name, file/version/parent, account owner and owner-only permissions, including before/after metadata. The complete raw proof bytes are compared, not merely provider metadata. The journal identity is read again afterward to detect a changed file binding. Returned `receipt` is exactly `{fileId,version,sha256,bytes}` and can be retained in the phase journal.

Successful status `qa-proof-archived` means byte/archive readback only. It always retains `qaAuthorityAuthenticated:false`, `publicationVerified:false`, `promotionAllowed:false`, `atomic:false`, `worm:false`, and account-policy retention. Owner-only access is an observed non-atomic state, not a WORM or forever-private guarantee. Service authentication depends on the independently approved runtime, credential resolver and transport; no ambient credentials are discovered.

## Freshness, restart and private data

Expired retained proof can still be archived for audit when the exact storage action is approved. Its original checkedAt/expiresAt and bytes are not changed. The return's `fresh` is recomputed after all awaited readback/journal checks; expiry at the boundary is stale, invalid/backward clock holds. Embedded historical `fresh:true` in the original proof must never be treated as current release authority. Promotion must independently recheck the actual proof's expiry and all other gates.

The helper returns receipt metadata, never raw proof bytes, token values or provider responses. Treat the supplied raw QA JSON and retained Drive identity as private operational records; do not log them or publish them to a repository. Errors are generic bounded codes. Default-off calls make no SDK/Drive requests. Explicit active construction/callbacks rely on trusted injected code; this is not a sandbox against a malicious SDK or credential resolver.

Tests use the actual Drive/upload/journal modules over a transactional fake SDK and fake Drive. They exercise exact bytes, restart with restored state, zero duplicate uploads, unknown POST outcomes, lost/reset inventory, changed ACL/media, expired/final-readback clocks, immutable input binding and proof JSON larger than identity-string limits. They do not prove live IAM/OAuth, real provider retention/durability or production approval.

`node --test test/qa-proof-archive.test.mjs`
