# Developer guide · 0.1.26

The current combined website/docs review is [PR #52](https://github.com/Satnam-Satoshi/Satoshi-Langar/pull/52), branch `agent/community-ecosystem-20260930`. It preserves the documentation merged in #51. Check the current PR before beginning: `main` still has earlier application code until this review merges. Treasury #45 and the superseded website review #46 stay separate.

## Reproduce the review

Fork the repository, then replace YOUR-GITHUB-HANDLE below with your own account:

```sh
git clone https://github.com/YOUR-GITHUB-HANDLE/Satoshi-Langar.git
cd Satoshi-Langar
git remote add upstream https://github.com/Satnam-Satoshi/Satoshi-Langar.git
git fetch upstream agent/community-ecosystem-20260930
git switch -c contribution/my-change upstream/agent/community-ecosystem-20260930
pnpm install --frozen-lockfile
pnpm check
python3 -m http.server 4318 --directory dist
```

Use Node **22.23.2** and pnpm **11.19.0**, matching `.nvmrc` and `packageManager`. `pnpm check` runs type checks, donation-format verification, collector/auth-core tests, the production build and portable-link/resource checks. No wallet, Auth account or private record is needed to reproduce the default build.

Inspect the finished **dist/** site in a browser. The authoring server (`pnpm dev`) is useful for styling and server-rendered content, but progressive enhancements are injected by the portable exporter, so test interactive behavior against the finished export. `next start` does not serve this static release.

## How the release works

- Next.js authors static HTML and styles. The exporter removes its runtime and rewrites local URLs to explicit relative index.html files.
- Three reviewed public enhancements support local learning progress, local contribution drafts and optional identity. Native articles, links, quizzes and downloads still work without JavaScript.
- Browser code under `scripts/browser/` is bundled locally with esbuild. Only the explicit script allowlist ships; no remote runtime or inline script is allowed by the production CSP.
- The build exports public source-check JSON, edition/preview RSS and immutable edition JSON and starter-kit Markdown. It does not export private user data.
- Optional Auth configuration is described in [COMMUNITY-ACCOUNTS.md](COMMUNITY-ACCOUNTS.md). Defaults are disabled. Secret/provider/admin keys never enter this repository or browser bundle.
- `pnpm ltc:collect --stdout` requests bounded public sources. A tested, founder-authorized deterministic edition pipeline can publish a factual briefing; saving a snapshot alone is not website deployment. See [LTC-PIPELINE.md](LTC-PIPELINE.md).

## Change and review

Use a small branch/PR and include the source commit, actual checks and relevant desktop/mobile screenshots. Test each affected button, keyboard path, download and error state. For local-storage changes, test blocked/corrupt storage and deletion. For sign-in activation, a real consenting test account and private deletion workflow are required; mocked SDK responses are not proof of a provider integration.

Do not weaken checks or the CSP just to get a green result. Keep privacy-sensitive records, credentials and service-recipient information out of public examples and test fixtures. No app route should request a seed phrase or private key.

The founder requested a Vercel website update for review. A protected-branch merge and satnam.x publication require their separately recorded authorization. Vercel's current Git linkage is tracked in [issue #39](https://github.com/Satnam-Satoshi/Satoshi-Langar/issues/39); a merge is not proof of deployment.

## Optional adapter browser tests

`scripts/test-auth-browser.mjs` uses Playwright/Chromium and the actual `dist/scripts/auth.js` bundle with wholly intercepted HTTPS fixtures. Install Playwright in your test environment, build the export, then run `node --test scripts/test-auth-browser.mjs`. If Playwright is supplied by your workspace runtime, set `PLAYWRIGHT_MODULE` to its importable module path. These seven tests do not contact real identity providers or create accounts, and do not replace an external-provider acceptance test.

## Daily magazine release

Run `pnpm ltc:edition --snapshot <candidate.json> --output <edition.json>` to prepare a candidate. `--publish` applies only a validated dated edition under the enabled policy; it does not deploy. `pnpm check` includes freshness, identity, pause, correction and idempotence checks. See [the daily release runbook](LTC-RELEASE-RUNBOOK.md) for the local schedule, isolated build, exact-artifact deployment, audit record and stop procedure.
