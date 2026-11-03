# Daily magazine email: activation plan

Prepared October 5, 2026. Website publication remains active through the existing checked daily workflow. Email sending is not activated, subscribers have not been imported and no public email form is collecting addresses.

## Selected approach

Use a founder-owned Brevo account, a hosted double-opt-in form and its RSS Campaign integration. This keeps credentials out of the portable static site and allows the web reading experience to remain independent of the mail provider. The intended source is `https://ltcmagazine.org/conversations/daily.xml`; it includes only published daily editions and correction events. Leave `/conversations/feed.xml` as the broader editorial-preview feed. Preserve GUIDs, source dates and old records.

Brevo documents 300 email sends per day on its Free plan. That includes other sends and is a pilot limit, not a promise of unlimited daily distribution. Confirm the live account includes the RSS integration before selecting it. Keep a small pilot list with headroom for confirmations; stop and obtain a budget decision before exceeding capacity. Do not silently upgrade. The founder's possible $10 AI chat allowance is not email-service spending authority.

Official setup references:
- https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan
- https://help.brevo.com/hc/en-us/articles/208771869-Create-a-sign-up-form-in-Brevo
- https://help.brevo.com/hc/en-us/articles/360013130059-RSS-Campaign-integration-Automatically-share-your-blog-posts-with-your-subscribers

## Exact pending owner steps

1. Sign up/sign in to Brevo as the owner, using the founder-selected eddiemalhotra@gmail.com. The owner completes credentials, verification and service terms. No inbox-read access is needed.
2. Confirm the real publisher identity, required postal contact details and a monitored reply address privately in the provider. Do not invent a company registration, trust status or mailing address.
3. Authenticate `ltcmagazine.org` as the sending domain with the exact provider-issued DNS records; inspect existing DNS first. Preserve all website and mail records. This domain verification is separate from Google/Apple OAuth.
4. Create one consented daily-magazine list and a hosted email-only form. No prechecked consent, contact imports or automatic newsletter enrollment from site sign-in. Enable double opt-in, readable privacy and clear confirmation/decline states.
5. Configure the daily RSS campaign as an inactive draft. Use the provider's documented default RSS template first, then apply LTC blue/silver/orange and the actual cover enclosure. Keep original issue date, a clear read-online link, AI/source labels, monitored replies and working unsubscribe/preferences links. Do not claim institutional endorsements.
6. For timing, Brevo instructs publishing at least one hour before its scheduled check. The site's 10 a.m. America/New_York run is not a guaranteed completion time. Select noon New York as a starting mail check and test delays/DST; no new feed item means no send. Late editions may be delivered at the next check. No exact inbox arrival is promised.
7. With the owner's explicit test-recipient permission, verify confirmation delivery, confirming an address, one new published issue, a same-day no-op, a correction event, unsubscribe, suppression of an unsubscribed contact, links/images on phone/desktop and Gmail/Apple relay compatibility where applicable. Do not send tests to strangers or the community.
8. Only after those checks, publish the tested hosted form URL in the website config and update privacy/status copy. `config/newsletter.json` is disabled and cannot pass the enabled build gate without all activation evidence checks. It contains public setup status only, never secrets.
9. Activate automatic mail only for the confirmed subscriber list. Export consent records privately as needed; respect unsubscribes across exports/reimports. Never put subscriber information in GitHub, IPFS, public logs or the static website. Keep a single active mail sender to avoid duplicates.

## Pause, failure and ownership

The founder owns the account and can pause the RSS integration. A website release does not prove an email was delivered. Track provider campaign ID/status, deduplication and failures privately. Notify on sustained failures or a required budget/owner decision; do not claim staffed moderation or around-the-clock availability. Keep the public feed and archive working if mail is paused.
