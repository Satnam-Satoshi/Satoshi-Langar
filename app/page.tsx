import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, GitBranch, HandHeart, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "./components/Reveal";
import { humanAiRoles, participationToday, pillars, productCards, sevaSteps, trustItems } from "./data/content";

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div className="hero-grid-pattern absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-16 px-5 py-24 md:py-32 lg:grid-cols-[1.25fr_.75fr] lg:px-8 lg:py-40">
          <div>
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.18em] text-primary">Open-source humanitarian infrastructure</p>
            <h1 className="max-w-5xl text-balance text-6xl font-medium leading-[.95] tracking-[-0.055em] sm:text-7xl lg:text-[5.8rem]">Build trust.<br />Serve humanity.</h1>
            <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">Satnam Satoshi is a public institution for service, education, and transparent collaboration—grounded in Bitcoin’s discipline, the practice of seva, and the belief that technology should make responsibility easier to see.</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild><Link href="#participate">Participate today <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
              <Button asChild variant="secondary"><Link href="/about">How we are governed</Link></Button>
            </div>
          </div>
          <Card className="self-end overflow-hidden bg-card/80 p-1 backdrop-blur">
            <div className="border-b border-border p-5">
              <div className="flex items-center justify-between gap-4"><span className="text-xs font-medium uppercase tracking-[.14em] text-muted-foreground">Institution status</span><span className="inline-flex items-center gap-2 text-xs text-primary"><span className="size-1.5 rounded-full bg-primary" />Building in public</span></div>
            </div>
            <div className="space-y-6 p-6">
              <div><span className="text-sm text-muted-foreground">Current expedition</span><p className="mt-2 text-xl font-medium">Satnam.x Version 1</p></div>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-3"><CheckCircle2 className="size-4 text-primary" aria-hidden="true" /><span>Constitutional foundation established</span></div>
                <div className="flex items-center gap-3"><CheckCircle2 className="size-4 text-primary" aria-hidden="true" /><span>Public trust architecture prepared</span></div>
                <div className="flex items-center gap-3 text-muted-foreground"><Clock3 className="size-4" aria-hidden="true" /><span>Founder-reviewed public beta in progress</span></div>
              </div>
              <Link href="/open-source" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">View the public roadmap <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="why-title">
        <Reveal className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div><p className="section-kicker">Why we exist</p><h2 id="why-title" className="section-title">Technology should deepen human responsibility.</h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">Public systems are difficult to trust when their evidence, ownership, and incentives are hidden. Satnam Satoshi exists to make those relationships legible.</p></div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
            {pillars.map(({ title, body, icon: Icon }) => <div key={title} className="bg-card p-7"><Icon className="mb-8 size-5 text-primary" aria-hidden="true" /><h3 className="font-medium">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p></div>)}
          </div>
        </Reveal>
      </section>

      <section className="border-y border-border bg-card/40" aria-labelledby="seva-title">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div><HandHeart className="mb-7 size-7 text-primary" aria-hidden="true" /><p className="section-kicker">Proof of Seva</p><h2 id="seva-title" className="section-title">Service made visible. Human worth left unscored.</h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">Proof of Seva is a method for documenting useful contribution and learning—not a token, wage, reputation market, or ranking of people.</p></div>
            <ol className="divide-y divide-border border-y border-border">
              {sevaSteps.map(({ number, title, body }) => <li key={number} className="grid gap-3 py-6 sm:grid-cols-[48px_170px_1fr] sm:items-start"><span className="font-mono text-xs text-primary">{number}</span><strong className="font-medium">{title}</strong><span className="text-sm leading-6 text-muted-foreground">{body}</span></li>)}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="products-title">
        <Reveal>
          <div className="mb-12 max-w-3xl"><p className="section-kicker">What we are building</p><h2 id="products-title" className="section-title">Three products. One standard of public trust.</h2><p className="mt-5 text-lg leading-8 text-muted-foreground">Version 1 focuses on useful, inspectable work—not financial products, token promotion, or promises.</p></div>
          <div className="grid gap-4 lg:grid-cols-3">
            {productCards.map(({ title, body, href, label, icon: Icon }) => <Card key={title} className="group flex min-h-80 flex-col p-7 transition-colors hover:border-primary/40"><Icon className="size-6 text-primary" aria-hidden="true" /><h3 className="mt-auto text-2xl font-medium tracking-tight">{title}</h3><p className="mt-4 text-sm leading-6 text-muted-foreground">{body}</p><Link href={href} className="mt-6 inline-flex items-center gap-2 text-sm text-primary">{label}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></Card>)}
          </div>
        </Reveal>
      </section>

      <section className="border-y border-border bg-card/40" aria-labelledby="collaboration-title">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div><div className="mb-7 flex gap-2 text-primary"><Users className="size-6" aria-hidden="true" /><Sparkles className="size-5" aria-hidden="true" /></div><p className="section-kicker">AI + humans</p><h2 id="collaboration-title" className="section-title">AI coordinates. Humans govern.</h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">AI can expand the institution’s capacity, but it cannot inherit moral authority, consent, treasury control, or responsibility.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {humanAiRoles.map(({ label, items }) => <Card key={label} className="p-7"><h3 className="text-xl font-medium">{label}</h3><ul className="mt-8 space-y-4">{items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}</ul></Card>)}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="report-title">
        <Reveal className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div><p className="section-kicker">Lunch Time Conversations</p><h2 id="report-title" className="section-title">Research that shows its work.</h2><p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">Every public observation is designed to carry its source, effective time, retrieval time, classification, confidence, and correction state.</p><Button asChild variant="secondary" className="mt-8"><Link href="/conversations">Open the publication</Link></Button></div>
          <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-border p-5"><span className="text-xs font-medium uppercase tracking-[.14em] text-muted-foreground">Editorial status</span><span className="text-xs text-primary">Methodology prepared</span></div><div className="p-7"><p className="text-sm text-muted-foreground">Founding edition</p><h3 className="mt-3 text-3xl font-medium tracking-tight">The public record should be easier to understand—and harder to distort.</h3><p className="mt-5 leading-7 text-muted-foreground">The first edition introduces the evidence hierarchy behind Treasury Intelligence and explains how human editors review AI-assisted research before publication.</p><div className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-5 text-xs text-muted-foreground"><span>Primary sources</span><span>Human review</span><span>Corrections visible</span></div></div></Card>
        </Reveal>
      </section>

      <section className="border-y border-border" aria-labelledby="transparency-title">
        <Reveal className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="mb-12 max-w-3xl"><p className="section-kicker">Transparency</p><h2 id="transparency-title" className="section-title">Trust is a product surface.</h2></div>
          <div className="divide-y divide-border border-y border-border">{trustItems.map(({ label, detail, icon: Icon }) => <div key={label} className="grid gap-4 py-6 sm:grid-cols-[40px_180px_1fr] sm:items-center"><Icon className="size-5 text-primary" aria-hidden="true" /><strong className="font-medium">{label}</strong><span className="text-sm leading-6 text-muted-foreground">{detail}</span></div>)}</div>
        </Reveal>
      </section>

      <section id="participate" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="participate-title">
        <Reveal>
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]"><div><p className="section-kicker">Participate today</p><h2 id="participate-title" className="section-title">Bring the skill you already have.</h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">Begin with one useful, reviewable contribution. No token, payment, or membership is required.</p><Button asChild className="mt-8"><Link href="/community">Choose a contribution path <ArrowRight className="size-4" aria-hidden="true" /></Link></Button></div><div className="divide-y divide-border border-y border-border">{participationToday.map(({ title, body, icon: Icon }) => <div key={title} className="grid gap-3 py-5 sm:grid-cols-[36px_180px_1fr] sm:items-center"><Icon className="size-5 text-primary" aria-hidden="true" /><strong className="font-medium">{title}</strong><span className="text-sm leading-6 text-muted-foreground">{body}</span></div>)}</div></div>
          <div className="mt-16 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-border bg-card p-6"><div><p className="font-medium">The work is public by design.</p><p className="mt-1 text-sm text-muted-foreground">Roadmap, issues, decisions, and contributor paths live in the open-source program.</p></div><Button asChild variant="secondary"><Link href="/open-source"><GitBranch className="size-4" aria-hidden="true" />Explore open source</Link></Button></div>
        </Reveal>
      </section>
    </main>
  );
}
