# GitHub Project and Milestone Specification

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Ready for GitHub Configuration |
| Owner | CTO |
| Related Volume | Engineering Program |
| Related Chapter | Program Control |
| Dependencies | Engineering Program v0.1 |
| Approval Status | Pending Human Founder Approval |

## Milestones to create

1. `M0 — Program Approval`
2. `M1 — Architecture Ready`
3. `M2 — Experience Ready`
4. `M3 — Data Foundation Ready`
5. `M4 — MVP Build Complete`
6. `M5 — Release Candidate`
7. `Phase 2 — Deferred`

Descriptions and exit criteria are authoritative in `ENGINEERING-PROGRAM-v0.1.md`. Due dates should be set only after Founder approval and staffing confirmation.

## Project to create

Name: `SSCOS Public MVP`. Repository: `Satnam-Satoshi/Satoshi-Langar`. Views: Backlog (table), Current Sprint (board), Roadmap (timeline), Release Gate (table filtered to M5/P0). Fields: Priority, Product Surface, Workstream, Sprint, Milestone, Effort Days, Owner, Status, Dependency IDs, Risk, Success Criteria.

## Automation rules

New issues enter Intake; assignment to a sprint requires Ready status and completed dependencies; merged pull requests may mark implementation tasks Done but cannot mark release gates Done; blocked items require a reason and blocking issue; Phase 2 items never appear in Current Sprint before a Founder-approved scope decision.

## Success criteria

Every engineering issue has priority, dependencies, effort, tools, owner, milestone, and success criteria; all P0 work maps to M0–M5; the four product surfaces can be filtered independently; Phase 2 is visibly separated; and release approval cannot be inferred from issue closure.
