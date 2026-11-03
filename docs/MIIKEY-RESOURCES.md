# MiiKey resource hub

Research and implementation date: **October 4, 2026**. Route: `/miikey/`.

Status: AI-prepared educational page and research shortlist. Independent technical review is pending. It is not an audited wallet, transaction interface, custody provider, financial recommendation, chat room or membership system. The coordinating release process determines whether the implementation is publicly deployed.

## Intent and editorial approach

MiiKey is a Satnam Satoshi field guide to understanding Bitcoin, spending control, recovery and community. Its voice is “Not your keys. Not your coins.” The page explains the slogan’s scope: control of keys matters, but does not guarantee safe operation, recovery, privacy or freedom from other dependencies.

The journey is graduated: understand a wallet; write a nonsecret recovery plan; compare workflows; rehearse in a nonvaluable learning environment; learn with another person. Existing Sikh Bitcoin lessons support deeper study. Beginners are never asked to disclose balances, provide secret material, buy a device, initialize a wallet, send funds or connect an account.

The design uses ivory, navy, silver and copper, serif editorial accents, the original hero artwork supplied by the coordinating agent, category anchors, native HTML disclosure controls and conceptual diagrams. No client component, application JavaScript, forms, browser storage or new dependencies are used. The page works as exported HTML and CSS, including without JavaScript. Sources and lesson links use standard hrefs for the existing portable exporter.

## Scope and navigation

- `#why-bitcoin` — peer-to-peer money, verifiable issuance rules and the community’s freedom framing; no investment-return promises.
- `#first-steps` — five graduated steps with optional reading and paper-based recovery planning.
- `#hardware` — a descriptive shortlist including Bitcoin-only and multi-asset approaches, with comparison questions and a current advisory.
- `#multisig` — conceptual 2-of-3 model, explicit limits, complete policy/descriptor needs and three failure scenarios.
- `#verify` — full-node validation, privacy and a dependency map; distinguishes signing from observation and native Bitcoin from other systems.
- `#community` — exact Club Orange identity, internal community paths and open community tools.

Internal routes linked: `/connect/`, `/join/`, `/meetups/`, `/sikh-bitcoin/`, relevant lessons and the Foundations/Sovereignty course directories. These are links to existing project pages, not claims that every proposed channel or meetup is live. Root homepage/header/footer integration is outside this contribution’s file scope.

## Primary source evidence

All links below were inspected through official project, manufacturer, protocol or app-store sources during this task. Product capabilities are first-party descriptions, not independently measured test results. No prices, sales rankings, adoption totals or investment suitability claims are reproduced.

| Topic | Source | What the page uses / boundary |
| --- | --- | --- |
| Peer-to-peer proposal | [Bitcoin whitepaper](https://bitcoin.org/bitcoin.pdf) | Direct-party payments, signatures, network validation and proof-of-work ordering. Historical proposal is not a current implementation manual. |
| Issuance | [Bitcoin.org FAQ](https://bitcoin.org/en/faq) | Current monetary rules approach a 21 million BTC limit. Does not infer guaranteed value, price stability or purchasing power. |
| Wallet security | [Securing your wallet](https://bitcoin.org/en/secure-your-wallet) | Custody, backups and operational responsibility. No device-specific procedure is generalized across wallet formats. |
| Privacy | [Protect your privacy](https://bitcoin.org/en/protect-your-privacy) | Public ledger, address/identity linkage and privacy practices. No anonymity guarantee. |
| Full nodes | [Bitcoin Core about](https://bitcoincore.org/en/about/) and [full-node guide](https://bitcoin.org/en/full-node) | Independent validation, operating requirements and the distinction from mining. Old guide hardware figures are deliberately not repeated as current requirements. |
| Recovery metadata | [BIP 380: descriptors](https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki) | Script/policy information can be essential alongside keys. A threshold diagram is not a complete recovery design. |
| Custody tradeoffs | [Sparrow best practices](https://sparrowwallet.com/docs/best-practices.html) | Source for exploring custody/server/multisig considerations. Its investment-size tiers and broad claims about regulation are not adopted; no production policy is recommended. |
| BitBox | [Supported coins and editions](https://support.bitbox.swiss/en_US/basics-/bitbox-supported-coins) | BitBox02/Nova have Bitcoin-only and Multi editions; BTC/LTC native support in Multi and differing external-interface support. Recheck exact edition, device and network. |
| Trezor | [Bitcoin-only vs Universal firmware](https://trezor.io/learn/supported-assets/bitcoin/bitcoin-only-firmware-on-trezor) | Firmware choices and dedicated Bitcoin-only edition restrictions. No claim that Universal supports every possible token or chain. |
| COLDCARD | [Documentation](https://coldcard.com/docs/), [signing workflow](https://coldcard.com/docs/ready-to-sign/) and [current security status](https://coldcard.com/security/status) | Bitcoin-only/PSBT workflow; interfaces vary by model. Current advisory is displayed prominently, as described below. |
| SeedSigner | [Official project](https://seedsigner.com/) | Open-source stateless Bitcoin signer with a DIY hardware/QR workflow. Marked advanced, with assembly/verification/recovery demands; not a turnkey beginner recommendation. |
| Club Orange identity | [Official site](https://www.cluborange.org/), [FAQ](https://www.cluborange.org/faqs), [iOS listing](https://apps.apple.com/us/app/club-orange-meet-bitcoiners/id1627034193), [Android listing](https://play.google.com/store/apps/details?id=com.orangepill) | Formerly Orange Pill App, publisher Orange Pill App Inc., social/events/merchant discovery. Exact official links verified by the official site and app-store identity. |
| Club Orange privacy | [Privacy policy](https://www.cluborange.org/privacy-policy) | Operator privacy terms and care with profile/location sharing. Does not endorse claims of no scammers, universal availability, or wallet safety. |
| Design community | [Bitcoin Design community](https://bitcoin.design/community/) | Open design projects and contribution resources. Links the maintained project page rather than inventing a private invite. |
| Payments infrastructure | [BTCPay Server](https://btcpayserver.org/) | Open-source payment infrastructure to study. Self-hosting retains operation and maintenance duties. |
| Social protocol | [Nostr protocol repository](https://github.com/nostr-protocol/nostr) | Signed messages and relays; clients, relays and moderation remain operational dependencies. No protocol-wide safety claim. |
| Communications | [Matrix](https://matrix.org/) and [Synapse hosting explanation](https://matrix.org/docs/older/understanding-synapse-hosting/) | Federated communication and homeserver/room governance choices. No MiiKey Matrix room is claimed. |

## Material current finding: COLDCARD

On October 4, the manufacturer’s [security status page](https://coldcard.com/security/status), updated October 1, documented the July 2026 seed-generation incident, fixed firmware and the need to address affected existing seeds separately. The critical distinction reproduced in MiiKey is that a firmware update does not repair an existing affected seed. The card links directly to the living official status record and does not rank the device as safe, instruct a migration or assess any user’s wallet.

The coordinating agent was notified of this finding. No funds, wallet state or credentials were inspected. The page should be rechecked before a later release because security advisories and product support can change. Claims about independent validation in the manufacturer’s record are not presented as our audit.

## Club Orange identity and limits

Confirmed official site: **https://www.cluborange.org/**.

Confirmed publisher: **Orange Pill App Inc.**

Official website links to the iOS app ID **1627034193**, Android package **com.orangepill** and web app **https://web.cluborange.org/**. The hub links the official site and the two app-store listings. Paid membership is disclosed without publishing prices or subscribing the user.

The FAQ says the wallet is built on Spark. The hub intentionally presents Club Orange as a social/community resource and does not equate its wallet’s recovery/settlement architecture with an ordinary on-chain Bitcoin wallet or Lightning node. It does not repeat broad safety, instant-funds or universal-portability claims. Store and FAQ content contain changing feature descriptions; no wallet integration is inferred from the social link.

A similarly named “Club Orange Desktop” search result was not established as official through the verified site’s navigation and is not linked. No unresolved identity is silently substituted. No affiliation, partnership, account or Satnam Satoshi community inside Club Orange has been created or claimed.

## Teaching boundaries

The 2-of-3 diagram assumes three distinct designated keys and a simple threshold policy with no unspecified alternative path. It demonstrates that one unavailable key may be tolerable if two others and the complete wallet information remain usable; one compromised key does not satisfy that threshold alone; two compromised keys can satisfy it. Real designs require policy, descriptor, signer, backup and operational review. The model does not recommend a particular custody setup.

Freedom and sound-money language is explicitly the community’s framing. Finite issuance does not imply guaranteed future returns. Bitcoin proof of work, Lightning, wrapped assets, stablecoins and other chains are distinguished. A node reduces one observation dependency but does not remove vendors, network connectivity, device security, hosting, maintenance or human governance.

## Validation and release handoff

- Local TypeScript check passed after page/CSS implementation.
- Native details/summary and anchors provide progressive interaction without application JavaScript.
- Hero artwork exists at `public/miikey/keys-to-open-world.jpg` and was visually inspected; page uses intrinsic 1536×1024 dimensions and responsive width.
- No forms, sign-in actions, wallet provider calls, scripts, transaction links, secret inputs, tracking libraries or packages were added.
- Integrated production build, export/link checks and desktop/mobile/keyboard rendering are assigned to the coordinating release workflow to avoid concurrent Next builds in the shared repository.
- Independent subject-matter review and usability testing remain pending; neither is falsely claimed.

Owned files: `app/miikey/page.tsx`, `app/miikey/miikey.module.css`, `docs/MIIKEY-RESOURCES.md`. Hero artwork and site-wide navigation are owned by the coordinating workflow. No commit, deployment or external publication was performed by this contribution.

## Agent governance

- **Mission:** help humans understand spending control, recovery, verification and community participation.
- **Responsibilities:** inspect primary sources, write original educational synthesis, implement a scoped static resource hub and record limitations.
- **Knowledge sources:** the primary references above; no private wallet data or unverified live financial data.
- **Permissions:** local MiiKey page, CSS and this documentation only. No accounts, keys, signatures, purchases, transactions or publication.
- **Escalation rules:** tell the coordinating agent about material advisories, uncertain identities or unsupported claims; seek qualified human review for production custody or legal judgments.
- **Memory scope:** public research, code and validation evidence. No financial or personal secrets requested or retained.
- **Audit trail:** dated sources, readable repository changes, current advisory disclosure and release check evidence.
- **Human owner:** the Satnam Satoshi founder retains mission, publication, governance, ethics and treasury authority.
- **Emergency stop:** stop delegated work on founder instruction; no increased authority is inferred from urgency.
