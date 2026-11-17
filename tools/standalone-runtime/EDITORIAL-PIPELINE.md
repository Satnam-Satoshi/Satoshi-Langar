# Dormant editorial pipeline

`runEditorialPipeline` composes the existing fixed-registry source collector,
independent-review article builder and local renderer. Nothing is scheduled or
published. `networkEnabled` and `renderEnabled` default to false. There is no model,
credential or provider client. Tests use synthetic retrieval, not live reporting.

Supply `issue:{id:YYYY-MM-DD-rN,date,title}`, `trustedCollectorRegistrySha256`,
`editorial:{registry,sourcePolicies:Map,reviews:Map,facts,stories,priorReview?}`,
`clock`, and an explicitly allowed `transport`. Local rendering additionally needs
an existing real `workRoot` and `renderEnabled:true`. The fixed registry SHA must be
independently reviewed; passing its value is not authentication of the caller.

Trusted editorial inputs are snapshotted before retrieval. Each usable fact must
match actual collected bytes and hash, locator, source ID/URL, retrieval clock,
retrieval deadline, and extracted parser identity. The article builder separately
checks the full fact fingerprint, publisher/parser review identity, source policy,
effective/event dates and freshness. Missing bindings remove that fact's usable
review, not its gap. Extraction is untrusted evidence, never semantic approval.

The result retains full collection observations/extractions/evidence, all article
and binding gaps, unassigned facts and incomplete coverage. The renderer receives
its exact six-field envelope. Explicit gap appendix sections preserve collection,
binding, unassigned and unestablished-coverage gaps in the artifacts as well. If
those sections exceed 20 stories, 100 facts or bounded gap text, rendering holds;
nothing is silently truncated. The article data remains available for review.

Freshness is checked before and after local rendering. An expired result retains
its DRAFT artifacts but is held. All artifacts remain DRAFT, unapproved and
unpublishable. Byte hashes do not establish accuracy, novelty, complete ecosystem
coverage or visual quality. `visualQaVerified` remains false. An independently
supplied prior review may inform draft novelty labels, never publication authority.

Run `node --test test/editorial-pipeline.test.mjs` from this package. The real local
renderer test requires its existing Python/ReportLab/Pillow/font dependencies;
there are no installs, remote fetches or remote writes in these tests.

## Real two-phase review workflow

For previously unknown source bytes, call `collectEditorialEvidence` first with
explicit retrieval permission. Retain its `collectionSha256` independently of the
bundle and reviewer input. Review the actual captured evidence and observation
clocks, then construct the independently trusted facts, review map and policies.
Call `prepareEditorialFromCollection` with that captured `collection`, independently
retained `trustedCollectionSha256`, editorial inputs, pinned collector registry,
issue and current clock. This second phase rejects a transport/network request,
checks the retained bundle fingerprint, registry identities and actual evidence
bytes, then performs the same binding/freshness/draft/render checks without fetching
again. Retained evidence must remain `Uint8Array` when rehydrated from storage.
Neither the bundle nor a producer may supply its own trusted expected fingerprint.

The single-call `runEditorialPipeline` convenience API requires already prebound
reviews matching the new observation clock. It is suitable for controlled fixtures
or preagreed observations, NOT autonomous semantic review of unknown new retrieval.
Never alter a clock or review simply to make that convenience path match. No model
or semantic-review provider is implemented; independent review remains necessary.
