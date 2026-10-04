# A record worth preserving

Status: proposal, October 4, 2026. No NFT, token, inscription, transaction, wallet connection or fee commitment has been created. The founder asked whether this edition or every edition could be inscribed. This is an editorial preservation design, not authorization to execute financial actions.

## Recommended shape

Keep the website and complete PDF free. Assign every accepted edition an immutable identity, record its source revision and SHA-256 file hashes, and preserve both the source and output in independently recoverable copies. A future approved IPFS copy would add a content identifier; pinning and recurring availability checks would still be needed.

A compact Litecoin inscription could later attest to a specific edition manifest. An inscription containing a hash or CID is a reference, not the complete magazine stored on-chain. A full PDF would have different size, fee and permanence tradeoffs. Do not describe either as copyright ownership, investment exposure, a legal signature or proof that every editorial claim is true.

## Before any mint or inscription

The human owner must choose the network, receiving/custody arrangement, rights, exact final artifact, maximum cost and collection policy, then explicitly authorize the concrete transaction. Independently review tooling and its output using no-value fixtures first. Keep distribution, recovery and transfer risks distinct from reading access. Do not use automation to sign, pay, move coins or inscribe every issue.

## Editorial rights

Sources, quotations, names and book titles keep their existing rights. A publication license does not transfer third-party rights. AI-generated conceptual artwork must retain its provenance and description. No Foundation, Charlie Lee, author or contributor endorsement is implied. Never inscribe private evidence, unpublished corrections, personal data, credentials or wallet recovery material.

## Evidence and permanence

Corrections create a new revision referencing the old hash; they do not silently replace a collectible's contents. Keep an ordinary readable archive available even if a collector platform, gateway or indexer disappears. Store recovery instructions separately from credentials.

Sources: [Ordinal inscription content model](https://docs.ordinals.com/inscriptions.html), [experimental Litecoin Ordinals implementation](https://github.com/ynohtna92/ord-litecoin), [IPFS persistence and pinning](https://docs.ipfs.tech/concepts/persistence/). These were reviewed as architectural references; no code or wallet was executed.
