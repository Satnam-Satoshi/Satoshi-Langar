# Post-gate observation delivery (inactive review)

This change is not installation, dispatch, or authority to change publication settings.
Native owner approval for the exact retirement run remains mandatory. Evidence does
not authorize anything. The five-minute writer-stop lifetime remains unchanged.

1. Install reviewed code/workflow, finish installation CI, dispatch once.
2. Owner approves the native gate without a local-observation countdown.
3. Existing production timer finishes. Runner checks pinned source and all module
   hashes using only public pins, then enters the named fresh-stop wait step.
4. Coordinator verifies that exact step is in progress for run attempt 1, checks
   the known Mac scheduler/processes and unchanged writer controls, and posts one
   canonical JSON comment on PR153 through the existing GitHub connector.
5. Runner accepts only the API-authenticated owner principal 268053325, an unedited
   comment created after the actual wait step started, and exact run/job/source/
   workflow bindings. Other principals cannot contribute evidence. One matching
   comment only; stale, edited, conflicting, malformed trusted evidence stops.
6. Only then does the next step receive private resource identifiers. Retirement
   rechecks native authority and comment, inspects live state, preserves existing
   paused/CAS/UNKNOWN/receipt controls, and rechecks comment before each mutation.
   Failure revokes the barrier and blocks subsequent writes, including finalization.

## Exact public comment schema

All values are observed pins or restricted aggregates. No raw process output,
Google document/folder IDs, email, credentials, tokens or permission IDs belong
in the comment. Serialize the following object with JSON.stringify, no markdown:

- schema: "ltc-f33-local-stop-v1"
- runId: current run ID as decimal string
- attempt: 1
- jobId: current retirement job ID as decimal string
- workflowSha: exact reviewed installed main commit SHA
- sourceSha: exact reviewed execution source commit SHA
- observedAt: actual post-wait-step observation time, integer epoch milliseconds
- observationSha256: digest of private actual observation evidence
- scheduler: "satnam-satoshi-foundation-and-launch-follow-up"
- schedulerDisabled: true
- publisherProcesses: 0
- otherKnownDirectWriters: 0
- ownerMaintainsStop: true (existing specific owner commitment, not inferred)

## Activation prerequisites / limits

Actual connector comment identity has NOT been verified. Before activation, an
approved non-secret preflight comment must establish API user.id=268053325 and
User type. Any different identity requires review, not a widened allowlist.
There is no new token or permission scope. Public comment reads use unauthenticated
GitHub HTTPS; existing read token only reads native run/jobs/approval. Public API
rate limits, pagination overflow, errors and timeout fail closed. At most 40 waits
at 15-second intervals over ten minutes; inspection revalidation is separate.
Do not post duplicates or edit an accepted attestation. Do not reuse old observations,
restamp evidence, rerun the failed retirement attempt, or repeat receipt mutation.
A post-reservation failure may leave the incident receipt reserved and requires
reconciliation, never automatic retry. Mac presence is only this legacy-writer
retirement preflight, not a long-term daily publishing dependency.

## Public-only wait diagnostics

The diagnostic tests use entirely synthetic run/job/step fixtures. No captured
API payload or live run/job metadata is included. These tests demonstrate validation
behavior and do not establish the cause of any historical live failure.

The reviewed diagnostic patch emits only finite static stage/error enums. It never
prints response bodies, exception text/stacks, URLs, tokens or private config.
Missing/not-started wait-step metadata can receive a bounded native-read-only
readiness grace (3-second polling, at most60seconds) after every native identity,
run, attempt, owner approval and job check passes. No evidence can be accepted
until the exact actual wait-step start timestamp is verified. Invalid metadata,
transport faults, changed authority and step disappearance do not retry. This
readiness grace does not extend the five-minute observation lifetime or the
existing ten-minute attestation wait. It does not authorize a live rerun.
