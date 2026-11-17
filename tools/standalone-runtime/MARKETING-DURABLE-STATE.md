# Dormant marketing backlog and create-intent journals

These private SDK adapters have no Buffer transport, credentials, scheduler or external provider calls. Mutations default off. Existing reservation code and real historical ledgers are unchanged. Synthetic fixtures describe independently initialized history; they are not bootstrap/recovery instructions.

## Full backlog checkpoint

`createFirestoreMarketingBacklog({Firestore,expectedProjectId,expectedDatabaseId,claim,clock,mutationEnabled:false})` exposes:
- `read()` → `{revision,backlog:{schemaVersion:1,entries},backlogSha256,batchAfterKey}`.
- `commit({expectedRevision,backlog,batchAfterKey})` → `{applied,revision,backlogSha256}` with exact durable readback.
- `capacity()` → used/limit1000/alert-at900/hold-at1000.

Both existing root `newsroomPrivateMarketingBacklogV1/inventory` and existing canonical row `newsroomPrivateMarketingBacklogV1/canonical` are mandatory. Root generation is `standalone-marketing-backlog-inventory-v1`, checkpoint generation `standalone-marketing-backlog-checkpoint-v1`. Root fields are `{schemaVersion:1,generation,initialized:true,revision,checkpointSha256,entries,paused,platformStops:{X,Instagram}}`; entries indexes each immutable generator key to SHA256 canonical entry. Checkpoint fields are `{schemaVersion:1,generation,revision,backlog,batchAfterKey}`. Root digest/version bind the entire canonical checkpoint. Missing root/row, lost index or corrupted history holds; neither is synthesized.

Generator entries retain exact `{key,campaignId,issueId,storyId,storyContentSha256,platform}`. Old ordered entries must remain an exact prefix; no trimming, replacement, reordering or changed content under the same campaign/issue/story identity. New content requires an explicit new issue/story identity. Key includes original story content and platform. All omitted/deferred stories remain in the checkpoint. Cursor must be null initially or an existing retained key and cannot rewind.

Actual runtime should read authoritative checkpoint into the generator, commit the complete output with the UNCHANGED cursor before attempting one selected reservation, and advance a cursor only after independently durable batch accounting. A generator's next-cursor proposal is not proof the batch was processed. This store enforces monotonicity but does not infer completed batch work. Exact same backlog/cursor with matching revision validates current controller/stops then returns a no-op acknowledgment without writes or revision growth. CAS mismatch returns applied:false. No provider effects run inside retried transactions.

## Posting create-intent journal

`createFirestoreMarketingPostingJournal({Firestore,expectedProjectId,expectedDatabaseId,identity,claim,clock,mutationEnabled:false})` exposes existing executor contracts `read({key})`, `cas({key,expectedVersion,next})`, `readControl({key,identity})`, and capacity. `readControl` returns fresh `{owner,fence,checkedAt,expiresAt,emergencyStop:false,platformPaused:false}` only after exact reservation/root and live controller checks. The executor must still recheck its independent approval/evidence after this await immediately before provider mutation.

Identity fields are exactly `reservationId,reservationSha256,reviewSha256,organizationId,channelId,platform,action,requestSha256,draftRequestSha256,contentSha256,mediaSha256,sourceEvidenceSha256,publicationReceiptSha256,policySha256,platformPolicySha256,quotaPolicySha256,queueObservationSha256,dueAt`. `reservationId` is the schedule-store key; `reservationSha256` hashes the actual canonical saved reservation. All source/media/content/due/policy fields must match that actual indexed row. Exact review/organization/channel/request/platform policy authority is separately verified by the executor; hashes themselves do not authenticate it.

Action is explicitly `create-draft` or `create-scheduled-post`. Draft action requires final request hash equal draft request hash. Scheduled action binds both original validator draft request and explicitly approved converted request. Journal key is SHA256 of the UTF8 reservationId string, NOT full identity. Consequently, changing action/request/channel cannot create a second provider post for the same reservation. Scheduling an existing draft requires a distinct reviewed update flow and is not implemented by this journal.

Existing root `newsroomPrivateMarketingPostingV1/inventory`, generation `standalone-marketing-posting-inventory-v1`, has `{schemaVersion:1,generation,initialized:true,revision,claims}`. Claims index key to `{identitySha256,stateSha256,version,platform,reservationId}`. Row path `newsroomPrivateMarketingPostingIntentsV1/<key>`, generation `standalone-marketing-posting-intent-v1`, stores `{schemaVersion:1,generation,payloadJson}`.

Only states `{version:0,record:null}` for a genuinely unclaimed absent row, version1 attempting, and version2 acknowledged are accepted. Record is exactly `{key,identity,phase,approvalReference,postId}`. postId is null while attempting and a bounded stable provider ID at acknowledged. Approval/identity never change. Known indexed zero/null, missing rows, orphan rows and reset/version rollback hold. ANY other unresolved version1 attempt on the same platform blocks new attempts and final live-control checks across campaigns. Existing schedule-root stops, pauses and unknown attempts also block.

Acknowledged means only a durable create response ID. It is NOT proof of scheduled status or public publication. This module does not store scheduled/published transitions, clear unknowns, infer success from URL, or retry an uncertain create. Concrete exact provider readback may later distinguish draft/scheduled/sent; actual public account/content observation is separately required for publication and is not supplied here. A provider acknowledgment alone cannot complete a marketing campaign.

## Durability, capacities and limits

Both modules use injected actual SDK transactions and verify exact readback, preserve controller revision, gate writes on current owner/fence/lease/emergency stop, and check clocks again after the last awaited control validation. Unknown commit latches further writes in that instance while read-only reconciliation remains possible. Store transactions do not fence external Buffer writers. Provider effects must occur outside transaction callbacks and only after durable attempting state. Unknown provider outcome must never automatically retry, including after restart.

Each inventory is bounded1000 lifetime identities/entries with alert at900, no silent rotation, deletion or automatic empty-root creation. Existing migration/ownership, real IAM, complete queue reconciliation, independent current approval, source/media/platform checks and authenticated connector execution remain prerequisites. This is not indefinite autonomous operation. Private provider IDs/request identities must not be copied to public source/logs.

Tests are synthetic: actual reservation adapter → new posting journal, append/CAS/history/cursor preservation, stops, capacity, concurrency, unknown commits and stable IDs. Shared `marketing-backlog-fixture.mjs` and `marketing-posting-fixture.mjs` provide fake SDK state only. No historical private ledger, live provider or real account was accessed.
