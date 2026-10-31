# Finite continuation of the confirmed first daily stage

This review proposal performs no live action. Normal publication remains gated; this action requires a new finite founder review, independently pinned protected configuration and the existing main-only protected manual workflow. It cannot use pre-effect lease retirement because the original run already completed remote effects.

## Failure boundary and nominal fix

The daily coordinator confirmed the stage, including project/deployment identity and the entire protected static manifest. Production then called `discoverStage` again, repeating deployment discovery and the full protected crawl. An offline reproduction with the actual provider/coordinator proves that a second read failure produces `deployment_discovery_uncertain`, formerly hidden by the generic safe error, while the stage remains confirmed and no promotion intent exists. This reproduces the observed boundary; it does not identify which actual external read failed.

Normal publication now consumes the exact persisted current-run/fence confirmed stage intent and matching immutable receipt. It checks operation/payload/evidence hashes, applied proof, deployment/URL/source/build/static identity before using the candidate. It never repeats full discovery after that confirmed readback. Promotion still independently checks fresh candidate identity and both previous pointers. Fixed safe diagnostics include discovery uncertainty and invalid confirmed-stage receipt.

## Finite protected review

Proposed encrypted secret `LTC_STAGED_CONTINUATION_REVIEW_JSON` and separately approved variable `LTC_STAGED_CONTINUATION_REVIEW_SHA256` bind canonical JSON (`JSON.stringify(parsedReview)`). Values and actual private resource IDs are never committed. `cloud-ltc-staged-continuation-policy.mjs` defines the complete schema:

- Founder approval, actual approvedAt and expiresAt (maximum24hours), exact current controller source/digest, distinct original artifact source/digest.
- Exact original raw website snapshot hash, failed run/attempt/main-workflow head, incoming source and original fence.
- Repository/project/team/both domains/review source branch, exact selected website document/private folder/owner permission identity.
- Exact edition/stage/candidate/previous deployment and source/static/BuildOutput/package manifests, three raw publication provenance hashes, previous public manifest and retained UNKNOWN whole-marker hash.
- `allProjectProductionAliasesApproved:true`, `firstPromotionOnly:true`, `rollbackOnConfirmedPromotionVerificationFailure:true`, `allowNewFencedClaim:true`, `pauseAfter:true`, and `authorizeRoutineActivation:false`.

The finite snapshot must contain exactly47 confirmed effects at the original fence:40 uniquely indexed private artifact parts, six Git operations and one stage; no promotion/rollback/final summary. Every active intent/receipt must be confirmed and internally verified. Any unknown/pending effect, extra operation, changed raw snapshot, changed receipt or changed UNKNOWN stops admission. This intentionally cannot become a generic resume or lease-clear command.

## Execution boundary

The existing workflow gains only `continue-staged` in the existing choice input, preserving ten inputs, three existing jobs, one scheduler/concurrency group, founder/main/manual restriction and trusted inline source guard. Website cloud switch must be `false`. Source input is the original ARTIFACT source; fence input is the original held fence. The original plan/id/previous-deployment/crash inputs remain empty/none. The mode collects no new sources, writes no Git objects/ref, uploads no existing artifact again and creates no deployment.

After validating the current controller before private reads, the controller:

1. Reads one exact website snapshot+revision and proves the exact original GitHub run attempt completed with failure/main/manual/founder. It does not depend on the original lease still being unexpired.
2. Rechecks the new reviewed controller/source branch/head/publication policy and historical migration proof. It distinguishes this NEW controller from the OLD staged artifact code.
3. Downloads every known private artifact part by its existing ID, verifies fresh owner-only folder/file identity/hash and restores all source/static/BuildOutput/evidence into a new private directory. It executes no restored code. It recomputes the historical implementation guard from explicit restored source bytes, all manifests, source operation plan, prior manifest and edition/source-desk/graphic hashes.
4. Performs a new COMPLETE protected candidate read with exact expected routes, statuses, redirects and byte hashes, followed by complete previous public baseline verification and unchanged previous pointers. This clears the failed second-read gate with actual fresh evidence; it does not skip that gate.
5. Reads the existing fixed market-price service's two public Coinbase sources, requiring current fresh quotes. These are separate live-read checks, never substituted into the staged edition or relabeled as new editorial collection.
6. Revalidates finite approval, then performs ONE exact-original-revision owner claim CAS. It preserves original lease/fence/run history, increments to a NEW fence and assigns the NEW actual GHA operator's run identity. Old47 effects remain unchanged. An ambiguous/conflicting claim never retries; a separately reviewed fresh proof is required.
7. Authorizes only the FIRST new promotion of that existing candidate. Immediately before promotion, it rechecks controller/policy, restored artifact and displayed ticker sourceAsOf against the actual current clock (maximum120minutes). Stale tickers hold; timestamps are never rewritten. Snapshot age must remain≤24hours and issue date must match current New York day. Original preparation provenance/freshness—including earlier Morpho observations—remains historical; no current Morpho/research quote is invented.
8. Verifies both public domains completely. If positively confirmed promotion fails public verification (bytes/status OR transport unavailability), the existing rollback provider freshly requires BOTH pointers still own this candidate before ONE authorized rollback to the previous verified deployment. Unknown promotion or changed/mixed pointers hold; ambiguous rollback holds. No effect is replayed.
9. On full success, uploads only ONE newly preallocated/intended final private summary, verifies download/owner/hash, writes actual latestRelease, proves archived terminal ledger/compaction and atomically records completion, retires the NEW lease and sets `paused:true`. The summary/latestRelease bind old artifact/original stage and new operator/controller separately. The existing next-run rollback loader reads this same summary format.

Failures after a proven claim best-effort pause that claimed operator while retaining its lease and every uncertain effect. A claim CAS itself is never retried. No failure clears an intent, steals an unreviewed lease, accepts the retired UNKNOWN or enables routine publication. Unknown summary uploads retain their preallocated ID for later explicit readback, never a duplicate POST.

## Proof and conditional activation

The durable `stagedDailyContinuation` retains full review/hash, original snapshot, original lease, new operator/fence, exact artifact/controller identities, and completion/hash. `latestRelease.continuation` and final release-receipt.json contain the same immutable lineage. Completion and final summary/checkpoint must be independently read back before any conditional activation.

Only after a verified successful continuation may the founder's conditional routine activation proceed using current-controller-only migration configuration rebind and the existing activation command. Historical stage/promotion evidence and old UNKNOWN pins remain unchanged. Activation reads the new latestRelease summary as its public baseline, rather than the old bootstrap manifest. This procedure does not authorize social routine posting or prove unattended ordinary-crash recovery, fresh research reporting, or every other cloud agent. It is one bounded completion of a known staged daily artifact.

Operational failure reporting is bounded: the CLI records a fixed failure phase and an explicitly allowlisted internal/release code, never raw provider messages, URLs, responses or stacks. Unknown/credential-like messages are replaced with `staged_continuation_details_withheld`. Claimed failures retain the new operator's fenced lease; a successful final CAS closes it and pauses. Independent readback is required after any ambiguous write.

The first-promotion ticker check derives its deadline from each actually displayed original `sourceAsOf`, not estimated collection time. It runs again immediately before the promotion POST, after current live price checks. Review expiry and this hard promotion freshness deadline are separate: the finite review must leave time for a verified safety rollback if promotion was already confirmed. Neither path rewrites original quote, preparation, Morpho or story-publication clocks.

Final finite safeguards bind the exact original intent/receipt key set plus the deterministic promotion and, only on a verification-failure path, the deterministic rollback. The successful pre-summary snapshot and the actual saved backup must contain exactly the original rows plus the one confirmed expected promotion; additions at ANY fence stop the path before summary upload. Final compaction counts and the sole confirmed summary payload/receipt must match that exact set. The completed latestRelease and claimed owner context are compared in full before the final CAS. Known ticker expiry is checked before the claim CAS as well as immediately before the promotion POST, so an already expired candidate leaves the original held snapshot unchanged.
