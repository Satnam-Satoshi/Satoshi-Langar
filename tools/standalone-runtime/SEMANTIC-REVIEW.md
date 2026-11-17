# Bounded source-field review preparation, not autonomous semantic approval

This module has two narrow deterministic surfaces. Neither calls a model/network nor outputs an article-builder reviews Map entry. All candidates remain claimVerified:false/publishable:false. Unsupported interpretations and missing provenance remain explicit gaps.

## Attributed official Litecoin Core release listing

`prepareCoreReleaseReview({now,observation,rawBytes,previousRelease:null,evidenceLocator})` reuses the packaged reviewed Core parser. It verifies actual raw JSON hash/bytes, exact official repository endpoint, release ID/tag/URLs, published_at, non-draft/non-prerelease state and retrieval freshness. It produces only the template “GitHub lists Litecoin Core release TAG, published TIMESTAMP.” It does not interpret the release body, assess security/adoption or treat first retrieval as new news. Original publication time is preserved as historical eventAt/asOf. Unknown baseline stays unknown; independent prior release inventory controls novelty. Actual source transport authentication remains an external prerequisite, not established by raw bytes plus a claimed URL.

The returned fact follows article-builder FACT_KEYS and includes exact `articleFactSha256(fact)`, source evidence locator, parser provenance and explicit limitations. `reviewMapEntry:null` is deliberate. An independent reviewer must still approve that exact fact and produce the builder review binding with sourceId/url/publisherId/parserId/parserVersion/evidenceSha256/evidenceLocator/retrievedAt. This package never fabricates that review to make article production pass. It offers a usable attributed assertion whose field support can be inspected, not an autonomous publication approval.

## Generic lexical fidelity only

`reviewSourceClaims({now,registry,evidenceInventory,proposals})` supports exact JSON string fields using independently configured source/field schemas:

- quote-context: entire source field only, not arbitrary cherry-picked substrings.
- decimal-field: exact decimal string and configured unit, retaining a separately configured full context field. No floating conversion, unit conversion, arithmetic, trend, summary or inference.

Registry rows: `{id,url,publisherId,parserId:'strict-json-source-fields',parserVersion:'1',fields:[{locator,mode,contextLocator,unit,asOfLocator,eventAtLocator}]}`. Date locators may explicitly be null for unavailable original dates. Unit is null for whole quotations. Field selection and publisher identity require independent review; arbitrary model-supplied schemas are not authority.

Evidence Map keyed by raw SHA256 holds actual Uint8Array, sourceId/url/publisher/parser bindings, same SHA256, retrievedAt, expiresAt and private evidenceLocator. It must come from independently authenticated observation, not a model echoing proposal data. Retrieval expiry is capped24h, stricter supplied deadlines honored. This is not a current-price/chain/Morpho semantic freshness policy. All per-metric effective deadlines remain the independent article source-policy gate; generic candidates must not be displayed as verified current values.

Exact proposal keys: id,sourceId,evidenceSha256,locator,mode,value,unit,context,asOf,eventAt,retrievedAt. Dates must exactly match original source fields, preserving day-only precision; retrieval must match observation. Numbers, units, negation/context or dates cannot be silently changed. Markup/control input, duplicate JSON keys, malformed UTF8, unknown locators and schema extras fail closed. JSON pointers intentionally support only simple alphanumeric/underscore/hyphen path segments, not arbitrary XPath/HTML/escaped property names. Raw evidence bounds:1MB/source,16MB cumulative proposal processing,100 sources/200 proposals; parsed depth/nodes/strings are capped.

Lexical equality is not truth or full context: even an exact quotation may be misleading or malicious. The module labels generic candidates lexical-source-fidelity-only, semanticTruthEstablished:false and complete:false for every source. It cannot detect all negation elsewhere in a document, publication intent, hidden HTML context, source spoofing, financial meaning or unsupported ecosystem claims. Untrusted text is data only and must never be rendered/followed as instructions.

## Tests and activation

Eight synthetic tests cover exact numeric/context/date fidelity, hallucinated values/units, removed negation, partial quotes, duplicate schemas/JSON, injection, raw/parser/expiry binding, official Core attributed statement and rejected future/draft/wrong-source observations. No original private source payloads, provider tokens, model SDK, call, effect or scheduler is included.

`node --test tools/standalone-runtime/test/semantic-review.test.mjs`

This is a review-preparation module, not a full autonomous semantic engine. General summaries and generated prose require independently reviewed source context and editorial verification; optional model proposal generation remains unimplemented rather than being silently treated as authority.
