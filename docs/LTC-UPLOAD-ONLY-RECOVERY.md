# Upload-only lease recovery: review package

Status: **isolated controller and tests, not activated**. This change adds no CLI,
workflow wiring, secret, schedule, provider write, production deployment or
unpause. It does not modify existing state/coordinator guards.

## Scope and governance

The human owner remains the Satnam Satoshi founder. The mission is to recover a
failed archive-only generation without replaying uploads or publication effects.
Responsibilities are limited to exact journal validation, independently verified
readbacks and one revision-conditional journal update. Knowledge sources are the
pinned source modules, originating Actions run, private journal, owner-only Drive
artifacts and previous public artifact manifest. Permissions cover review and
tests; production wiring requires a separately reviewed caller and fresh owner
coordination. Stop by withholding approval or any required proof. Private review
records and operational identifiers must never enter this public repository.
Audit evidence is preserved in the existing private journal and an independently
retained controller result. The module stores no credentials.

## Why a separate narrow path

The coordinator durably writes `uncertain` before it invokes a provider. A
persisted `pending` row means that authorization was never durably granted. A
completed origin plus an unchanged revision-pinned journal therefore supplies a
stronger proof than a Drive 404. A 404 alone is **never** proof that a request
cannot complete later.

Ordinary expired-lease recovery intentionally requires all terminal intents.
Pre-effect recovery intentionally requires no current-fence intents. Neither
should be weakened to accommodate partial archive upload generations.

## Accepted state and required proof

`recoverUploadOnlyLease` accepts only the exact approved review hash, matching
journal revision/hash, expired originating lease, and complete contiguous bundle
set. Current-fence rows must be confirmed or pending owner-only archive uploads.
There must be no uncertain rows, Git operations, Vercel operations, missing
bundles, receipt-bearing pending rows, or foreign/nonterminal older rows.

Before its sole write, the caller must provide verified reads establishing:

1. The exact original Actions run attempt completed with failure, cancellation or
   timeout, with the pinned repository, event, workflow and workflow head.
2. Cloud publication is gated off, local publication is disabled, and other
   owners/writers are stopped. An offline computer or old observation alone is
   not proof of this condition. The accepted source and policy remain pinned.
3. Both public domains still point to the prior deployment and every artifact in
   the full previous manifest matches its bytes and hash.
4. Every confirmed upload still matches its known file, folder, bytes, length and
   owner permission identity, with owner-only access and verified downloads.

These are provider verification seams, not assertions to fabricate. The current
module has **no production implementation of these seams**. Initial and final
origin/writer checks bracket readback. Approval and all proof freshness are
checked immediately before invoking CAS, after the final awaited journal read.
Approval lasts at most six hours; individual readback proofs are at most five
minutes old at that point. A slower audit must be refreshed, not waived.

## Exact change

One required-revision CAS marks only the approved pending IDs `not-applied`,
adds hash-bound receipts proving no durable authorization, and records the
original pending rows and lease. It retains every confirmed row, receipt, prior
release, archive head and earlier audit field. The fence number is retained;
the next ordinary acquisition increments it. The resulting state is paused
with no lease. It never creates a new edition, reissues an upload, deploys,
changes aliases, dispatches a workflow or enables publication.

A fresh publication, if later authorized and all existing gates pass, must use a
new generation and the actual current publication date. Do not backdate the
failed issue or treat the partial archive as a complete recoverable artifact.

## Conditional-write and retry contract

Production wiring must use the existing Google Docs adapter with a genuine
`requiredRevisionId`. Never use `targetRevisionId` or last-writer-wins updates.
GitHub content-SHA versioning cannot establish a monotonic revision barrier and
is not an acceptable production adapter for this controller.

There is exactly one write attempt. If the response is lost, the controller reads
once and reports success only when the entire intended after-state matches.
Otherwise it reports an uncertain outcome or conflict and never retries.

Persist the returned `stateSha256` independently of the operational ledger.
A later replay requires that saved value as `expectedRecoveredStateSha256` and
checks the complete after-state before returning a read-only no-op. Never derive
this pin from the ledger being inspected. If no independent receipt was saved,
stop for inspection and fresh review; do not run another write to obtain one.

The result says recovery only. It is not publication authorization. Any later
unpause or dispatch requires separate checked controls and owner coordination.

## Verification

The isolated cloud review ran 73 tests successfully under Node 24.22.1:

```sh
node --test scripts/test-cloud-ltc-upload-only-recovery.mjs \
  scripts/test-cloud-ltc-state.mjs scripts/test-cloud-ltc-operations.mjs \
  scripts/test-cloud-ltc-state-compaction.mjs scripts/test-cloud-ltc-evidence.mjs
```

This includes 37 new tests for the 39-confirmed/4-pending shape, immutable history,
no effect replay, active/foreign/uncertain operations, wrong owner/readbacks,
concurrent revisions/authorization, changed public baseline, stopped writers,
expired proofs, delayed reads, CAS conflict, lost writes and tampered replay.
An independent review verified the replay pin and final freshness checks.

The repository's required Node 22.23.2 runtime, full `pnpm check`, actual
Google Docs CAS integration and live owner/provider acceptance remain unverified
by this isolated package. Do not describe the patch as production-ready or merge
it into the accepted source without that validation. Any accepted-source change
also requires coordinated implementation-digest acceptance; this patch does not
change that protection.

## November 7 integration work (still not activated)

The controller now has four integration tests through the actual
`GoogleDocsStateAdapter`: success, lost successful response, revision conflict,
and rejected write. These establish the requiredRevisionId request shape and
single-write behavior against a simulated Google transport, not a live provider.

`cloud-ltc-upload-recovery-runtime.mjs` is a draft production caller. It reads the
originating Actions attempt, accepted source/policy, current publication variable,
active runs, public deployment pointers and complete public manifest, and downloads
confirmed Drive uploads using the existing evidence verifier. It has no upload,
deploy, dispatch or gate-changing methods. It leaves publication paused.

Do not wire or activate this caller yet. Remaining acceptance work:

- Verify that the protected runtime can read the repository publication variable.
  GitHub documents Variables:read for that endpoint; the existing workflow token
  must not be assumed to have it. No new credential or wider scope is authorized
  by this draft. Resolve this capability before adding workflow wiring.
- Obtain a fresh independently verified local website-writer stop record, not an
  assertion inferred from the laptop being on or off. The hash-bound record must
  remain under five minutes old at the final barrier.
- Exercise every provider seam with fault injection, validate the complete caller
  and workflow, and obtain exact code/recovery review before any protected write.
- Preserve the independently saved result before any future unpause. An absent
  result after a lost write requires read-only inspection, not another write.

Validation on Node 22.23.2: all 467 cloud tests pass with the existing pinned
Vercel CLI 65.9.0; 60 focused controller/Docs/runtime tests pass. This is not a
live recovery proof, new build proof, deployment or autonomy activation.
