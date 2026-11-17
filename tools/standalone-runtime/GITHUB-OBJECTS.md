# Dormant content-addressed Git object transport

This is source-only implementation with synthetic transport/transaction tests. No actual object uploads, credentials, services, branch hooks, preview, production changes or costs were exercised. Network and mutations default off; the application entrypoint remains disabled.

## Exact plan, not a generic upload API

`prepareGitObjectPlan(plan)` checks and snapshots `{pins,blobs,trees,commit}`:

- `pins` is the exact existing complete candidate observer schema, including baseline/candidate commit+tree IDs, final issue-record hash and four public artifact hashes/date/revision/expiry.
- `blobs` is at most five distinct `{sha,base64}` objects, each at most2MB and8MB total. They represent the updated public registry and four edition files, not private renderer provenance or controls.
- `trees` is a bottom-up list of at most32 complete direct-entry trees `{sha,entries}`. Entries retain path, mode, type, SHA and blob size metadata. No base-tree implicit merge, deletion/null entries, symlinks or submodules. Raw tree serialization and Git SHA1 are reconstructed independently.
- `commit` is an unsigned, single-parent, fixed-metadata form `{sha,tree,message,author,committer}`. Both people have explicit name/email/date, reviewed as public metadata; dates are exact UTC milliseconds with whole-second precision. Header delimiters/control characters/invalid UTF8 are rejected. The message has one terminal LF, is bounded and cannot contain NUL/control bytes. Exact standard raw Git bytes are constructed and hashed. Provider normalization that returns a different SHA **holds**, never silently changes the plan. Signed/merge/implicit-date/implicit-author commits are unsupported.

All new objects must be reachable in the planned candidate. A temporary local response overlay supplies planned object bytes to the existing data-only checker; baseline requests use the real injected read-only adapter. This is explicitly **planned structural validation**, not provider observation. It checks immutable history, fixed registry and four paths, byte hashes and inert reader HTML before any POST. Private provenance cannot be appended as a fifth public artifact. Newly observed prior-file sizes remain provider metadata; raw tree hashes bind paths/modes/object IDs. Semantic accuracy/final source review is not manufactured.

## Executor

`createGitHubCandidateObjects({plan,github,claim,journal,loadApproval,clock,networkEnabled:false,mutationsEnabled:false,timeoutMs})` exposes `identity()`, `key`, `advance()` and `reconcile({finalizeIntent:false})`.

The GitHub config is the existing fixed-repository reader config and fixed `agent/standalone-candidate` branch, plus an independently configured secret-reference resolver. `loadApproval` must independently return the exact action `create-unreferenced-git-objects`, full identity (including plan SHA and every effect request digest), reference, reviewDigest, notBefore/expiresAt, and `publicDataAndAuthorMetadataReviewed:true`. The boolean is a required scoped assertion from the external approval loader, not generated authentication. No final-edition factual approval is inferred from it.

Each advance:
1. Loads the durable exact sequence and independently scoped approval.
2. Revalidates planned candidate against actual baseline; all objects must be used.
3. Reads back previously completed objects; checks branch baseline, control owner/fence/lease/stop and deadlines.
4. Persists and reads back the exact pending intent before one POST.
5. Rechecks control/intent/expiry, then POSTs only to fixed `/git/blobs`, `/git/trees` or `/git/commits`.
6. Requires HTTP201, exact expected SHA/URL, then a separate actual Git-object GET; saves completion under the live controller.

The last follow-up advance runs the complete candidate observer against **actual provider responses only**. It returns `candidate-objects-provider-observed` only when this passes; the candidate is still unreferenced. No refs, branches, aliases, settings, preview or promotion mutation methods exist here. Object upload to a public repository is nevertheless a public data transmission and requires explicit approved scope.

Blobs/trees have raw object bytes reconstructed and SHA verified. The commit's expected local raw representation is hashed, and the provider's returned ID/tree/parent are checked, but REST does not expose raw commit bytes here. `commitRawBytesVerified:false` remains explicit. Real GitHub serialization compatibility has not been exercised.

## Unknown outcomes and concrete persistence

`createFirestoreGitObjectJournal` composes the injected official SDK with existing global controller and fixed preexisting root `newsroomPrivateGitObjectsV1/inventory`, rows `newsroomPrivateGitObjectPlansV1/<identity SHA256>`. Root fields: schemaVersion1, generation `standalone-git-object-inventory-v1`, initialized true, exact repository, positive revision, claims mapping to exact `{revision,stateSha256}`. Root initialization/migration is intentionally absent. Project/database/claim are explicit; ambient emulator is rejected.

State is `{revision,cursor,pending,identity,approvalReference,reviewDigest}` with `revision=2*cursor+(pending?1:0)`. Fresh unclaimed+absent row reads zero; first intent atomically claims the key and creates its row. A known missing/reset/orphan row holds. Each transition updates the indexed state digest and revision atomically. Another unresolved pending plan blocks new allocation. Capacity100 holds without history trimming. Controller data is separately bounded to512KiB; valid control JSON larger than2KiB is supported. Transactions contain no provider HTTP calls.

Unknown HTTP/journal outcomes are latched. A fresh instance never repeats a pending POST. `reconcile()` observes only the exact expected content-addressed SHA, even after approval expiry. It neither searches by name nor assumes a404 permits retry. Explicit `reconcile({finalizeIntent:true})` can close a successfully read-back pending object under a current live controller, without POST; this is a local journal mutation and requires mutationsEnabled. Expired original permission still blocks creating any further objects. If the object is missing or readback uncertain, the intent stays held. Another independently approved future plan is not automatically generated.

No durable-store authenticity follows from a caller-supplied JSON object; production must use the configured SDK/identity and independently initialized state. Whole-root rollback, IAM compromise, malicious injected callbacks, credential scope, external writers and the CAS-to-HTTP interval remain external trust limits. This is cooperative orchestration, not a distributed atomic transaction or malicious-writer fencing.

## Tests and gaps

`node --test test/github-candidate-objects.test.mjs` composes the actual planned-overlay checker, bounded HTTP adapter, concrete SDK journal and final actual-object checker with synthetic Git objects and fake transactional storage. Fixtures are exported at `test/fixtures/github-objects-fixture.mjs` for source-only orchestration tests. Tests cover all object stages, restart, hash/normalization/header rejection, unknown outcomes, explicit closure, lost/reset state, control bounds and expiry. There is no live provider/OAuth/Firestore compatibility proof.

This module accepts a precomputed reviewed plan. A production artifact-to-plan generator, authentic approval/source-review loading, initialized IAM-protected state, credentials, true build/source provenance and controlled release orchestration are separate prerequisites. It does not publish draft editorial artifacts or relax existing safeguards.

Official primary contracts consulted: [blobs](https://docs.github.com/en/rest/git/blobs#create-a-blob), [trees](https://docs.github.com/en/rest/git/trees#create-a-tree), [commits](https://docs.github.com/en/rest/git/commits#create-a-commit), API version2026-03-10. Only exact supported creation bodies are used; no arbitrary REST dispatch.
