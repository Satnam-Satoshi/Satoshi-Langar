# SSCOS MVP Agent Specifications

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Working Draft |
| Owner | AI Systems Lead |
| Related Volume | Engineering Program |
| Related Chapter | Agent Architecture |
| Dependencies | Agent Charter Template; Database and API Design; Security Model |
| Approval Status | Pending Human Founder Approval |

## MVP topology

Only three non-transactional agent roles are planned. They operate asynchronously, cannot publish independently, and have no wallet, payment, deployment, production-administration, or credential-management authority.

| Agent | Mission | Permissions | Human owner | Emergency stop |
|---|---|---|---|---|
| Source Collection Agent | Retrieve allowlisted public material according to terms and cadence | Read allowlisted endpoints; append quarantinable fetch records | Data Lead | Disable scheduler and revoke source credential set |
| Normalization Agent | Convert fetched material into typed candidate observations | Read fetch records; write candidate observations only | Data Lead | Disable worker; quarantine current run |
| Verification Assistant | Test freshness, duplication, arithmetic, provenance, and policy rules; recommend status | Read candidates and sources; write review findings; never approve or publish | Editorial Lead | Disable worker; preserve audit and send queue to human review |

## Shared controls

Knowledge sources come only from the versioned source registry and approved SSCOS policy. Permissions deny by default and are separated by service identity. Memory is run-scoped; durable memory is limited to governed fetch, observation, finding, and audit records. Prompts, models, parsers, tools, and policy versions are logged. Conflicts, low confidence, schema drift, stale data, sensitive information, source restrictions, or unexpected tool requests escalate to the named human owner.

## Publication gate

Agents may prepare material, but a named human editor approves publication revisions. A Founder-approved future delegation may adjust routine editorial gates, but no agent may approve constitutional, release, security-exception, treasury, or emergency-restart decisions.

## Success criteria

At least 95% provenance-field completeness in test fixtures; zero unauthorized external domains; deterministic replay for fixed inputs; all low-confidence/conflicting items quarantined; emergency stop verified; audit records link every output to the run, agent version, sources, and human disposition; and no autonomous publication occurs.
