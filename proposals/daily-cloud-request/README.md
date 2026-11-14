# Daily cloud recovery integration — UNACTIVATED DRAFT

This is tested implementation, not a deployed service. All files remain under `proposals/`; there is no active workflow or scheduler. It changes no current permissions, gates, source pins or production ledger. Run `node --test proposals/daily-cloud-request/*.test.mjs`.

## Implemented
- Strict numeric-owner identity and exact refreshed/unmodified issue. Current Eastern date, ten-minute maximum request expiry, one-minute evidence freshness, fixed request schema.
- Fixed GitHub repository issue/source reads, complete bounded pagination across all five documented active statuses. Unknown, truncated or changing listings fail closed.
- Exact provider-confirmed dispatcher self-run exclusion: run ID, attempt, repository, path, event, actor, main branch and workflow SHA must match trusted environment.
- Authoritative ledger mapping through existing DurableCloudState validation and daily checkpoint proof verifier. Pauses, restore holds, retained leases, unknown/pending intents and completed dates block dispatch.
- Dedicated provisioned private CAS request ledger. Publication ledger is always read-only. Claims cannot be stolen, expired, deleted or retried here. Successful claim/receipt writes require explicit revision and matching provider readback.
- Fixed ordinary daily POST, never acceptance/recovery/bootstrap/software controls. Exact current target workflow content hash verified immediately before POST. Expiry/date/freshness rechecked after verification.
- Revalidation of issue, source, runs and ledger before claim. One POST; ambiguous transport/receipt results retain the claim.
- Runtime composition binds existing Google owner-only/private resource checks to exact distinct documents. Request-state writes default off.
- `entrypoint.mjs` and `workflow.yml.example` show concrete integration: trusted main controller, immutable runtime checkout `484c239c8d6eb48aeee37212fc85307a0f908195`, verified HEAD and clean tree, actual reviewed runtime imports, explicit `LTC_DAILY_REQUEST_ENABLED` flag. The template is NOT installed in `.github/workflows`.

## Request after approved activation
Title: `[LTC cloud request] daily publication`
Body must contain only JSON with `date` (current America/New_York date), `expires_at` (canonical UTC, at most ten minutes after issue creation), and `source_commit` (current accepted branch SHA).

Source SHA is an admission-time freshness check, NOT an execution pin. This request deliberately means the same ordinary daily operation as the existing schedule: downstream may resolve a newer accepted routine-data head, but must retain its exact implementation digest guard, fresh-date admission, durable lease/CAS and journal. No new bypass of source validation is proposed. Source/issue changes observed before claim withhold dispatch. Revocation after accepted dispatch cannot retract an already queued operation; do not claim atomicity across GitHub/Google.

## Required activation steps, not performed
1. Independently approve the exact full integration and narrow Actions-write entrypoint. Underlying ephemeral token scope is repository-wide even though code allows one workflow and fixed inputs only. No PAT/App key is required.
2. Provision a separate owner-only private Google Doc in the already selected private folder, containing the request-state envelope for `daily-dispatch-requests` with `{schemaVersion:1,requests:{}}`. Bind its exact document ID as `LTC_DAILY_REQUEST_DOCUMENT_ID`. Never use the publication ledger for claims. Existing provider runtime checks ownership, permissions, parent and revisions.
3. Review and install template on trusted main only as `.github/workflows/ltc-daily-cloud-request.yml`; configure activation gate both where job admission and protected environment resolve it. Do not merge proposals into the accepted daily source branch.
4. Verify current target workflow hash and immutable runtime pin still match reviewed versions. Changes fail closed and require review; do not silently update hashes.
5. Prove connector issue sender is the owner, not a bot. Test trusted-context self-exclusion and read-only provider access with writes disabled first.
6. In a controlled window with no active/held release, exercise one authorized invocation and verify durable request receipt, downstream run, publication ledger, dated edition and both homepage links. Prove a second request cannot republish.
7. Observe next scheduled run without Mac. Root can add an independent read-only watchdog; a second scheduler must not become another publisher.

## Remaining caveats
Sequential GitHub status reads are not atomic. Main/source/issue can change after checks. Existing downstream durable admission remains the final authority, not this preflight. Workflow hash verification has a small check-to-dispatch race against trusted main administrators; operational main-change coordination remains required. No live OAuth/Google storage, connector-to-issue identity or GitHub dispatch integration has been exercised. No resource was provisioned and no activation approval obtained. Therefore Mac-independent recovery is NOT yet verified.

Request claims are retained after uncertainty or expiry. Finite reconciled maintenance is required before any retry; never clear them automatically. Capacity limit is 366 date claims and fails closed when full. No maintenance path is included.

## Verification
80 focused tests pass, including mocked end-to-end owner/source/runs -> authoritative ledger mapping -> CAS claim -> fixed POST -> receipt -> duplicate denial, revocation/source changes, expiry/midnight crossing, corrupt checkpoints, unknown intents, ambiguous CAS acknowledgements, readback mismatch, transport timeout and receipt failure. Prior independent reviews corrected expiry, forged-admission, calendar and CAS-acknowledgement defects. Tests are offline mocks, not live publication proof.

API reference: https://docs.github.com/en/rest/actions/workflow-runs (active statuses, pagination and filtered 1,000-result cap). PR137 remains a separate credential-free software-plan proposal.
