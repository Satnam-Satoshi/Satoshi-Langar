# Dormant CI/source-to-image evidence observation

This loader is deliberately NOT a provenance signer, trusted-worker observation factory or deployment authorization. All provider networking defaults off. Tests use synthetic HTTP; no actual provider resources, credentials or observations were used.

`createBuildProvenanceLoader({reviewedPins,github,cloudRun,clock,networkEnabled:false}).load()` composes three concrete readers rather than accepting caller-authored success flags:

1. Existing fixed-repository GitHub reader observes the exact source commit and retrieves an exact retained Git blob. The blob's Git object SHA-1, raw SHA-256 and canonical bounded JSON must match separately retained review pins. Commit REST JSON is not raw signed commit verification. The evidence blob need not be in the source commit tree; no such membership claim is made.
2. New Actions reader calls only GET `/repos/Satnam-Satoshi/Satoshi-Langar/actions/runs/{runId}/attempts/{runAttempt}` and that attempt's `/jobs?per_page=100&page=1`. It requires exact repository/head repository, source SHA, branch, workflow path, run attempt, job ID/name and unique named build step. Run, job and step must be completed/success, with consistent nonfuture times. Job membership is bound by the attempt-specific endpoint; optional job.run_attempt must match if present. Responses exceeding one complete bounded page hold. No logs, artifact downloads, reruns, dispatches or writes exist.
3. Existing Cloud Run reader observes an exact configured execution with literal immutable image digest and service account. Execution creation must follow the observed CI job completion. This is not proof that this calling process is that execution, nor verification of the entire execution template or associated dispatch operation.

The retained evidence exact schema is `{schemaVersion:1,kind:'retained-ci-build-evidence',repository,sourceCommit,image,branch,runId,runAttempt,jobId,jobName,stepName,workflowPath,jobCompletedAt}`. Keys are sorted canonical JSON without trailing whitespace. No token/private account details belong in this public-repository blob. Reviewed pins bind every field except jobCompletedAt (which must match actual CI observation), plus evidenceBlobSha and evidenceSha256. The pin source must be independently authenticated/approved; this module cannot establish who supplied it. A digest supplied alongside arbitrary evidence is not approval.

Success is `reviewed-build-binding-observed`: CI success and evidence bytes are observed, but sourceImageRelationship remains an independently reviewed assertion correlated with CI and execution. Flags signedProvenanceVerified, sourceProvenanceVerified, imageBytesVerified, runtimeAttestation, reviewPinAuthorityVerified, operationAssociationVerified, fullTemplateVerified and readyForWorker remain FALSE. Successful workflow/step names do not prove the claimed container was produced, has those bytes, or contains that source. No Sigstore/attestation trust or image signature is invented.

A genuine final worker still needs independently validated build provenance/image verification and operation association, trusted review/policy, exact full template/config and runtime identity checks. This module does not silently supply the worker's stronger trusted observeRuntime envelope. Its evidence digest covers exact provider response hashes and observed identities; observations expire 60 seconds from the first read, not from the final response. Source image history can remain historical, but each service observation is a fresh bounded read.

GitHub calls require a configured secret resolver/reference and fixed host, no redirects, positive rate allowance, one MiB streamed response caps and bounded timeouts. Raw responses, environment values and secrets are never returned in summaries. Service authentication remains conditional on independently trusted transport/credential configuration; no forged `authenticated:true` input is used. No credential is created or recovered from a connected-app session.

Official contracts consulted November 17, 2026:
- https://docs.github.com/en/rest/actions/workflow-runs#get-a-workflow-run-attempt
- https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run-attempt
- https://docs.github.com/en/rest/actions/workflow-jobs#get-a-job-for-a-workflow-run

The selected endpoints are documented read-only and use Actions repository read permission for authenticated fine-grained tokens. API version is 2026-03-10. Exact response compatibility remains unverified against real resources. An unsupported path, pagination or missing required observation holds rather than relaxing identity.
