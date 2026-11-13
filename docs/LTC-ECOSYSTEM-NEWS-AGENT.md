# Cloud ecosystem news desk

## Status and ownership

This change adds a **read-only research stage to the existing daily cloud publisher**. It does not install a second scheduled workflow, publish to X, change Buffer, add credentials, or activate new permissions. The scanner is not live merely because this code or this document exists.

The existing main workflow owns the daily schedule, durable admission, private journal, candidate build, publication and public readback. Its current update template is `ops/ltc-daily-workflow.yml`. Multiple scheduled triggers are retry/admission opportunities for the same daily issue, not independent writers. No Mac, browser session, locally signed-in app or LLM API credential is required by this scanner.

Activation requires coordinated code review, updated accepted implementation digest/source pin, and the corresponding main workflow's routine-data classifier. If a one-shot software-release template is integrated, its embedded classifier must be updated too. Do not create another cron, auto-merge this branch, or weaken digest/lease/public-readback gates. Existing same-day editions and curated selections remain immutable.

## The daily handoff

`prepareObservations()` now performs:

1. Existing bounded base/intelligence/policy/community/builder collection.
2. `collect-ltc-ecosystem.mjs`: reuse the verified builder, community and policy snapshots, fetch the reviewed additional sources, read prior archived reports and accepted edition history, then write a private normalized report plus private raw evidence.
3. Existing all-observation validation, now including the ecosystem report.
4. `archive-ltc-ecosystem.mjs`: create one add-only `content/ltc-ecosystem/YYYY-MM-DD.json` report after validation. A second same-day attempt preserves the first report and reads that exact archive back to a private selected-report file; both downstream consumers use it, even after an interrupted attempt.
5. Existing daily features, flagship edition and source desk. Fresh relevant events feed their existing schemas, not a new publication destination. The existing publisher remains solely responsible for committing and releasing these records.

A report contains source identities/status, full-response SHA-256 references, original publication dates, checked timestamps, unknown effective dates, relevance reasons, event IDs, prior-observation and prior-edition flags, category coverage and explicit gaps. The date belongs to `America/New_York`. Raw HTML/JSON/plain-text bytes and retrieval receipts remain outside the checkout in the run's private evidence directory. Raw article bodies never become newspaper prose or public Git files.

## Source registry and boundaries

`config/ltc-ecosystem-watch.json` is the reviewable registry. At introduction the desk combines 7 existing source endpoints with 12 additional endpoints:

- Litecoin Core upstream releases; Foundation announcements, project directory and Nexus releases.
- LitVM and Luxxfolio announcements; LitVM status/configuration and testnet directory.
- Greywick cLTC and LuxxPool references; F2Pool announcements.
- Lite Strategy issuer announcements; Canary and Grayscale product-page change watches.
- Strike payments announcements, plus the existing SEC and CFTC official feeds.

Coverage reports expose 11 editorial categories: core, wallets, privacy/security, builders, scaling, payments, mining, institutions, ETF/trust products, policy and community. A category may have zero accepted events. This is broad **bounded coverage**, not complete access to every project, X account, exchange or chain. Strike is adjacent payments infrastructure, not evidence that it supports Litecoin. ETF/trust pages do not authorize holdings, flows, NAV or price claims; those stay with the existing separately validated financial-data collectors.

The 97-entry researched project inventory and individual X posts are discovery/editorial inputs, not automatically trusted live products. The collector does not recursively crawl a directory or follow arbitrary source-supplied URLs. New adapters and endpoints require a reviewed registry change. A later editorial special can use verified original sources without replacing this daily writer.

### Non-fetching treasury research checklist

`config/ltc-editorial-references.json` registers mNAV and Bitbo as manual-review discovery links, not fetched sources. Each newly collected daily report includes the exact checklist and explicit gaps carried into daily features and the source desk. Neither URL is requested, hashed, counted as retrieved coverage, or admitted as a candidate event. There is no access timestamp, current numeric snapshot, licensed API entitlement or live-feed claim. Material treasury claims must be checked against dated issuer disclosures; date added, purchase date and reported holdings are distinct, and holdings changes are not fund flows. Bitbo scraping restrictions are not bypassed.

The checklist is separate from the fetched-source registry. Existing dated reports remain byte-identical and valid, including same-day archive readback. They do not retroactively acquire the new checklist. Automated retrieval would require separate terms/access review and a reviewed adapter, not just changing a checklist label.

## What may become news

- Only an original publisher date in supported article metadata, an authenticated-by-origin upstream release record, or an already validated existing collector record can create a dated event. A page's `dateModified`, retrieval timestamp, search snippet, a directory listing or a body hash change cannot.
- Original publication time is retained. `effectiveAt` remains null unless a future separately reviewed adapter establishes it. Each automated event retains `productStage: not-established-by-this-scan` and `editorialReviewRequired: true`. Words such as testnet, mainnet or non-binding are signals to inspect, not verified deployment conclusions.
- Relevant candidates are within seven publication-calendar days, not future-dated, and absent from the sources actually cited by accepted prior editions. Prior research alone does not count as publication.
- Event identity normalizes the canonical URL plus publication calendar day in the issue timezone. Explicit date-only publisher dates retain their stated day; timestamped records use America/New_York, including UTC-midnight and daylight-saving boundaries. The original timestamp is never overwritten. Canonical URL deduplication also happens before the feature cap. Reposts on different publisher URLs still require editorial event matching; the report discloses that limitation.
- An index admits at most three linked same-origin articles, discovered in publisher order. Four concurrent workers, two-megabyte responses and 15-second request deadlines bound the new collector. The additional registry is not a promise that every index item was scanned.
- Existing features remain attributed source-watch prose, not an invented independently reported article. No accepted fresh event yields a transparent “dated check, with visible gaps” feature. Old context is not relabeled as today's news.

## Failure behavior and safety

A 403, unsupported schema/date, blocked redirect, timeout, oversized response or unavailable source becomes an explicit gap. No access bypass, guessed fallback story or fabricated publication date is used. Only transient 429/500/502/503/504 responses receive one retry, with at most five seconds of Retry-After. A 200 “Site Unavailable” error document is not counted as successful source retrieval. Reference documentation may be HTML, Markdown or plain text; article date parsing still requires the supported HTML contract.

Evidence-write failure, invalid snapshot, invalid history, archive collision or publication stop fails closed. Partial evidence is retained. Source text is treated only as data: no script execution, instruction following, credentials, forms or outbound messages. The existing daily writer's uncertain-outcome recovery, idempotency and public-readback rules remain unchanged. No implementation can guarantee zero future failures.

## Local verification and live cutover

Run the focused tests with the project's pinned Node version:

```sh
node --test scripts/test-cloud-ltc-ecosystem.mjs scripts/test-ltc-daily-features.mjs scripts/test-ltc-source-desk.mjs scripts/test-cloud-ltc-release.mjs
```

The collector CLI accepts only existing bounded snapshot files and new output/evidence paths:

```sh
node scripts/collect-ltc-ecosystem.mjs \
  --builders /private/run/builders.json \
  --community /private/run/community.json \
  --policy /private/run/policy.json \
  --output /private/run/ecosystem.json \
  --evidence-dir /private/run/ecosystem-raw
```

This command alone does not archive or publish. Preserve a failed/partial directory; use a new run directory after investigating. Do not replace stale inputs with invented timestamps.

Before calling the scanner live: review source/parser fixtures and live gaps; run the full cloud suite with the pinned CLI/dependencies; combine concurrent software changes; update all trusted classifier copies and digest pins together; exercise the existing dry-run path; then inspect the next admitted run's private evidence, archived report, issue/source-desk output and public readback. The user-facing status should distinguish implemented, tested, deployed and verified scheduled execution.
