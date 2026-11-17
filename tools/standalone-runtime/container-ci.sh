#!/usr/bin/env bash
# Public official-image smoke only. No login, registry push, credentials or deploy.
set -euo pipefail
cd "$(dirname "$0")"
work="$(mktemp -d)"
docker pull node:22-bookworm-slim
digest="$(docker image inspect node:22-bookworm-slim --format '{{index .RepoDigests 0}}')"
[[ "$digest" =~ ^node@sha256:([a-f0-9]{64})$ ]] || { echo 'Unexpected official image identity'; exit 1; }
sha="${BASH_REMATCH[1]}"
base="node:22-bookworm-slim@sha256:$sha"
docker run --rm "$base" sh -ec 'apt-get update >&2; for p in python3 python3-reportlab python3-pil fonts-dejavu-core python3-pypdf; do v=$(apt-cache policy "$p" | sed -n "s/^  Candidate: //p"); printf "%s=%s\n" "$p" "$v"; done' > "$work/packages"
args=(--build-arg "NODE22_DIGEST=$sha")
count=0
while IFS='=' read -r name version; do
  [[ "$version" =~ ^[0-9][A-Za-z0-9.+:~_-]{0,199}$ ]] || { echo 'Missing or malformed Debian candidate'; exit 1; }
  case "$name" in
    python3) key=PYTHON3_VERSION;;
    python3-reportlab) key=REPORTLAB_VERSION;;
    python3-pil) key=PILLOW_VERSION;;
    fonts-dejavu-core) key=DEJAVU_VERSION;;
    python3-pypdf) key=PYPDF_VERSION;;
    *) echo 'Unexpected package'; exit 1;;
  esac
  args+=(--build-arg "$key=$version")
  count=$((count+1))
done < "$work/packages"
[[ "$count" == 5 ]] || exit 1
printf 'TEST-ONLY resolved base: %s\n' "$base"
cat "$work/packages"
DOCKER_BUILDKIT=1 docker build --target test "${args[@]}" --tag ltc-newsroom-test:local .
DOCKER_BUILDKIT=1 docker build --target runtime "${args[@]}" --tag ltc-newsroom-runtime:local .
test "$(docker run --rm --network none --read-only --tmpfs /tmp ltc-newsroom-runtime:local)" = '{"status":"deployment-disabled","reason":"Reviewed adapters, owner configuration and independent state initialization required","effects":[]}'
test "$(docker image inspect ltc-newsroom-runtime:local --format '{{.Config.User}}')" = node
echo 'Container build/test and disabled nonroot startup passed; no production approval.'
