# Daily publication deadline and duplicate protection

The existing workflow was scheduled at 10:00 and 10:20 **America/New_York**, after the owner's 09:00 Eastern target. GitHub supports the explicit timezone; these entries were not UTC. The November 2 scheduled run started at 22:56 UTC and completed at 23:38 UTC, so the observed delay was also substantial.

This change prepares 05:17, 06:17 and 07:17 Eastern attempts in the **one existing** workflow and keeps its 60-minute budget, protected environment and `ltc-production-publication` concurrency group. The last planned attempt has 43 minutes of delay margin before a full 60-minute run would miss 09:00. It uses the existing free cloud runner and private ledger. No laptop, Vercel plan upgrade, new service, new credentials or additional writer is involved.

GitHub explicitly warns that scheduled events can be delayed or dropped. This is an earlier best-effort publication schedule, not a guaranteed 09:00 delivery SLA. See [GitHub schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). A firm deadline would require separately reviewed monitoring and/or an independently reliable trigger; it must still invoke this same guarded workflow.

## Durable admission

Both manual routine runs and scheduled runs check the private, revision-CAS ledger before collection, backup, source changes or deployment. A fully verified, compacted release for the current New York issue date or verification date returns `already-published-today` with no ledger write or new lease. The checkpoint is validated against its confirmed private-summary intent, receipt, exact hashes and archive head. A repository issue file, Actions success flag, or in-progress deployment cannot impersonate that checkpoint.

The same CAS that acquires the fenced writer lease performs the date check. Simultaneous requests have one winner. Pause, restore hold, any held lease (including expired) or unresolved effects still fail closed. Malformed checkpoint evidence also fails closed. A failure before effects may release its unused lease; uncertain effects require existing explicit recovery. No existing UNKNOWN or historical recovery record is changed.

The lease records its New York publication date. New effects and renewals stop after midnight, and promotion rechecks that date. A provider request already admitted at the boundary cannot be revoked; its receipt or uncertainty remains subject to the existing recovery rules. Same-day corrective releases require a separately reviewed path; ordinary manual dispatch is not a duplicate bypass.

## Coordinated acceptance

1. Wait for any active publication to finish, independently verify both live domains and the private checkpoint, then re-fetch source/main. Keep the local writer paused.
2. Review the exact implementation PR targeting `agent/wall-street-20261011` and the scheduler-only PR targeting `main`. Require the full pinned-Node build and cloud review checks, plus the daily admission regression tests.
3. Obtain owner approval for those specific PR heads and the coordinated pin/configuration update. Pause `LTC_CLOUD_PUBLISH` before merging; recheck no active workflow/lease. Never change a pin merely to clear an error.
4. Merge the source PR, compute the digest from the resulting tracked tree, and prove it equals the reviewed digest. Merge the matching scheduler-only PR. Update only the three current-controller digest fields in the existing migration configuration, its SHA-256 and the accepted implementation digest. Preserve historical acceptance, source policy, Vercel 65.9.0 and all existing recovery pins.
5. Validate the proposed configuration against a fresh private ledger with the new controller. Restore the previously enabled publication gate only after matching readbacks. Dispatch a same-day verification: it must return `already-published-today`, leave the ledger revision/fence and public deployment unchanged, and perform no collection or publication effects.
6. Verify the next day's first release and later scheduled no-op separately. The code/tests alone do not establish future scheduled delivery. Keep all social gates as found.

## Agent governance for this repair

Mission/responsibility: restore the owner-authorized daily website release and prepare this deadline/duplicate fix. Knowledge sources: repository instructions, live Actions history, private ledger, both public domains and official scheduler documentation. Permissions: isolated code, tests and draft PRs; one explicitly authorized fresh publication. Escalation: exact PR merges and protected acceptance changes require the owner's action-time approval; uncertain writes require reconciliation. Memory/audit: minimal private run/checkpoint receipts outside public Git, public code/tests and PR evidence. Human owner: Satnam Satoshi. Emergency stop: owner pause, publication gate disabled, paused/restore-held ledger, unresolved effects or failed acceptance.
