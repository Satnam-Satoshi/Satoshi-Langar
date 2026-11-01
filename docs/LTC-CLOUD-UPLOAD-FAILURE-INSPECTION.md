# Held first-fresh upload inspection

This finite manual mode observes one uncertain private artifact upload from a held, paused first-fresh release. It cannot change the Doc, reconcile an intent, clear a lease, allocate/upload a file, create Git objects, stage/promote/roll back a deployment, or enable routine publication. It deliberately does not retry uploads. An absent or inaccessible known file and transport failures remain `unknown`.

The founder must review the new source/workflow implementation before changing its protected accepted digest or invoking the mode. Keep `LTC_CLOUD_PUBLISH=false` and social publication false. A changed implementation is not permission to rebind migration or resume the failed run.

Use the existing protected `ltc-production` manual workflow with:

- `acceptance_mode=inspect-upload-failure`
- `acceptance_source_commit`: exact original first-fresh source, which must equal the pinned retirement context's controller source and be an ancestor of the inspection checkout
- `acceptance_id=gha-ORIGIN_RUN-ATTEMPT@ORIGIN_WORKFLOW_SHA`: exact held lease and completed failed run's main workflow commit
- `acceptance_plan_sha256`: canonical `receiptHash(document)` of the entire captured held Doc, preserving stored JSON property order
- `acceptance_fence`: exact held fence
- `acceptance_crash_after=none`, empty `acceptance_previous_deployment`; `acceptance_probe=false`; no bootstrap needed

There are still ten workflow inputs and one existing scheduler. The source PR changes `ops/ltc-daily-workflow.yml` only. For the separate reviewed main workflow PR, copy the exact accepted template bytes to `.github/workflows/ltc-daily-publication.yml`; verify the two files have the same SHA256 after construction. Do not execute a workflow from an unreviewed template or invent a second schedule.

The CLI contract is:

```
node scripts/cloud-ltc-inspect-upload-failure.mjs \
  --state-config PRIVATE_WEBSITE_CONFIG \
  --evidence-config PRIVATE_EVIDENCE_CONFIG \
  --receipt NEW_PRIVATE_RECEIPT
```

It verifies founder/manual/main/production environment, global false, finite mode, exact snapshot/fence/lease/source and a completed failed origin run (including workflow head). The implementation guard runs before reading private config or creating a credentialed runtime. All current operations must be a complete sequential artifact-backup plan: confirmed prefix, exactly one uncertain upload, then only pending uploads. All earlier operations must be terminal.

The existing `inspectPersistedOperations` reads only that uncertain file using the existing Google identity. Confirmed rows are not fetched; pending rows return `not-authorized`. Service transport permits GET only; the existing OAuth refresh endpoint is the sole POST exception. The state adapter exposed to inspection has only `read`. Exact Doc revision and canonical state hash must remain unchanged after inspection; concurrent changes abort the observation.

The private receipt preserves exact operation proof where available. The public job summary contains only fixed diagnostics, status/counts and false mutation flags. No private artifact or ledger is uploaded to GitHub artifacts, and the mode receives no Vercel or Buffer key. `evidence_known_file_not_found` means the runtime's selected-resource metadata GET returned404 after successful folder verification; it is not proof that a previous upload never occurred. `drive_request_unconfirmed` means a response, timeout, or transport could not be verified; it also remains unknown. Exact metadata, ownership, operation tags, downloaded bytes and canonical bundle must all pass to report `applied`, and even that report does not change the durable `uncertain` status.

No automatic follow-up is authorized. The founder reviews the saved result and any independent native readback before proposing a separate recovery action. Held lease, all earlier confirmed effects, pending plan and retained UNKNOWN incident remain intact.

Focused tests:

```
node --test scripts/test-cloud-ltc-inspect-upload-failure.mjs scripts/test-cloud-ltc-reconcile.mjs scripts/test-cloud-ltc-acceptance-workflow.mjs
```
