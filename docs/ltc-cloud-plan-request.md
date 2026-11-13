# Keyless cloud plan request (draft, not activated)

This interface uses the existing GitHub connector to create a repository issue, then a trusted-main Actions workflow dispatches only the existing **credential-free software plan**. It creates no PAT, App key, repository secret or permanent browser session.

## Deliberately limited scope
- ONLY `ltc-software-release.yml` on `main` with `publish=false`.
- No production/preflight dispatch, gates, secret or approval-record changes.
- No changes to daily publisher, accepted source branch or implementation pins.
- Owner identity verified via GitHub event `sender.id`, issue author and refreshed API response, not a name claim in issue body.
- Created issue only, exact title/body schema, unedited open issue, accepted branch's current exact commit.
- No interpolated shell strings or user-controlled URLs.
- Ephemeral GITHUB_TOKEN needs Actions write; its underlying authority is broader than this code's plan-only allowlist. This new workflow therefore requires security review and explicit activation authorization.

## Request through existing connector after activation
Title: `[LTC cloud request] software plan`
Body must be only JSON:
```
{"source_commit":"<exact 40 lowercase hex accepted branch head>","implementation_sha256":"<64 lowercase hex tested digest>"}
```
The connector must produce a verified GitHub user sender ID 268053325. If it acts as a bot, requests intentionally fail closed; inspect delivery, do not loosen the owner check.

## Reliability boundaries
One POST, no retry. Workflow reruns are rejected. On uncertain dispatch, inspect Actions before creating another issue. Different new issues can deliberately request another plan, so this is not global exactly-once delivery. Concurrent requests are serialized but GitHub concurrency may replace pending jobs; callers must reconcile acceptance receipts. A dispatched plan succeeding is NOT publication approval or publication.

## Activation and validation
1. Independent review this entire main-control PR and downstream plan workflow's credential-free boundary.
2. Obtain authorization for new ephemeral Actions-write entrypoint. Do not merge merely to bypass unavailable UI or denied protected edits.
3. Merge control files into main only, not the daily source branch.
4. Create one approved harmless plan request through connector; verify authenticated sender, dispatch and plan result.
5. Disable/remove this entrypoint if identity differs or unexpected behavior occurs. Keep production safeguards unchanged.

Do not expand this to production release until its approval binding and downstream actor policies are explicitly reviewed. A GitHub App dispatcher remains an alternative for broader approved operations.
