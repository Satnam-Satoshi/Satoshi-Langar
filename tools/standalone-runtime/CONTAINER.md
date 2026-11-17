# Unbuilt standalone container dependency recipe

This is a source recipe, **not a built, tested, deployable or activated image**. No Docker/Podman/Buildah/nerdctl runtime is available in the preparation environment; none was installed. Static Node tests inspect the recipe only. No apt install, image pull, build, provisioning, credential setup or scheduler action was performed.

## Required independent dependency review

The base namespace is fixed to official `node:22-bookworm-slim@sha256:${NODE22_DIGEST}`. There is no tag-only fallback or default digest. Supply a reviewed real64-hex image digest for the intended architecture, with provenance/security review. Missing or malformed input fails resolution/validation. This document supplies no invented digest.

All directly installed runtime packages require exact reviewed Debian versions, with no defaults:

| Build argument | Debian package | Purpose |
|---|---|---|
| PYTHON3_VERSION | python3 | fixed /usr/bin/python3 collector/renderer execution |
| REPORTLAB_VERSION | python3-reportlab | PDF generation |
| PILLOW_VERSION | python3-pil | raster images |
| DEJAVU_VERSION | fonts-dejavu-core | renderer's fixed DejaVu font paths |
| PYPDF_VERSION | python3-pypdf | optional test target PDF assertions only |

The actual Node major must be22. Version strings are validated before apt requests. Runtime apt update/install is combined, uses no recommended extras, and removes package indexes. This pins direct dependency versions, **not the entire transitive graph or repository snapshot**. Review Debian repository configuration, exact package availability for the digest/architecture, transitive versions and hashes, supported security updates, licenses/font redistribution, SBOM and vulnerability results before a build can be approved. Pins will need explicit maintenance; they are not automatically safe forever.

The official Debian package index lists [python3-pypdf for Bookworm](https://packages.debian.org/bookworm/python3-pypdf), checked November 17, 2026. This does not prove availability or compatibility in a particular selected image/repository snapshot. Missing candidates must fail; no silent pip or repository fallback.

## Isolated CI build proposal

`container-ci.sh` resolves the official public Node22 tag to its actual immutable digest, then resolves exact Debian candidate versions inside that image. These are **test-only observed pins**, not independently security-approved production pins. The existing source-only GitHub workflow can build the test and runtime targets and verify nonroot disabled startup with network disabled. It does not log in, push an image, use secrets, provision or deploy. Public selected digest/package versions are logged; no private payload is included. Until an actual successful CI result is recorded, this remains unbuilt. The local environment has no container engine.

## Layout and execution

Use `tools/standalone-runtime` as the build context. Explicit COPY operations include package.json, src (including reviewed local HTML extractor and source registry), and renderer. No catch-all context COPY, host credentials or private artifact paths are included. Only build-time package installation runs as root; application and tests run as `node`. Dependencies are checked through fixed `/usr/bin/python3`; the runtime has no Python package installation command.

The optional `test` target adds the separately pinned PDF-test package, copies test files and the Dockerfile (required by static recipe assertions), then executes with BuildKit RUN --network=none (network-disabled tests):

```
node --test test/*.mjs
/usr/bin/python3 -m unittest discover -s renderer -p 'test_*.py' -v
```

The final/default `runtime` target descends from runtime-deps, not test. Its command stays `node src/main.mjs`, which unconditionally reports deployment-disabled. The recipe does not activate collection, rendering, model calls, publication, Buffer, Drive, email or scheduling. Rootless runtime configuration, filesystem/network restrictions, resource budgets and service identity must be independently reviewed by the eventual operator; USER alone is not a complete sandbox.

No model-provider SDK, Firestore npm SDK or other vendor package is installed by this recipe. Existing interfaces still require independent reviewed runtime bindings. Actual archive upload, transactional workflow composition, semantic review, full ecosystem coverage, provider/canonical-history migration, approvals and operational QA remain outside a container dependency recipe. A successful future build would not settle those gaps or authorize any live action.

Static-only test performed in preparation:

```
node --test tools/standalone-runtime/test/container-recipe.test.mjs
```

Five tests pass under Node22. This proves text-level guard assertions, not Docker syntax/build resolution, binary compatibility, visual rendering inside the image or container security.
