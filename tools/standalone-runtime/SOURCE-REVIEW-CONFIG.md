# Dormant source-review configuration and retained-review boundary

Mission: bind independently supplied source policy and fact-review records to the exact retained source capture used for a draft. This module does not retrieve sources, call a model, infer semantic approval, authenticate an author, resolve credentials, render, publish or activate a worker. Reading the package's fixed collector registry on import is its only filesystem dependency.

## APIs

- `sourceReviewConfigTemplate()` returns an incomplete configuration with the actual collector registry SHA, fixed review schema, empty sources/policies/reviewer references and null review-age ceiling. It grants nothing and does not validate until independently reviewed inputs are supplied.
- `sourceReviewConfigSha256(configuration)` and `sourceReviewEnvelopeSha256(envelope)` compute bounded canonical sorted-key JSON SHA256. These are fingerprints, not signatures or approval.
- `validateSourceReviewConfig({configuration,trustedConfigurationSha256,now})` validates a separately pinned configuration.
- `bindReviewedEditorial({configuration,trustedConfigurationSha256,collection,trustedCollectionSha256,reviewEnvelope,trustedReviewSha256,now})` returns concrete pipeline-compatible registry/facts/stories and sourcePolicies/reviews Maps, the validated retained capture and pins, draft diagnostics, explicit gaps and limited freshness bounds. It never invents a review record for a fact.

Bad bindings throw bounded error codes without raw source text or credentials. Inputs are snapshotted before use. There is no ambient config/env fallback. The actual retained editorial pipeline remains responsible for rechecking its inputs when it runs.

## Configuration schema

```
{schemaVersion:1,mode:'independent-review-bindings-only',
 collectorRegistrySha256:<actual package registry bytes SHA256>,
 reviewSchema:'standalone-reviewed-editorial-v1',
 maxReviewAgeSeconds:<1..86400>,
 reviewerReferences:[<bounded independently configured reference IDs>],
 registry:[{id,url,publisherId,parserId,parserVersion,metricKind}],
 policies:[{sourceId,url,kind,metricKind,maxAgeSeconds,expiresAt}]}
```

Each configured source must be in the package collector's fixed registry at its exact URL. Core uses `litecoin-core-github-latest-release` v1; other supported collector extraction uses `stdlib-html-dom-text` v1. Unsupported/non-HTML extraction remains a gap, not a new parser endorsement. Publisher IDs are independently reviewed configuration, not inferred from page claims. URLs/parser IDs cannot be replaced by a producer.

Metric kinds and hard freshness ceilings match the article builder: quote 7,200 seconds, morpho 900, chain 1,200, primary 86,400, additionally capped by the collector source's own maximum age. There must be one explicit policy per configured source, with matching URL/kind/metric and a valid future absolute expiresAt. The module does not choose a policy kind, extend a deadline or redate historical evidence. Source subsets are permitted only as an explicit scoped configuration; they never establish ecosystem-wide coverage.

## Independent review envelope

```
{schemaVersion:1,configurationSha256,collectionSha256,
 reviewerReference,reviewedAt,expiresAt,
 facts:[<exact article-builder fact records>],
 stories:[{id,title,factIds}],
 reviews:[{factId,factSha256,sourceId,url,publisherId,parserId,parserVersion,
           evidenceSha256,evidenceLocator,retrievedAt}]}
```

Reviewer reference must be in configuration, but an allowlisted string does **not** authenticate that reviewer. The envelope digest, capture pin and config pin must be retained and supplied independently by the trusted coordinator after actual external review. Supplying both a document and a matching hash from the same untrusted producer is not a trust boundary. This module cannot authenticate a caller who fabricates every input; no caller approved:true/authenticated:true or claimVerified field is accepted in place of evidence-bound records.

Review must follow the complete captured bundle's observed clocks, not predict fresh retrieval timestamps. It must not be future-dated and must have an explicit unexpired expiresAt no later than reviewedAt + configured maximum review age. Review expiry is intersected into the source policy Maps passed to the pipeline, so a previously bound review still expires during later pipeline consumption rather than receiving a new clock.

Every supplied review must match the exact fact digest, configured source URL/publisher/parser, original retrieval instant and evidence locator/hash. Actual retained Uint8Array bytes are rehashed and checked against successful source observations, byte lengths, source IDs and extraction identity. The independently pinned collection fingerprint includes all observations, extractions and evidence bytes, not just the selected fact. Missing evidence, changed clocks or parser output cannot be repinned by a review envelope.

The retained-capture fingerprint follows the existing collector/pipeline byte-order contract. It is independently held capture attestation, not proof that a website statement is true. No lexical extraction result or `independent-review-candidate` from semantic-review.mjs is automatically converted to a review-map entry. Such candidates still need genuine independent review and a separately retained envelope.

## Outputs and limits

`editorial` is directly consumable by `prepareEditorialFromCollection`, with explicit registry, sourcePolicies Map, reviews Map, facts, stories and `priorReview:null`. No prior novelty inventory is invented. Historical eventAt/asOf dates stay unchanged; default novelty remains baseline-not-news, not a new announcement.

Missing review entries remain `independent-review-missing` gaps and the real article builder's held-with-gaps result. Full collector gaps are returned separately even when the reviewed source registry is narrower. SourceCoverage remains honest about configured sources without accepted facts. All outputs explicitly retain reviewAuthorityAuthenticated:false, semanticTruthEstablished:false, claimApproved:false, publishable:false, ecosystemCoverageComplete:false and noveltyEstablished:false.

`freshnessBounds` contains checkedAt, the earliest policy/review/evidence/draft expiry, evidenceExpiresAt (null if no reviewed evidence) and reviewExpiresAt. These are local validation bounds with authorityAuthenticated:false. They are **not** an independently authenticated `observeSources` callback, a worker execution attestation, or authorization. A runtime must separately verify the source/review authority and sourceCommit, recheck current time/gaps and enforce its live control/approval policy. Missing reviews or stale bounds cannot be turned into a zero-gap authority observation.

Bounds are at most 100 sources, 100 facts/reviews and 20 stories, with JSON byte/depth limits, actual evidence limits and no reserved `pipeline-gap-` story IDs. The downstream renderer's gap appendix can still exceed its own capacity and must hold rather than truncate. This module intentionally does not broaden that contract.

Tests create a synthetic actual retained collector capture, bind separate postcapture review records, and pass resulting Maps to the actual pipeline. They cover exact-source/parser/policy pins, missing/fabricated review records, byte/clock/hash substitution, reviewer allowlist limitations, expiry after binding, input snapshot isolation, and historical date/newness preservation. No live source request, credentials, model, publication or production configuration was used.
