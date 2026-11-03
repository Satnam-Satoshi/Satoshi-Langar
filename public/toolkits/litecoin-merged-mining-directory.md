# Litecoin merged-mining source directory

Checked October 4, 2026. Selected public pool/software documentation, not an exhaustive census, network-health test, payout verification or recommendation. Pool catalogs and withdrawal rules may change. Litecoin is the Scrypt parent in this discussion; every auxiliary chain retains separate consensus rules.

## Named in current checked documentation

| Coin | Symbol | Named providers |
|---|---|---|
| Dogecoin | DOGE | Mining-Dutch; ViaBTC; F2Pool; LitecoinPool.org (direct DOGE payout) |
| Bells / Bellscoin | BEL / BELLS | Mining-Dutch; ViaBTC; F2Pool |
| Pepecoin | PEP | Mining-Dutch; ViaBTC; F2Pool |
| Dingocoin | DINGO | Mining-Dutch; ViaBTC; F2Pool |
| Luckycoin | LKY | Mining-Dutch; F2Pool |
| Junkcoin | JKC | Mining-Dutch |
| Flopcoin | FLOP | Mining-Dutch |
| NewYorkCoin | NYC | Mining-Dutch |
| TrumPOW | TRMP | Mining-Dutch |
| Craftcoin | CRC | Mining-Dutch |
| ShibaInucoin / Shibacoin | SHIC | Mining-Dutch |
| Earthcoin | EAC | Mining-Dutch |
| Worldcoin | WDC | Mining-Dutch |
| BonkCoin | BONC | Mining-Dutch |
| B1T | B1T | Mining-Dutch |

Mining-Dutch names 15 auxiliaries. That does not mean every pool supports or separately pays every coin. LitecoinPool.org credits additional auxiliary value through PPS; other providers may convert rewards. Recheck payout addresses, thresholds, fees and delisting notices before changing a mining setup.

## Historical or provider-specific withdrawals

- **Luckycoin (LKY)** — ViaBTC. Mining discontinued June 8, 2026 (UTC+8); other providers still list it.
- **Junkcoin / Shibacoin (JKC / SHIC)** — ViaBTC. Asset management discontinued May 19, 2026 (UTC+8); absent from current merged-mining tutorial.
- **TrumPOW / Shibacoin / Craftcoin / Junkcoin (TRMP / SHIC / CRC / JKC)** — ANTPOOL. Mining discontinued July 10, 2026 00:00 UTC according to July 6 announcement.
- **Craftcoin / Dogmcoin / BonkCoin / TrumPOW (CRC / DOGM / BONC / TRMP)** — CloverPool. Mining suspended November 27, 2025; residual payout deadline February 27, 2026.
- **Dogmcoin (DOGM)** — DxPool historical announcement; CloverPool withdrawn. Primary historic support evidence; current payout support not verified in this survey.
- **Viacoin (VIA)** — No current named pool verified in this survey. Core release records document Scrypt AuxPoW; do not label dead or currently paid by a selected pool.
- **Argentum (ARG)** — No current named pool verified in this survey. Project README documents Scrypt AuxPoW among several algorithms; present network health and payouts unverified.

## Primary source records

- [Dogecoin Core: AuxPoW validation](https://github.com/dogecoin/dogecoin/blob/master/src/auxpow.cpp) — Dogecoin Core contributors, publication undated; checked 2026-10-04.
- [Dogecoin Core: auxiliary mining RPC](https://github.com/dogecoin/dogecoin/blob/master/src/rpc/auxpow.cpp) — Dogecoin Core contributors, publication undated; checked 2026-10-04.
- [Mining Dogecoin](https://dogecoin.com/dogepedia/how-tos/mining-dogecoin/) — Dogecoin, publication undated; checked 2026-10-04.
- [Dogecoin 1.8 release](https://github.com/dogecoin/dogecoin/releases/tag/v1.8.0) — Dogecoin Core contributors, publication undated; checked 2026-10-04.
- [LTC Merged Mining Coins Mining Tutorial](https://support.viabtc.com/hc/en-us/articles/11477430615439-LTC-Merged-Mining-Coins-Mining-Tutorial) — ViaBTC, publication 2026-09-15; checked 2026-10-04.
- [App—merged mining guide](https://f2pool.zendesk.com/hc/en-us/articles/4403287269773-App-merged-mining-guide) — F2Pool, publication 2026-07-14; checked 2026-10-04.
- [How to mine Litecoin](https://f2pool.io/mining/guides/how-to-mine-litecoin/) — F2Pool, publication undated; checked 2026-10-04.
- [Mining-Dutch: Scrypt merged-mining panel](https://www.mining-dutch.nl/?pools=scrypt) — Mining-Dutch, publication undated; checked 2026-10-04.
- [Mining-Dutch: Help & Info](https://www.mining-dutch.nl/?page=about) — Mining-Dutch, publication undated; checked 2026-10-04.
- [Help/FAQ](https://www.litecoinpool.org/help) — LitecoinPool.org, publication undated; checked 2026-10-04.
- [Litecoin Mining Pool](https://pool.kryptex.com/en/ltc) — Kryptex, publication undated; checked 2026-10-04.
- [Announcement on the Discontinuation of LKY Pool](https://support.viabtc.com/hc/en-us/articles/16317652787343-Announcement-on-the-Discontinuation-of-LKY-Pool) — ViaBTC, publication 2026-06-01; checked 2026-10-04.
- [Announcement on the Discontinuation of SHIC and JKC Asset Management](https://support.viabtc.com/hc/en-us/articles/16019244278671-Announcement-on-the-Discontinuation-of-SHIC-and-JKC-Asset-Management) — ViaBTC, publication 2026-05-05; checked 2026-10-04.
- [ANTPOOL announcement index: TRMP, SHIC, CRC, JKC pool delisting](https://www.antpool.com/news?lang=zh) — ANTPOOL, publication 2026-07-06; checked 2026-10-04.
- [Notice on the Offline of CRC, DOGM, BONC and TRMP Mining Services by CloverPool](https://help.cloverpool.com/hc/en-us/articles/52779856003225-Notice-on-the-Offline-of-CRC-DOGM-BONC-and-TRMP-Mining-Services-by-CloverPool) — CloverPool, publication 2025-11-26; checked 2026-10-04.
- [New Merged Mining Combo: LKY, PEP, DogM, EAC, DINGO and JKC](https://www.dxpool.com/help/en/announcement/Merged-mining-2/) — DxPool, publication 2024-12-16; checked 2026-10-04.
- [Viacoin Core release records](https://github.com/viacoin/viacoin/releases) — Viacoin Core contributors, publication undated; checked 2026-10-04.
- [Argentum integration/staging tree](https://github.com/argentumproject/argentum) — Argentum contributors, publication undated; checked 2026-10-04.
- [Dogmcoin Core source tree](https://github.com/dogmcoin/dogmcoin) — Dogmcoin contributors, publication undated; checked 2026-10-04.
