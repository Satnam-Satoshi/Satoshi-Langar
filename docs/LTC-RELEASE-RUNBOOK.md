# LTC daily release runbook

The founder authorized daily website publication on October 2, 2026. This authority covers the tested `bounded-daily-v1` factual briefing. It does not authorize new source adapters, arbitrary generated reporting, account changes, financial activity, a protected-branch merge or satnam.x publication.

## Schedule and availability

The existing **LTC Media daily publication** Codex heartbeat is active for daily publication at **10:00 America/New_York**. Its saved automation record and private release handoff record activation. This is a local Codex workflow: the host, network, authenticated services and available execution capacity are required. The time is a run target, not a delivery guarantee. It is not an always-on cloud scheduler. A missed or rejected run leaves the last successful dated edition visible. No separate morning or evening issue is promised.

## Release boundary

1. Read AGENTS.md, LTC-PIPELINE.md, LTC-EDITORIAL.md and the latest private release handoff. Read the publication pause setting first. If disabled or paused, stop without editing or deploying.
2. Check the current review branch and remote head. Use `scripts/ltc-release-guard.mjs --expect <accepted digest>` to compare the tracked implementation with the last accepted release. Only `content/ltc/*.json` edition records and `public/data/ltc-snapshot.json` may change during a routine daily run. New code requires a separate review. Never overwrite the founder's uncommitted work.
3. Export the accepted Git source into an isolated directory under the private workspace. Build from this export, excluding local untracked files, credentials and private work records. Preserve the previous edition archive. Install the locked dependencies or use the verified local dependency runtime.
4. Run `node scripts/collect-ltc.mjs --stdout`, saving the complete normalized snapshot in the dated private run folder. Retain collection errors. Do not bypass blocked sources. No successful source or no fresh accepted primary observation means no publication.
5. Run `node scripts/prepare-ltc-edition.mjs --snapshot <file> --output <candidate>`. Inspect the result and its source dates, identity checks, AI label and gaps. Deterministic briefings do not require per-edition approval under the recorded policy. Political analysis, disputed financial figures and new narratives remain separate previews for human review.
6. Apply with the same command plus `--publish`. An already archived date is a no-op. Do not silently rewrite an old edition; a correction needs a new revision and reason. Copy the accepted snapshot into `public/data/ltc-snapshot.json` only when a new edition is accepted. A candidate or local archive write is not evidence of website publication.
7. Run `pnpm check`. Verify the new issue, its permanent date page, month calendar, magazine home, archive, RSS and edition JSON agree. An older correction must not displace the latest publication day. Check desktop/mobile rendering, source links and edition dates. Then run `pnpm release:prepare` to create an upload containing only the verified static files.
8. Preserve a Git commit containing only the accepted edition data on the existing non-production review branch, using a non-forced update from the observed remote head. If the branch moved unexpectedly, stop and reconcile. Never merge #52 as part of the daily job.
9. Use the existing authenticated Vercel project and its verified account scope. Create a prebuilt production candidate with `--prod --skip-domain`; inspect it and verify its served edition/date-page/month-calendar/archive/RSS/JSON against the checked output before promotion. Never disable deployment protection. Immediately before promotion, re-read the authoritative publication policy in the original project (not only the isolated copy) and confirm the automation has not been paused. Recheck the accepted implementation digest and remote head. A new pause, code change or competing release cancels promotion. Promote that exact candidate to the existing HTTPS site only after these checks pass. Leave satnam.x alone.
10. Fetch the public canonical pages after promotion and compare their bytes to the release. Record the exact source commit, edition ID, artifact hash, deployment ID, prior deployment for rollback and verification result. If verification fails, restore the previously verified deployment and report the failure. Retry an unpromoted committed edition before preparing another date; check the receipt rather than mistaking local archive presence for live publication.
11. Save source, static output, normalized evidence and the release receipt to the existing private Drive launch folder when available. Preserve existing permissions. Never include credentials, account setup files or node_modules. Update the private accepted implementation digest only after an explicitly authorized code release, not after an unexpected change.

## Stop and recovery

Set `paused: true` in `config/ltc-publication.json`, pause the Codex automation, or ask the AI editorial lead to stop publishing. Any of those should prevent the next release. Failed checks keep the prior dated issue in place. Record a missed run; do not fabricate a backdated edition. Sustained new failures, a required decision or a material correction deserve a notification. Routine successful publication should stay quiet unless the founder asks for daily reports.

An always-on cloud runner remains an operational upgrade. It requires a separately reviewed deployment identity and canonical Git/Vercel linkage; the current project still points to the older repository lineage. Do not silently install broad credentials or claim that the local schedule solves that dependency.

## Publication desk: one issue per date

The publication date in America/New_York is the editorial identity of an issue. Each date has a permanent page (`/conversations/editions/YYYY-MM-DD/`) displaying its latest accepted revision. Exact revision URLs and JSON remain immutable. Corrections stay under their original date and do not count as another daily issue. Previous/next navigation moves between published dates, skipping gaps without inventing content. Monthly calendars link only dates that exist in the accepted archive. The archive landing page shows the 14 most recent publication days and links all monthly archives; daily records automatically create month pages as the archive grows.

The operating rhythm is a target, not a service-level guarantee:

- At the 10 a.m. New York scheduled run, collect approved sources, validate identity and effective dates, and prepare that local day's candidate. Do not advance a date merely because a source used UTC.
- Before publication, check the edition contents, sources, missing coverage, corrections and reader journeys. Stop or withhold when acceptance gates fail.
- Release one edition, verify it publicly, then preserve its exact evidence and deployment receipt. The homepage always says latest published and shows its real date; it must not label an older issue today.
- During follow-up work, collect community questions, pitches and corrections as separate editorial candidates. Feature publication requires the editorial review appropriate to its subject. Do not invent a human reviewer.
- A missed run leaves a gap. Resume on the current local date after fresh checks; do not manufacture a backdated issue. Weekend and holiday source dates remain visible. There are no automatic morning/evening second editions.

The source collector, evidence checker, data editor, design reviewer and release archivist are distinct accountable workflow roles. The human founder owns the policy and stop control. A future cloud runner must use this same archive identity and acceptance process, with separately reviewed credentials and deployment linkage.
