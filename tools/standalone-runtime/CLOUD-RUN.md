# Dormant fixed Cloud Run Jobs dispatch transport

This source has no GCP project, region, job, credentials or recipient configured. Synthetic names in tests are not actual account identifiers. No API calls, IAM/resource creation, schedule, OAuth setup, billing action or runtime activation occurred.

`createCloudRunDispatch({fetch,resolveSecret,secretReference,projectId,region,jobId,expectedEtag,dispatchId,journal,loadApproval,clock,networkEnabled:false,dispatchEnabled:false}).advance()` executes at most one authorized dispatch for a canonical dispatch identity. Project/region/job/etag/slot are fixed at independent construction. Only POST to the fixed job's `:run` and GET of the durable returned operation are exposed. Request body is exactly `{etag:expectedEtag}`, with no environment, argument, task-count, timeout or validateOnly overrides. No list/search/create/delete/update/IAM methods exist.

The official direct OAuth access token comes only from an independently approved resolver/secret reference. The API uses cloud-platform scope and appropriate Cloud Run IAM permissions; this adapter does not create or widen either. A broad OAuth token is not narrowed by code; least-privilege runtime identity remains an external deployment prerequisite.

## Durable intent and approval

Identity is `{jobName,expectedEtag,dispatchId}`, SHA256-keyed. The independently authenticated approval must have action run-existing-cloud-job, exact identity, reference, notBefore and expiresAt. A caller must bind the dispatch slot to one canonical schedule event and reviewed job configuration/image. New random dispatchIds on retries would defeat deduplication and are prohibited operationally.

Journal read/cas must be authentic, durable and atomic across workers with independently initialized/migrated canonical history. Exact phases: version0 recordnull, version1 attempting, version2 operation-known. No missing row becomes empty history. Before POST, CAS/readback persists exact intent and approval reference. Unknown response/timeout/CAS outcomes never auto-retry, including restart. A lost operation name requires manual independently reviewed reconciliation, not listing jobs and guessing. This conservatively may hold an intent whose POST never occurred.

Known operation names must match exact project/region and safe operation ID. A resumed dispatch only performs GET, even when original approval has expired. The returned operation is observed, not a successful job claim. A completed Execution response must be the expected official type and exact job/execution path; application/task conditions and downstream publication still need independent verification. Pending metadata is not assumed to establish job identity; its link is the durably recorded originating response. Error messages, raw templates, environment, creator identities and OAuth values are not returned.

HTTP is bounded to15seconds including secret resolution,262KiB UTF8 JSON, exact response URL and200, no redirects or retries. Timeout abort is best effort and never proof no execution started. Etag is sent as documented, but no hard provider-side exactly-once or race-free configuration fence is claimed. Independently verify actual job image/configuration before activation. Provider task retries and Scheduler at-least-once delivery require idempotent work inside the job, beyond this transport.

## Notifications deliberately not implemented

No approved standalone recipient/provider destination has been supplied to this adapter. Notification remains a nonexecuting operational plan: derive bounded status category and canonical event ID, require independently approved destination/content scope and durable notification outbox, then select/review a direct provider. Do not send private artifacts/tokens/job metadata to arbitrary webhooks or reuse personal ChatGPT/connector credentials. Existing Brevo setup may be suitable after fresh authorization/inspection, but no Brevo send or new vendor is assumed here.

## Verification

Eight synthetic tests cover intent-before-effect, pending/done operation identity, read-only expired restart, unknown no-retry, malformed history, wrong job/region, timeout and bounds. No actual cloud/provider requests were made.

`node --test tools/standalone-runtime/test/cloud-run-dispatch.test.mjs`

Official contracts read November17,2026:
- https://cloud.google.com/run/docs/reference/rest/v2/projects.locations.jobs/run
- https://cloud.google.com/run/docs/reference/rest/v2/projects.locations.operations/get
- https://cloud.google.com/run/docs/reference/rest/v2/projects.locations.operations
- https://cloud.google.com/run/docs/reference/rest/v2/projects.locations.jobs.executions

This is not a deployed scheduler or full autonomy. Durable store/approval/configuration binding, cloud account approval, image/job preparation, idempotent job implementation and operational notifications remain external and unactivated.
