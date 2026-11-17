# Dormant preparation execution and resume contract

New modules: `preparation-worker.mjs` and `firestore-preparation-journal.mjs`. No main entrypoint, scheduler, provider, publication, model, or credential activation is added.

## Independently bound inputs

`createPreparationWorker({consumer,journal,identity,claim,observeRuntime,observeSources,prepare,clock,enabled:false})` exposes `advance()` and read-only `reconcile()`. `consumer` should be the concrete existing Firestore consumer inbox reader. Identity exactly binds scheduleKey, runId, eventSha256, consumerReceiptSha256, sourceCommit, jobName, jobImageSha256, executionName, operationName and buildProvenanceSha256. Receipt hashes, canonical event and original acceptance date are checked against actual returned bytes. An operation alone is not consumer acceptance.

`observeRuntime` is an independently trusted composition, NOT the raw Cloud Run observer. It must bind job/execution/operation/image/source/build-provenance identity, underlying evidence SHA, observedAt and expiresAt (at most 60 seconds). The current direct execution observer deliberately does not prove source provenance or runtime attestation and **cannot be passed through as this proof**. A reviewed CI mapping from exact source commit to image digest, authenticated operation-to-execution association, exact approved execution template/service identity and runtime lookup remain required. Environment variables, labels, an arbitrary callback or a sourceCommit string do not establish these facts. No such production composition is implemented here.

`observeSources` supplies independently computed inventorySha256, sourceCommit, gapCount, checkedAt and separate policy/evidence/review deadlines. No gaps are allowed. The worker takes the earliest of these deadlines, runtime expiry and live controller lease. It does not invent metric freshness caps or semantic reviews. Source inventory is pinned on first claim; another observation/capture cannot silently replace it on resume. Actual review author authentication and policy calculation remain external.

## Durable transitions

`createFirestorePreparationJournal({Firestore,expectedProjectId,expectedDatabaseId,identity,claim,clock,mutationEnabled:false})` uses fixed paths `newsroomPrivatePreparationV1/inventory` and `newsroomPrivatePreparationWorkV1/<scheduleKey>`. Existing root schema is `{schemaVersion:1,generation:'standalone-preparation-v1',initialized:true,revision,claims}`. Each claim retains `{identitySha256,version,stateSha256}`. Root creation/migration is not implemented. Genuine new ready state is allocated atomically only after observing an indexed accepted consumer receipt and live controller. Known missing rows, orphans, conflicting execution identities and row-only reset/rollback hold. Every CAS updates row and indexed state hash/version atomically. Capacity is bounded at 100 retained runs; exhaustion holds, never trims history. Whole-database/root rollback remains an IAM/retention trust limit.

States are ready/version0, claimed/version1, preparing/version2, prepared/version3. First advance claims without calling preparation. A claimed restart can proceed only with identical owner/fence, source capture and runtime identity. Preparing intent is persisted/read back before invoking preparation; live lease/owner/stop and finite clocks are rechecked immediately before the callback. A restart seeing preparing, callback failure, malformed output or unknown commit **never automatically reruns** it. Prepared restarts observe the retained receipt without another write/callback. Reconcile observes existing state with `freshness:'not-revalidated-historical'` and no retry authorization. The CAS-to-local-callback race is cooperative, not a kernel-level external effect fence.

## Actual bounded output, not a prepared boolean

The reviewed local `prepare({identity,sourceInventorySha256})` callback returns `{manifestBytes:Uint8Array,artifacts:[{name,bytes:Uint8Array}]}`. Canonical manifest schema:

```
{schemaVersion:1,runId,sourceCommit,sourceInventorySha256,
 artifacts:[{name,mimeType,bytes,sha256}]}
```

Names, MIME/extension pairs, unique names, actual byte lengths and SHA256 values are checked. At most 16 artifacts, 16 MiB each, 32 MiB total, 16 KiB manifest. PDF/PNG magic bytes are checked. This is byte integrity/basic signature checking, **not full format, safe HTML, semantic, visual, layout or publication validation**. No untrusted output is rendered by this module. The journal retains the canonical manifest bytes, not the large artifacts. Actual content-addressed durable artifact persistence/readback is a separate prerequisite; the receipt alone cannot recover artifacts lost from an unconfigured local worker.

The arbitrary JavaScript callback cannot technically be prevented from doing I/O. It must be independently reviewed as local-only preparation; no permission for model, source network or publishing is conveyed. Actual retained editorial preparation is exercised in a no-source-evidence test and correctly remains held, without invented reviews. A successful four-artifact renderer integration and persistence backend are not claimed by these tests.

If evidence expires during preparation, the returned bounded bundle is exposed as stale retainedOutput for caller retention, but no prepared receipt is recorded. It is not automatically persisted. Preparing state then holds; no rerender retry is authorized. Successful `preparation-recorded` means only a source-bound artifact manifest was stored. It never means facts approved, release eligible or published.

All tests are synthetic SDK/clock/local callbacks. Run `node --test tools/standalone-runtime/test/preparation-worker.test.mjs`. No live services, images, credentials, provider calls or schedules are exercised.

Final committed readback is followed by another deadline check: if the commit crossed expiry, the result is prepared-observed-stale with the bound evidenceExpiresAt, no freshness or retry authorization. Arbitrary observer/preparation/store exception text is redacted to a fixed bounded failure code; only explicitly allowlisted internal diagnostic codes may be returned.
