# SSCOS Repository Register

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Working Draft |
| Owner | Amardeep Baba G Malhotra, Human Founder |
| Related Volume | Institution-wide |
| Related Chapter | Volume I, Chapter 5 — System of Record and Document Hierarchy |
| Dependencies | SSCOS Constitutional Baseline v0.2; SSCOS Governance Metadata Standard v0.1 |
| Approval Status | Pending Human Founder Approval |

## Purpose

This register identifies authorized repositories, their scope, owners, approval boundaries, and relationship to the SSCOS institutional system of record. Entry in this register does not authorize production implementation.

## Registered repositories

| Repository | Platform | Institutional purpose | Human owner | Current authority | Production status | Canonical Drive relationship |
|---|---|---|---|---|---|---|
| `Satnam-Satoshi/Satoshi-Langar` | GitHub | Satoshi Langar product documentation and the proposed SSCOS institutional documentation baseline | Amardeep Baba G Malhotra | Documentation work on review branches; changes require Founder approval before becoming governing | Production implementation not authorized by this register | Root `1vOsG6oilBHObJuXxOLdSDLLaqeqWQZLt`; repository folder `10_Satoshi_Langar` (`1bn_vVSA_zy7zP9iAjz0tG7NAnuNFvthC`) |

## Repository controls

- The approved SSCOS Constitution is superior to repository documentation.
- Constitutional and governance changes use dedicated documentation branches and review before merge.
- Repository merge, deployment, publication, ownership transfer, secret creation, or production-code changes require explicit human authorization appropriate to the action.
- Credentials, private keys, seed phrases, personal data, and production secrets shall not be committed.
- Material architecture changes require an ADR; subsystems and agents require approved charters.
- Existing `docs/AGENT-ARCHITECTURE.md` and `docs/REPORT-SPEC.md` remain subordinate reference documents pending formal chartering and approval review.
- Archived or superseded documents remain traceable and shall not be silently deleted.

## Branch record

| Branch | Purpose | Created | Status | Merge authority |
|---|---|---|---|---|
| `agent/sscos-institutional-baseline-v0-2` | Proposed constitutional baseline, governance standard, templates, register, and README alignment | 2026-08-05 | Documentation review branch | Amardeep Baba G Malhotra; merge not authorized by this draft |

## Drive register

| Drive folder | ID | Role | Preservation rule |
|---|---|---|---|
| SSCOS root | `1vOsG6oilBHObJuXxOLdSDLLaqeqWQZLt` | Institutional library root | Preserve root identity and all top-level folders |
| `01_Constitution_and_Blueprint` | `1yl4eSSyLcBvvMnLsLG_a1iHRIwpXzt_f` | Constitutional baselines | No conflicting constitutions |
| `02_Governance` | `1h_OfelvOqEiIpYLQUkP7D5w5CxNJ33RQ` | Governance standards and ADR material | Version and approval metadata required |
| `03_Architecture` | `1dOnmFIH9L2Umknmib1xbkTC_DNciWFHx` | Architecture charters | Architecture approval precedes implementation |
| `10_Satoshi_Langar` | `1bn_vVSA_zy7zP9iAjz0tG7NAnuNFvthC` | Repository-facing records | Map Drive records to GitHub paths and revisions |
| `14_Agent_Sangat` | `1qnm2rDJYbT5PMBL-U4ypajbGVyDpDYes` | Agent charters and governance | Every agent requires a human owner and emergency stop |
| `16_Registers` | `167u1eQdT-Fk_8slvzLXwUnohqV465H39` | Institutional registers | Registers remain current and auditable |

## Review record

Review this register after any repository creation, rename, transfer, archive, change of owner, material scope change, or production authorization, and no later than 2026-09-05.

| Decision | Approver | Date | Conditions |
|---|---|---|---|
| Pending | Amardeep Baba G Malhotra | Pending | No merge, deployment, publication, transfer, or production authorization |
