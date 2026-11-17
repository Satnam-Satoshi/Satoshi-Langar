# Append-only desk-record coverage (preparation only)

`compileDeskCoverage` is a pure read-only report over raw existing coverage inputs and an independently pinned retained desk module. It invokes the committed `scripts/cloud-newsroom-v2-coverage.mjs` rather than trusting precomputed status labels; source deadlines are recomputed at the injected clock. It reuses `planDeskRevisionAppend` with no proposals to validate retained record history and its independently supplied module digest.

Inputs:
- `coverageInput`: full production-shaped registry, expected registry/outline pins, raw scan/extractions/outline/marketing and injected `now`, as required by the existing compiler.
- `module`, `expectedModuleDigest`: independently retained append-only desk record module and digest, not reconstructed from candidate records.
- `sourcePolicies`: independent exact source/URL/kind/parser/publisher/metric policy, with fixed `SOURCE_AGE_CEILINGS` and strict expiry. A still-current generic source cannot override a shorter per-desk policy deadline. Missing/unsupported policy remains a gap.
- `evidenceInventory`: trusted independent semantic-review inventory. Besides planner fields, each entry must include `materialDigest` matching both the immutable record reference and existing extraction compiler's verified material digest. Original parser ID/version, publisher identity and evidence locator must match record, inventory and extraction provenance. A record's payload hash must match independent `reviewedDataSha256`. Exact bytes/digest, source URL, original asOf and original retrieval time must also match. Rechecking newer observations cannot revive an old record. Missing review bindings remain gaps.
- `deskRoutes`: explicit desk-to-route declarations, not evidence of rendering or publication.
- `publicationReports`: optional record ID+canonical record digest, route, receipt ID, state `published`, and reportedAt. These only produce `published-reported`, never verified publication.

Every registry source and desk is retained, including sources not handled by any record and desks with no records. Record evidence, source-check freshness, historical classification, event novelty, prepared content, reported publication and rendered publication remain separate. Historical records remain historical even when sources are recently checked. All per-record and per-source gaps are emitted.

Historical date-only precision is preserved exactly, not converted into an invented observation timestamp. If the timestamp-only generic compiler cannot match that original date precision, the historical record remains a historical record with an explicit evidence-binding gap.

No transport, deployment, disk writes, schedule, publisher state, production route or daily admission changes. `publishAllowed:false`, `operational:false`, `wholeSiteFreshnessVerified:false`, and `effects:[]` always. Hash equality is not factual verification; independent input trust remains the coordinator's responsibility. The actual 43-source/17-desk registry is used by tests, not a simplified replacement.

Run `node --test tools/desk-coverage/test-desk-coverage.mjs` from the integration checkout. This module is not imported by any live page or publisher.

Timestamp composition: immutable record strings are not rewritten. Strict UTC `Z` timestamps with zero through three fractional digits compare by exact millisecond instant, so a valid append record ending `Z`/`.0Z`/`.00Z` matches equivalent canonical `.000Z` compiler evidence. Offsets, extra precision, invalid/normalized dates and changed milliseconds do not bind. Historical day-only values are not coerced to instants. Tests exercise real `planDeskRevisionAppend` output through this adapter, not only independently constructed fixtures.
