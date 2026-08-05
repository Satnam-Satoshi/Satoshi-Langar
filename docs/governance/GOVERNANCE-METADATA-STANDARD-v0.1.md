# SSCOS Governance Metadata Standard

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Working Draft |
| Owner | Amardeep Baba G Malhotra, Human Founder |
| Related Volume | Volume I — Constitution, Mission & Foundational Doctrine |
| Related Chapter | Chapter 6 — Mandatory Governance Controls |
| Dependencies | SSCOS Blueprint v0.1; SSCOS Constitutional Baseline v0.2 |
| Approval Status | Pending Human Founder Approval |

## Purpose

This standard defines the minimum metadata and lifecycle controls for every controlled SSCOS document. It prevents ambiguous authority, duplicated architectures, untraceable revisions, and accidental implementation from unapproved drafts.

## Required metadata

Every controlled document shall state, near its beginning:

| Field | Rule |
|---|---|
| Version Number | Semantic institutional version, beginning at `0.1` for drafts. |
| Revision Date | ISO date `YYYY-MM-DD` for the current revision. |
| Status | One controlled status from the list below. |
| Owner | One accountable human role and name; the Human Founder remains final approver during the founding phase. |
| Related Volume | Governing SSCOS volume or `Institution-wide`. |
| Related Chapter | Governing chapter, section, or `Not yet assigned`. |
| Dependencies | Upstream documents, decisions, systems, or `None`. |
| Approval Status | Pending, Approved, Approved with Conditions, Rejected, or Superseded, with approver and date when decided. |

Recommended fields are Document ID, Review Date, Classification, Repository Path, Drive File ID, Supersedes, and Superseded By.

## Controlled statuses

- **Working Draft:** under development; carries no implementation authority.
- **In Review:** stable enough for formal review; carries no implementation authority.
- **Approved:** authorized within its stated scope and conditions.
- **Approved with Conditions:** authorized only when listed conditions are satisfied.
- **Superseded:** retained for history; no longer governing.
- **Retired:** intentionally withdrawn without a successor.
- **Archived Record:** immutable evidence or historical record.

## Versioning rules

- Drafts begin at `0.1` and advance minor versions for substantive review cycles.
- Founder-approved constitutional or institutional baselines advance to `1.0` unless the approval record explicitly specifies another number.
- Backward-compatible clarifications increment the minor version.
- Changes to authority, mission, scope, rights, controls, or compatibility increment the major version.
- Approved text is never silently overwritten. A new revision preserves the prior version and identifies what it supersedes.

## Approval rules

Approval must identify the approver, date, decision, scope, conditions, and effective version. Silence, repository merge, Drive upload, or software deployment does not constitute institutional approval. During the founding phase, Amardeep Baba G Malhotra is the final approver.

## Change control

Each substantive revision shall include a concise change summary and list affected dependencies. Material architecture changes require an ADR. A document with an unresolved conflict shall remain a draft and link to the conflict record.

## Storage and identity

Controlled copies may exist in GitHub and Google Drive for different operational purposes. The repository register and Drive identifiers shall map those copies. Authority derives from document metadata and approval records, not location. Duplicate documents with independent numbering or conflicting content are prohibited.

## Review cadence

Every approved standard or charter shall specify a future review date. Owners shall also initiate review after a material incident, dependency change, legal requirement, security finding, mission change, or constitutional amendment.

## Compliance checklist

- [ ] All eight required fields are present.
- [ ] Status and approval status are not contradictory.
- [ ] Owner is a named accountable human.
- [ ] Dependencies and supersession are traceable.
- [ ] Material decisions have ADRs.
- [ ] Future review is scheduled.
- [ ] GitHub and Drive copies are mapped in the repository register.
