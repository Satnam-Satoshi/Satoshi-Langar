# Dormant fixed-identity transport journals

Mission: preserve exactly one Cloud Run dispatch or one owner-only Brevo alert intent and provider response identity before permitting reconciliation. Human approvals, service ownership, IAM and initialization remain external. These wrappers do not provision Firestore, discover credentials, acquire leases, initialize rows, dispatch jobs, send mail or change production.

Exports from `src/firestore-effect-journals.mjs`:

- `createFirestoreCloudRunJournal({Firestore,expectedProjectId,expectedDatabaseId,identity,claim:{owner,fence},clock,mutationEnabled:false})`
- `createFirestoreBrevoAlertJournal(sameOptions)`
- `deriveBrevoAlertIdentity({sender,recipient,event})`, a pure exact-content identity helper.

Both return precisely `read({key}) → {version,record}` and `cas({key,expectedVersion,next}) → {applied:boolean}`, matching the actual Cloud Run/Brevo adapters. The SDK constructor and service identity are independently trusted injections; no client is constructed on import. Project/database options are explicit and emulator override is rejected. There are no arbitrary endpoint or document-prefix options.

## Exact identity and key

Cloud Run identity is `{jobName,expectedEtag,dispatchId}`. Job name is the exact `projects/<project>/locations/<region>/jobs/<job>` path; operation names must remain within that exact project/location operations collection. The consumer bridge should use the daily run ID as dispatchId, not a fresh random retry ID.

Brevo identity is `{sender,recipient,event,contentSha256}`. Event is exactly `{editionDate,reason,runSha256}`. The helper derives the exact subject/body hash from the existing adapter's bounded operational-reason templates. Unknown reasons, arbitrary body fields and altered content hash fail. This is owner operational mail only, not subscriber campaigns.

For either, key is SHA256 of canonical recursively sorted-key JSON of the exact identity, matching the existing transport implementation. The factory snapshots identity and claim. Key substitution, identity replacement, metadata extras and provider-ID substitution are rejected. Sender/recipient/message IDs remain private metadata; namespace names do not themselves establish ACL privacy.

## Existing initialized rows only

Fixed paths are `newsroomPrivateCloudRunEffectsV1/<key>` and `newsroomPrivateBrevoAlertsV1/<key>`. An independently approved initializer must already have placed this exact envelope:

```
{schemaVersion:1,generation:<generation>,initialized:true,key,
 identityJson:canonical(identity),version:0,
 payloadJson:canonical({version:0,record:null})}
```

Generations are `standalone-cloud-run-journal-v1` and `standalone-brevo-alert-journal-v1`. No initializer or empty global inventory is created. A missing row holds, never becomes null state. This scoped change therefore does **not** complete autonomous new-day effect allocation. A separately reviewed inventory-backed allocator that distinguishes genuine new identities from lost known records remains a prerequisite for eventual unattended new-day operation. The existing scheduler inventory is separate; it must not be assumed to authorize recreating missing transport rows.

## State and CAS

Strict phases/versions:

- Version 0 / null, only the independently initialized envelope.
- Version 1 / attempting, with exact key/identity/approvalReference. Brevo also requires createdAt not in the future.
- Version 2 / operation-known (Cloud Run) with exact operationName, or accepted (Brevo) with exact messageId and preserved createdAt.

Version 2 is terminal. No reset, replacement, delete, status rollback or identity change is exposed. A provider response ID is durably retained with the original approval reference. Acceptance is not execution success or email delivery proof: the actual transport's separate read-only observation remains mandatory.

Every mutation transaction reads the existing initialized row plus `newsroomControl/standalone-v1`. Existing controller must have emergency stop off and a live matching owner/fence lease from the factory's independently supplied claim. The wrapper does not create or update control. The callback contains only document reads, conditional update and the pure clock; no external effect runs inside SDK transaction retries. Exact readback is required after commit.

Unknown commit/readback latches all further mutation in that instance. Read-only `read` remains available. A new mutations-disabled wrapper can reconcile persisted attempting/known state; it cannot repair, clear or retry it. For Cloud Run reconciliation the bridge must first require operation-known and then call the actual adapter with this read-only journal; for Brevo require accepted and use sendEnabled:false. If attempting is present, the actual transports hold without another POST. There is no bypass of an unknown outcome.

## Remaining prerequisites and tests

Real SDK/service credentials, privacy/IAM, approved existing-row allocation, canonical history migration, controller lease acquisition, action approval and consumer binding remain external. This is not a delivery service or an autonomy claim. A lease can expire between a journal transaction and an external request; action-time approval/provider idempotence and the reviewed bridge remain necessary.

Tests use the actual Cloud Run and Brevo transport modules plus these SDK wrappers with synthetic initialized rows, fake transaction objects and mocked HTTP. They verify durable provider operation/message identity, exact approval binding, restart GET-only reconciliation, no second send, strict versions, malformed/future records, emergency-stop/lease checks, unknown commit behavior and disabled defaults. No live SDK, resource provisioning, production request or email was performed.
