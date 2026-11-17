# Dormant Vercel preview request adapter, promotion held

`createVercelRelease({fetch,resolveSecret,secretReference,projectId,projectName,teamId,branch,sourceCommit,manifestSha256,journal,loadApproval,loadSourceAdmission,clock,networkEnabled:false,previewEnabled:false})` exposes `advancePreview()`, `promotionPlan()` and a permanently held `promote()` in this phase. The repository and numeric repository ID are fixed to the canonical existing source repository. Project/team/branch/source/artifact identity is fixed once at independent construction, never supplied by per-call arbitrary payload.

Enabled preview creation needs independently loaded exact identity-bound approval and fresh source admission, plus an already initialized canonical durable journal. Approval action is create-preview, with reference, identity, notBefore/expiresAt. Source admission has eligible-for-preview-review status, same identity, checkedAt/expiresAt and reviewDigest. These callbacks must load actual reviewed admission/approval, not fabricate assertions; this adapter does not replace the tree/data validator or authenticate a callback by itself.

The request is exactly POST https://api.vercel.com/v13/deployments?teamId=<configured team>, body `{name,project,gitSource:{type:'github',ref,repoId:1181242402,sha}}`. Target is deliberately omitted, the documented preview default, not production or staging aliases. No files/settings/environment/bypass/Git credential/withLatestCommit fields are permitted. A durable attempting record is CAS-written/readback before the one POST; a response ID is then durably recorded before actual createVercelReadOnly source/project/team/branch/repository/preview-target reconciliation. READY is not artifact QA or publication.

Unknown response/timeout/durable write uncertainty never retries create, including after restart. Known deployment ID resumes read-only observation without journal writes. Missing canonical journal state does not become empty history. CAS/authenticity/initialization/migration remain external; a new in-memory fake store would defeat persistence and is not production wiring. Requests use fixed endpoints, bounded response bytes, manual redirects and total timeout. An aborted POST may have taken effect. Read-only reconciliation has its own bounded timeout and can complete after an outer timeout; no late POST occurs after timed-out secret/admission work.

## Production boundary

`promote()` always returns production_gate_not_composed and makes no call, even if caller passes approved:true. `promotionPlan()` is only a checklist and scope, never permission. Independently verified official OpenAPI documents POST `/v10/projects/{projectId}/promote/{deploymentId}`, no request body,201/202 acknowledgment. This request is **not executed here** pending composition of independently obtained exact candidate/source/artifact-manifest QA, fresh source-policy deadline, both-domain expected live baseline, concrete owner approval and durable promotion intent. Public route/PDF/media readback must follow any future promotion; provider acknowledgment alone cannot establish publication.

Future expected-live checks are cooperative: another writer can change aliases between observation and promote, and provider builder/environment/configuration can change outside the Git commit. No hard provider fence, exclusive writer, production guard bypass or immutable environment is claimed. Existing production safeguards/configuration remain untouched.

Official contracts read November17,2026:
- https://openapi.vercel.sh (createDeployment GitHub variant and requestPromote actual schemas)
- https://vercel.com/docs/rest-api/deployments/create-a-new-deployment
- https://vercel.com/docs/rest-api

Ten synthetic tests use injected HTTP plus the actual readonly adapter, no tokens/provider operations. Run `node --test tools/standalone-runtime/test/vercel-release.test.mjs`. Live API compatibility, concrete journal/approval/admission wiring and production QA composition remain pending. No schedule/main activation or deploy was performed.
