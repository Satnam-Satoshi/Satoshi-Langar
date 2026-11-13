# Pre-effect cloud exit and finite lease retirement review

This proposal is inactive. It neither retries the failed run nor clears a current-fence intent, creates a deployment, activates publication, or changes the retained UNKNOWN incident.

## Proven failure mechanism

The release CLI awaited `runRelease()` at module top level. After collection/build, `runRelease()` dynamically imports the acceptance client and production transport. Those modules statically import release exports. The import therefore waits for a module whose top-level await is waiting for that same import. With no pending I/O handle, Node exits13 with `Detected unsettled top-level await`; normal promise cleanup/catch cannot finish. Library-import tests did not exercise the direct CLI entry's asynchronous evaluation cycle.

The fix finishes release module evaluation before invoking `runRelease()` through a promise callback. A subprocess regression reproduces the previous entry/import cycle with exit13, proves the actual revised entry completes, and proves a preparation failure reaches cleanup and the safe CLI error instead of exit13. No collector retry, credential change or provider effect is needed to fix the cycle.

## Separate finite founder authorization

Proposed new protected secret: `LTC_PRE_EFFECT_RECOVERY_REVIEW_JSON`.
Proposed independently approved protected variable: `LTC_PRE_EFFECT_RECOVERY_REVIEW_SHA256` (SHA256 of `JSON.stringify(parsedReview)`). No values are provisioned by this proposal. Existing promotion/activation authorization is not reused.

The review schema in `cloud-ltc-pre-effect-recovery.mjs` requires:

- `schemaVersion:1`, kind `founder-approved-pre-effect-lease-retirement`, `approved:true`, founder actor, approval timestamp, exact newly reviewed controller source and implementation digest.
- Exact raw website document `snapshotSha256` (SHA256 of compact `JSON.stringify(snapshot.value)`, not a Docs envelope), exact website document/folder bindings, repository/project/team/domain scope.
- Original failed run/attempt, original reviewed source commit, exact main-workflow head commit and durable fence. Runtime input `acceptance_source_commit` must match that original source; `acceptance_fence` must match the original fence.
- Exact accepted previous deployment, previous public manifest SHA256 and current source publication-policy SHA256.
- `zeroCurrentFenceIntentsRequired:true`, `pausedAfter:true`, `authorizePublication:false`.

For the observed first-run incident, the owner's private packet must bind the actual original run attempt and source, fence5 and exact `gha-<original-run>-<attempt>` lease, and the actual accepted public baseline. Operational IDs and full private state belong in the protected review, not committed documentation. The old UNKNOWN incident and every historical proof remain intact.

## Manual main workflow mode

Update the existing main workflow from `ops/ltc-daily-workflow.yml` only after review; do not add a scheduler. `pre-effect-retire` is an additional choice in the existing dispatch input, preserving ten inputs, the same protected environment and concurrency group. It requires founder/manual/main admission, `LTC_CLOUD_PUBLISH=false`, accepted current implementation, the exact original source/fence inputs and crash mode `none`. The existing protected bootstrap previous-manifest mechanism supplies the actual accepted baseline. No collection/build or provider mutation runs.

The CLI is:

```
node scripts/cloud-ltc-pre-effect-recovery.mjs \
  --review PRIVATE_REVIEW_JSON \
  --state-config PRIVATE_WEBSITE_CONFIG \
  --previous-manifest PRIVATE_ACCEPTED_PUBLIC_MANIFEST \
  --receipt PRIVATE_SAFE_RESULT
```

The controller verifies its implementation before private configuration reads. It captures one website snapshot+revision, validates the same raw snapshot with `DurableCloudState`, checks exact lease/fence/snapshot, and rejects **any** current-fence intent regardless of status, any matching-run intent, any nonterminal active intent, or restore hold. It checks the exact original GitHub run attempt is completed with failure/cancellation/timeout, founder/manual/main/exact workflow and pinned head. It verifies original source ancestry, current controller/branch/head and exactly pinned publication policy, fresh fixed project controls and both public pointers, then verifies every previous public byte using the reviewed redirect policy.

Only then does one exact-revision CAS set `paused:true`, retire that lease and append a bounded immutable retirement receipt. The fence, intents/receipts, latestRelease (including absence), historical acceptance and UNKNOWN incident are unchanged. The receipt binds the original snapshot, original full lease/pause, original/completing run/attempts, source/controller, review and full public baseline. It never authorizes publication. Exact readback is required before reporting success. CAS conflict, ambiguous response, readback mismatch or receipt-save failure produce no automatic retry or success claim; inspect the private state before any further separately reviewed action. At16 historical retirement receipts a new archival review is required; none are automatically pruned.

After successful retirement, the website remains paused and cloud switch remains false. Any later activation/retry requires separate owner approval and fresh controls. Current-fence effects, if ever present, require their own evidence-based recovery and cannot use this finite pre-effect procedure.

Independent review found no concrete safety blocker. This workflow mode is deliberately scoped to the first-publication failure's already approved bootstrap baseline. After any successful daily publication, a newly approved input manifest must match actual `latestRelease`; an old bootstrap manifest safely fails rather than being substituted automatically.
