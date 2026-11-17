# Source recipe, not a production-approved image. Test-only CI builds are separately verified.
# No digest/package defaults.
# Context: tools/standalone-runtime; supply independently reviewed Debian pins.
ARG NODE22_DIGEST
FROM node:22-bookworm-slim@sha256:${NODE22_DIGEST} AS runtime-deps
ARG NODE22_DIGEST
ARG PYTHON3_VERSION
ARG REPORTLAB_VERSION
ARG PILLOW_VERSION
ARG DEJAVU_VERSION
USER root
# Validate all direct package pins before any apt network request. Base namespace
# is fixed above; missing/malformed digest must also fail image resolution.
RUN node -e 'if(process.versions.node.split(".")[0]!=="22")throw Error("Node22 required");const e=process.env;if(!/^[a-f0-9]{64}$/.test(e.NODE22_DIGEST||""))process.exit(1);for(const k of ["PYTHON3_VERSION","REPORTLAB_VERSION","PILLOW_VERSION","DEJAVU_VERSION"]){if(!/^[0-9][A-Za-z0-9.+:~_-]{0,199}$/.test(e[k]||""))throw Error("Missing or invalid reviewed pin: "+k)}' \
 && apt-get update \
 && apt-get install --yes --no-install-recommends \
      "python3=${PYTHON3_VERSION}" \
      "python3-reportlab=${REPORTLAB_VERSION}" \
      "python3-pil=${PILLOW_VERSION}" \
      "fonts-dejavu-core=${DEJAVU_VERSION}" \
 && rm -rf /var/lib/apt/lists/* \
 && /usr/bin/python3 -c 'import reportlab, PIL; from pathlib import Path; assert Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf").is_file()'
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node renderer ./renderer
COPY --chown=node:node smoke ./smoke
ENV NODE_ENV=production PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER node
CMD ["node", "src/main.mjs"]

# Optional test target. Package availability and exact version in the selected
# Debian repository must be independently confirmed; no pip fallback/download.
FROM runtime-deps AS test
ARG PYPDF_VERSION
USER root
RUN node -e 'if(!/^[0-9][A-Za-z0-9.+:~_-]{0,199}$/.test(process.env.PYPDF_VERSION||""))throw Error("Missing reviewed PYPDF_VERSION")' \
 && apt-get update \
 && apt-get install --yes --no-install-recommends "python3-pypdf=${PYPDF_VERSION}" \
 && rm -rf /var/lib/apt/lists/*
COPY --chown=node:node test ./test
COPY --chown=node:node Dockerfile ./Dockerfile
USER node
RUN --network=none node --test test/*.mjs \
 && /usr/bin/python3 -m unittest discover -s renderer -p 'test_*.py' -v

# Default final image retains the disabled entrypoint and explicit synthetic smoke helpers,
# not the test suite, a schedule, a publishing command or runtime secret configuration.
FROM runtime-deps AS runtime
USER node
CMD ["node", "src/main.mjs"]
