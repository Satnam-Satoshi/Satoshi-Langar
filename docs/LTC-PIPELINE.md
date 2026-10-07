# LTC daily publication pipeline

Updated October 5, 2026. LTC Media is Satnam Satoshi’s public editorial project. The founder has authorized automatic publication of tested daily source briefings and the implemented Proof of Work flagship expansion. The pipeline does not claim a legally incorporated company, independent audit or human review of each automated edition.

## What can publish automatically

`config/ltc-publication.json` records policy `bounded-daily-v1`, the human owner and the emergency pause switch. The policy permits deterministic, original factual briefs from accepted public observations. It does not permit arbitrary source text, political opinions, allegations, personal financial recommendations, social posts, wallet operations or broader untested data extraction.

An edition contains:

- A New York calendar date, revision, preparation/publication timestamp and immutable identifier such as `2026-10-02-r1`.
- A clear **AI-prepared by LTC Media** byline and **Not individually reviewed by a human editor** label. Template preparation does not impersonate an independent editorial review.
- Source-specific effective dates and retrieval times, exact decimal strings, parser versions, official URLs and retrieved-file SHA-256 hashes.
- Short original factual briefs, missing/stale coverage, and correction links when applicable.
- A digest of the normalized collector snapshot. This is a content-integrity reference, not a signature, proof of issuer identity or independent audit.

The flagship snapshots the accepted AI-prepared, source-checked feature collection into each edition with its original issue date, research date, event dates and byline. Carrying educational context forward is not fresh reporting or a new independent human review. New feature narratives still need their own evidence and the editorial treatment appropriate to the subject; political interpretation, opinion, interviews and community reporting are not generated from agency-feed titles. See [editorial policy](LTC-EDITORIAL.md), [flagship editorial record](LTC-FLAGSHIP-EDITORIAL.md) and [agent responsibilities](LTC-AGENTS.md).

## Sources and acceptance boundaries

The base collector `collect-ltc.mjs` continues to use ten exact allowlisted HTTPS endpoints. The local flagship flow also calls the separate intelligence and policy collectors described below. Each collector checks its own exact source identity, parser, classification and age policy; editing a URL in configuration is insufficient to widen network access. The ten-source table describes the base snapshot, not the entire flagship issue.

| Source | Accepted observation | Boundary |
| --- | --- | --- |
| [iShares IBIT holdings](https://www.ishares.com/us/products/333011/ishares-bitcoin-trust-etf/latest-holdings.csv) | Dated BTC quantity and shares outstanding | Exact product/asset/column checks; decimal strings; four-calendar-day window for a new financial brief. Holdings changes are not flows. |
| [Coinbase Exchange ticker](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-ticker) · BTC/USD and LTC/USD | Exact venue-reported last-trade price and trade time | Two exact product endpoints; positive decimal strings and response shape checked. Fresh for at most two hours at preparation. A sampled price at one exchange, not a global index, daily close or continuously live quote. |
| [Bitcoin Core](https://api.github.com/repos/bitcoin/bitcoin/releases/latest) | Upstream version and publication timestamp | Exact official repository and stable version pattern; no draft/prerelease; historical releases keep their original dates. |
| [Litecoin Core](https://api.github.com/repos/litecoin-project/litecoin/releases/latest) | Upstream version and publication timestamp | Exact official repository; three- or four-component numeric release; no draft/prerelease. |
| [LND](https://api.github.com/repos/lightningnetwork/lnd/releases/latest) | Upstream version and publication timestamp | Exact official repository; preserves `-beta` naming used by LND; GitHub prereleases, drafts and RC tags are rejected. This is not a safety certification. |
| [Strategy notes](https://www.strategy.com/notes) | Availability only | No mNAV or company input parser. HTTP 403 remains an explicit gap. |
| [CoinShares BITC](https://coinshares.com/etp/physical-bitcoin/) | Availability only | No ETP numeric or flow adapter. |
| [SEC announcements](https://www.sec.gov/newsroom/press-releases) | Availability only | No inferred headlines. HTTP 403 remains an explicit gap; no bypass. |
| [Litecoin Register](https://www.litecoinregister.com/) | Secondary reference availability only | No treasury totals, affiliation or original-record verification claimed. |

The base collector uses no credentials, refuses redirects, limits each response to 2 MB, times out after 15 seconds, and never executes source HTML. Remote instructions are untrusted content. A `reference-retrieved` page has no validated numbers or headlines merely because it loaded. The base SEC HTML availability check remains separate from the new RSS parser; success or failure of one is not a result for the other.

No continuously live or composite BTC/LTC price, ETF/ETP flow series, company mNAV, independently operated network telemetry, fresh political interpretation or full publication-feed import is produced. Broader coverage needs accepted parsers or sourced editorial work and, where relevant, source rights review. Do not replace a missing field with zero. Do not double-count custody, fund assets, company holdings or cross-listed ETPs.

### Flagship intelligence and policy records

`collect-ltc-intelligence.mjs` uses `ltc-intelligence-v1` with three source identities: Bitcoin block metadata from mempool.space, Litecoin block metadata from Litecoin Space, and a fixed GraphQL query to `https://api.morpho.org/graphql`. The network requests are limited to `/blocks`, `/blocks/<height>` and `/block-height/<height>` on their two pinned origins. Each response has a 2 MB limit and a 15-second timeout; redirects are refused. Block scans are serial, pause 1.5 seconds between requests to a source, and stop at 160 ten-block pages plus genesis/tip checks. These are implementation bounds, not an operator-granted API quota. A failed or rate-limited request stops that source; `--defer-litecoin` records an earlier rate limit in the same run without another request.

Network totals sum explorer-reported base-chain `tx_count`, including coinbase transactions, for blocks whose **median time** falls in the previous completed UTC day. Genesis identity, heights, parent hashes, both daily boundaries and an ending canonical tip-hash check must pass. This measures neither distinct payments nor people, wall-clock arrival or every MWEB action. Fees and active addresses remain null. Accepted individual counts can coexist with `partial` coverage; a missing side leaves the BTC/LTC ratio and difference null, and creates no complete comparison-history point. A complete window has a 48-hour freshness boundary; the intelligence snapshot itself must be no older than 24 hours and belong to the issue's New York date.

The four pinned Morpho routes are two Arc cirBTC/USDC markets, Base cbBTC/USDC and Base cbLTC/USDC. Validation checks market ID, chain ID, both token addresses/symbols/decimals, LLTV, oracle and interest-rate-model addresses against code. Arc cirBTC and Coinbase cbBTC remain distinct. Rates are variable annualized decimal fractions excluding incentives; supply APY describes supplying the loan asset, not depositing wrapped collateral. No wallet or user position is queried.

Market state and the two USD token prices have independent 15-minute freshness gates. Stale/missing state withholds rates, utilization and liquidity; a stale price withholds that price without automatically discarding otherwise valid fresh state. A fresh price cannot refresh old state. Future or invalid identity/value records fail their applicable checks. `refreshIntelligenceForPublication` re-evaluates these fields at flagship preparation, preserving collection provenance while nulling expired values. Collection runs the Morpho request after the block scans so scanning cannot age an earlier rate quote. History may grow only from actual archived observations; missing dates are not interpolated.

`collect-ltc-policy.mjs` reads exactly two official RSS endpoints: `https://www.sec.gov/news/pressreleases.rss` and `https://www.cftc.gov/RSS/RSSGP/rssgp.xml`. It validates strict RSS structure, agency identity, allowed release URL shapes, title text and exact publication timestamps, refuses redirects and executable XML constructs, and uses 2 MB/15-second limits. It retains at most two dated records per source within a 30-day lookback. The snapshot must be within 24 hours at preparation. These are attributed agency titles with factual publication framing, not a full policy feed, adjudicated findings or interpretations of legal effect. Unavailable feeds retain explicit errors and empty item arrays; they do not become a claim that no regulatory news exists.

The October 5 research run found Litecoin Space unavailable after a timeout and a rate-limited response. The issue must show the actual failed/deferred Litecoin state and withhold the common comparison. This is a retrieval gap, not a fabricated zero or a claim the Litecoin network stopped. See the intelligence payload and private evidence for the exact run result.

## Edition acceptance gates

The local `prepare-ltc-flagship.mjs` validates intelligence, policy records and dated features, then calls `prepareEdition` from `prepare-ltc-edition.mjs` for the full base registry and policy checks. The unchanged base gates require:

1. Exact recognized source identities and parser versions; unique sources and consistent source/failure counts.
2. A well-formed snapshot collected within 24 hours of preparation. Future retrieval and source-effective dates fail.
3. Correct observations, units, classifications, precision and source hashes. Availability-only sources cannot become numeric observations.
4. At least one primary, successfully parsed observation within its freshness window. Coinbase venue quotes must be no older than two hours; other accepted observations use four calendar days relative to the issue’s New York date. An old software release cannot by itself make an otherwise stale edition publishable.
5. For the IBIT financial brief specifically, a source date inside the four-day window. If a fresh software release permits an edition while IBIT is stale, the financial brief is withheld and its historical source is labeled stale.
6. Venue ticker observations pass product-specific metric, USD unit, exact decimal and timestamp checks; stale ticker observations remain dated in the evidence record but are omitted from the financial briefing.
7. An enabled, unpaused policy with unchanged limits. A configuration change cannot silently relax the hard-coded limits.

For non-ticker observations, the four-day window is a conservative calendar rule, not an exchange-holiday calendar. A new edition may repeat an unchanged but still eligible observation, with its original source date. Rechecking a historical release does not make it breaking news. When no fresh primary observation remains, no edition is created and the last valid edition stays available under its original date.

Freshness is recomputed against the publication run’s New York date, even when the collection is still within its 24-hour retrieval window. A financial value that ages past the four-day boundary between collection and publication cannot retain its earlier fresh classification.

## Collection, candidates and publication

With Node 22, from the repository root, use new absolute private paths for each run. The placeholder names below are not public artifact locations:

```sh
node scripts/collect-ltc.mjs --stdout > <private-snapshot.json>
node scripts/collect-ltc-intelligence.mjs --output <private-intelligence.json> --evidence-dir <private-intelligence-evidence-directory>
node scripts/collect-ltc-policy.mjs --output <private-policy.json>
node scripts/prepare-ltc-flagship.mjs --snapshot <private-snapshot.json> --intelligence <private-intelligence.json> --policy <private-policy.json> --output <private-candidate.json>
node --test scripts/test-ltc.mjs scripts/test-ltc-edition.mjs scripts/test-ltc-intelligence.mjs scripts/test-ltc-policy.mjs scripts/test-ltc-flagship.mjs scripts/test-ltc-presentation.mjs
```

A collector's exit status is not an edition acceptance decision. Exit 2 indicates that none of that collector's sources succeeded; inspect and retain the payload rather than treating the result as zero. A valid unavailable policy feed or partial intelligence snapshot can be carried as a gap, while malformed evidence or failure of the base fresh-primary gate withholds the edition. A candidate operation performs all checks and emits `status: candidate` with no publication timestamp. No website changes until the explicit apply and deployment steps.

The authorized release runner applies the accepted edition with:

```sh
node scripts/prepare-ltc-flagship.mjs --snapshot <private-snapshot.json> --intelligence <private-intelligence.json> --policy <private-policy.json> --publish
```

This creates `content/ltc/YYYY-MM-DD-r1.json` with exclusive creation and updates `content/ltc/index.json`. It embeds intelligence, policy records, the most recent accepted feature collection dated no later than the issue, and separate SHA-256 digests for those payloads. A process lock prevents concurrent publication. The CLI reports local status and `deployed: false`, never a successful website deployment. Only accepted base snapshots are copied to `public/data/ltc-snapshot.json`. Routine versioned changes remain limited to those edition/index files and that public snapshot; collectors' other input/evidence files remain private. The index is imported by `app/data/editions.ts` at static build time. The site must still pass full checks, build and deploy through the authorized release workflow; then its public edition and RSS must be read back. A source collection or local write alone is not a live edition.

Run again on the same New York day and the first edition is preserved. The result is `unchanged`, even if a newly collected value differs. If a correction exists, a normal repeated run returns the current revision without replacing it. Date boundaries follow `America/New_York`, including daylight-saving time. A failed later check cannot replace a prior successful edition with empty data.

The index is rebuildable from immutable edition files. A crash after an edition file is created but before the index is replaced can be reconciled by the next apply operation. A leftover `.publish-lock` after a killed process requires the operator to establish that no writer is active before removing it. Do not claim the pipeline can run when its scheduler/host is unavailable; the deployment handoff records the actual installed schedule and its operating dependency.

The daily release targets **10:00 a.m. America/New_York** through the existing Codex local automation `satnam-satoshi-foundation-and-launch-follow-up`. Its saved heartbeat prompt is the local runner; the accepted prompt version and implementation digest are recorded in the handoff. It depends on that host being available and authenticated. Follow the [release runbook](LTC-RELEASE-RUNBOOK.md) for the three collectors, isolated build, deployment, public read-back and last pause check before promotion. Schedule activation and the released version are recorded in the handoff, not inferred from a successful collector invocation. The inactive cloud draft and `cloud-ltc-release.mjs` still use the earlier base-only flow; they are not upgraded or activated by these changes.

## Corrections and pause

A normal daily run does not create revisions. The flagship CLI currently accepts only its three inputs, optional candidate output and `--publish`; it has no correction flags. Do not use the base preparer to replace a flagship issue while dropping its feature, intelligence or policy evidence. A flagship correction needs a separately reviewed revision procedure. For the earlier base-only editions, the existing reviewed correction command requires the next explicit revision number and a meaningful reason:

```sh
node scripts/prepare-ltc-edition.mjs --snapshot /private/tmp/ltc-corrected-snapshot.json --publish --revision 2 --correct-date 2026-10-02 --correction-reason "Describe the specific correction and the evidence."
```

The previous revision for the target issue date must exist. Its immutable JSON remains intact. The new edition links `correctsEditionId`, records the reason and appears before its predecessor in the index. `--correct-date` supports a next-day correction while preserving the original issue date: the new preparation/publication timestamps record when the correction is actually prepared. Without this flag, the target is today’s issue.

Corrections still require fresh collection and a currently eligible primary observation. A source-effective date after the target issue day is rejected, so a correction cannot silently put newer holdings into an older issue. Historical corrections that cannot meet those evidence gates require a separately reviewed archival-source change. Never backdate a correction’s publication timestamp or silently replace an old file.

Emergency stop: set `paused` to `true` in `config/ltc-publication.json` and stop the release scheduler. Both preparation and apply then fail closed. The website retains its last valid dated edition. A deliberate stop is not a request to remove the archive. Resume only after the human owner authorizes it and the failing condition is understood.

## First expanded source check

Collection at `2026-10-03T01:26:52.988Z` (October 2 in New York) accepted:

- IBIT: `803343.05410` BTC and `1414760000.00` shares, source-effective October 1, 2026.
- Bitcoin Core: `v31.1`, upstream publication `2026-07-08T09:14:15Z`.
- Litecoin Core: `v0.21.5.8`, upstream publication `2026-09-12T12:06:49Z`.
- LND: `v0.21.4-beta`, upstream publication `2026-10-01T16:46:15Z`.

Strategy and SEC returned their already-known HTTP 403 failures. CoinShares and Litecoin Register were availability checks only. The resulting first bounded briefing is `2026-10-02-r1`. Its original observations are historical evidence after that issue date, not a claim of present-day freshness.

## Tests, provenance and limits

Offline tests exercise source identity, strict release channels, impossible dates, decimal precision/zero, response limits, failed requests, stale/future snapshots, all-failed inputs, false reference metrics, policy pause, daily date boundaries, reproducibility, archive idempotence, explicit correction history and concurrent-writer lock behavior. The full site check must also verify TypeScript, portable export, internal links, all edition pages, RSS and desktop/mobile reading.

Per-source hashes refer to retrieved bodies before parsing; the block-source digest summarizes its ordered page hashes. Only normalized observations, source metadata and hashes are stored in the public edition; complete third-party response bodies are not republished. Keep all three collector inputs with private release evidence. `--evidence-dir` can preserve intelligence response bodies and request metadata privately; the policy collector retains a source hash and normalized record, not a raw-body archive. Payload digests use `JSON.stringify(parsedPayload)`, not pretty-printed file bytes. These are integrity references, not issuer signatures, independently operated node measurements or complete independent verification. Upstream pages may subsequently change.

General, impersonal education and research only. This workflow cannot manage a portfolio, monitor positions or debt, sign a transaction, move funds, configure authentication, change donation addresses, publish the deferred satnam.x domain, merge a protected branch or invent a human reviewer.

## A new jacket for each daily issue

The founder explicitly requested daily publication without waiting for individual founder review, with updated numbers, a fresh cover and back page, and an accessible past-issue archive. The routine factual and original educational-design lane publishes after source, content, build and reader-flow checks. It never represents those checks as independent human editorial review.

New edition records include an archived `presentation`: date-derived art direction, palette, thematic title, exact reading order and educational closing page. From October 5, version 2 art direction uses two original dated cover assets (`daily/proof-of-work-2026-10-05.jpg` and `daily/small-blocks-2026-10-06.jpg`) followed by four existing original editorial illustrations in a bounded rotation, with three layouts. It also retains the seven geometric motifs, four palettes and bounded educational exercises. This is a deterministic art library, not a promise of a freshly generated image every day. The cover is a creative theme, not an unsupported claim about breaking news. Reading order contains every accepted base brief exactly once.

Presentation travels inside the immutable JSON record so tomorrow's art direction cannot rewrite yesterday's jacket. Existing source-only editions remain readable with a labeled legacy treatment. A revision is explicit and retains its predecessor. The date page selects the newest accepted revision for its day; exact revision URLs preserve the original. No blank future editions are manufactured.

Freshness means fresh checks, not forced numerical change. Daily prices are snapshots from one named venue with exact trade times. Fund holdings keep their actual report dates, including weekends and holidays; unchanged balances are allowed. A failed or stale field is missing or visibly dated, never substituted with zero. A new cover does not make an old software release today's news.

The saved October 6 cover is design preparation only. No October 6 edition is created until that New York date, actual collection and acceptance. Longer features retain their original evidence dates when reused; a changed cover or reading sequence cannot turn October 5 research into fresh political reporting.

Always-on cloud publishing is a separate operational setup. The activation package and remaining owner actions are documented in LTC-CLOUD-SETUP.md. The cloud workflow remains an inactive draft, and its old base-only runner requires a reviewed flagship upgrade before activation.

## Complete magazine coverage — October 4, 2026

The October 4 expansion added all 29 reference-topic coverage entries, source status and copied desk context; that change alone added no numeric adapters. The October 5 flagship adapters are documented separately above. Read [LTC-COVERAGE.md](LTC-COVERAGE.md) for the original page map and its dated limitations. Historical tables retain their October 2 qualification and do not become fresh measurements. Validate the entire manifest before release and preserve earlier JSON. Keep unqueried links, availability checks, source-bound agency titles, dated features and accepted numeric observations distinct.
