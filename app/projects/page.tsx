import Link from "next/link";
import { PageIntro } from "../components/PageIntro";

const projects = [
  { name: "Lunch Time Conversations", status: "BUILDING", body: "Institutional publication and research archive with canonical Markdown, source metadata, corrections, and print/PDF outputs.", href: "/conversations" },
  { name: "Satoshi Langar", status: "BUILDING", body: "Humanitarian coordination using AI and open infrastructure to help communities feed people with dignity.", href: "/langar" },
  { name: "Treasury Intelligence", status: "BUILDING", body: "Read-only, evidence-led research on public treasury holdings, custody, beneficial ownership, and policy.", href: "/treasury" },
  { name: "Proof of Seva", status: "RESEARCH", body: "A privacy-aware framework for documenting useful service without commodifying human worth.", href: "/mission" },
  { name: "Agent Sangat", status: "RESEARCH", body: "Governed Human + AI collaboration with explicit permissions, human ownership, audit trails, and emergency stops.", href: "/open-source" },
  { name: "Kalakar.x", status: "RESEARCH", body: "Creator and cultural contribution infrastructure focused on attribution, dignity, licensing, and community patronage.", href: "/community" },
  { name: "Crypto Kitty", status: "RESEARCH", body: "Legal and institutional research into cooperative, mutual-aid, and community savings-circle models.", href: "/transparency" },
  { name: "Sikka / Seva tools", status: "FUTURE", body: "Future community tools subject to architecture, security, privacy, governance, and legal review.", href: "/transparency" },
];

export default function ProjectsPage() {
  return <main>
    <PageIntro eyebrow="Projects · Public Alpha" title="Build useful things. Label their maturity honestly." description="Satnam Satoshi ships in public. Every project is marked so visitors can distinguish what exists today from what is still being designed or researched." />
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => <article key={project.name} className="flex min-h-72 flex-col rounded-2xl border border-border bg-card p-7 shadow-[0_18px_55px_rgba(20,35,55,.05)]"><span className="text-xs font-semibold tracking-[.16em] text-primary">{project.status}</span><h2 className="mt-8 text-2xl font-semibold tracking-tight">{project.name}</h2><p className="mt-4 leading-7 text-muted-foreground">{project.body}</p><Link href={project.href} className="mt-auto pt-8 text-sm font-semibold text-primary">Explore →</Link></article>)}
      </div>
    </section>
  </main>;
}
