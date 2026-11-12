# Existing software stage recovery: pure policy handoff

Status: **draft pure validation only, not a recovery runner**. No workflow,
credential read, journal write, effect, lease claim, rebuild or deployment is
implemented. No production identifiers, private journal or private review are
included in the fixtures. The release coordinator remains the sole writer.

## Interface

`validateSoftwareStageRecovery({ env, review, document, originRun,
originalReview, originalContext, manifest, buildOutput, changedPaths, now })`

The test fixture documents the exact review shape. `review` is a new,
independently approved and hash-pinned finite recovery review. It binds the
current controller/source and workflow head separately from the original
artifact source/implementation, candidate, original stage intent, snapshot,
prior daily release and archived package. It does not extend the original
software review's expiration or change any historical receipt.

`document` is a freshly read exact snapshot; `originRun` is the exact completed
failed attempt of the original software workflow. A finite original lease may still be unexpired: the exact completed origin
attempt and explicit approved new-fence claim are required either way. Its
expiration is preserved; the old lease is never renewed. The original run uses `software-<run>-<attempt>`, not `gha-...`.
`originalReview`, `originalContext`, manifests and changed paths must be obtained
from the existing verified private artifact package. The pure policy reuses
`validateSoftwareReview` at the original run start to verify historical scope,
then verifies the original context against the current unchanged daily baseline.
It does not treat the expired historical review as current publication authority.

The new protected review pin is `LTC_SOFTWARE_STAGE_RECOVERY_REVIEW_SHA256`;
controller source is `LTC_RECOVERY_CONTROLLER_SOURCE`. These are proposed
interface names only. Nothing has been added to protected settings.

The result explicitly states `validationOnly: true`,
`stageReconciliationRequired: true`, and `mutationAuthorized: false`.
Archive restoration, protected bytes and API verification remain false.
The policy takes the approved archive part count as data rather than hardcoding
one incident; the test incident has 42 parts and the package limit is 64. All parts must be present,
confirmed, owner-only, individually hashed, ordered, unique and tied to the
original lease generation/package. Exactly one further current-fence intent,
the original uncertain stage with no receipt, is allowed. Existing prior daily
summary receipts remain intact.

## Required executor work, intentionally NOT implemented

1. Independently verify controller/source and protected review configuration,
   exact originating attempt completion, project policy and old public aliases.
   Verify the fresh snapshot revision before any proposed state change.
2. Restore all existing package parts through authenticated owner-only reads;
   prove package/source/static/full-output manifests and archived review/context.
   No collector, dependency install, build, Git write or artifact reupload.
3. GET the exact existing candidate and its four metadata bindings. Verify the
   entire protected static manifest and four API responses. A metadata or small
   route sample is not full stage proof. Verify the prior public rollback bytes.
4. Reconcile only the original uncertain stage with actual service evidence.
   Preserve its original run/fence/payload and all archived receipts. Do not
   rebadge old rows to the new operator. The current preflight intentionally
   rejects an already-reconciled snapshot; an executor must explicitly validate
   that exact one-row/one-receipt transition, not retry preflight blindly.
5. A separately reviewed claim transition must use one CAS against the freshly
   bound snapshot/revision and a new run/fence. Preserve the original lease,
   snapshot/proof hashes and all historical markers in a dedicated recovery
   record. Verify readback after CAS. Ambiguous CAS holds; never blindly repeat.
6. A new bounded transport must explicitly bind the historical confirmed stage
   to this reviewed claim. Existing `createDurableVercelCommand` deliberately
   requires same-fence stage attribution and cannot be reused by relabeling.
   Permit only first promotion and confirmed-failure rollback of the exact pair.
   Check current live lease/holds/intent after final awaits; synchronous review
   expiry governs first promotion, not already-authorized rollback within lease.
7. Reuse software checkpoint semantics: retain daily `verifiedAt`, edition and
   provenance; record `softwareVerifiedAt` separately. Preserve all historical
   acceptance/retirement/first-proof records and the daily schedule. Do not use
   routine first-daily continuation/checkpoint recovery, which require no prior
   latest release and have different activation semantics.
8. Explicitly finalize the recovery record after verified summary/checkpoint/
   compaction and before releasing the lease. The current shared software tail
   returns before `completeCheckpoint`; a routine continuation callback will
   not finalize software recovery. No automatic retry after uncertain promotion,
   rollback, summary upload or terminal write. Each requires observation of the
   exact existing effect before any further authorized action.

## Verification and limits

Synthetic tests cover independent fresh approval, expired original approval,
completed software origin, finite expired or unexpired exact lease, preservation of daily baseline,
controller/artifact distinction, immutable context/manifests, wrong receipt sets,
extra effects, owner-only archive proofs, duplicate IDs/indexes and generation.
The tests do not exercise any live state or remote service. Production preflight
has not been claimed: the verified restored archive inputs are still required.

## Reviewed core executor contract

`continueReviewedSoftwareStage({ env, state, review, dependencies })` is the narrow shared core. `state` is an existing `DurableCloudState` for website, never a replacement journal. It first validates review/owner/controller scope, pins the exact existing snapshot, captures the existing protected quarantine/retirement binding, proves the failed origin terminal, restores verified metadata and checks the full existing candidate and prior public baseline. It checks capacity and fresh review again immediately before one revision-CAS.

That one CAS confirms the already-proved original stage without changing its original run or fence, preserves its raw uncertain record and original lease in a recovery marker, and assigns a new actual operator/fence. Ordinary publication does not gain permission to reuse historical stages. The mutation adapter accepts an older stage only when its exact immutable receipt hash and review are bound by this stored recovery claim; claim drift, expiry, pause, hold, global fence, lease or intent changes block the actual POST.

Dependencies are data-returning `restore(review, document)` with `{originalReview, originalContext, manifest, buildOutput, changedPaths, previousManifest}`; read-only `github`, `vercel`, `verifyControllerAndPolicy`, `verifyProjectAndPointers`, `verifyPublic`, `verifyProtected`, and `verifyProtectedCandidate({review,stage,manifest,buildOutput})`; `createMutation({state,lease,historicalStage,assertPromotionFreshness})` using the reviewed durable adapter; and the existing owner-only final-summary evidence transport. `verifyProtectedCandidate` must prove unique raw operation metadata, exact full static bytes and all four API handlers before returning the exact existing stage provider proof. A subset or fixed diagnostic result is not acceptable. No dependency may build, reupload artifact archives, redeploy, change Git refs or create credentials.

The shared software finish tail invokes recovery completion before lease release. Completion verifies the compacted private summary and preserved daily fields, records software verification separately, atomically completes the recovery marker and releases the new lease, restoring the original paused state. It never updates first-daily activation markers. Failure after claim holds the new lease and pauses; it never clears an uncertain effect or automatically replays a mutation. A confirmed promotion with failed public verification can perform one separately fenced rollback; uncertainty remains held.

`linked.readProtected(declaration, records, manifest, onFailure)` optionally emits awaited per-record failure diagnostics. Output is the public manifest path/hash, ordinal/count, a fixed phase, an allowlisted error code and numeric HTTP status. No body, header, credential or provider error text is emitted. Callback errors cannot change acceptance: the original verification failure is always rethrown. This adds no requests or retries.
