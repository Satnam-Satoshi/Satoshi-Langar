# Treasury control: phase 1 review

Status: implemented for review; not approved for funds or signing.

## Selected route

Use Base with native Base USDC and separately allowlisted cbBTC/USDC and cbLTC/USDC Morpho Blue markets. Native Bitcoin and Litecoin cannot be deposited into these ERC-20 markets. Acquire the correct Base wrapped token through an eligible issuer or a separately reviewed exchange route. Never send native BTC/LTC to an EVM token or Morpho contract. There is no automated bridge or swap in this release.

Wrapped assets retain issuer/custody risks. Coinbase's wrapping service excludes New York; protocol connectivity does not establish geographic eligibility for acquisition, redemption, an onramp, or other regulated services. cirBTC remains research-only until a compatible liquid market, chain, oracle and issuer route are verified. Arc onramp is optional, not a dependency for managing an existing wallet.

Primary references:
- https://docs.morpho.org/learn/
- https://docs.morpho.org/developers/contracts/addresses/
- https://www.coinbase.com/campaigns/wrapped-assets
- https://developers.circle.com/assets/what-is-cirbtc
- https://docs.arc.io/app-kit/onramp

## Implemented

Open `/treasury/control`. Connect an injected EVM wallet or inspect a public address. Reads use Base RPC, independently verified market parameters, token decimals, block-pinned balances and positions, and live interest accrual. The interface shows liquidity, variable borrowing rate, personal LTV policy, positions, collateral stress scenarios, funding instructions and security limits.

Supply, borrow, repay and withdraw preparation independently re-reads the chain, validates amounts, freshness, network, balance, liquidity and personal 20% LTV policy, then generates inspectable calldata. Recipient and position owner are the connected account. Approvals use the requested amount. Calls with sufficient allowance are simulated; calls needing approval are explicitly marked as requiring a later simulation. Downloaded JSON is for review, not an instruction to broadcast.

No private key storage, server signing, permit flow, transaction submission, autonomous agents, or arbitrary contract/RPC inputs. User wallet addresses remain in browser memory except public read queries to the API/RPC. Public RPC services may observe requests. Signing is a source-code release gate, not a user toggle.

## Verification

- 33 automated tests passed for financial arithmetic and action guards.
- Production Next.js build passed.
- Live Base reads verified both allowlisted markets and token/loan parameters.
- Next.js upgraded to 16.3.6 after dependency audit identified critical advisories. Post-update dependency audit reported zero findings at the time checked; this is not a security audit.
- Browser/local-server connectivity was blocked in this environment. Hosted visual and wallet checks remain pending.

Run `corepack pnpm install --frozen-lockfile`, `corepack pnpm test:treasury`, `corepack pnpm build`, and `corepack pnpm start`.

## Required before enabling signing

1. Review oracle source feeds, update thresholds, stale-price behavior, issuer pause/blacklist controls and market/IRM risk. A fresh block is not proof of a fresh underlying oracle feed.
2. Fork-test approval, supply, borrow, partial/full repay and withdraw, including interest, rounding, reverts, insufficient gas, wallet rejection and network/account changes. Current tests cover guards, not the full contract lifecycle.
3. Verify desktop/mobile UI and hardware-wallet transaction presentation. Add a reviewed wallet connector if mobile QR support is needed.
4. Implement separately reviewed submission with a fresh re-read and simulation after each approval, explicit user signature for each step, receipts and failure recovery. Never assume approval confirms the subsequent action.
5. Independently review implementation and run a founder-approved small-value end-to-end transaction. No claim of audit or guaranteed global availability.

This isolated branch is based on `agent/public-alpha-design-final`. It does not approve or merge PR 43, change production governance, or authorize agents to manage funds.
