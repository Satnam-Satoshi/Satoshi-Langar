# Upload-only recovery — implementation review

Status: implemented and locally tested; not accepted or activated in production.
The human owner remains the Satnam Satoshi founder. This finite recovery may
retire an expired archive-only generation, retaining confirmed uploads and audit
history. It does not publish, upload, deploy, dispatch, unpause or activate social.

## Controller and authority

`recoverUploadOnlyLease` requires the exact review hash, journal revision and
snapshot hash, expired originating lease and complete contiguous archive bundle
set. It accepts only confirmed/pending uploads. Uncertain operations, Git/Vercel
intents, foreign writers, missing bundles and receipt-bearing pending rows stop
recovery. A pending row proves no provider authorization was durably granted;
a remote 404 is never sufficient evidence that a request cannot finish later.

The owner-approved review expires within six hours. The protected invocation is
founder-only, manual, main-only, exact-source/fence/implementation pinned and uses
the existing publication concurrency group. Every proof must remain at most five
minutes old. The knowledge sources are the original Actions attempt, protected
review, current source policy, private journal/Drive artifacts and public release.
Memory and audit scope are those existing private resources and a sanitized
independent result hash. Withhold approval or leave the source paused to stop it.

## Live stopped-writer barrier

The recovery source policy is explicitly paused. The caller verifies its exact
hash through GitHub Contents reads and rereads source/main after checking active
runs. The global switch must also be false at job admission. This does not assume
that the job environment is a fresh repository-variable read, and requires no
Variables API credential or broader scope.

The old durable lease remains held until the single revision-conditional write
sets `paused=true` and clears it. Ordinary writers cannot acquire before or after
that transition. Shared workflow concurrency and the fresh run inventory prevent
another cloud operator. A fresh hash-bound local website-writer stop observation
is also required; a powered-off Mac or historical cutover assertion is not proof.
The final source checks do not claim cross-provider atomicity.

## Provider verification

The caller reads the exact original Actions attempt and verifies completion,
repository, workflow, event and head. It verifies Vercel project/deployment
identity and both domain pointers, downloads the prior private manifest, checks
root routing and every public artifact hash, then rechecks pointers. Every
confirmed Drive upload is downloaded and checked for file/folder identity,
owner-only permissions, byte length and digest. No upload is retried or recreated.

Proof timestamps retain the start of each observation; the controls timestamp
also retains the older local stop observation. Slow checks expire rather than
being stamped fresh at completion. The controller arms a synchronous transport
guard that checks all proof/review expiry after Google revision, OAuth and privacy
reads, immediately before the sole POST. Expiry during those awaits sends no POST.

## Write, receipt and later publication

The existing Google Docs adapter uses `requiredRevisionId`; never merge revisions
or use last-writer-wins. One write terminalizes only the approved pending IDs as
`not-applied`, preserves the original rows/lease, all confirmed receipts, prior
release and earlier audit fields, and leaves the ledger paused. A lost response
is read back once; only the exact intended after-state proves success. There is
no write retry. A separate sanitized `stateSha256` is retained in the job summary.

A later read-only replay needs that independently retained after-state hash; do
not derive it from the ledger being inspected. If the job dies before saving the
result, inspect and review the uncertain outcome rather than attempting another
write. No private snapshots, review packets or credentials enter public artifacts.

The recovery source remains paused. Resuming needs a separately reviewed unpaused
source/digest and verified recovery. A new issue must use a fresh generation and
its actual New York publication date, not replay or backdate the failed issue.

## Validation and activation decision

Tests exercise actual Docs adapter request construction, successful/lost/conflicted
writes, immutable confirmed receipts, paused results, provider identity/content
failures, stale local evidence, source changes during inventory, and zero POSTs
when approval expires during OAuth, ledger or privacy reads. Independent review
found and verified fixes for freshness timing and a source-desk write guard.

Read-only archive validation remains available while paused. New newsroom
preparation, source-desk writes and publication still enforce the pause. Positive
unit fixtures explicitly model an open historical policy rather than inheriting
the current operational pause.

Activation requires successful full checks, owner acceptance of the exact source
and scheduler changes, protected review/hash configuration, fresh local stop
proof and successful live provider checks. Unit tests and a build are not live
recovery, release verification or evidence of reliable unattended operation.
