# Partial first-fresh upload quarantine

Mission: preserve a failed unpublished generation without pretending an uncertain upload was absent. The human founder alone approves and operates this finite recovery. The controller may verify existing resources, claim one new archive-only fence, create exactly one private ledger archive and checkpoint that proof. It cannot replay old uploads, create source objects, stage/promote/roll back, publish or activate routine/social operation. Primary evidence is the exact ledger, completed origin run, current private readbacks and accepted public baseline. Private receipts and the complete original ledger are the audit trail; no secrets enter it. Stop means keep publication false and the new paused lease held if any archive result is uncertain. No automatic retry or lease cleanup exists.

## Required owner review

The separate protected JSON must have `schemaVersion:1`, `kind:"founder-approved-partial-upload-quarantine"`, `approved:true`, founder `actorId`, actual `approvedAt`/`expiresAt` (at most six hours), exact current `controllerSource` and `controllerImplementationSha256`, original `snapshotSha256`, `originalUnknownRawSha256`, `retirementRecordSha256`, `sourcePolicySha256`, accepted `previousPublicManifestSha256`/`previousDeployment`, original `origin:{runId,attempt,fence,source,workflowHead}`, `bundleCount`, `artifactPackageManifestSha256`, `generation`, exact `scope:{repository,project,team,domains,branch}` and `bindings:{websiteDocumentId,folderId,ownerPermissionId}`. Preserve any other historical binding fields already reviewed.

Required finite flags are `archiveOnly:true`, `preserveUnknown:true`, `authorizePublication:false`, `authorizeRoutineActivation:false`, `allowExpiredFencedClaim:true`, `preservePendingStatus:true`, `banOldLineage:true`. `authorizeConditionalRoutineAcceptance` is optional and defaults to false. If explicitly reviewed true it allows only a later founder/manual activation after a causally new first-fresh checkpoint and independent verification; it authorizes no action in the archive job.

The protected secret is `LTC_UPLOAD_QUARANTINE_REVIEW_JSON`; variable `LTC_UPLOAD_QUARANTINE_REVIEW_SHA256` is its canonical receiptHash. The code guard must be independently reviewed and pinned before the job; current source/main workflow commits are separate pins. The archive-only controller deliberately does not treat an old migration configuration as new authority and does not rebind it.

## Manual archive job

Add the accepted `ops/ltc-daily-workflow.yml` bytes to the existing main `.github/workflows/ltc-daily-publication.yml` in a separate reviewed scheduler PR; there is still one scheduler and ten dispatch inputs. Use `acceptance_mode=quarantine-uploads`, `acceptance_source_commit=origin.source`, `acceptance_fence=origin.fence`, `acceptance_crash_after=none`, empty attempt/previous-deployment input fields, `acceptance_probe=false`. Keep `LTC_CLOUD_PUBLISH=false` and every social gate false. The accepted old-public bootstrap manifest is supplied from the existing protected baseline, not reconstructed from the failed partial backup.

CLI:

```
node scripts/cloud-ltc-quarantine-uploads.mjs --review PRIVATE_REVIEW \
  --state-config PRIVATE_WEBSITE --evidence-config PRIVATE_EVIDENCE \
  --previous-manifest PRIVATE_ACCEPTED_BASELINE --receipt NEW_PRIVATE_RECEIPT
```

The implementation guard precedes private config/credential access. The original lease must actually be expired. Before a claim the exact snapshot must remain paused, held and unchanged, with one uncertain Drive-artifact operation and a complete confirmed-prefix/pending-suffix plan, no Git/Vercel operations in that fence, no latestRelease and pending manual first-proof marker. The founder's completed failed origin run/source/workflow identity is freshly checked. A fresh raw known-file404 is still `unknown`, never `not-applied`. Each confirmed part is individually downloaded and verified; missing parts prevent any assertion of full artifact restoration. The same public baseline is verified with current project/pointer/source controls. Unknown-observation freshness is checked again after all reads, before any write.

A one-CAS claim creates a distinct new operator fence while **paused stays true**. It persists one UNCERTAIN archive intent before the sole archive apply call. Review/lease/unchanged-claim checks run again before that call. Lost upload, unknown readback or CAS conflict holds the paused new lease; a subsequent invocation cannot repeat the archive. The operator never masquerades as the expired original run.

On exact private owner-only archive readback, one terminal CAS removes only the failed fence's rows from the active journal. The archive contains the complete original raw ledger and context. Top-level immutable quarantine proof also preserves original row/receipt snapshots: confirmed stays confirmed, uncertain stays uncertain/UNKNOWN/unaccepted, pending stays pending/never-authorized. Existing setup UNKNOWN and staged-retirement proof remain unchanged. A terminal archive intent/receipt snapshot survives later ordinary compaction. No old private files are deleted. Final state is paused with no lease, and routine remains false.

## Independent acceptance and a new first proof

The founder independently downloads the archive and verifies exact bytes/hash, private ownership and parent; compares its original ledger against the preclaim snapshot; verifies all retained historical rows and original UNKNOWN/retirement identities; verifies only the failed active rows were removed and all raw statuses preserved; checks new-fence/sole-archive journal; verifies public/source controls remain accepted. This acceptance is separate from runtime assertions. Only then set protected `LTC_UPLOAD_QUARANTINE_COMPLETION_SHA256` to the actual canonical completion hash.

Rebind only the reviewed current-controller fields of the historical migration configuration to the newly accepted implementation guard, with explicit owner review and protected configuration hash. Keep all original tested/completion guards, public Q3 baseline and UNKNOWN policies intact. Only a founder/manual `activate-cloud` with that configuration and exact quarantine-completion pin can admit a fresh manual first-proof generation. A dropped marker, missing/mismatched pin, changed archive proof or old-lineage reuse blocks admission.

The old generation, package hash and every old operation/file ID are banned. New data must be collected for the current day under a new fence; the old partial edition cannot be resumed. Normal first-proof success must publish/verify current bytes, save the private summary, compact and atomically pause/release its lease. Its proof records `uploadQuarantineCompletionSha256` and must have a fence greater than the archive fence. Full quarantine record is bound throughout admission/provider calls/checkpoint, including inside the final ordinary release CAS.

Conditional routine acceptance is closed by default. If the owner explicitly approved `authorizeConditionalRoutineAcceptance:true`, it additionally requires the exact protected completion pin, matching causally newer first-fresh proof/current latestRelease, actual new summary proof, and fresh current-public/source checks in the existing manual activation job. An older pre-quarantine proof cannot qualify. Independent first-proof verification remains an owner prerequisite; no archive success or configured key alone enables daily publication. Social remains separate and false.

The multipart evidence upload uses a60-second default deadline while reads retain15seconds and explicit fixture overrides remain supported. It still attempts one POST only and fails closed. This is a bounded reliability change, not a claim that timeout caused the observed failure.

Tests are included in existing `pnpm cloud:check`; focused execution: `node --test scripts/test-cloud-ltc-upload-quarantine.mjs scripts/test-cloud-ltc-generation.mjs scripts/test-cloud-ltc-production.mjs scripts/test-cloud-ltc-state.mjs scripts/test-cloud-ltc-activate.mjs scripts/test-cloud-ltc-evidence.mjs scripts/test-cloud-ltc-acceptance-workflow.mjs`.
