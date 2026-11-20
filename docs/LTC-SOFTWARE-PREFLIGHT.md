# Read-only software release diagnosis

The preflight runner is not a release workflow. It has no upload, lease, promotion,
rollback, policy-edit, secret-edit or Git-write path. It does not enable release
switches. It reports only fixed guard names and pass/fail, never exception text,
review payloads, resource IDs, credentials or provider responses.

## Isolated execution contract

Do not merge this diagnostic draft into the daily artifact source merely to run it.
That would change the accepted implementation digest and disrupt daily publishing.

Use a separately reviewed, manual-only trusted main control workflow named
`.github/workflows/ltc-software-preflight.yml`. This workflow is deliberately NOT
installed by this draft. It must use read-only GitHub permissions and an independently
pinned diagnostic checkout, plus a separate exact artifact checkout. It must have no
production concurrency lock, writes, auto-publish step, or scheduled trigger. Existing
protected configuration must stay within the same authorized production environment;
never copy its values to a branch, log, artifact or alternate secret store.

1. Review and pin the diagnostic runner's exact commit independently of the artifact.
2. Check out the already-reviewed artifact SHA into a separate clean directory.
3. Supply the existing accepted artifact digest, review/migration inputs, read clients,
   and private configuration in the trusted environment. Leave all settings unchanged.
4. Invoke the runner from the diagnostic checkout with `--root` pointing to the
   artifact checkout and exact `--source`, `--state-config`, `--evidence-config`.
5. Stop at the first named failed guard. A pass is not permission to publish and is
   not a lease or a guarantee that state cannot change after the read.

The original artifact's credential-free build plan runs with publish:false. Existing
build/check commands use the original cleaned child environment. The original
implementation digest and exact SHA are checked; no substitute digest is accepted.
Remote clients reject non-GET requests and request bodies. The state facade exposes
only inspect/clock and the Google adapter's write hook throws before any write.
OAuth token refresh is necessary authentication, not a data mutation permission.

The two one-shot release gates must remain off. The daily publication gate and
accepted daily implementation configuration must remain unchanged throughout.
Installing a new trusted workflow with protected-configuration access requires its
normal review and authorization; do not dispatch from an untrusted PR or spoof the
Actions environment locally to bypass that requirement.
