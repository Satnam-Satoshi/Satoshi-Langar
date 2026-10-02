# Optional community accounts · 0.1.26

Status: integration implemented; provider activation and a real external-provider round trip are pending. No authentication service is configured on the existing Vercel project as of October 1, 2026. Guest reading, learning and local contribution planning do not require an account.

## Architecture

Static portable pages use the official Supabase JavaScript client for OAuth with PKCE. The code verifier and session tokens use same-tab session storage. The callback exchanges the code and verifies the user against the account service. No application database or public profile table is created. Sign-in does not synchronize local progress/drafts or grant program, repository or agent permissions. Credentials are never handled by our form.

Supabase Auth is open source and supports self-hosting. Hosted Auth, identity providers, browser storage and the main HTTPS hostname are explicit dependencies. IPFS mirrors retain guest tools; account redirects are restricted to the configured HTTPS origin. No wildcard redirect or arbitrary `next` URL is supported.

## Founder steps

1. Sign in at [Supabase](https://supabase.com/dashboard) with the project-owning account. Create/select the Satnam Satoshi organization and project on an appropriate plan; the founder handles terms, recovery and any billing. Store the generated database password privately. It is not needed in the website or this chat.
2. Name the account steward and backup. Choose a monitored private email for account/deletion requests. Test delivery before enabling accounts.
3. In Auth URL Configuration, set the Site URL to the production HTTPS origin. Allow exactly `https://https-github-com-satnam-satoshi-sat.vercel.app/auth/callback/index.html`. Add a separate exact staging origin only when testing that deployment; do not use wildcard production redirects.
4. Create Google and GitHub OAuth applications owned by the community steward. The provider callback is the exact Supabase Auth callback shown in the dashboard, normally `https://PROJECT.supabase.co/auth/v1/callback`. Keep client secrets in the provider dashboard only. Request basic identity/email, no repository write, payment or wallet scopes.
5. Apple uses its developer-account configuration, a Services ID and a signing key. Its web OAuth client secret must be rotated at least every six months. Facebook must meet its current public-app requirements; development-role success is not proof that public users can sign in. Activate providers separately after testing.
6. Supply the **public** project URL and `sb_publishable_…` key through Vercel project settings. Do not provide a service-role key, secret key, database password or provider client secret to the browser bundle.
7. Set the six variables in `.env.example` for the intended deployment. Set `COMMUNITY_AUTH_ENABLED=true` only after the private contact, provider configuration and public privacy copy are ready. Update the static privacy/account-help/join copy to accurately describe the activated service and owner process.
8. Add only the exact Auth origin to `connect-src` in `vercel.json`. The build refuses enabled configuration if this origin is missing; avoid broad `https:` or wildcard allowlists.
9. Test each enabled provider with a consenting human test account: consent, success, cancellation, expired/wrong-tab callback, verified user, sign-out, storage blocked, provider outage and deletion request. Confirm no session/code is logged and no private record appears in public exports. Remove test accounts through the private admin dashboard.
10. Publish the tested release. Record enabled providers and date. Others remain visibly unavailable. Offer guest access throughout.

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

Reviewed October 1, 2026. This is an implementation and owner handoff, not evidence of provider activation.
