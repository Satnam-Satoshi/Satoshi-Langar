# Dormant deployment configuration contract

Mission: make eventual worker identity and dependencies explicit without activating anything. This pure module does not read environment variables, files or credentials, initialize a client, provision resources, dispatch work, send messages, change IAM, incur billing or create a scheduler. Existing `npm start` remains unchanged and prints `deployment-disabled`.

## Exports

- `deploymentConfigTemplate()` returns a deliberately incomplete nonoperational template. Identity and reviewed prerequisite digest placeholders are null; all eight effect flags are false; optional secret references default null. The template cannot validate until independently reviewed values are provided.
- `deploymentConfigSha256(config)` computes canonical sorted-key JSON SHA256. A digest is not approval, a signature, migration proof or CI provenance.
- `validateDeploymentConfig({config,reviewedPins})` validates strict schema and independent identity pins, snapshots/deep-freezes the result and returns `validated-dormant-configuration`. It always reports effectsEnabled, authorizationVerified, migrationVerified and serviceIdentityVerified as false.
- `prepareDisabledWorkerEntry({config,reviewedPins,request})` validates the exact eventual request envelope but **always** returns deployment-disabled with effects:[], dispatchPerformed:false and publicationVerified:false. There is no callback or activated worker invocation.

## Configuration shape

Use the executable template rather than an alternative handwritten schema. Required identity fields are exact projectId, region, full Cloud Run jobName, expectedEtag, Firestore databaseId, fixed repository `Satnam-Satoshi/Satoshi-Langar`, reviewed `agent/…` branch and exact 40-hex source commit. Image URI must be regional Artifact Registry in the same configured project and pinned with `@sha256:<exact image.sha256>`. Mutable tags, cross-project job/image substitutions and arbitrary endpoints are rejected.

The fixed 26-store contract binds path plus generation for existing controller, scheduler inventory, transport effect inventory, consumer inventory, canonical history, schedule effects, Cloud Run/Brevo journals, consumer inbox, preparation inventory and work rows, release outbox, upload inventory and journal, and durable artifact bundle inventory and rows, candidate ref inventory/intents, Git object inventory/plans, Vercel preview and promotion inventory/intents, and frozen release-QA inventory/proofs. It does not create or migrate any of them. Canonical indexes and every existing effect must be reconciled by the separately approved migration before a real runtime can treat absence as new work.

`secretReferences` has exactly github/vercel/drive/brevo. Each is null or a version-pinned Secret Manager resource string `projects/<same project>/secrets/<name>/versions/<positive integer>`. `latest`, raw token values, secret payloads, credential files, arbitrary URLs and extra credential keys are rejected. Null means unavailable, not permission to discover credentials elsewhere. No secret is resolved, and the disabled worker result does not include references.

`effects` has exactly alerts/dispatch/mutations/network/producer/promotion/publication/render; every value must be false. True flags are rejected, not treated as consent. This version intentionally has no activation mode.

`prerequisites` binds ownerReviewSha256, canonicalMigrationSha256, inventoryMigrationSha256 and approvalPolicySha256. These are identifiers for independently retained reviewed material. Their syntactic presence does **not** verify the material, approve actions or attest migration. Fake approved:true, initialized:true or owner-approved booleans are not accepted as substitutes.

`reviewedPins` comes from a separate trusted review boundary, not producer-generated configuration. Exact keys are configSha256, sourceCommit, imageSha256, projectId, region and jobName. All must match the config. The validator cannot authenticate an arbitrary caller that supplies both config and pins; its outputs deliberately do not claim authority. A real coordinator must independently load and validate review/migration/approval records and service observations.

## Disabled request shape

```
{operation:'prepare-daily',configSha256:<exact pinned digest>,
 event:<exact dailyEditionEvent(editionDate) result>}
```

Only canonical daily-r1 events from the existing New York 09:00 schedule contract are accepted. No CLI argument override, env fallback, arbitrary operation, extra field, callback, inline secret, supplied approval boolean or source/image override is allowed. The returned descriptor binds event/config/source/image/job plus prerequisite digests, but authorizes no execution.

Plain JSON objects only: accessor/getter properties, hidden fields, symbol keys, arrays where no schema permits them, cyclic/oversized data and nonplain prototypes fail. Errors contain bounded codes, not offending values or credentials. All source inputs are copied; later caller mutation cannot alter validated configuration.

## Integration still required

This module is a planning/validation contract, not runtime wiring. A separate reviewed activated entrypoint, authenticated Cloud Run execution observation, independent CI source→image provenance, live initialized-store/migration verification, control lease/stop gate, exact action approvals, service identity/permissions, credential resolution and real vendor deployment would still be required. A configured image digest, source SHA or environment assertion is never execution attestation. No service account or image identity is inferred from a token or ambient variable.

Tests are local and synthetic. They cover defaults, incomplete template hold, exact pins, source/image/store mismatch, raw-secret and ambient override rejection, no getter execution, immutable output, exact disabled event contract, and unchanged deployment-disabled main. No resources, credentials, IAM, billing, activation, provider calls or publication were performed.
