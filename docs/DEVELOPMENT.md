# Developer guide

## Choose a target before installing

`main` is the public documentation home and contains earlier Next.js application code. The current static community website is reviewed in [PR #46](https://github.com/Satnam-Satoshi/Satoshi-Langar/pull/46), branch `agent/satnam-soft-launch`. The separate Treasury work in PR #45 is not part of this site. Check the PR state before beginning; these instructions reflect September 30, 2026.

For a documentation change, fork this repository, clone your fork and make a small branch from current `main`. No Node installation or build is needed for a prose-only edit. Check Markdown links, status claims and spelling, then submit a PR targeting `main`.

## Work on the community website

Create a fork in GitHub, then substitute your actual GitHub handle below:

```sh
git clone https://github.com/YOUR-GITHUB-HANDLE/Satoshi-Langar.git
cd Satoshi-Langar
git remote add upstream https://github.com/Satnam-Satoshi/Satoshi-Langar.git
git fetch upstream agent/satnam-soft-launch
git switch -c contribution/my-change upstream/agent/satnam-soft-launch
```

Use **Node 22.23.2** and **pnpm 11.19.0**, matching that branch's `.nvmrc` and `packageManager`. Install them through their official distribution instructions if needed; do not run a random setup script from an issue.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm dev
```

Open the local URL printed by the development server. For a completed portable build, serve the **dist/** directory using a static HTTP server. `pnpm check` on the website branch performs type checks, export and resource/link checks. Do not use `next start` as the production server for that static release.

Submit website changes against `agent/satnam-soft-launch` while PR #46 is open. Coordinate with the maintainer if that branch has since merged or changed. Documentation revisions to `main` need reconciliation when the application release is merged; do not overwrite them with older branch copies.

## Repository map

| Path | Purpose |
|---|---|
| `app/`, `components/`, `lib/`, `config/` | Existing application source |
| `public/` | Public assets |
| Root Markdown documents | Mission, roadmap, contribution and governance |
| `docs/` | Guides, decisions and dated research/build evidence |
| `.github/ISSUE_TEMPLATE/` | Contribution intake templates |
| `.github/PULL_REQUEST_TEMPLATE.md` | Review checklist |
| `scripts/`, `.nvmrc`, `dist/` on the website branch | Portable release tooling, pinned runtime and generated site |

## Validation and review

Record the branch/commit, commands run and actual results. For UI changes, include desktop/mobile evidence and relevant keyboard checks. If a check fails, report it; do not disable checks to obtain a green result. Main's older package/CI setup is not the pinned static release toolchain. Use the website branch for reproducing that release.

Do not add API keys, personal records or wallet integration to make the static community website work. It has no active backend, database or financial execution flow. Website deployment and satnam.x publication remain separately reviewed actions.

## Community ecosystem review branch

`agent/community-ecosystem-20260930` carries forward the tested static-export website from `agent/satnam-soft-launch` while preserving documentation merged in #51. Review this combined branch before considering the older website PR #46. It keeps financial-control PR #45 separate.

Use Node 22 and the pinned pnpm version. `pnpm check` now validates native donation request formats, collector edge cases and the portable export. `pnpm ltc:collect` makes bounded public source requests; it does not deploy or publish an edition.
