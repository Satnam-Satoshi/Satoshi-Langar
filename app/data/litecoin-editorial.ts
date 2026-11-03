/**
 * Manually researched editorial context. Never treat checkedAt as a news/event date
 * or use these records as a live metric adapter. Daily editions retain their own data.
 */
export type LitecoinSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  checkedAt: string;
  classification: 'primary announcement' | 'project documentation' | 'project directory' | 'official profile';
  note: string;
};

export type LitecoinStory = {
  id: string;
  kicker: string;
  title: string;
  dek: string;
  status: string;
  eventDate: string | null;
  paragraphs: string[];
  takeaway: string;
  sourceIds: string[];
};

export type LitecoinProject = {
  id: string;
  name: string;
  category: 'Protocol' | 'Privacy' | 'Payments' | 'Builders' | 'Knowledge' | 'Culture' | 'Security';
  relationship: 'Foundation initiative' | 'Foundation-listed ecosystem project' | 'Independent ecosystem project';
  status: string;
  summary: string;
  limitation: string;
  sourceUrl: string;
  sourceDate: string | null;
  checkedAt: string;
};

const checkedAt = '2026-10-04';

export const litecoinEditorialMeta = {
  checkedAt,
  title: 'The Litecoin fieldbook',
  dek: 'Money, privacy and the people building the next useful thing.',
  classification: 'AI-prepared explainer · Human editorial review pending',
  independence: 'Independent coverage by LTC Media, a Satnam Satoshi project. We are not the Litecoin Foundation, its spokesperson or an affiliated publication.',
  method: 'Primary-source context checked October 4, 2026. Each announcement keeps its original date. Project listings describe the source’s stated stage; they are not audits, investment recommendations or a live news feed.',
  directoryUrl: 'https://litecoin.com/projects',
  newsUrl: 'https://litecoin.com/news',
} as const;

export const litecoinSources: LitecoinSource[] = [
  { id: 'foundation', title: 'About the Litecoin Foundation', publisher: 'Litecoin Foundation', url: 'https://litecoin.com/litecoin-foundation', publishedAt: null, checkedAt, classification: 'project documentation', note: 'Mission and participation routes. No publication date is displayed.' },
  { id: 'projects', title: 'Foundation project directory', publisher: 'Litecoin Foundation', url: 'https://litecoin.com/projects', publishedAt: null, checkedAt, classification: 'project directory', note: 'A changing directory of open-source and completed projects. Funding counters are not reproduced or independently reconciled.' },
  { id: 'mweb-activation', title: 'MWEB activation announcement', publisher: 'Litecoin Foundation', url: 'https://litecoin.com/news/mweb-has-officially-activated', publishedAt: '2022-05-20', checkedAt, classification: 'primary announcement', note: 'Historical announcement reporting activation at block 2,257,920. The article date is not an exact activation timestamp.' },
  { id: 'mweb-project', title: 'MWEB development overview', publisher: 'Litecoin Foundation', url: 'https://litecoin.com/projects/mweb', publishedAt: null, checkedAt, classification: 'project documentation', note: 'Explains optional confidential transactions and pruning; not a guarantee of anonymity or current network safety.' },
  { id: 'mweb-postmortem', title: 'MWEB security incident postmortem', publisher: 'David Burkett / Litecoin Foundation', url: 'https://litecoin.com/news/litecoin-mweb-security-incident-postmortem', publishedAt: '2026-04-28', checkedAt, classification: 'primary announcement', note: 'Developer account of March and April 2026 incidents, recovery and fixes. No independent chain reconstruction was performed for this fieldbook.' },
  { id: 'nexus-launch', title: 'Nexus Wallet launch', publisher: 'Litecoin Foundation', url: 'https://litecoin.com/news/nexus-wallet-for-litecoin-released-on-android-and-ios', publishedAt: '2025-06-06', checkedAt, classification: 'primary announcement', note: 'Foundation wallet launch; the same announcement scheduled Litewallet’s sunset for December 31, 2025.' },
  { id: 'nexus-update', title: 'Nexus gift-card update', publisher: 'Litecoin Foundation', url: 'https://litecoin.com/news/nexus-wallet-update-making-the-future-of-litecoin-payments-more-powerful', publishedAt: '2026-05-28', checkedAt, classification: 'primary announcement', note: 'Attributed product announcement. Regional availability, merchant acceptance and present app behavior were not tested.' },
  { id: 'litvm-testnet', title: 'Welcome to LiteForge', publisher: 'LitVM', url: 'https://www.litvm.com/blog/welcome-to-liteforge', publishedAt: '2026-04-17', checkedAt, classification: 'primary announcement', note: 'Project announcement of its testnet. Testnet availability is not evidence of a production mainnet.' },
  { id: 'litvm-network', title: 'LitVM network status and parameters', publisher: 'LitVM', url: 'https://docs.litvm.com/get-started-on-testnet/add-to-wallet', publishedAt: null, checkedAt, classification: 'project documentation', note: 'Lists LiteForge testnet and identifies mainnet as coming soon, with launch date TBD. Read-only research; no wallet connection or RPC test.' },
  { id: 'litvm-architecture', title: 'LitVM architecture', publisher: 'LitVM', url: 'https://docs.litvm.com/overview/architecture', publishedAt: null, checkedAt, classification: 'project documentation', note: 'Project-described stack and phased roadmap. A design claim is not independently verified deployment, throughput or bridge security.' },
  { id: 'litvm-privacy', title: 'Introducing Litecoin Web3 Privacy', publisher: 'LitVM', url: 'https://www.litvm.com/blog/introducing-litecoin-web3-privacy', publishedAt: '2026-08-26', checkedAt, classification: 'primary announcement', note: 'Announces a privacy initiative with planned SilentSwap support for LTC and zkLTC. Does not establish completed production integration or MWEB interoperability.' },
  { id: 'litvm-summit', title: 'Litecoin Summit 2025 recap', publisher: 'Litecoin Foundation', url: 'https://litecoin.com/news/litecoin-summit-2025-recap', publishedAt: '2025-06-29', checkedAt, classification: 'primary announcement', note: 'Foundation coverage of LitVM’s presentation; historical stack description. Current architecture docs take precedence for the fieldbook.' },
  { id: 'foundation-x', title: 'Litecoin Foundation on X', publisher: 'Litecoin Foundation', url: 'https://x.com/LTCFoundation', publishedAt: null, checkedAt, classification: 'official profile', note: 'Identity cross-linked from litecoin.com. Profile retrieval returned HTTP 403; no current timeline is claimed.' },
  { id: 'litvm-x', title: 'LitVM on X', publisher: 'LitVM', url: 'https://x.com/LitecoinVM', publishedAt: null, checkedAt, classification: 'official profile', note: 'Account linked by LitVM’s network documentation. A profile link, not a verified current post feed.' },
];

export const litecoinStories: LitecoinStory[] = [
  {
    id: 'foundation', kicker: 'The people behind the tools', title: 'A foundation. An open network. Different jobs.',
    dek: 'Supporting developers and welcoming users is work a community can see.',
    status: 'Foundation mission and project listings', eventDate: null,
    paragraphs: [
      'The Litecoin Foundation describes its mission as adoption, awareness and development. Its public project directory gives readers a place to follow software, education and contributor work.',
      'A directory entry tells us a project is listed. It does not make every project Foundation-owned, independently audited or ready for production. Our fieldbook keeps those distinctions visible.',
    ],
    takeaway: 'A useful contribution can be a reviewed explanation, reproducible bug report or documentation improvement. Begin with the project’s own contribution guidance.',
    sourceIds: ['foundation', 'projects'],
  },
  {
    id: 'mweb', kicker: 'Privacy, drawn simply', title: 'One coin. An optional confidential route.',
    dek: 'MWEB changes what a public observer can see when supported wallets use Litecoin’s extension blocks.',
    status: 'Activated protocol feature · Historical explainer', eventDate: '2022-05-20',
    paragraphs: [
      'The Foundation reported MWEB activation in May 2022. Users can keep using transparent Litecoin transactions or use supported wallets to move into the extension-block system.',
      'Inside MWEB, transaction amounts are concealed and old transaction data can be pruned. Entering and leaving that system are separate steps. Confidentiality is a property to understand, not a promise that every surrounding activity becomes anonymous.',
    ],
    takeaway: 'Ask which wallet path is supported, what remains visible at the boundaries, and which software version you are using.',
    sourceIds: ['mweb-activation', 'mweb-project', 'mweb-postmortem'],
  },
  {
    id: 'mweb-security', kicker: 'The security record belongs in the story', title: 'Privacy needs scrutiny, too.',
    dek: 'An April 28, 2026 developer postmortem documents the March exploit and a later April disruption.',
    status: 'Historical developer report · Not a current incident alert', eventDate: '2026-04-28',
    paragraphs: [
      'David Burkett’s postmortem describes a validation flaw, an inflated pegout, coordinated recovery and a later denial-of-service/reorganization incident. It reports fixes, including Litecoin Core 0.21.5.4 for the April failure mode.',
      'We link the developer’s account so readers can inspect the response and its tradeoffs. This summary is not an independent audit, a current version recommendation or a claim that all future risks are resolved.',
    ],
    takeaway: 'Read the repair history beside the feature description. A transparent security record makes a stronger learning resource.',
    sourceIds: ['mweb-postmortem'],
  },
  {
    id: 'litvm', kicker: 'Builder’s notebook', title: 'What if Litecoin met an application layer?',
    dek: 'LitVM aims to bring familiar Ethereum-style development tools to a Litecoin-focused rollup ecosystem.',
    status: 'LiteForge testnet documented · Mainnet TBD', eventDate: '2026-04-17',
    paragraphs: [
      'LitVM announced its LiteForge testnet on April 17, 2026. Its network documentation still labels mainnet as coming soon with a date to be determined. A test environment gives developers a place to learn; it does not prove a production system is ready.',
      'The current architecture describes Arbitrum Nitro execution, Succinct SP1 proofs, Espresso sequencing and BitcoinOS Grail bridging. Its roadmap starts with Ethereum settlement and targets Litecoin settlement later. These are project-described components and phases, not an LTC Media deployment audit.',
    ],
    takeaway: 'Separate execution, bridging and settlement. The coin’s name alone does not tell you which system or assumptions secure an application.',
    sourceIds: ['litvm-testnet', 'litvm-network', 'litvm-architecture', 'litvm-summit'],
  },
  {
    id: 'litvm-privacy', kicker: 'An announcement to follow', title: 'A privacy roadmap beyond one protocol.',
    dek: 'LitVM’s August update describes planned SilentSwap interoperability for LTC and zkLTC.',
    status: 'Project announcement · Implementation not independently verified', eventDate: '2026-08-26',
    paragraphs: [
      'On August 26, 2026, LitVM announced a Web3 privacy initiative and identified SilentSwap as an early participant. Its article describes planned support for both LTC and zkLTC.',
      'This is a separate ecosystem initiative from Litecoin’s activated MWEB feature. The announcement does not by itself verify a live production integration, bridge safety, current liquidity or direct MWEB compatibility.',
    ],
    takeaway: 'Follow the announced work through versioned releases and deployment evidence before calling a roadmap item complete.',
    sourceIds: ['litvm-privacy', 'litvm-network'],
  },
  {
    id: 'nexus', kicker: 'From protocol to everyday use', title: 'The wallet is where the story becomes usable.',
    dek: 'Nexus connects the Foundation’s mobile-wallet work with Litecoin’s payment and privacy features.',
    status: 'Foundation product announcements', eventDate: '2026-05-28',
    paragraphs: [
      'The Foundation announced Nexus for Android and iOS on June 6, 2025. Its May 28, 2026 update announced in-app gift-card purchases, alongside its existing payments and optional privacy features.',
      'The original launch notice scheduled the older Litewallet app’s sunset for December 31, 2025. This fieldbook points readers to current official product information instead of presenting the older wallet as a newly maintained release.',
    ],
    takeaway: 'A product announcement describes the maker’s claim. Availability, compatibility and the user’s own recovery arrangements still need individual checking.',
    sourceIds: ['nexus-launch', 'nexus-update'],
  },
];

export const litecoinSystemLayers = [
  { id: 'base', label: 'Litecoin', role: 'Base network', detail: 'Full nodes verify the chain’s rules. The Foundation supports development; it is not the network itself.', stage: 'Established network', sourceIds: ['foundation', 'projects'] },
  { id: 'mweb', label: 'MWEB', role: 'Optional extension blocks', detail: 'A confidential transaction route within Litecoin’s protocol, with its own wallet support and security history.', stage: 'Activated feature', sourceIds: ['mweb-activation', 'mweb-postmortem'] },
  { id: 'litvm', label: 'LitVM', role: 'Application ecosystem', detail: 'A separate rollup design and testnet. Bridges and the planned settlement phases add distinct assumptions.', stage: 'Testnet / phased roadmap', sourceIds: ['litvm-network', 'litvm-architecture'] },
] as const;

export const litecoinMwebFlow = [
  { label: 'Transparent Litecoin', detail: 'Ordinary main-chain activity remains available.' },
  { label: 'Peg in', detail: 'A supported wallet moves LTC into MWEB.' },
  { label: 'Confidential transfer', detail: 'Amounts are concealed within MWEB.' },
  { label: 'Peg out', detail: 'LTC returns to the transparent chain.' },
] as const;

export const litecoinLitvmRoadmap = [
  { step: '01', label: 'Ethereum settlement', detail: 'The project’s proposed first mainnet phase combines a rollup and bridges.' },
  { step: '02', label: 'Proof anchoring', detail: 'The roadmap targets an audit trail anchored to Litecoin.' },
  { step: '03', label: 'Litecoin settlement', detail: 'Native settlement is a later target, not a verified current deployment.' },
] as const;

export const litecoinProjects: LitecoinProject[] = [
  { id: 'foundation-fund', name: 'Foundation Projects Fund', category: 'Builders', relationship: 'Foundation initiative', status: 'Project-support portal', summary: 'A public home for open-source proposals and contributor funding.', limitation: 'Listing and funding are not an audit or a promise of completion.', sourceUrl: 'https://litecoin.com/projects', sourceDate: null, checkedAt },
  { id: 'core', name: 'Litecoin Core', category: 'Protocol', relationship: 'Foundation-listed ecosystem project', status: 'Full-node software', summary: 'The software layer for verifying Litecoin blocks and transactions.', limitation: 'Read official release notes for version-specific guidance.', sourceUrl: 'https://litecoin.com/projects/core', sourceDate: null, checkedAt },
  { id: 'mweb', name: 'MWEB', category: 'Privacy', relationship: 'Foundation-listed ecosystem project', status: 'Activated feature; continuing development', summary: 'Optional confidential transactions and data-pruning work.', limitation: 'Read the dated security postmortem alongside the feature overview.', sourceUrl: 'https://litecoin.com/projects/mweb', sourceDate: null, checkedAt },
  { id: 'nexus', name: 'Nexus Wallet', category: 'Payments', relationship: 'Foundation initiative', status: 'Mobile wallet announced', summary: 'The Foundation’s mobile app connects Litecoin payments and optional privacy tools.', limitation: 'Product and regional capabilities were not tested by LTC Media.', sourceUrl: 'https://litecoin.com/news/nexus-wallet-update-making-the-future-of-litecoin-payments-more-powerful', sourceDate: '2026-05-28', checkedAt },
  { id: 'development-kit', name: 'Litecoin Development Kit', category: 'Builders', relationship: 'Foundation-listed ecosystem project', status: 'Public prototype; review pending', summary: 'Descriptor-wallet libraries with native MWEB work and language bindings.', limitation: 'The listing says independent review of the funds path is not complete. This is not Lightning Dev Kit.', sourceUrl: 'https://litecoin.com/projects/litecoin-dev-kit', sourceDate: null, checkedAt },
  { id: 'core-bounty', name: 'Core security bounty', category: 'Security', relationship: 'Foundation-listed ecosystem project', status: 'Funding pool; submissions not yet open', summary: 'A proposed pool for responsibly disclosed Litecoin Core and MWEB findings.', limitation: 'The page says reporting scope and reward rules must be published before submissions are accepted.', sourceUrl: 'https://litecoin.com/projects/bounty-litecoin-core', sourceDate: null, checkedAt },
  { id: 'knowledge', name: 'Litecoin Knowledge Hub', category: 'Knowledge', relationship: 'Foundation-listed ecosystem project', status: 'Integration and polish campaign', summary: 'A proposed conversational learning tool grounded in a managed knowledge base.', limitation: 'The listing describes core work as built; public launch and answer accuracy were not tested.', sourceUrl: 'https://litecoin.com/projects/litecoin-knowledge-hub', sourceDate: null, checkedAt },
  { id: 'space', name: 'Litecoin Space', category: 'Knowledge', relationship: 'Foundation-listed ecosystem project', status: 'Explorer project listed', summary: 'A mempool and blockchain explorer for following transactions and the fee market.', limitation: 'A directory entry is not a verified current network measurement.', sourceUrl: 'https://litecoin.com/projects/litecoin-space-mempool', sourceDate: null, checkedAt },
  { id: 'ltcsuite', name: 'MWEB in LTCSuite', category: 'Builders', relationship: 'Foundation-listed ecosystem project', status: 'Funding campaign listed', summary: 'Work on MWEB support and a reference for light-client integration.', limitation: 'The campaign text does not certify current integration completeness.', sourceUrl: 'https://litecoin.com/projects/mweb-support-ltcsuite-funding-campaign', sourceDate: null, checkedAt },
  { id: 'electrum', name: 'Electrum-LTC', category: 'Payments', relationship: 'Foundation-listed ecosystem project', status: 'Wallet project listed', summary: 'A lightweight Litecoin wallet project in the Foundation directory.', limitation: 'Listing does not establish current release security or maintenance cadence.', sourceUrl: 'https://litecoin.com/projects/electrum-ltc', sourceDate: null, checkedAt },
  { id: 'electrum-upgrade', name: 'Electrum-LTC upgrade bounty', category: 'Builders', relationship: 'Foundation-listed ecosystem project', status: 'Upgrade proposal listed', summary: 'A separate campaign to modernize the wallet’s upstream codebase.', limitation: 'Its older version target is historical campaign context, not a current version recommendation.', sourceUrl: 'https://litecoin.com/projects/bounty-upgrade-electrum-ltc', sourceDate: null, checkedAt },
  { id: 'computer', name: 'Litecoin Computer', category: 'Builders', relationship: 'Foundation-listed ecosystem project', status: 'Smart-contract project listed', summary: 'A JavaScript-based application project also known as Bitcoin Computer.', limitation: 'It is distinct from LitVM. Listing does not verify deployed application safety.', sourceUrl: 'https://litecoin.com/projects/litecoin-computer-smart-contracts', sourceDate: null, checkedAt },
  { id: 'ordinals', name: 'Ordinals Lite', category: 'Culture', relationship: 'Foundation-listed ecosystem project', status: 'Tooling project listed', summary: 'An index, explorer and command-line tooling for Litecoin digital artifacts.', limitation: 'Coverage makes no claim about collectible scarcity, price or returns.', sourceUrl: 'https://litecoin.com/projects/ordinals-lite', sourceDate: null, checkedAt },
  { id: 'stack', name: 'Stack Wallet', category: 'Payments', relationship: 'Foundation-listed ecosystem project', status: 'Wallet project listed', summary: 'An ecosystem wallet initiative listed for Litecoin privacy and coin-control work.', limitation: 'Its current feature set was not independently tested.', sourceUrl: 'https://litecoin.com/projects/stackwallet', sourceDate: null, checkedAt },
  { id: 'btcpay-mweb', name: 'MWEB support for BTCPay', category: 'Payments', relationship: 'Foundation-listed ecosystem project', status: 'Marked completed in the directory', summary: 'A campaign for MWEB support in Litecoin payment processing.', limitation: 'Completed is the directory’s status; each installation still has its own version and configuration.', sourceUrl: 'https://litecoin.com/projects/bounty-btcpay-mweb', sourceDate: null, checkedAt },
  { id: 'litvm', name: 'LitVM / LiteForge', category: 'Builders', relationship: 'Independent ecosystem project', status: 'Testnet documented; mainnet TBD', summary: 'An EVM application-layer project covered in the Foundation’s Summit recap.', limitation: 'LitVM states Foundation endorsement; this does not make it Foundation-owned or audited by LTC Media.', sourceUrl: 'https://docs.litvm.com/get-started-on-testnet/add-to-wallet', sourceDate: null, checkedAt },
];

export const litecoinSocialChannels = [
  { id: 'foundation', name: 'Litecoin Foundation', handle: '@LTCFoundation', url: 'https://x.com/LTCFoundation', verifiedByUrl: 'https://litecoin.com/projects', checkedAt, note: 'Official account linked by the Foundation. Open X to read its current posts; no live feed is reproduced here.' },
  { id: 'litvm', name: 'LitVM', handle: '@LitecoinVM', url: 'https://x.com/LitecoinVM', verifiedByUrl: 'https://docs.litvm.com/get-started-on-testnet/add-to-wallet', checkedAt, note: 'Project account identified in LitVM’s docs. Project updates are attributed statements, not independent verification.' },
] as const;

/** Historical index-visible post only; never present it as today’s feed. */
export const litecoinSocialPosts = [
  {
    id: 'foundation-2025-09-10', account: '@LTCFoundation',
    url: 'https://x.com/LTCFoundation/status/1965834973577109664',
    publishedAt: '2025-09-10', checkedAt,
    title: 'From the Foundation’s archive',
    summary: 'The Foundation shared a Charlie Lee interview on Litecoin and corporate treasury adoption.',
    status: 'Historical post · Search-index text verified; live page body unavailable',
    note: 'A link to the original post, not a current headline or a reproduced social timeline.',
  },
] as const;

export const litecoinParticipation = [
  { title: 'Learn the network', detail: 'Start with plain-language explanations, then inspect the primary sources.', href: '/sikh-bitcoin/' },
  { title: 'Follow the builders', detail: 'Use the Foundation directory to find the project and its actual contribution process.', href: 'https://litecoin.com/projects' },
  { title: 'Improve this fieldbook', detail: 'Prepare a source, correction or visual explanation for LTC Media.', href: '/join/?path=ltc' },
] as const;
