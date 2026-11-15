# Approved design route coverage

This is implementation/build evidence, not a browser screenshot report. The preview root is the community homepage. Follow the same preview hostname for the routes below; cross-brand production-domain links leave the preview.

| Route family / representative | Visible interior work |
| --- | --- |
| `/` | Orange community-led hero, newcomer journey, magazine cover and Register evidence panel |
| `/conversations/` | Distinct magazine masthead, full headline cover, seven-stop reading map |
| `/conversations/desks/` and `/conversations/desks/bitcoin-products/` | Bold guide headlines, orange rules, alternating directory rows, numbered hierarchy, source/record cards |
| `/conversations/archive/` and dated calendar routes | Bold archive masthead, orange archive boundary, preserved saved covers/dates |
| `/conversations/read/three-clocks-of-a-bitcoin-fund/` | Bold article header, section headings and source notebook |
| `/conversations/editions/2026-11-11/` | Orange/ink cover, ivory reader, bold desk headers, seven-stop map, legible dark lending section, table striping |
| `/conversations/start/`, `/conversations/finance/`, `/conversations/timechain/` | Bold open-money school/guide heroes, orange card and lesson hierarchy |
| `/conversations/litecoin/` and `/conversations/litecoin-distribution/` | Bold fieldbook/distribution hierarchy, orange section rhythm, preserved chart data |
| `/conversations/community/` | Bold Wire hierarchy and directory/source-state accents |
| `/conversations/about/`, `/conversations/updates/`, `/conversations/reference/` | Bold editorial policy/source-desk titles and orange section rules |
| `/conversations/specials/…` | Updated landing/contents hierarchy; original collectible page compositions intentionally preserved |
| `/sikh-bitcoin/`, course, lesson and lab routes | Bold custom learning typography, orange hero/cards/controls |
| `/miikey/` | Bold custom hero, orange cards/actions, preserved dark multisig section |
| `/mission/`, `/agents/`, `/ecosystem/` | Bold custom interiors, orange section rhythm and contrasting actions |
| `/join/`, `/subscribe/` | Bold custom entry headlines and form/action hierarchy; hooks unchanged |
| `/press/`, `/shop/` | Bold custom interior hierarchy, orange actions/cards; product status unchanged |
| `/langar/`, `/kalakar/` and shared program pages | Bold program headers, orange cards, preserved dark flow section |
| `/donate/` | Full fundraising story, orange/ink chapters, clear founder-wallet disclosure and unchanged payment destinations |
| `/about/`, `/technology/`, `/transparency/`, help and other PageIntro/Card routes | Bold orange PageIntro plus shared card/masthead/footer system |

## Checks and limits

- Export validates internal paths/assets for all 396 generated HTML pages.
- Sourcebook and reading-map links have been checked in generated HTML.
- Browser desktop/mobile QA is still blocked by cloud-browser URL policy. No claim of rendered all-route visual approval is made.
- Historical standalone HTML/PDF downloads are retained documents, not redesigned live routes.
- No PDF financial numbers, updated prices, legal/tax status, donation addresses or source claims are inferred from the visual redesign.

## BTC/LTC under-price conversion
The shared market rail now displays both reciprocal USD-implied BTC/LTC conversions beneath their USD prices, using the same two validated Coinbase observations and timestamps. Updates run every two minutes on supported production hosts. Invalid, stale or partial payloads retain dated observations rather than claiming a fresh rate. Preview hosts intentionally display the dated saved snapshot. This is not an executable BTC/LTC order-book quote; fees and spread are excluded.

## Actual Safari review, November 12
On the user-authorized Mac, reviewed the current preview in Safari and Responsive Design Mode at 1440, 390 and 320 CSS-pixel widths. Inspected both homepage headers/heroes, magazine cover and reading map, archive, About/PageIntro, Sikh Bitcoin, Bitcoin-products desk, MiiKey, join form, donation story/wallet QR/address wrapping and dated issue lending cards. The inspected panels showed working wrapping and no visible horizontal clipping. This was a representative route-family review, not inspection of every scroll position on all 396 pages. Donation support anchor navigation worked. Responsive-menu activation could not be conclusively tested because native accessibility click/coordinate targeting misrouted in Safari Responsive Design Mode; preserve this as an unverified interaction, not a passed check.

Found and corrected light orange conversion text on silver (now dark orange #a54700), a homepage CSS override causing reading-map headings to revert to serif (specificity fixed), and reader desk headings brought into the bold editorial hierarchy. These refinements require final rendered recheck on the rebuilt candidate. Safari was restored out of Responsive Design Mode, with the preview tab left open. No funds, user form data or other website actions were submitted.
