# Litecoin at 15: the 84-page special edition

The founder requested an independent, illustrated 84-page Litecoin anniversary publication. This release contains the print PDF and an accessible HTML reader with the same page order, copy, diagram labels and four original illustration assets. It is a separate special edition, not a daily issue or an endorsement by the Litecoin Foundation, Charlie Lee or a financial institution.

## Identity and dates

- Archived record: `content/specials/litecoin-at-15-r1.json`.
- Reader: `/conversations/specials/litecoin-at-15/`, with numbered pages 1 through 84.
- Print: `/magazine/litecoin-15/Litecoin-at-15-84-page-advance-edition.pdf`.
- Research and preparation: October 4, 2026.
- Network anniversary: October 13, 2026, based on the explicit 2011 launch follow-up and launch poll. Genesis timestamp and forum display date are separate records.
- Planned cover date: October 15, 2026. This future date is not a claim of reporting through October 15.
- Status: advance anniversary edition; AI-prepared editorial preview; independent human editorial review pending.

The 84 pages include history, six short Charlie Lee excerpts from distinct attributed records, Foundation and ecosystem coverage, an institutional notebook, four pages of source records, a glossary and a future verification checkpoint. The record cites 94 source entries. Quantities retain their effective dates; illustrative mNAV inputs are explicitly fictional. Project announcements and issuer disclosures are not independent audits. No personal financial recommendation is made.

## Corrections and editorial method

Historical records disagree on some dates. The text distinguishes the October 7 genesis timestamp, October 9 forum display and October 13 network launch; discloses the three initial blocks rather than making an absolute no-premine claim; and identifies the 2017 Lightning swap demonstration as testnet work. The 2026 MWEB security record appears alongside its benefits. LitVM testnet, roadmap and audit stages remain distinct from completed production capabilities.

The institutional check corrected a prospectus filename/date mismatch: its printed date is October 27, 2025. Grayscale's annual report was filed September 3, 2026 for the June 30 period end. The product-linked CoinShares KID is the English Spain copy revised September 16, 2026. SEC staff FAQs retain their September 25 initial and September 28 update dates. Processor market share is limited to the processor's dataset; holdings are not flows.

Original narration, attributed project facts and teaching frameworks are distinguished throughout. The source notebook links primary records. A check date is not a publication date. Some record dates identify a revision or reporting period, which the linked source and narrative explain; no current quote, reserve, hash-rate or AUM is manufactured.

## Print and web production

`scripts/render-litecoin15.py` uses the archived JSON and embedded Liberation fonts to create an exact 84-page, 9-by-12-inch PDF, with page bookmarks, clickable citations and internal chapter links. Set `LTC_FONT_DIR` to a directory containing the Liberation Serif and Sans TTF files. Python `reportlab` is required. The renderer creates the shared, non-executable SVG diagrams and rejects content that reaches the reserved footer area. It never fetches network data. The checked PDF ships as a static asset; ordinary site builds do not require Python or regenerate the book.

HTML uses native links and expandable source lists. A complete contents page, previous/next navigation, page jump menu and downloadable PDF work without sign-in or a client application runtime. Body columns collapse on phones. Art is explicitly conceptual, not a photograph of Charlie Lee or evidence of an event. See `LTC-LITECOIN15-ARTWORK.md` for exact prompts and provenance.

## Release and future work

This is an explicitly requested feature release on the existing review branch and Vercel project. PR52 remains open; no protected merge, wallet action, donation-address change, provider configuration or satnam.x publication is included. Existing daily JSON records, RSS identifiers and calendar behavior must remain unchanged.

Routine daily publication authority does not include modifying the special edition. The October 15 checkpoint requires new research and a preserved new revision; it must not silently rewrite this October 4 record or describe unobserved future events. Human editorial review can produce attributed corrections without inventing a reviewer. The future cover date alone does not schedule or guarantee a release.
