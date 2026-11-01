# Two specials and a dated newsroom

October 5, 2026. The founder requested a fresh website data check, a daily Litecoin community source desk, and special editions on Charlie Lee and IYKYK. This is a separately authorized implementation and editorial release; it does not rewrite the October 5 daily edition.

## Reading experience

The quiet fork is an eight-chapter public-record Charlie Lee profile. IYKYK is an eight-chapter technical history for newcomers and experienced readers. Each has original conceptual cover art, a linked reading map, timeline, chapter navigation, sourcebook and back page. Artwork is illustrative; no invented interview, portrait photograph, endorsement, secret access or independent human review is claimed. The original Proof of Birthday and every daily issue remain available.

The source notebooks distinguish company announcements, personal accounts, retrospective descriptions, developer documentation and editorial interpretation. Lightning Labs investment and Lee's published vision are not presented as a founder or employee role. Historical MWEB incidents are attributed to the public developer postmortem and software release record, not described as a fresh October event or an independent audit.

## Update notebook

`prepare-ltc-newsroom.mjs` validates the same three inputs as the daily pipeline, rechecks market freshness and creates a dated notebook without altering an issue. It saves an immutable `content/ltc-newsroom/newsroom-YYYYMMDDTHHMMSSZ.json` and a `latest.json` pointer copy. The notebook's hash covers the record, including every source timestamp. The frontend prefers a later accepted daily edition to an older notebook. No historical issue is relabeled or overwritten.

```
node scripts/prepare-ltc-newsroom.mjs --snapshot <base> --intelligence <intelligence> --policy <policy> --output <private-candidate> --apply
```

Use only freshly collected approved inputs, inspect the result, then run the full release process. A local record is not a deployment. New timestamps are real preparation times, not edits to old evidence. The routine daily run may save a notebook alongside its new edition; same-day repeated runs remain no-ops unless the founder explicitly requests a new intraday check. The October 5 refresh was explicitly requested.

The separate community collector has exactly the sources and bounds described in LTC-COMMUNITY-SOURCES.md. An HTTP 403 remains an unavailable source. Old announcements keep their dates; a community record cannot satisfy the financial-data freshness gate. No X scraping, anonymous rumor aggregation or unrestricted AI political reporting is enabled.

## Routine authority after verified release

Extend data-only daily authority to the exact newsroom filename pattern above and `content/ltc-community/latest.json`, in addition to existing edition JSON and the base snapshot. Collector, parser, feature content, special editions and artwork remain implementation. Preserve the updated implementation digest and original-project pause checks. Collect community records once per new publication day, preserve raw evidence privately, validate and copy the normalized snapshot. Never retry blocked sources through an alternate path.

The local 10 a.m. New York target still depends on the Codex host, network and authenticated services. Cloud publication is inactive. Tomorrow's Small blocks. Big world. cover is prepared; its issue must await October 6 observations. No future issue or future data is fabricated.

## Artwork

Built-in image generation produced two original 1086×1448 cover masters under `public/magazine/specials-october/`. Charlie's concept: a silver circuit branching from an orange filament into a blue engineering landscape. IYKYK's concept: a silver archive opening onto a blue mechanical world. No text was generated into the art; readable cover text is HTML. Full prompts and evidence are preserved in the private release folder. Motifs inside the chapters are labeled editorial illustrations, not data charts.

## Checks

Run the full existing checks plus community-parser and newsroom integrity tests. Verify both specials, contents and source links, mobile text wrapping, archive/RSS discovery, fresh notebook labels, original daily records, market withholding and unavailable-source display. No auth, receiving-address, wallet, domain or financial changes belong to this release.
