import Link from "next/link";
import { PageIntro } from "../components/PageIntro";

const sections = [
  ["The problem", "Too many institutions ask people to trust systems they cannot inspect, financial rails they do not control, and AI whose authority is unclear."],
  ["The mission", "Build a Bitcoin-standard, open-source Human + AI Community Operating System for education, humanitarian service, research, and transparent coordination."],
  ["Bitcoin Standard", "Bitcoin is our reserve and reference monetary standard: neutral rules, Proof of Work, self-custody, verifiable scarcity, and long-term discipline."],
  ["Proof of Seva", "Document useful service without turning human worth into a score. Proof of Seva is not a token, wage, ranking market, or investment product."],
  ["Human sovereignty", "Humans retain custody, consent, governance, mission, ethical authority, and treasury control. AI assists; humans remain accountable."],
  ["Open source", "No contributor should need access to a private conversation to understand the project. Architecture, decisions, roadmap, issues, and contribution paths belong in the public record."],
];

export default function MissionPage() {
  return <main>
    <PageIntro eyebrow="Living White Paper · Public Alpha" title="A community operating system built around truth, service, and human sovereignty." description="Satnam Satoshi combines Bitcoin-standard discipline, open-source collaboration, Proof of Seva, and governed AI assistance. This page is the plain-language entry point to the living institutional architecture." />
    <section className="mx-auto max-w-5xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
        {sections.map(([title, body]) => <article key={title} className="bg-card p-7"><h2 className="text-xl font-semibold tracking-tight">{title}</h2><p className="mt-4 leading-7 text-muted-foreground">{body}</p></article>)}
      </div>
      <div className="mt-12 rounded-2xl border border-border bg-card p-7">
        <p className="section-kicker">Long-term vision</p>
        <p className="max-w-3xl text-2xl leading-9 tracking-tight">The goal is not to create another crypto project. The goal is to build a durable institution future communities can inspect, improve, and reuse.</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground" href="/open-source">Explore open source</Link><Link className="rounded-full border border-border bg-secondary px-5 py-3 text-sm font-semibold" href="/community">Join the mission</Link></div>
      </div>
    </section>
  </main>;
}
