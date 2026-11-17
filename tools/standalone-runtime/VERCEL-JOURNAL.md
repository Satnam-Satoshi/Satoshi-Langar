# Dormant durable Vercel journals

`createFirestoreVercelJournal` supplies the existing preview and promotion adapters' exact `read({key})` and `cas({key,expectedVersion,next})` interfaces. Mode is `preview` or `promotion`; identity must be the adapter's exact independently configured identity. Key is SHA256 of recursively sorted canonical identity JSON. Requires explicit Firestore project/database, claim owner/fence and clock. Mutations default off; no SDK dependencies are loaded on import, credentials discovered, resources created, or inventories initialized.

Fixed paths are exported as `VERCEL_JOURNAL_PATHS`. Each pre-existing root has exact fields:

```
{schemaVersion:1,generation:"standalone-vercel-<mode>-inventory-v1",
 initialized:true,repository:"Satnam-Satoshi/Satoshi-Langar",
 projectId,teamId,revision:1,claims:{}}
```

This example describes an independently approved genuine initial inventory, NOT a recovery recipe. Never recreate an empty root after loss. Canonical migration, root ownership and preservation of all prior uncertain effects require separate approval and verification. Missing root, indexed missing row, orphan row, bad hash, noncanonical payload and phase resets hold. No automatic rotation or deletion. Capacity is 100 indexed identities per mode; explicit controlled migration is needed before exhaustion.

Each row stores exact canonical adapter state, indexed by version and SHA256. Only 0/null → 1/attempting → 2/created (preview) or acknowledged (promotion) is permitted. Approval, source, artifact/plan, project, baseline and domains remain immutable. Preview's known deployment ID can only be introduced on the second transition; thereafter no write is permitted. Promotion already binds candidate deployment in its initial identity. A same-mode unresolved intent blocks a new identity, including another deployment. Separate modes are not a global workflow lock; orchestration must enforce cross-mode ordering and consumer exclusivity.

Every write transaction reads root, row and existing canonical `newsroomControl/standalone-v1` live lease/emergency-stop state before writes and rechecks the clock before commit. Root revision advances, control revision does not. Readback verifies exact persisted state. An ambiguous transaction result latches mutations in that instance; a new instance reads canonical state and must not repeat a provider effect after an attempting record. Known/unknown reconciliation reads do not require a still-current lease. This journal does not itself issue or retry any Vercel request or transform uncertain provider outcomes into known outcomes.

The live control check does not fence Vercel: revocation can race after transaction commit and before HTTP. Current adapters/orchestrator must revalidate independent approvals, admission and QA at their own final boundary. Firestore IAM, actual SDK transactions/concurrency, inventory migration and provider integration remain unproved here. Tests use a serialized in-memory fake SDK, not a deployed service.
