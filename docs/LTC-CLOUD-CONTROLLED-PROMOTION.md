# Reviewed promotion, rollback and website activation

This is an inactive review proposal. It does not establish production acceptance or authorize a remote action. Social publication is separate and unchanged. The retired setup incident stays `UNKNOWN`, unaccepted and immutable; the old unconditional incident rejection helper is unchanged.

## Required owner reviews

1. Review this source/controller and the scheduler-only update of the **existing** main workflow. Compute and independently approve the implementation digest after any website or social code is combined. The historical tested artifact/controller and the newly approved controller are distinct pins: changing the controller does not rewrite historical evidence.
2. Pin the actual completed stage ledger with `validateStageAcceptanceReceipt`: original plan/completion hashes, original source/implementation, completing controller/run/attempt, candidate and previous deployment, fence, exact project/team/domains/private resources and retained incident hash. A stage receipt alone never authorizes publication.
3. Explicitly approve one controlled promotion/rollback review. This temporarily exposes the staged candidate through **all project production aliases**, including both reviewed domains. It mandates rollback to the exact previous accepted deployment, even if the confirmed candidate has incorrect public bytes. No new deployment is created by this exercise. The existing project token must support the narrowly scoped official promotion/rollback endpoints; denial remains an uncertain held operation, never a reason to expand credentials automatically.
4. After real full public verification and rollback, independently pin the durable completion and separately approve daily website publication, retention of the UNKNOWN incident, and the actual local-writer cutover evidence. No policy or receipt pin is derived automatically from an unreviewed runtime result.
5. Approve the protected manual `activate-cloud` action and the existing publication switch. It verifies the accepted public baseline and source controls, then performs one revision CAS to unpause website admission. It creates no deployment and does not activate social publication. A first bounded daily run still requires review of its real source/ref and deployment outcomes.

No owner approvals or protected configuration have been applied by this proposal.

## Protected configuration

The controlled review JSON is supplied only to the manual effect step as `LTC_CONTROLLED_PROMOTION_REVIEW_JSON`, with separately approved canonical SHA256 in `LTC_CONTROLLED_PROMOTION_REVIEW_SHA256`. Its exact shape is validated by `validateControlledPromotionReview` in `scripts/cloud-ltc-promotion-acceptance.mjs`: founder actor `268053325`, kind `founder-approved-controlled-promotion-rollback`, exact current implementation, `stagePins`, `allProjectProductionAliasesApproved`, `temporaryPublicExposureApproved`, `rollbackRequired`, and `productionAuthorized:false`. `retainedIncident` explicitly permits only this exercise and retains the UNKNOWN outcome. `action` is `exercise`; a pending, never-authorized rollback requires a new `complete-rollback-only` review bound to `baseReviewSha256`.

After the proof, `LTC_MIGRATION_ACCEPTANCE_JSON` and independently approved `LTC_MIGRATION_ACCEPTANCE_SHA256` bind the stage pins, controlled review/completion pins, and a separate founder `ownerDecision`. The strict schema is implemented in `cloud-ltc-migration-gate.mjs`; tests show all required pins. The decision requires exact scope, current controller, `authorizeDailyPublication:true`, `singleWriterCutoverVerified:true`, and a SHA256 of actual cutover evidence. With the retained incident it additionally requires kind `founder-approved-daily-publication-with-retained-setup-incident`, the exact incident pin, `originalOutcome:'UNKNOWN'`, `accepted:false`, and `retainIncident:true`. Missing, modified, unresolved, or unapproved proof remains closed.

Configuration JSON hashes use SHA256 of `JSON.stringify(parsedValue)`; they are not raw-file whitespace hashes. Configuration and private receipts are never GitHub artifacts or public logs.

## Runnable protected manual modes

`ops/ltc-daily-workflow.yml` is a template for updating the existing main workflow, not an additional scheduler. It retains ten dispatch inputs, the existing concurrency group, founder/main/manual admission and trusted inline implementation check before checked-out code or credentials. These new modes do not collect sources or build a new artifact:

- `promotion-proof`: publication switch must remain `false`; runs `cloud-ltc-controlled-promotion.mjs --mode exercise` with the protected review and existing website/social/evidence configuration.
- `promotion-reconcile`: switch `false`; exact original controlled fence required. Uses fresh independent provider readback, never mutation or replay.
- `promotion-rollback`: switch `false`; separately approved `complete-rollback-only` review and exact original controlled fence. Only a persisted pending rollback following confirmed promotion can run once. Any uncertain rollback must reconcile instead.
- `activate-cloud`: switch must be explicitly approved `true`; runs `cloud-ltc-activate.mjs` with independently pinned migration configuration. No publication occurs in this action.

Existing `acceptance_source_commit` remains an exact reviewed historical source input; artifact source may differ from the current approved recovery/controller source. `acceptance_crash_after` must be `none` for all four new modes. The original stage/recover/quarantine modes and their guards remain available.

## Effect and recovery boundaries

Before admission, the controller checks actual completed origin/completing GitHub attempts, exact fixed project policy and name, no project crons/rolling release, paused social state, both previous public pointers, restored full artifact hashes, full protected candidate bytes and full previous public bytes. It then persists the original stage snapshot, owner review and both exact promotion/rollback payloads before effects.

Each effect uses the existing durable coordinator and provider readback. Promotion and rollback use the official project-scoped REST endpoints used by pinned CLI65.9, because that CLI's promote/rollback owner-discovery path requires unavailable user/team reads. Only exact candidate promotion and previous rollback targets are admitted; no generic API transport is exposed. Routine deploy remains pinned CLI65.9 with environment-only token and a verified named project link; protected reads use only the existing automation bypass, never create one.

A failed or lost effect response is held uncertain. A separate job must prove the exact original attempt completed before readback. Absence of a deployment or pointer is not proof an effect never occurred. Reconciliation can confirm fresh known outcomes but never resends a mutation. Confirmed promotion with pending rollback returns `manual-rollback-required`; only a new explicit review permits that first rollback authorization. A new recovery controller requires its own protected digest and base-review binding, while original plan/source/fence remain pinned.

Completion is durably recorded with original/completing runs, controller, manifest hashes, both terminal effect/receipt snapshots and full byte verification. The ledger is repaused and lease retired in the same CAS only after terminal outcomes and restored public bytes. Bad candidate bytes produce a rollback-restored **unaccepted** result. No automatic retry clears uncertainty or blesses the old incident.

## Bootstrap and remaining proof

The historical public source can remain older than the current reviewed source. Before the first real daily publication, continue supplying the already reviewed bootstrap previous public manifest via the existing protected mechanism; do not synthesize `latestRelease` from the staged candidate. Later runs load the actual durable release summary. Stage proof, restored package, previous manifest and current controller are bound separately to avoid a self-digest approval loop.

Still required live: reviewed controlled promotion/public verification/rollback/public verification; independent receipt and policy pins; actual single-writer cutover evidence; protected manual activation; the first real bounded daily source-ref/deployment/summary verification. Social migration/private draft acceptance and daily cutover remain a separate review. Existing credentials, private storage and project are reused; no new scopes, services, resources or credentials are proposed here.

## Finite social review modes

The template also exposes `social-inspect`, `social-bootstrap`, `social-private-draft`, and `social-reconcile-private-draft` through that same manual job, pending the separately reviewed social source PR. All require website publication switch `false` and explicitly closed social switches. Only these modes receive the Buffer key and compressed setup bundle. The proposed encrypted `LTC_SOCIAL_SETUP_BUNDLE_GZIP_BASE64` contains three exact strings: `policyJson`, `canonicalLedgerJson`, and `historicalCopyEvidenceJson`; decompression is bounded to1.8MB and each string to600KB. The policy's exact raw bytes are independently pinned by `LTC_SOCIAL_ACCEPTANCE_POLICY_SHA256`. Bootstrap alone receives the canonical100 and historical-copy paths. The finite CLI checks the current approved implementation before private reads and performs no scheduling, editing, deletion, or daily unpause. These names and any actual secret provisioning require a separate owner review; no values have been configured here. Social code remains in its separate source proposal and must land before invoking these template modes.

## Routine crash recovery remains incomplete

The ordinary daily-run `cloud-ltc-reconcile.mjs` now uses the supported linked65 protected-read transport, but remains read-only: it emits fresh applied/unknown proofs and never terminalizes intents, steals a lease, or resumes a publication. In particular, a crash after ordinary promotion but before final private summary/latestRelease completion stops later daily admission even when fresh provider evidence shows the mutation applied. A separately reviewed routine recovery/continuation path is still needed before claiming unattended crash recovery. The controlled promotion exercise's explicit reconciliation and bounded rollback continuation do not authorize ordinary daily replay or substitute for that work.

## Portable deployment attribution requires owner review

Routine deployment now uses an exclusive gitless sibling workspace containing only exact verified `.vercel/output` bytes, the reviewed `vercel.json`, and the fixed named `.vercel/project.json`. It contains no source checkout, `.git`, dependencies or private credential files. Exact complete workspace inventory, source and copied output hashes, config bytes, symlinks and Git ancestors are checked before effects; extra files or drift stop deployment. Source implementation, approved branch/head, owner policy and durable intent checks still run separately against the original source checkout before each mutation. Explicit durable CLI metadata binds the actual generated source commit, operation/payload and Build Output hashes.

This attribution change requires owner review: Vercel receives a portable artifact with explicit reviewed provenance instead of CLI-auto-detected Git authorship. It does not change Git authors/identities, token scope, project permissions, or deployment protection, and does not retry a blocked deployment. The actual protected acceptance artifact was already deployed from a gitless restored workspace; routine use of this path still needs its own approved first daily proof.
