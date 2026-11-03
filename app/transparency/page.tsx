import Link from "next/link";
import { PageIntro } from "../components/PageIntro";

export const metadata = { title: 'Transparency · Project status, authority and corrections', description: 'Review the project’s publication, learning, sign-in and channel status, with human decision roles, AI limitations and a record of remaining work.' };

const status = [
  ["Satnam Satoshi website", "PUBLISHED", "The community website and LTC Magazine are published on their HTTPS domains. Program pilots and the satnam.x domain connection remain separate milestones."],
  ["Sikh Bitcoin", "63 LESSONS", "Three courses with 21 lessons each, plus quizzes and browser-local progress. Independent educational review remains pending."],
  ["Lunch Time Conversations", "LOCAL DAILY WORKFLOW", "The local daily publication workflow is active and depends on the host, network and authenticated services. The cloud scheduler is inactive; the latest successful issue keeps its original date."],
  ["Member sign-in", "GOOGLE SIGN-IN", "Optional Google sign-in and session recovery were verified in the October 5 release. Accounts do not create public member profiles, synchronize learning progress or subscribe members to email."],
  ["Community channels", "PROFILES LINKED", "X, Instagram and YouTube profiles are created and linked; GitHub is available. A first public narrated YouTube upload is not verified. Nostr and Matrix remain planned."],
  ["Magazine email", "NOT OPEN", "Newsletter subscription is disabled. The site does not collect newsletter addresses; readers can follow the publication through its RSS feeds."],
  ["Donations", "ADDRESSES PUBLISHED", "Founder-supplied native BTC/LTC addresses and QR codes. No balance monitoring, test transfer or automated receipt service."],
  ["Bitcoin meetups", "HOST INVITATION", "No event date, venue or partner is confirmed."],
  ["Treasury Intelligence", "BUILDING", "Read-only research interface. No custody, trading, or autonomous execution."],
  ["Satoshi Langar", "BUILDING", "Mission and workflow are public; field pilots and operating controls are not yet live."],
  ["Kalakar.x", "RESEARCH", "Creative ideas and contributions are welcome; no marketplace or paid commissions are active."],
  ["Agent Sangat", "RESEARCH", "Scoped task and permission documents are available. Ongoing agent jobs and unfilled steward roles are not presented as running."],
  ["Crypto Kitty", "RESEARCH", "No pooled investment system is live. Legal and cooperative structures require review before any pilot."],
];

export default function TransparencyPage() {
  return <main>
    <PageIntro eyebrow="Transparency · Status record · October 5, 2026" title="See what is real, what is unfinished, and who has authority." description="Trust should come from inspectable work, explicit limitations, visible corrections, and clear human accountability—not from branding or promises." />
    <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {status.map(([name, state, detail]) => <div key={name} className="grid gap-3 border-b border-border p-6 last:border-b-0 md:grid-cols-[1fr_140px_2fr] md:items-center"><strong>{name}</strong><span className="text-xs font-semibold tracking-[.16em] text-primary">{state}</span><span className="text-sm leading-6 text-muted-foreground">{detail}</span></div>)}
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-7"><p className="section-kicker">Human governance</p><h2 className="text-2xl font-semibold">Humans retain authority.</h2><p className="mt-4 leading-7 text-muted-foreground">Custody, consent, governance, mission, ethical authority, treasury control, production release, contracts, and legal commitments remain human decisions.</p></article>
        <article className="rounded-2xl border border-border bg-card p-7"><p className="section-kicker">AI limitations</p><h2 className="text-2xl font-semibold">AI serves within boundaries.</h2><p className="mt-4 leading-7 text-muted-foreground">AI may research, draft, test, coordinate, and recommend. It does not hold private keys, move assets, merge protected production, or bypass human governance.</p></article>
        <article className="rounded-2xl border border-border bg-card p-7"><p className="section-kicker">Treasury policy</p><h2 className="text-2xl font-semibold">Research is separate from custody.</h2><p className="mt-4 leading-7 text-muted-foreground">Bitcoin informs our long-term design; Treasury Intelligence is read-only. Community funds are not represented as investments or pooled funds without an appropriate legal structure.</p></article>
        <article className="rounded-2xl border border-border bg-card p-7"><p className="section-kicker">Corrections</p><h2 className="text-2xl font-semibold">Correct the record, do not erase it.</h2><p className="mt-4 leading-7 text-muted-foreground">Material corrections should preserve edition IDs, timestamps, source manifests, version history, and canonical Git history wherever practical.</p></article>
      </div>
      <div className="mt-12 flex flex-wrap gap-3"><Link href="/open-source" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Verify on GitHub</Link><Link href="/community" className="rounded-full border border-border bg-secondary px-5 py-3 text-sm font-semibold">Help improve the work</Link></div>
    </section>
  </main>;
}
