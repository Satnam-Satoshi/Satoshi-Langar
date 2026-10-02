import { ProgramJourney } from '../components/ProgramJourney';
import { PageIntro } from '../components/PageIntro';
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

export default function Page(){return <main><PageIntro eyebrow="Kalakar.x · Creator pilot design" title="Your art. Your voice. Your bitcoin." description="A home for artists, musicians, writers and makers to create meaningful work, agree fair terms and receive bitcoin directly."/>
<ProgramJourney {...firstStep} />
<section className="reading-content wide-content"><div className="task-grid"><article className="task-card"><span className="inline-tag">CREATE</span><h2>Make something only you can make.</h2><p>Illustration, music, photography, writing, design, craft and code. Help a community tell its story—or bring your own commission.</p></article><article className="task-card"><span className="inline-tag">KEEP CONTROL</span><h2>Choose the terms of your work.</h2><p>Agree the scope, price, attribution and license. Disclose AI assistance where relevant. Your rights are not surrendered by joining the community.</p></article></div><h2>How an artist gets paid</h2><ol className="steps"><li><div><strong>Agree the commission</strong><p>The artist and buyer agree deliverables, BTC or sats pricing, deadlines, revisions, rights, network fees and a refund or dispute process.</p></div></li><li><div><strong>Issue an artist-controlled invoice</strong><p>The proposed integration uses BTCPay Server for Bitcoin on-chain or Lightning invoices. The artist chooses and controls the receiving setup; Satnam Satoshi does not hold their keys.</p></div></li><li><div><strong>Verify settlement</strong><p>Confirm the right asset, network, amount and invoice state. Expired, partial, pending and duplicate payments need their own handling. Deliver according to the agreed settlement terms.</p></div></li><li><div><strong>Deliver and keep a record</strong><p>Share the work and license, record the receipt and resolve concerns through the agreed human process. Supporting a kitchen is a separate, voluntary choice.</p></div></li></ol><h2>Start with one real artist</h2><p>We will first test the full journey with one consenting artist: terms, test invoice, payment status, delivery and refund handling. A marketplace and checkout are not active on this site.</p><p className="status-note">No commission, sales volume or creator payout is promised. No platform payment destination is published. Artists can help shape the workflow now.</p><a href="#get-started">Use the first-step toolkit ↑</a><p className="source-notes">Candidate technology: <a href="https://docs.btcpayserver.org/Guide/">BTCPay Server</a> and its <a href="https://docs.btcpayserver.org/Users/invoices/">invoice lifecycle</a>. Integration and recovery testing come before accepting payments.</p></section></main>}
