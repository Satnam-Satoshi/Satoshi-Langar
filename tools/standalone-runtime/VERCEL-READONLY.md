# Direct Vercel observations, dormant and nonpublishing

`createVercelReadOnly` uses an explicitly injected HTTP transport and approved secret-reference resolver. Reads default off; no token is stored or configured. It exposes only fixed GET deployment and deployment-alias endpoints at `https://api.vercel.com`. There are no deployment creation, file upload, promotion, alias mutation, bypass-link or credential-management methods.

Exact project/team identifiers and candidate branch are independently configured. Deployment reads require owner-only `projectId`/`ownerId`, expected deployment ID, exact GitHub repository identity, branch and commit. Reduced public views, wrong linked repository or missing source identity hold. Official owner response fields were checked in Vercel's public OpenAPI schema, not inferred from a synthetic fixture. This is still not live API compatibility/authentication proof.

Responses are bounded, redirects rejected, timeouts cancel, errors latch without retries. Provider responses can contain sensitive metadata (including protection-bypass maps). The adapter deliberately returns only a narrow normalized observation and response hash, never raw bodies, environment fields, creator metadata or protection-bypass data. Secret material is passed to the fixed origin in memory only, after explicitly enabling reads; future cloud secret storage/authority requires its own approval.

A READY production deployment plus both listed canonical domains is an API observation, not an atomic snapshot, actual public artifact QA, successful promotion or publishing authority. Public HTTP/PDF/reader/media readback, freshness, expected-live checks, durable intent/outbox and legitimate production authorization remain required. The adapter does not authenticate caller pins or establish a hard fence against other writers. Capture clocks and durable receipt binding remain responsibilities of the reviewed runtime coordinator.

Official references checked November 17, 2026:
- https://vercel.com/docs/rest-api/deployments/get-a-deployment-by-id-or-url
- https://vercel.com/docs/rest-api/aliases/list-deployment-aliases
- https://vercel.com/openapi.json

Tests use only synthetic in-memory HTTP responses and fake secrets. No real credential, deployment query, network configuration or provider mutation was performed to test this adapter.
