# Dormant Firestore schedule history and effect store

Mission: provide authoritative canonical-date history and durable schedule/alert deduplication through an injected official Firestore SDK. Human approval, migration, IAM and emergency-stop governance remain external. No SDK construction occurs on import; there is no live client, credential discovery, network call, global bootstrap, canonical-history writer, scheduler or effect provider included.

`createFirestoreScheduleStore({Firestore,expectedProjectId,expectedDatabaseId,claim:{owner,fence},clock,mutationEnabled:false})` returns `history.readEdition({editionDate})` and `outbox.read({key}) / outbox.cas({key,expectedVersion,next})`, directly matching `createScheduleMonitor`.

The constructor pins project/database in SDK options and rejects emulator override. The reviewed official SDK constructor is a trusted injection boundary, not authenticated by a boolean. Private fixed document namespaces:

- `newsroomPrivateScheduleV1/inventory`
- `newsroomPrivateCanonicalEditionsV1/YYYY-MM-DD`
- `newsroomPrivateScheduleEffectsV1/<64-hex-key>`

These names do not themselves establish privacy; real IAM/security rules are required. There is no custom endpoint, keyfile or arbitrary document-prefix override. All persisted values are bounded JSON. No effect callback executes inside a retryable transaction.

## Independently initialized inventory and canonical migration

The existing root must be exactly:

```
{schemaVersion:1,generation:'standalone-schedule-store-v1',initialized:true,
 revision:<positive integer>,
 claims:{<effectKey>:<immutable-effect-binding-SHA256>},
 editions:{'YYYY-MM-DD':{editionId:'YYYY-MM-DD-rN',sha256:<canonical-history-payload-SHA256>}}}
```

No initializer is exported. Before any real activation, an approved migration must populate all canonical edition history and all previously claimed effect identities. An empty root must not be used to forget existing publications, emails or effects. The adapter cannot discover missing historical records outside this authoritative registry.

Each indexed history document is `{schemaVersion:1,generation:'standalone-canonical-edition-v1',payloadJson}`. Its canonical sorted-key JSON payload is exactly `{editionDate,editionId,run,sourceHealth}`. Run follows the existing monitor's bounded status/timestamp/publication fields; sourceHealth is null or `{expiresAt,gapCount}`. The actual payload SHA must match the inventory index. This adapter never creates, updates or deletes canonical history or control. A separate reviewed canonical writer/migration is still required.

History reads use one Firestore transaction for inventory plus date document. An indexed missing document or unindexed existing document holds. Only a genuinely absent date in both can return `exists:false`; never a connector/search miss. Successful results stamp observedAt from the injected local clock after SDK reads, add an observation digest binding inventory revision/date/index/value, and set `authenticated:true` with `authenticationSource:'injected-firestore-sdk-read'`. No caller-supplied authenticated flag is accepted. This expresses trust in the configured SDK/service identity, not cryptographic verification of arbitrary injected mocks. Historical completion is not newly fresh research.

## Atomic genuine-new-key claims

Outbox reads also transactionally read root plus effect document. For an unclaimed key with no document, return `{version:0,record:null}` without writing. First CAS atomically updates the existing inventory with the immutable identity binding and creates the intent document. No manual per-day row initialization is needed.

A claimed key with missing row always holds, as does an orphan row without a claim. Never reinitialize known history. Lifetime claims are capped at 1,000 and history-index dates at 1,000, also bounded to a 512 KiB canonical root. Exhaustion holds; there is no automatic rotation/deletion or loss of tombstones. Production capacity monitoring/migration policy remains to be supplied.

Effect row envelope is `{schemaVersion:1,generation:'standalone-schedule-effect-v1',key,version,payloadJson}`. Payload is the exact scheduler `{version,record}` contract. Strict allowed phases are 0/null (unallocated only), 1/intent, 2/acknowledged. Immutable binding includes key, kind, eventSha256, payloadSha256 and destinationSha256. Timestamp creation is retained; acknowledgment cannot precede it or be in the future. Only the single intent→acknowledged transition is allowed. No reset, update of acknowledged effects, deletion or identity change is exposed.

Each mutating transaction also reads existing `newsroomControl/standalone-v1`, requiring initialized state, emergency stop off, and the constructor-pinned owner/fence matching an unexpired live lease. Claim input does not acquire a lease or grant approval. Missing/stale control prevents both new claims and acknowledgment saves. Control is never written here. CAS expected-version conflict returns `{applied:false}`.

A successful mutation requires exact post-commit transaction readback. Any uncertain transaction/readback exception latches that key against further mutation in the instance. Reads remain available and a mutations-disabled new instance can reconcile. The actual scheduler still refuses durable intent on restart, preventing duplicate dispatch/email after unknown outcomes. An external effect followed by lost acknowledgment remains uncertain; no retry is inferred.

## Remaining deployment seams

Official SDK credentials, IAM/privacy, existing control initialization/lease acquisition, authoritative migration, canonical history writer, source semantic review, production receipts, real scheduler/vendor dispatch and alert adapters are not configured. Firestore transaction guarantees do not make an external provider effect atomic; the scheduler's own action-time approval and history checks plus downstream idempotence remain necessary. Service clocks must be correct. There are no live resources or credentials in these tests.

Tests compose the actual schedule monitor and this actual adapter against a serialized fake SDK transaction engine with mocked preparation/alert callbacks. They verify concurrent claim contention, fresh keys without bootstrap, exact history digest, lost-state fail-closed behavior, unknown commit/restart reconciliation, control gates, strict phases, immutable identity and no repeated delivery. No live SDK, production or external effects were used.
