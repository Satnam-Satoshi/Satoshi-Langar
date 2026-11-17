# Direct Buffer read-only transport, dormant

Source schema checked against official Buffer reference/authentication/rate-limit documentation. This is direct HTTP GraphQL, not a tool client or reuse of tool-managed OAuth. No real credential was obtained and no live API call was performed. Tests use synthetic fetch/schema fixtures; passing them is NOT live provider compatibility proof.

- Fixed POST https://api.buffer.com with Bearer token resolved only from an independently approved secret reference. No arbitrary origin, query document, headers or mutation method accepted. Reads default disabled.
- `readChannels` uses ChannelsInput.organizationId and narrow documented channel scalars. `readPostsPage` uses PostsInput.organizationId/filter.channelIds/status; first100 and after are GraphQL arguments, not filter fields. Exact two configured channels and selected statuses only, no dates/tags/metrics.
- Post scalar projection intentionally excludes assets/metadata unions and public link verification. Required media/receipt projections HOLD rather than pretending these scalars establish exact published content. No full receipt or campaign executor exists.
- 10-second overall timeout (including secret lookup), manual redirect rejection,2MiB streamed response cap, fatal UTF8, JSON/GraphQL/HTTP failure checks, quota-header parsing. Errors latch further calls on that instance; no retry, sleep or blind replay. A timed-out secret resolver cannot later initiate a request. No secrets in returned metadata or errors; callers must keep raw response bytes private and must not log headers.
- Reads RateLimit window remaining/reset headers.429 returns bounded Retry-After metadata and holds. Missing/malformed/exhausted quota metadata holds. This is not a distributed quota ledger; other jobs sharing the credential can consume quota concurrently.
- `readAllPosts` follows at most10pages with duplicate/cursor/byte bounds and returns requested-scope-exhausted, always complete:false,atomic:false,receiptVerified:false. This does not reconcile deleted history, all statuses, canonical ledger, drafts or an exclusive writer.

Official sources (checked during source preparation):
https://developers.buffer.com/reference.html
https://developers.buffer.com/guides/authentication.html
https://developers.buffer.com/guides/api-limits.html

Remaining: owner-approved credential/Secret Manager access, current account-wide token risk review, live read-only schema compatibility check, independently observed exact channel handles, durable trace/evidence retention and quota coordination, reviewed media/metadata union queries, complete queue/ledger reconciliation and separate publication authority. No account, key, IAM, resource, paid service or runtime activation is created by this source.
