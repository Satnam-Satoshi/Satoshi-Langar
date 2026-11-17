# Explicit dormant runtime entry

Default `npm start` and container CMD are unchanged: deployment-disabled. Configuration flags cannot activate this entry. No SDK, credential resolver, model, provider or datastore is automatically loaded from the environment.

## Local file inspection

```
npm run runtime:inspect -- --config /absolute/config.json --pins /absolute/reviewed-pins.json --request /absolute/request.json
```

Each file must be canonical UTF8 JSON (sorted object keys, no whitespace/newline), no more than 64 KiB. Paths must be explicit, absolute and non-symlink. The loader opens with O_NOFOLLOW, checks the pinned descriptor is regular/bounded, reads at most 65,537 bytes, then compares descriptor/path identity and modification metadata. Duplicate keys/noncanonical encodings, replacement, malformed/oversized files and extra secret-bearing fields hold with a generic error; contents and filesystem error paths are never echoed. This is a trusted local-file handoff, not protection against a hostile kernel/mount namespace or malicious filesystem administrator. The pins file's placement does not itself authenticate an owner or reviewer.

The CLI only validates dormant deployment config and canonical request and reports exact missing dependency/material categories. It never constructs a vendor client, resolves a secret or calls a service. Source/image/prerequisite hashes remain bindings, not attestations.

## Concrete programmatic wiring

`createDormantRuntimeEntry({configuration,reviewedPins,request,material,dependencies})` provides:

* `inspect()` with no callback/SDK calls. Missing material is explicitly reported.
* `preflight()` binds actual source-review configuration and pinned review envelope through `bindReviewedEditorial`, then invokes actual retained editorial preparation with retrieval and rendering disabled. It reports collection/binding gaps, not authenticated reviews or complete ecosystem coverage.
* `constructDisabled()` explicitly constructs the actual consumer inbox, preparation journal and editorial/Drive runtime graph with every effect flag false. Its only exposed runtime action is disabled `advance()`; no reconciliation escape hatch is exposed because even read-only service access requires separately authorized credentials. It returns null runtime if prerequisites are structurally missing.

Material is exactly `{identity,claim,issue,sourceReview,sourceInventorySha256,workRoot,drive:{folderId,ownerPermissionId}}`. `sourceReview` is the actual source-review module input, with independently supplied configuration/review/collection pins; the current clock is supplied separately by the entry. Its derived Maps, not arbitrary claimed authenticated Maps, feed the pipeline. Identity binds canonical event/run, source commit, image digest and retained source capture. Authority is never inferred from these hashes.

Dependencies are exactly `Firestore, fetch, resolveSecret, loadDriveApproval, observeRuntime, observeSources, clock`. There is no arbitrary module path, tool dispatch, environment credential fallback or deserialized function. Accessors, hidden fields, symbols and nonplain material are rejected before reading/cloning; retained evidence bytes are bounded. SDK construction and arbitrary injected functions are an external code trust boundary and may have their own behavior. Reports therefore distinguish entry-invoked provider methods from unobserved effects inside injected code, rather than claiming that construction or clock calls prove zero I/O.

The real synthetic smoke now exercises this same preflight and concrete disabled graph first, checking its fake provider/state remain unchanged and disabled advance holds. It then runs the existing explicitly synthetic enabled composition for real rendering and mock archive/restart verification. This is not a production enablement path.

## Still missing for real operation

The configuration deliberately remains dormant-only. Real use still needs authenticated runtime operation/execution/template observation; independently retained CI source→image provenance; authenticated source-policy and editorial-review loading; a reviewed version-pinned secret resolver and owner Drive OAuth integration; existing inventory migration/live controller ownership; and a separately reviewed production activation policy/entrypoint. Injecting functions or setting JSON booleans cannot grant those authorities. This module does not provision them or claim they exist.
