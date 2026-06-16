# Satnam Satoshi Daily Institutional Intelligence Report

## Purpose

Produce a reproducible daily publication that separates confirmed facts, estimates, interpretation, and opinion. The report serves institutions, analysts, builders, communities, and autonomous agents while remaining general and impersonal.

## Report identity

Each edition must include:

- report date and cutoff time in America/New_York
- report run ID
- data freshness timestamp by section
- methodology version
- editor status: automated draft, reviewed, or corrected
- correction history

## Page 1 — Executive Summary

### Required content

- BTC, LTC, and XLM spot snapshot
- 24-hour, 7-day, 30-day, and year-to-date context
- daily and weekly ETF net flows
- largest confirmed treasury changes
- sovereign/policy changes
- Morpho cbBTC/cbLTC risk changes
- top network developments
- five most material risks
- five most material opportunities or positive developments
- confidence grade for each headline

### Executive scorecard

Scores range from 0 to 100 and are descriptive, not trading signals.

- institutional accumulation
- ETF demand
- sovereign/policy momentum
- network health and adoption
- liquidity and market structure
- regulatory clarity
- Morpho collateral-market conditions
- data confidence

Every score must expose its components and formula version.

## Section 1 — Market and Flow Dashboard

For BTC, LTC, and XLM:

- spot price and market capitalization
- realized and implied volatility where licensed data is available
- volume and liquidity notes
- exchange balance or flow metrics where methodologically defensible
- derivatives observations where licensed data is available

Do not present price targets in Phase 1.

## Section 2 — ETF and Exchange-Traded Product Flows

### Product table

- date
- asset
- ticker
- product name
- issuer
- country/domicile
- exchange
- vehicle type
- net daily flow in USD
- weekly, monthly, and YTD flow
- holdings in native units
- AUM/NAV
- source
- confidence

### Reconciliation notes

Explicitly distinguish:

- reported primary-market flow
- estimated flow
- holdings change
- price-driven AUM change
- in-kind versus cash mechanisms
- restatements or delayed reporting

## Section 3 — Treasury and Institutional Holdings

### Entity classes

- public companies
- private companies where disclosures are reliable
- ETFs, trusts, and funds
- banks and broker-dealers
- custodians, without treating custody assets as beneficial ownership
- governments and sovereign entities
- pension and insurance entities
- mining and infrastructure companies

### Required views

- total confirmed holdings by asset
- holdings by country
- holdings by entity class
- largest daily/weekly/monthly changes
- top holders
- new entrants and exits
- mNAV and financing observations for public treasury companies
- debt/equity issuance used to acquire digital assets
- source discrepancies and double-counting controls

## Section 4 — Sovereign and Country Tracker

For each jurisdiction:

- confirmed government holdings
- source and valuation date
- seizure-derived versus purchased holdings
- reserve policy
- legal-tender or payment status
- mining or energy policy
- custody arrangements when disclosed
- pending legislation and latest action
- central-bank or finance-ministry statements

Never describe seized holdings as strategic reserves unless an authoritative policy converts them to that status.

## Section 5 — Wall Street, Banks, and Capital Markets

Track:

- SEC and equivalent filings
- balance-sheet holdings
- ETF sponsorship and custody
- lending, trading, clearing, and tokenization services
- research coverage
- debt/equity financing linked to treasury strategies
- accounting and risk disclosures
- DTCC and market-infrastructure developments

Separate beneficial ownership, client custody, collateral, and trading inventory.

## Section 6 — Bitcoin Network and Ecosystem

- core software and major implementation releases
- BIPs and developer discussion
- mining difficulty, hash rate, fee market, mempool, and Lightning metrics
- institutional custody and settlement
- security incidents and vulnerabilities
- adoption and payments developments

## Section 7 — Litecoin Network and Ecosystem

- Litecoin Core and MWEB developments
- hash rate, difficulty, fees, transaction activity, and mining economics
- ETF/trust/treasury adoption
- cbLTC and wrapped/custodial representations
- payments and merchant integrations
- Litecoin Register holdings table with `date`, `entity`, `category`, `ltc_balance`, `rank`, `change_24h`, `change_7d`, and `change_30d`

## Section 8 — Stellar Network and Ecosystem

- protocol and validator developments
- Soroban activity
- stablecoins and payments
- MoneyGram and remittance infrastructure
- tokenized funds, securities, and RWAs
- DTCC or regulated-market infrastructure developments
- issuer and anchor updates
- network activity and fee observations

## Section 9 — U.S. Regulatory and Legislative Intelligence

Track at minimum:

- CLARITY Act status and exact latest legislative action
- GENIUS/stablecoin legislation and implementation
- SEC and CFTC rules, enforcement, guidance, and speeches
- Treasury, Federal Reserve, OCC, FDIC, and FinCEN actions
- state strategic reserve and digital-asset legislation
- relevant court decisions

Each item must state whether it is enacted, final, proposed, introduced, passed one chamber, under committee consideration, stayed, challenged, or merely discussed.

## Section 10 — Morpho cbBTC and cbLTC Markets

### Market-level fields

- timestamp
- chain
- market ID
- loan asset
- collateral asset
- oracle
- interest-rate model
- LLTV
- supply assets and USD
- borrow assets and USD
- available and reallocatable liquidity
- utilization
- supply APY
- borrow APY
- rewards APR
- 24-hour and 7-day changes

### Vault-level fields

- vault address and name
- curator
- total assets and USD
- APY and rewards
- market allocations
- caps and queue status where available
- allocation changes

### Risk commentary

- liquidation mechanics
- collateral and oracle risk
- utilization and withdrawal liquidity
- reward dependence
- curator and vault-allocation risk
- API freshness and deprecation warnings

The report must not call an advertised APY “safe” or “guaranteed.”

## Section 11 — News and Event Digest

Include only material items. For each:

- headline
- event date
- publication date
- primary source
- why it matters
- assets/sectors affected
- confidence
- factual summary
- clearly labeled interpretation

## Section 12 — Methodology, Sources, and Corrections

- source registry changes
- parser failures
- stale sections
- unresolved discrepancies
- formula changes
- corrections to prior reports
- known coverage gaps

## Claim format

Every material claim should map to:

```json
{
  "claim_id": "string",
  "text": "string",
  "category": "fact | estimate | interpretation",
  "as_of": "ISO-8601 timestamp",
  "source_ids": ["string"],
  "confidence": "A | B | C | D | Q",
  "calculation_id": "optional string",
  "notes": "optional string"
}
```

## Commercial editions

### Free Brief

- executive summary
- selected ETF flows
- three treasury changes
- one policy update
- one item per network
- public source links

### Pro Daily

- full report
- complete tables
- PDF and web editions
- historical comparisons
- confidence and methodology notes

### Institutional

- Pro content
- JSON/CSV exports
- API access
- custom organization watchlists limited to factual monitoring
- redistribution and white-label terms by contract

### Agent API

Initial paid endpoints:

- `/api/v1/treasuries/latest`
- `/api/v1/etf-flows/latest`
- `/api/v1/policy/latest`
- `/api/v1/morpho/markets`
- `/api/v1/report/latest`

Pricing and production settlement remain disabled until Base Sepolia tests, accounting workflow, source licensing, and legal review are complete.

## Editorial disclaimer

The publication provides general, impersonal research and factual market information. It is not tailored to any subscriber’s portfolio and does not instruct a subscriber to buy, sell, hold, borrow, lend, or use leverage.