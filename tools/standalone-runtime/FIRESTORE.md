# Dormant Firestore state adapter

`src/firestore-state.mjs` adapts an injected, reviewed official `@google-cloud/firestore` constructor. No SDK is installed or imported in this package, no credentials/resources/database were created, and tests use synthetic SDK doubles only. The entrypoint remains disabled. This is not a real Firestore transaction proof.

The deployment must separately approve and supply exact project/database identifiers, runtime service identity/IAM and a pinned SDK dependency. The constructor receives explicit identifiers, default vendor endpoint and strict undefined handling; arbitrary endpoint/options/key files are not accepted. Emulator configuration is rejected. Constructor provenance and deployment network/identity are a trusted boundary, not established by an injected JavaScript object.

Only the fixed `newsroomControl/standalone-v1` document is exposed. State must already exist as a reviewed migrated canonical envelope: schemaVersion/generation/revision/payloadJson. There is no create/delete/bootstrap method. Mutations default off. JSON state is bounded to 512 KiB, below document limits with ample envelope overhead; capacity holds rather than dropping history. Production indexing/exemptions, backups, retention and controlled history partitioning remain unimplemented prerequisites.

CAS compares the current revision inside a Firestore transaction and updates only at exact next revision. Retried transaction callbacks perform only reads/conditional writes, never publication or other external effects. Unknown commit outcomes propagate; the caller must read/reconcile the actual document and never repeat an uncertain provider effect. A successful transaction is not provider publication, an outbox receipt, or a hard fence against administrators/other credentials.

Official API references checked November 17, 2026:
- https://googleapis.dev/nodejs/firestore/latest/Transaction.html
- https://raw.githubusercontent.com/googleapis/nodejs-firestore/main/types/firestore.d.ts (constructor settings, databaseId getter, runTransaction, Transaction.get/update)

Missing end-to-end proofs: real SDK compatibility, approved initialized document, service identity and IAM, actual concurrent CAS/unknown-result readback, durable evidence/outbox and integration with reviewed runner. No paid resource or billing activation is authorized by these tests.
