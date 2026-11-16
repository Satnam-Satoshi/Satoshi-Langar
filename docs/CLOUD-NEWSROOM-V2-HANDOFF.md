# Canonical daily handoff (not production activation)

The existing LTC Daily Magazine remains the single producer. Keep its existing 09:00 America/New_York schedule, Drive destination and single daily email. Do not start a second publication or sender.

## Proposed producer instruction addition

Use cloud execution and connected services only; do not depend on a mounted Mac, its local source, session, tokens or generated files. Fetch the independently approved remote source commit. If a cloud environment or a required connection is unavailable, report that specific hold rather than falling back to the Mac or claiming autonomy.

Create one canonical daily edition bundle containing the same final PDF, responsive HTML, cover and promotional image used by the magazine workflow. Save its manifest and immutable revision artifacts in the existing approved Drive folder. The new handoff protocol does not create a second editorial producer. Keep original revisions and source-effective dates.

Emit the v2 manifest described by `scripts/cloud-newsroom-v2-manifest.mjs` and the executable fixture in `scripts/test-cloud-newsroom-v2-ingest.mjs`. Include bounded plain-text `presentation.title` and `presentation.dek`. Artifact paths are relative `artifacts/YYYY-MM-DD/rN/filename`; include actual SHA256, byte length, MIME type and edition identity for all four roles. Include PDF page count. Use PNG for the cover when possible so ingestion can verify dimensions without an additional image-decoding dependency.

Record original publication, event, effective and retrieval times separately. Unknown dates and unavailable values stay null, with explicit gaps. Venue quote observations must be no older than two hours; current-value ingestion is conservative and may require fresher data. Preserve historical labels rather than redating an old observation. A newly fetched page is not necessarily new news. If there is no verified material development, set `hasMaterialChange:false` and hold new website publication instead of inventing novelty. Continue the existing magazine delivery instructions honestly, without a duplicate email.

The trusted coordinator supplies the expected producer identity, prior daily inventory, current clock, independently approved code pin and isolated canonical bundle root. Never let the incoming bundle choose its own authority or prior inventory. Run `ingestCloudNewsroomV2Bundle`; an accepted receipt verifies supplied bytes and schema, not research truth, author identity, rendering quality or permission to publish.

Project a successfully verified receipt into a new immutable public registry entry using the reviewed receipt helper. Same edition/revision with different bytes is a conflict; a correction requires explicit approval and a new revision. Never overwrite a historical PDF, cover, route or source record. Future daily changes must be typed registry data and reviewed artifact paths, not application code, scripts, workflows, security settings or historical content.

## Release sequence, only after separately approved activation

1. Verify current production on both domains and the current new-v2 ledger state. The historical ledger stays untouched.
2. Validate append-only registry/data diff against an independently pinned reviewed source tree and actual ingest receipt. Reject unlisted paths, deletions, symlinks, executable modes and code/config changes.
3. Claim the new-v2 ledger with conditional storage write, binding NY issue date, revision, artifact digest, source commit, owner and expiry. An existing completed same artifact is a no-op; uncertain intent requires readback, not blind retry.
4. Create a preview through the existing Vercel connection with the explicit canonical repository ID and immutable candidate commit. Do not rely on the project's older linked repository or override admission/protection.
5. Wait for READY. Verify source attribution, all-route/link checks, protected critical pages, exact artifacts and runtime freshness/gaps. Bind the QA receipt to the deployment and source identities.
6. Record promotion intent before effect. Only within separately approved production scope, promote that exact deployment. Read back both custom domains and artifacts. On uncertainty or external drift, hold and reconcile without another mutation or automatic rollback.
7. Record final receipt and report actual public outcome. Email delivery remains the existing single producer's independently deduplicated action; website success is not evidence of email receipt.

## Trust boundary and remaining gates

The in-repository guard cannot prevent a repository writer from editing the guard, or an account owner from manually promoting another deployment. A GitHub CAS lease coordinates participating writers; it is not a provider-enforced Vercel fence. The connected account's owner authority remains a break-glass exception. Describe this as conditional single-writer operation, not guaranteed exclusion.

The historical single-source exception expires November 17, 2026 at 00:00 UTC. The later approved cooperative bootstrap used one exact-source 15-minute grant and was closed after its sole preview became READY. Neither authorizes recurring changed-source admission or production promotion. The data-only admission evaluator remains a review component; no recurring publisher has been activated.

Automation update currently exposes prompt/schedule changes but no environment-selection input. A cloud-only prompt is an instruction, not proof that an inherited environment was changed. Verify an actual scheduled run's cloud provenance before declaring independence from the Mac. No new Vercel credential or upgrade is needed for the connector path already tested.

## Phased whole-site scope

This first integration is a foundation, not completion of whole-site daily publishing.

- **Phase 1: canonical edition and immutable history.** Activate the single daily bundle, shared latest-issue navigation/cards, archive and feeds only after a cloud-only end-to-end run and approved promotion. Live APIs already have explicit freshness/gap semantics. Do not claim every desk was researched anew.
- **Phase 2: source-checked page modules.** Add typed daily inputs for Explore news, market/chain pulse, verified funds/treasuries, builders/testnet status and institutional experiments. Each module needs pinned primary-source parsers or reviewed extracted evidence, effective/retrieved dates, status thresholds, source hashes and explicit unavailable/unchanged states. Maintain a route-to-module coverage matrix so every current surface is accounted for. Historical guides retain original research dates; a recheck date is separate.
- **Phase 3: approved visual variation.** Implement and test a finite set of typography/layout/illustration/chart variants within the existing orange design system. Select variants deterministically from the accepted edition manifest, not arbitrary model-authored TSX/CSS. Test chart scales, units, zero/missing distinctions, accessible alternatives, reduced motion, mobile layout and cross-page reading flow. A refreshed appearance must never imply refreshed evidence.
- **Phase 4: highlights and specials.** Add source-verified new revisions for Moon and other highlighted editions only when developments warrant them; keep originals immutable. Connect reviewed promotional art to the same canonical facts/artifacts. External campaigns remain separately authorized and deduplicated.

Each phase requires explicit implemented paths, actual cloud tests, source/visual coverage evidence and verified public readback. A source scan, draft schema, simulated lease or preview build alone does not prove daily publication or full-site coverage.

## Required source policy and observed evidence (audit hardening)

The coordinator supplies `trustedSourcePolicies` and `trustedEvidence` separately from the incoming bundle. Their key is `JSON.stringify([source.id, source.url, source.metricKind])`. A policy includes classification, publisherId, parserId/version and maximum retrieval/effective age. Hard ceilings are two hours for venue quotes, fifteen minutes for Morpho, twenty minutes for chain state and twenty-four hours for current primary observations. The bundle cannot choose a looser cap or relabel a current metric historical without an explicit trusted historical policy.

Each source retains metricKind, publisherId, parserId/version, snapshotSha256 and `evidence:{path,sha256,retrievedAt}`. Trusted evidence includes these identities plus `bytesObserved:true`, sourceId and exact URL. Create that observation only by actually reading/hashing the captured source bytes, not by copying the producer's claims. Unknown source/URL/metric/publisher/parser or mismatched hashes hold publication. Host allowlisting alone never establishes primary-source authenticity.

The bounded scanner now retains raw source bytes in its new temporary evidence directory, including bounded PDF downloads with PDF magic validation. It still marks them uninterpreted and requiring extraction. Its retrieval expiry is not the source's effective date. Raw evidence must be explicitly retained privately by the canonical producer; the GitHub availability-proof job uploads metadata only, so a temporary path is not a durable evidence archive. PDF extraction and editorial interpretation must happen before a verified-source claim.

## Inert reader and cooperative gate

HTML is an explicitly restricted inert input profile, not arbitrary browser content or a general sanitizer. Active content, CSS, images/resource-fetch tags, foreign namespaces, unfamiliar syntax and unreviewed links hold for review. The original illustrated PDF/cover are retained. A reviewed React renderer supplies the editorial theme for accepted inert body nodes; it does not inject incoming CSS or executable markup. Plain-text deception/prompt injection still requires source-aware editorial review.

The locally tested cooperative preview gate reads one new-v2 CAS state document from a fixed repository branch. Its exact candidate commit/tree/project and <=15-minute grant must match the current lease owner/fence. Public state admits only a preview build. The saved private automation's reviewed code pin and the coordinator's independent checks remain authoritative for production promotion. This is not malicious-repository-writer protection or provider fencing. The optional signature verifier remains disabled with no key configured; no new signer service or key is needed for cooperative mode.

The composed gate was installed on the nonproduction source branch for the approved November 16 bootstrap. A separate state branch was created for one preview; its grant is now closed and all enable/publication flags are false. No recurring production workflow was activated.

Verified observations use `evidence.kind:"snapshot"` and coordinator-observed raw bytes. Verified historical observations require both manifest and trusted policy `maxEffectiveAgeSeconds:null`, an explicit historical classification/label, and fresh retrieval. Unavailable sources instead use `evidence.kind:"fetch-attempt"`, a bound attemptId/retrievedAt/outcome and externally observed attempted:true. Their snapshotSha256, value, effectiveAt and effective-age limit are null; claimVerified is false. A failed fetch must not invent a source digest.

The `cloud-newsroom-v2-vercel-ignore.mjs` composition is installed in the approved nonproduction bootstrap candidate. It does not authorize production builds or promotion. Existing 4-artifact daily scope does not yet admit one promotional image per story; a bounded independently validated marketing-asset manifest/public-hosting extension remains necessary before claiming full automatic story campaigns.


## Runtime implementation and activation boundary (November 16)

`cloud-newsroom-v2-coordinator.mjs` is an executable state machine, not a scheduler. The existing-connector adapter fixes the canonical repository, project, source branch, separate state branch and both domains. Mutations and promotion each default off. Actual read-only connector calls recognized the validated preview and unchanged live domains; the new state document now records the bounded preview bootstrap with all admission closed. Independent managed-cloud checks of commit `3e91c09d92d9654e37bf37cb8b05933aad4bb653` passed 157 JavaScript checks, 23 renderer checks and 16 synthetic producer/ingestion checks. Side effects in coordinator tests were mocked. This does not prove autonomous publication.

Activation must not manufacture a duplicate daily edition to test infrastructure. First review and approve the exact infrastructure source and guard-composition diff, initialize only the new state branch with production disabled, and build a separately labelled bootstrap preview. Preserve both historical guard files. Review exact source attribution and real HTTP/artifact bytes before separately authorizing infrastructure promotion. Then test the next genuine edition through the complete coordinator. A bootstrap grant is not editorial admission and must never be recorded as a completed daily publication.

The canonical automation's private reviewed code pin, independently observed source evidence and actual-file ingestion receipt supply authority to the coordinator. Public repository state alone cannot authorize itself. Keep raw evidence and operational receipts private; public state must contain no credentials, private extraction or access links. An expiry or missing dependency is a hold, not permission to widen a predicate.

Do not describe the existing 09:00 producer as healthy merely because its schedule is enabled: recent observed runs returned `no_update`, and the cause has not been established. Preserve the existing schedule and email deduplication until the new handoff is actually verified. Do not start a second producer or email sender to hide a failed handoff.

The imported `tools/cloud-marketing` renderer is a private preparation tool with synthetic fixtures. It has no network, scheduler or posting client and always emits `publishAllowed:false`. Its legacy-public-readback input is not a daily-v2 receipt adapter. Parsed immutable story outlines and the standalone bounded marketing-asset planner are preparation for a later reviewed hosting extension; they do not expand the four-artifact website admission allowlist or authorize social posts. Batch size two is a processing bound, not permission to omit remaining stories.

Coordinator state is a rolling latest-completion pointer, bounded to 24 KiB UTF-8 before every conditional write. Prior new-v2 states remain in the GitHub state file's commit history, not in a claimed separate append-only ledger. A prior issue date always holds; the latest date with identical PDF is a no-op, and a conflicting same-date PDF holds for explicit revision review. Compact QA summaries keep state bounded; full QA receipts must be retained privately by the coordinator. No existing state/history is silently pruned or migrated.

### Runtime evidence, visibility and private QA receipts

Admission expires at the earliest of the reviewed-code window and every validated source retrieval/effective deadline. The coordinator rechecks that expiry at each live-state checkpoint immediately before creation and promotion. A code review lasting days cannot extend a fifteen-minute observation.

Before recording create intent, a separate grant-pending phase observes the full state through the exact raw URL used by the provider gate. Old cached state waits with no deployment effect. A same-owner lease may refresh only the same candidate identity; contradictory state holds. The raw observation and subsequent authenticated CAS checks still do not constitute provider-enforced fencing.

HTTP QA reads PDF, reader, cover and promo exact bytes, lengths, MIME types and SHA256 on the preview and both public domains. Full QA proofs are canonically serialized into content-addressed `ltc-qa-<sha256>.json` files in the coordinator's approved private Drive folder. Metadata must verify the file and parent are owner-only, and raw readback must reproduce the exact archived bytes before progression. Public Git state stores only digest-based references, never private folder/file IDs or protected access material. A receipt callback without actual provider write, metadata and byte readback is not operational proof. Same-day corrections require an explicitly reviewed separate revision procedure and cannot overwrite daily history.

After a recorded promotion intent, evidence expiry must not prevent read-only outcome reconciliation. Exact bound reconciliation may finish with `published-reconciled-stale-evidence`; this verifies public bytes but explicitly makes no current-data claim and never repeats creation or promotion. Before promotion, expired evidence still holds. Expired preview QA can be refreshed once per advance on the same READY, source-matched deployment while admission remains fresh; refresh does not promote in the same advance.

### Reviewed alternative evidence store: owned Library (not activated)

A separate `owned-library-qa-receipt` backend may establish owned-root creation, active main-Library presence, authoritative create/materialize identity and version, and exact materialized byte/hash readback. It performs no sharing action. It does not claim independently inspected outward ACLs, WORM storage or perpetual retention, and it is never a silent fallback from Drive. Private Library identifiers remain outside public state.

OpenAI documents that deleted files disappear from the main Library view immediately and that separately saved files survive chat deletion, subject to applicable account/workspace retention policies. This supports active saved-file evidence rather than an invented Google Drive `trashed:false` field. See [Library management](https://help.openai.com/en/articles/20001052-using-library-to-manage-files-in-chatgpt) and [file retention](https://help.openai.com/en/articles/8983778-chat-and-file-retention-in-chatgpt). The existing strict Drive validator remains unchanged. Production use requires independent testing and the separately reviewed activation decision.

### November 16 cloud bootstrap observation

Exact source `ed8d2f978ecd7c98e03d03aa4cc06b4b2b4d7585` built once in Vercel from the canonical repository after the actual raw-state gate admitted its short preview-only grant. Creation to READY took 87.687 seconds. The grant was closed immediately after READY; no promotion occurred and both production domains remained on their prior deployment.

Approved private HTTP QA verified six real critical HTML routes, four JSON API responses, and exact daily PDF, daily cover and ecosystem-special PDF bytes. This verifies existing legacy content on the infrastructure preview, not a newly accepted daily-v2 edition or the currentness of every API value. An initial nonexistent `/explore/` probe returned 404; the actual `/conversations/litecoin/` route returned 200. Access-link material is excluded from source and reports.

The full independent check exposed an obsolete historical-wrapper fixture (1 failed of 1454 tests), not an application build failure. A local fixture-only correction pins that historical test to its original configuration while the separate v2 tests cover the new composition. The corrected full check must be recorded separately; do not claim the deployed commit itself had an all-green full suite. No second preview is authorized by the one-build bootstrap approval.

### Agent runtime callback bridge (local preparation)

`cloud-newsroom-v2-runtime-bridge.mjs` keeps the coordinator in a Node process and exchanges explicit request/response JSON over private stdin/stdout with the scheduled dot. It does not invent a credentialed MCP server or require a Mac. The CLI hard-disables mutations. An actual cloud run emitted the exact GitHub state-read request, received the genuine connector response and returned `hold / disabled_or_emergency_stop` for the closed bootstrap state. Four local bridge tests cover request correlation, replay/size rejection, timeout and closed-stream behavior; no automatic retry occurs.

This read-only proof is not production wiring. A future approved mutation dispatcher must preserve the coordinator's intent records, journal uncertain external creates (especially receipt archives), retain only private operational identifiers outside public state, and execute actual independent QA rather than return invented boolean success. The runtime must be started from independently reviewed source, not a candidate-supplied code pin. The bridge's request schema is not itself authorization.

### Next integration, not activated

The local candidate transport now has an executable connector sequence for exact four-artifact plus registry Git objects, immutable-commit base64 readback, admission-gated source-ref CAS and read-only uncertain-ref reconciliation. Binary `fetch_blob` is not usable through the observed connector; `fetch_file` with `encoding:base64` at an exact commit is required. Actual object/ref mutation transport still needs its authorized real-run test.

The private journal requires an independently durable remote root/key inventory. Missing known roots or keys hold; they are never silently re-created as a first run. Local intent/response files and directory entries are fsynced, including the parent of a newly created root. A separate inventory adapter targets `state/cloud-newsroom-v2-journal-inventory.json`, not the coordinator control-state file, so archive claims do not invalidate the coordinator's own live-state comparison. That separate document was created under the approved bounded synthetic CAS test, with schemaVersion 1, generation `cloud-newsroom-v2-journal-inventory` and a version-1 journalInventory roots map. One synthetic root/key was reserved with two actual conditional writes and authenticated readback; one local counter ran, replay did not repeat it, and a preserved/renamed journal caused the known-missing-root hold. Coordinator control-state bytes remained unchanged and all publication flags remained false. This is not recurring publisher activation. Inventory bounds (16 namespaces, 128 keys each and 24 KiB total) hold rather than prune history or repeat effects; long-running retention/rotation remains an explicit operational task, not an indefinite-autonomy claim.

The Library transport stages canonical content-addressed bytes, journals the single composite create/apply operation, restricts materialization to actual create-derived identity, and decodes actual helper-observed bytes/xattrs for the existing strict validator. The dispatcher must run the official helper after creation in the same tool invocation, and persist the create response before helper execution. Unit tests do not prove those external callbacks. The actual bootstrap artifact was separately saved once and read back byte-for-byte through these official operations; it is infrastructure evidence, not a fake daily-v2 QA receipt.

Existing historical guard files, old publisher records, single daily producer/email and production aliases remain untouched. The independent Node22 fixture-corrected base passed the full check (1454 core tests, 26 TypeScript tests, build/export/reader flow) and 225 focused v2 tests. The later local runtime additions passed 251 focused tests plus 6 reader tests independently on Node22; the full application check was repeated successfully in the integration checkout. A final reviewed remote source pin and separately scoped activation remain required. No additional preview or production deployment was performed.
