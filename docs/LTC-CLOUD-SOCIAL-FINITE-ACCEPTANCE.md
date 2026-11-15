# Finite social bootstrap and private draft acceptance

Prepared October31,2026. This is code preparation; **no live operation has been performed**. The unconditional daily social acceptance gate remains closed. This controller cannot schedule, publish, edit, delete, change channel permissions, unpause a ledger or complete single-writer cutover. Existing queued posts remain untouched. Website publication may stay paused during this finite proof.

The canonical social snapshot contains **100 records**, including historical browser-era entries without Buffer IDs, and ten queued reservations at preparation. All 100 are preserved. A Buffer queue count is not a claim that every historical canonical record has a Buffer identity. Future activation must reconcile current state again; this frozen acceptance intentionally stops if the selected queue no longer contains exactly 100 records.

## Inputs and protected context

Use a clean committed checkout containing this controller. Config is the existing exact private Google folder and separate social document, with `ledgerKey:"social"`, `provider:"google-docs"`, `publicationEnabled:false` and schemaVersion1. The document must already contain a paused, empty social envelope. No resource creation or credential discovery occurs.

The workflow must be manual dispatch on `Satnam-Satoshi/Satoshi-Langar` main by the existing founder actor ID268053325. It supplies existing Google refresh authorization and `LTC_BUFFER_API_KEY` only as protected environment secrets. `LTC_SOCIAL_ACCEPTANCE_POLICY_SHA256` is the SHA256 of the **exact policy file bytes**, supplied from reviewed protected configuration. A key alone never authorizes writes. Root must control the only writer and temporarily freeze local campaign edits while taking the snapshot and executing a finite proof.

Before reading any private state-config/policy file or constructing providers, the controller requires `LTC_ACCEPTED_IMPLEMENTATION_SHA256` to match the clean tracked source digest. The reviewed policy must bind the same actual and environment-accepted digest. Finite modes additionally require `LTC_CLOUD_PUBLISH=false`; if any `LTC_CLOUD_SOCIAL_PUBLISH`, `LTC_SOCIAL_CLOUD_PUBLISH` or `LTC_SOCIAL_PUBLISH` switch is present, it must equal `false`. Missing website publication control, enabled routine switches and a changed implementation stop before private configuration is read. The paused social revision CAS remains mandatory; these environment checks do not replace it.

Policy has exactly these fields:

```json
{
  "schemaVersion": 1,
  "purpose": "finite-social-bootstrap-private-draft-only",
  "mode": "bootstrap",
  "ownerId": 268053325,
  "source": "EXACT_40_CHARACTER_REVIEWED_COMMIT",
  "implementationSha256": "EXACT_IMPLEMENTATION_DIGEST",
  "folderId": "EXACT_EXISTING_PRIVATE_FOLDER",
  "documentId": "EXACT_EXISTING_SOCIAL_DOC",
  "canonicalSha256": "SHA256_OF_JSON_STRINGIFY_CANONICAL_OBJECT",
  "canonicalCount": 100,
  "unmappedHistoricalPostIds": [],
  "historicalCopyEvidenceSha256": null,
  "expectedRevision": "EXACT_CURRENT_GOOGLE_DOC_REVISION",
  "acceptedSchemaHashes": {
    "get_account": "EXACT_PROBE_INPUT_SCHEMA_HASH",
    "list_channels": "EXACT_PROBE_INPUT_SCHEMA_HASH",
    "list_posts": "EXACT_PROBE_INPUT_SCHEMA_HASH",
    "get_post": "EXACT_PROBE_INPUT_SCHEMA_HASH",
    "create_post": "EXACT_PROBE_INPUT_SCHEMA_HASH",
    "edit_post": "EXACT_PROBE_INPUT_SCHEMA_HASH"
  },
  "expiresAt": "FUTURE_UTC_INSTANT_WITHIN_24_HOURS",
  "draft": null
}
```

Placeholder values are not executable examples. Root must fill and review actual values. `unmappedHistoricalPostIds` lists only individually reviewed Buffer-reported **sent** records absent from the canonical Buffer-ID set; unknown draft/scheduled/sending/error records are rejected. Six original canonical records currently lack Buffer IDs; retain them as historical canonical records, never invent IDs. The accepted schema hashes cover all six discovered methods, even though this controller never calls edit_post. Changed schemas or incomplete pagination stop acceptance.

## CLI contract

```sh
node scripts/cloud-ltc-social-acceptance.mjs --mode inspect --social-state-config PRIVATE_CONFIG --policy PRIVATE_POLICY --receipt PRIVATE_NEW_RECEIPT
node scripts/cloud-ltc-social-acceptance.mjs --mode bootstrap --social-state-config PRIVATE_CONFIG --canonical-ledger PRIVATE_CANONICAL_SNAPSHOT --policy PRIVATE_BOOTSTRAP_POLICY --receipt PRIVATE_NEW_RECEIPT
node scripts/cloud-ltc-social-acceptance.mjs --mode private-draft --social-state-config PRIVATE_CONFIG --policy PRIVATE_DRAFT_POLICY --receipt PRIVATE_NEW_RECEIPT
node scripts/cloud-ltc-social-acceptance.mjs --mode reconcile-private-draft --social-state-config PRIVATE_CONFIG --policy PRIVATE_RECONCILIATION_POLICY --receipt PRIVATE_NEW_RECEIPT
```

Inspect is read-only; it can use a reviewed bootstrap-shaped policy with a nonempty inspection placeholder revision to obtain the actual revision privately. Bootstrap must then use the exact reviewed revision. It verifies the full fixed-channel queue, canonical copy/channel/scheduled times, and independently reads back each pending canonical ID before an exact-revision CAS replaces only the provably paused-empty envelope. A populated, unknown-field, nonzero-fence, leased, migrated or changed-revision document is never overwritten. The imported ledger stays paused. No local canonical file is written.

Historical records with no inline caption must match their recorded `copySha256` exactly. Two specific October6 DeLorean entries recorded a shared package hash instead of a caption hash. They require `--historical-copy-evidence PRIVATE_ARCHIVED_SOCIAL_COPY_R3_JSON` plus the approved exact raw file hash in `historicalCopyEvidenceSha256`; canonical key, Buffer ID, platform, evidence path and original package hash must all match those exact two records. Their observed Buffer text must equal the archived platform caption exactly, without normalization. No general missing-copy waiver is admitted. The actual root-cached100-record queue and canonical100-record snapshot passed this offline proof; it required69 readbacks because many historical canonical statuses remain scheduled even though only ten Buffer records are queued. This cached proof is not live acceptance.

Create inputs use the observed official wrapped image shape `assets:[{image:{url,metadata:{altText}}}]`, validated against freshly discovered accepted schemas. Legacy flat `{type,url,altText}` input is rejected by the regression fixture.

For private-draft policy, set mode `private-draft`, update expectedRevision from the imported paused ledger and provide `draft` with exactly:

```json
{
  "platform": "instagram",
  "text": "Private cloud acceptance · AI-prepared. Unscheduled verification only.",
  "mediaURL": "https://ltcmagazine.org/brand/ltc-launch-share.png",
  "mediaSha256": "EXACT_PUBLIC_PNG_SHA256",
  "altText": "Accurate reviewed description of the original artwork.",
  "instagramMetadata": {"type":"post","shouldShareToFeed":true,"isAiGenerated":true}
}
```

This first finite proof admits **Instagram only**; it does not establish X metadata compatibility or routine scheduling acceptance. The public owned PNG must match its signature and exact approved hash. A durable create-uncertain intent is committed while paused **before** the one create_post call. Returned ID is saved privately and durably before an independent get_post checks exact channel, caption, image URL, alt text, AI disclosure, draft status and null dueAt/sentAt. The proof and its hash are retained inside the paused social document. The result explicitly has schedulingAccepted:false and cloudSocialActive:false.

The first create-intent CAS uses the exact owner-reviewed initial snapshot and revision captured before media verification; it never silently rereads a newer paused snapshot to authorize the create. A concurrent revision change therefore prevents every Buffer write. Later ID-capture and proof CAS operations bind the original migration hash/canonical hash, all100 reservation bytes, fence, origin policy hash, run/attempt and planned payload. Changing any of those fields leaves the operation uncertain and prevents confirmation.

A failed or lost create response never allows another create. Reconciliation with a separately reviewed `reconcile-private-draft` policy performs get_post only for the known durable ID. Unknown create identity remains blocked for human reconciliation; no queue-text matching is treated as identity proof. The verified draft stays unscheduled and cannot be deleted by this program. Its existence must count in the later full-queue/cutover review. Private receipts can contain IDs, copies and revisions; do not upload them as public-repository artifacts or emit them in public job summaries.

## Still required before daily activation

Root must independently verify the finite result, reconcile all reservations including this acceptance draft, establish same-ID scheduling/public delivery compatibility in a separate approved proof, record exact single-writer cutover, and bind actual daily activation to the verified website latestRelease and protected owner policy. Neither bootstrap nor this private draft supplies that authorization. The daily gate intentionally remains unchanged and closed.

Offline verification: `node --test scripts/test-cloud-ltc-social-acceptance.mjs scripts/test-cloud-ltc-social.mjs`. Tests cover paused-empty revision CAS, all100 imports, missing/mutated reservations, explicit historical exceptions, private no-schedule readback, AI disclosure failure, lost create outcome and no replay, source/resource/schema/expiry/owner-policy binding, and unchanged daily gate.
