# Review proposal: isolate one failed setup stage

This is a founder-only proposal. It is not incident approval, recovery success, deployment acceptance or permission to activate publishing.

The real setup run backed up 36 parts and passed full restoration, then its staging command became uncertain. Separate recovery preserved the paused lease. The original stage remains **UNKNOWN**. Absence from a deployment list is not treated as proof of non-application. The complete original ledger is archived privately and its raw download matches the original bytes; archive IDs and private receipt values stay outside this repository.

Two client incompatibilities were reproduced: legacy account lookups fail with the project-only token, and CLI 65 forwards a post-command `--token` flag to native curl. The reviewed invocation uses `VERCEL_TOKEN` only in the deploy/curl child environment. Protected reads use the existing automation bypass only in the curl environment, with full independently verified deployment URLs. No credential is created and no protection is disabled. The actual pinned vendor parser is exercised offline; local public HTML, binary and exact-redirect checks also passed with dummy credentials.

## Required order

1. Obtain explicit Founder approval of the exact source and scheduler reviews, protected implementation pin, encrypted incident-review packet, resulting incident pin and bounded stage-only retry. General autonomy permission is insufficient for this incident decision.
2. Run the corrected read-only recovery preflight first. Its separate Actions attempt must actually verify the three protected baseline records with environment-only authentication. This proof is explicitly not stage acceptance; the original unknown stage remains held.
3. Only after that proof passes, refresh the owner-only archive readback, public baseline, origin-attempt status, social pause, project cron/deploy-hook checks and independently inspected webhook/integration facts. The approval persists, while preparation and provider observations must be fresh. Pin the exact original state, plan, fence, controller, archive and isolation facts in the protected review packet.
4. The quarantine command captures one original ledger revision, verifies all conditions, and performs one revision-CAS transition followed by exact readback. A conflict or ambiguous result stops; it is never automatically retried.
5. The transition retains the original uncertain stage unchanged, its full private archive pointer and an explicit unresolved incident. It advances the fencing generation and leaves the active generation paused with no lease. It does not label the old stage accepted or not-applied.
6. Verify and pin the resulting incident hash independently before a fresh stage-only plan. The old plan and operation lineage are permanently forbidden. A new attempt must use new identifiers and again prove cloud backup, restoration, unassigned staging and separate crash recovery.

## Boundaries

Only this specific setup shape is eligible: all 36 evidence operations confirmed, exactly one uncertain alias-free stage, no source writes, promotions, rollbacks or social effects, and no previous production checkpoint. The independent isolation review must establish no artifact/project cron, deploy hook, project webhook or installed deployment integration, and only the four reviewed read-only functions. Unproven isolation keeps the hold.

The encrypted protected `LTC_SETUP_QUARANTINE_REVIEW_JSON` contains the specific incident decision, fresh isolation evidence and verified private archive pointer. `LTC_SETUP_INCIDENT_SHA256` permits only the new stage generation after exact readback. Neither setting authorizes production. The legacy paused-resource probe continues to report a quarantined unknown incident as unresolved rather than hiding it behind empty active intents.

All existing production and social activation gates remain closed. The draft production incident helper rejects unresolved quarantined incidents. A separately reviewed promotion/rollback and production policy is still required; a successful build, protected read or quarantine is not a public release or device-independent newsroom.
