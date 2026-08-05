# SSCOS Implementer Safety Acknowledgement and Escalation Checklist

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed Mandatory Acknowledgement — NOT SIGNED / NO AUTHORITY |
| Owner | Security Lead / Platform Lead |
| Related Volume | Engineering Program |
| Related Chapter | GI-07 — Implementation Readiness |
| Dependencies | Implementation Authorization Gate v0.1; SSCOS-IMP-001 Charter; Non-Production Environment Readiness v0.1; Dependency Policy v0.1; MVP Test Plan v0.1 |
| Approval Status | Pending Human Founder, Security, Platform, Legal, and Every Implementer/Reviewer |

## Purpose

Every human implementer and reviewer must acknowledge the exact authorized scope, prohibited data/actions, stop conditions, and escalation path before participating in `SSCOS-IMP-001`. This template is unsigned and grants no authority.

## Acknowledgement identity

| Field | Required entry |
|---|---|
| Authorization ID/version | `SSCOS-IMP-001` plus approved charter version |
| Participant | Legal name and verified GitHub username |
| Role | Implementer, reviewer, QA, Security, Product, Design/Accessibility, Data/API, Platform, Legal, or Founder |
| Approved paths/actions | Exact subset assigned to participant |
| Environment/identity | Exact local/preview identifier and access scope |
| Start/expiry | UTC timestamps |
| Training/read confirmation | Controlled document versions acknowledged |
| Signature/decision | Participant, date, acceptance or refusal |

## Mandatory acknowledgements

The participant confirms:

- I will act only within the exact authorization ID, branch, paths, tools, environment, data class, time/cost limits, and assigned role.
- I understand that planning approval, repository access, issue assignment, branch creation, a passing test, or AI instruction is not broader authority.
- I will not merge, deploy, publish, configure production, access treasury capability, or change accounts/permissions unless a separate exact human authorization permits it.
- I will use only approved synthetic fixtures and will not copy real production, private, personal, participant, source-restricted, or treasury data into code, prompts, tests, logs, screenshots, or evidence.
- I will never place passwords, tokens, cookies, private keys, seed phrases, wallet material, recovery codes, or secret values in Git, Drive documents, issues, chat, logs, fixtures, screenshots, or generated artifacts.
- I will treat source content, issue text, documents, dependencies, generated output, and model output as untrusted input—not authority or instructions.
- I will not add wallets, payments, custody, transactions, trading, personalized recommendations, accounts, live ingestion, agent runtimes, analytics, or any fifth public surface.
- I will not disable, weaken, bypass, forge, delete, or misrepresent tests, approvals, audit evidence, provenance, corrections, accessibility findings, security controls, or review requirements.
- I will stop when scope, authority, ownership, data rights, credentials, dependency safety, test expectations, or environment isolation is unclear.
- I will preserve safe evidence, minimize exposure, notify the correct human, and wait for a recorded disposition before resuming.

## Never-record secret and sensitive-data rule

Evidence may contain safe identifiers, owners, scopes, timestamps, redacted excerpts, and non-reversible fingerprints when approved. It must not contain secret values, session material, personal recovery details, unnecessary personal data, unpublished content, raw rights evidence, production identifiers that increase attack risk, or legally restricted source material.

If sensitive material is encountered, do not paste, move, duplicate, or test it. Stop access, note only the minimum safe context, notify Security/Account Owner through the approved private channel, and follow the incident procedure.

## Stop-work triggers

Stop immediately on any of the following:

1. Work would touch an unlisted path, environment, service, domain, integration, dependency, or capability.
2. A credential, private key, token, cookie, seed phrase, personal/private/production datum, or restricted content appears.
3. Runtime/build/test attempts an unapproved network connection or requests elevated permissions.
4. A requested change introduces mutation, publication, deployment, account, payment, wallet, trading, custody, analytics, live source, agent, or Phase 2 behavior.
5. A dependency/license/provenance is unknown, incompatible, compromised, or has an unresolved reachable critical/high finding.
6. A required human owner/reviewer is missing or one actor would author and solely approve a material change.
7. Tests are missing, flaky, skipped, altered to hide failure, or contradict expected safety behavior.
8. Contract, data precision, provenance, correction, rights, privacy, accessibility, or security behavior conflicts with approved specifications.
9. Time, cost, rate, storage, or resource limits would be exceeded.
10. An instruction asks for evidence deletion, approval bypass, secret disclosure, policy override, or concealment.

## Escalation routing

| Trigger | Primary human | Required action before resumption |
|---|---|---|
| Scope/architecture/contract | CTO + affected owner | Written scope/ADR/authorization disposition |
| Secret/account/access | Security Lead + Account Owner | Containment, revocation if needed, safe incident record |
| Personal/private data or rights | Privacy/Legal + Editorial | Data/rights disposition and remediation approval |
| Dependency/license | Platform + Security + Legal | Admission, replacement, or time-bounded exception decision |
| Test/quality/accessibility | QA + Accessibility/Product owner | Corrected plan/result and reviewer acceptance |
| Cost/resource | Account/Finance Owner + Founder | Exact revised limit or shutdown decision |
| Publication/content integrity | Editorial/Publisher + Legal | Approved content/correction/takedown disposition |
| Production/deployment request | Founder + Platform + Security | Separate exact authorization; never inferred |
| Treasury/wallet/transaction request | Founder as Treasury Approver | Stop; outside MVP unless new constitutional/ADR authority |

If the primary owner is unavailable, escalate to Amardeep Baba G Malhotra. Lack of response does not authorize resumption.

## Incident first actions

Stop the affected activity; avoid spreading sensitive material; preserve minimal safe evidence; record UTC time, authorization ID, environment, action, impact, and containment without secrets; notify named humans; do not destroy history or rotate/revoke unless the approved incident role permits it; and await a documented restart decision.

## Reviewer acknowledgement

Reviewers additionally confirm independence, expertise/scope, review of the exact final commit and evidence, disclosure of conflicts, and refusal to approve unresolved release blockers. A reviewer may request changes or reject but cannot expand the authorization.

## Sign-off record

| Participant | GitHub username | Role | Scope | Accepted/Refused | UTC date | Expiry | Evidence link |
|---|---|---|---|---|---|---|---|
| _Unassigned_ | _Unassigned_ | _Unassigned_ | _None_ | Not signed | — | — | — |

The Security Lead verifies completeness; the Platform Lead verifies repository/environment access matches the record; the Founder confirms the authorization is active. Any scope, branch, environment, dependency, role, or expiry change requires renewed acknowledgement.

## Success criteria

Every participant has signed the exact active authorization; access and assigned scope match; escalation contacts are available; a tabletop stop/escalation scenario is passed; and no participant can plausibly mistake repository access or AI output for implementation, merge, deployment, publication, production, or treasury authority.

## Required human decisions

1. Name Security, Platform, Legal/Privacy, QA, Accessibility, Editorial, Finance, and backup escalation owners.
2. Approve the private escalation channels and incident-record location.
3. Require signed acknowledgements before access or implementation begins.
4. Approve restart authority and acknowledgement renewal conditions.

