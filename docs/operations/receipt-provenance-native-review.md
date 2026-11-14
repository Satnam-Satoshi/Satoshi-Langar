# Native approval and descriptive receipt provenance

Local candidate only, no upload or live calls. All installation/configuration pins remain placeholders.

Authority is GitHub's native owner environment approval, bound by authenticated Actions reads to one current main workflow run, attempt 1, two exact jobs and the approved environment/owner IDs. Ordinary incident text and numeric run ID/attempt are receipt provenance, never a bearer secret or permission. No previous authorization value is copied, encoded, derived or needed by these new modules.

Before native admission, fixed GitHub API reads collect the complete workflow dispatch inventory (maximum 100), read every run and prior attempt-1 jobs/steps, then recheck inventory IDs. Any prior invocation must be completed failed/cancelled with exactly one known creation step explicitly skipped. A prior executed, absent, ambiguous or active creation blocks. This supports a first actual creation following a verified skipped invocation; not a retry after uncertain creation. Underlying publication evidence-upload failures are a separate workflow and are not receipt creation evidence.

Receipt POST uses exact descriptive body, private target and owner, existing publisher OAuth identity, final fresh admission guard after OAuth waits, and one attempt. Full native blank-document/privacy/readback checks remain. Read-only lookup searches run provenance and validates incident/body ownership; zero, multiple or uncertain matches never permit creation. Lookup is a separate API, not an automated retry route.

The single process latch and attempt-1/native gate are bounded operational controls, not durable exactly-once storage. Trusted workflow concurrency and code prevent permitted concurrent invocations; administrator changes and run deletion can defeat historical inventory. Do not delete relevant run history. Source provenance relies on the reviewed pinned checkout and exact manifest before Google access; API fields alone do not prove executed code. No ledger clearing, publishing or unpause is implemented.

The two-job template has no credential references or checkout in the gate job. The creation job alone receives existing Google secrets. Fill reviewed source/manifest/module hashes and privately resolve target/incident placeholders only after independent review and approval. Initial native approval gate configuration was separately verified by coordinator. This candidate does not configure environments.
