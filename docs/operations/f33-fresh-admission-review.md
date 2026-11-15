# F33 fresh website admission: isolated repair candidate

Human owner: Founder. Mission: resume a new website generation without replaying
fence33 or misclassifying its uncertain upload. Permissions: offline code/test
only. Emergency stop: existing publication flags, source pause and ledger pause.
Audit trail: immutable `f33Retirement`; a distinct exact admission configuration.
No personal evidence or credentials are included in this branch.

## Implemented

- Pure, snapshot-bound fresh admission proposal preserves the retired archive,
  UNKNOWN and latest accepted release. It is not an authority to apply it.
- GoogleDocsStateAdapter checks F33 transitions before provider writes, including
  callers using direct adapter CAS rather than DurableCloudState.
- Default behavior is denial. A configuration must be supplied by a separately
  authenticated, protected caller; it is never inferred from the ledger.
- The configured transition permits only that exact initial proposal, preserves
  the archive/admission thereafter, rejects old operation IDs, file IDs, run,
  generation and artifact package, and requires current-date fresh leases.
- DurableCloudState validates retained F33 lineage before admitting operations.

## What is deliberately not implemented or enabled

This is not a runnable activation workflow. No policy, variable, credential,
ledger, receipt or public alias was changed. No dispatch is included. No automatic
retry or fallback to an unguarded adapter is permitted.

A current-source patch cannot protect an old executable revision that still has
valid credentials. The raw dedicated retirement adapter is also outside the shared
Docs adapter. Both must remain externally excluded. Calling this patch complete
protection of all historical writers would be incorrect.

## Shortest production path

1. Review this small diff, then add a distinct guarded activation entrypoint. Its
   authenticated owner capability must bind the exact configuration and snapshot;
   independently read and hash the finished retirement receipt. Do not interpret
   the old retirement native approval as fresh publication approval.
2. Under `ltc-production-publication` concurrency, prove external exclusion of
   old workflow/rerun/raw-retirement/local writers and pin that exclusion proof,
   new implementation and source. Leave publication gates off until this succeeds.
3. Re-read the exact paused ledger and current public baseline. Bind the owner
   approval to snapshot, retirement and receipt hashes, implementation, source,
   current publication date, exclusion proof and previous deployment. Configure
   only this exact admission. Apply once by revision CAS and verify exact nonce
   envelope; ambiguous writes never authorize retry or release.
4. Supply the same protected admission configuration to the ordinary website
   runtime, retain current implementation/source/public checks, then run one fresh
   dated generation. The existing daily path acquires fence35 or newer. Do not
   reuse any fence33 operation, file, package or receipt.
5. Verify both live domains, dated page, homepage links and private release summary
   before claiming publication. Autonomous later runs still require durable
   daily admission, source freshness and provider evidence checks.

The initial admission candidate only clears paused; it does not change latest
release or create a new lease. Existing activate-cloud does not wire this F33
review and must not be used as an implicit substitute.

## Authenticated runner addition

`cloud-ltc-f33-fresh-activation.mjs` now provides native-owner-authenticated
orchestration, completed-receipt/snapshot binding, one exact CAS and nonce readback.
`cloud-ltc-f33-fresh-provider.mjs` implements the selected-resource Google adapter
and keeps the retirement receipt read-only. The new authority requires a distinct
fresh-activation workflow/job; it cannot reuse retirement approval.

No workflow/CLI is installed. Persistent writer exclusion remains a mandatory
trusted capability with no default or boolean fallback. Current managed GitHub
connector does not expose environment administration reads. An attempted
read-only existing Safari session inspection found no accessible window. Thus
required-reviewer/secret-isolation status remains unverified; no change was made.

Workflow disabling or zero active runs alone is not sufficient proof against old
executable reruns. Inspect existing secret-bearing environment protection first.
If every legacy writer is already gated, deny those old runs while admitting only
the newly reviewed workflow. Otherwise explicit credential isolation/revocation
is needed before this runner can safely lift the ledger pause. Do not claim the
local implementation alone has removed this deployment prerequisite.

## Correction: concrete disabled-workflow exclusion

GitHub's official rerun documentation explicitly states disabled workflows and
all their jobs cannot rerun until re-enabled. This resolves the previous concern
that disabling would not exclude historical revisions. The new exclusion module
requires readback of all ten legacy credential-bearing workflow IDs as disabled,
an exact complete inventory with distinct new workflow IDs, and no other
nonterminal runs. Existing queued runs must finish/cancel before admission because
repository secrets are captured when queued; environment secrets are read at job
start. No credential rotation is necessary for this bounded cooperative model.

Sources: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs
and https://docs.github.com/en/actions/reference/security/secrets

## Staged cutover, not an immediate disable

1. Keep existing controls unchanged while staging the two distinct-ID replacements
   with `LTC_F33_ACTIVATION_ENABLED` and `LTC_FRESH_PUBLISH_ENABLED` absent/false.
2. Complete credential-free validation of the exact source policy and protected
   admission/runtime/migration bundle against the real private ledger and receipt.
   `preflightFreshPublication` performs those checks. It does not replace real
   historical proof with fixtures. The source policy must be reviewed unpaused
   for dry-run/publication, and ALL current-controller migration pins updated to
   the new implementation digest, retaining historical completion pins unchanged.
3. Preserve social maintenance before disabling old daily ID373667484. Its social
   bootstrap/private-draft/reconciliation modes are not included in the new website
   workflow. A separately reviewed social replacement is being coordinated by the
   social publisher owner. Until that equivalent path is staged and its new ID is
   incorporated into the exclusion allowlist, HOLD the legacy daily disable.
4. Explicitly disclose that manual social maintenance buttons move to a new
   workflow. Do not touch the Buffer queue, posted posts, connector schedules or
   PDF/email scheduler. No supplied new website workflow has Buffer/email secrets.
5. Install new workflows gated off, wait for CI, verify distinct IDs and source
   integrity. Then, under separately authorized cutover, disable legacy credential
   IDs and read back all states and zero nonterminal runs. Verify durable local
   publisher stop; do not substitute a Mac being locked/offline.
6. Apply exact owner-approved admission once, read back its nonce, configure the
   resulting admission digest/runtime, and run one fresh website edition. Verify
   both domains/links and ledger before enabling scheduled fresh runs.
7. Rollback stops new workflows/gates while retaining legacy IDs disabled. Never
   undo retirement, erase UNKNOWN, or re-enable old daily as a fallback.

The existing publication is already paused; staging must not be represented as
restoring a missing edition. No live workflow state or publication setting has
been changed by this isolated branch.

### Staged finite social replacement (no live cutover)

`ltc-social-maintenance-v2.yml` preserves `inspect`, `bootstrap`,
`private-draft`, `reconcile-private-draft`, and `reconcile-sent` on a distinct
workflow identity. It is manual-only, founder/main/first-attempt, gated off by
absence of `LTC_SOCIAL_MAINTENANCE_ENABLED`, and serializes in the same group.
It reuses existing reviewed social commands and paused-ledger policy checks,
with dedicated acceptance source/implementation pins. It carries no website,
Vercel, email or PDF credentials and does not publish or schedule Buffer posts.
Existing queued Buffer posts remain untouched. Private draft mode can create
only the existing owner-policy-bound acceptance draft, never a marketing post.

The exclusion inventory now requires **18 identities**, including all three
new replacements. Do not disable legacy daily until the new social workflow
is installed and its selected-resource policies, implementation/source pins,
and credential-free tests are verified. Policies remain exact, time-bounded
and revision-bound: preserving an entry point does not make stale bootstrap
or draft policies reusable. Keep the old daily ID disabled permanently after
cutover; rollback holds new gates off rather than enabling old writers.

No live workflow registration, gate changes, credentials changes, dispatch,
ledger writes, Buffer edits, or publication were performed while staging this.

Maintenance dispatch constraint: do not queue manual social maintenance while
website activation/publication is active. The shared concurrency prevents
simultaneous execution, but the intentionally strict exclusion also rejects
another queued run. Dispatch only after publication is terminal and its lease
has been released; otherwise the next proof refresh can stop the publisher.
This constraint is not a promise of independent/non-disruptive maintenance.

### Protected read-only preflight mode

The activation workflow defaults to `read-only-preflight`, behind the same
native owner environment gate. It runs selected private reads and the existing
pure real-bundle checks in-job. Transport permits Google GETs and OAuth token
refresh only; no Docs/Drive mutation, GitHub mutation, Vercel or Buffer is sent.
Only categorical status/phase is printed, with no private artifact upload.
Missing exact review/migration values remain blockers. The runner never creates
admission values, rewrites migration pins or changes the paused policy.
Actual activation requires mode `activate` and its explicit enabled gate;
native activation evidence also requires the preflight job to be skipped.
