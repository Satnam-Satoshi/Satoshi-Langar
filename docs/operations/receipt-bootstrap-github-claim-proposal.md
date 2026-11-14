# Concrete existing-GitHub claim proposal (local only)

## Recommended immediate mode: bounded one-time protected invocation

Use an externally approved exact GitHub run ID, attempt1 and reviewed code hashes,
one non-matrix job, one creation step/process, and zero retries. The external
controller records the pin durably in the already available reviewed GitHub
commit/protected configuration; job verifies it before Google access. This is a
practical operator-controlled one-time procedure, NOT formal exactly-once or a
transactional consumed marker. No new database or custom service is categorically
required. After any job start/unknown result, do not approve another invocation;
read-only reconciliation and fresh explicit authorization are required. No
automatic rerun, replacement run, new bootstrap key or implicit retry.

Exact wiring scope: add an authenticated pin/run reader, exact main/source/hash
checks, attempt1-only admission and one local invocation latch; connect the tested
fixed Google transport in the protected single creation step; retain safe outcome
and pin evidence in existing GitHub run history. Use existing Google credentials
only. Verify live environment protections and existing pin storage before claiming
this is usable. No workflow or pin has been installed in this work.

The stronger `reserveOnce` interface remains unimplemented. The local bounded
implementation uses its separate explicit oneInvocationAdmission API instead.
It promises stronger durable atomic singleton admission than this simpler mode
provides. Do not make a callback return true to pretend that promise is fulfilled.
The separate local one-invocation interface/contract must be reviewed with its
non-durable-consumption limitation before installation. If formal atomic admission is retained as a requirement, use the
optional protected-ref proposal below, subject to its own API limitations.

## Optional stronger retained claim using existing GitHub

A fixed singleton protected tag can point to an immutable commit containing a
public-safe admission record. The external GitHub connection creates the claim;
the Google job receives GitHub read only. No second Drive file or new token.
This alternative is NOT a created claim or tested provider guarantee. It adds
ruleset setup only if the owner selects stronger retained admission semantics.

## What official docs establish, and what they do not

GitHub documents POST git/refs creation with ref+SHA, 201 success and 409/422
failure categories; GET git/ref retrieves one exact ref. It also exposes separate
update/delete operations. The API page does NOT state a formal linearizability or
exactly-once guarantee, and 422 is broader than “already exists.” Do not infer a
reservation from 409/422, a prefix-match query or an absent GET after timeout.
[GitHub reference API](https://docs.github.com/en/rest/git/refs)

The contents API combines create/update, requires the old blob SHA for update,
and reports 201 for creation. It warns about conflicting concurrent writes.
Omitting SHA can express a create request, but does not make the containing branch
immutable or supply a documented distributed-lock contract. Prefer the fixed-ref
approach because the target commit hash binds the full admission bytes.
[GitHub contents API](https://docs.github.com/en/rest/repos/contents)

Rulesets can restrict tag updates and deletion; bypass actors remain privileged.
Therefore preserve the claim with a matching active ruleset with no bypass actor
for updates/deletion. Allow its one initial creation. Administrators who can edit
the ruleset remain trusted; this is not tamperproof against repository owners.
[GitHub ruleset rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

## Optional protected-ref protocol

1. Verify the repository's actual rulesets, bypass list and token visibility.
   If protections absent, request approval to restrict updates/deletion for ONLY
   the chosen singleton tag, with no bypass. Do not enable/modify these locally.
2. Install the separately reviewed paused bootstrap workflow. Dispatch one run
   which waits at the protected environment. Read its authoritative run ID and
   attempt=1; ensure no credential-bearing step has started.
3. Prepare one commit containing only `bootstrap-admission.json` (public-safe):
   incident key, exact repository/run ID/attempt1/job, workflow commit, executed
   source commit, code manifest digest, bootstrap body digest/marker digest,
   authorization scope, pin timestamp/expiry, and `claimReusable:false`. No folder
   IDs, owner IDs, credentials, receipt IDs or other private configuration. Record
   a SHA256 digest of canonical JSON separately as well as the Git object SHA.
   Persist/review the candidate commit SHA BEFORE claim creation. Unreferenced
   candidate objects do not grant authority and never trigger Google activity.
4. External GitHub controller sends exactly ONE POST to create a fixed tag such as
   `refs/tags/ltc-recovery-receipt-bootstrap-20261114` at that exact commit. No PATCH,
   delete, force update or repeated POST. Verify 201 body exact ref/type/SHA and
   independently read exact ref plus commit/tree/blob bytes. Existing ref to ANY
   commit stops automatic claiming, even if superficially identical.
5. On lost acknowledgment, do not dispatch/approve another run or retry creation.
   Independent exact readback may locate the pre-recorded commit; promotion from
   UNKNOWN to accepted claim requires reviewed reconciliation before the still-
   waiting original job proceeds. Absent or changed ref stays UNKNOWN/blocked.
6. The protected job reads the exact reference and immutable commit, checks all
   bindings and protections via trusted provider observations, then validates the
   actual run attempt/job and executed-source integrity. Approve only original
   attempt1. Call one fixed native Docs creation transport once, with final guards.
   One job/process/step, no matrix/retries/reusable dispatch or resume. GitHub job
   rerun attempt>1 is denied. Keep the claim forever even if Google was not called,
   failed or returned an unknown result. Pin expiry never frees the claim.

The durable marker stores admission to ONE invocation, not proof the Google POST
occurred. Exactly-once external effects are not claimed. A crash may leave zero
or one create; ambiguity halts. All restarts/reruns and new claims are denied.
The single reviewed program's consumed latch plus attempt1 restriction matters:
repeated entrypoint execution inside that job must be structurally impossible.
GitHub concurrency alone is not a consumed marker, and a JSON `reserved:true` is
not authentication. Ruleset/commit readback has to be supplied by trusted code.

## Optional protected-ref implementation scope / prerequisites

- External claim controller: fixed GitHub target/ref, one creation, strict exact
  status/readback, canonical blob validation, no write-retry path. Existing GitHub
  connection must support needed Git objects/ref operations without new grants.
- Job read-only claim adapter: authenticated exact-ref and object reads, provider
  run metadata, source/code integrity, active ruleset/no-bypass verification, local
  once latch bound to attempt1 and one entrypoint; produces scoped reservation
  capability only after all checks.
- Protected workflow/environment approval and tag retention controls are required
  setup, not present merely because GitHub is connected. These are concrete owner
  approval points; no Google scope expansion or new external service is needed.
- Before any live use, independent protocol review plus mock interleaving, 409/422,
  malformed response, lost acknowledgment, wrong ref/commit/run and rerun tests.
  Mock tests cannot establish GitHub server atomicity. If the safety requirement
  demands a formally documented linearizable CAS primitive, these API docs do not
  prove it and this proposal must not be presented as satisfying that requirement.

No live GitHub objects/references/rulesets, workflow installation, dispatch,
Google authorization or writes were performed for this proposal.

## Minimal code-enforced waiting alternative (no shared reviewer-setting change)

An initial credential-free setup step can wait boundedly for an external pin,
using a hardcoded repository/main/fixed path, no caller-selected ref or URL. Each
poll reads main's exact commit SHA, then reads the pin path at THAT immutable SHA.
Reject any pin not matching the already running attempt1 and reviewed code/body
hashes. On match, persist the accepted commit+byte digest to private runner config;
the creation step independently re-reads that exact immutable commit and bytes.
No Google secrets are exposed to setup or polling, and timeout ends the run with
no create. Polling is GET-only; do not confuse repeat reads with create retries.

This substitutes trust in authorized writers controlling the repository's main
branch for independent environment approval. It does NOT establish owner-signed
consent, verified reviewer approval, durable consumption or protection from a
malicious authorized repository writer. The user must approve that operational
trust boundary. Inspect actual main branch protections before claiming it is
protected. Never accept an arbitrary commit supplied by workflow input; the
fixed-ref discovery and reviewed exact bindings are the authorization anchor.
The bounded polling setup and private config assembly are now implemented locally
and mock-tested. They are not installed or run against live services. The setup
authenticates the fixed repository reference and validates bindings; it does not
turn repository-writer trust into independent owner-signed authority.
