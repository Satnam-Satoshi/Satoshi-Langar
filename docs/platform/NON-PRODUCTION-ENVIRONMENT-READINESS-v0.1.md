# SSCOS Non-Production Environment Readiness Specification

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed Control Specification — No Account Configuration Authorized |
| Owner | Account Owner / Platform Lead / Security Lead |
| Related Volume | Engineering Program |
| Related Chapter | GI-05 — Implementation Readiness |
| Dependencies | ADR-0005; Platform Security and Deployment v0.1; Threat Model v0.1; Integration Verification Record v0.1; SSCOS-IMP-001 Charter |
| Approval Status | Pending Human Founder, Account Owner, Platform, Security, Privacy, and Finance Approval |

## Purpose

This specification defines the evidence required before any SSCOS implementation or test runs outside an isolated developer workstation. It does not create accounts, credentials, projects, environments, deployments, domains, databases, budgets, or vendor configurations.

## Environment classes

| Environment | Permitted purpose | Data | Network/integrations | Promotion authority |
|---|---|---|---|---|
| Local isolated | Development and deterministic tests | Synthetic only | Deny by default; approved package registry during preparation only | None |
| Preview | Human review of a pull request artifact | Synthetic only for first increment | No production services; only explicitly approved non-production endpoints | None; ephemeral only |
| Staging | Later release-candidate rehearsal | Approved representative non-production data | Separate staging integrations and credentials | Separate staging authorization |
| Production | Public service | Approved released records only | Production integrations | Separate Founder go/no-go and operator execution |

`SSCOS-IMP-001` proposes Local isolated and, only if fully verified, Preview. Staging and Production are excluded.

## Readiness matrix

Every applicable row must have an evidence link, named owner, verifier, date, expiry/review date, and status of `Not Started`, `Failed`, `Conditional`, or `Passed`. Unknown never means passed.

| Control | Local | Preview | Required evidence |
|---|---|---|---|
| ENV-01 Legal/account owner | Named workstation custodian | Named vendor team/account owner | Ownership and recovery record |
| ENV-02 Human access | Named implementers only | Named reviewers/operators only | Current access inventory |
| ENV-03 MFA/recovery | OS/account protections | Phishing-resistant MFA; two-person recovery where feasible | Control screenshots/export reviewed safely |
| ENV-04 Service identity | None preferred | Dedicated preview identity | Role/permission inventory; no shared human token |
| ENV-05 Credential separation | No production credentials present | Preview-only credentials; never reused | Secret inventory plus production crossover denial |
| ENV-06 Data isolation | Synthetic fixtures only | Synthetic fixtures only | Fixture manifest and data scan |
| ENV-07 Network boundary | Runtime egress denied | Explicit allowlist; production endpoints denied | Egress policy and negative tests |
| ENV-08 Domain boundary | Loopback/local host | Vendor preview hostname only | DNS/domain inventory; no public/production domain |
| ENV-09 Database | None for IMP-001 | None for IMP-001 | Connection inventory proves absence |
| ENV-10 Logs/telemetry | Local redacted output | Approved bounded non-production logs only | Data fields, retention, access, deletion |
| ENV-11 Deployment | None | Immutable ephemeral artifact if authorized | Artifact/commit binding and expiry |
| ENV-12 Kill switch | Stop process/remove local artifact | Disable preview/remove access independently | Named owner and rehearsal evidence |
| ENV-13 Cost control | Approved local resource limits | Hard spending limit/alerts; no paid scale-up by code | Billing owner, cap, alerts, escalation |
| ENV-14 Retention/cleanup | Defined evidence retention | Automatic preview/artifact expiry | Retention and verified cleanup procedure |
| ENV-15 Incident response | Stop, preserve safe evidence, notify | Revoke access/credentials, disable preview, notify | Contacts, severity, timestamps, exercise |
| ENV-16 Production isolation | No route or secret | No production account/project/zone/database access | Negative reachability and permission evidence |

## Credential policy

- Do not create a credential until its system, environment, owner, scope, storage, rotation, expiry, revocation, log exposure, and incident procedure are approved.
- Prefer no credential for the first increment. Synthetic local operation is the baseline.
- Human credentials are not embedded in code, configuration, CI, screenshots, test fixtures, logs, or documents.
- Service credentials are environment- and function-specific, least privilege, non-exportable where feasible, short-lived where supported, and inaccessible to agents.
- Preview cannot read production secrets. Production credentials are never used as connectivity tests.
- Secret values are never recorded as evidence; evidence records identifiers, scope, owner, dates, and safe fingerprints only.
- Detection of any credential in repository history or artifacts triggers stop, revocation, incident review, and evidence-preserving remediation.

## Budget and resource controls

Before enabling any hosted preview, record billing owner, currency, monthly and per-increment limit, hard-stop capability, alert thresholds, authorized purchasers, free-tier constraints, usage metrics, retention costs, abuse limits, escalation contacts, and shutdown procedure. No system may automatically remove a hard limit or upgrade a plan. Cost alerts do not substitute for a hard control where the vendor supports one.

Proposed `SSCOS-IMP-001` default: local-only, zero new paid-service authorization. A preview budget requires a separate exact amount approved by the Founder/Account Owner.

## Independent stop controls

The responsible human must be able to perform each control without application code cooperation:

1. Stop the local process/build.
2. Disable or delete an ephemeral preview artifact.
3. Revoke the preview service identity/credential.
4. Block runtime egress.
5. Disable any later ingestion path independently of publication.
6. Disable any later publication path independently of ingestion.

For the first increment, controls 1–4 must be demonstrated if applicable; 5–6 remain absent and must be proven absent through capability inventory.

## Verification procedure

1. Inventory accounts, projects, teams, identities, roles, credentials, domains, endpoints, data stores, logs, billing, and recovery contacts.
2. Compare actual state to the matrix without changing it.
3. Record gaps and authorize configuration changes separately.
4. After approved configuration, verify least privilege, isolation, egress denial, budget controls, retention, and kill switches.
5. Run synthetic negative tests from the exact implementation identity.
6. Bind evidence to environment identifiers and the authorization expiry.
7. Revoke/clean up at increment completion and verify removal.

Read-only inventory does not authorize configuration. Configuration does not authorize implementation. Implementation does not authorize deployment or production.

## Readiness decision

`Passed` requires every applicable control passed and no unverified production reachability. `Conditional` must name a compensating control, owner, expiry, and Founder acceptance. Any failed/unknown credential, data-isolation, production-isolation, ownership, recovery, budget, or kill-switch control blocks hosted implementation.

## Current disposition

- Local isolated environment: **Unverified / not authorized for implementation**.
- Preview: **Blocked**; vendor/account/control evidence is missing.
- Staging: **Out of scope for SSCOS-IMP-001**.
- Production: **Prohibited and separately gated**.

## Success criteria

- Exact environment and identities have named human owners and time-bounded access.
- Synthetic-only and production-isolation claims are proven by inventory and negative tests.
- No agent or public identity can access credentials, mutate state, deploy, or change controls.
- Costs cannot exceed the approved bound without human action.
- Stop/revoke/cleanup controls are demonstrated and audited.
- Evidence is current, safe, reproducible, and bound to `SSCOS-IMP-001`.

## Required human decisions

1. Decide local-only versus local-plus-preview for `SSCOS-IMP-001`.
2. Name Account Owner, Platform, Security, Privacy, and Finance reviewers.
3. Approve exact resource/time/cost limits and evidence-retention period.
4. Authorize any account or credential configuration separately from implementation.

