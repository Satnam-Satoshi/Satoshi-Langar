# LTC daily publication pipeline

Updated October 2, 2026. LTC Media is Satnam Satoshi’s public editorial project. The founder has authorized automatic publication of tested, narrowly scoped daily source briefings. The pipeline does not claim a legally incorporated company, independent audit or human review of each automated edition.

## What can publish automatically

`config/ltc-publication.json` records policy `bounded-daily-v1`, the human owner and the emergency pause switch. The policy permits deterministic, original factual briefs from accepted public observations. It does not permit arbitrary source text, political opinions, allegations, personal financial recommendations, social posts, wallet operations or broader untested data extraction.

An edition contains:

- A New York calendar date, revision, preparation/publication timestamp and immutable identifier such as `2026-10-02-r1`.
- A clear **AI-prepared by LTC Media** byline and **Not individually reviewed by a human editor** label. Template preparation does not impersonate an independent editorial review.
- Source-specific effective dates and retrieval times, exact decimal strings, parser versions, official URLs and retrieved-file SHA-256 hashes.
- Short original factual briefs, missing/stale coverage, and correction links when applicable.
- A digest of the normalized collector snapshot. This is a content-integrity reference, not a signature, proof of issuer identity or independent audit.

Original explainers, analysis, opinion, interviews and community reporting remain a separate editorial-preview/review workflow. The automated runner must not silently promote them to reviewed reporting. See [editorial policy](LTC-EDITORIAL.md) and [agent responsibilities](LTC-AGENTS.md).

## Sources and acceptance boundaries

The collector uses ten exact allowlisted HTTPS endpoints. The source identity, parser, classification and age policy must match the registry in code; editing a URL in configuration is insufficient to widen network access.

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

The collector uses no credentials, refuses redirects, limits each response to 2 MB, times out after 15 seconds, and never executes source HTML. Remote instructions are untrusted content. A `reference-retrieved` page has no validated numbers or headlines merely because it loaded.

No continuously live or composite BTC/LTC price, ETF/ETP flow series, company mNAV, independently measured network telemetry, new political reporting or full publication-feed import is produced by these adapters. Broader coverage needs accepted parsers or sourced editorial work and, where relevant, source rights review. Do not replace a missing field with zero. Do not double-count custody, fund assets, company holdings or cross-listed ETPs.

## Edition acceptance gates

`prepare-ltc-edition.mjs` validates the full ten-source registry before writing anything into the archive. It requires:

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

With Node 22, from the repository root:

```sh
node scripts/collect-ltc.mjs --stdout > /private/tmp/ltc-snapshot.json
node scripts/prepare-ltc-edition.mjs --snapshot /private/tmp/ltc-snapshot.json --output /private/tmp/ltc-candidate.json
node --test scripts/test-ltc.mjs scripts/test-ltc-edition.mjs
```

The collector’s exit status is not an edition acceptance decision. Exit 0 means at least one collection/reference retrieval succeeded; exit 2 means every source failed. A candidate operation still performs all policy/source checks. Its output has `status: candidate` and no publication timestamp. No website changes until the explicit apply and deployment steps.

The authorized release runner applies the accepted edition with:

```sh
node scripts/prepare-ltc-edition.mjs --snapshot /private/tmp/ltc-snapshot.json --publish
```

This creates `content/ltc/YYYY-MM-DD-r1.json` with exclusive creation and updates `content/ltc/index.json`. A process lock prevents concurrent publication. The CLI reports `published-locally`, never a successful website deployment. The index is imported by `app/data/editions.ts` at static build time. The site must still pass its full checks, build and deploy through the project’s authorized release workflow; then its public edition and RSS must be read back. A source collection or local write alone is not a live edition.

Run again on the same New York day and the first edition is preserved. The result is `unchanged`, even if a newly collected value differs. If a correction exists, a normal repeated run returns the current revision without replacing it. Date boundaries follow `America/New_York`, including daylight-saving time. A failed later check cannot replace a prior successful edition with empty data.

The index is rebuildable from immutable edition files. A crash after an edition file is created but before the index is replaced can be reconciled by the next apply operation. A leftover `.publish-lock` after a killed process requires the operator to establish that no writer is active before removing it. Do not claim the pipeline can run when its scheduler/host is unavailable; the deployment handoff records the actual installed schedule and its operating dependency.

The daily release is scheduled for **10:00 a.m. America/New_York** through the existing Codex local automation `satnam-satoshi-foundation-and-launch-follow-up`. It depends on that host being available and authenticated; it is not an always-on cloud newsroom. Follow the [release runbook](LTC-RELEASE-RUNBOOK.md) for branch checks, the isolated build, deployment, public read-back and the last pause check before promotion. Schedule activation and the released version are recorded in the handoff, not inferred from a successful collector invocation.

## Corrections and pause

A normal daily run does not create revisions. A reviewed correction requires the next explicit revision number and a meaningful correction reason:

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

Per-source hashes refer to the retrieved body before parsing. Only normalized observations and hashes are stored in the public edition; complete third-party response bodies are not republished. The collector snapshot is retained with the private release evidence. Its digest is computed over `JSON.stringify(parsedSnapshot)`, not the pretty-printed file bytes. This preserves an audit reference without claiming a full raw-source archive, issuer signature or independent verification. Human editors can request the source evidence and reproduce the next public fetch; upstream pages may subsequently change.

General, impersonal education and research only. This workflow cannot manage a portfolio, monitor positions or debt, sign a transaction, move funds, configure authentication, change donation addresses, publish the deferred satnam.x domain, merge a protected branch or invent a human reviewer.

## A new jacket for each daily issue

The founder explicitly requested daily publication without waiting for individual founder review, with updated numbers, a fresh cover and back page, and an accessible past-issue archive. The routine factual and original educational-design lane publishes after source, content, build and reader-flow checks. It never represents those checks as independent human editorial review.

New edition records include an archived `presentation`: a date-derived original cover composition, palette, thematic title, source-bound subtitle, exact reading order and educational closing page. Geometric illustrations use original code and a date-specific seed; they do not copy Bitcoin Magazine branding, photographs or article text. Seven visual families and original educational exercises provide variation within a consistent LTC identity. The cover is a creative editorial theme, not an unsupported claim about breaking news. Reading order contains every accepted brief exactly once.

Presentation travels inside the immutable JSON record so tomorrow's art direction cannot rewrite yesterday's jacket. Existing source-only editions remain readable with a labeled legacy treatment. A revision is explicit and retains its predecessor. The date page selects the newest accepted revision for its day; exact revision URLs preserve the original. No blank future editions are manufactured.

Freshness means fresh checks, not forced numerical change. Daily prices are snapshots from one named venue with exact trade times. Fund holdings keep their actual report dates, including weekends and holidays; unchanged balances are allowed. A failed or stale field is missing or visibly dated, never substituted with zero. A new cover does not make an old software release today's news.

Always-on cloud publishing is a separate operational setup. The reviewed local daily task is active. The activation package and remaining owner actions are documented in LTC-CLOUD-SETUP.md; do not claim the draft cloud workflow is running.

## Complete magazine coverage — October 4, 2026

The founder requested every topic from the 29-page reference, including Morpho, cbBTC/cbLTC, Arc, USDC, EURC and SEC/CFTC. Read [LTC-COVERAGE.md](LTC-COVERAGE.md) for the full page map and numerical limits. Each new issue archives all 29 coverage entries, source status and copied desk context. Historical tables retain their original October 2 qualification and do not become fresh measurements. Validate the entire manifest before release; preserve earlier JSON. This adds a complete reading structure, not new numeric source adapters. Routine publication must keep unqueried links, availability checks, dated software records and fresh accepted observations distinct.
