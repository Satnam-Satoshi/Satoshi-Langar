# Supply an independently reviewed official node:22-bookworm-slim@sha256:... image.
# No default tag/digest: image review is a deployment prerequisite, not invented here.
ARG NODE22_IMAGE
FROM ${NODE22_IMAGE}
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
USER node
ENV NODE_ENV=production
CMD ["node", "src/main.mjs"]
