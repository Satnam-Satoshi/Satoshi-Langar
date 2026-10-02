# LTC publication and daily-source pipeline

Updated October 1, 2026. Lunch Time Conversations is the project's original magazine: political/public-record coverage, Bitcoin and Litecoin network analysis, ETF/ETP and treasury research, and community reporting. It is not an affiliate of Strategy, Litecoin Register, or any cited issuer. Institutional research is a quality target, not an audit or certification claim.

## Built in this revision

- `/conversations/`: original newspaper-inspired magazine, seven discoverable desks, morning/evening reading paths, source desk, stored observations and contributor path. Reading paths are not scheduled editions.
- `app/data/magazine.ts` and `/conversations/read/[slug]/`: seven substantive original explainers, analyses and field guides, each with AI-prepared/review-pending status, section citations and source notebook.
- `/conversations/events/`: dated organizer-announced global events with exact official links, source-check date and no arranged attendance; unconfirmed sources remain undated directory entries.
- `/conversations/archive/`: archive of the actual prepared pieces, with dates and status.
- `/conversations/feed.xml`: static RSS of editorial previews, explicitly labeled. No invented publication timestamp or completed human review.
- `/conversations/methodology/`: substantive mNAV explainer, fictional teaching calculation, source-time/fetch-time distinction, editorial classifications and correction policy.
- `config/ltc-sources.json`: six named public sources; primary and secondary sources distinguished.
- `scripts/collect-ltc.mjs`: portable Node 22 collector using built-ins. IBIT CSV and Bitcoin Core release JSON have deterministic parsers. Strategy, CoinShares, SEC and Litecoin Register have availability checks, not numeric/headline extraction.
- `public/data/ltc-snapshot.json`: last executed source check, including per-source outcome, exact retrieval time, hash and parsed source effective dates. Failures produce null observations.
- `scripts/test-ltc.mjs`: offline checks for dates, precision, identity, missing fields, failed requests, response limits and reproducibility.

Daily source collection and candidate drafting are active as a bounded preparation workflow. Automatic daily publication is inactive. No newsletter service, third-party publication feed or payment integration is connected by this magazine change. The new RSS distributes only this project’s explicitly labeled editorial previews; it is not an imported feed or an automatically scheduled publication. No recurring publication cadence is represented as active. An existing publication archive can be imported later if the founder provides its canonical source and rights.

## Run locally

From the repository root with Node 22:

```sh
node scripts/test-ltc.mjs
node scripts/collect-ltc.mjs
pnpm check
```

The collector needs network access to six hard-coded public HTTPS URLs. It accepts no user-supplied endpoint, uses no credentials, refuses redirects, times out after 15 seconds per source, caps each response at 2 MB, and does not execute source HTML. It writes normalized observations and source hashes, not downloaded third-party pages. `--stdout` prints the JSON instead of saving it. No outbound message, deployment or financial action occurs.

Exit 0 means at least one source returned a successful collection/reference retrieval; it does **not** mean every desk is ready to publish. Inspect `failureCount` and per-source `status`. Exit 2 means all sources failed. Exit 1 means a configuration/CLI error. A `reference-retrieved` source has no validated numbers merely because its page loaded.

The snapshot renders at build time. A successful collector run alone does not update a deployed website. Rebuild, review the changes, and use the normal authorized deployment process. Git stores reviewed snapshots/editions and correction history. The collector overwrites the local latest snapshot; it does not provide an immutable raw-source archive. Add authorized archival storage before claiming full historical reproducibility.

## Collection history and manual research

The manually researched October 1 articles have their own exact source citations and effective-date qualifications. They do not inherit the collector’s success/failure status. See `docs/LTC-EDITORIAL.md` for evidence, ownership, source rights and known gaps. No collected issuer holdings figure is used as a current portfolio recommendation.

## First network verification

At `2026-09-30T06:17:00.467Z`, the live collector retrieved and parsed IBIT holdings effective September 28, 2026 and the Bitcoin Core v31.1 release published July 8, 2026. CoinShares and Litecoin Register reference retrievals succeeded. Strategy and SEC returned HTTP 403; their observations remain null. No blocked source was bypassed. The current explainer's manual source review used publicly accessible official documentation separately from the collector.

## Daily operating plan — preparation active, publication inactive

1. Name a human editor and a source-maintenance owner; record backup/absence coverage and a stop procedure.
2. The active daily preparation workflow runs source checks and prepares candidate work. Keep its schedule/time zone and daylight-saving behavior documented with the automation. A candidate run is not authorization to publish an edition.
3. Create a candidate snapshot/edition change. Verify source dates, identities, status and hashes. Check missing sections rather than filling them with inferred numbers.
4. The human editor selects policy/network stories, separates reported facts from interpretation/opinion, and accepts publication. An agent can draft and flag discrepancies; it cannot impersonate that review.
5. Build and deploy the authorized snapshot and edition. The current RSS contains explicitly labeled editorial previews. Change an item to a reviewed publication only after a named human acceptance record exists; preserve canonical links and correction versions. Do not relabel old drafts as approved retroactively.
6. Monitor sustained relevant collection failures, methodology drift and overdue editorial work. Do not send routine success spam. Preserve prior valid editions with original dates if a current collection fails.

A future policy may authorize deterministic factual snapshots without per-edition review. That requires explicit human policy ownership, tests, bounded permissions, automated labeling and a correction path. It is not enabled here. Nostr/IPFS mirrors are optional downstream distribution, not the only canonical archive.

## Data rules

- Never equate a retrieval timestamp with a source date. Date-only source records remain date-only; do not invent a closing timestamp.
- Values are decimal strings; missing values are null. Do not treat stale/missing as zero, or holdings changes as ETF flows.
- IBIT holdings use an illustrative four-calendar-day stale threshold at collection time. This is conservative, not an exchange-calendar engine. Calendar-aware rules and live age alerts are not yet implemented.
- Public site observations are attributed snapshots, not current quotes. No ETF flow, ETP flow, company mNAV, company ranking or claimed portfolio coverage is calculated.
- Cross-listed ETPs require ISIN-level deduplication. Custody, company ownership, fund assets and wrapped reserves must remain distinct.
- Source rights/terms need review before broader automated extraction or redistribution. Official HTML is not a stable or licensed bulk-data API by default.
- Litecoin Register is a secondary attributed source; no affiliation or complete dataset integration is implied.

## mNAV methodology gate

[Strategy's official notes](https://www.strategy.com/notes) record a July 23, 2026 definition change. A new ratio must specify numerator, denominator, debt/preferred/cash treatment, basic/diluted shares and source dates. Do not splice incompatible formulas. Do not both subtract a convertible as debt and include its converted shares without an explicit scenario. Non-positive denominators are not meaningful valuation multiples.

Activation tests: matched dates and units; source-backed inputs; treatment of debt and dilution; formula-version boundary; missing input; denominator zero/negative; source revisions; no recommendation generated. Current page teaches the method without publishing a live ratio.

## Next sources and editorial desks

| Desk | Canonical evidence | Next acceptance gate |
| --- | --- | --- |
| Politics & public record | [Congress.gov](https://www.congress.gov/), [SEC](https://www.sec.gov/newsroom/press-releases), [CFTC](https://www.cftc.gov/PressRoom/PressReleases) | Exact action/date/jurisdiction/status, source link and human framing review; clearly label political opinion. |
| Bitcoin/Litecoin network analysis | [Bitcoin Core](https://bitcoincore.org/en/releases/), [Litecoin Core](https://github.com/litecoin-project/litecoin/releases), independently operated nodes where available | Release IDs and node observation method; no invented network telemetry. |
| ETF/ETP | [iShares IBIT](https://www.ishares.com/us/products/333011/ishares-bitcoin-trust-etf), [CoinShares BITC](https://coinshares.com/etp/physical-bitcoin/) | Product identity, dated fields and documented flow methodology; parser rights and calendar tests. |
| Treasury/mNAV | [SEC public APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), issuer filings/definitions | Verified CIK, accounting period, debt/dilution treatment, formula versions. |
| Litecoin holdings | [Litecoin Register methodology](https://www.litecoinregister.com/help/), issuer disclosures | Verify each row against original records, prevent ownership/custody double counts, obtain appropriate data access. |
| Community | Named organizer, consented interview and service records | Human accountability and privacy review; no fabricated activity or beneficiary testimony. |

The magazine is general, impersonal education and research. Keep individual trading, borrowing and portfolio instructions outside the publication workflow.

## Static magazine integration and validation

The pages render without client-side data fetching, accounts, trackers or forms. `generateStaticParams()` exports the seven article routes. The RSS route uses `dynamic = 'force-static'`; the portable exporter must preserve the exact `conversations/feed.xml` output as well as the existing source snapshot. `app/conversations/magazine.module.css` scopes the editorial design, includes mobile layouts, visible focus states and print styles. No remote font or borrowed news photography is required.

Verification should include TypeScript, the full static build/link check, desktop/mobile visual review, every article route, source-notebook links, morning/evening anchors, the archive, valid RSS XML and preview labels. Confirm no exported page requires client scripts. The current magazine adds no data adapter and changes no collector permission boundary.

The broader publication-provenance specification remains a target: this implementation has no PDF rendering, signed manifest, complete raw-source archive, immutable edition snapshots or independent audit. A rigorous daily research service needs those reviewable capabilities before it claims them.
