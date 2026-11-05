# Already-promoted checkpoint recovery

Mission: finish the private checkpoint for an already-public, byte-verified release after a lost promotion acknowledgement. Founder owns review, protected configuration, dispatch and acceptance. This finite controller may read existing resources, reconcile one proven applied promotion in a new fenced claim, and create one private final summary. It has no promotion/rollback CLI, mutation bridge, source-write capability or old-artifact upload capability. It cannot activate routine or social publishing. Uncertainty means stop with a paused held lease; never retry effects automatically. Private original/reconciled ledgers and the summary receipt are its audit trail. No credentials are stored there.

## Exact review and dispatch

Protected secret `LTC_PROMOTION_CHECKPOINT_REVIEW_JSON`, variable `LTC_PROMOTION_CHECKPOINT_REVIEW_SHA256` (canonical receiptHash). Mode `recover-promotion-checkpoint` is a founder/manual/main/ltc-production exception with global publication and social gates false. The accepted implementation digest must match the reviewed controller. `acceptance_source_commit` is the **new exact controllerSource**, while `acceptance_fence` is the old held fence. Old artifact source is separately pinned in the review; it is never relabelled as the new controller source. The workflow template/main must be reviewed separately; no second scheduler is added here.

CLI contract:

```
node scripts/cloud-ltc-recover-checkpoint.mjs --review-file PRIVATE_REVIEW \
  --state-config PRIVATE_WEBSITE --evidence-config PRIVATE_EVIDENCE --receipt NEW_PRIVATE_RECEIPT
```

Review schema: `schemaVersion:1`, kind `founder-approved-already-promoted-checkpoint-recovery`, approvedtrue, founder actorId, actual approval/expires (maximum six hours); exact controllerSource/controllerImplementationSha256 and **operatorWorkflowHead**; original artifactSource/artifactImplementationSha256; original snapshotSha256; source/static/build/package manifest hashes; accepted previous public manifest hash/deployment; current sourcePolicySha256; originalUnknownRawSha256, retirementRecordSha256, uploadQuarantineRecordSha256, firstFreshRecordSha256, migrationActivationSha256; original origin `{runId,attempt,fence,workflowHead,sourceBefore}`; scope `{repository,project,team,domains,branch}`; exact bindings `{websiteDocumentId,folderId,ownerPermissionId}`; stage/promotion operation IDs, candidateDeployment, editionId and exact edition/source-desk/graphic provenance; exact intentCount/receiptCount/currentOperationCount/evidencePartCount.

Flags must be authorizePromotionfalse, authorizeRollbackfalse, authorizePublicationfalse, authorizeRoutineActivationfalse; confirmExactlyOneAppliedPromotiontrue, allowExpiredFencedClaimtrue, exactlyOnePrivateSummarytrue, preserveAllHistoricalRecordstrue, pauseAftertrue. The original failed workflow head and the new operator's main head are separate: policy requires GITHUB_SHA==operatorWorkflowHead; runtime freshly checks main ref at each control pass. No arbitrary descendant is authorized: source HEAD, remote source ref, current guard and source-policy hash must equal the exact reviewed controller. Artifact ancestry is checked only in addition to those exact pins.

## Before any journal write

The original Doc must match the reviewed hash/version, paused with its **actually expired** held lease, pending first-proof marker, no latestRelease, exactly one uncertain promotion and all other receipts terminal/unchanged. Complete source/Git/stage/part identities and f1 UNKNOWN/f6 retirement/f8 quarantine are verified. The original run must be completed failed founder/manual on its pinned old main head.

Download and restore every original private artifact part with selected folder/owner/operation/hash proofs. Verify complete source/static/build/evidence scopes, original implementation guard, manifests, rollback baseline and publication provenance. Execute none of the restored source. Fresh GETs verify owned project/team, exact candidate stage/source metadata and both public pointers; full public manifest bytes must match. No live price fetch or edition timestamp rewrite occurs: this reconciles an existing publication, not a new promotion.

## One new operator, one summary attempt

One claim CAS increments the fence, preserves pausedtrue, confirms only the proven old promotion using verified provider readback, and persists the sole new UNCERTAIN private-summary intent before its apply call. All original rows remain active. The new operator never uses the expired owner's identity.

The three-file canonical summary contains artifact-manifest.json, release-receipt.json and ledger-backup.json. The backup includes both exact original failed ledger bytes/hash (originalBackup) and the reconciled full ledger with all old rows and new operator context. Every original current operation has exactly one complete receipt in the release summary; none is re-applied. No history is stripped to fit capacity; existing evidence bounds reject oversized summaries.

Review/lease/claim/version, current source/main/public controls, local restored bytes and applied-promotion GETs are rechecked around the sole summary apply/readback and before final checkpoint. Lost responses, mixed pointers, unavailable bytes, expiry or concurrent changes keep the paused new claim and all old rows. A rerun fails its original snapshot gate; it cannot repeat the private upload or promotion.

Only an owner-only exact summary download proof permits one final CAS: preserve historical metadata, compact archived old rows, save latestRelease pointing to the **actual old published artifact/source**, save separate recovery/controller context, and produce a causally newer first-fresh proof. It records checkpointRecoveryCompletionSha256 plus the retained quarantine completion. Final state is paused, no lease, routinefalse. The existing ordinary next-run manifest loader consumes this summary. The old GHA publication run stays failed; the new operator is a recovery run, never a falsely successful normal publication.

## Independent acceptance and later publication

Founder independently verifies the final native Doc, exact private summary/ownership/bytes, both original and reconciled backups, sole old-promotion reconciliation, every preserved historical pair, all current receipts, current public bytes/pointers/source and next-run loader. New protected code/current-controller migration pins require explicit review; legacy artifact/proof/UNKNOWN pins remain unchanged. Only after that proof may a separately authorized manual activation consider the existing conditional routine policy. Archive recovery itself enables nothing.

Future combined controller may include reviewed design/transport changes. Recovery still restores the exact old live package and never rebuilds or promotes it. A later normal current-day run can deploy the reviewed newer design while retaining immutable edition history; that is a separate publication action and proof.

Tests: `node --test scripts/test-cloud-ltc-checkpoint-recovery.mjs`. Root's private actual-snapshot fixture is deliberately separate from public tests and must label simulated expiry, historical captures and mocked complete restore; it is not live authority.
