import path from 'node:path';
import { readCommunityArchive } from '../../scripts/lib/community-archive.mjs';

type Snapshot = { collectedAt: string; sourceStatus: { id: string; sourceName: string; url: string; status: string; checkedAt: string|null; errorCode: string|null; sha256: string|null }[]; items: { id: string; sourceName: string; title: string; url: string; publishedAt: string; summaryClassification: string }[] };
export const communityArchive = readCommunityArchive(path.join(process.cwd(),'content/ltc-community/archive')) as { id:string; snapshot:Snapshot; sha256:string }[];
export const communityDate = (date:string) => new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'UTC'}).format(new Date(date));
export const communityArchiveHref = (id:string) => `/conversations/community/records/${id}/`;

// These are a requested reading directory, not claims that the accounts follow,
// endorse or partner with LTC Media. The source links explain identity scope.
export const communityDirectory = [
 {handle:'SatoshiLite',name:'Charlie Lee',desk:'History & ideas',why:'Litecoin’s origin and the long view.',source:'https://litecoin.com/litecoin-foundation'},
 {handle:'LTCFoundation',name:'Litecoin Foundation',desk:'Foundation',why:'Education, projects and community announcements.',source:'https://litecoin.com/'},
 {handle:'litecoin',name:'Litecoin',desk:'Network & community',why:'A starting point for the wider Litecoin conversation.',source:'https://litecoin.org/'},
 {handle:'indigo_nakamoto',name:'Indigo Nakamoto',desk:'Open-source builders',why:'Explore public development work and explainers.',source:'https://github.com/IndigoNakamoto'},
 {handle:'DavidBurkett38',name:'David Burkett',desk:'Privacy & engineering',why:'Developer work and the history of MWEB.',source:'https://litecoin.com/litecoin-foundation'},
 {handle:'nexuswallet',name:'Nexus',desk:'Wallets & payments',why:'Release records and the experience of using Litecoin.',source:'https://github.com/litecoin-foundation/nexus'},
 {handle:'LitecoinVM',name:'LitVM',desk:'Ecosystem builders',why:'Testnets, proposals and the project’s own roadmap.',source:'https://docs.litvm.com/overview/usdlitvm-and-usdzkltc'},
 {handle:'DaddyCool1991',name:'David Schwartz',desk:'Community & events',why:'Conversations connecting builders and communities.',source:'https://cfp.powsummit.com/2024/speaker/KTGYJP/'},
 {handle:'MASTERBTCLTC',name:'Master',desk:'Books & ideas',why:'Long-form Litecoin writing; distinguish an author’s argument from fact.',source:'https://www.lookintolitecoin.com/'},
 {handle:'loshan',name:'Loshan · requested handle',desk:'Identity check pending',why:'The founder requested this handle. A Foundation project page uses @loshan1212; continuity has not been verified.',source:'https://litecoin.com/projects/bounty-port-mempool-space'},
 {handle:'LuxxfolioH',name:'LUXXFOLIO · requested handle',desk:'Institutional records',why:'Start with dated company disclosures, and separate holdings from flows.',source:'https://luxxfolio.com/'},
 {handle:'LiteStrategy',name:'Lite Strategy · requested handle',desk:'Institutional records',why:'Company announcements belong beside their original filings.',source:'https://litestrategy.gcs-web.com/'},
 {handle:'CanaryFunds',name:'Canary · requested handle',desk:'Funds & disclosures',why:'Read product documents and their dates before drawing conclusions.',source:'https://canary.capital/'}
] as const;

export const selectedCommunityReading = [
 {id:'litvm-privacy',date:'2026-08-26',source:'LitVM',label:'Project announcement',title:'A privacy proposal, in its own words.',summary:'LitVM announced a planned privacy initiative involving SilentSwap and support for LTC and zkLTC. Its future-tense roadmap is a useful place to ask what has actually shipped.',limit:'This announcement does not establish a live integration, an independent audit or a privacy guarantee.',url:'https://www.litvm.com/blog/introducing-litecoin-web3-privacy',learn:'/conversations/litecoin/',learnLabel:'Build your Litecoin context',mark:'◎'},
 {id:'nexus-payments',date:'2026-05-28',source:'Litecoin Foundation',label:'Product announcement',title:'Payments are a user experience.',summary:'The Foundation announced gift-card purchasing in Nexus. The story connects payment interfaces with the everyday question of where and how a coin can be used.',limit:'Availability and merchant coverage were not independently tested. This is a May announcement, not a new feature report.',url:'https://litecoin.com/news/nexus-wallet-update-making-the-future-of-litecoin-payments-more-powerful',learn:'/miikey/',learnLabel:'Understand wallet responsibilities',mark:'↗'},
 {id:'liteforge-testnet',date:'2026-04-17',source:'LitVM',label:'Testnet guide',title:'A testnet is a place to ask better questions.',summary:'LitVM’s LiteForge introduction describes its testnet hub, faucet and developer documentation. It is a dated starting point for understanding the project’s development process.',limit:'A testnet guide is not evidence of mainnet readiness. No wallet connection or software installation is needed to read it.',url:'https://www.litvm.com/blog/welcome-to-liteforge',learn:'/technology/',learnLabel:'Explore open technology',mark:'⌘'},
 {id:'summit-learning',date:'2025-06-29',source:'Litecoin Foundation',label:'Learning archive',title:'Keep the conversations that built the community.',summary:'The Foundation’s recap of the May 29–30, 2025 Litecoin Summit links recorded discussions about Charlie Lee, Nexus, LitVM, Litecoin Computer and atomic swaps.',limit:'This is the organizer’s account of a past event. A statement made there does not establish a project’s present availability.',url:'https://litecoin.com/news/litecoin-summit-2025-recap',learn:'/conversations/specials/charlie-lee/',learnLabel:'Read the Charlie Lee special',mark:'✳'}
] as const;
