# Dormant schedule consumer and delivery reconciliation bridge

`createScheduleConsumerBridge({cloudRun,brevo,sourceCommit,journalFor,outbox,readConsumerReceipt,clock,enabled:false})` exposes dispatch/sendAlert callbacks and explicit reconcileDispatch/reconcileAlert. It composes actual Cloud Run dispatch and Brevo alert adapters; no synthetic verified:boolean callback replaces their HTTP checks. Provider network/dispatch/send configuration must independently be enabled as well. No real calls, credentials, recipients or activation are supplied in source.

Use its dispatchTargetSha256 and alertDestinationSha256 in the monitor configuration before obtaining approval. Dispatch target digest binds fixed jobName/etag/sourceCommit; alert destination digest binds fixed sender/recipient. Existing configured digests are not automatically migrated. Every input must match canonical dailyEditionEvent, action-specific payload, original scheduler key/event/payload/destination digest and exact saved monitor version1 intent. Missing outbox/history never becomes genesis.

Provider journal factory receives `{kind,identity}` and must return independently initialized durable read/cas adapters. Cloud Run identity uses dispatchId=event.runId. Brevo identity uses exact sender/recipient, fixed event, and exact content hash; runSha256 hashes the **whole original scheduler binding**, preserving original reason/event/key/payload/destination even if a later reviewed reason mapping is introduced. This binding is persisted by the actual provider adapter before HTTP. Scheduler approval and provider-specific approval are separate authenticated sources; a reference is not silently renamed into permission.

Only exact current provider reason values are supported; the monitor's run-failed directly matches. Stalled/held/late, source-coverage-gaps/stale and other unmatched labels explicitly HOLD. No lossy semantic mapping is performed. A future truthful mapping/template must be separately reviewed, preserve the original binding digest and retain approval scope.

## Acceptance versus provider acknowledgment

Cloud Run Operation acknowledgment/pending/done is **never** preparation-accepted. A separate actual consumer must durably accept the exact canonical event/source under its own ownership/idempotency control. `readConsumerReceipt` reads that authoritative immutable record, returning bounded canonical UTF8 JSON bytes, actual SHA256, immutable recordVersion and observedAt. The record binds schema1/preparation-accepted, eventSha256,scheduleKey,runId,editionId,sourceCommit,dispatchTargetSha256,operationName,acceptedAt. Acceptance must be after scheduler intent and no later than the receipt observation; observation must be fresh. No authenticated:true shortcut is used.

The reader's authentication and genuine durable writer are **not implemented here**. Hashes only bind bytes; they cannot authenticate a caller that fabricates a record. A concrete fixed-store consumer acceptance writer/readback with event/source/image identity is still required before dispatch acknowledgment can occur operationally. The dispatched job currently receives no arguments/overrides; it must read the canonical work inbox rather than infer an event from time or invent an acceptance. Missing genuine acceptance remains HOLD.

Brevo201 is provider acceptance only. Only actual provider-delivery-observed, with expected provider key and confirmed delivered-event receipt from the concrete Brevo adapter, maps to alert-delivery-confirmed under the original scheduler key. No subscriber campaign or extra outreach is added.

## Delayed reconciliation

Monitor handle retains its version1 intent when acceptance/delivery is unavailable. Explicit bridge reconciliation reads that exact intent and only a known operation-known/accepted provider journal, wraps provider journal CAS as forbidden, then invokes read-only reconciliation. Missing/attempting provider state HOLDs without POST. After independently bound acceptance or actual delivery, CAS the exact monitor version1 intent to version2 acknowledged and read back. Never invoke monitor.handle to retry the original provider effect. Acknowledgment uncertainty itself is HOLD/no-retry; operator/store reconciliation is still necessary.

The current Cloud Run adapter requires dispatchEnabled:true even to GET a known operation. Setting dispatchEnabled:false therefore holds reconciliation too; the bridge does not override that flag. A future separate read-only gate would require a reviewed adapter change.

The bridge does not mutate provider configuration, create canonical rows, migrate history or provision a store. Cloud Run job success is not publication; email delivery is not reading. Private operational IDs/receipts stay private. Underlying actual HTTP and durable stores, least privilege, approved destinations, account ownership, consumer implementation and schedule cutover are external prerequisites.

Eight synthetic tests compose actual schedule-monitor→CloudRun→delayed consumer receipt and Brevo201→delivered-event→scheduler acknowledgment, plus mismatches, unknown journal, unsupported reasons and independently disabled provider effects. Synthetic stores are labeled fixtures, not production durability proof.

`node --test tools/standalone-runtime/test/schedule-consumer-bridge.test.mjs`
