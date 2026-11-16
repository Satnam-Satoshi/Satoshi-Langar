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

The current approved exception is a single-source preview exception expiring November 17, 2026 at 00:00 UTC. It does not authorize recurring changed-source admission or production promotion. The new data-only admission evaluator is a review component, not an activated replacement guard.

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

No new gate is installed in vercel.json yet. No recurring production workflow or new state branch has been activated by implementing these modules.

Verified observations use `evidence.kind:"snapshot"` and coordinator-observed raw bytes. Verified historical observations require both manifest and trusted policy `maxEffectiveAgeSeconds:null`, an explicit historical classification/label, and fresh retrieval. Unavailable sources instead use `evidence.kind:"fetch-attempt"`, a bound attemptId/retrievedAt/outcome and externally observed attempted:true. Their snapshotSha256, value, effectiveAt and effective-age limit are null; claimVerified is false. A failed fetch must not invent a source digest.

The proposed `cloud-newsroom-v2-vercel-ignore.mjs` composition has local tests and is not installed in vercel.json. Installing it is a separate approved activation change. Existing 4-artifact daily scope does not yet admit one promotional image per story; a bounded independently validated marketing-asset manifest/public-hosting extension remains necessary before claiming full automatic story campaigns.
