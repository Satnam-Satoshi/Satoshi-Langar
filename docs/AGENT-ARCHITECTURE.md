# Satnam Satoshi Intelligence Agent Architecture

## 1. Mission

Build a transparent, auditable agent system that converts public and licensed digital-asset data into a daily institutional intelligence product covering BTC, LTC, XLM, sovereign adoption, ETF flows, treasuries, banking activity, U.S. regulation, and Morpho markets.

The architecture follows four principles:

1. **Truth:** every material assertion carries provenance, time, and confidence.
2. **Seva:** the free layer serves the public before the commercial layer monetizes advanced analysis.
3. **Sovereignty:** humans retain custody, consent, and editorial authority.
4. **Separation of duties:** no single agent may collect, approve, publish, and receive payment without independent controls.

## 2. Phase 1 boundaries

Phase 1 agents may:

- retrieve approved public data
- parse and normalize observations
- calculate changes and ratios
- reconcile conflicting sources
- draft general and impersonal research
- publish reports after automated and human checks
- meter paid access to reports and APIs

Phase 1 agents may not:

- request, store, or reveal seed phrases or private keys
- place trades or rebalance portfolios
- borrow, supply, withdraw, bridge, or liquidate assets
- provide portfolio-specific recommendations
- promise returns, yields, or loss avoidance
- publish unverified rumors as facts
- bypass paywalls, access controls, robots restrictions, or source terms

## 3. Agent topology

### A. Source Scout Agent

**Purpose:** retrieve content from an allowlisted source registry.

**Inputs**

- source ID
- retrieval URL or API endpoint
- permitted retrieval method
- expected freshness
- asset and sector tags

**Outputs**

- retrieval timestamp
- raw-content hash
- HTTP metadata
- parser version
- extracted observations
- collection warnings

**Controls**

- domain allowlist
- request throttling and caching
- source-specific parsers
- no authentication circumvention
- automatic quarantine on schema drift

### B. ETF Flow Agent

**Purpose:** normalize creations, redemptions, net flows, AUM, holdings, issuer data, and country/product classification.

**Required fields**

- date and reporting timezone
- product and ticker
- issuer
- domicile and exchange
- asset
- net flow in native units and USD
- reported holdings
- AUM/NAV where available
- source and confidence

**Reconciliation rule:** distinguish daily flow, estimated flow, holdings change, price effect, and corporate action. Never infer a flow from AUM movement without labeling the estimate.

### C. Treasury Ledger Agent

**Purpose:** maintain an entity-resolved ledger for corporate, fund, bank, sovereign, government, and other institutional holdings.

**Required fields**

- canonical entity ID and aliases
- entity type
- country
- asset
- confirmed balance
- estimated balance, if separately disclosed
- effective date
- announcement date
- source document
- transaction/change type
- confidence and verification status

**Entity-resolution rule:** subsidiaries, funds, custodians, beneficial owners, and issuers must not be double-counted.

### D. Policy and Sovereign Agent

**Purpose:** monitor Bitcoin Laws, Congress, federal agencies, courts, U.S. states, and foreign jurisdictions.

**Required fields**

- jurisdiction
- bill/order/rule identifier
- title
- legislative or regulatory stage
- latest action and date
- sponsor or issuing authority
- assets and sectors affected
- primary source
- next known procedural milestone

**Editorial rule:** clearly separate enacted law, passed chamber, committee action, introduced proposal, executive statement, and media speculation.

### E. Network Intelligence Agent

**Purpose:** track Bitcoin, Litecoin, and Stellar technical, governance, infrastructure, and ecosystem developments.

**Coverage**

- releases and repositories
- protocol proposals
- network activity and fees
- mining/validator or consensus changes
- custody and institutional infrastructure
- payments, stablecoins, tokenization, and RWA activity
- material security incidents

**Source priority:** official repositories, foundation/developer documentation, issuer filings, and transaction-level evidence before secondary reporting.

### F. Morpho Risk Agent

**Purpose:** monitor Morpho markets and vaults relevant to cbBTC and cbLTC without executing transactions.

**Metrics**

- chain and market ID
- loan asset and collateral asset
- oracle and interest-rate model
- LLTV
- supply and borrow assets/USD
- liquidity and reallocatable liquidity
- utilization
- supply APY and borrow APY
- rewards APR
- vault allocations and curator
- position health metrics when a public address is explicitly enrolled

**Risk flags**

- utilization spike
- liquidity deterioration
- rapid APY change
- oracle or collateral concentration
- curator/allocation change
- reward-driven headline yield
- API deprecation warning
- stale data or missing history

**Critical control:** the Morpho API has no SLA; production reporting must cache responses, store retrieval time, monitor deprecation warnings, and implement a fallback or stale-data status.

### G. Verification and Provenance Agent

**Purpose:** approve or quarantine claims before publication.

**Checks**

- source freshness
- primary-source availability
- arithmetic and unit conversion
- duplicate and circular sourcing
- entity-resolution conflicts
- material discrepancy thresholds
- estimate labeling
- timestamp and timezone consistency
- citation completeness

**Confidence scale**

- **A — Confirmed:** primary source or independently corroborated transaction/filing.
- **B — High confidence:** reputable direct aggregator with consistent methodology.
- **C — Provisional:** one credible source, pending corroboration.
- **D — Estimate:** modeled or inferred; must be visibly labeled.
- **Q — Quarantined:** conflict, stale source, parser failure, or insufficient evidence.

### H. Editor and Publisher Agent

**Purpose:** transform verified observations into a reproducible daily report.

**Outputs**

- one-page executive summary
- full web report
- PDF edition
- structured JSON/CSV dataset
- correction log
- free community brief
- subscriber edition

**Publication gate**

A report may publish only when:

- all headline figures have provenance
- all material conflicts are disclosed or quarantined
- no personalized recommendation is present
- stale sections are visibly marked
- legal and editorial disclaimers are attached

### I. Commerce Agent

**Purpose:** manage product access and machine-to-machine payments.

**Initial capabilities**

- subscription entitlement checks
- report download metering
- x402 payment requirements for API endpoints on Base Sepolia
- invoices and payment-reconciliation records
- refund and exception queue for human review

**Restrictions**

- separate operational payment wallet from treasury wallets
- no trading permissions
- per-request and daily limits
- no automatic transfer from revenue wallet to investment strategies
- production payments only after sandbox, tax, accounting, and legal review

## 4. Orchestration flow

1. Scheduler creates a report run.
2. Source Scout retrieves only due sources.
3. Domain agents normalize observations.
4. Treasury Ledger performs entity resolution and deduplication.
5. Verification Agent assigns confidence and quarantines conflicts.
6. Editor Agent calculates dashboards and drafts narratives.
7. Automated quality gate validates required sections and citations.
8. Human Mission Control approves the institutional edition.
9. Publisher releases free and paid editions.
10. Commerce Agent records access and revenue.
11. Corrections remain append-only and linked to the original report.

## 5. Data model

Core tables planned for Postgres/Supabase:

- `sources`
- `source_fetches`
- `observations`
- `entities`
- `entity_aliases`
- `holdings_snapshots`
- `holding_changes`
- `etf_flows`
- `legislation_events`
- `network_events`
- `morpho_market_snapshots`
- `claims`
- `claim_sources`
- `report_runs`
- `report_sections`
- `corrections`
- `subscriptions`
- `payments`
- `audit_events`

Every quantitative row must include `observed_at`, `retrieved_at`, `source_id`, `parser_version`, `confidence`, and `raw_content_hash` where legally and technically permitted.

## 6. Monetization sequence

### Stage 1 — community validation

- free daily brief
- email and web distribution
- source-linked corrections
- waitlist for Pro edition

### Stage 2 — paid publication

- Pro report subscription
- historical dashboards
- PDF/CSV exports
- watchlists and saved views that do not give personalized investment recommendations

### Stage 3 — agent economy

- x402-protected data endpoints
- pay-per-query treasury and policy lookups
- enterprise data feeds
- licensed white-label reports

## 7. Governance

- The user retains Mission Control approval and all keys.
- Agent prompts, parser versions, formulas, and source changes are versioned in Git.
- Material methodology changes require a changelog entry.
- Revenue, treasury, charitable funds, and agent operating funds remain segregated.
- Community corrections are accepted but require evidence and verification.

## 8. Immediate build order

1. source registry and retrieval policy
2. normalized TypeScript data contracts
3. daily-run API with secret authentication
4. source adapters for Bitcoin Laws, Bitbo, mNAV, Litecoin Register, official ETF/issuer data, Congress/regulators, network repositories, and Morpho GraphQL
5. Postgres persistence and immutable provenance records
6. executive report renderer
7. subscriber authentication and email delivery
8. Base Sepolia x402 paid endpoint
9. monitoring, audit dashboard, and correction workflow
10. production legal, security, tax, and accounting review