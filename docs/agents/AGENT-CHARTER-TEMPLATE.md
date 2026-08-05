# SSCOS Agent Charter: Agent Name

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | YYYY-MM-DD |
| Status | Working Draft |
| Owner | Named human owner and role |
| Related Volume | Volume name/number |
| Related Chapter | Chapter/section |
| Dependencies | Governing subsystem charter, ADRs, knowledge sources, or None |
| Approval Status | Pending Human Founder Approval |

## Mission

State the single bounded purpose of the agent and the people or process it serves.

## Responsibilities

- Authorized responsibility.
- Explicit non-responsibility or prohibited action.

## Knowledge sources

| Source | Authority | Access method | Freshness | Allowed use | Prohibited use |
|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD |

State how conflicts, stale information, unsupported claims, and source corrections are handled.

## Permissions

| Resource | Read | Write | Execute/Publish | Limits | Granting authority |
|---|---|---|---|---|---|
| TBD | No | No | No | Deny by default | Human Founder or delegated owner |

Permissions are least-privileged, time-bounded where feasible, reviewable, and revocable. The agent may not expand or delegate its own authority.

## Escalation rules

Escalate to the human owner when authorization is absent or ambiguous; sources conflict; confidence is below threshold; privacy, security, legal, financial, custody, or reputational impact may be material; a requested action is irreversible; or an emergency-stop condition is met.

## Memory

Define permitted working memory and durable memory, prohibited content, provenance, retention period, correction method, access controls, and deletion process. Default to no durable personal or sensitive memory unless explicitly approved.

## Audit trail

Record identity/version, task and initiating authority, time, inputs and source identifiers, material reasoning or decision references, tools and permissions used, outputs, approvals, exceptions, errors, and emergency actions. Define retention and reviewer access.

## Human owner

Name one accountable human owner and a backup. The owner reviews permissions, escalations, incidents, performance, knowledge sources, and retirement. Amardeep Baba G Malhotra remains final approver during the founding phase.

## Emergency stop

Define who may stop the agent, how execution and credentials are disabled, how in-flight actions are contained, how evidence is preserved, notification requirements, safe-state criteria, and the explicit human approval required to restart.

## Operating boundaries

List allowed actions, prohibited actions, rate or spending limits, data classifications, external communications limits, and required human approval gates. Transaction, custody, publishing, production, and treasury permissions default to denied.

## Evaluation and success metrics

| Metric | Definition | Target | Test method | Review frequency |
|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD |

Include accuracy, provenance completeness, escalation quality, safety violations, privacy incidents, availability, human override success, and mission outcome where relevant.

## Lifecycle and approval

Define pre-deployment evaluation, sandbox limitations, monitoring, review cadence, version changes, suspension, retirement, memory disposition, and future review date.

| Decision | Approver | Date | Conditions |
|---|---|---|---|
| Pending | Amardeep Baba G Malhotra | Pending | No deployment or production authority |
