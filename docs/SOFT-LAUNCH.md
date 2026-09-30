# Satnam Satoshi soft launch

September 2026. Builds on the existing public-alpha design branch. Founder requested public launch, the connected Langar / Kalakar.x / Crypto Kitty story, and satnam.x. No financial functionality is authorized by this release.

## Runtime boundary

`pnpm build` creates a Next.js static export and converts it to portable HTML/CSS in `dist/`. All application scripts are removed; navigation uses native links and a native details menu. `scripts/check-export.mjs` verifies internal links and resources, rejects executable scripts/forms and detects paths escaping the export root. Serve dist, not a Next.js server. Experimental API scaffolds are preserved as text under docs/archived-api and no cron runs.

The conversion is intentionally limited to this static publication. Any future interactive component requires a new design and verification of the export contract. No login, database, wallets, financial transactions or provider credentials are required by the deployed artifact.

## Verification

Use Node 22.23.2 and pnpm 11.19.0. Run `pnpm install --frozen-lockfile`, `pnpm check`, and `pnpm audit`. Browser acceptance covers desktop/mobile layout, navigation, six contribution links, no horizontal overflow and no console/resource errors. These are engineering checks, not an independent security or complete accessibility audit.

## Deployment

Existing Vercel project: https-github-com-satnam-satoshi-satoshi-langar in Baba G's projects. Deploy the exact reviewed branch/commit with framework `Other`, install `pnpm install --frozen-lockfile`, build `pnpm build`, output `dist`. vercel.json defines these and static security headers. Preview first; verify actual rendered page and commit, then publish the approved candidate. Do not redeploy the old artifact. Do not provision paid services without approval.

For any other static host, upload contents of dist. Preserve directory indexes. Add equivalent CSP and other headers where supported. The files also work below an IPFS gateway CID path because internal links and resources are relative. Page links explicitly include index.html: Pinata was observed to list nested directories for trailing-slash links. The export check rejects directory links so navigation does not rely on gateway index serving. Gateway headers are controlled by the gateway operator.

## satnam.x

Unstoppable .x is a Web3 domain; do not configure it as though it were an ordinary globally resolving DNS name. An ordinary HTTPS URL remains necessary for visitors without compatible resolution.

After verifying the public HTTPS release:
1. Domain owner signs in at Unstoppable Domains and opens Manage for satnam.x.
2. Inspect the existing Website / record settings first; preserve wallet address records.
3. For a quick connection, set the supported website redirect to the verified HTTPS release. Official resolution uses `browser.redirect_url` (legacy `ipfs.redirect_domain.value` may also appear).
4. For decentralized hosting, pin the contents of dist with directory root intact, verify the CID gateway URL including nested pages, then set the supported IPFS website record (`dweb.ipfs.hash` or UI-managed legacy IPFS record).
5. Review record priority: a preexisting IPFS hash can take precedence over a redirect. Do not silently erase existing records. The owner handles wallet confirmations and any fees.
6. Verify both the standard HTTPS URL and supported .x resolution. Then update /domain to report the observed state.

No CID, publication or domain connection is claimed until verified. Source: https://docs.unstoppabledomains.com/web3/resolution/guides/browser-resolution/algorithm

## Rollback

Retain the previous known-good deployment identifier and immutable new deployment URL. If a material problem occurs, revert the production alias to the previous deployment through Vercel, or restore the previous static bundle on another host. Domain record rollback is performed by the domain owner using the prior recorded value. Git changes remain reviewable; do not force-push or delete earlier work.

## Remaining owner inputs

Unstoppable Domains login and any record-signing action; a verified public email for non-GitHub participation when desired. Until then, the Join page accurately describes GitHub submission and offline preparation. No fake form or unverified contact is advertised.
