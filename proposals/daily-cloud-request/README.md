# Daily cloud request prototype — NOT ACTIVATED

This is an isolated proposal, not a runnable publishing service. It changes no workflow, settings, permissions, source pins or release ledger. The existing daily coordinator stays the sole writer. Run `node --test proposals/daily-cloud-request/daily-request.test.mjs`.

## Scope
Owner-authenticated issue-opened request, fixed normal daily target and inputs only. Numeric owner identity, exact unedited refreshed issue, current Eastern date, ten-minute maximum expiry, fresh trusted evidence, complete runs/ledger/request history, no active run/lease/hold/uncertain intent/completed edition. Atomic per-day claim, one POST, retain uncertainty and never automatically retry.

Evidence must be independently read by trusted adapters, never copied from issue body. Evidence runs must cover every workflow sharing the production concurrency group and include all queued/waiting/in-progress statuses through complete pagination. Missing or unknown evidence fails closed. `claim()` must atomically and durably revalidate current ledger fence, active runs, accepted source, request history, expiry and unexpired same-date admission, not simply write a boolean. Downstream lease/CAS/journal still decides admission against races. `record()` must persist receipts or retain ambiguous claim; it must not release/erase on timeout.

## Unimplemented activation blockers
1. No GitHub API, ledger, durable claim or receipt adapters; no workflow or scheduler. Injected adapters are specification seams, not verified production safety.
2. Source SHA in request is checked only before dispatch. Existing daily workflow resolves the accepted branch at execution, so exact requested SHA is NOT an execution binding. Must explicitly decide whether ordinary accepted data-only head advancement is allowed, or design/review downstream exact source binding. Do not weaken digest guard.
3. No integration test for connector authenticated sender identity or bot dispatch admission. If bot fails, do not remove founder protections.
4. No complete run/ledger adapter mapping or ambiguity reconciliation implementation.
5. No authority is granted by these tests. Any future Actions-write entrypoint needs concrete approval before activation and independent review of complete downstream path.

## Review and verification
Initial independent review found expiry gaps, forged admission, timestamp normalization, moving-source and missing-adapter blockers. Code now uses private admission branding, canonical timestamp/calendar validation, and time/date revalidation both before and after claim. Remaining integration blockers above are explicit. Focused tests cover 43 cases, including foreign/bot identity, altered issue, unexpected input, expired and midnight-crossing requests, stale/incomplete evidence, leases/holds/uncertainty, duplicate concurrent claims, timeout and receipt failure. No real API calls or production writes occur in tests.

This does NOT establish Mac-independent recovery. Existing scheduled jobs already use Ubuntu cloud runners; this proposal targets the missing safe recovery-control path. Keep PR137 software-plan entrypoint separate.
