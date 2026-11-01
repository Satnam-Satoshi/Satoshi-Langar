# Daily proof-of-work and USDC market intelligence

Updated October 5, 2026. Owner: the human founder of Satnam Satoshi. This is the read-only numerical extension for immutable LTC editions. The agent’s mission is public-source collection, deterministic normalization and evidence validation. It may read the documented public APIs below, create private evidence and prepare records for the existing publication gates. It cannot query wallet positions, prepare transactions, sign, move funds, create accounts or claim independent full-node verification. Memory is confined to this repository’s code, dated issue records and private collection evidence. Source failures are gaps; changed identities or timestamps fail closed. The publication policy and emergency pause remain controlled by the existing pipeline.

## Network activity: original calculations from block records

The accepted network adapter uses documented Esplora-compatible public block endpoints at `https://mempool.space/api` for Bitcoin and `https://litecoinspace.org/api` for Litecoin. It does not import Coin Metrics, Blockchair or another provider’s precomputed daily statistical series.

Primary documentation:

- [Esplora HTTP API](https://github.com/Blockstream/esplora/blob/master/API.md): block summaries, block heights and ten-block pagination.
- [mempool.space REST API](https://mempool.space/docs/api/rest): public endpoint and rate-limit behavior. The docs describe HTTP 429 and possible blocking after repeated violations; they do not promise this collector a numerical request allowance.
- [Litecoin Space API](https://litecoinspace.org/docs/api) and [Litecoin Foundation launch announcement](https://litecoin.com/news/litecoin-space-just-launched): the public developer API.
- [mempool.space terms source](https://github.com/mempool/mempool/blob/4c5601d44d14a41dfcf79b947ad9dd26166c9f53/frontend/src/app/components/terms-of-service/terms-of-service.component.html): applies to the public API. The inspected terms do not impose a noncommercial-only condition on these narrow original calculations. This is not a claim of a blanket data redistribution license.
- [Litecoin Foundation explorer source](https://github.com/litecoin-foundation/ltcspace): identifies the explorer/API. Its software license is not represented as a license to third-party data.

Each collection targets the previous completed UTC day. It verifies the network’s genesis hash with `/block-height/0`, then reads `/blocks` and `/blocks/{height}` backwards. At most 160 ten-block pages are permitted per chain, plus genesis and one final anchor recheck. Requests are serial with at least 1.5 seconds between calls to the same block service, a 15-second timeout and a 2 MB response cap. There are no retries, redirects, alternate origins, proxy rotation, credentials or caller-supplied URLs. A non-success response, incomplete range or rate limit ends that chain’s collection. A known same-run Litecoin rate limit can be recorded with `--defer-litecoin`, which issues no further Litecoin request.

The aggregation selects blocks with `mediantime` in `[00:00 UTC, next 00:00 UTC)`. Median block time is deliberately distinct from observed arrival time and the individual header’s timestamp. Every scanned block must have a valid hash, parent hash, descending consecutive height, non-increasing median time and a non-future timestamp. Both boundaries must be present: a tip at or after the day’s end and a lower block before its start. The tip’s hash is read again at its original height after the scan to detect a changed chain. The public record preserves the tip, lower boundary and first/last included block anchors.

`transactions` sums explorer-reported `tx_count`, including coinbase transactions. `blocks` counts the included blocks. These are base-chain block-summary observations, not unique payments, users, economically adjusted transfers or an assertion about all Litecoin MWEB activity. They must not be compared without this definition to Coin Metrics `TxCnt`, which excludes coinbase issuance. Fees and active addresses are not measured by this adapter and remain `null`.

Only when both chains complete the same window does the record include a ratio, difference and one paired history point. A successful single chain remains visible as `partial`; the other chain is null. There is no inferred ratio and no fabricated trend. Future daily issue records can supply actual history. Historical editions are never backfilled silently. The daily publication runner should collect once for its issue and retain evidence; it must not turn a rate-limited source into a polling loop.

Coin Metrics Community Data was evaluated privately. Its [published CC BY-NC 4.0 license](https://docs.coinmetrics.io/packages/coin-metrics-community-data) was not accepted for a magazine with possible commercial use. Blockchair’s [official API policy](https://github.com/Blockchair/Blockchair.Support/blob/master/API_DOCUMENTATION_EN.md) requires a Premium API key for commercial projects. Neither source is an active runtime endpoint or appears as numerical evidence in this public adapter. A future licensed adapter requires an explicit registry and parser change.

## Four fixed Morpho markets

The collector sends one constant GraphQL POST to `https://api.morpho.org/graphql`. It requests exactly the four Arc/Base market IDs in the adjacent treasury catalog. It never requests a user address, position, vault allocation, allowance or transaction.

[Morpho’s API documentation](https://docs.morpho.org/developers/api/morpho/) documents market identity, rate fields and token price timestamps. [Current API support](https://docs.morpho.org/developers/api/get-started/) includes Arc and Base. A read-only MCP discovery on October 5 confirmed Arc chain 5042 with RPC tools unavailable and Base 8453; that limitation does not authorize transaction preparation or substituting another network.

Each returned market must match the pinned market ID, chain ID, loan/collateral addresses, symbols, decimals, LLTV, oracle and interest-rate model. Oracle and IRM pins were obtained from the official Morpho API on October 5 and preserved with the private discovery response. The accepted parameter tuples are visible in `MARKET_ROUTES` in the parser. A changed oracle, rate model or token cannot be admitted by editing a UI label.

| Chain | Collateral | Collateral decimals | USDC loan address | USDC decimals | LLTV |
| --- | --- | --- | --- | --- | --- |
| Arc 5042 | cirBTC `0x171A4217b86A807A64eB94757Db6849fb4bDbAA0` | 8 | `0x3600000000000000000000000000000000000000` | 6 | 0.86, two distinct oracle routes |
| Base 8453 | cbBTC `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` | 8 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 | 0.86 |
| Base 8453 | cbLTC `0xcb17C9Db87B595717C857a08468793f5bAb6445F` | 8 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 | 0.625 |

[Circle’s USDC address registry](https://developers.circle.com/stablecoins/usdc-contract-addresses) confirms the loan tokens. [Arc’s contract registry](https://docs.arc.io/arc/references/contract-addresses) confirms cirBTC and its 8 decimals, and the USDC ERC-20 interface’s 6 decimals. Arc’s native gas balance uses 18-decimal precision; the collector uses the 6-decimal loan-token interface only. [Coinbase’s wrapped-assets documentation](https://help.coinbase.com/en/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/coinbase-wrapped-btc) identifies cbBTC/cbLTC and their supported networks. Base collateral contract pins are the existing configured catalog, checked against the official market response; this adapter does not claim issuer reserve attestation or fetch reserves.

APY values are decimal fractions: `0.05` means 5% annualized. These are variable native market APYs, excluding incentive rewards. USDC supply APY is distinct from depositing wrapped collateral. LLTV is a liquidation parameter, not a recommended borrowing level. Loan assets are exact decimal strings converted from integer token units; unsafe JavaScript integers are rejected rather than rounded. Missing fields never become zero. A real source-reported zero is preserved.

State and both token price timestamps have independent 900-second freshness gates. Stale state retains its `asOf` timestamp but rates, utilization and liquidity are null. A fresh state can remain visible while a stale collateral price is null. Future source times invalidate that route. Morpho token USD prices are provider-supplied observations; the [API docs](https://docs.morpho.org/developers/api/morpho/) identify the current price provider as DefiLlama. They are not the lending oracle’s own timestamp or an assurance that an oracle is safe to transact against.

Morpho is fetched after the block scans. `refreshIntelligenceForPublication` rechecks freshness at the publication time, sets `evaluatedAt` and nulls fields that have aged out, retaining original collection provenance. Do not present a stored daily issue as a continuously live quote.

## Snapshot and evidence contract

The JSON root is an `intelligence` value ready for inclusion in an immutable edition: `schemaVersion`, `parserVersion`, `collectedAt`, `evaluatedAt`, New York `asOfDate`, `timeZone`, `network`, four `markets`, three `sources`, fixed `notes` and controlled `gaps`. `validateIntelligence` checks the registry, identities, units, timestamps, aggregate relationships, data/source correspondence, source errors and known methodology. Preparation must call it, then re-evaluate before publication. The snapshot must be collected within 24 hours and belong to the issue’s New York date.

For every retrieved body, private evidence records its raw SHA-256, URL, retrieval time and HTTP status. Block source `sha256` is the SHA-256 of `JSON.stringify(pages.map(page => page.sha256))`, in request order. Each page’s `sha256` refers to the raw UTF-8 response body. Morpho’s `requestSha256` records the fixed GraphQL request body, and its `sha256` records the response. These hashes are content references, not signatures, authentication of the provider or independent verification of consensus. Raw third-party responses remain private; public records contain only normalized facts, anchors and metadata. Invalid source text never enters public prose.

The CLI exclusively creates its output and private evidence files, preserving earlier runs. Exit 0 means at least one source was retrieved, exit 2 means no source succeeded, and exit 1 means CLI or validation failure. A successful collection is not publication.

```sh
node scripts/collect-ltc-intelligence.mjs --output /private/tmp/ltc-intelligence.json --evidence-dir /private/tmp/ltc-intelligence-evidence
node --test scripts/test-ltc-intelligence.mjs
```

The fixtures exercise daily boundary coverage, missing pages, wrong parents, duplicate heights, future timestamps, coinbase-inclusive counts, partial/failed sources, rate-limit stop, explicit deferral, wrong market/token/chain/decimals/LLTV/oracle/IRM, malformed decimals, stale-state/price independence, publication-time aging, source/hash mutation and response bounds. Fixtures are synthetic test data and are never issue history.
