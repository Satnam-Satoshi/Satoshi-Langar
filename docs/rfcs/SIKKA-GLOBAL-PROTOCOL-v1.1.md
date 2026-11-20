# SIKKA — Global Open BTC/LTC Basket Protocol (RFC v1.1)

**Satnam Satoshi | 14 October 2026 | Research and architecture only — not deployed or authorized to issue funds**

## Purpose

Sikka is a global, open-source protocol and education project of **Satnam Satoshi**: a community where human beings and responsibly governed AI learn, create and serve together. It must not be designed as a New York-only project simply because the founder resides there. Anyone should be able to learn, read, test, reproduce and build tools under the open standard without owning crypto, submitting identity documents, choosing Coinbase, or joining a financial product.

The monetary definition is universal; regulated live-value services remain the responsibility of the actual operators and jurisdictions involved. Open source, self-custodial wallets and accessible smart contracts do **not** mean unrestricted legal issuance and redemption everywhere.

## Monetary invariants

**1 SIKKA = 21 Bitcoin satoshis + 84 Litecoin litoshis**, or 0.00000021 BTC + 0.00000084 LTC.

- Fixed **asset quantities**, not a dollar peg or investment-return promise.
- Supply starts at zero, and increases only with exact paired reserve deposits.
- On Base, a reference 8-decimal cbBTC/cbLTC vault requires `21 * N` cbBTC base units and `84 * N` cbLTC base units for minting N SIKKA. Redeeming N burns N SIKKA and atomically transfers both corresponding assets.
- ERC-20 token has **zero decimals** to make the smallest whole basket exactly representable; an app may show sats and litoshis separately.
- Both reserve inequalities must hold independently: `cbBTC.balanceOf(vault) >= 21 * totalSupply()`; `cbLTC.balanceOf(vault) >= 84 * totalSupply()`.
- No founder premine, unbacked service rewards, reserve lending, rehypothecation, discretionary minting, implicit yield, or silent modification of basket rights.
- A testnet education demo cannot be marketed as a real-value SIKKA product.

## Components

1. **SIKKA Open Standard** — public denomination rules, metadata and series registry, reserve proofs, lifecycle, interfaces and threat models.
2. **SIKKA Learn** — no-wallet educational calculator, satoshi/litoshi conversion, accessible multilingual tutorials and simulations; joining Satnam Satoshi does not require payment.
3. **Base reference contracts** — series-identified `SikkaBasketToken`, exact paired `SikkaBasketVault`, transparent monitoring and a narrowly defined per-service policy adapter where legally necessary.
4. **Wallet-neutral SDK** — EVM wallet standards, self-custody support, gas sponsorship and user-selected batching where appropriate. Never collect seed phrases; humans authorize every financial action.
5. **Verifiable reserves** — on-chain reconciliations, wrapper issuer provenance, actual deliverable assets, audit reports, supply, liabilities and accessible risk disclosures.
6. **Future independent settlement adapters** — evaluate native BTC and LTC, other chains and alternate custody arrangements **without falsely representing separate forms of backing as fungible**.

Base is the initial reference execution layer, not the definition of Sikka. cbBTC/cbLTC involve Coinbase-issued representations and counterparty constraints. **Coinbase's cbLTC conversion service has extensive regional restrictions**, including across European markets, India, the UAE, and New York. This does not automatically prohibit independent wallet-to-wallet transfer on Base; nor does transferring cbLTC guarantee native Litecoin redemption.

Do not share a fungible token or liquidity pool across a Base wrapped series and a differently backed native series until economic equivalence, legal redemption rights and risk parity have been established and independently reviewed.

## Real-world usability and limits

One SIKKA is a tiny dual-asset claim: network costs and any third-party fees can exceed a single unit's underlying value. Test gas sponsorship, wallet-native transaction batching and optional noncustodial settlement. Do not present bulk batching as a precondition on the **legal** right to redeem if relevant law forbids minimum thresholds.

Educational participation should be free and global; optional real-value gateway availability must accurately reflect custody and jurisdictional rules. Contributors' Proof of Seva should be a nonfinancial, privacy-respecting record rather than an automatic claim to fully collateralized SIKKA. A lawful grant of SIKKA would require a sponsor to fund both reserve assets.

## Security / legal gates

No mainnet issuance until human governance approves the exact issuer, eligible jurisdictions, wrapped-asset rights, redeemability terms, licensing/registration analysis, contractual insolvency treatment, sanctions/AML implementation where required, reserve segregation, wallet security, threat model, fuzz/invariant testing and third-party contract audit. MiCA Recital 22 addresses genuinely fully decentralized services, but intermediary roles and identifiable controllers still matter; labels such as 'DeFi' or 'DAO' are not exemptions. A global protocol can be open source even while particular regulated gateway operations are limited.

Require open code, pinned dependencies, no admin ability to invent reserve-free supply, human-held multisig, public incident reporting, immutable rules for outstanding rights and an independently monitored reserve dashboard. AI assists in coding, teaching and monitoring but **never signs transactions, has custody or overrides human approvals**.

## Roadmap

- **A. Open RFC and learning tools:** publish the basket specification and no-wallet demonstration, public examples and sources; no issuance claims.
- **B. Base Sepolia simulation:** mock cbBTC/cbLTC, audited-style Foundry tests, zero-decimal mint/redeem and wallet-neutral UI; no real funds.
- **C. Authorized value pilot:** independently approved issuer/custodian/partner, real redemption rights, service availability, security audit and qualified local advice.
- **D. Global ecosystem:** language/community packs, transparent proof-of-reserves, portable hosting and SDK, vetted additional settlement adapters.

**Non-goals:** a new competing Satnam Satoshi constitution, automatic volunteer compensation, speculative tokenomics, launch-page claims, public deposits, unapproved mainnet contracts, or changes to the Public Alpha website release lock.

## Governance and status

This is an **RFC for founder review only** under existing [Satnam Satoshi governance](../../GOVERNANCE.md), [architecture](../../ARCHITECTURE.md), [current status](../STATUS.md) and future Architecture Decision Record procedures. The live website is unchanged. No token, custody account or public redemption service is created by this document.

### Primary source references

- Coinbase wrapped assets and availability: https://help.coinbase.com/en/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/coinbase-wrapped-btc
- Coinbase Exchange wrapped asset restrictions: https://help.coinbase.com/en/exchange/crypto-transfers/wrapped-assets
- EU MiCA Regulation and Recital 22: https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32023R1114
- ESMA decentralization assessment: https://www.esma.europa.eu/publications-data/questions-answers/2671
- FATF risk-based VASP guidance: https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Guidance-rba-virtual-assets-2021.html
- Base account abstraction / batching: https://www.base.org/blog/native-account-abstraction
