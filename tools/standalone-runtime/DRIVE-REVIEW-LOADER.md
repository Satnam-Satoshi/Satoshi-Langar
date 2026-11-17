# Dormant fixed-object review loader

`createDriveReviewLoader` composes the actual `createDriveArchive` read-only adapter with `bindReviewedEditorial`. It does not accept caller-returned `verified:true` receipts. Default `networkEnabled:false` makes no credential or transport calls. No write API exists.

Constructor inputs:
- `drive`: injected `fetch`, `resolveSecret`, approved `secretReference`, exact `folderId`, `ownerPermissionId`, optional timeout.
- `approvedObjects`: exactly `configuration` and `review`, each `{fileId,version,name,mimeType,bytes,sha256}`. Version is an exact string; MIME is application/json, maximum 1 MiB, names follow existing archive content addressing. IDs must differ.
- independently approved `trustedConfigurationSha256`, `trustedReviewSha256` (canonical binder digests), `trustedCollectionSha256` (retained capture digest). These are distinct from raw JSON object byte hashes.
- `approvalExpiresAt` and injected `clock`, exact millisecond UTC ISO timestamps.

`load({collection})` snapshots the retained capture before its first await. Object identities are constructor snapshots. The concrete adapter checks authenticated owner identity, folder/file owner-only permissions, exact parent/name/version/MIME/size/checksum, actual downloaded bytes, then file and folder metadata again. JSON parsing and the actual review binder follow. Review expiry and approval expiry are checked after reads and before returning. Success is `review-loaded-and-bound` with `binding`, suitable for existing retained editorial pipeline input. No freshness is renewed and no historical event is redated. Missing-source/review gaps remain in the binding.

## Trust and limits

This is service-authenticated byte retrieval **only under the explicitly trusted injected credential resolver, HTTPS provider transport, and independently approved constructor identities/pins**. It does not establish who wrote a review, signature verification, semantic truth, owner approval, execution provenance, publication authority, or `observeSources` authority. A caller who controls the transport can fabricate provider responses. No `authenticated:true` editorial authority is produced. Approval expiry bounds retrieval permission, not permission to publish.

Private IDs, raw provider metadata, credential references and error text are not returned. Errors are bounded generic holds. A failed load latches mutation-free reuse pending review; a concurrent load is denied. Successful reads can be repeated, but never write. ACL/version observations are non-atomic and do not guarantee permanent retention or WORM.

Tests use synthetic transport/credential values only, while exercising actual Drive adapter byte checks, actual collector capture, review binder, and retained pipeline. They cover default-off behavior, wrong identity/version/ACL/bytes, redirects, digest/capture substitution, input mutation across awaits and expiry. No actual Drive authentication or live read was performed. Real approved object identities, independent review authority and production runtime/IAM configuration remain external prerequisites.

## Executable dormant entry handoff

Successful `load` also returns `sourceReview`, the exact private in-memory raw configuration, review envelope, retained capture and three independent pins. Pass it as `material.sourceReview` to `createDormantRuntimeEntry`, with `material.sourceInventorySha256` equal to `sourceReview.trustedCollectionSha256`. Other fixed deployment, event, image and identity inputs remain separately required. Do not log or publish `sourceReview` or the full loader result. No private Drive IDs or credentials are added to these records.

The entry re-runs the binder at its own current clock; it does not accept the loader's Maps or success status as authorization. Mutating the returned raw record causes pin validation to hold. The entry snapshots its inputs. The integration test uses real mocked-Drive byte retrieval → loader → existing entry `preflight()` → `constructDisabled()` → disabled `advance()`, with SDK method/network/secret/effect callbacks that throw if invoked. SDK object construction is exercised, but no provider method or effect is invoked. It also verifies substituted records hold. This is a tested dormant composition, not an enabled worker or proof of authenticated review authorship.
