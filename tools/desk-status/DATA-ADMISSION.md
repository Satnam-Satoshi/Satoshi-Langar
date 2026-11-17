# Draft data-only desk admission

Pure `planDeskDataAdmission` permits a proposed append only at `content/desks/revisions.json`. The file MUST already exist in independently observed prior tree, including an explicitly reviewed empty initial module. Absent file holds for a separate bootstrap review; this module does not authorize bootstrap.

Inputs: now; exact registry/trustedRegistrySha256; priorObservation and candidateObservation `{sourceCommit,treeGitSha,entries:[{path,sha256,bytes,mode}]}`; independently supplied trustedPins `{priorSourceCommit,priorTreeGitSha,priorInventorySha256,candidateSourceCommit,candidateTreeGitSha,candidateInventorySha256}`; actual priorModuleBytes/candidateModuleBytes; trustedPriorModuleSha256; independent sourcePolicies and evidenceInventory as described in REVISIONS.md.

Observations must come from a trusted COMPLETE Git-object observer. This pure module does not fetch Git or prove completeness, authenticate pins, or derive a Git tree ID from SHA256 file entries. Never take trustedPins or inventories from candidate-authored claims. The route snapshot helper filters source files and is NOT sufficient for this admission boundary. Actual complete-object observation/CAS wiring remains a separate operational step.

Inventory entries are unique, sorted by deterministic code-unit path order; no traversal/backslash/control paths; bounded 10000 entries, each file32MiB, serialization8MiB. Inventory SHA256 uses a separate bounded canonical serializer, not the per-record500-array bound. Existing executable code may remain unchanged, but data is100644; no additions, deletions or mode changes allowed. Every other file hash and byte count is identical.

Target bytes: Uint8Array <=4MiB, fatal UTF8 decoding, JSON parse followed by exact canonical serialized byte equality. Noncanonical whitespace, BOM, duplicate keys and unrecognized/publication fields reject. The exact full history prefix is preserved; only suffix passes existing append planner at injected now, with actual evidence bytes and independently pinned policy/registry/history. Earliest expiry returned; caller must recheck it immediately before any separately authorized effect.

Result is `eligible-for-nonproduction-review` or `no-op`, always writeAuthorized:false/publicationAuthorized:false/effects:[]. No-op has null expiry and no write grant. No endpoint, guard, workflow, schedule, remote storage or production setting is changed. Public rendering and publication observations remain separate from preparation.
