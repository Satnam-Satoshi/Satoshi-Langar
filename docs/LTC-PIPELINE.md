# LTC publication and daily-source pipeline

September 30, 2026. Lunch Time Conversations is the project's original magazine: political/public-record coverage, Bitcoin and Litecoin network analysis, ETF/ETP and treasury research, and community reporting. It is not an affiliate of Strategy, Litecoin Register, or any cited issuer. Institutional research is a quality target, not an audit or certification claim.

## Built in this revision

- `/conversations/`: editorial magazine, first explainer link, source desk, stored observation cards, source status and contributor path.
- `/conversations/methodology/`: substantive mNAV explainer, fictional teaching calculation, source-time/fetch-time distinction, editorial classifications and correction policy.
- `config/ltc-sources.json`: six named public sources; primary and secondary sources distinguished.
- `scripts/collect-ltc.mjs`: portable Node 22 collector using built-ins. IBIT CSV and Bitcoin Core release JSON have deterministic parsers. Strategy, CoinShares, SEC and Litecoin Register have availability checks, not numeric/headline extraction.
- `public/data/ltc-snapshot.json`: last executed source check, including per-source outcome, exact retrieval time, hash and parsed source effective dates. Failures produce null observations.
- `scripts/test-ltc.mjs`: offline checks for dates, precision, identity, missing fields, failed requests, response limits and reproducibility.

No account, scheduler, newsletter service, existing feed, payment integration or external publication is connected by this change. No recurring publication cadence is represented as active. An existing publication archive can be imported later if the founder provides its canonical source and rights.

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

## First network verification

At `2026-09-30T06:17:00.467Z`, the live collector retrieved and parsed IBIT holdings effective September 28, 2026 and the Bitcoin Core v31.1 release published July 8, 2026. CoinShares and Litecoin Register reference retrievals succeeded. Strategy and SEC returned HTTP 403; their observations remain null. No blocked source was bypassed. The current explainer's manual source review used publicly accessible official documentation separately from the collector.

## Daily operating plan — not activated

1. Name a human editor and a source-maintenance owner; record backup/absence coverage and a stop procedure.
2. Run the collector daily on a portable runner. Set the scheduler to America/New_York and document daylight-saving behavior. Exact time should fit editorial review, with the daily reading edition as the target.
3. Create a candidate snapshot/edition change. Verify source dates, identities, status and hashes. Check missing sections rather than filling them with inferred numbers.
4. The human editor selects policy/network stories, separates reported facts from interpretation/opinion, and accepts publication. An agent can draft and flag discrepancies; it cannot impersonate that review.
5. Build and deploy the approved snapshot and edition. Add RSS only for actual accepted editions, with canonical links and correction versions.
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
