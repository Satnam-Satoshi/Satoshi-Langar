import { ProgramJourney } from '../components/ProgramJourney';
import s from '../components/program-page.module.css';
export const metadata={title:'Kalakar.x · Art, paid in bitcoin'};
const firstStep = {
  "path": "kalakar",
  "title": "Turn one creative idea into a clear brief.",
  "time": "30 MINUTES · CREATIVE BRIEF",
  "description": "Start as an artist, a collaborator or a reviewer. Put a small piece of work into words before discussing a commission or payment.",
  "steps": [
    {
      "title": "Choose one work and audience",
      "body": "A poster, illustration, song, article, lesson or accessible description is enough. Name who it helps and what you can deliver."
    },
    {
      "title": "Set permission and scope",
      "body": "Use the artist worksheet to describe attribution, reuse, AI assistance, format and revisions. You choose what to offer; no rights transfer happens by completing a plan."
    },
    {
      "title": "Save or share a short proposal",
      "body": "Keep your draft, review it with a collaborator or post a public-safe summary. Do not send payment information or unpublished private work to a public issue."
    }
  ],
  "toolkits": [
    {
      "href": "/toolkits/kalakar-starter.md",
      "label": "Artist and commission brief"
    }
  ],
  "completion": "A potential collaborator can understand the deliverable, intended use, authorship, permission and questions that remain. A sale or payment is not required.",
  "next": "If a collaborator agrees, confirm scope and rights together. Any paid commission needs separately agreed terms and an artist-controlled receiving setup; this site does not create an invoice or promise a buyer.",
  "proposalTitle": "Kalakar.x: first creative brief",
  "proposalBody": "Art form and optional public portfolio:\n\nOne proposed deliverable and audience:\n\nAttribution, reuse and AI disclosure:\n\nWhat I can offer / what I need:\n\nOpen questions:\n"
} satisfies Parameters<typeof ProgramJourney>[0];

export default function Page(){return <main className={s.page} data-program="kalakar"><div className={s.wrap}>
<section className={s.hero}><div><p className={s.eyebrow}>Kalakar.x / The artist community idea</p><h1>Make your mark.<br/><em>Keep your voice.</em></h1><p>A proposed creative home for artists, musicians, writers and makers: share your work, agree fair terms and receive bitcoin directly through a receiving setup you control.</p><div className={s.actions}><a className={s.button} href="#the-idea">Explore the idea ↓</a><a href="#get-started">Start a creative brief →</a></div></div><figure><img src="/magazine/proof-of-birthday/builders.jpg" width="1536" height="1024" fetchPriority="high" alt="Conceptual artwork of several people arranging blue and silver shapes in an open artist’s book."/><figcaption>Different hands. A shared canvas. · Original conceptual artwork, not a commissioned-work showcase.</figcaption></figure></section>
<div className={s.stage}><strong>Where we are / Creator pilot design</strong><span>The creative brief and planning tools are open. Marketplace listings, commissions and checkout are not active.</span></div>
<nav className={s.chapters} aria-label="Kalakar page navigation"><a href="#the-idea">The idea</a><a href="#artist-payments">Getting paid in bitcoin</a><a href="#first-pilot">The first pilot</a><a href="#get-started">Your first brief ↗</a></nav>
<section id="the-idea" className={s.intro}><div><p className={s.eyebrow}>For the people who make things</p><h2>Your imagination.<br/>Your terms.<br/>Your next collaborator.</h2></div><div><p>Kalakar.x connects creative work with the Satnam Satoshi community. Bring illustration, music, photography, writing, design, craft or code. Help tell a story, explain an idea or make something of your own.</p><p>The artist and collaborator agree what is being made, how it can be used, and what fair payment means. Joining does not transfer your rights. AI assistance is disclosed, and people stay responsible for authorship and permission.</p></div></section>
<div className={s.cards}><article><b aria-hidden="true">✳</b><h3>Create with purpose.</h3><p>A magazine illustration, a learning resource or a kitchen poster could be a starting point. These are ideas to propose, not paid openings.</p></article><article><b aria-hidden="true">©</b><h3>Keep your rights clear.</h3><p>Agree attribution, licensing, revisions and reuse before work begins. A contribution plan is not a rights transfer.</p></article><article><b aria-hidden="true">₿</b><h3>Receive bitcoin directly.</h3><p>The proposed payment flow uses an artist-controlled Bitcoin or Lightning invoice. The site would not hold the artist’s keys.</p></article></div>
<section className={s.flow} aria-labelledby="kalakar-flow-title"><h2 id="kalakar-flow-title">A creative relationship, made clear.</h2><ol>{[['01','Brief','Define the work and who it is for.'],['02','Agree','Set scope, rights, price and timing.'],['03','Invoice','Use the artist’s own receiving setup.'],['04','Deliver','Verify settlement and share the work.']].map(([n,t,b])=><li key={n}><span>{n}</span><strong>{t}</strong><p>{b}</p></li>)}</ol><p>This describes a proposed integration. There is no live invoice or payment request on this page.</p></section>
</div>
<section className="reading-content wide-content"><h2 id="artist-payments">How an artist would get paid</h2><ol className="steps"><li><div><strong>Agree the commission</strong><p>The artist and buyer agree deliverables, BTC or sats pricing, deadlines, revisions, rights, network fees and a refund or dispute process.</p></div></li><li><div><strong>Issue an artist-controlled invoice</strong><p>The proposed integration uses BTCPay Server for Bitcoin on-chain or Lightning invoices. The artist chooses and controls the receiving setup; Satnam Satoshi does not hold their keys.</p></div></li><li><div><strong>Verify settlement</strong><p>Confirm the right asset, network, amount and invoice state. Expired, partial, pending and duplicate payments need their own handling. Deliver according to the agreed settlement terms.</p></div></li><li><div><strong>Deliver and keep a record</strong><p>Share the work and license, record the receipt and resolve concerns through the agreed human process. Supporting a kitchen is a separate, voluntary choice.</p></div></li></ol><h2 id="first-pilot">Start with one real artist</h2><p>The proposed first pilot tests the full journey with a consenting artist: terms, test invoice, payment status, delivery and refund handling. A marketplace and checkout are not active on this site.</p><p className="status-note">No commission, sales volume or creator payout is promised. No platform payment destination is published. Artists can help shape the workflow now.</p><p className="source-notes">Candidate technology: <a href="https://docs.btcpayserver.org/Guide/">BTCPay Server</a> and its <a href="https://docs.btcpayserver.org/Invoices/">invoice lifecycle</a>. Integration and recovery testing come before accepting payments.</p></section>
<ProgramJourney {...firstStep}/>
<div className={s.wrap}><aside className={s.bridge}><span aria-hidden="true">◡</span><div><h2>Creativity can make room for others.</h2><p>An artist might contribute a menu design, a lesson or an illustration to Langar. They may also choose to give separately. Neither donating nor working for free is a condition of participating in Kalakar.x.</p><a href="/langar/">Discover Satoshi Langar →</a></div></aside></div></main>}
