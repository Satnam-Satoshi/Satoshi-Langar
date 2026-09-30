# What is available today

Last reviewed: September 30, 2026. This is a dated evidence summary, not a service-level promise or independent security audit.

## Available for review

- [Public HTTPS website](https://https-github-com-satnam-satoshi-sat.vercel.app/): community story, projects and contribution choices. The founder is reviewing it before the satnam.x launch.
- [Independent IPFS copy](https://bafybeicvc4z32ltjdspnoukvujytd6lq24azxg65sr22tyosux6ymxgmrq.ipfs.inbrowser.link/): all 16 linked community pages rendered in the September 30 browser check, including Home-to-Join navigation. Public gateways have no uptime guarantee.
- GitHub issues and PRs: public contribution and review channels. The website's contribution links open draft GitHub issues for the visitor to review and submit; they are not a private registration form.
- Public mission, roadmap, project map and contributor/agent templates.

## Source and evidence

| Surface | Source / record | What the evidence establishes |
|---|---|---|
| HTTPS community release | `9da423aab6e7407a6ecc750379e43fa28e9f9047` on the website branch | September 30 HTTP check matched 26 public files to the release bytes |
| Portable IPFS release | `a3ba466e5313fba42344ca74be833327133ab660` | Explicit index.html links; 16 linked pages rendered with expected headings/style and no page scripts/forms |
| Website review | [PR #46](https://github.com/Satnam-Satoshi/Satoshi-Langar/pull/46), [CI run](https://github.com/Satnam-Satoshi/Satoshi-Langar/actions/runs/36660496139) | CI passed for that exact website commit; application PR remains separate from this documentation revision |
| Main application | Earlier implementation, before PR #46 | Do not assume a checkout of main reproduces the current static website |

The browser checks are not a fresh byte restore of every IPFS file or proof of all Web3 resolvers. Pinata's own HTML gateway was restricted; the independent browser gateway provided a working review route.

## Deliberately deferred or incomplete

- **satnam.x:** founder deferred publication while reviewing the website. No completed update to the new content address is verified. Wallet troubleshooting is not a current contributor task.
- **Canonical automatic deployment:** Vercel's Git integration still points to an older repository lineage. [Issue #39](https://github.com/Satnam-Satoshi/Satoshi-Langar/issues/39) tracks alignment. A merge in this repository is not proof of a new deployment.
- **Recovery:** local archive integrity and remote metadata were checked; a complete download-and-restore from the remote backup remains unverified.
- **Community operations:** named intake backup, non-GitHub contact route, reviewed translations and an approved local service pilot remain work to do.
- **Private reporting:** a verified confidential reporting/contact path must be established. Follow [SECURITY.md](../SECURITY.md); never put exploit details or personal data in public issues.
- **Open-source records:** main's abbreviated license text is restored to the full intended Apache-2.0 text in this documentation revision, preserving contributor attribution. Historical publication/design records remain dated evidence.

## Scope boundaries

The community revision publishes founder-supplied native BTC/LTC donation requests. It provides no live fund, balance monitoring, automated receipts, service reward program, pooled savings, autonomous treasury execution or public agent API. No deposited budget is claimed. The separate Treasury prototype is not independently audited and its capability monitor does not monitor account positions or debt.

The project currently depends on GitHub, hosting and storage providers. Provider independence is a goal to demonstrate through documented exports, multiple maintained copies and recovery tests. [IPFS persistence requires maintained availability](https://docs.ipfs.tech/concepts/persistence/); a content address alone is not permanent hosting.

## Keeping this accurate

Update this file when a release, integration or governance decision changes the facts. Include the date, exact source/PR, checks performed and remaining limits. Use [DECISIONS.md](DECISIONS.md) for changes of direction. Older reports do not override current verified evidence.

## Community ecosystem revision for review

The expanded website branch adds six connected programs, three complete beginner lessons, nine quiz answer reveals, Langar proof-of-service/reward design, creator payment plans, a meetup invitation, a social directory with only verified links, AI collaboration, a four-stage 90-day roadmap, and a founding LTC magazine. The magazine embeds dated source observations and an original mNAV explainer; daily editorial operations and unimplemented metrics are explicitly separated.

Native BTC/LTC requests use founder-supplied addresses reaffirmed in this chat. Network prefixes and checksums pass. No funds have been sent, received, reconciled or managed by the agent.
