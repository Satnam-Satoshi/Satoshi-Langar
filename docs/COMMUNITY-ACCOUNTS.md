# Optional community accounts · 0.1.26

Status: Google-only activation prepared October 5, 2026 at the founder’s request. Consult the private release receipt for live verification status. Guest reading, learning and local contribution planning do not require an account.

## Architecture

Static portable pages use the official Supabase JavaScript client for OAuth with PKCE. The code verifier and session tokens use same-tab session storage. The callback exchanges the code and verifies the user against the account service. No application database or public profile table is created. Sign-in does not synchronize local progress/drafts or grant program, repository or agent permissions. Credentials are never handled by our form.

Supabase Auth is open source and supports self-hosting. Hosted Auth, identity providers, browser storage and the main HTTPS hostname are explicit dependencies. IPFS mirrors retain guest tools; account redirects are restricted to the configured HTTPS origin. No wildcard redirect or arbitrary `next` URL is supported.

## Google-only release configuration

The existing Supabase project is `mfbazlqnypqjoqgbitys`, owned by the founder-selected Satnam Satoshi organization. Google is the first supported provider; GitHub, Apple and Facebook remain unavailable. Public help/privacy contact: eddiemalhotra@gmail.com. Do not recreate the project or OAuth client.

The canonical Site URL is `https://satnamsatoshi.com` with the exact callback `https://satnamsatoshi.com/auth/callback/index.html`. The previously approved exact Vercel callback remains configured. No wildcard or arbitrary return URL is accepted. Google returns first to the existing Supabase provider callback. Requested Google scopes are OpenID, basic profile and email only.

`config/community-auth.json` contains public client configuration only. The browser build validates it and generates `public/data/community-auth.json`. This preserves the accepted sign-in configuration during routine daily content builds. Environment overrides are optional; `COMMUNITY_AUTH_ENABLED=false` disables new frontend sign-in for a release. Empty/invalid enabled configuration fails closed. Never place a secret key, service-role key, database password or OAuth secret in either file or the site export.

The CSP permits only the exact configured Supabase origin in addition to this site's own origin. Mirrors link back to the canonical account website before contacting Auth. The auth client uses PKCE and same-tab session storage. Tokens/callback codes are not put in analytics, public logs or release evidence. Reloading the cleaned callback re-verifies its existing session. Callback errors remove response parameters; server logout failures distinguish local removal from unconfirmed remote revocation. Guest drafts remain untouched.

Before announcing activation, run the full export checks and simulated browser adapter suite, then verify real Google consent, successful return, callback refresh and sign-out in the canonical deployment with an authorized owner account. A candidate build and Google production setting alone do not prove the website login works. Record the observed outcome in the private release receipt; restore the previous deployment if the live round trip fails. Other providers require their own owner configuration and tests.

The account identifies a returning member. It does not sync local learning/plans, create a public directory, grant treasury/program permissions or consent to magazine email. Newsletter enrollment remains a separate double-opt-in implementation and is currently disabled.

## Operator responsibilities

Auth records include provider identity and authorized email/profile. Delete a verified user's Auth record through the private admin interface when requested. Do not put an admin key in a browser, route, screenshot or repository. Revoking a provider grant does not delete the service record. Public GitHub contributions are separate records. Final retention/deletion handling and a response owner must be settled before live registration; this release does not invent a legal trust, tax status or a privacy service-level promise.

Stop switch: set `COMMUNITY_AUTH_ENABLED=false` and redeploy, and disable the affected provider/server sessions in the Auth dashboard as appropriate. Existing local drafts remain useful. To make a new self-hosted deployment, export only service data through an authorized private operator workflow and rehearse restoration. Never include user records in public IPFS bundles.

## Primary implementation references

- [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [GitHub](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook)
- [Self-hosting](https://supabase.com/docs/guides/self-hosting)

Updated October 5, 2026. Live activation is established by the dated release and OAuth-test receipt, not this document alone.
