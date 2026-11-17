# Pure dormant campaign preparation

`src/marketing-campaign.mjs` generates educational invitations only. It has no filesystem, HTTP, Buffer, subscriber, scheduling or publication operations. It does not activate the existing publisher, create a second canonical post ledger, or claim a live campaign. This source was exercised only with synthetic fixtures; actual campaign controls/operating records were not loaded or modified.

## Contract and trust

```
prepareMarketingCampaign({
 priorBacklog, trustedPriorSha256, stories,
 policy, trustedPolicySha256,
 publicationReceiptBytes,
 observations, trustedObservationSha256,
 evidenceBytes, now, batchSize:2, batchAfterKey:null
})
```

Canonical hashes use exported `campaignCanonical` / `campaignSha256`. Pins must come from independently authenticated retained configuration/readbacks; recomputing them from arbitrary input is not approval. This pure verifier cannot authenticate a reviewer or HTTP/OAuth caller. `authorityAuthenticated:false` is always returned. Actual live evidence loaders, owner authorization, queue completeness, platform/account verification, cadence and final review remain separate runtime gates.

`priorBacklog` is explicitly supplied `{schemaVersion:1,entries:[...]}` plus its retained hash. No implicit missing-ledger bootstrap. Entries bind key, campaignId, issueId, storyId, storyContentSha256 and platform. Prior entries are preserved; an omitted story remains retained. A same-story divergent content hash requires a new explicit story identity. Maximum200 input stories/1000 retained platform entries; excessive inputs HOLD/throw rather than truncate history.

`stories` contains exact storyId, storyContentSha256, canonical storyUrl, topic, sourceIds, hashtags and mediaUrl. The content hash is the independently observed story-page byte hash, not a generated prose assertion. Topics are fixed `builders`, `research`, `payments`, `ecosystem`, `education`. All accepted stories receive both X and Instagram backlog entries. A bounded batch limits drafts, never inventory coverage; `batchAfterKey`/`nextBatchAfterKey` permits deterministic traversal. Missing/held/deferred entries and their reasons remain visible. No status is changed to scheduled or published.

`policy` exact fields are campaignId, issueId, sourceCommit, projectId, planSha256, manifestSha256, publicationReceiptSha256, notBefore, expiresAt, sources, tags, media, growth. See `test/fixtures/marketing-fixture.mjs` for a complete synthetic example; it contains no real IDs, accounts or subscribers.

## Evidence required

- `publicationReceiptBytes` is the exact canonical actual release-QA public receipt (not a deployment acknowledgment): status `production-readback-observed` or `public-qa-verified`, public phase, fresh source/plan/manifest/project binding, exact two canonical domains, four matching artifact observations and edition HTML hashes. The existing receipt intentionally still says publicationVerified:false; this generator does not overwrite that distinction. No copied caller verified:true grants authority. Receipt expiry is at most120seconds from check.
- `observations` is a separately pinned `{sources,storyPages,media,growth}` inventory. Actual bytes are looked up by SHA in the injected Map `evidenceBytes` and rehashed. No arbitrary data is fetched.
- Source policy rows are `{id,url,publisherId,metricKind,maxAgeSeconds}`. Exact observed source rows carry id/url/publisherId, byteSHA, retrievedAt, asOf, eventAt, current/historical kind, expiresAt and locator. Per-source caps cannot exceed quote7200s, Morpho900s, chain1200s, primary86400s. Stricter expiry is honored. Date-only historical precision is retained, not relabeled as today's news. Original dates are included in prepared coverage metadata.
- Story-page observations bind exact canonical story URL/hash with HTTP200 and <=60second readback lifetime.
- Media observations bind canonical public PNG URL, raw byteSHA/length,1080×1350 dimensions, ASCII alt text, exact original/licensed rights reference and <=60second readback. Basic PNG signature/dimensions are not visual, full-image-decoder or copyright proof. The independently reviewed inventory owns rights/visual assessment. Private Drive URLs are never substituted.
- Media policy additionally pins `{url,sha256,availabilityUntil,rightsExpiresAt,rightsReference}`. Future availability is a bounded independently approved horizon, not a guarantee inferred from one HTTP200.

`expiresAt` in a draft is short **preparation/reservation freshness**, intersecting publication/story/media observations. `contentExpiresAt` separately intersects campaign/source/tag-policy and media availability/rights horizons plus any growth activation limit. It is not permission to publish later without rechecking current gates. The reservation store should require now<expiresAt and dueAt<contentExpiresAt, plus its own current policy/queue/stop checks.

## Restricted copy and growth

Only fixed ASCII educational invitation templates and canonical URLs are emitted. No arbitrary headline, summary or factual claim is copied. No numerical prices/rates/network counts; URL identifiers may contain dates/numbers. No automated mentions, replies, DMs, likes, follows or engagement campaigns. At most three ASCII hashtags from exact independently approved story/source-tag mappings. A mapping may use an existing `#Litecoin` literal or explicit tag `#Litecoin` with literal `Litecoin`; actual bytes must contain the literal at word boundaries. This is lexical support, not proof of semantic relevance or negation interpretation: independent policy review must establish relevance. No default handles/taxonomy is invented.

Controlled ASCII allows exact supported-platform length checks: X URLs count23 and other emitted ASCII characters1; Instagram UTF16 count plus one extra unit per LF, maximum2196. Unicode/emoji captions are unsupported rather than approximately weighted. These technical caps never grant posting authority. The runtime must separately enforce one routine invitation per platform per NY date and verified queue/ledger state. Older scheduler mention allowances are not adopted; this generator permits zero mentions.

`growth` defaults null. The only supported growth URLs are `https://ltcmagazine.org/conversations/feed.xml` for RSS and `https://ltcmagazine.org/subscribe/` for an owner-approved live double-opt-in service. Policy pins receiptSha256 and activationExpiresAt. The exact observed service receipt binds fresh HTTP/MIME/body bytes; RSS has bounded root checks, not a general XML parser. DOI additionally requires independently authenticated ownerApprovalReference and retained DOI/unsubscribe verification. These supplied pins are not self-authenticating tests. Unknown/disabled/unverified service holds the optional-growth draft; it never claims newsletter enrollment is open. No subscriber records or email addresses are input/output. External form URLs are unsupported.

## Output / downstream boundary

Every draft has exactly:

```
key,campaignId,issueId,storyId,storyContentSha256,platform,storyUrl,
text,contentSha256,media:{url,sha256,bytes,width,height,alt},
sourceEvidenceSha256,publicationReceiptSha256,policySha256,
preparedAt,expiresAt,contentExpiresAt,growthUrl,growthEvidenceSha256,
executeAllowed:false
```

The runtime, not this generator, chooses dueAt and binds queueObservationSha256 and the **separate** platform-policy digest. Result always includes full backlog/coverage, effects:[], schedulingAllowed:false, publishingAllowed:false and operational:false. Existing Buffer normalization complete:false must not be changed to pass these drafts. A prepared draft, private reservation, provider schedule and verified public post are distinct states.

Run `node --test test/marketing-campaign.test.mjs`. Twelve synthetic tests cover hashes/actual supplied bytes, both domains, stale/future dates, strict horizons, backlog traversal, unknown/forged evidence, HTML/URL/tag scope, media and opt-in CTA gating. Shared fixture exports `createMarketingFixture(count)` for source-only runtime integration.
