# Dormant daily schedule and health-alert orchestration

Mission: describe one canonical daily preparation event and deduplicate preparation/health-alert effects through independently durable state. Human approval and emergency-stop decisions remain with the deployment coordinator. This module does not schedule a real cron job, contact ChatGPT, send email, initialize storage, resolve credentials, render an edition or publish anything. There is no vendor SDK or network implementation.

## Daily identity and DST

`dailyEditionEvent('YYYY-MM-DD')` returns a deterministic immutable event for 09:00 America/New_York, with canonical edition `YYYY-MM-DD-r1`, run `daily-YYYY-MM-DD-r1`, scheduled UTC instant and a 30-minute deadline. It uses Node 22 Intl/IANA timezone data and a bounded 36-hour minute scan, requiring exactly one match. It never hardcodes UTC−4/−5, uses the machine timezone, or adds 24 hours to yesterday's UTC time. The supported date range is 2000–2099. Tests cover the day before/after both 2026 DST transitions.

A scheduler must supply the exact regenerated envelope and digest. Forged clock/date/edition fields hold. This is a schedule description, not installation of a recurring task. Missed runs do not trigger automatic backfills. Late or reordered events can produce a deduplicated health alert but never a late producer dispatch. Existing revisions/editions must be represented in canonical history so a scheduled r1 cannot replace them.

## Runtime boundaries

`createScheduleMonitor({history,outbox,clock,loadApproval,dispatch,sendAlert,dispatchTargetSha256,alertDestinationSha256,dispatchEnabled:false,alertsEnabled:false})` exposes `handle(event)` and read-only `reconcile({event,kind,reason?})`.

- `history.readEdition({editionDate})` is independently authenticated durable history, returning `{authenticated:true,observedAt,editionId,exists,run,sourceHealth?}`. It must resolve the canonical date, not infer absence from missing search results. Observation must be ≤60 seconds old. `run` uses the existing `evaluateRunHealth` contract. An existing canonical edition blocks another producer even if its run is absent. A different edition identity holds; it does not manufacture an r1.
- Optional sourceHealth is exactly `{expiresAt,gapCount}` from independently reviewed evidence. Expired evidence or gaps create explicit alerts, not claims of refreshed research. A historical verified completion remains historical completion and is not reclassified stale merely because old evidence expired.
- `dispatch({key,event,payload,approvalReference,destinationSha256})` is an injected preparation-only adapter. It must bind its independently configured target digest, honor deployment/effect/stop policy and use the existing job runner's approval/source/evidence gates if it advances that runner. It must return `{key,status:'preparation-accepted',receiptSha256}` only from genuine durable acceptance. This is not publication verification.
- `sendAlert(...)` has the same shape and must bind its independently configured destination digest and return `{key,status:'alert-delivery-confirmed',receiptSha256}` only after genuine provider delivery confirmation. No email recipient or channel is inferred here.
- Enabling either effect requires its configured target/destination SHA256. Independently trusted `loadApproval` must return the exact action (`dispatch-daily-preparation` or `send-run-health-alert`), key, eventSha256, payloadSha256, destinationSha256, bounded reference, notBefore and expiresAt. All must match. Standing scope must be resolved by the approval adapter, not represented by caller `approved:true`.

All interfaces are trusted injection boundaries. Authenticated flags are not cryptographic authentication in this module. Clock must be a pure real UTC clock. Default disabled effects do not touch the outbox or callbacks, although health observation is still read.

## Durable outbox contract, including new dates

`outbox.read({key}) → {version,record}` and `outbox.cas({key,expectedVersion,next}) → {applied:boolean}` must be backed by independently initialized durable inventory and atomic compare-and-swap. The module never synthesizes state from missing/error/null responses.

A genuinely new daily key **does not require manual per-date bootstrap**: an existing authoritative global inventory may return `{version:0,record:null}` when it proves the key has never been claimed. The first CAS must atomically claim that new key in the existing inventory and write its intent. Reads, including reconciliation, must not claim/write. If the global inventory is missing, or a previously claimed key's record is lost, read/CAS must hold, never return fresh null state. Known-key retention or tombstones must prevent reinitialization. The tests explicitly distinguish new-key allocation from lost history. This module provides no global initializer or concrete durable provider implementation.

Dispatch keys derive from fixed generation, edition identity and canonical-producer kind. Alert keys additionally bind the reason, not wake timestamp, so duplicate/reordered wakes cannot resend the same reason. Records bind event/payload/destination digests. The state transitions are version 0 null → version 1 intent → version 2 acknowledged, with exact CAS readbacks. An intent is saved and read back before any external callback. Callback effects must never execute inside a retryable datastore transaction.

History is checked before approval, after approval and after the durable intent. Approval is checked again after the final awaited history observation immediately before invoking the effect callback; expiry leaves durable intent for reconciliation with no effect. Every trusted outbox record requires exactly version 0/null, version 1/intent or version 2/acknowledged, with creation/acknowledgment timestamps not in the future and acknowledgment not before creation. These constraints also apply to read-only reconciliation. This narrows but cannot eliminate cross-system races. The preparation consumer must independently enforce canonical edition idempotence and emergency stop; this module cannot provide distributed exactly-once execution against another producer.

Any unknown effect/acknowledgment outcome retains intent and latches that key locally. Restart finds durable intent and holds rather than repeating a preparation or email. Reconciliation only observes existing outbox state; it cannot resend, repair, clear an intent or authorize retry. Acknowledged rows suppress repeat delivery. Lost acknowledgment after genuine delivery therefore errs toward manual reconciliation, not a duplicate message.

## Remaining implementation work

No Cloud Scheduler/vendor trigger, authenticated event ingress, concrete global inventory adapter, alert provider, recipient resolver, emergency-stop transport, production job-dispatch wiring or durable receipt archive is installed. Existing automations and production settings are untouched. Revision creation, publication and email campaigns remain separate approved workflows. A real deployment must preserve durable inventory indefinitely or use a reviewed archival policy that prevents forgotten keys.

Tests are synthetic and use the actual existing monitor logic. They cover DST, duplicate/concurrent events, late/reordered wakes, existing editions, missed/held/stale/gap alerts, exact approval/destination scope, missing-global/lost-history distinction, automatic fresh-key claim, defaults off, and uncertain email outcome across restart with no resend. No real scheduler, email or API call was made.
