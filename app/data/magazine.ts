export type MagazineSource = { id: string; label: string; url: string; kind: 'Primary record' | 'Issuer disclosure' | 'Technical documentation' | 'Secondary research'; note: string };
export type MagazineSection = { heading: string; paragraphs: string[]; sourceIds?: string[] };
export type MagazineArticle = {
  slug: string; desk: string; deskId: string; title: string; dek: string;
  classification: 'Explainer' | 'Analysis' | 'Field guide'; minutes: number;
  takeaway: string; question: string; sections: MagazineSection[]; sources: MagazineSource[];
  preparedDate?: string; sourceCheckedDate?: string; sourceCheckedAt?: string;
};
export const magazineIssue = {
  id: '2026-10-01', date: 'October 1, 2026', title: 'The work behind the promise',
  status: 'Editorial preview', byline: 'Prepared with AI for LTC',
  review: 'Human editorial review pending',
};
export const magazineArticles: MagazineArticle[] = [
  {
    slug: 'checking-for-yourself', desk: 'Bitcoin & proof of work', deskId: 'networks',
    title: 'The quiet power of checking for yourself',
    dek: 'Behind the price ticker is a more interesting question: what can you verify without asking someone else to believe for you?',
    classification: 'Explainer', minutes: 4,
    takeaway: 'A node checks protocol rules. It cannot verify every claim made about the world outside the network.',
    question: 'Which claim in your daily life would become more useful if you could inspect the evidence yourself?',
    sections: [
      { heading: 'Begin below the headline', paragraphs: [
        'A Bitcoin conversation often starts with a price. Try starting with a receipt. Who sent what, which rules make the transfer valid, and what would you need to check the answer? The shift is small, but it changes the reader from a spectator into an investigator.',
        'The Bitcoin white paper describes digital signatures and a proof-of-work history as parts of a peer-to-peer payment system. Its security argument depends on stated assumptions about the participating computing power. The design addresses double spending; it does not make every claim attached to a transaction true. These are useful boundaries to keep in view when someone promises that a blockchain proves everything.',
      ], sourceIds: ['whitepaper'] },
      { heading: 'A rule is different from a reputation', paragraphs: [
        'Consider a fictional community donation receipt. The transaction may help a reviewer establish that a transfer happened. It does not, by itself, establish that ingredients reached a kitchen, a meal was safe, or a guest was treated with dignity. Those claims require other evidence and accountable people. Mixing them together produces an impressive-looking record that answers the wrong question.',
        'Our proposed proof-of-service records therefore sit beside financial records. A human coordinator can verify an agreed task; an agent can compare a receipt with a budget or flag missing information. Neither gets to replace a real-world outcome with a transaction identifier. The practical lesson is to name the question before choosing the evidence.',
      ] },
      { heading: 'Software deserves the same curiosity', paragraphs: [
        'Bitcoin Core publishes release notes and source references so readers can inspect changes instead of relying on a version number alone. Its v31.1 release page describes fixes and improvements and points to its download and security communication channels. A release announcement is software evidence, not a prediction about the market.',
        'For a future LTC network report, we would record the software version, observation time, node configuration and the exact measurement. A chart without those details may still be attractive, but another reader cannot reproduce it. We are not publishing independently measured hashrate, mempool conditions or transaction fees in this issue.',
      ], sourceIds: ['core'] },
      { heading: 'An exercise for the lunch table', paragraphs: [
        'Pick one claim from any blockchain project. Write down what is directly observable, what depends on an organization, and what is a prediction. Then ask a friend to challenge the weakest link. No purchase is necessary. Learning to separate these categories is a useful first contribution to an open community.',
        'Verification is not a posture of permanent suspicion. It is a way to make cooperation less dependent on confidence, charisma or a single institution. The most welcoming technical culture makes its evidence easier for a newcomer to inspect.',
      ] },
    ],
    sources: [
      { id: 'whitepaper', label: 'Bitcoin: A Peer-to-Peer Electronic Cash System', url: 'https://bitcoin.org/bitcoin.pdf', kind: 'Primary record', note: 'Original system design and assumptions; not evidence of a specific present-day network measurement.' },
      { id: 'core', label: 'Bitcoin Core 31.1 release notes', url: 'https://bitcoincore.org/en/releases/31.1/', kind: 'Technical documentation', note: 'A specific software release, not a claim that every participant runs it.' },
    ],
  },
  {
    slug: 'three-clocks-of-a-bitcoin-fund', desk: 'Wall Street & institutions', deskId: 'markets',
    title: 'Three clocks inside a Bitcoin fund',
    dek: 'A share price, a holdings file and a financial disclosure can all be correct—and describe different moments.',
    classification: 'Explainer', minutes: 4,
    takeaway: 'Holdings, fund value and flows answer different questions. A retrieval date cannot make them interchangeable.',
    question: 'If two dashboards disagree, which field and date would you inspect before choosing a winner?',
    sections: [
      { heading: 'The date is part of the number', paragraphs: [
        'Imagine two readers comparing a fund at breakfast. One is looking at its closing share price. The other has a holdings spreadsheet. They think they are discussing the same snapshot, but they may be comparing different dates, valuation conventions and units. More decimal places will not resolve the disagreement.',
        'The iShares IBIT product page publishes separately dated fields for holdings, net assets, shares and market information. Its notes explain that some holdings information reflects an investment book of record and may differ from accounting records used for net asset value. The source is telling us that context belongs beside the data, not in a forgotten footnote.',
      ], sourceIds: ['ibit'] },
      { heading: 'Stock, price and movement', paragraphs: [
        'Holdings describe an amount at a point in time. A share price describes what a security traded for at a specified moment. A flow describes movement over an interval under a defined method. Calling a rise in a dollar-valued holdings table an inflow can confuse a change in price with newly committed money.',
        'A simple fictional example makes the distinction visible: ten units valued at $2 have a value of $20. If the price becomes $3 and the unit count is unchanged, the value becomes $30 without an additional unit arriving. A real fund has fees, creations, redemptions and other accounting details; this teaching example deliberately omits them.',
      ] },
      { heading: 'Compare instruments before comparing charts', paragraphs: [
        'ETF and ETP labels are a starting point, not a complete description of a product. The issuer materials, legal structure, jurisdiction, listing currency, fees and underlying exposure deserve their own fields. Cross-listed instruments also need a stable identifier so a dashboard does not count the same product repeatedly.',
        'LTC links both the IBIT issuer page and CoinShares’ Physical Bitcoin product materials as primary product references. These links are not endorsements, and a successful source retrieval does not mean we have validated every financial field or built a comparable flow series.',
      ], sourceIds: ['ibit', 'coinshares'] },
      { heading: 'How we want the daily desk to work', paragraphs: [
        'Our collector keeps the source-effective date separate from the time it fetched a file. The published source panel is a stored observation, not a live terminal. A missing or failed observation remains missing; it does not become zero. Daily collection and daily editorial publication are separate jobs.',
        'Before adding a new financial chart, we want another person to reproduce one point from the linked record. If that cannot be done, a smaller table with clearer limits is the better public service. The goal is a reader who understands the evidence, not a reader impressed by the number of tickers.',
      ] },
    ],
    sources: [
      { id: 'ibit', label: 'iShares Bitcoin Trust ETF: product and valuation notes', url: 'https://www.ishares.com/us/products/333011/ishares-bitcoin-trust-etf', kind: 'Issuer disclosure', note: 'Read each field’s date and the prospectus. This article does not reproduce a current market quote.' },
      { id: 'coinshares', label: 'CoinShares Physical Bitcoin: product materials', url: 'https://coinshares.com/etp/physical-bitcoin/', kind: 'Issuer disclosure', note: 'A separate product reference; no cross-product equivalence or flow calculation is asserted.' },
    ],
  },
  {
    slug: 'read-the-verb-before-the-headline', desk: 'Politics & public record', deskId: 'policy',
    title: 'Read the verb before the headline',
    dek: 'Proposed, finalized, announced, enacted: one word can change the meaning of a policy story.',
    classification: 'Analysis', minutes: 4,
    takeaway: 'A final rule and a request for comment can share an announcement. Record the status of each action separately.',
    question: 'What evidence would change your interpretation of a policy you strongly support—or strongly oppose?',
    sections: [
      { heading: 'One release, different actions', paragraphs: [
        'On September 30, 2026, the Federal Reserve announced two final rules concerning its stress-test framework and a further proposal on its noninterest-income model. The same release therefore contained both adopted changes and a request for public input. Treating every sentence as a completed policy would erase that distinction.',
        'The release says averaging of stress capital buffer requirements is to begin in 2028. That is an implementation date, not the announcement date. This article uses the agency’s account to illustrate how to read a public record; it does not independently estimate the economic effects or imply a direct Bitcoin price consequence.',
      ], sourceIds: ['fed'] },
      { heading: 'Make a small record before a large argument', paragraphs: [
        'Our proposed policy note begins with five fields: actor, action, date, jurisdiction and status. Only after those are clear do we ask who benefits, who bears a cost and which assumptions deserve challenge. This makes disagreements easier to discuss without requiring readers to share the newsroom’s political outlook.',
        'For legislation, the bill text and recorded actions matter more than the enthusiasm of an announcement. Congress.gov’s legislative-process guide is a useful orientation to the stages of federal lawmaking. A chamber vote, an agency rule and a court decision belong in different categories, even when their headlines use similar language.',
      ], sourceIds: ['congress'] },
      { heading: 'Analysis should show its working', paragraphs: [
        'A useful analyst can say: here is the documented change, here is my interpretation, and here is what would make that interpretation weaker. The last part is essential. If a story leaves no room for disconfirming evidence, it may be a campaign message rather than an analysis.',
        'In this issue, the inference is methodological: a community research publication needs a status field and an effective-date field. We have not modeled bank capital, interviewed affected institutions or tested the regulator’s forecasts. Those are reporting gaps, not details to disguise with an authoritative tone.',
      ] },
      { heading: 'An open door to disagreement', paragraphs: [
        'LTC should welcome serious criticism of institutions and serious criticism of blockchain projects. The standard is the same: cite the action, represent competing arguments fairly and separate allegations from findings. Political opinion can be valuable when it is labeled as opinion and does not borrow the voice of neutral reporting.',
        'For the reader, a practical habit is to open the source and underline its verbs. Then circle the dates. A minute spent doing that often answers the most important question before the comment section begins: what actually happened, and what remains undecided?',
      ] },
    ],
    sources: [
      { id: 'fed', label: 'Federal Reserve: September 30, 2026 stress-test announcement', url: 'https://www.federalreserve.gov/newsevents/pressreleases/bcreg20260930a.htm', kind: 'Primary record', note: 'The agency’s announcement links the rules, proposal, implementation dates and separate governor statements.' },
      { id: 'congress', label: 'Congress.gov: the legislative process', url: 'https://www.congress.gov/legislative-process', kind: 'Primary record', note: 'General process guidance; it does not establish the status of a particular bill.' },
    ],
  },
  {
    slug: 'give-the-agent-a-job', desk: 'Builders & AI', deskId: 'builders',
    title: 'Give the agent a job, not the keys',
    dek: 'Useful autonomy starts with a narrow task, a visible trail and a human who can stop the work.',
    classification: 'Field guide', minutes: 4,
    takeaway: 'Separate permission to prepare a decision from permission to execute it. Enforce that separation in the tools.',
    question: 'What is one useful task an agent could finish without knowing anyone’s identity or controlling their money?',
    sections: [
      { heading: 'Make the first assignment small', paragraphs: [
        'Picture a community kitchen planning a Saturday meal. An agent could compare ingredient estimates, translate a volunteer guide or check whether a public source has changed. Those are concrete jobs with reviewable outputs. “Manage everything” is harder to test, harder to stop and much harder to explain after something goes wrong.',
        'Our proposed pattern is a task card: mission, allowed inputs, permitted tools, expected output, human owner and stop condition. A successful agent leaves evidence that another person can inspect. It does not need a human persona, a grand title or access to every account to be useful.',
      ] },
      { heading: 'Permissions are part of the product', paragraphs: [
        'The Model Context Protocol security guidance recommends starting with minimal scopes and adding privileges only when a specific operation requires them. It also describes the larger impact of compromised tokens carrying broad permissions. That is a design concern for the integration, not something a reassuring sentence in an agent prompt can solve.',
        'For LTC, a source-checking agent should be able to retrieve a small set of public records and prepare a diff. Publication authority belongs in a separate step. A malicious instruction found inside a source is content to examine, not permission to change the workflow. The agent’s tools should make unrelated actions unavailable.',
      ], sourceIds: ['mcp'] },
      { heading: 'Payments deserve a separate boundary', paragraphs: [
        'BTCPay Server’s integration guide calls for API keys restricted to needed stores and permissions, kept on the server. It describes invoice creation, authenticated webhooks, safe handling of retries and checks for partial, late or expired payment states. These details matter because seeing a payment-related event is not the same as completing an agreed accounting process.',
        'A future Kalakar payment integration can use that separation: an artist defines an order, a service creates the permitted invoice, and a reconciler checks its state. An editorial or translation agent should not inherit withdrawal capability simply because the project also handles payments. This issue does not activate such an integration.',
      ], sourceIds: ['btcpay'] },
      { heading: 'Design the stop before the start', paragraphs: [
        'A good demonstration includes a failure. Give the agent a missing source, an unexpected response and a conflicting instruction. Check that it records uncertainty, avoids inventing a result and stops at its boundary. Keep logs useful without storing private information merely because storage is cheap.',
        'Speed comes from repeatable, bounded work: many small jobs that can be reviewed in parallel. That is how humans and AI can build together while keeping responsibility legible. The best first milestone is an agent that knows what it cannot conclude.',
      ] },
    ],
    sources: [
      { id: 'mcp', label: 'Model Context Protocol: security best practices', url: 'https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices', kind: 'Technical documentation', note: 'Versioned guidance, including scope minimization; not a certification of this site.' },
      { id: 'btcpay', label: 'BTCPay Server: Greenfield API integration guide', url: 'https://docs.btcpayserver.org/Developers/api/', kind: 'Technical documentation', note: 'The actual deployed instance and permissions must be checked before an integration is activated.' },
    ],
  },
  {
    slug: 'custody-after-the-announcement', desk: 'Custody & security', deskId: 'custody',
    title: 'A custody announcement begins the questions',
    dek: 'An institutional name or a regulatory milestone can matter. It still does not describe every product, entity or recovery path.',
    classification: 'Field guide', minutes: 4,
    takeaway: 'Match the legal entity, service and document date. An issuer announcement is evidence of the issuer’s claim, not independent validation.',
    question: 'If a key person or service were unavailable tomorrow, could the responsible human explain the recovery process?',
    sections: [
      { heading: 'Read the announcement and its neighbor', paragraphs: [
        'BitGo’s December 13, 2025 blog announcement describes its conversion to a federally chartered national trust bank as having full, unconditional approval. The OCC’s December 12 release records conditional approvals for five applications, including BitGo’s conversion. They are different documents from different speakers and dates; readers should follow the regulatory record rather than collapse them into one timeless badge.',
        'We are not concluding that the earlier conditional notice disproves the later company announcement. Nor are we certifying current licensing or any product. This is a reading exercise: keep the chronology and attribution, inspect the specific entity and seek the relevant current record before relying on a regulated-status claim.',
      ], sourceIds: ['bitgo', 'occ'] },
      { heading: 'A brand is not the whole arrangement', paragraphs: [
        'BitGo’s site identifies separately operated affiliated entities and says product availability can vary by entity and jurisdiction. Its disclosures also say digital assets in custody are not covered by FDIC or SIPC protections. Those qualifications belong in the reader’s picture alongside a headline about a charter.',
        'For any proposed community custody arrangement, our working questions would begin with the contracting entity, the assets covered, who can authorize movement and what happens when an operator is unavailable. A glossy interface cannot answer those questions. Neither can a logo borrowed from a counterparty.',
      ], sourceIds: ['bitgo'] },
      { heading: 'Practice the awkward scenario', paragraphs: [
        'Consider a fictional organization whose usual approver is traveling when an urgent request arrives. Who can confirm the request through an independent channel? Can one person override the normal process? Is there a documented pause? These questions expose operational dependencies before anyone has to learn about them during a crisis.',
        'For a future Satnam Satoshi system, the proposal is to test recovery procedures without real funds, write down ownership and approval roles, and review the scope of any service agreement before activation. An agent can help compare documents or flag a missing step. It should not hold recovery material or become the substitute for an accountable signer.',
      ] },
      { heading: 'Evidence without endorsement', paragraphs: [
        'LTC will use issuer blogs to understand what a company says it is building, and primary regulatory records to examine the relevant official action. Independent assessment requires additional work: contracts, applicable jurisdiction, technical review and current facts. This article performs none of those services for an individual reader.',
        'The aim is not to make custody sound mysterious. It is to make responsibility visible. A useful institution can explain who does what, under which conditions, and how a customer can verify the explanation. Our publication should hold itself to a similar standard.',
      ] },
    ],
    sources: [
      { id: 'bitgo', label: 'BitGo: December 13, 2025 OCC approval announcement and disclosures', url: 'https://www.bitgo.com/resources/blog/bitgo-secures-occ-approval/', kind: 'Issuer disclosure', note: 'Company-authored announcement and website disclosures. No partnership, recommendation or independent validation is implied.' },
      { id: 'occ', label: 'OCC: December 12, 2025 conditional approvals', url: 'https://www.occ.treas.gov/news-issuances/news-releases/2025/nr-occ-2025-125.html', kind: 'Primary record', note: 'Dated regulator release with decision letters; not a standalone current-status report.' },
    ],
  },
  {
    slug: 'when-the-same-coin-appears-twice', desk: 'Litecoin & treasury research', deskId: 'litecoin',
    title: 'When the same coin appears twice',
    dek: 'A growing register can help researchers find evidence. Adding every row together can still answer the wrong question.',
    classification: 'Analysis', minutes: 4,
    takeaway: 'Corporate ownership, fund assets, exchange custody and protocol reserves are different categories. Keep them separate.',
    question: 'Does a chart show newly observed information, newly acquired coins, or both? How would you tell?',
    sections: [
      { heading: 'A new report can describe an old balance', paragraphs: [
        'Lite Strategy’s September 29, 2026 results announcement reported 832,716 LTC held as of June 30, 2026. The announcement date and the holdings date answer different questions. This is an issuer-reported historical figure, not our estimate of the company’s October 1 balance or an independently verified wallet total.',
        'That distinction is the starting point for a useful treasury register. A reader should be able to see the entity, what it reports owning, the effective date and the underlying record. If a later report revises the history, the revision should remain visible rather than silently becoming yesterday’s supposed knowledge.',
      ], sourceIds: ['litestrategy'] },
      { heading: 'A map, with the legend attached', paragraphs: [
        'Litecoin Register is community-maintained secondary research. Its own explanation warns that observations update on different schedules, some charts carry prior observations forward, and overlapping entities can count the same coins. Its tracked totals therefore should not be read as a census of distinct coins or proof of complete current coverage.',
        'This makes the register useful as a discovery tool: find a row, inspect the cited source and decide what the row actually measures. A flat chart can mean no new disclosure, not no activity. On-chain observation and legal ownership are also different claims; a visible balance does not by itself settle every ownership question.',
      ], sourceIds: ['register'] },
      { heading: 'The one-coin thought experiment', paragraphs: [
        'Imagine, purely for illustration, that a company owns one coin held with a custodian. One table lists the company’s owned coin. Another lists the custodian’s coin under custody. Adding the two rows produces two counted units, but the story still contains one underlying coin. More rows can mean better coverage of relationships without meaning more distinct assets.',
        'The same conceptual problem can arise when researchers combine product reserves, exchange balances and ecosystem projects. Deduplication requires understanding the relationship, not simply matching names. Where that relationship cannot be established, the honest output is an unresolved overlap, not a confident adjusted total.',
      ] },
      { heading: 'The report we want to build', paragraphs: [
        'Our proposed Litecoin desk separates ownership from custody and keeps source periods, publication dates and retrieval times. It will show unresolved rows and corrections, and link issuer records beside secondary references. The current site does not publish an institutional ranking, a complete Litecoin census or a live treasury index.',
        'The enjoyable part of research is that a small clarification can improve a whole conversation. Before debating whether a total is large or small, ask what is being counted. Often the most valuable contribution is not a bigger number; it is a better label.',
      ] },
    ],
    sources: [
      { id: 'litestrategy', label: 'Lite Strategy: fiscal 2026 results, September 29, 2026', url: 'https://litestrategy.gcs-web.com/news-releases/news-release-details/lite-strategy-reports-fiscal-year-2026-financial-results', kind: 'Issuer disclosure', note: 'The cited 832,716 LTC figure is explicitly effective June 30, 2026. No current holding is inferred.' },
      { id: 'register', label: 'Litecoin Register: database and data-integrity explanation', url: 'https://www.litecoinregister.com/', kind: 'Secondary research', note: 'Discovery reference with stated forward-fill, timing and double-count limits. No affiliation or imported dataset.' },
    ],
  },
  {
    slug: 'a-global-movement-needs-a-local-table', desk: 'Community & the world', deskId: 'community',
    title: 'A global movement needs a local table',
    dek: 'A field guide for a first gathering: one useful lesson, one shared act of service and room for someone who knows nothing about Bitcoin.',
    classification: 'Field guide', minutes: 4,
    takeaway: 'A community event succeeds when participation is useful and welcoming. A wallet should not be the admission ticket.',
    question: 'What could your neighborhood build together before it needs an app, a token or a large audience?',
    sections: [
      { heading: 'Begin with hospitality', paragraphs: [
        'A first meetup does not need a stage or a market forecast. It needs a responsible host, a place people can reach and a reason to feel welcome. The most important person in the room may be the newcomer who is not yet sure whether the conversation is for them.',
        'Langar offers a deeper reference point than a networking format. SGPC describes Guru Ka Langar at Harmandir Sahib as a community kitchen serving visitors without distinctions of religion, caste, creed or nationality. Its account of Guru Nanak’s teaching emphasizes human equality and service to people in need. Satnam Satoshi draws inspiration from that tradition; a software project does not own or replace it.',
      ], sourceIds: ['sgpc', 'gazette'] },
      { heading: 'A small gathering people can reproduce', paragraphs: [
        'Here is our proposed first-meetup format, not an announced event. Start with introductions and an accessible Bitcoin lesson that does not require anyone to buy an asset. Share a meal or join an existing, appropriately supervised service activity. Finish by choosing one practical task that volunteers can complete before the next meeting.',
        'A local host should confirm accessibility, food safety responsibilities, cost, language support and a way to ask questions privately. Those needs vary by place. Global participation means allowing local knowledge to shape the gathering, rather than exporting one rigid schedule and assuming it will suit everyone.',
      ] },
      { heading: 'Give humans and agents distinct work', paragraphs: [
        'An agent might draft a translated invitation, make a checklist or organize public learning resources. A human host checks the language and arrangements. An artist might design an accessible handout. A developer might help a newcomer inspect a source. No one needs to prove commitment by sharing a wallet balance.',
        'A proposed service record can say what was agreed, who checked completion and what evidence may be shared. It should not require identifying a guest who received food. Consent, dignity and modest claims are more useful than turning every act of care into public content. These are design proposals, not reports of completed kitchens or rewards.',
      ] },
      { heading: 'What belongs in the events desk', paragraphs: [
        'Before LTC lists an event, we want a named organizer, a source link, a confirmed time zone, an accessible venue or joining route, and a cancellation contact. We will distinguish our gatherings from independently organized events. The separate global events desk links dated organizer announcements; no Satnam Satoshi attendance or delegation is arranged.',
        'Readers can help by proposing a gathering through the community path and identifying the local human willing to own it. The measure of a good first event is simple: did someone learn something useful, receive care or find a meaningful way to contribute? The rest can grow from there.',
      ] },
    ],
    sources: [
      { id: 'sgpc', label: 'SGPC: Around Harmandir Sahib — Guru Ka Langar', url: 'https://new.sgpc.net/around-harmandir-sahib/', kind: 'Primary record', note: 'An institutional account of the tradition; no endorsement of Satnam Satoshi is implied.' },
      { id: 'gazette', label: 'SGPC Gurdwara Gazette, June 2019', url: 'https://sgpc.net/gazette/2019/June/June-English.pdf', kind: 'Primary record', note: 'Historical and religious context. This publication is not a substitute for community or scholarly interpretation.' },
    ],
  },
  {
    "slug": "sec-crypto-custody-proposal-october-2026",
    "desk": "Public policy & custody",
    "deskId": "policy-current",
    "title": "Custody is back on the rulemaking table",
    "dek": "The SEC’s October 1 proposal puts crypto custody arrangements under discussion. Our reading begins with the action taken, then the questions it leaves open.",
    "classification": "Analysis",
    "minutes": 3,
    "preparedDate": "October 2, 2026",
    "sourceCheckedDate": "October 2, 2026 (America/New_York)",
    "sourceCheckedAt": "2026-10-03T01:25:08Z",
    "takeaway": "A proposed framework is a policy development. It does not establish that a particular custody arrangement is permitted or appropriate.",
    "question": "When an institution says it holds an asset safely, which part of that claim would you want to inspect first?",
    "sections": [
      {
        "heading": "What the agency announced",
        "paragraphs": [
          "On October 1, 2026, the SEC proposed a crypto-asset custody framework for registered investment advisers and regulated funds. Its announcement describes conditional routes for self-custody and the use of state trust companies, alongside changes to adviser audits and fund custodial services.",
          "The stated comment window runs for 60 days after the proposing release appears in the Federal Register. We have not established that publication date, so we do not calculate a closing deadline. This is a proposal, not a final rule or a determination about any reader’s arrangement."
        ],
        "sourceIds": [
          "sec-custody"
        ]
      },
      {
        "heading": "Read the argument as an argument",
        "paragraphs": [
          "In a separate October 1 statement, SEC Chairman Paul S. Atkins argues that existing custody provisions have lagged crypto markets and that a tailored framework would give advisers and funds greater clarity. That is the chair’s rationale for the proposal; it is not evidence that its intended outcomes have already happened.",
          "Our analysis: a useful policy story preserves that distance. An institution can explain what it wants a rule to achieve while readers examine whether the mechanism supports the promise. The interesting work begins when the aim, the proposed conditions and the evidence are placed next to one another."
        ],
        "sourceIds": [
          "atkins"
        ]
      },
      {
        "heading": "Two questions that should stay separate",
        "paragraphs": [
          "For a newcomer, it helps to separate authority from capability. One question is who is allowed to perform a role under the relevant rules. Another is who can actually authorize a transfer, recover access or stop a mistaken instruction. A confident answer to one question should not be substituted for evidence about the other.",
          "For an experienced Bitcoiner, our proposed reading exercise is to draw the responsibility chain: client, adviser, custodian, software operator and approver. Mark where each role begins, which evidence describes it, and what remains unknown. This is an analytical worksheet, not a conclusion about the proposal’s legal application or the safety of a named provider."
        ]
      },
      {
        "heading": "A question for the community treasury",
        "paragraphs": [
          "Imagine a fictional community organization comparing two custody designs. One has a polished dashboard; the other has a careful recovery rehearsal. The useful comparison would ask what each design demonstrates and what still needs testing. A logo, an interface or an article about regulation cannot stand in for that work.",
          "For Satnam Satoshi, this preview opens a research question rather than a financial action. Readers can contribute a dated source or a clearer explanation of an assumption. A future arrangement still needs accountable people and appropriate review. We have not assessed the full proposed rule text, certified a provider or changed any custody setup."
        ]
      }
    ],
    "sources": [
      {
        "id": "sec-custody",
        "label": "SEC release 2026-100: crypto custody proposal",
        "url": "https://www.sec.gov/newsroom/press-releases/2026-100-sec-proposal-would-address-how-investment-advisers-funds-can-custody-crypto-assets-under-federal",
        "kind": "Primary record",
        "note": "Agency announcement dated October 1, 2026. Proposal, not final rule. Full proposed-rule text and Federal Register publication date were not assessed in this preview."
      },
      {
        "id": "atkins",
        "label": "Paul S. Atkins: October 1 custody-proposal statement",
        "url": "https://www.sec.gov/newsroom/speeches-statements/atkins-crypto-custody-100126-statement-proposal-address-custody-crypto-assets-under-investment-advisers-act-investment-company",
        "kind": "Primary record",
        "note": "Attributed policy rationale from the SEC chair, dated October 1, 2026. It is distinct from the agency action and from LTC’s analysis."
      }
    ]
  },
  {
    "slug": "lnd-0214-reading-a-release",
    "desk": "Lightning & open-source builders",
    "deskId": "builders-current",
    "title": "A Lightning release, read one boundary at a time",
    "dek": "LND v0.21.4-beta arrived on October 1. Its release record offers a useful exercise in how open-source changes become understandable, testable evidence.",
    "classification": "Field guide",
    "minutes": 3,
    "preparedDate": "October 2, 2026",
    "sourceCheckedDate": "October 2, 2026 (America/New_York)",
    "sourceCheckedAt": "2026-10-03T01:25:08Z",
    "takeaway": "A release note describes intended changes. Reading it carefully is different from verifying a binary, testing a deployment or deciding to upgrade.",
    "question": "Could a newcomer explain one software change accurately after a technical contributor showed them the source?",
    "sections": [
      {
        "heading": "Begin with an identifiable release",
        "paragraphs": [
          "The lightningnetwork/lnd repository lists v0.21.4-beta as released on October 1, 2026. Its release page points to notes, signed manifests and verification guidance. This article links the notes at that version’s tag, so the reading reference is tied to the release rather than a moving development branch.",
          "For a first-time reader, try a modest goal: identify the project, the exact version and the date before deciding what the headline means. You do not need a funded node to learn how a software project explains its work. A useful reading habit can begin with a source link and a blank page."
        ],
        "sourceIds": [
          "lnd-release"
        ]
      },
      {
        "heading": "Follow the edge of a change",
        "paragraphs": [
          "The tagged notes describe stricter BOLT 11 invoice decoding: more than one payment-hash field is rejected. They also report that LND no longer opens or accepts new channels with the legacy commitment type, while existing channels of that type continue operating. These are distinct changes with different boundaries.",
          "The same notes describe explicit channel-type negotiation and fixes involving pending HTLCs and invoice processing. This is a selected summary, not a complete change log or an independently tested security assessment. The linked record gives technical readers the associated changes to inspect."
        ],
        "sourceIds": [
          "lnd-notes"
        ]
      },
      {
        "heading": "Turn a release into a learning exercise",
        "paragraphs": [
          "Our suggested exercise has two columns: what changed, and what the evidence does not establish. In the first, describe one behavior precisely. In the second, record questions about compatibility, application assumptions or testing. This keeps a version announcement from becoming an all-purpose assurance about a system you have not examined.",
          "For an experienced contributor, write one small test case on paper: an input, the expected behavior and the evidence supporting that expectation. Then explain it to someone new to Lightning without requiring them to memorize every abbreviation. Good technical communication makes a boundary easier to inspect."
        ]
      },
      {
        "heading": "Verification is work with an owner",
        "paragraphs": [
          "The release page documents manifest-signature and archive-hash checks, along with reproducible-build guidance. Those are procedures readers can inspect. We have read the documentation; we have not downloaded, rebuilt or independently verified these binaries for this article.",
          "Our editorial conclusion is simple: curiosity can move faster than deployment. A community can learn from the release today while an accountable operator separately decides what applies to a particular system. This field guide is not an upgrade instruction and does not operate a Lightning node, move funds or certify a production setup."
        ],
        "sourceIds": [
          "lnd-release"
        ]
      }
    ],
    "sources": [
      {
        "id": "lnd-release",
        "label": "LND v0.21.4-beta: official release record",
        "url": "https://github.com/lightningnetwork/lnd/releases/tag/v0.21.4-beta",
        "kind": "Primary record",
        "note": "October 1, 2026 release. Source and instructions were inspected; no binary verification or deployment was performed by LTC."
      },
      {
        "id": "lnd-notes",
        "label": "LND v0.21.4-beta: version-tagged release notes",
        "url": "https://raw.githubusercontent.com/lightningnetwork/lnd/v0.21.4-beta/docs/release-notes/release-notes-0.21.4.md",
        "kind": "Technical documentation",
        "note": "Version-tagged notes, checked October 2 in New York (October 3 UTC). Our selected summary is not a full compatibility assessment."
      }
    ]
  },
];
export const articleHref = (slug: string) => `/conversations/read/${slug}/`;
export const morningReading = ['read-the-verb-before-the-headline', 'three-clocks-of-a-bitcoin-fund', 'when-the-same-coin-appears-twice'];
export const eveningReading = ['checking-for-yourself', 'give-the-agent-a-job', 'a-global-movement-needs-a-local-table'];
