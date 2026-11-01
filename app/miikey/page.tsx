import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import styles from './miikey.module.css';

export const metadata: Metadata = {
  title: 'MiiKey · Your keys. Your understanding.',
  alternates: { canonical: 'https://satnamsatoshi.com/miikey/' },
  openGraph: { title: 'MiiKey · Your keys. Your understanding.', url: 'https://satnamsatoshi.com/miikey/', images: [{ url: 'https://satnamsatoshi.com/miikey/keys-to-open-world.jpg', width: 1536, height: 1024, alt: 'An open doorway to self-custody and shared learning.' }] },
  description: 'A practical field guide to Bitcoin self-custody: keys, recovery, hardware wallets, multisig, nodes and community. Learn without connecting a wallet.',
};

const sources = {
  paper: 'https://bitcoin.org/bitcoin.pdf',
  faq: 'https://bitcoin.org/en/faq',
  custody: 'https://bitcoin.org/en/secure-your-wallet',
  privacy: 'https://bitcoin.org/en/protect-your-privacy',
  core: 'https://bitcoincore.org/en/about/',
  node: 'https://bitcoin.org/en/full-node',
  descriptor: 'https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki',
  sparrow: 'https://sparrowwallet.com/docs/best-practices.html',
  coldcard: 'https://coldcard.com/docs/',
  coldcardStatus: 'https://coldcard.com/security/status',
  bitbox: 'https://support.bitbox.swiss/en_US/basics-/bitbox-supported-coins',
  trezor: 'https://trezor.io/learn/supported-assets/bitcoin/bitcoin-only-firmware-on-trezor',
  seedsigner: 'https://seedsigner.com/',
  orange: 'https://www.cluborange.org/',
  orangeFaq: 'https://www.cluborange.org/faqs',
  orangePrivacy: 'https://www.cluborange.org/privacy-policy',
  orangeIos: 'https://apps.apple.com/us/app/club-orange-meet-bitcoiners/id1627034193',
  orangeAndroid: 'https://play.google.com/store/apps/details?id=com.orangepill',
  design: 'https://bitcoin.design/community/',
  btcpay: 'https://btcpayserver.org/',
  nostr: 'https://github.com/nostr-protocol/nostr',
  matrix: 'https://matrix.org/',
};

function KeyIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="2" /><path d="m22.5 22.5 17 17m-7-7 5-5m-10 0 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function SectionLabel({ number, children }: { number: string; children: ReactNode }) {
  return <p className={styles.eyebrow}><span>{number}</span>{children}</p>;
}

const hardware = [
  {
    name: 'BitBox', category: 'Bitcoin-only or Multi edition', mark: 'B',
    detail: 'BitBox02 and Nova offer distinct Bitcoin-only and Multi editions. The Multi range includes BTC and LTC support; some assets or networks need an external wallet interface.',
    consider: 'Check the exact edition, phone/computer compatibility, backup method and whether your asset works in BitBoxApp or a separate interface.',
    url: sources.bitbox, link: 'Compare supported assets',
  },
  {
    name: 'Trezor', category: 'Bitcoin-only or Universal firmware', mark: 'T',
    detail: 'The Trezor range offers Bitcoin-only and Universal firmware choices. Bitcoin-only hardware has edition restrictions; Universal firmware supports a broader set of assets.',
    consider: 'Confirm the device model, firmware edition and current coin/network support. A familiar token name does not establish compatibility.',
    url: sources.trezor, link: 'Understand firmware choices',
  },
  {
    name: 'COLDCARD', category: 'Bitcoin-only · Advisory to read', mark: 'C',
    detail: 'A Bitcoin-only signer with documented PSBT workflows and compatible coordinator software. Signing paths differ by model and can include MicroSD or QR.',
    consider: 'Read the current seed-generation security advisory before evaluating or using one. Updating firmware does not repair an existing affected seed.',
    url: sources.coldcardStatus, link: 'Read current security status', advisory: true,
  },
  {
    name: 'SeedSigner', category: 'Bitcoin-only · DIY / advanced', mark: 'S',
    detail: 'An open-source, stateless Bitcoin signing project using QR exchange and a buildable hardware design. It is an advanced learning path, not a turnkey beginner recommendation.',
    consider: 'Assembly, verified software, physical handling and the stateless recovery workflow need technical confidence. Air-gapped does not mean risk-free.',
    url: sources.seedsigner, link: 'Explore the project',
  },
];

export default function MiiKeyPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="miikey-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><KeyIcon />A Satnam Satoshi field guide</p>
          <h1 id="miikey-title">Mii<span>Key</span><span className={styles.titleDot}>.</span></h1>
          <p className={styles.manifesto}>Not your keys.<br /><em>Not your coins.</em></p>
          <p className={styles.heroText}>The freedom to hold your own money begins with understanding it. Explore Bitcoin, practice recovery and find people who value learning as much as conviction.</p>
          <div className={styles.actions}>
            <a className={styles.primaryLink} href="#first-steps">Find your first step <span aria-hidden="true">↗</span></a>
            <a className={styles.textLink} href="#community">Find your people <span aria-hidden="true">→</span></a>
          </div>
          <p className={styles.smallNote}>Open to everyone. No account, wallet connection or purchase needed.</p>
        </div>
        <figure className={styles.heroFigure}>
          <Image src="/miikey/keys-to-open-world.jpg" alt="A silver key stands in an open doorway overlooking a community, with an open book and fine network lines." width={1536} height={1024} priority className={styles.heroImage} />
          <figcaption><span>01 / A more open world</span><span>Understanding is the first key.</span></figcaption>
        </figure>
      </section>

      <nav className={styles.index} aria-label="MiiKey resource categories">
        <span>Explore the guide</span>
        <a href="#why-bitcoin">The why</a><a href="#first-steps">First steps</a><a href="#hardware">Hardware</a><a href="#multisig">Multisig</a><a href="#verify">Nodes & privacy</a><a href="#community">Community</a>
      </nav>

      <section id="why-bitcoin" className={styles.section} aria-labelledby="why-title">
        <div className={styles.sectionHeading}>
          <div><SectionLabel number="01">The reason to learn</SectionLabel><h2 id="why-title">Money you can verify.<br /><em>Choices you can understand.</em></h2></div>
          <p>Bitcoin’s original proposal is peer-to-peer electronic cash. MiiKey starts with that idea: let people understand the rules and take responsibility for the choices they make.</p>
        </div>
        <div className={styles.principles}>
          <article><span className={styles.principleNumber}>01</span><h3>Peer to peer</h3><p>Two willing parties can use Bitcoin without appointing a bank to maintain their shared payment ledger. Nodes validate rules; proof of work helps order history.</p><a href={sources.paper}>Read Satoshi’s paper ↗</a></article>
          <article><span className={styles.principleNumber}>02</span><h3>Rules before promises</h3><p>The current protocol’s issuance schedule approaches 21 million BTC. Scarcity is one part of the sound-money argument; it does not promise stable prices or future purchasing power.</p><a href={sources.faq}>Examine Bitcoin’s monetary rules ↗</a></article>
          <article><span className={styles.principleNumber}>03</span><h3>Freedom with responsibility</h3><p>For this community, sovereignty means more ability to verify, recover and choose. Self-custody also means facing mistakes, theft and loss without a universal reset desk.</p><a href={sources.custody}>Understand custody responsibilities ↗</a></article>
        </div>
        <figure className={styles.paymentDiagram} aria-labelledby="payment-caption">
          <div><KeyIcon /><strong>You authorize</strong><span>A signer checks the proposed spend.</span></div><span className={styles.flowArrow} aria-hidden="true">→</span>
          <div><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="m12 12 24 0-12 24-12-24 24 0M12 12l12 12m12-12L12 36h24L24 24" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="12" r="4" fill="currentColor" /><circle cx="36" cy="12" r="4" fill="currentColor" /><circle cx="24" cy="36" r="4" fill="currentColor" /></svg><strong>The network checks</strong><span>Validation and block inclusion are distinct steps.</span></div><span className={styles.flowArrow} aria-hidden="true">→</span>
          <div><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="9" stroke="currentColor" strokeWidth="2" /><path d="m16 24 6 6 12-13" stroke="currentColor" strokeWidth="2" /></svg><strong>A recipient verifies</strong><span>Their own payment record closes the loop.</span></div>
          <figcaption id="payment-caption">A simplified on-chain payment. Fees, connectivity and confirmation policies still matter. A signature or screenshot alone is not settlement.</figcaption>
        </figure>
      </section>

      <section id="first-steps" className={`${styles.section} ${styles.startSection}`} aria-labelledby="start-title">
        <div className={styles.startIntro}><SectionLabel number="02">Start where you are</SectionLabel><h2 id="start-title">Small steps.<br /><em>Lasting confidence.</em></h2><p>You do not have to buy anything to begin. Take the next step only when you can explain the one before it.</p><a className={styles.primaryLink} href="/sikh-bitcoin/course/foundations/">Open Bitcoin Foundations <span aria-hidden="true">→</span></a><p className={styles.smallNote}>21 lessons, practical exercises and self-checks.</p></div>
        <div className={styles.steps}>
          <details open><summary><span>01</span>Understand what a wallet does</summary><div><p>Bitcoin is recorded on its network. A wallet helps manage the information and keys used to receive and authorize spending. A balance at a custodian can instead be a claim on that provider.</p><a href="/sikh-bitcoin/keys-and-custody/">Read: keys and custody →</a></div></details>
          <details><summary><span>02</span>Write a recovery plan on paper</summary><div><p>Without using real secrets, describe how an authorized person would recover after losing a device. Note the wallet type, backup method and any extra policy or passphrase requirements. A device PIN is not a universal recovery backup.</p><p>Follow the exact wallet’s official check procedure before depending on it. Do not erase an existing wallet to experiment or enter its recovery material into a website, chat or AI tool.</p><a href="/sikh-bitcoin/backup-before-dependence/">Read: backup before dependence →</a></div></details>
          <details><summary><span>03</span>Compare tools against your needs</summary><div><p>Write down which assets and networks you actually need, the devices you use, what you can maintain and what would happen if the vendor disappeared. Compare recovery, verified displays and software compatibility before a brand or price.</p><a href="#hardware">Explore hardware approaches →</a></div></details>
          <details><summary><span>04</span>Rehearse before relying on a setup</summary><div><p>Use a nonvaluable learning environment and the selected product’s current documentation to practice verification and recovery. Ask a knowledgeable reviewer to check your understanding without seeing your secrets. This guide does not initialize or fund a wallet.</p><a href="/sikh-bitcoin/recovery-and-continuity/">Read: recovery and continuity →</a></div></details>
          <details><summary><span>05</span>Learn with another person</summary><div><p>Bring a question to a learning circle, explain a lesson back to a friend or review an open-source contribution. You can belong here through learning, art or service without disclosing balances or sending sats.</p><a href="/meetups/">Explore our meetup plans →</a></div></details>
        </div>
      </section>

      <section className={`${styles.section} ${styles.keySection}`} aria-labelledby="key-title">
        <div className={styles.sectionHeading}><div><SectionLabel number="03">Know what you are holding</SectionLabel><h2 id="key-title">Three ideas.<br /><em>Different responsibilities.</em></h2></div><p>“Not your keys. Not your coins.” is a reminder about spending control. It is not a promise that key ownership alone makes a setup safe.</p></div>
        <div className={styles.keyCards}>
          <article><span className={styles.keyLabel}>Share for a purpose</span><h3>Receiving address</h3><p>A destination for a payment on a specific network. Check it through the recipient’s trusted channel. Publishing one can connect a person to transaction history.</p></article>
          <article><span className={styles.keyLabel}>Protect from disclosure</span><h3>Private signing key</h3><p>Secret material used to authorize spending under the applicable policy. A copied key can give someone else that authority; a hardware signer aims to isolate it.</p></article>
          <article><span className={styles.keyLabel}>Plan for recovery</span><h3>Backup + wallet context</h3><p>A backup can restore access, but its format and required metadata matter. An extra passphrase or multisig descriptor may be essential. Recovery methods are not interchangeable.</p></article>
        </div>
        <p className={styles.sourceLine}>Go deeper: <a href={sources.custody}>wallet security</a> · <a href={sources.descriptor}>wallet descriptors</a> · <a href="/sikh-bitcoin/entropy-and-passphrases/">passphrase tradeoffs</a></p>
      </section>

      <section id="hardware" className={styles.section} aria-labelledby="hardware-title">
        <div className={styles.sectionHeading}><div><SectionLabel number="04">Tools worth understanding</SectionLabel><h2 id="hardware-title">Choose a workflow.<br /><em>Then choose a device.</em></h2></div><p>A hardware signer can reduce key exposure to a general-purpose computer. It still depends on authentic hardware, verified software, careful review and a recoverable backup.</p></div>
        <div className={styles.comparisonNote}><strong>A research shortlist, not a ranking.</strong><span>Bitcoin-only and multi-asset approaches serve different needs. Features below are manufacturer/project descriptions, checked October 4, 2026. No hands-on security audit, affiliate arrangement or purchase recommendation is claimed.</span></div>
        <div className={styles.hardwareGrid}>
          {hardware.map((item) => <article className={styles.hardwareCard} key={item.name}>
            <div className={styles.hardwareTop}><span className={styles.deviceMark} aria-hidden="true">{item.mark}</span><span>{item.category}</span></div>
            <h3>{item.name}</h3><p>{item.detail}</p>
            <div className={item.advisory ? styles.advisory : styles.consider}><strong>{item.advisory ? 'Important current advisory' : 'Before you choose'}</strong><p>{item.consider}</p></div>
            <a href={item.url}>{item.link} <span aria-hidden="true">↗</span></a>
          </article>)}
        </div>
        <details className={styles.resourceDetails}><summary>Five questions for any hardware wallet</summary><ol><li>Can I verify the exact asset, network, recipient and amount on a trusted display?</li><li>What are the current security advisories, update-verification process and support boundaries?</li><li>Can a compatible independent tool recover the wallet with the documented backup and metadata?</li><li>What does the device, companion software or server learn about my activity?</li><li>Can the people responsible actually use, maintain and recover this setup?</li></ol><p>Use the manufacturer’s official site to identify its authorized distribution and documentation. Device authenticity does not eliminate firmware, supply-chain or human error.</p></details>
      </section>

      <section id="multisig" className={styles.multisigSection} aria-labelledby="multisig-title">
        <div className={styles.multisigCopy}><SectionLabel number="05">A model to reason about</SectionLabel><h2 id="multisig-title">Two of three.<br /><em>More than a number.</em></h2><p>A conceptual 2-of-3 policy requires any two of three designated keys to authorize a spend. One key alone is insufficient under this simple policy. Three copies of one key are not three independent keys.</p><p>The useful question is whether the keys, people, devices and recovery paths fail independently. Complexity can reduce one risk while creating another.</p><p className={styles.darkNote}>Teaching model only. This diagram does not create a wallet or recommend a production custody design.</p><a href="/sikh-bitcoin/multisig-and-independence/">Study the full lesson <span aria-hidden="true">→</span></a></div>
        <div className={styles.multisigLab}>
          <figure className={styles.multisigFigure}>
            <svg viewBox="0 0 450 310" role="img" aria-labelledby="multisig-svg-title multisig-svg-desc">
              <title id="multisig-svg-title">Three independent keys and a two-signature threshold</title><desc id="multisig-svg-desc">Keys A, B and C connect to a policy that accepts any two. Keeping the wallet descriptor and recovery metadata is also necessary.</desc>
              <path d="M90 74 225 171 360 74M225 171v83" fill="none" stroke="#8799aa" strokeWidth="1.5" strokeDasharray="5 5" />
              <circle cx="90" cy="66" r="36" fill="#f8f6ef" /><circle cx="360" cy="66" r="36" fill="#f8f6ef" /><circle cx="225" cy="254" r="36" fill="#f8f6ef" />
              <g fill="#17324a" fontSize="25" fontFamily="Georgia,serif" textAnchor="middle"><text x="90" y="75">A</text><text x="360" y="75">B</text><text x="225" y="263">C</text></g>
              <rect x="154" y="136" width="142" height="68" rx="34" fill="#c98760" /><text x="225" y="164" fill="#102a43" fontSize="13" textAnchor="middle" fontFamily="sans-serif">ANY TWO KEYS</text><text x="225" y="189" fill="#102a43" fontSize="21" textAnchor="middle" fontFamily="Georgia,serif">2 / 3</text>
            </svg>
            <figcaption>Independent keys + complete wallet policy + practiced recovery.</figcaption>
          </figure>
          <div className={styles.scenarios}>
            <details name="miikey-scenarios"><summary>A is unavailable. Can B + C authorize?</summary><p>In this simplified policy, yes—if B and C remain usable and the complete wallet information is available. Losing the descriptor or an essential passphrase can still prevent recovery.</p></details>
            <details name="miikey-scenarios"><summary>One key is stolen. Are funds automatically safe?</summary><p>The stolen key alone cannot satisfy this threshold, but the incident still matters. Shared devices, exposed backups or another spending path could change the situation. The real policy must be reviewed.</p></details>
            <details name="miikey-scenarios"><summary>Two keys are compromised. What changes?</summary><p>A party controlling two valid keys can satisfy this threshold. Multisig does not protect against enough compromised signers or an authorized quorum approving a malicious transaction.</p></details>
          </div>
          <p className={styles.darkSources}>References: <a href={sources.descriptor}>BIP 380: descriptors</a> · <a href={sources.sparrow}>Sparrow’s custody considerations</a></p>
        </div>
      </section>

      <section id="verify" className={styles.section} aria-labelledby="verify-title">
        <div className={styles.sectionHeading}><div><SectionLabel number="06">See the dependencies</SectionLabel><h2 id="verify-title">Your keys are a start.<br /><em>Verification goes further.</em></h2></div><p>A self-custody wallet can still ask someone else’s server what happened. A node can reduce that reliance; it does not make your hardware, internet or social tools disappear.</p></div>
        <div className={styles.verifyGrid}>
          <article className={styles.nodeCard}><div className={styles.nodeVisual} aria-hidden="true"><span /><span /><span /><span /><b>VERIFY<br />LOCALLY</b></div><h3>Run the rules yourself</h3><p>Bitcoin Core can independently validate Bitcoin blocks and transactions. A properly connected wallet can use your node instead of outsourcing that view. Running a node is different from mining and does not automatically earn bitcoin.</p><p>Storage, bandwidth, updates, backups and secure configuration still need an operator. Start by understanding the requirements, not by copying a command you cannot explain.</p><a href={sources.core}>Meet Bitcoin Core ↗</a><a href={sources.node}>Read the full-node guide ↗</a></article>
          <div className={styles.dependencyRows}>
            <article><span>01</span><div><h3>Signing</h3><p>Who can authorize a spend? Check keys, policy, firmware and the human approval path.</p></div></article>
            <article><span>02</span><div><h3>Observation</h3><p>Who tells your wallet its balance? Check the node or server and its view of your addresses.</p></div></article>
            <article><span>03</span><div><h3>Privacy</h3><p>Bitcoin’s ledger is public. Address reuse, xpub disclosure and linked identities can expose a financial history. Self-custody is not automatic anonymity.</p><a href={sources.privacy}>Read the privacy guide ↗</a></div></article>
            <article><span>04</span><div><h3>Access & recovery</h3><p>What if an app, host or vendor disappears? Document alternatives, dependencies and the skills needed to use them.</p><a href="/sikh-bitcoin/custody-architecture/">Map your custody architecture →</a></div></article>
          </div>
        </div>
        <details className={styles.resourceDetails}><summary>Bitcoin, Lightning and other chains are different systems</summary><p>Lightning adds channel, liquidity and operational considerations to Bitcoin payments. A wrapped BTC token or USDC lending position adds other contracts, issuers, chains, oracles and exit conditions. Holding an account key does not remove those dependencies.</p><p>Our Bitcoin standard is a commitment to understandable, verifiable choices—not a claim that every tool linked from this site uses Bitcoin consensus.</p><a href="/sikh-bitcoin/course/sovereignty/">Compare the models in Sovereignty & Self-Custody →</a></details>
      </section>

      <section id="community" className={`${styles.section} ${styles.communitySection}`} aria-labelledby="community-title">
        <div className={styles.sectionHeading}><div><SectionLabel number="07">Find your people</SectionLabel><h2 id="community-title">Keep your keys.<br /><em>Share the learning.</em></h2></div><p>A resource hub and an invitation to gather. Our verified channels and meetup plans are linked below; this page is not a live chat room, hosted wallet or membership service.</p></div>
        <article className={styles.orangeCard}>
          <div className={styles.orangeEmblem} aria-hidden="true"><span>○</span><small>PEOPLE<br />BEFORE FEEDS</small></div>
          <div className={styles.orangeCopy}><span className={styles.tag}>Independent community resource</span><h3>Club Orange</h3><p>Formerly Orange Pill App. A social app for discovering Bitcoiners, events and merchants. The official site is <strong>cluborange.org</strong>; the app publisher is <strong>Orange Pill App Inc.</strong></p><p className={styles.orangeCaveat}>Membership charges and the operator’s privacy terms apply. Location and profile sharing deserve care. Listing it here does not create an affiliation or endorse its wallet features; those have their own architecture and recovery assumptions.</p><div className={styles.actions}><a className={styles.primaryLink} href={sources.orange}>Visit the official site ↗</a><a className={styles.textLink} href={sources.orangeIos}>iOS app ↗</a><a className={styles.textLink} href={sources.orangeAndroid}>Android app ↗</a></div><p className={styles.sourceLine}><a href={sources.orangeFaq}>How it works</a> · <a href={sources.orangePrivacy}>Privacy policy</a> · Identity links checked October 4, 2026</p></div>
        </article>
        <div className={styles.communityPaths}>
          <a href="/connect/"><span>Our verified channels</span><h3>Start a conversation <span aria-hidden="true">↗</span></h3><p>See which Satnam Satoshi channels are available and which are still being prepared.</p></a>
          <a href="/meetups/"><span>Meet in real life</span><h3>Gather around an idea <span aria-hidden="true">↗</span></h3><p>Explore the meetup plan and propose a learning circle with a human host.</p></a>
          <a href="/join/"><span>Build with us</span><h3>Bring a useful skill <span aria-hidden="true">↗</span></h3><p>Review a lesson, design a simpler flow or help another person take their first step.</p></a>
        </div>
        <h3 className={styles.resourceHeading}>Open tools. Real communities.</h3>
        <div className={styles.openResources}>
          <a href={sources.design}><strong>Bitcoin Design <span aria-hidden="true">↗</span></strong><span>An open design community and resources for making Bitcoin products easier to use.</span></a>
          <a href={sources.btcpay}><strong>BTCPay Server <span aria-hidden="true">↗</span></strong><span>Open-source payment infrastructure to study. Self-hosting still needs operations and maintenance.</span></a>
          <a href={sources.nostr}><strong>Nostr <span aria-hidden="true">↗</span></strong><span>A protocol for signed messages across relays. Clients, relays, moderation and identity protection remain choices.</span></a>
          <a href={sources.matrix}><strong>Matrix <span aria-hidden="true">↗</span></strong><span>An open communication protocol with federated homeservers. Hosting and room governance still matter.</span></a>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="closing-title"><KeyIcon /><p className={styles.eyebrow}>A practice, not a product</p><h2 id="closing-title">Sovereignty grows<br /><em>with understanding.</em></h2><p>Learn one thing. Verify one claim. Help one person.<br />That is a good place to begin.</p><a className={styles.primaryLink} href="/sikh-bitcoin/">Explore the learning library <span aria-hidden="true">→</span></a></section>
      <aside className={styles.editorialNote} aria-label="Research and editorial status"><p><strong>About this guide.</strong> AI-prepared educational research, source-checked October 4, 2026. Independent technical review is pending. References describe their own products and protocols; linked services are third parties, not Satnam Satoshi partners. Product support and advisories can change.</p><p>MiiKey does not collect secrets, connect wallets, execute transactions or provide account monitoring. The diagrams are conceptual. <a href="https://github.com/Satnam-Satoshi/Satoshi-Langar/issues/new">Suggest a correction</a> using public information only.</p></aside>
    </main>
  );
}
