# LTC cloud migration acceptance record

Prepared October 6, 2026 America/New_York. **Cloud publishing inactive. Local automation active.** This is preparation, not cutover approval or a public release receipt.

## Agent responsibility

Mission: upgrade the existing bounded factual publisher without interrupting the accepted local service. Responsibilities: audit, isolated runner/workflow draft, tests, private evidence design and rollback/cutover checks. Knowledge: repository AGENTS.md, current release/runbook/source docs, founder handoff and official provider documentation. Permissions: read, research, isolated code changes, tests and draft review; no protected merge, account setup, spending or production mutation. Escalate conflicts, changed head, uncertain remote operations and missing scoped service access. Memory: versioned secret-free instructions plus separate owner-only evidence. Audit trail: Git diff, private run receipts and test outputs. Human owner: Satnam Satoshi founder. Emergency stop: do not proceed if publication policy is disabled/paused; cloud activation stays false. Specialists propose only; existing local website publisher and LTC Publisher remain sole production writers.

## Verified inventory

- Original repository HEAD and remote review branch: `f2576e5c2c2acbf1eface6583eae1dd5f9316edc`; tracked source clean, two unrelated page 2.tsx files preserved in the original workspace. Isolated migration clone contains committed source only.
- Remote main: `44a725471ce130986d245d7ec89a30a233c874ff`, the merged scheduler foundation. Existing workflow `.github/workflows/ltc-daily-publication.yml` was fetched and inspected. The review branch lacks that installed workflow; `ops/` holds its template.
- Private release receipt verifiedAt `2026-10-06T18:40:57.304332+00:00`: daily `2026-10-06-r1`, production `dpl_9pX8ouoie4iqUDVmmRMtdpUzqAr6`, rollback `dpl_HqDBYqE9w6e7MV7jeMuWuTQsiWFa`. These are recorded prior-release identities, not newly verified provider pointers.
- Local website heartbeat ACTIVE at 10:00 New York; social heartbeat ACTIVE at 10:45/14:45/18:45; separate Treasury ACTIVE hourly. Supported automation view inspected; schedules unchanged.
- Public sign-in remains Google-only; newsletter and YouTube daily publication remain disabled. Private social ledger records active X/Instagram and October 6 delivery URLs. No social write or repost in migration work.
- PR #55 remains open, unmerged. Its README/campaign draft still says login and social scheduling are inactive. Those statements conflict with newer verified receipts; reconcile that documentation before approving it. No PR action taken.
- Latest backup receipt has conflicting legacy success text and newer explicit timeout/unconfirmed text. Treat the newest package's remote backup as unconfirmed; do not blindly repeat upload. Earlier owner-only package metadata is recorded, remote restore untested.

## Audit and implementation scope

The former cloud runner invoked the base-only preparer, omitted community/newsroom output, verified ten files on the legacy alias only, and calculated a different implementation digest from the documented local guard. Offline helper tests did not establish full cloud release behavior. The migration adds the complete deterministic pipeline and expanded immutable data/manifest guards. The workflow update template aligns data exclusions and proposes 10:00 with one 10:20 retry in America/New_York; these are disabled proposed slots, subject to cutover acceptance.

Do not install or merge the workflow update as a second publisher. Update the already-existing scheduler through a narrow default-branch change after runner review. A new accepted digest must be calculated from the exact committed reviewed source, never copied from this draft. Pin Node 22.23.2, pnpm 11.19.0 and the tested exact Vercel CLI; no latest-version install.

## Durable private memory and receipt contract

Use an owner-controlled access-restricted store already approved for this project; do not add a paid vendor. No desktop OAuth/session export. Public repository stores methods and approved instructions only. Raw third-party bodies, private normalized inputs, candidate, tests, source/tree/digest, complete static manifest, prior production manifest, deployment identities and social deduplication stay private. Restrict raw material to the minimum necessary and observe rights; no member records or secrets.

Define run ID `ltc:web:YYYY-MM-DD:<github-run-id>:<attempt>` and stable publication key `ltc:web:YYYY-MM-DD`. A durable compare-and-set lease must record writer identity, expected source head, expiry and fencing generation. Check fencing/control state immediately before commit and promotion. Never automatically steal a lease when the old operation could still be pending; reconcile GitHub/Vercel first. GitHub concurrency limits cloud jobs but does not coordinate the local writer.

Durable states: admitted, collecting, candidate-prepared, checked, source-committing, source-committed, uploading, candidate-verified, promoting, public-verified, rollback-attempted, rollback-verified, withheld, reconciliation-required. Save intent before each remote mutation and returned identity immediately afterward. Timeout/cancellation is uncertain, not failed delivery. Reconcile expected Git commit, deployment metadata, aliases and public hashes before retry. Never recollect or replace a committed issue to recover deployment.

Backup each accepted run as a content-addressed manifest/package; record bytes, SHA-256, store object/version, owner-only access and readback. Retain accepted release/rollback manifests and normalized evidence permanently unless the owner adopts a documented retention change; retain diagnostic/raw bodies for a proposed 90 days subject to rights review. A 30-day workflow artifact is diagnostic transport only, not the permanent archive. Require restore to a fresh directory, hash verification, archived issue/export checks and recovery of the durable ledger before enabling publication. Reconcile the known uncertain Drive upload by exact name/hash/size before any retry.

## Preparation validation

A network-enabled **local isolated** dry run passed on source `15b8d8e844a3a53eff4ab185ba563d3e067b0ae2`, implementation digest `7ac3dce806832654e9cb112d9f29372e042ed630abea2a7dcacbbe315df959ac`. It collected four fresh inputs, validated a fresh flagship candidate, preserved October 6 issue/snapshot bytes, created only community/newsroom clone records and passed checks/build. No GitHub write, candidate upload or public release occurred. Receipt and raw/normalized evidence are retained privately. It is not a GitHub-hosted cloud dry run. Later exit-2 gap handling and earlier scratch-path receipt persistence were verified by offline regression tests; semantic freshness gates remain unchanged. Publication is unconditionally withheld pending acceptance.

The review package remains local: terminal Git has no authenticated GitHub session, and the connected branch-creation capability did not accept the explicit base arguments. No remote migration branch or PR was created. The founder approved push/draft PR; secure supported repository-write access remains the missing prerequisite. Do not export desktop credentials to satisfy it.

## Required engineering acceptance before owner activation

1. Test complete new-day collection using the unchanged registries from the actual GitHub runner. Withhold stale fields and preserve partial gaps. Save fresh inputs and hashes privately. Same-day builds are not this test.
2. Prove digest parity, scope/immutable history, paused runs, competing jobs/head changes, same-day no-op and committed-but-undeployed retry.
3. Implement and test the durable lease/receipt adapter and restoration. Hard termination during promoting must leave reconciliation-required state, never trigger blind repeat.
4. Verify exported edition/community/newsroom records against inputs; exact candidate bytes, daily/broad RSS, older records, both hostnames, current-date/archive/navigation and art. Preserve magazine root redirect and www redirects.
5. Stage on existing project `prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx`, team `team_yc5ZBvCbWT2M7iGyj3vQDOzk`, with explicit checked `.vercel/project.json`. Test protected readback, in-flight stop, promotion, uncertain timeout and competing-production rejection. Capture old manifest and prove rollback restores its bytes on both domains, not just provider ID.
6. Audit actual included GitHub/Vercel/storage costs and quotas. No new AI/cloud subscription, model credential or advertising budget authorized.

## Single-writer cutover checklist

- Founder reviews exact implementation/source digest and narrow default-branch scheduler update; no protected merge without approval.
- Scoped private Vercel secret configured in `ltc-production`, restricted to reviewed main workflow. Repository job token only for GitHub writes. Verify project/team/CLI and keep LTC_CLOUD_PUBLISH false.
- Review existing native Git linkage and prove competing production deploys are prevented; do not blindly disconnect it.
- Complete above dry-run/candidate/recovery/restore gates and privately retain receipts. Record canonical emergency stop and durable owner/fencing generation.
- Reconcile any local in-flight run. Transfer accepted private ledgers; pause only the old local website writer through supported automation tools, then activate only the accepted cloud writer in one coordinated session. Preserve 10:00 New York and bounded retries.
- Social remains with LTC Publisher and local windows. Transfer only after separately supported cloud Buffer access and exact-channel private draft/readback; desktop OAuth is insufficient. Never export it or create a second distribution writer.
- Observe several successful dated releases and recovery receipts before claiming unattended operation. Alert meaningful failure, uncertainty, rollback, correction or owner decision; routine successes and known unchanged gaps stay quiet.

## Concrete owner setup still required

After engineering gates pass: approve the reviewed implementation/protected merge, privately provision scoped Vercel access in protected environment, accept the reviewed native-linkage/cost arrangements and authorize coordinated cutover. A durable storage identity/access grant may require owner setup once the existing supported store is selected and restore tested. Buffer cloud authorization is a separate later gate. Do not request mission, donation addresses, Google activation, desktop Buffer connection, ElevenLabs payment or PR #54 approval again.
