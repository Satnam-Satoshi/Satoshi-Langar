# Bounded cloud stage acceptance

Owner: Satnam Satoshi. Mission: prove private backup, fresh restore, crash recovery and protected Vercel staging of an **explicitly reviewed source/build recipe**, while the existing public artifact stays unchanged. Permissions: the existing selected private Drive folder/website ledger and existing Vercel project only. Knowledge: the reviewed source, exact artifact manifests, live private resource metadata, both public pointers and independent provider readback. Audit memory: private plan/receipt, durable website intents and private artifact objects. Emergency stop: retain the fence and uncertainty; keep both routine gates closed. No Git write, Buffer write, alias change, promotion, rollback, scheduler activation or credential provisioning is implemented by this harness.

`scripts/cloud-ltc-acceptance.mjs` is a separate finite acceptance program. It does not call the gated production runner or replace either unconditional migration/social gate. A successful result means **stage acceptance**, not approval of full publication or social cutover. No live acceptance has been performed by these offline tests.

## Review packet and preparation

Use a clean checkout of the exact reviewed source commit. Build that committed content into `dist` and `.vercel/output` without running fresh collectors or modifying edition data. The candidate can differ from the old public artifact (including generated build IDs); its bytes are separately bound and checked on the protected candidate. Provide the reviewed **previous public manifest** as a separate array of `{file,sha256}` records. The harness checks that old baseline publicly before/after acceptance and archives it for recovery. The existing dry-run runner retains its scratch/source/evidence paths, but its fresh data changes can make that checkout unsuitable: this harness deliberately rejects dirty source. Provide an existing private evidence directory containing the reviewed build/provenance receipt. It is archived in full; keep credentials outside all selected artifact roots.

The three explicit private JSON configurations are the existing website state config, social state config (`ledgerKey: "social"`) and evidence config (`folderId`, `ownerPermissionId`). Existing Google runtime validation still requires `publicationEnabled: false`. These configs contain selected IDs, not tokens. No IDs are guessed. The website and social Docs must differ and share the exact selected folder.

Offline preparation (no network/state effects):

```sh
node scripts/cloud-ltc-acceptance.mjs --mode plan \
  --root /private/accepted-source --evidence-dir /private/build-evidence \
  --state-config /private/website.json --social-state-config /private/social.json \
  --evidence-config /private/evidence.json --edition-id YYYY-MM-DD-rN \
  --acceptance-id current-artifact-stage-1 \
  --previous-manifest /private/previous-public-manifest.json \
  --previous-deployment dpl_ACCEPTED --receipt /private/new-plan.json
```

Provide `LTC_ACCEPTED_IMPLEMENTATION_SHA256` for the checkout. The command exclusively creates a mode-0600 plan and prints its canonical `planSha256`. The plan binds the explicit acceptance ID, implementation/source, complete tracked source manifest, candidate static manifest, previous public manifest, complete Build Output, complete artifact package, executable paths, edition, exact previous deployment, two domains, project/team and private resource IDs. Pin the **canonical hash printed by the command**, not the SHA256 of the pretty-printed file. The owner can approve the exact source, protected implementation digest, build recipe and stage-only scope before dispatch; the trusted job can then generate and pin the resulting artifact plan in that same run. The generated hash supplies TOCTOU binding, not self-approval of implementation or production. No additional approval service or plan secret is required. Admission atomically saves the full original plan in the existing website ledger for recovery. A subsequent approved attempt against the same bytes requires a new explicit acceptance ID and scope review; this is never an automatic retry.

## Protected manual stage job

The trusted main workflow must check the implementation digest **before executing checkout code**, use protected environment `ltc-production`, and explicitly set:

```text
LTC_ACCEPTANCE_ENVIRONMENT=ltc-production
LTC_ACCEPTANCE_MANUAL=true
LTC_CLOUD_PUBLISH=false
LTC_ACCEPTANCE_PLAN_SHA256=<reviewed canonical hash>
LTC_ACCEPTANCE_SOURCE_COMMIT=<explicitly reviewed source commit>
LTC_ACCEPTED_IMPLEMENTATION_SHA256=<reviewed implementation digest>
LTC_VERCEL_CLI_VERSION=<reviewed installed CLI version>
```

The program also requires actual Actions/main/workflow_dispatch/repository/run context. The environment-name variable is a consistency check; **GitHub's protected job configuration supplies the security boundary**, not that self-reported string. Supply only the approved Google refresh credentials, Vercel project token and GitHub read credential; Buffer credentials are unnecessary. Pin/install the CLI through trusted workflow setup. Never publish the raw private plan, receipt, ledger, restored tree or provider responses as public logs/artifacts.

```sh
node scripts/cloud-ltc-acceptance.mjs --mode stage \
  --root /private/accepted-source --evidence-dir /private/build-evidence \
  --previous-manifest /private/previous-public-manifest.json \
  --plan /private/reviewed-plan.json --state-config /private/website.json \
  --social-state-config /private/social.json --evidence-config /private/evidence.json \
  --receipt /private/new-stage-receipt.json
```

Admission requires the website ledger initialized, paused, no restore hold, no lease/unresolved intents, and no prior acceptance with this plan. The social ledger must remain initialized/paused with no lease or uncertain post. Both current domain deployments must equal the plan's accepted deployment; the reviewed native Git suppression policy must still hold. Every byte of the previous public baseline, including root routing, must match before admission. Pointer/policy checks run before individual effects; the full public baseline is checked once before admission and once after staging.

Acceptance uses a narrowly scoped **atomic CAS** to unpause the website ledger and acquire its fenced acceptance lease together. This avoids a killed-process gap between unpause and acquire. Operational intent/uncertainty/receipt transitions use the existing `DurableCloudState`/`ReleaseOperationCoordinator`. The harness allocates opaque Drive IDs, persists **every** upload payload and the planned stage intent before any upload, then uploads with owner-only metadata/download verification. It separately downloads all bundles, reconstructs an exclusive fresh directory, verifies source/static/Build Output hashes and restores reviewed executable permissions. Deployment uses this restored `.vercel/output`, not the original build tree; only a new project identity file is added locally.

The existing provider performs tagged `deploy --prebuilt --prod --skip-domain`. It discovers exactly one deployment, validates project/team/source/Build Output metadata, and verifies all protected static bytes with binary-safe CLI reads. The harness checks both public pointers and all public bytes again. An atomic terminal-only CAS releases the lease, re-pauses and persists `acceptance.status: "completed"` with a bounded completion receipt together. That receipt records `stage-verified` or `incomplete-no-resume`, exact plan/source/implementation/fence, original Actions run/attempt, completing run/attempt/mode, verification flags and bound manifest hashes, and a digest of all current-fence terminal proof/receipt hashes. Its own SHA256 is retained alongside it. It contains no raw artifact or credential. A lost local final receipt therefore does not lose the successful recovery run's identity or acceptance outcome. Function files/config are fully backed up; this does not execute every dynamic route.

## Deliberate termination and separate recovery

For a reviewed crash exercise, append **one** of:

```text
--crash-after first-effect
--crash-after accept-<first 24 characters of canonical plan hash>-stage
```

The CLI sends **SIGKILL to its own process after the actual provider effect returns and before coordinator confirmation**. There is no cleanup/retry. The website lease/uncertainty survives; the private receipt records scratch/lease before effects. A normal upload timeout also remains uncertain. The root workflow must let the originating workflow run finish/cancel before recovery.

In a different protected manual workflow run, supply the original plan SHA/source, the **current approved controller implementation digest**, the existing configs and exact durable fence. Stage admission still requires its controller digest equal the original plan digest. Recovery can use a subsequently reviewed controller fix: the CLI first calls `verifyImplementation(process.cwd(), LTC_ACCEPTED_IMPLEMENTATION_SHA256)` before reading any private config/ledger, and the trusted workflow inline guard remains required before executing code. The original plan's implementation digest remains immutable and separately bound by the original plan SHA/source. Omit `--plan` to load the original plan from the held ledger; an explicit matching original plan file remains supported:

```sh
node scripts/cloud-ltc-acceptance.mjs --mode recover \
  --state-config /private/website.json \
  --social-state-config /private/social.json --evidence-config /private/evidence.json \
  --expected-fence N --receipt /private/new-recovery-receipt.json
```

Recovery needs no original checkout, artifact directory or local receipt. Its exact GitHub GET `/actions/runs/{id}/attempts/{attempt}` must prove the original attempt is completed, from main/manual dispatch and the existing `.github/workflows/ltc-daily-publication.yml`; a running origin or changed fence is rejected. It never uses the base run endpoint, whose latest attempt changes after a rerun. Only current-fence, exact-plan evidence/stage intents are admitted. Recovery pauses the held ledger, obtains **fresh** private download/provider proofs, reconstructs the archived artifacts, and confirms known outcomes through the coordinator. It never calls any provider `apply`, uploads, deploys, promotes or resumes remaining steps. Pending intents whose effect authorization was never granted become terminal `not-applied`. Unknown/404/incomplete/tampered results retain the paused fence and receive no completion receipt. Release occurs only when all intents are terminal. Incomplete recovery explicitly records which full-restore/public-baseline/protected-stage checks were not established; it never labels an abandoned stage as successful. Durable completion records both original `implementationSha256` and current `controllerImplementationSha256`, retaining the original plan/source/fence and both run identities.

A crash after the first upload usually returns `incomplete-no-resume`, since the stage was never authorized. A crash after stage can return `stage-verified` after fresh protected verification. An interrupted attempt cannot be silently repeated with the same plan. Review the terminal result before preparing another plan/acceptance scope. Successful same-plan repetition is deliberately rejected; there is no automatic lease stealing or retry.

## Scope still withheld

This first harness does not promote or roll back either domain, prove routine Git ref writes, record a production `latestRelease`, compact its acceptance records, migrate social reservations, schedule posts or activate recurring publication. Acceptance records are bounded by the evidence bundle limit; repeated future harness runs need explicit archival policy. A successful stage/crash proof is input to a subsequent small reviewed promotion/rollback acceptance and final receipt-validator/cutover change. It is never permission to delete the unconditional guards.

Run offline tests with:

```sh
node --test scripts/test-cloud-ltc-acceptance.mjs
```

Tests exercise real packaging/restoration and binary hashes with fake remote transport, concurrent CAS admission, lost upload/stage confirmations, recovery after deleting original source, unknown holds, wrong fence/active origin, corrupt evidence, and an actual SIGKILL subprocess with a filesystem-backed test ledger. They are not live Google/Vercel acceptance receipts.

The first live stage attempt (41154821171) stopped before admission: the checker rejected the existing legacy birthday URL's configured 308 redirect. The private website ledger remained paused at fence 0 with no lease, intents or receipts. A separate public audit verified all 596 accepted entries per domain using the explicit existing redirect targets. This failed attempt is not staging or recovery acceptance. The revised checker verifies exact configured redirects and their canonical destination hashes; arbitrary redirects remain errors.

The second real attempt (41156005521) confirmed all 36 private backup parts and passed full restoration, then its deployment call became uncertain. Recovery (41157291809) retained paused fence 1; the planned SIGKILL was not reached and no stage/recovery acceptance is claimed. A subsequent read-only probe found project access HTTP 200, legacy user lookup 404 and team lookup 403 with the project-only credential.

The reviewed 65.9.0 acceptance client uses a verified project link without explicit global scope. Protected reads use the supported full-URL/environment path with the project's existing automation bypass held only in the child environment. It creates no credential and changes no protection setting. A recovery preflight verifies three existing accepted records before reconciling the uncertain stage; that read proof is explicitly not stage acceptance and cannot clear an unknown outcome.
