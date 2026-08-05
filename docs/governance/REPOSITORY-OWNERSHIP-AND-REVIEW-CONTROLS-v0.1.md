# SSCOS Repository Ownership and Review Controls

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed Control Specification — No Repository Settings Change Authorized |
| Owner | Platform Lead / Human Founder |
| Related Volume | Engineering Program |
| Related Chapter | GI-03 — Implementation Readiness |
| Dependencies | Governance Metadata Standard v0.1; Repository Specification v0.1; MVP Threat Model v0.1; SSCOS-IMP-001 Charter |
| Approval Status | Pending Amardeep Baba G Malhotra and Named Human Owners |

## Purpose

This specification defines accountable ownership, review separation, CODEOWNERS coverage, and branch controls for `Satnam-Satoshi/Satoshi-Langar`. It does not modify repository settings, create teams, grant permissions, create an implementation branch, merge, or deploy.

## Authority model

- Amardeep Baba G Malhotra is Human Founder, Mission Authority, Account Owner, and final decision maker during the founding phase.
- The CTO coordinates architecture and engineering but cannot self-approve Founder, security-exception, release, treasury, legal, or production decisions.
- AI may draft, inspect, test within explicit authorization, and recommend; AI cannot satisfy a required human review, approve, merge, publish, deploy, grant access, or dismiss a security/legal finding.
- Every protected area has one primary and one backup human owner, or a documented time-bounded Founder-held compensating control.
- Repository administration, code approval, production promotion, and publication approval are distinct capabilities.

## Required role register

| Role | Scope | Cannot also act alone as | Current assignment |
|---|---|---|---|
| Human Founder | Mission, final exceptions, implementation/release decisions | Routine implementer and sole verifier for same material change | Amardeep Baba G Malhotra |
| Repository Account Owner | Organization/repository recovery and administrator governance | Sole change author/reviewer/deployer | Amardeep Baba G Malhotra pending backup |
| CTO / Architecture Owner | ADRs, contracts, module boundaries | Sole author and approver of material architecture change | AI coordinates; human accountable owner required |
| Platform Lead | Workflows, branch rules, build/release evidence | Sole approver and production operator | Unassigned |
| Security Lead | Threat controls, findings, exceptions, access review | Implementer closing own critical/high finding | Unassigned |
| Web Lead | App/modules/design-system implementation | Sole approver of own protected change | Unassigned |
| Data/API Lead | Contracts, schemas, data policies | Sole approver of own migration/access change | Unassigned |
| QA/Accessibility Lead | Acceptance evidence and release-quality assessment | Author waiving own failed release gate | Unassigned |
| Editorial/Legal Owners | Content, rights, privacy, publication policy | Technical deployment operator for same release | Unassigned |
| Release Operator | Executes an approved promotion | Release approver or policy exception owner | Unassigned |

No placeholder counts as an assigned owner. The register must include GitHub username, role, backup, scope, start/review dates, acknowledgment, and least-privilege access level; private contact/recovery data stays outside the public repository.

## Proposed CODEOWNERS policy

The eventual `.github/CODEOWNERS` file must contain real approved GitHub users or teams—not role labels—and cover at least:

| Pattern | Required human review domains |
|---|---|
| `*` | Web/Platform default owner |
| `/docs/constitution/`, `/docs/governance/`, `/docs/approvals/` | Founder + governance owner |
| `/docs/architecture/`, `/contracts/` | Architecture + API/Data |
| `/db/` | Data + Security |
| `/.github/`, workflow/configuration files | Platform + Security |
| `/app/`, `/modules/` | Web plus affected domain owner |
| `/design-system/` | Design/Accessibility + Web |
| `/jobs/`, agent configuration | Data/AI Systems + Security |
| `/tests/` | QA plus affected domain owner |
| Dependency manifests/lockfiles | Platform + Security; Legal when license changes |
| Security policy, auth, secrets, permissions | Security + Platform |
| Editorial/publication/correction logic | Editorial + Legal + affected technical owner |

Overlapping rules must resolve to the strictest applicable reviewer set. A catch-all owner is mandatory; uncovered files block readiness.

## Branch and pull-request controls

For `main` and future release branches:

- prohibit direct pushes, force pushes, deletion, and bypass except an audited break-glass procedure;
- require pull requests, current branch, resolved conversations, required checks, and required CODEOWNERS approvals;
- require at least one independent human approval for ordinary changes and two relevant human approvals for security, workflows, contracts, data policy/migrations, publication controls, governance, or release changes;
- dismiss stale approvals when protected content changes and require approval of the exact final commit;
- prohibit self-approval and count bots/agents as non-human review only;
- restrict merge methods to the approved auditable strategy and bind the resulting commit to evidence;
- restrict branch/ruleset/settings changes to named administrators and audit every change;
- treat merge authority as separate from deployment, publication, and production authority.

The implementation branch proposed by `SSCOS-IMP-001` may be created only after explicit authorization and must inherit applicable review/check rules before any merge request.

## Review routing and minimum evidence

Every pull request states authorization ID, objective, allowed paths, dependencies, risk, tests, data classification, security/privacy/accessibility impact, screenshots/evidence where appropriate, rollback/removal method, prohibited capabilities checked, and required reviewers. Reviewers confirm both correctness and scope compliance; approval is not transferable to later commits.

## Emergency and break-glass control

Break-glass exists only for immediate containment, not feature delivery. It requires a named human, incident ID, exact reason/scope, time limit, least privilege, independent notification, complete audit evidence, credential/access review afterward, and retrospective Founder/Security review. It never authorizes treasury transactions, wallet access, silent publication, evidence deletion, or bypass of legal orders.

## Verification checklist

- [ ] All required roles have named primary/backup humans or an approved expiring compensating control.
- [ ] GitHub usernames/teams are verified and have least privilege.
- [ ] Proposed CODEOWNERS covers every repository path and strict overlaps are tested.
- [ ] Branch/ruleset evidence proves direct push, force push, deletion, stale approval, self-approval, and failed-check merge attempts are denied.
- [ ] Repository administration, review, merge, deployment, and publication authorities are separated.
- [ ] Required checks match the repository, dependency, security, and test specifications.
- [ ] Settings and access changes produce auditable events and undergo quarterly review.
- [ ] Recovery and break-glass procedures are owned and exercised without exposing secrets.

## Success criteria

No material change can be authored, solely approved, merged, deployed, and published by one person or agent; every protected path has accountable human coverage; the exact reviewed commit is identifiable; and emergency access is narrow, temporary, and audited.

## Required human decisions

1. Assign primary and backup humans for every role and provide verified GitHub usernames privately where appropriate.
2. Approve minimum approval counts, protected patterns, merge strategy, and break-glass authority.
3. Authorize repository settings/team/CODEOWNERS changes separately.
4. Verify the configured controls before `SSCOS-IMP-001` begins.

