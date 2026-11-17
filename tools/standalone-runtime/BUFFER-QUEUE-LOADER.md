# Dormant direct Buffer queue/account observation

`createBufferQueueLoader({buffer,expectedChannels,loadCanonicalLedger,clock,readEnabled:false})` exposes only `observe()`. It composes the actual existing createBufferReadOnly adapter with fixed organization/two exact channel IDs (one twitter, one instagram). No existing adapter mutation/schema extension, provider write, token setup or real network test was performed.

loadCanonicalLedger is an independently authenticated canonical migrated-history boundary, not a generator assertion. Required exact projection: generation standalone-social-ledger-v1, initialized true, migrationVerified true, positive revision, observedAt, expiresAt≤60seconds, observationSha256, entries[{postId,channelId,contentSha256,status}]. Entries are unique provider IDs and preserve all prior states. This compact projection is NOT a substitute for migrating full private reservations/attempts/unknown outcomes; its underlying loader must retain and reconcile them. Missing migration proof holds before HTTP. No empty bootstrap.

Two bounded passes enumerate connected/unlocked/unpaused scoped channels and all six statuses in one exact unfiltered query: draft,needs_approval,scheduled,sending,sent,error. Each pass exhausts actual adapter pagination (max10pages/20MiB), validates initial previous=false but does not require subsequent previous=true, and compares full returned post projections. Pair duration must be strictly under60seconds and within ledger observation validity. No repeated automatic attempt after an uncertain/error response. Queries don't request metrics, date filters, tags or sorting overrides.

A wrapper captures only response RateLimit/RateLimit-Policy, not Authorization or credentials. It maps exact live policy names to window sizes900/86400/2592000 and returns conservative minimum remaining request budgets across responses. These are request counts, NOT post permission. Partition values/raw headers are not returned. Per-call trace binds exact query/body digests, variables, actual response rawSHA and adapter clocks. Private captures retain raw provider bytes for independent replay; never add real captures, post content, channel IDs or history to the public repository.

Success status paired-scoped-queue-observed ALWAYS has complete:false, atomic:false, ownershipVerified:false, mediaIdentityVerified:false, publicationVerified:false, executeAllowed:false. Paired stable reads do not establish exclusive writer ownership, deleted history, total lifecycle history or authorization. Current adapter projection has text/status/date but no assets or metadata; matching text cannot authenticate known media or full request identity. Unbound posts, mismatches, drafts/needsapproval/sending/errors, and canonical records absent from returned provider history remain explicit reconciliation entries. Canonical history is never overwritten from live observations.

`accountPublishingRemaining:null` is intentional. Official Channel schema has only a deprecated weeklyPostingLimit, explicitly unused; no current account allowance is exposed. Do not derive publishing allowance from request budgets or require new Meta access solely to satisfy a locally invented metric. A separate reviewed draft-only policy can treat publishing quota as not applicable because Buffer documents saveToDraft:true skipping posting-limit checks. This module does not change the current policy or authorize that alternative.

Official references checked2026-11-17:
- https://developers.buffer.com/types/Channel.html
- https://developers.buffer.com/guides/api-limits.html
- https://developers.buffer.com/guides/posts-and-scheduling.html
- https://developers.buffer.com/types/CreatePostInput.html
- https://developers.buffer.com/guides/error-handling.html
- https://developers.buffer.com/types/LimitReachedError.html

Live SDK/secret access, actual channel projection compatibility, full canonical migration, exact assets readback and private persistence remain separate deployment tests. All fixtures here are synthetic.

The observation clock is shared and latched across ledger loading, secret resolution,
each transport, every response-body read, and adapter/page boundaries. Every checked
instant must be finite, nondecreasing, before both the earliest 60-second capture
expiry and retained-history expiry. A slow expired ledger cannot initiate provider
reads; a later clock recovery cannot erase an observed backward/invalid instant.
Successful final observation time bounds all captured response completion times.
These are sampled boundary checks, not an assertion that an unsampled wall clock
never changes. Cancellation remains best-effort resource cleanup, not a new read.
