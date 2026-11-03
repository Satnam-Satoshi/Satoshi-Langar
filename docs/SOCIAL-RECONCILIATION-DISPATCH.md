# Finite social reconciliation dispatcher

This change adds the `social-reconcile-sent` manual choice and one maintenance job to the existing daily workflow. The original release/probe/acceptance jobs, schedule and global non-cancelling concurrency group are unchanged. It cannot trigger on a cron event, dry run, acceptance probe, another repository/ref or a non-founder dispatch. It has no website document selection, deployment credentials, repository write permissions or artifact upload.

The maintenance checkout uses its own reviewed source SHA. The inline workflow guard verifies that exact clean commit and founder context before any source code executes. The source implementation digest and focused tests run before private input is materialized. Exact input/plan/policy binding is validated before the existing Google and Buffer credentials are supplied. The source controller uses a read-only Buffer client and one revision-checked social-ledger write. Publication flags are false only in this job; repository-wide website settings are not changed.

Protected maintenance configuration, to be installed only after review:

| Setting | Purpose |
| --- | --- |
| `LTC_SOCIAL_RECONCILIATION_SOURCE_SHA` | Exact reviewed controller commit, also supplied in `acceptance_source_commit` |
| `LTC_SOCIAL_RECONCILIATION_IMPLEMENTATION_SHA256` | Reviewed controller digest; mapped into this process's `LTC_ACCEPTED_IMPLEMENTATION_SHA256` |
| `LTC_SOCIAL_RECONCILIATION_POLICY_SHA256` | SHA-256 of exact private policy bytes |
| `LTC_SOCIAL_RECONCILIATION_BUNDLE_PARTS` | Exact integer 1–4 |
| `LTC_SOCIAL_RECONCILIATION_BUNDLE_PART_1` through `_4` | Ordered private bundle parts, each at most 40,000 base64 characters; unused parts must be absent or empty |

The concatenated parts decode to gzip containing exactly `inputJson`, `planJson` and `policyJson` strings. There is a 2 MB decompression cap and 1 MB cap for each string. The 40,000-character part bound stays below GitHub's [48 KB per-secret limit](https://docs.github.com/en/actions/reference/security/secrets). The bundle is private operational data, not new credentials. Do not put it in the public repository or public workflow artifacts. Validation errors are redacted before logging.

Use existing `LTC_STATE_FOLDER_ID`, `LTC_SOCIAL_STATE_DOCUMENT_ID`, and existing Google/Buffer credentials. No key creation or permission expansion is part of this change. The original publisher's canonical ledger remains an input, not a file modified by this job.

After source and dispatcher review, a founder dispatch uses `acceptance_mode=social-reconcile-sent`, the exact source commit, `dry_run=false`, `acceptance_probe=false`, and `bootstrap_previous_manifest=false`. Keep other acceptance inputs at their defaults. The shared workflow lock serializes this job with the website writer. A changed source, schema, expiry, provider readback or cloud revision stops it. An absent completion receipt requires reading the cloud ledger before any retry; repeated success is a no-op.

This is not campaign activation. The cloud pause, fence, lease, acceptance draft and cutover gate remain unchanged. Single-publisher cutover still requires a complete history/queue review, explicit handling of historical native posts, a quiescent old writer, a reviewed campaign manifest/controller, public-media checks and accepted duplicate/cap/uncertainty behavior. Existing scheduled Buffer posts remain scheduled; a cloud pause does not cancel them.

Validation: run `node --test tests/social-dispatch.test.mjs`. The suite executes the actual pre-source guard against a temporary repository, parses all embedded shell/modules, exercises the exact multipart decoder, tests dispatch exclusions, and verifies that the original workflow bytes are unchanged except for the new mode/job. CI includes this suite.
