# Dormant owner-only Brevo alert adapter

This is source-only, mock-tested transport, not an enabled email service. No real key, sender, recipient, account setting or API request was used. Existing Brevo account evidence is a lead, not current sending or ownership proof. Default `networkEnabled:false` and `sendEnabled:false` prevent service calls. Both flags must be explicitly configured; credential storage, sender/domain validation, owner destination and scoped permission remain independent prerequisites.

`createBrevoAlert` fixes one sender and one owner recipient at construction. `advance` accepts only editionDate, an operational reason enum and runSha256. Subject/body are fixed plain-text templates with no source text, arbitrary links, HTML, attachment, CC/BCC, subscriber list or campaign input. No contacts or subscription API is used. Fixtures use example addresses only.

## API contract and precise claims

Official references checked November 17, 2026:
- https://developers.brevo.com/reference/send-transac-email
- https://developers.brevo.com/reference/get-email-event-report
- https://developers.brevo.com/docs/send-a-transactional-email

A single POST to the fixed `https://api.brevo.com/v3/smtp/email` uses API-key authentication and a single-recipient textContent request. A 201 messageId means provider acceptance, not confirmed delivery. The official transactional-email guide explicitly supports choosing textContent for simple plain-text messages, resolving the less precise HTML-oriented reference prose. Text-only requests are therefore documented, but actual live API/account/sender compatibility remains unproved and requires separate authorization and testing. No silent HTML/template fallback is implemented.

Known-message reconciliation uses fixed GET `/v3/smtp/statistics/events` filtered to that message ID and exact recipient, with a 90-day window and at most 100 returned rows. Exact sender, recipient, message ID and nonfuture event date at or after intent are required. The official event schema marks `from` optional; this adapter conservatively holds if it is absent rather than inventing sender evidence. That restriction may hold a legitimate live response and remains an explicit compatibility limitation. Only documented benign event names are accepted; undocumented aliases hold even when a delivered event is also present. A delivered event produces `provider-delivery-observed`, never human-read or inbox-placement assurance. Failure/unknown events, full pages, malformed binding or missing delivered events hold. An absent event is not proof of nondelivery. Reconciliation is not an atomic history snapshot; API retention may prevent old evidence from being returned.

## Durable no-retry boundary

The independently authenticated journal must already exist or distinguish an authorized genuinely new key through its canonical global inventory. Missing state is never initialized here. Exact state transitions are 0/null, 1/attempting, 2/accepted. Identity includes configured endpoints, the complete event and exact content digest. Exact scoped approval binds that identity/key and expiry. Intent CAS and identical readback happen before the only POST, with a final approval check after all awaited preparation. Lost or uncertain requests retain attempting and never repeat, including after process restart. Known accepted IDs can reconcile read-only even with sending disabled. A successful delivery read does not mutate the journal or send again. No server-side idempotency guarantee is assumed.

HTTP is bounded to 64 KiB JSON and a short total timeout, with fixed origins, redirects rejected, no retries, and no raw error payload/key output. Recipient addresses necessarily go to the explicitly approved Brevo account for sending and event lookup; public logs/state must not expose the private journal or request payload. Ordinary output returns only normalized status and receipt digest. Scope validation cannot narrow an overprivileged account API key. No service-level revocation fence is claimed between final approval read and POST.

## Scheduler integration remains incomplete

Current `schedule-monitor` expects `alert-delivery-confirmed`. This adapter does NOT return that on 201. Its durable accepted state plus `provider-delivery-observed` may be consumed only by a separately reviewed reconciliation bridge that binds the scheduler event, destination and content identity and updates its canonical outbox without another send. Until that bridge, actual journal implementation, approved credentials and live provider verification exist, it is not a working autonomous alert system.

Tests are synthetic transport/journal fixtures only. They cover disabled operation, strict state/reset rejection, unknown send/no retry, approval expiry after awaited preparation, exact delivery binding, conflicting events, timeout and secret-output avoidance. No account, sending, delivery, pricing, consent or privacy settings were changed.
