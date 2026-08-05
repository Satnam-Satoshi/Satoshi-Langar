# SSCOS Dependency, Licensing, and Supply-Chain Policy

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed Control Standard — No Dependency Installation Authorized |
| Owner | Platform Lead / Security Lead / Legal Owner |
| Related Volume | Engineering Program |
| Related Chapter | GI-04 — Implementation Readiness |
| Dependencies | Repository Specification v0.1; MVP Threat Model v0.1; ADR-0002; ADR-0005 |
| Approval Status | Pending Human Founder, Platform, Security, and Legal Approval |

## Deliverable mapping

This policy defines how software packages, build actions, containers, services, fonts, media libraries, and generated code may enter the SSCOS MVP. It supports all four MVP surfaces and the shared platform. It does not approve or install any dependency, vendor, workflow, or service.

## Principles

1. Every dependency must solve a documented MVP requirement; convenience alone is insufficient.
2. Prefer platform capabilities and small, mature libraries over broad frameworks or overlapping packages.
3. Pin direct dependencies and CI actions to reproducible versions; immutable digests are required where supported.
4. The lockfile is authoritative, reviewed, committed, and changed only with its manifest.
5. Build scripts, install hooks, native binaries, code generation, telemetry, and network access are privileged behaviors requiring explicit review.
6. No dependency receives credentials, deployment authority, production data, filesystem scope, or network scope beyond its approved function.
7. Open-source status does not establish legal suitability; license, notices, attribution, patents, trademarks, data terms, and distribution obligations are reviewed separately.
8. Generated artifacts retain tool/version/source provenance and are reproducible or independently reviewable.
9. Unknown provenance, abandoned maintenance, unresolved critical/high risk, or incompatible licensing fails closed.
10. Removal and replacement must be feasible; critical vendor lock-in requires an ADR and exit plan.

## Dependency classes and admission

| Class | Examples | Minimum review | Approval |
|---|---|---|---|
| Runtime | Web, API, database client, validation | Necessity, maintenance, license, vulnerabilities, transitive graph, security behavior, bundle/runtime cost | Platform + Security + Legal |
| Development | Test, lint, format, type, build | Execution hooks, transitive graph, maintenance, license, CI permissions | Platform + Security |
| CI/CD action | GitHub Action, release helper | Pin to full commit digest, publisher verification, permissions, network/secrets behavior, update policy | Platform + Security |
| Container/base image | Builder/runtime image | Trusted registry, digest pin, SBOM, vulnerability state, minimal contents, provenance | Platform + Security |
| Hosted service/SDK | Vercel, Supabase, Cloudflare, observability | Integration verification, terms/DPA, data flow, permissions, cost/exit, incident and recovery | Founder + Platform + Security + Legal/Privacy |
| Design/media asset | Font, icon, image, audio/video library | License scope, attribution, redistribution, privacy/consent, provenance | Design/Editorial + Legal |
| Generated code/model output | Client, schema binding, AI-generated artifact | Source contract, generator/model/version, license, reviewability, deterministic regeneration | Owning technical lead + Legal when material |

## Required dependency record

Before admission, record: name and ecosystem; exact version/digest; direct or transitive status; MVP requirement and consuming module; upstream repository/publisher; maintenance and release posture; license and notice obligations; known vulnerabilities and exploitability; install/build scripts; binary/native components; network, telemetry, data, filesystem and secret behavior; package size/performance effect; alternatives considered; update owner/cadence; removal/rollback method; approvers; decision date; expiry/next review; and evidence links.

## License disposition

Licenses are not automatically allowed by name. Legal must approve an organizational allowlist and conditions. Until then:

- permissive licenses may be proposed but remain unapproved;
- copyleft, network-copyleft, source-available, non-commercial, field-of-use, custom, missing, ambiguous, or conflicting licenses require explicit Legal disposition;
- production dependencies with unknown license are prohibited;
- required copyright notices, attribution, license text, source-offer, modification disclosure, or relinking obligations must be included in release evidence;
- dependency licensing does not grant rights to upstream data, brands, media, or API content.

## Supply-chain controls

- Use the approved package registry and TLS path; prohibit arbitrary git/URL dependencies unless exception-approved.
- Enforce exact resolution through a single reviewed lockfile; prohibit unreviewed lockfile regeneration.
- Disable or sandbox install scripts where feasible; review every exception.
- Pin CI actions to immutable commit digests and minimize job/token permissions.
- Produce an SBOM for each release artifact and bind it to the artifact hash.
- Verify provenance/signatures/checksums when upstream support exists.
- Run dependency, license, secrets, static-analysis, and configuration scans on pull requests and release candidates.
- Separate build and runtime identities; build output cannot inherit repository or deployment credentials.
- Use clean, ephemeral builds and document toolchain versions.
- Retain admission decisions, scan reports, exceptions, SBOMs, provenance, and update history as audit evidence.

## Vulnerability and exception policy

| Finding | Default disposition |
|---|---|
| Known exploited or critical affecting reachable behavior | Block admission/release; remove, upgrade, or mitigate with Security and Founder approval |
| High affecting reachable behavior | Block; time-bounded exception requires Security owner, compensating controls, expiry, and Founder acceptance |
| High not reachable | Document reachability evidence and remediation date; Security decides |
| Medium/low | Risk-ranked remediation under approved service level |
| Unknown/unscannable binary or provenance | Block until verified or explicitly replaced |

An exception names the package/version, finding, affected surfaces, rationale, compensating controls, owner, expiry, monitoring, removal plan, and approving humans. An expired exception blocks the next build or release.

## Change and update rules

- Automated tools may open proposals but may not merge, approve, install, deploy, or dismiss findings.
- Group only low-risk compatible updates; security and major-version changes receive isolated review.
- Major upgrades require compatibility, data/migration, performance, accessibility, rollback, and contract evidence where applicable.
- Emergency security updates still require named human review and an auditable decision; urgency does not grant production authority.
- Removed dependencies must be absent from manifests, lockfiles, build caches, artifacts, SBOMs, notices, configuration, and documentation.

## Proposed initial tool categories

Final products and versions remain subject to an implementation authorization record. The first increment may select one tool per approved need: package manager/runtime; formatter/linter/type checker; unit/contract/browser/accessibility test runners; OpenAPI validator; migration verifier; secrets/SAST/dependency/license scanners; SBOM/provenance generator; and build framework. Duplicate tools require written justification.

## Acceptance criteria

- Every direct dependency has an approved record and owner.
- The complete transitive graph and SBOM are reproducible from a clean build.
- No unknown, incompatible, expired-exception, critical, or reachable-high dependency reaches release.
- CI permissions and actions are pinned and independently reviewed.
- A clean build can run with no production secrets or production data.
- License/notice artifacts match the shipped dependency graph.
- Dependency removal and artifact rollback are demonstrated for the first implementation increment.

## Required human decisions

1. Name Platform, Security, and Legal owners.
2. Approve license categories, notice obligations, and exception authority.
3. Approve registries, toolchain, scanners, remediation service levels, and evidence retention.
4. Approve the exact dependency inventory only within a bounded implementation authorization.

