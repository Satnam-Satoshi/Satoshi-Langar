# Single-invocation receipt bootstrap: NOT INSTALLED

A local fixed CLI, Google transport, authenticated GitHub pin reader, bounded pin
discovery and tests now exist. No workflow has been installed, no pin/configuration
has been provisioned remotely, and no live Google call has been made. The template
in `ops/receipt-bootstrap-workflow.yml` contains deliberately invalid placeholders.

## Current bounded mode

The implemented path is named `bounded-single-invocation` and explicitly returns
`exactlyOnceGuaranteed:false`. It does not claim a durable consumption lock.

1. Review the exact source/action pins, source-manifest hashes, workflow, private
   target, and one-create scope. Keep publication paused. Required authorization
   for installation, dispatch, pin publication and private configuration is separate
   from local development; security-setting changes require their own approval.
2. A single non-matrix cloud job checks attempt 1, checks out the reviewed source
   with no persisted credentials, and verifies its source/manifest. Setup receives
   only read-only GitHub access and non-credential private target configuration.
3. Setup polls the fixed main reference and fixed admission filename for at most
   five minutes/30 polls. An external authorized publisher supplies the exact-run
   pin after checking that run's identity. Missing/valid old-run pins wait; invalid
   same-run pins, provider errors and deadline exhaustion stop without Google access.
4. The pin is read at the discovered immutable commit, with exact byte/blob hashes.
   The private mode-0600 runner snapshot binds its commit, source/workflow hashes,
   manifest, body hash and bootstrap key. Public pin data contains no private IDs.
5. The sole Google-secret-bearing step verifies source bytes again and reads the
   immutable pin, current run and exact attempt-1 job through authenticated GitHub
   GETs. It then obtains the explicitly bounded admission capability. A synchronous
   final check after OAuth waits protects the single fixed files.create POST.
6. Creation has no retry. A private result file is retained locally; failure to
   retain or verify an outcome stops as uncertain. Reruns and other run IDs are
   rejected. Ambiguous creation never grants permission to dispatch another run.

This depends on reviewed single-entrypoint workflow execution and trusted
repository writers/external pin publication. Same-run duplication, compromised
writers, mutable authorization configuration and external provider behavior are
not converted into a formal exactly-once guarantee. The in-process latch is not
persistent. No new storage system or second guard file is assumed.

## Cloud job and credential isolation

Use the existing `ltc-production` environment for its scoped credentials and the
existing `ltc-production-publication` concurrency group, cancel-in-progress false.
The observed environment has no required reviewers, allows admin bypass and has a
one-minute timer. That timer is NOT owner approval. The bounded code-pin wait is a
separate procedure; this draft does not claim an environment approval gate exists.
Concurrency covers cooperating workflows, not every possible external writer.

Use a standard GitHub-hosted runner, pinned checkout and reviewed source, built-in
Node only, credential-free verification, and exactly one creation step receiving
only the three existing publisher Google credentials. GitHub permissions are
Contents read and Actions read. No Google credentials in setup; no Vercel, Git
write, OIDC, ledger, social or deploy credentials; no dependency installation.

Conceptual YAML remains incomplete and NOT runnable:

```yaml
on: workflow_dispatch
permissions:
  contents: read
  actions: read
concurrency:
  group: ltc-production-publication
  cancel-in-progress: false
jobs:
  create-private-receipt-once:
    environment: ltc-production
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@REVIEWED_IMMUTABLE_ACTION_SHA_NOT_SET
        with:
          ref: REVIEWED_IMMUTABLE_SOURCE_SHA_NOT_SET
          persist-credentials: false
      - name: Verify source and wait for exact-run pin
        run: REVIEWED_SETUP_NOT_INSTALLED
      - name: Create private receipt once
        env:
          LTC_GOOGLE_CLIENT_ID: EXISTING_PROTECTED_SECRET_REFERENCE_NOT_SET
          LTC_GOOGLE_CLIENT_SECRET: EXISTING_PROTECTED_SECRET_REFERENCE_NOT_SET
          LTC_GOOGLE_REFRESH_TOKEN: EXISTING_PROTECTED_SECRET_REFERENCE_NOT_SET
        run: REVIEWED_FIXED_BOOTSTRAP_ENTRYPOINT_NOT_INSTALLED
```

The actual template adds fail-closed placeholder checks. Workflow commit and source
commit are distinct: runtime `github.workflow_sha` is compared with authenticated
run metadata and the externally approved pin, not embedded as an impossible literal
self-hash. Verified checkout HEAD and manifest bind the separately reviewed source.
A runtime environment string by itself is not authorization.

## Original stronger mode: optional and deferred

`createReceiptBootstrap` retains the original `reserveOnce/assertReserved` contract
for callers that possess a real durable atomic singleton claim. That backend has
not been implemented or established. The new bounded API does not spoof this
capability or silently satisfy it with a boolean, GitHub run ID or repository file.
If formal cross-process consumption is later required, that stronger backend needs
separate review. It is not a prerequisite invented for the current explicitly
bounded operational model.

## Remaining deployment prerequisites

Freeze and independently review the complete candidate; replace placeholders with
exact reviewed action/source/setup/manifest/body hashes; verify the existing private
target and publisher client identity without exposing them publicly; install only
the approved one-off workflow; dispatch and independently approve/publish its exact
run pin under the stated repository-writer trust model. Verify current permission
and environment scope rather than assuming configuration exists. None of these
remote actions is completed by this local code or its tests. Publication recovery,
ledger retirement and writer exclusion remain separate tasks and are not authorized
or established by receipt provisioning.
