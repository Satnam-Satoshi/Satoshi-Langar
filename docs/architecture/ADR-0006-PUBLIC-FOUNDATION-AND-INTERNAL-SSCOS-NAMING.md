# ADR-0006: Public Foundation and Internal SSCOS Naming Boundary

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed |
| Owner | Office of the CTO |
| Related Volume | Institution-wide |
| Related Chapter | Identity, Product Architecture, and Communications |
| Dependencies | SSCOS Constitutional Baseline v0.2; Engineering Program v0.1; Autonomous Foundation Mode v1.0 directive |
| Approval Status | Pending Amardeep Baba G Malhotra, Human Founder |

## Decision metadata

| Field | Value |
|---|---|
| ADR ID | ADR-0006 |
| Decision Owner | Office of the CTO |
| Decision Authority | Amardeep Baba G Malhotra, Human Founder |
| Proposed Date | 2026-08-05 |
| Future Review Date | 2027-02-05 or upon legal-name/brand architecture change |
| Supersedes | None |
| Superseded By | None |

## Problem

The institution needs a stable boundary between its public identity and its internal operating architecture. Earlier drafts use SSCOS prominently, sometimes in contexts that could be interpreted as a public product or organization name. The Founder has now established **Satnam Satoshi Foundation** as the public organization and **SSCOS** as its internal institutional operating system. Without an explicit decision, websites, APIs, reports, repository descriptions, media, and community programs may expose inconsistent names, confuse audiences, or weaken institutional continuity.

## Options considered

### Option A — Use SSCOS as both public organization and internal system

This minimizes renaming but exposes internal terminology everywhere, makes the operating system appear to be the public institution, and conflicts with the new public identity directive.

### Option B — Publicly use Satnam Satoshi Foundation and reserve SSCOS for internal governance and engineering

This creates a clear organization/system boundary while preserving SSCOS as the canonical internal system of record. Public products inherit Satnam Satoshi branding. SSCOS may appear in engineering, governance, open-source architecture, audit, and contributor documentation when its meaning is relevant.

### Option C — Remove SSCOS terminology entirely

This would simplify public language but destroy constitutional and architectural continuity, invalidate existing document relationships, and require an unnecessary redesign.

## Decision

Adopt Option B.

1. The public organization is **Satnam Satoshi Foundation**.
2. The internal institutional operating system is **SSCOS**.
3. Public products, public navigation, media mastheads, community programs, public reports, and ordinary audience-facing copy use **Satnam Satoshi** as the primary brand.
4. SSCOS is used externally only when discussing engineering, governance, architecture, open-source contribution controls, audits, or the operating system itself.
5. Existing SSCOS constitutional, governance, architecture, and internal operational documents retain their names and identifiers; they are not renamed merely for branding.
6. Public API titles, metadata, repository descriptions, and product specifications must be reviewed before release and revised where they expose SSCOS without a governance/engineering purpose.
7. No legal-name claim, trademark claim, domain change, publication, or public launch is authorized by this ADR.

## Reasoning

The selected model mirrors durable institutions that distinguish the public entity from their internal governance and technical systems. It gives audiences one coherent public identity, preserves SSCOS continuity, and allows technical transparency without turning internal control vocabulary into consumer branding. It also supports the constitutional rule against parallel governance because SSCOS remains the sole internal operating system.

## Benefits

- Clear public identity for every product and community surface.
- Preserved SSCOS constitutional and engineering continuity.
- Reduced ambiguity in website navigation, reports, media, APIs, and contributor documentation.
- A testable naming policy for design, content, and release review.
- Freedom to document SSCOS openly where governance and engineering context warrants it.

## Tradeoffs

- Existing draft titles and public-facing contract metadata require review before release.
- Contributors must understand when SSCOS terminology is contextually appropriate.
- Search, documentation, and repository navigation must preserve both identities without presenting them as competing organizations.
- Legal entity naming, trademarks, and domains remain separate Founder/legal decisions.

## Security and privacy impact

The boundary reduces unnecessary public exposure of internal control terminology, system topology, and operational roles. It does not make SSCOS secret: approved governance and engineering material may be public. Sensitive configuration, identities, credentials, incident details, and internal-only evidence remain governed by their classification rather than by branding.

## Dependencies and interfaces

Downstream consumers include Satnam.x information architecture, Treasury Intelligence, Lunch Time Conversations, Satoshi Langar, public API metadata, media templates, contributor guides, repository descriptions, documentation headers, search metadata, and institutional reports. Legal entity usage, trademarks, domains, publishing, and public releases remain separately gated.

## Validation and success criteria

- Every public surface identifies the institution/products as Satnam Satoshi.
- No ordinary public page presents SSCOS as a consumer product or public organization.
- Engineering/governance documents can explain SSCOS without ambiguity.
- Automated and human content review can flag public-facing misuse.
- Existing constitutional identifiers and traceability remain intact.
- Public release evidence includes a naming inventory with zero unresolved violations.

## Approval record

| Decision | Approver | Date | Conditions |
|---|---|---|---|
| Pending | Amardeep Baba G Malhotra | Pending | Architecture proposal only; no public release or legal-name action |

## Change history

| Version | Date | Author/Owner | Summary |
|---|---|---|---|
| 0.1 | 2026-08-05 | Office of the CTO | Initial public/internal naming boundary proposal |

