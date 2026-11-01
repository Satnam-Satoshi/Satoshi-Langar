# LTC Media newsroom and MiiKey release

Design date: October 4, 2026. Requested by the founder: a distinctive daily newsroom front page, an LTC Media identity, a visible Litecoin Register link and the MiiKey resource hub.

## Front page

The daily issue is the primary entry point. Its saved cover, actual publication day, source briefings, exact Coinbase trade timestamps, coverage count and sourcebook links come from the same accepted edition object. The newsroom displays every saved brief, including the original source-effective date. Dated software releases are not relabeled as today’s announcements. Palette and jacket treatment follow the archived presentation; older editions use a deterministic date-based composition fallback. No browser randomness, live price claim or new upstream parser is introduced.

A successful daily data release automatically refreshes the front page when it rebuilds the site. The original editorial essays, birthday special, Litecoin fieldbook, MiiKey and topic guides remain separately dated context. The 10-source automated desk is explicitly described; complete topic coverage does not imply comprehensive breaking-news coverage. Failed or missed checks keep the prior published day visible. Routine daily publication still requires the local host, authenticated services and execution capacity described in LTC-RELEASE-RUNBOOK.md. Cloud publishing remains inactive.

The reading path is daily issue → newsroom → special edition → Litecoin fieldbook → topic desks → independent research → original essays → MiiKey → issue library → community. The #daily deep link remains stable; #newsroom, #special, #ideas, #archive and #reading-room are native anchors. Issue sources, archive identities, correction records, donation destinations and authentication settings are unchanged.

Litecoin Register is linked at https://litecoinregister.com/?c=table as an independent third-party research destination. No new numerical data is ingested and no affiliation is claimed. Users are told to inspect definitions, sources and dates; holdings are not flows.

## Identity

The original LTC Media vector identity combines an open book, a copper conversation point and a custom drawn LTC lettermark. It extends the repository’s native typographic/vector system. It is not the Litecoin Foundation logo and claims no trademark clearance or affiliation.

- public/brand/ltc-media-logo.svg — dark lockup, transparent background.
- public/brand/ltc-media-logo-light.svg — reverse lockup for the dark footer.
- public/brand/ltc-media-mark.svg — small mark and publication favicon.

Header and footer use the assets throughout the publication. Community pages retain Satnam Satoshi’s own identity. The SVGs are editable originals; no generated raster text is used in the wordmark.

## MiiKey artwork

Created with the built-in image-generation tool (not the fallback CLI). Public asset: public/miikey/keys-to-open-world.jpg, 1536 × 1024. Conceptual editorial illustration, not a security diagram or a product endorsement. The private release evidence retains the master and prompt.

Final prompt:

> Use case: stylized-concept. Asset type: wide editorial hero artwork for MiiKey, a self-custody and peer-to-peer technology learning hub within Satnam Satoshi. Primary request: make personal agency and connection feel warm, thoughtful and tangible. Scene: a monumental brushed-silver physical key turned slightly in a freestanding open architectural doorway; beyond it an inviting landscape of small community buildings and people linked by fine geometric network threads, a copper circular sun and distant blue horizon. An abstract miniature open book at the base suggests learning before action. Refined contemporary editorial collage, tactile cut paper, subtle engraved linework and halftone texture, sculptural material detail, generous uncluttered composition. Palette: midnight navy, pale silvery blue, warm ivory and restrained copper, matching a sophisticated print magazine. Landscape 1536x1024. The key and doorway dominate the center-right with meaningful surrounding space. Do not depict a real wallet product, real person, money growth, charts, passwords, seed words, UI screens, crypto logos or letters. No text, labels, logos or watermarks. Conceptual artwork, not a diagram or a claim of absolute security.

See MIIKEY-RESOURCES.md for primary sources, advisory scope, education boundaries and agent governance. MiiKey is linked from the community homepage, primary navigation, both footers and the magazine front page. Its six categories and native disclosures work without JavaScript. It is a learning/resource hub; internal chat, OAuth and community accounts are not activated by this release.

## Release verification

Use the existing full project checks and isolated export workflow. Verify desktop/mobile navigation, issue/date/sourcebook links, newsroom counts and timestamps, original archived JSON preservation, cover library, external Register link, MiiKey category links and disclosure controls. Inspect the mark at small size and both logo contrast variants. No release should be claimed until candidate byte checks, production promotion and public domain checks pass; keep the deployment receipt in private work records.
