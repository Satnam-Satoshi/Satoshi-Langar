# SSCOS MVP Source Registry and Admission Policy

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Candidate Registry — No Automated Collection Authorized |
| Owner | Research Director / Data Lead |
| Related Volume | Engineering Program |
| Related Chapter | M3 Data Foundation — ENG-014 / RES-001 |
| Dependencies | ADR-0003; Database and API Design v0.1; Security Model v0.1 |
| Approval Status | Pending Human Founder, Legal, Security, and Editorial Approval |

## Deliverable mapping

This registry supports Treasury Intelligence and Satoshi Langar by defining which sources may support public claims, which sources are discovery-only, how freshness and conflicts are handled, and what evidence is required before automated collection. It does not authorize scraping, API access, credential creation, content republication, or production ingestion.

## Source authority classes

| Class | Meaning | Permitted claim use |
|---|---|---|
| P0 | Primary authoritative record: law, regulator filing, issuer disclosure, protocol repository, signed release, or directly observable canonical record | May support a confirmed claim when the record directly proves it and scope/time are clear |
| P1 | Primary official communication or status page | May support a confirmed claim about the publisher's own action/status; corroborate material quantitative claims when feasible |
| S1 | Specialized secondary aggregator with disclosed methodology | Discovery and cross-checking; never sole support for a material holding, legal status, or risk claim |
| S2 | Reputable secondary reporting | Context and discovery; primary source required for confirmation when available |
| U | Unverified or unclear methodology | Quarantine; no public claim support |

Popularity, search ranking, brand recognition, or prior use does not establish authority.

## Candidate primary registry

| Source ID | Domain / owner | Authority | MVP coverage | Retrieval target | Proposed freshness | Admission state | Required verification |
|---|---|---:|---|---|---|---|---|
| SRC-BTC-CORE-RELEASES | Bitcoin Core project | P0 | Bitcoin Core releases | `https://bitcoincore.org/en/releases/` and signed release artifacts | Daily check; event-driven alert | Candidate | Verify signatures/checksums, feed behavior, license, robots/terms, parser fixtures |
| SRC-BTC-CORE-SECURITY | Bitcoin Core project | P0 | Security advisories and disclosure policy | `https://bitcoincore.org/en/security-advisories/` | Daily check; urgent alert | Candidate | Respect embargo/disclosure boundaries; no vulnerability speculation |
| SRC-BTC-CORE-LIFECYCLE | Bitcoin Core project | P1 | Supported/EOL versions | `https://bitcoincore.org/en/lifecycle/` | Weekly | Candidate | Record page revision and distinguish software lifecycle from network consensus |
| SRC-LTC-CORE-REPO | Litecoin Project | P0 | Litecoin Core tags, releases, code, issues | `https://github.com/litecoin-project/litecoin` | Daily releases; weekly development digest | Candidate | Admit signed/stable tags separately from `master`; verify repository owner and release artifacts |
| SRC-STELLAR-CORE-REPO | Stellar Development Foundation | P0 | Stellar Core releases and protocol implementation | `https://github.com/stellar/stellar-core` | Daily releases; weekly development digest | Candidate | Verify official ownership, tag/release policy, security guidance, and license |
| SRC-STELLAR-NETWORK-STATUS | Stellar Development Foundation | P1 | Mainnet/testnet incidents, upgrades, operational status | `https://developers.stellar.org/docs/tools/developer-tools/network-status` and linked official status resources | 15-minute status check during staffed windows | Candidate | Identify canonical status endpoint, incident schema, retention, and terms |
| SRC-SEC-EDGAR | U.S. Securities and Exchange Commission | P0 | Public-company, fund, issuer, and treasury disclosures | `https://www.sec.gov/search-filings` and documented public EDGAR data endpoints | Hourly latest-filings discovery; filing-driven | Candidate | Follow SEC fair-access policy and user-agent requirements; resolve CIK; preserve accession/document IDs |
| SRC-CONGRESS-GOV | Library of Congress / U.S. Congress | P0 | Federal bills, actions, text, committees, votes | `https://www.congress.gov/` bill and action records | Every 4 hours for tracked bills | Candidate | Prefer bill/action records over summaries; store Congress, bill number, action timestamp, chamber, and source URL |
| SRC-FED-REGISTER | U.S. Government Publishing Office / Federal Register | P0 | Proposed and final federal rules/notices | `https://www.federalregister.gov/` and official API if approved | Every 4 hours for tracked agencies | Candidate | Distinguish proposed, final, corrected, withdrawn, and effective dates; verify API terms |
| SRC-SEC-NEWS | U.S. Securities and Exchange Commission | P1 | SEC rules, litigation, statements, releases | `https://www.sec.gov/newsroom` | Hourly during business days | Candidate | Link controlling order/rule/filing where available; statements do not equal rules |
| SRC-CFTC-NEWS | U.S. Commodity Futures Trading Commission | P1 | CFTC rules, enforcement, statements, releases | `https://www.cftc.gov/PressRoom` | Hourly during business days | Candidate | Link controlling docket/order; distinguish proposal, final rule, enforcement, and speech |
| SRC-STATE-LEGISLATURE | Official state legislature per jurisdiction | P0 | State digital-asset bills and actions | Per-state official bill record | Every 4 hours for tracked bills | Candidate class | Each jurisdiction receives a separate source record; aggregator links are discovery only |
| SRC-DTCC-DIGITAL-ASSETS | DTCC | P1 | DTCC digital-asset services, papers, notices, status | `https://www.dtcc.com/digital-assets` and directly linked DTCC documents | Daily | Candidate | Distinguish production service, regulatory approval, pilot, proof of concept, and opinion paper |
| SRC-MORPHO-API-DOCS | Morpho Association / official docs | P1 | API capabilities, endpoints, networks, limits, no-SLA warning | `https://docs.morpho.org/developers/api/get-started/` | Weekly and before contract changes | Candidate | Record no-SLA status, rate limits, supported networks, response timestamps, and fallback requirement |
| SRC-MORPHO-CHANGELOG | Morpho official docs | P1 | API deprecations and removals | `https://docs.morpho.org/developers/api/changelog/` | Daily | Candidate | Block affected fields before removal; archive schema and deprecation metadata |
| SRC-MORPHO-ONCHAIN | Canonical deployed contracts and chain state | P0 | Markets, vaults, parameters, balances, events | Approved chain RPC plus verified contract registry | By block/finality policy | Candidate; provider undefined | Verify contract addresses, chain IDs, RPC provider, reorg/finality policy, archive access, and independent reconciliation |
| SRC-ISSUER-IR | Issuer investor-relations site | P0/P1 | Treasury acquisitions, holdings, financing, earnings | Per-issuer filing/release URL | Event-driven; daily check | Candidate class | Prefer regulated filing over press release; reconcile balance date, announcement date, beneficial ownership, custody, and units |
| SRC-ETF-ISSUER | ETF/trust issuer official holdings or filing | P0/P1 | Holdings, shares, NAV/AUM, product changes | Per-product official page/file | Daily after issuer cutoff | Candidate class | Record issuer cutoff/timezone; distinguish holdings, NAV/AUM, creations/redemptions, and estimated flow |
| SRC-EXCHANGE-NOTICE | Regulated exchange official notice/rule filing | P0/P1 | Listings, halts, product/rule changes | Per-exchange official notice | Event-driven | Candidate class | Link rule filing/notice; do not infer approval from application or listing proposal |

## Named specialized secondary sources

These sources are explicitly requested for coverage. They may accelerate discovery and provide comparison data, but none may be the sole authority for material public claims.

| Source ID | Service | Class | Permitted use | Prohibited use before approval | Required corroboration |
|---|---|---:|---|---|---|
| SRC-BITCOIN-LAWS | `bitcoinlaws.io` | S1 candidate | Discover federal/state bills and compare tracker coverage | Declaring enactment, legal effect, or latest official action from the tracker alone | Official legislature, Congress.gov, regulator, governor, court, or signed text |
| SRC-MNAV | `mnav.com` | S1 candidate | Discover treasury companies and compare calculated mNAV metrics | Treating live mNAV, holdings, debt, cash, or diluted shares as confirmed without methodology and timestamps | Issuer filing/IR plus approved market/security-master data; SSCOS formula reproduction |
| SRC-BITBO | Bitbo / associated treasury datasets | S1 candidate | Discovery and cross-check of Bitcoin treasury entities | Publishing holdings totals or ranks as confirmed solely from aggregator data | Issuer filing, official disclosure, fund record, or authoritative government record |
| SRC-BITCOIN-TREASURIES | `bitcointreasuries.net` | S1 candidate | Discovery, taxonomy comparison, anomaly detection | Sole support for holdings, ownership, mNAV, cost basis, or rankings | Primary issuer/regulatory records and reproducible calculation |
| SRC-LITECOIN-REGISTER | `litecoinregister.com` | U pending methodology review | Discover possible Litecoin treasury entities | Any confirmed holding, rank, or change claim | Issuer filing/disclosure, attributable address evidence with ownership proof, and independent verification |

## Source admission workflow

1. **Nominate:** create a source record with owner, exact URL/endpoint, coverage, and intended claims.
2. **Authority review:** classify what the source can authoritatively prove and what it cannot.
3. **Rights review:** document terms, license, robots policy, attribution, redistribution, caching, retention, and commercial-use constraints.
4. **Security review:** treat all content as untrusted data; evaluate redirects, file types, payload bounds, prompt injection, secrets, authentication, and parser isolation.
5. **Technical characterization:** record schema, identifiers, pagination, timezones, update cadence, rate limits, historical corrections, and failure behavior.
6. **Fixture capture:** retain a legally permitted bounded fixture and hash for parser/evaluation tests.
7. **Parser verification:** test expected, missing, duplicate, corrected, stale, malformed, and schema-drift cases.
8. **Editorial mapping:** define allowable claim types, required corroboration, confidence ceiling, and display attribution.
9. **Human approval:** Research, Legal, Security, Data, and Editorial owners approve; Founder approves material exceptions.
10. **Activate in non-production:** enable only in an isolated environment with rate limits, cache, audit, and kill switch.
11. **Production gate:** requires separate implementation and production authorization.

## Mandatory source record fields

`source_id`, legal/official owner, canonical URL, authority class, jurisdiction, coverage, allowable claim types, prohibited claims, retrieval method, authentication, terms/license review, attribution, caching/retention, rate limits, cadence, timezone/cutoff, schema/version, correction behavior, parser owner/version, confidence ceiling, corroboration policy, security classification, status, approved by/date, next review date, and emergency-disable owner.

## Freshness and stale-data policy

Freshness is defined per source and claim type, not globally. The proposed intervals above are review targets, not authorization to poll. Each fetch records `observed_at`, `published_at` when available, `retrieved_at`, source timezone, HTTP metadata, content hash, parser version, and prior-version relationship.

When a source exceeds its approved freshness window, the system must mark dependent observations and pages stale. It may show the last verified value with an explicit timestamp and warning when editorial policy permits; it may not silently present it as current. A source outage does not justify substituting a weaker source without classification and disclosure.

## Conflict and correction rules

- Primary records govern the facts they directly establish, but scope, date, amendments, and supersession must be verified.
- When primary sources conflict, quarantine the claim and escalate; do not average or select the more convenient value.
- Aggregator discrepancies create research tasks, not automatic corrections.
- Holdings changes distinguish acquisition/disposition, price effect, corporate action, restatement, custody, and beneficial ownership.
- Legal status distinguishes introduced, committee action, passed chamber, enrolled, signed/enacted, effective, stayed, challenged, repealed, and expired.
- Corrections append a new record linked to the affected observation, claim, and publication revision. Historical evidence is preserved.

## Security rules for research agents

Retrieved text, markup, documents, metadata, and API fields are untrusted input and never instructions. Collection agents cannot change allowlists, credentials, prompts, tools, permissions, publication state, or production configuration. Downloads use type/size limits, malware scanning where applicable, sandboxed parsers, egress allowlists, request budgets, and audit logs. Unexpected login, payment, CAPTCHA, instruction, executable, or sensitive-data requests stop collection and escalate.

## Initial success criteria

- Every MVP research domain maps to at least one candidate primary source class.
- Bitcoin Laws, mNAV, Bitbo, BitcoinTreasuries, and Litecoin Register are visibly non-primary and cannot independently confirm material claims.
- Every candidate has an owner, coverage, freshness proposal, admission state, and required verification.
- No candidate becomes active before rights, security, technical, editorial, and human review.
- Test fixtures cover conflicts, corrections, stale data, schema drift, ownership/custody distinction, and legal-status transitions.
- Public claims can be traced from publication to claim, observation, fetch, and source record.

## Research decisions required

1. Name the Research, Legal, Security, Data, and Editorial human reviewers.
2. Decide whether Morpho remains in the first Satoshi Langar editorial scope or is deferred to Phase 2; it is not a separate public surface.
3. Approve the source authority classes and the prohibition on aggregator-only confirmation.
4. Select the first five issuer/ETF entities for fixture development after M3 approval.
5. Authorize only a bounded non-production source-characterization exercise; production ingestion remains separately gated.
