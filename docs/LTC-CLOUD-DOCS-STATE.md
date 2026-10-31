# Private Google Docs state adapter: review proposal

This adapter is not connected to the production publisher. Full cloud acceptance remains pending. A disposable owner-only document passed a real two-writer requiredRevisionId smoke test through the desktop official connector: one write succeeded and the other was rejected for stale revision. This proves that primitive through that connector only; it does not establish offline runner OAuth, full adapter compatibility, recovery or autonomous publication. `assertMigrationAcceptance()` still prevents publication, and no workflow or cloud switch is changed.

`GoogleDocsStateAdapter` in `scripts/cloud-ltc-docs-state.mjs` implements `read(key)` and `conditionalWrite(key,value,expectedVersion)` for the existing `DurableCloudState`. It requires three injected provider methods; it never reads credentials, starts OAuth, creates files, enables APIs or makes network calls itself.

## Provider contract

- `getFileMetadata(documentId)` returns `{status,body}` for exact metadata: id, mimeType, trashed, ownedByMe, shared, parents and capabilities.canEdit.
- `getDocument(documentId, options)` returns a Google Docs document, with `includeTabsContent:true` and `suggestionsViewMode:SUGGESTIONS_INLINE`.
- `batchUpdateDocument(documentId, body)` returns `{status,body}` for the exact Docs batch request. It must preserve HTTP statuses, never auto-retry a write, never substitute targetRevisionId and use the same OAuth identity as reads. Thrown errors are concealed.

The document must already be provisioned privately in the owner-selected existing evidence folder. Its exact ID is configured externally. A 404 or missing access fails; the adapter never creates a replacement ledger. Metadata checks are preflight checks, not atomic guarantees against an owner independently changing sharing during a request.

Each ledger is a single plain-text paragraph in one unambiguous document tab, containing canonical JSON `{schemaVersion:1,key,value}`. The Docs terminal newline is retained. Tables, child/multiple tabs, links, suggestions, ambiguous body structure, noncanonical JSON or unrelated state keys are rejected. UTF-16 indexes determine delete ranges. Writes are bounded to 900,000 UTF-16 code units, and the full read document to 1,000,000; production limits need confirmation through the real provider before acceptance.

Reads of a provisioned blank ledger return `{value:null,version:null}`. Conditional bootstrap rereads the same blank document and uses its required revision, so simultaneous bootstraps compete on one known resource. A nonblank ledger cannot be overwritten with expectedVersion null. Populated ledger versions are opaque revision IDs, not sequential numbers.

A write rereads and checks expected revision before sending an atomic delete/insert batch with **requiredRevisionId**. A stale-revision400 is classified as conflict only after readback proves the revision changed. Other400 responses, errors, malformed success or lost response are uncertain; no write is replayed automatically. An uncertain durable authorization can already be recorded, so the next reader must reconcile it before external mutation.

## Official documentation

- [Docs batchUpdate and WriteControl](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate): batch atomicity, stale requiredRevisionId rejection and drive.file authorization.
- [Document resource](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents): opaque user-specific revision IDs,24-hour validity and tab structure.
- [Request types](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request): indexed delete/insert operations.
- [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth): app-created/user-selected file scope. Ordinary Drive JSON update CAS is not assumed.

## Offline validation and real acceptance

Tests use a revision-enforcing provider mock and the actual DurableCloudState, including concurrent bootstrap/update, Unicode, ambiguous commit, bad metadata/structure, uncertain mutation authorization, and paused restoration. Mocks demonstrate implementation logic; they do not establish live provider behavior or prove linearizability of an untested credentialed setup.

Before production: enable the Docs API in the existing owner project if necessary, complete supported selected-file access, provision the exact private ledger, prove stale/concurrent required revision handling and ambiguous-response recovery on the real provider, confirm privacy checks and limits, verify a fresh-folder recovery, and integrate operation intents around every remote release mutation. Evidence uploads remain separate, private Drive binary files with readback hashes. Never use targetRevisionId merging, folder names as locks, or a memory adapter as a production fallback.

## Runner admission seam

The draft runner now requires an explicitly injected GoogleDocsStateAdapter for publish mode before any filesystem/provider work; memory and arbitrary adapters are rejected. Behind the still-closed migration gate, admission uses DurableCloudState.acquire to reject paused/restored/unreconciled/leased state and persist a fencing token under revision CAS. GitHub run identity must be explicit. Tests use injected mocks, not production credentials.

October30 isolated integration adds the credential-owning Google REST client, supported environment-only OAuth refresh, actual adapter construction and per-effect provider wiring. Each request refreshes its short-lived client; writes reverify exact private resources. The publication gate remains unconditional pending real cloud authorization and recovery acceptance. Interrupted leases remain held; verified success now writes a final backup/next-release checkpoint and releases the lease. The disposable concurrency-test document is not a production state ledger and must never be selected automatically. See LTC-CLOUD-INTEGRATION-20261030.md for current engineering and remaining live gates.
