# Satnam Satoshi Foundation Institutional Offices and Artifact Routing Standard

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed Operating Standard |
| Owner | Office of the Founder / Office of Operations |
| Related Volume | Institution-wide |
| Related Chapter | Institutional Organization and Records Management |
| Dependencies | SSCOS Governance Metadata Standard v0.1; Repository Register v0.1; ADR-0006 |
| Approval Status | Pending Amardeep Baba G Malhotra, Human Founder |

## Mission

Establish permanent institutional offices, assign accountable ownership for every artifact and roadmap, and prevent orphaned records, duplicated authority, and ambiguous queues. The Foundation is public; SSCOS is the internal operating system through which these offices coordinate.

This standard assigns governance ownership only. It does not establish legal departments, employment relationships, contracts, financial authority, publication authority, production access, or public community programs.

## Office model

| Office | Mission | Primary responsibilities | Controlled artifacts and queues | Human authority |
|---|---|---|---|---|
| Office of the Founder | Protect mission and final institutional authority | Mission, constitutional decisions, final approvals, treasury/publication/release authority, institutional succession | Constitution, Founder decisions, approval packets, mission roadmap, authority register | Amardeep Baba G Malhotra |
| Office of the CTO | Maintain coherent architecture and technical direction | ADRs, system boundaries, technical roadmap, implementation gates, technical standards | Architecture roadmap, ADR register, subsystem charters, API/database/agent/platform specifications | Founder appoints accountable technical humans; AI coordinates only |
| Office of Research | Produce source-grounded institutional knowledge | Source registry, primary-source research, methodology, fact verification, research queue | Research roadmap, source records, research packages, citation/provenance evidence | Named Research Director; publication remains separate |
| Office of Engineering | Build and verify authorized open-source infrastructure | Backlog, repository delivery, testing, accessibility, supply chain, implementation evidence | Engineering roadmap, issues, sprints, dependency/test records, code-review evidence | Named Engineering/Platform leads; merge/deploy separately gated |
| Office of Treasury Intelligence | Maintain factual treasury datasets and methodologies | Entity/asset taxonomy, holdings classification, calculations, freshness/corrections, treasury intelligence queue | Treasury methodology, data dictionaries, observation/claim registers, daily intelligence drafts | Founder is Treasury Approver; no financial accounts or movement implied |
| Office of Community | Steward participation and future community systems | Contributor pathways, Agent Sangat, Proof of Seva, Kalakar.x, Crypto Kitty, community roadmap | Community roadmap, contributor governance, conduct/safety drafts, launch readiness | Public/community launch requires Founder approval |
| Office of Media | Develop editorial and visual institutional media | Lunch Time Conversations, Satoshi Langar editorial production, design/media systems, rights workflow | Media roadmap, editorial calendar, story packages, Canva/template register, correction queue | Founder is Publisher; no publishing by office/AI alone |
| Office of Operations | Maintain institutional cadence and records | Executive reporting, risk/dependency/integration registers, decision tracking, records routing, audits | Institutional roadmap, executive dashboard, risk register, integration matrix, documentation register | Named Operations owner; cannot grant domain authorities |
| Office of AI Systems | Govern bounded AI assistance | Agent charters, permissions, evals, memory/audit policy, model/tool governance, emergency stops | AI roadmap, agent register, evaluation queue, incident/escalation records | Every agent requires a named human owner; no agent holds final authority |

## Mandatory artifact ownership

Every controlled artifact must state one **Accountable Office** near its document control metadata. It may name supporting and reviewing offices, but only one office owns lifecycle maintenance. Existing artifacts without the field inherit ownership from this routing table until their next substantive revision.

| Artifact class | Accountable Office | Mandatory reviewers/consumers |
|---|---|---|
| Constitution, Founder directive, final decision record | Founder | Operations; affected offices |
| ADR, architecture diagram, subsystem/repository/API/database/deployment specification | CTO | Engineering, Security/AI/Data specialists as applicable |
| Engineering backlog, sprint, issue, implementation/test evidence | Engineering | CTO, Operations, QA/Security owners |
| Source registry, research package, fact-check record | Research | Treasury Intelligence or Media; Legal/Security as triggered |
| Treasury taxonomy, calculation, dataset methodology, treasury report draft | Treasury Intelligence | Research, Data/API, Editorial/Legal; Founder approval before publication |
| Editorial calendar, newspaper/story package, media/template register | Media | Research, Legal/Privacy, Design; Founder publication approval |
| Community/contributor/launch artifact | Community | Founder, Operations, Security/Legal, Engineering as applicable |
| Risk, dependency, integration, decision, documentation, audit register | Operations | All affected offices |
| Agent charter, prompt/tool permission, eval, memory/audit specification | AI Systems | CTO, Security, Data/Editorial, named human owner |

## Office prefixes and identifiers

New registers and queue items use stable prefixes:

| Office | Prefix | Examples |
|---|---|---|
| Founder | `FND` | `FND-DEC-001`, `FND-APR-001` |
| CTO | `CTO` | `CTO-ADR-0006`, `CTO-ARC-001` |
| Research | `RES` | `RES-PKG-001`, `RES-SRC-001` |
| Engineering | `ENG` | `ENG-ISS-001`, `ENG-TST-001` |
| Treasury Intelligence | `TRI` | `TRI-MET-001`, `TRI-RPT-001` |
| Community | `COM` | `COM-PLN-001`, `COM-LCH-001` |
| Media | `MED` | `MED-EDT-001`, `MED-TPL-001` |
| Operations | `OPS` | `OPS-RSK-001`, `OPS-INT-001` |
| AI Systems | `AIS` | `AIS-AGT-001`, `AIS-EVL-001` |

Existing IDs such as ADR, ENG, RES, MED, LEG, TI, GI, and integration IDs remain valid; do not renumber history. The prefixes govern new records when no established scheme already applies.

## Permanent roadmaps

Each office maintains a roadmap containing: objective, current state, milestones, prioritized backlog, dependencies, effort, tools, accountable owner, success criteria, risks, decisions required, evidence links, next review, and Phase 2 boundary. The Office of Operations maintains the cross-office institutional roadmap and dependency graph.

| Roadmap | Accountable Office | Current anchor |
|---|---|---|
| Institutional roadmap | Operations | M0–M5 and Foundation maturity stages |
| Architecture roadmap | CTO | ADRs, subsystems, interfaces, approval gates |
| Engineering roadmap | Engineering | Engineering Program and GitHub backlog |
| Research roadmap | Research | Source registry and verification queue |
| Treasury Intelligence roadmap | Treasury Intelligence | Treasury methodology/data/API queues |
| Media roadmap | Media | Lunch Time Conversations and Satoshi Langar workflows |
| Community roadmap | Community | Phase 2 programs and contributor-readiness work |
| Integration roadmap | Operations with CTO | Integration verification record |
| AI Systems roadmap | AI Systems | Agent specifications, evals, permission/readiness gates |

## Artifact lifecycle and routing

1. **Intake:** assign office, artifact ID/class, deliverable, priority, dependencies, owner, and success criteria.
2. **Draft:** create only what supports a product, implementation, governance duty, or institutional knowledge deliverable.
3. **Review:** route to mandatory offices; unresolved conflicts remain explicit.
4. **Decision:** record human authority, exact version, scope, conditions, date, and review/expiry.
5. **Implementation/use:** only within the artifact's authority and applicable external gates.
6. **Verification:** bind evidence to exact artifact/version and outcome.
7. **Registration:** map repository path, Drive ID, office, version, and status.
8. **Maintenance:** review after triggers or cadence; supersede without deleting history.
9. **Archive:** preserve audit trail and distinguish governing from historical records.

No office can use routing ownership to bypass Founder, legal, publication, financial, production, security-exception, or other required human authority.

## Public and internal visibility

- Public organization and product branding uses Satnam Satoshi in accordance with ADR-0006.
- SSCOS labels internal governance and engineering artifacts and may be discussed publicly when that context is relevant.
- Internal-only status does not permit secrets, seed phrases, private keys, unnecessary personal data, or unsafe incident evidence in ordinary documents.
- Public release and publishing remain separate human gates; classification must be decided before release.

## Drive routing

The existing Drive root `1vOsG6oilBHObJuXxOLdSDLLaqeqWQZLt` and its 18 top-level folders remain unchanged. Offices use the existing subject folders rather than creating a parallel office hierarchy. Office ownership is metadata; Drive folders remain functional classifications. The Office of Operations maintains the mapping.

## GitHub routing

`Satnam-Satoshi/Satoshi-Langar` remains the only authorized MVP repository. Office ownership is recorded in document metadata, issue fields, CODEOWNERS/review routing when approved, and the repository register. This standard creates no team, permission, branch rule, milestone, project, merge, or deployment authority.

## Initial inherited ownership map

| Existing area | Accountable Office |
|---|---|
| `docs/constitution/`, `docs/approvals/` | Founder |
| `docs/governance/`, registers, daily reports | Operations |
| `docs/architecture/`, `contracts/`, platform/data architecture | CTO |
| `docs/security/`, `docs/testing/`, engineering program/repository specification | Engineering, with CTO oversight |
| `docs/research/` | Research |
| `docs/editorial/`, experience/media specifications | Media |
| Agent specifications/templates | AI Systems |
| Treasury-specific data/methodology/API artifacts | Treasury Intelligence |

Where a record spans classes, the more specific deliverable owner prevails and supporting offices are named. The Office of Operations resolves routing disputes without deciding substantive domain content.

## Success metrics

- 100% of new controlled artifacts name one Accountable Office.
- 100% of active queues map to a permanent roadmap and accountable office.
- Zero orphaned or independently duplicated governing artifacts.
- Every public-facing artifact passes the ADR-0006 naming review before release.
- Every cross-office dependency has a named owner and evidence link.
- Monthly register audit identifies stale, conflicting, unowned, or misclassified records.

## Required human decisions

1. Approve, condition, reject, or return the permanent office model.
2. Name human office leads and backups or approve an expiring Founder-held interim model.
3. Approve classification/publication rules and any future legal-entity implications separately.

## Review record

Review no later than 2026-09-05 and after any office creation/removal, legal structure change, public brand change, or material authority delegation.

| Decision | Approver | Date | Conditions |
|---|---|---|---|
| Pending | Amardeep Baba G Malhotra | Pending | No legal, financial, publishing, launch, production, or employment authority |

