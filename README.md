# Satnam Satoshi Intelligence

**Truth. Seva. Sovereignty.**

Satnam Satoshi Intelligence is a public-interest digital-asset research platform focused on Bitcoin (BTC), Litecoin (LTC), Stellar (XLM), institutional adoption, sovereign policy, ETF flows, corporate treasuries, and collateral markets.

The first commercial product is a daily, source-linked institutional intelligence report. The platform is designed so humans retain custody, consent, editorial authority, and mission control while specialized agents perform collection, normalization, reconciliation, analysis, verification, drafting, and distribution.

## Launch scope

Phase 1 is a research and publishing system. It does **not** custody customer assets, execute trades, manage portfolios, guarantee returns, or provide personalized investment advice.

The initial product covers:

- BTC, LTC, and XLM market and network intelligence
- ETF inflows, outflows, AUM, holdings, and issuer changes
- public-company, bank, fund, government, and sovereign holdings
- country and U.S. state digital-asset legislation
- Bitcoin treasury changes and mNAV analytics
- Litecoin treasury and institutional adoption
- Stellar payments, tokenization, stablecoin, and RWA activity
- CLARITY Act and related U.S. regulatory developments
- Morpho cbBTC and cbLTC market metrics, liquidity, utilization, APYs, collateral parameters, and risk observations
- source provenance, confidence scoring, discrepancies, and corrections

## Product model

### Free daily brief

A concise public summary with headline changes, selected metrics, and links to primary sources.

### Satnam Intelligence Pro

A detailed daily report with:

- executive summary
- ETF flow dashboard
- sovereign and legislative tracker
- Wall Street and treasury leaderboard
- BTC, LTC, and XLM network intelligence
- Morpho market dashboard
- institutional filings and banking activity
- methodology notes, source links, confidence scores, and corrections

### Institutional and agent API

Structured JSON, CSV, and report endpoints for analysts, communities, businesses, and autonomous agents. Paid machine-to-machine access will use x402 on Base after sandbox testing and compliance review.

## Agent system

1. **Source Scout** — discovers and retrieves approved public data.
2. **ETF Flow Agent** — reconciles issuer, exchange, and aggregator flow data.
3. **Treasury Ledger Agent** — tracks corporate, fund, bank, sovereign, and government holdings.
4. **Policy Agent** — monitors Bitcoin Laws, Congress, regulators, and state legislation.
5. **Network Intelligence Agent** — covers Bitcoin, Litecoin, and Stellar protocol and ecosystem changes.
6. **Morpho Risk Agent** — monitors markets, vaults, liquidity, utilization, APYs, LLTV, oracles, and rewards.
7. **Verification Agent** — checks freshness, provenance, arithmetic, duplicates, conflicts, and confidence.
8. **Editor Agent** — produces the institutional report, executive brief, charts, and correction log.
9. **Commerce Agent** — manages subscriptions and paid API access without controlling treasury funds.

See [`docs/AGENT-ARCHITECTURE.md`](docs/AGENT-ARCHITECTURE.md) and [`docs/REPORT-SPEC.md`](docs/REPORT-SPEC.md).

## Safety and governance

- Humans control all signing keys and treasury wallets.
- Collection agents are read-only.
- Publishing requires source citations and confidence metadata.
- No source is treated as authoritative merely because it is popular.
- Material holdings changes require independent corroboration when feasible.
- Estimates must be labeled and never mixed with confirmed figures.
- Personalized buy, sell, leverage, liquidation, or portfolio instructions are out of scope for Phase 1.
- Any future transaction-capable agent must use separate wallets, explicit spending limits, allowlists, simulation, human approval, and immutable audit logs.

## Technology

- Next.js and TypeScript
- Vercel deployment
- server-side scheduled jobs
- Postgres/Supabase planned for normalized observations and report history
- Morpho GraphQL API
- public and licensed institutional data sources
- Coinbase AgentKit for future controlled onchain capabilities
- x402 for future paid API endpoints

## Environment

Copy `.env.example` to `.env.local` and configure only the services being used.

```bash
npm install
npm run dev
```

## Repository status

The repository is being upgraded from a landing-page prototype into the Satnam Satoshi Intelligence MVP. The immediate objective is a reproducible daily report with a source registry, normalized data model, provenance ledger, editorial controls, and paid distribution path.

## Public treasury addresses

Public addresses may be displayed for transparency, but this application never requests or stores seed phrases or private keys.

- BTC: `bc1q3qxtztzjp6wllmszv9fryp4rln8wt0er2xz8rx`
- LTC: `ltc1q78882zg99eedjnscxlv43we2r4exxua4e5c63j`

## Disclaimer

Satnam Satoshi Intelligence publishes general, impersonal research and factual market information. It is not individualized investment, legal, tax, accounting, or fiduciary advice. Digital assets and lending markets involve substantial risk, including loss of principal and liquidation.