import type { ReactNode } from 'react';
import styles from './ltc-visual-explainer.module.css';

type Diagram = 'snapshot' | 'stockflow' | 'claims' | 'mweb' | 'lightning' | 'timechain' | 'market' | 'policy' | 'newsroom' | 'ecosystem' | 'balance';
type Step = readonly [label: string, detail: string];
type Explainer = { diagram: Diagram; title: string; insight: string; check: string; steps: readonly [Step, Step, Step] };

/** Conceptual illustrations only. The source-backed desk text supplies dated evidence. */
const explainers: Record<string, Explainer> = {
  'market-opening': {
    diagram: 'snapshot', title: 'A price needs a place. And a clock.',
    insight: 'One venue’s last trade is a sampled observation, not a universal price.',
    check: 'Read the pair, venue and exact trade time together.',
    steps: [['Identify', 'Match the asset, currency pair and trading venue.'], ['Observe', 'Keep the trade time separate from the collection time.'], ['Compare', 'Use the same units and a defined window before calculating change.']],
  },
  'sec-cftc': {
    diagram: 'policy', title: 'A proposal is the beginning of a question.',
    insight: 'A proposal can change or be withdrawn. It does not establish the final rule.',
    check: 'Keep agency, docket, legal status and effective date visible.',
    steps: [['Proposal', 'An agency puts a proposed action into the public record.'], ['Public process', 'Comments and later agency actions belong to the same dated record.'], ['Final action', 'If a final rule follows, inspect its scope and effective date separately.']],
  },
  'bitcoin-etf-flows': {
    diagram: 'stockflow', title: 'A balance is not a flow.',
    insight: 'A higher dollar balance can reflect a price change without new investor money.',
    check: 'A flow needs a defined session, complete universe and stated method.',
    steps: [['Price', 'A quote values an asset at a particular moment.'], ['Holdings', 'A balance counts assets held at a disclosed cutoff.'], ['Flow', 'Net creations and redemptions describe movement during an interval.']],
  },
  'bitcoin-products': {
    diagram: 'claims', title: 'What does the security actually represent?',
    insight: 'Buying a security and holding native Bitcoin are different ownership arrangements.',
    check: 'Match the exact product, legal structure, issuer and prospectus.',
    steps: [['Underlying', 'Identify the asset or exposure the product references.'], ['Structure', 'Inspect custody, legal form, fees and redemption terms.'], ['Holder', 'Read the rights attached to the security you actually hold.']],
  },
  'institution-profiles': {
    diagram: 'claims', title: 'Same asset story. Different legal claims.',
    insight: 'Fund units, company equity and preferred securities do not grant identical rights.',
    check: 'Distinguish company assets from assets held for clients.',
    steps: [['Assets', 'Start with the disclosed entity and its holdings.'], ['Obligations', 'Read debt, preferred claims and custody arrangements.'], ['Security', 'Locate the investor’s claim within that structure.']],
  },
  'bitcoin-treasuries': {
    diagram: 'claims', title: 'Follow ownership through the balance sheet.',
    insight: 'Coins held for customers are not automatically a company’s treasury.',
    check: 'Find the issuer record, as-of date and any encumbrances.',
    steps: [['Coins', 'Record the native asset and disclosed quantity.'], ['Entity', 'Identify who owns it and who holds the keys.'], ['Claims', 'Keep debt and shareholder rights beside the asset disclosure.']],
  },
  mnav: {
    diagram: 'stockflow', title: 'A multiple is a method, not a verdict.',
    insight: 'Two mNAV figures can disagree because their formulas or cutoffs differ.',
    check: 'State the numerator, denominator and treatment of debt and dilution.',
    steps: [['Market value', 'Identify the security, price and share-count basis.'], ['Asset value', 'Use the holdings and asset price from compatible cutoffs.'], ['Adjustments', 'Explain cash, debt and preferred claims before comparing multiples.']],
  },
  'litecoin-register': {
    diagram: 'claims', title: 'One coin. Several possible claims.',
    insight: 'Custody, beneficial ownership and wrapped backing can describe the same coins.',
    check: 'Do not add overlapping categories into a supposed total.',
    steps: [['Native LTC', 'Begin with the native Litecoin asset.'], ['Arrangement', 'Identify treasury, custodian, product or wrapped reserve.'], ['Ownership', 'Trace the disclosed rights and avoid counting the same backing twice.']],
  },
  'litecoin-products': {
    diagram: 'claims', title: 'The ticker is only the cover.',
    insight: 'A dedicated Litecoin product and a multi-asset basket need different labels.',
    check: 'Read the issuer document before comparing exposure.',
    steps: [['Exposure', 'Identify native LTC, derivatives or a basket allocation.'], ['Product', 'Keep the legal structure and fees beside the name.'], ['Listing', 'Check identifiers so cross-listings do not become duplicate holdings.']],
  },
  'litecoin-treasuries': {
    diagram: 'claims', title: 'Evidence comes before the leaderboard.',
    insight: 'A company announcement needs an asset date and a clearly identified entity.',
    check: 'Separate reported holdings from estimates and computed values.',
    steps: [['Disclosure', 'Find the original issuer or filing record.'], ['Balance sheet', 'Read holdings, debt and any restrictions together.'], ['Equity', 'Keep the share-count basis and cutoff with per-share calculations.']],
  },
  'litecoin-foundation': {
    diagram: 'ecosystem', title: 'An ecosystem is built by many hands.',
    insight: 'Software, education and real-world use are related, but each needs its own evidence.',
    check: 'A project announcement is not a measure of adoption or an endorsement of LTC Media.',
    steps: [['Build', 'Follow public code, releases and technical documentation.'], ['Explain', 'Connect education, project updates and dated primary sources.'], ['Participate', 'Verify organizer details and independent project status before joining.']],
  },
  mweb: {
    diagram: 'mweb', title: 'Privacy has an entry. And an exit.',
    insight: 'MWEB is an optional part of Litecoin. It does not make every Litecoin transaction private.',
    check: 'Check wallet support, release notes and the limits of each privacy claim.',
    steps: [['Peg in', 'Move LTC from the transparent chain into MWEB.'], ['Within MWEB', 'Confidential transfers use the extension-block system.'], ['Peg out', 'Return LTC to the transparent side of Litecoin.']],
  },
  'bitcoin-core': {
    diagram: 'timechain', title: 'Software implements. Nodes verify.',
    insight: 'A release announcement is evidence of software publication, not universal adoption.',
    check: 'Check the canonical release, signatures and operator instructions.',
    steps: [['Release', 'Identify the exact version and its original publication date.'], ['Validate', 'A node independently checks blocks against its consensus rules.'], ['Follow', 'Keep the block record separate from software version statistics.']],
  },
  lightning: {
    diagram: 'lightning', title: 'A route through payment channels.',
    insight: 'Public capacity is not payment volume. Channel balances and routing constraints matter.',
    check: 'Check the invoice, expiry and actual payment state.',
    steps: [['Open', 'Onchain transactions establish funded payment channels.'], ['Route', 'A payment can cross connected channels with sufficient directional liquidity.'], ['Settle', 'Channel closure settles balances onchain under the channel’s rules.']],
  },
  timechain: {
    diagram: 'timechain', title: 'The record has an order. The clock has limits.',
    insight: 'Block timestamps, a node’s observation time and an estimated future event are different fields.',
    check: 'Preserve the block hash, height, source and observation time.',
    steps: [['Link', 'A block references its predecessor.'], ['Verify', 'Nodes check proof of work and the applicable consensus rules.'], ['Observe', 'An observer records when that block was seen; forecasts remain estimates.']],
  },
  'nakamoto-standard': {
    diagram: 'timechain', title: 'Work proposes. Verification decides.',
    insight: 'Proof of work and independent validation have different jobs in the same system.',
    check: 'Name the chain and its rules before making a comparison.',
    steps: [['Work', 'Miners perform proof of work to propose candidate blocks.'], ['Rules', 'Nodes validate the block and its transactions.'], ['Record', 'Valid blocks extend the chain under its chain-selection rules.']],
  },
  morpho: {
    diagram: 'market', title: 'Read the market before the rate.',
    insight: 'A borrower supplies collateral; a lender supplies the loan asset. These are different roles.',
    check: 'Verify chain, token addresses, oracle, rate model and liquidation threshold.',
    steps: [['Collateral', 'The borrower supplies the collateral accepted by that isolated market.'], ['Market rules', 'An oracle provides valuation; market parameters govern borrowing and liquidation.'], ['Loan asset', 'Lenders supply the loan asset; borrowers draw it subject to liquidity and rules.']],
  },
  'wrapped-assets': {
    diagram: 'claims', title: 'The coin and the claim are not the same thing.',
    insight: 'A wrapped token adds an issuer, redemption arrangement and host-chain dependency.',
    check: 'Verify the asset, issuer, host network and exact contract.',
    steps: [['Native asset', 'BTC and LTC originate on their own networks.'], ['Backing', 'The issuer or custodian describes how backing and redemption work.'], ['Token', 'The host-chain token carries those additional dependencies.']],
  },
  builders: {
    diagram: 'ecosystem', title: 'From an idea to something others can verify.',
    insight: 'Open code is a starting point. A working deployment needs a separate trail of evidence.',
    check: 'Match the repository, license, commit, environment and deployment.',
    steps: [['Build', 'Publish inspectable code with a clear license.'], ['Review', 'Record tests, limitations and the scope of any independent audit.'], ['Operate', 'Identify the actual deployment and maintain a route for fixes.']],
  },
  stellar: {
    diagram: 'claims', title: 'The network is not the issuer.',
    insight: 'Native XLM and an issued asset on Stellar have different asset identities.',
    check: 'Inspect the network, asset identifier, issuer and redemption arrangement.',
    steps: [['Network', 'Identify the settlement network.'], ['Asset', 'Distinguish native XLM from an issuer-created token.'], ['Service', 'An anchor or other provider adds its own terms and dependencies.']],
  },
  'doge-pepe': {
    diagram: 'claims', title: 'A familiar ticker can hide a different structure.',
    insight: 'A native proof-of-work coin and a token on another chain are different systems.',
    check: 'Resolve the canonical chain or contract before interpreting a quote.',
    steps: [['Identity', 'Start with the exact asset, not the ticker alone.'], ['Mechanism', 'Distinguish the native network from the token’s host network.'], ['Evidence', 'Use asset-specific sources for supply, trading and concentration.']],
  },
  'community-newsroom': {
    diagram: 'newsroom', title: 'A story should leave a paper trail.',
    insight: 'AI can prepare a briefing. Sources, uncertainty and human accountability remain visible.',
    check: 'Find the dated edition, original evidence and correction history.',
    steps: [['Source', 'Collect the original record with its date and classification.'], ['Check', 'Apply evidence checks; sensitive interpretation goes to human review.'], ['Publish', 'Preserve the dated issue and record corrections without erasing history.']],
  },
  'circle-arc': {
    diagram: 'balance', title: 'Two interfaces. One USDC balance.',
    insight: 'On Arc, native and ERC-20 USDC interfaces expose the same balance. Adding them double-counts it.',
    check: 'Keep EURC, bridged tokens, network identity and issuer terms separate.',
    steps: [['Native interface', 'Arc exposes USDC for gas through its native interface, using 18 decimals.'], ['One balance', 'Both interfaces refer to one underlying USDC balance.'], ['ERC-20 interface', 'The USDC token interface uses 6 decimals. EURC is a separate euro asset.']],
  },
  'partner-studio': {
    diagram: 'newsroom', title: 'Participation deserves a clear label.',
    insight: 'A submission, a paid placement and an editorial story are different relationships.',
    check: 'Make the contributor, conflicts and placement status visible.',
    steps: [['Contribute', 'Identify the contributor and their inspectable work.'], ['Review', 'Check claims, licenses and commercial interests.'], ['Label', 'Disclose the relationship and preserve editorial independence.']],
  },
  '21-standard': {
    diagram: 'snapshot', title: 'A lens for evidence. Never a quota.',
    insight: 'A useful register can have missing rows. A complete-looking table can still mislead.',
    check: 'Keep unavailable distinct from zero and reported distinct from computed.',
    steps: [['Define', 'State the universe and what qualifies for inclusion.'], ['Observe', 'Keep comparable units, sources and cutoffs.'], ['Disclose', 'Show missing evidence rather than inventing a complete ranking.']],
  },
};

function Arrow({ x, y, width = 52, reverse = false }: { x: number; y: number; width?: number; reverse?: boolean }) {
  const end = reverse ? x : x + width;
  return <g className={styles.arrow}><path d={`M${x} ${y}h${width}`} /><path d={`M${end + (reverse ? 7 : -7)} ${y - 6}l${reverse ? -7 : 7} 6l${reverse ? 7 : -7} 6`} /></g>;
}

function Coin({ x, y, mark, radius = 37, tone = 'cobalt' }: { x: number; y: number; mark: string; radius?: number; tone?: 'cobalt' | 'silver' | 'terra' }) {
  return <g className={styles[tone]}><circle cx={x} cy={y} r={radius} className={styles.coinOuter} /><circle cx={x} cy={y} r={radius - 6} className={styles.coinInner} /><text x={x} y={y + 2} textAnchor="middle" dominantBaseline="middle" className={styles.coinMark}>{mark}</text></g>;
}

function Document({ x, y, width = 102, height = 133, children }: { x: number; y: number; width?: number; height?: number; children?: ReactNode }) {
  return <g><rect x={x + 7} y={y + 8} width={width} height={height} className={styles.shadow} /><rect x={x} y={y} width={width} height={height} className={styles.paper} /><path d={`M${x + 16} ${y + 24}h${width - 32} M${x + 16} ${y + 34}h${width - 47}`} className={styles.rule} />{children}</g>;
}

function StepMark({ x, y, value }: { x: number; y: number; value: string }) {
  return <g><circle cx={x} cy={y} r="13" className={styles.stepDot} /><text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" className={styles.stepNumber}>{value}</text></g>;
}

function Illustration({ diagram }: { diagram: Diagram }) {
  return <svg viewBox="0 0 600 320" aria-hidden="true" focusable="false" className={styles.illustration}>
    <path d="M22 24h12M28 18v12M566 24h12M572 18v12M22 296h12M28 290v12M566 296h12M572 290v12" className={styles.registration} />
    {diagram === 'snapshot' && <>
      <circle cx="282" cy="148" r="105" className={styles.orbit} /><circle cx="282" cy="148" r="84" className={styles.orbit} />
      <Document x={75} y={74} width={168} height={154}><text x="96" y="139" className={styles.largeType}>A / B</text><path d="M96 158h120M96 172h90M96 186h108" className={styles.rule} /></Document>
      <Arrow x={264} y={148} width={46} />
      <g className={styles.cobalt}><circle cx="397" cy="146" r="64" className={styles.clockFace} />{Array.from({ length: 12 }, (_, index) => <path key={index} d="M397 89v7" transform={`rotate(${index * 30} 397 146)`} className={styles.clockTick} />)}<path d="M397 108v38l30 18" className={styles.clockHands} /><circle cx="397" cy="146" r="4" className={styles.solid} /></g>
      <path d="M76 255H485" className={styles.baseline} /><StepMark x={96} y={255} value="1" /><StepMark x={287} y={255} value="2" /><StepMark x={466} y={255} value="3" />
    </>}
    {diagram === 'stockflow' && <>
      <Document x={51} y={89} width={110} height={132}><text x="72" y="168" className={styles.largeType}>$ / ₿</text></Document>
      <g className={styles.cobalt}><path d="M252 106v108h99V106" className={styles.container} />{[0, 1, 2].map(row => <g key={row}>{[0, 1, 2].map(col => <circle key={col} cx={275 + col * 26} cy={140 + row * 25} r="9" className={styles.token} />)}</g>)}</g>
      <path d="M433 98h102v132H433" className={styles.interval} /><Arrow x={406} y={135} width={97} /><Arrow x={421} y={182} width={122} reverse />
      <StepMark x={103} y={267} value="1" /><StepMark x={301} y={267} value="2" /><StepMark x={482} y={267} value="3" />
      <path d="M190 113l24 24m0 -24l-24 24M379 113l24 24m0 -24l-24 24" className={styles.difference} />
    </>}
    {diagram === 'claims' && <>
      <Coin x={104} y={160} mark="◎" radius={51} tone="silver" /><Arrow x={172} y={160} width={43} />
      <Document x={246} y={67} width={108} height={177}><path d="M266 124h67M266 136h48M266 187h67M266 199h53" className={styles.rule} /><circle cx="300" cy="160" r="18" className={styles.seal} /><path d="M290 159l7 7l15 -17" className={styles.paperCheck} /></Document>
      <Arrow x={383} y={160} width={40} /><g className={styles.cobalt}><path d="M443 107l45 -26l45 26v105l-45 27l-45 -27z" className={styles.token} /><path d="M443 107l45 27l45 -27M488 134v105" className={styles.edge} /><circle cx="488" cy="162" r="18" className={styles.coinInner} /></g>
      <StepMark x={104} y={278} value="1" /><StepMark x={300} y={278} value="2" /><StepMark x={488} y={278} value="3" />
    </>}
    {diagram === 'mweb' && <>
      <path d="M71 80H533M71 253H533" className={styles.baseline} />
      <rect x="202" y="69" width="198" height="200" rx="98" className={styles.privacyZone} />
      {[0, 1, 2, 3, 4, 5, 6].map(i => <path key={i} d={`M231 ${112 + i * 15}Q300 ${150 + i * 6} 370 ${112 + i * 15}`} className={styles.privatePath} />)}
      <Coin x={91} y={166} mark="Ł" tone="silver" /><Arrow x={142} y={166} width={66} />
      <circle cx="266" cy="166" r="13" className={styles.node} /><circle cx="337" cy="166" r="13" className={styles.node} /><path d="M288 166h28" className={styles.privatePath} />
      <Arrow x={397} y={166} width={66} /><Coin x={509} y={166} mark="Ł" tone="silver" />
      <StepMark x={165} y={284} value="1" /><StepMark x={301} y={284} value="2" /><StepMark x={432} y={284} value="3" />
    </>}
    {diagram === 'lightning' && <>
      <path d="M89 132L242 79L400 150L506 91M242 79L285 222L400 150M89 132L285 222L506 91" className={styles.channel} />
      <path d="M89 132L242 79L400 150L506 91" className={styles.route} />
      {[[89, 132], [242, 79], [400, 150], [506, 91], [285, 222]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="21" className={styles.node} /><circle cx={x} cy={y} r="6" className={styles.paper} /></g>)}
      <path d="M88 154v115H507V114" className={styles.settlement} /><path d="M150 255v28m70 -28v28m70 -28v28m70 -28v28m70 -28v28" className={styles.rule} />
      <StepMark x={89} y={269} value="1" /><StepMark x={319} y={114} value="2" /><StepMark x={506} y={269} value="3" />
    </>}
    {diagram === 'timechain' && <>
      {[0, 1, 2].map(i => <g key={i} transform={`translate(${69 + i * 174} ${132 - i * 24})`}><path d="M0 0l67 -35l52 27v91l-67 35L0 91z" className={styles.block} /><path d="M0 0l52 27l67 -35M52 27v91" className={styles.edge} /><path d="M14 30l25 13M14 43l25 13M14 56l25 13" className={styles.rule} />{i < 2 && <path d="M128 40l29 -15" className={styles.link} />}</g>)}
      <path d="M92 276H508" className={styles.baseline} /><StepMark x={126} y={276} value="1" /><StepMark x={300} y={276} value="2" /><StepMark x={474} y={276} value="3" />
      <path d="M285 43l9 9l20 -23" className={styles.paperCheck} />
    </>}
    {diagram === 'market' && <>
      <Coin x={88} y={168} mark="◎" tone="silver" /><Arrow x={138} y={168} width={75} />
      <rect x="231" y="112" width="139" height="119" className={styles.marketBox} /><path d="M254 144h93M254 158h66M254 196h93" className={styles.marketRules} />
      <path d="M270 61l30 -19l30 19l-30 19z" className={styles.oracle} /><path d="M300 81v24" className={styles.link} /><circle cx="300" cy="60" r="6" className={styles.paper} />
      <Arrow x={389} y={150} width={69} /><Arrow x={389} y={189} width={69} reverse /><Coin x={511} y={168} mark="$" tone="terra" />
      <StepMark x={88} y={273} value="1" /><StepMark x={300} y={273} value="2" /><StepMark x={511} y={273} value="3" />
    </>}
    {diagram === 'policy' && <>
      <Document x={47} y={90} width={107} height={139}><path d="M64 148h72M64 160h56M64 172h64" className={styles.rule} /><path d="M68 195l48 -17" className={styles.terraLine} /></Document>
      <Arrow x={181} y={165} width={44} />
      <path d="M247 98h109v91h-66l-33 26v-26h-10z" className={styles.speech} /><path d="M266 128h70M266 143h49M266 158h62" className={styles.rule} />
      <path d="M376 165h37" className={styles.conditional} /><path d="M409 159l7 6l-7 6" className={styles.arrow} />
      <Document x={442} y={90} width={107} height={139}><path d="M465 141l20 20l34 -41" className={styles.paperCheck} /><path d="M460 192h70M460 203h50" className={styles.rule} /></Document>
      <StepMark x={101} y={277} value="1" /><StepMark x={301} y={277} value="2" /><StepMark x={495} y={277} value="3" />
    </>}
    {diagram === 'newsroom' && <>
      <Document x={48} y={89} width={106} height={141}><path d="M64 147h70M64 161h53M64 176h65M64 190h42" className={styles.rule} /></Document>
      <Arrow x={178} y={161} width={43} /><circle cx="294" cy="146" r="53" className={styles.lens} /><path d="M332 184l37 36" className={styles.lensHandle} /><path d="M271 145l16 17l33 -36" className={styles.paperCheck} />
      <Arrow x={386} y={161} width={34} /><Document x={442} y={74} width={112} height={164}><path d="M457 127h80M457 140h80M457 154h34M503 154h34M457 167h34M503 167h34M457 180h34M503 180h34M457 197h80M457 211h59" className={styles.rule} /></Document>
      <StepMark x={101} y={276} value="1" /><StepMark x={294} y={276} value="2" /><StepMark x={498} y={276} value="3" />
    </>}
    {diagram === 'ecosystem' && <>
      <path d="M191 109Q300 19 410 109M430 132Q500 238 375 245M223 246Q99 230 169 133" className={styles.orbit} />
      <path d="M193 111L296 214L407 111M193 111H407" className={styles.link} />
      <circle cx="190" cy="112" r="53" className={styles.buildNode} /><path d="M177 94l-17 18l17 18m26 -36l17 18l-17 18m-9 -43l-11 52" className={styles.codeMark} />
      <circle cx="410" cy="112" r="53" className={styles.learnNode} /><path d="M379 93q17 -9 31 0q15 -9 31 0v40q-16 -9 -31 0q-14 -9 -31 0zM410 93v40" className={styles.bookMark} />
      <circle cx="298" cy="221" r="51" className={styles.peopleNode} /><circle cx="299" cy="207" r="10" className={styles.person} /><path d="M279 242v-10q20 -24 40 0v10M275 216q-17 -12 -25 9m73 -9q18 -12 26 9" className={styles.person} />
      <StepMark x={190} y={48} value="1" /><StepMark x={410} y={48} value="2" /><StepMark x={298} y={285} value="3" />
    </>}
    {diagram === 'balance' && <>
      <rect x="53" y="110" width="134" height="109" className={styles.paper} /><text x="120" y="160" textAnchor="middle" className={styles.largeType}>18</text><path d="M76 180h88M87 192h67" className={styles.rule} />
      <path d="M188 165H253M347 165H412" className={styles.link} /><Coin x={300} y={165} mark="$" radius={48} />
      <rect x="414" y="110" width="134" height="109" className={styles.paper} /><text x="481" y="160" textAnchor="middle" className={styles.largeType}>6</text><path d="M437 180h88M448 192h67" className={styles.rule} />
      <path d="M121 103V69H481v34" className={styles.bracket} /><path d="M300 69v50" className={styles.bracket} />
      <StepMark x={120} y={271} value="1" /><StepMark x={300} y={271} value="2" /><StepMark x={481} y={271} value="3" />
    </>}
  </svg>;
}

/** An accessible, static editorial plate. Safe to repeat: no SVG or HTML IDs. */
export default function LtcVisualExplainer({ deskId, compact = false }: { deskId: string; compact?: boolean }) {
  const explainer = explainers[deskId];
  if (!explainer) return null;
  return <figure className={`${styles.figure}${compact ? ` ${styles.compact}` : ''}`} data-diagram={explainer.diagram} data-desk={deskId}>
    <div className={styles.heading}><span className={styles.eyebrow}>The visual brief</span><span className={styles.editionLabel}>LTC · Field notes</span></div>
    <div className={styles.plate}>
      <div className={styles.art}><Illustration diagram={explainer.diagram} /><span className={styles.artLabel}>Conceptual illustration · not live data</span></div>
      <div className={styles.insight}><h3>{explainer.title}</h3><p>{explainer.insight}</p></div>
    </div>
    <figcaption className={styles.caption}>
      <ol className={styles.steps}>{explainer.steps.map(([label, detail], index) => <li key={label}><span className={styles.number} aria-hidden="true">0{index + 1}</span><div><strong>{label}</strong><p>{detail}</p></div></li>)}</ol>
      <p className={styles.check}><span>Before you conclude</span>{explainer.check}</p>
    </figcaption>
  </figure>;
}
