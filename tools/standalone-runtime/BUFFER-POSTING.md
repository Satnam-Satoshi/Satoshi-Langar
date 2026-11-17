# Dormant direct Buffer posting executor

Source-only, default network and mutations OFF. Synthetic tests exercise the real indexed Firestore journal against a fake SDK and mock HTTP, not live Buffer compatibility or credential authorization. No API key is bundled or reused from a connected application. No existing pause, schedule, canonical inventory or entrypoint is activated.

## Explicit proposal and authority

`proposeBufferPostingAction({validation,now,action})` runs the actual action-specific platform validator. Actions are `create-draft` and `create-scheduled-post`. It retains the draft request digest and returns a separately hashed final request, quota-policy digest and `executeAllowed:false`. A scheduled proposal explicitly sets `saveToDraft:false`; it never silently upgrades an earlier draft approval. Exact independent approval binds the full identity, action, channel, due time, both request digests and quota policy. Switching an existing reservation to another create action cannot create a second post. Editing an existing draft is not implemented.

`createBufferPostingExecutor` receives the proposal, immutable identity, claim, actual journal, fixed HTTP/secret-reference adapters, independently loaded approval/execution evidence, and a clock. `advance()` requires both flags; `reconcile()` requires network but not mutation permission. No generic query, endpoint, edit, delete, reply, mention, follow or DM method is exposed.

Identity fields: reservationId, reservationSha256, reviewSha256, organizationId, channelId, platform (X or Instagram), action, requestSha256, draftRequestSha256, contentSha256, mediaSha256, sourceEvidenceSha256, publicationReceiptSha256, policySha256, platformPolicySha256, quotaPolicySha256, queueObservationSha256, dueAt. Campaign and platform policies are distinct. Journal key is SHA256 of the reservation ID's UTF8 bytes.

Approval is `{action,identity,reference,notBefore,expiresAt}`. Its loader is a trusted authorization boundary, not an authenticated boolean supplied by a proposed post. The execution-evidence loader returns `{validation,queue,contentExpiresAt,reservationSha256,reviewSha256}`; `validation` is the actual action-validator input without an authoritative clock. Queue is `{observationSha256,checkedAt,expiresAt,unresolvedCount,duplicatePostIds,reservationId}`. It must be independently reconciled with the migrated operating ledger, not upgraded from the currently incomplete read-only queue adapter. A held loader holds execution. Source/tag/media/review deadlines must be preserved by this independent loader; arbitrary callback authors can lie, so deployment wiring remains a prerequisite.

The actual action validator checks exact caption, public story/media bindings, tags, live request windows, restrictive cadence and action quota policy. Unknown publishing capacity stays unknown: private drafts use the documented no-posting-limit mode; scheduled proposals explicitly rely on provider enforcement. This is not a capacity guarantee. Typed `LimitReachedError` is retained as rejected/no-retry, never automatically recreated.

## Intent, HTTP, reconciliation

The concrete `createFirestoreMarketingPostingJournal` supplies read/cas/readControl. Existing initialized roots and a genuinely reserved row are required. Exact state versions are 0/null, 1/attempting, 2/acknowledged with a provider post ID. Indexed identity/state hashes prevent a row-only reset. Live owner/fence, lease, global/platform stops and uncertainty are checked. Approval, content, quota and queue deadlines are rechecked after awaited evidence and immediately before the mutation, including after secret resolution. There remains a cooperative datastore-to-HTTP race; no provider fencing or exactly-once claim is made.

Only one `createPost` mutation is attempted after durable intent. Network/HTTP/schema/timeout/lost acknowledgment uncertainty leaves attempting, with no blind retry on restart. Typed rejection also conservatively retains that intent for explicit operational reconciliation. There is no automatic name/content search recovery. A known ID is queried read-only on restart even when mutations are disabled. Missing or malformed state does not initialize history.

Fixed `https://api.buffer.com`, bearer secret resolver, no redirects, 30-second maximum operation, 2 MB streamed response cap, strict JSON and current three-window rate headers. Errors are generic and do not echo provider or callback payloads. Token scope is provider/account-wide; local operation restriction does not narrow the credential itself.

Known-ID readback checks channel organization/account/service, caption, exact schedule fields, one image source/PNG/dimensions/alt, absence of image user tags, AI metadata and relevant Instagram flags. Image URL equality is not a downloaded media-byte or platform-rendered proof. Provider normalization (for example transformed media URLs or timestamps) conservatively holds until independently reviewed. `draft-readback-observed`, `schedule-readback-observed`, and `sent-observed-public-unverified` are distinct. Every result keeps `published:false`; sent status/external-link presence does not establish public content/account identity or delivery. A separate exact public-content observer remains missing. Reconciliation does not write scheduled/published states to the journal.

## Official API references checked for this source

- https://developers.buffer.com/examples/create-draft-post.html
- https://developers.buffer.com/examples/create-scheduled-post.html
- https://developers.buffer.com/types/CreatePostInput.html
- https://developers.buffer.com/types/PostActionPayload.html
- https://developers.buffer.com/types/PostInput.html
- https://developers.buffer.com/types/Asset.html
- https://developers.buffer.com/types/ImageAsset.html
- https://developers.buffer.com/types/ImageMetadata.html
- https://developers.buffer.com/types/InstagramPostMetadata.html

The readback uses `PostInput {id}` (not invented organization fields), documented interface/union projections, and `__typename` only for image user-tag objects. Success acknowledgment is `PostActionSuccess`; documented typed errors are handled without retry. Tests do not prove live GraphQL compatibility. Provisioning, authenticated runtime approval/evidence loaders, migration, actual token access, public-media availability and exact public delivery observation are still outside this module.

Provider DateTime is documented as ISO 8601 (https://developers.buffer.com/types/DateTime.html), with no three-fractional-digit guarantee. Readback accepts only valid UTC Z timestamps with zero to three fractional digits, comparing exact instants to the approved due time. Offsets, invalid calendar values, finer precision and future sent timestamps hold. Authorization/control clocks remain strict canonical millisecond UTC. Raw response hashes retain the exact original provider strings.
