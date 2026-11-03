# Paused social receipt reconciliation

This maintenance operation records already-sent Buffer outcomes in the existing social ledger. It does not send, schedule, edit or delete a Buffer post, acquire a publication lease, change the fence, unpause either publisher, create a cutover receipt or remove `assertCloudSocialAcceptance()`.

Mission: repair delivery accounting under the founder's ownership. Knowledge sources are the original publisher's canonical ledger, complete official Buffer reads and the selected private cloud social document. Permission is limited to a reviewed, finite receipt update. Uncertain outcomes, conflicting state and changed evidence stop the operation. Memory is private audit evidence and hashes; no audience identities or messages. The human owner is Satnam Satoshi founder. Any active lease, unpaused social state, unresolved submission or cutover marker stops maintenance.

## What the code permits

`scripts/cloud-ltc-social-reconcile.mjs` has two modes:

- `plan`: purely local; creates an exclusive private plan file from a ledger snapshot, original canonical ledger and selected sent-post readbacks.
- `apply`: founder manual Actions context, reviewed clean source and implementation digest, exact protected policy hash, selected private social resource, complete Buffer identity/history probe and accepted schemas. The Buffer client has writes disabled.

The operation requires a populated, paused, idle, pre-cutover ledger. Every selected ID must map uniquely to a canonical key, exact platform, copy, due time and New York date. Known asset/alt fields must match. Copy changes require an original canonical edit-history entry whose exact text and hash match the old cloud entry. Unknown IDs, changed schedules, duplicate IDs/keys and uncertain outcomes are rejected.

The plan binds the entire original cloud state and Docs revision. Apply independently reads every selected Buffer ID again, then performs one conditional write using the existing `GoogleDocsStateAdapter` and its `requiredRevisionId`. A race conflicts rather than overwriting a later writer. The old changed records remain in a hash-keyed maintenance receipt, and old source-event reservations are retained. Other records and all control fields are preserved. Provider `sent` status remains distinct from independent public rendering verification. Asset metadata hashes are not downloaded-media hashes.

A repeat of the same completed plan is a no-op. A lost write response triggers one exact state readback; an unknown result stops without a second write. Evidence and authorization expire; expiration is checked again immediately before the write. After expiry, inspect the stored receipt and prepare fresh review evidence rather than replaying an old authority.

Historical over-cap activity is recorded and reported, never deleted or relabeled to fit a limit. Reconciled entries retain both scheduled and actual New York delivery dates. Planning and final reservations count either date, so delayed delivery cannot open an extra daily invitation slot.

## Private review inputs

Keep operational inputs outside the public checkout. No real post IDs, ledger contents or provider account metadata belong in tests or public PRs.

Input shape:

```json
{
  "snapshot": { "documentId": "selected private social document", "version": "exact Docs revision", "value": {} },
  "canonical": { "schemaVersion": 1, "timezone": "America/New_York", "posts": [] },
  "evidence": [],
  "observedAt": "ISO UTC observation time"
}
```

The snapshot value is the full actual cloud ledger. Evidence contains the selected official `get_post` observations. Do not fabricate missing evidence. The original canonical record, including any edit history, is retained in the private input.

```sh
node scripts/cloud-ltc-social-reconcile.mjs --mode plan \
  --input /private/reconciliation-input.json --plan /private/reconciliation-plan.json
```

For a later reviewed manual run, the exact policy fields are `schemaVersion:1`, `purpose:"paused-social-sent-reconciliation-only"`, founder `ownerId`, source commit, implementation SHA-256, selected social document/folder IDs, input and plan SHA-256, accepted schema hashes for the six discovered Buffer methods, and an expiry no more than 24 hours away. Input/plan hashes use SHA-256 of `JSON.stringify(parsedValue)`; the protected policy hash covers the exact policy-file bytes. Never substitute a previous acceptance policy or invent schema hashes.

The protected manual context must provide `LTC_SOCIAL_RECONCILIATION_POLICY_SHA256`, the reviewed `LTC_ACCEPTED_IMPLEMENTATION_SHA256`, `LTC_CLOUD_PUBLISH=false`, and every social publication switch absent or false. It must be the founder's `workflow_dispatch` on `main` in the existing repository. The policy's source commit binds the checked-out reviewed source. The normal credential mechanism remains unchanged.

```sh
node scripts/cloud-ltc-social-reconcile.mjs --mode apply \
  --input /private/reconciliation-input.json --plan /private/reconciliation-plan.json \
  --social-state-config /private/social-config.json --policy /private/reconciliation-policy.json \
  --receipt /private/reconciliation-result.json
```

This command is a specification for a later protected run, not permission to run locally or change live switches. The repair branch deliberately does not alter the active website workflow or accepted repository pins. Add its finite manual dispatch wiring to the existing controller only after source/workflow review. Preserve the shared concurrency group; do not add a schedule or a second publisher. Make all publication gates false for the finite job and wait until the website controller is idle. Keep this separate from any pending website schedule repair and recompute the combined implementation digest after integration.

## Reconciliation and activation sequence

1. Freeze new social submissions through the existing single publisher while leaving the website release alone. A paused ledger does not cancel Buffer's existing scheduled posts. Inventory them, preserve their IDs and due times, and make any queue change only under its own authorization.
2. Refresh both channel identities, complete paginated history, every pending/draft/uncertain ID, the canonical ledger and the cloud revision. Resolve old unmapped historical posts explicitly. The recent X batch alone is not a whole-ledger cutover audit.
3. Review the exact finite patch and private plan, including edited copy and historical cap overruns. Obtain authorization for the scoped cloud-ledger maintenance and protected pins/manual dispatch integration. Do not directly edit the document or unpause it to obtain a lease.
4. Run the reviewed finite receipt operation. Confirm only expected record changes and the stored receipt. Repeat must make no write. Preserve the private Instagram acceptance draft. Keep the cloud social pause and hard acceptance gate in place.
5. Reconcile remaining historical X and Instagram statuses and imports through separately reviewed bounded plans. Verify the current queue and cap reservations again. Complete cutover acceptance with the old writer quiescent, exact implementation/source/policy bindings, independently verified transport, duplicate handling and public playback/rendering where required. No such cutover is implemented or claimed by this maintenance patch.
6. Only after explicit cutover acceptance, activate one publisher. Check current website release evidence and direct page/media destinations immediately before a permitted post. Record returned IDs before further calls and verify the public result. YouTube retains its separate terms and playback gates.

## Sitewide campaign requirements after recovery

The founder explicitly requested direct links, relevant tagged accounts and specific graphics. Preserve that intent. The old generic zero-mention editorial guidance is superseded for these requested story-specific tags, but the current cloud publisher still rejects `@` mentions and only supports daily/update keys. Do not remove those guards ad hoc. A separately reviewed campaign manifest/controller must represent verified platform-specific handles, exact page/anchor, copy/media hashes, alt text, source dates and the existing caps before it can schedule this campaign.

Use one routine educational invitation per platform/New York date, rotating Explore Litecoin, Timechain, Open Money School and other actual reader destinations. The ceiling remains four X posts total, two Instagram posts total, and at most two distinct eligible X policy updates; those ceilings are not targets or extra permission to repeat a feature. Deduplicate by provider ID, canonical key, copy hash, source event and normalized page/anchor across both site domains. Keep old source-event reservations. Do not turn related accounts into a repeated mass-tag list or imply endorsement.

Use the canonical direct paths `/conversations/litecoin/`, `/conversations/timechain/`, `/conversations/start/`, the exact dated edition and the verified special anchors. Confirm every live route before release. Give each page its own explanatory artwork: Litecoin topic map, Timechain block/halving lesson, wallet decision diagram and source-specific institutional/builders cards. Keep Timechain's educational replay distinct from fresh network observations. Do not reuse a generic cover as proof that bespoke artwork exists.

Retain cLTC's documented development status, Luxxfolio's conditional/nonbinding proposal and LitVM's actual release stage in copy. Public news and handle verification need fresh primary-source checks at drafting time. Site review, graphics generation, protected merge, live reconciliation and activation are separate outcomes; this repair claims none of those public actions.

## Verification

Run the social controller, acceptance, reconciliation, Docs adapter, Google client and runtime tests. The reconciliation tests cover content provenance, wrong identities, duplicate IDs/keys, historical caps, later delivery dates, stale revisions, concurrent changes, lost responses, readback failures, expired authorization, idempotence and zero Buffer writes. Actual private observations can also be replayed through a memory adapter; label that evidence offline simulation, never live repair.
