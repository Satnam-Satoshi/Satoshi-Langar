# Dormant exact promotion with immutable QA archives

`createVercelPromotion({plan,vercel,read,journal,loadApproval,archiveConfig,clock,networkEnabled:false,promotionEnabled:false})` exposes `advance()` and explicit `reconcile()`. All effects default off. Enabled promotion without concrete archive configuration holds before provider activity. `archiveConfig` contains exact `store:{Firestore,expectedProjectId,expectedDatabaseId,claim}` and `drive:{fetch,resolveSecret,secretReference,folderId,ownerPermissionId,loadApproval}`. No arbitrary archive receipt callback is accepted. This adapter leaves the legacy `vercel-release.mjs.promote()` hold unchanged.

The immutable actual release-QA plan and exact independent approval bind source, deployment, project/team, repository/branch, artifacts, baseline and both domains. Approval/semantic review authenticity, app/content/visual review, CI provenance, credentials and real IAM remain external prerequisites. Passing JSON or a reviewed boolean does not prove them. No live services or production configuration were used in these tests.

## New action sequence

1. Read the existing durable promotion journal; obtain independent exact owner approval; perform actual first preview/artifact/edition/baseline QA.
2. Resolve approved token; persist attempting intent and exact readback. Its `previewQaSha256` honestly remains the FIRST QA digest.
3. Perform the SECOND actual preview/baseline QA. Freeze its exact canonical bytes in the separate `final-preview` stage bound to promotion key and original attempting-record digest, plan/source/manifest/deployment/baseline. Upload/read back exactly those bytes with concrete Drive helper and upload journal, then save the exact archive receipt in the phase journal.
4. Read fresh controller ownership/lease/emergency-stop through the concrete stage journal. After this final await, check strict finite nondecreasing clock, archive freshness, source/QA/baseline expiry and independent approval at the same captured instant. No further await or unarchived QA is inserted before the single promotion POST. Failure holds the existing intent; there is no automatic fresh-proof replacement or new attempt.
5. POST the exact deployment promotion request. API201/202 is acknowledgment only. Save acknowledged state, then perform actual provider production observation plus both-domain four-artifact and edition HTML byte checks.
6. Freeze first successful production observation under distinct `public-readback` stage linked to the exact archived final-preview digest. Archive/read back those bytes and save its receipt before reporting `completionRecorded:true`.

The original attempting-record digest is reconstructed by normalizing an acknowledged record's phase to attempting without changing any other field. Thus acknowledged restart resolves the same final stage, never a new record.

## Result and restart semantics

`both-domain-readback-archived` means actual observed readback plus durable exact QA archival, NOT semantic truth, visual equivalence, causal proof that this worker promoted it, or continuing availability. `publicationVerified` remains false. `both-domain-readback-archived-stale-evidence` is historical observation with expired evidence, not current authority. `both-domain-readback-observed-archive-pending` means actual observation succeeded but archival/completion did not; `completionRecorded:false`. Missing domains, byte mismatch, or API acknowledgment alone cannot produce completion.

Every existing attempting or acknowledged promotion intent takes only reconciliation, never another POST. Explicit `reconcile()` works with network enabled and promotion disabled. Source expiry cannot block observing already-real effects. It cannot create archives or phase records; when those are missing it reports archive pending. A separately authorized `advance()` on an existing intent may finish archival under current controller/Drive approval, but still never repeats promotion. Existing immutable archive bytes are reused; timestamps are not regenerated for an already frozen stage. Unknown upload remains held under its upload journal.

Final public result clocks are finite and cannot precede archive/readback observations; stale archived proof cannot be upgraded. Invalid/backward clocks hold. Old attempts lacking a final archived stage may be observed but cannot fabricate that missing linkage or completion.

## Limits

This is cooperative, not provider-side fencing. Baseline/domain writers may race between observation and POST; Git SHA does not pin all provider settings. Controller stop can race after its final read. Source expiry after an irreversible action does not undo it. Default whole-operation timeout remains30seconds; archive latency can consume it and safely hold. In-flight archive work may finish after outer timeout, but `active()` checks prevent a late promotion POST. Unknown HTTP outcome is never interpreted as proof of no effect.

No initialization, credential enrollment, provider settings, bypass protection, public sharing, live activation or scheduling is performed. Exact raw reader bytes and markup markers still do not prove rendered-content equivalence; QA flags remain false for visual and semantic claims. Independent application/content/visual approval is still required. Tests use actual concrete QA, stage/upload journals and Drive adapter code with synthetic HTTP/SDK/approval fixtures only.
