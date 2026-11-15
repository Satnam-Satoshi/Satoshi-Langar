# Durable external-operation coordinator proposal

Mission: bridge the existing durable state and service-specific release effects, without activating cloud publication. Human owner: Satnam Satoshi founder. Permissions: injected offline providers, tests and local review commits only. Emergency stop: retain `migration_acceptance_pending`, the existing publication switch and paused state. Memory scope: private durable operation IDs, payload hashes and evidence hashes. Audit trail: local review commits and tests. No real provider credentials, API calls, uploads or deployment changes are supplied by this module.

`ReleaseOperationCoordinator` uses the real `DurableCloudState` interface. Runtime production admission still requires the explicit Google Docs adapter; tests may use memory only as an isolated mock. October30 isolated integration wires this coordinator into the production runner behind the still-unconditional acceptance gate. Real GitHub/Vercel/Drive provider implementations are locally tested; no cloud OAuth, promotion or recovery acceptance is inferred. Removing the global gate before real service-specific acceptance would be unsafe.

## Effect boundary

Each operation has a unique bounded ID and exact JSON payload hash. Persist `intend`, then `assertMayMutate` changes its status to uncertain before invoking an external effect. A duplicate pending/concurrent authorization can allow only one call. A provider timeout leaves uncertainty and cannot trigger an automatic retry. Confirmed and definitively not-applied operation IDs remain terminal; they are never reused for another effect.

Explicit reconciliation can run while publication is paused. The provider readback must establish operation identity, exact payload hash and verified service-specific outcome. Unknown, mismatched, empty or unavailable proof leaves uncertainty and prevents release. A negative lookup alone is **not** definitive non-application: a timed-out server request might finish later. Only proof that the effect cannot still complete may terminalize not-applied. A new attempt needs a separate deliberate operation ID after reconciliation, never an automatic replay.

The generic coordinator cannot itself authenticate GitHub/Vercel/Drive results. Reviewed provider code must independently verify account/project/repository, operation identity and expected content, and retain the underlying private evidence before returning proof. Do not merely echo requested payload as proof. Proof must exclude secrets and volatile data that cannot be reconstructed. Only its hash is kept in the state receipt; raw evidence belongs in the existing approved private store.

## Bounded release sequence

`runBoundedReleaseOperations` enforces exactly source → evidence → stage → promote, with distinct IDs. It stops on uncertain or not-applied outcomes. After reconciliation, rerunning the same plan returns prior confirmed receipts without repeating effects. The coordinator does not invent rollback, retry, lease renewal/release or recovery policy. Those require their own explicit operations and verified evidence.

Provider requirements before runner integration:

- **Source:** mutation uses the observed branch head with non-force update; readback verifies exact commit/tree, parent and unchanged reviewed implementation. Dangling blob/tree creation must be accounted for separately and cannot become a blind reference retry.
- **Evidence:** predetermined Drive file ID, exact owner-only folder, byte hash and readback; metadata-only success is insufficient.
- **Stage:** operation identity must be recoverable after a lost deployment response, with exact project/team/source/build-output hash. Never create another deployment merely because a response timed out.
- **Promote:** recheck expected previous deployment, source/guard, private evidence and latest state before authorization; readback verifies both domains and deployment identity. A pointer absence or ambiguous propagation is unknown, not permission to repeat.
- **Rollback:** separate operation; verify the failed deployment still owns the pointer before rollback and verify restored bytes on both domains. Never roll back another writer's release.

## Acceptance still pending

The existing desktop connector Google Docs concurrent-write smoke proves the requiredRevisionId primitive only. Supported environment-only refresh, raw REST adapter compatibility, service-specific providers, full artifact packaging and per-effect runner wiring now exist in the isolated integration with offline tests. Real cloud OAuth, live durable evidence/recovery proof, exact implementation acceptance, protected default-branch workflow update and Mac-off observation remain required. Preserve the existing last verified website throughout this work.

Tests exercise concurrent duplicate calls, crash before/after the effect boundary, unknown/malformed proof, definitive negative evidence, pause/expiry, bounded ordering, resume without repeat, and the actual Docs adapter interface with an injected provider mock. No real-world deployment or delivery result is claimed.

October30 production ordering is private full-artifact evidence → separate immutable Git object/ref operations → protected stage → promote → public readback → private final receipts/ledger backup → latest-release checkpoint → lease release. Rollback is a separate fenced effect only after confirmed promotion with failed public bytes. Uncertain promotion never triggers automatic rollback. This extended sequence is implemented in cloud-ltc-production.mjs; the four-kind generic helper remains useful for its original bounded contract and local rehearsal.
