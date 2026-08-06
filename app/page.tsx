import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { pillars, productCards, trustItems } from "./data/content";

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div className="hero-grid-pattern absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-16 px-5 py-24 md:py-32 lg:grid-cols-[1.25fr_.75fr] lg:px-8 lg:py-40">
          <div>
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.18em] text-primary">Open-source humanitarian infrastructure</p>
            <h1 className="max-w-5xl text-balance text-6xl font-medium leading-[.95] tracking-[-0.055em] sm:text-7xl lg:text-[5.8rem]">Build trust.<br />Serve humanity.</h1>
            <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">Satnam Satoshi brings people and AI together to strengthen public knowledge, transparent institutions, and community service—grounded in Bitcoin’s discipline and the practice of seva.</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild><Link href="/community">Participate <ArrowRight className="size-4" /></Link></Button>
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
                <div className="flex items-center gap-3"><CheckCircle2 className="size-4 text-primary" /><span>Constitutional foundation established</span></div>
                <div className="flex items-center gap-3"><CheckCircle2 className="size-4 text-primary" /><span>Public trust architecture prepared</span></div>
                <div className="flex items-center gap-3 text-muted-foreground"><Clock3 className="size-4" /><span>Founder-reviewed public beta in progress</span></div>
              </div>
              <Link href="/open-source" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">View the public roadmap <ArrowRight className="size-4" /></Link>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div><p className="section-kicker">Why we exist</p><h2 className="section-title">Technology should deepen human responsibility.</h2></div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
            {pillars.map(({ title, body, icon: Icon }) => <div key={title} className="bg-card p-7"><Icon className="mb-8 size-5 text-primary" /><h3 className="font-medium">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p></div>)}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="mb-12 max-w-3xl"><p className="section-kicker">Version 1</p><h2 className="section-title">Four public surfaces. One standard of trust.</h2><p className="mt-5 text-lg leading-8 text-muted-foreground">The first release focuses on useful, inspectable work—not financial products, token promotion, or promises.</p></div>
          <div className="grid gap-4 lg:grid-cols-3">
            {productCards.map(({ title, body, href, label, icon: Icon }) => <Card key={title} className="group flex min-h-80 flex-col p-7 transition-colors hover:border-primary/40"><Icon className="size-6 text-primary" /><h3 className="mt-auto text-2xl font-medium tracking-tight">{title}</h3><p className="mt-4 text-sm leading-6 text-muted-foreground">{body}</p><Link href={href} className="mt-6 inline-flex items-center gap-2 text-sm text-primary">{label}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link></Card>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div><p className="section-kicker">Latest daily report</p><h2 className="section-title">Research that shows its work.</h2><p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">Every public observation is designed to carry its source, effective time, retrieval time, classification, confidence, and correction state.</p><Button asChild variant="secondary" className="mt-8"><Link href="/conversations">Open Lunch Time Conversations</Link></Button></div>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-5"><span className="text-xs font-medium uppercase tracking-[.14em] text-muted-foreground">Editorial status</span><span className="text-xs text-primary">Methodology prepared</span></div>
            <div className="p-7"><p className="text-sm text-muted-foreground">Founding edition</p><h3 className="mt-3 text-3xl font-medium tracking-tight">The public record should be easier to understand—and harder to distort.</h3><p className="mt-5 leading-7 text-muted-foreground">The first edition will introduce the evidence hierarchy behind Treasury Intelligence and explain how human editors review AI-assisted research before publication.</p><div className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-5 text-xs text-muted-foreground"><span>Primary sources</span><span>Human review</span><span>Corrections visible</span></div></div>
          </Card>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="mb-12 max-w-3xl"><p className="section-kicker">Transparency</p><h2 className="section-title">Trust is a product surface.</h2></div>
          <div className="divide-y divide-border border-y border-border">
            {trustItems.map(({ label, detail, icon: Icon }) => <div key={label} className="grid gap-4 py-6 sm:grid-cols-[40px_180px_1fr] sm:items-center"><Icon className="size-5 text-primary" /><strong className="font-medium">{label}</strong><span className="text-sm leading-6 text-muted-foreground">{detail}</span></div>)}
          </div>
        </div>
      </section>
    </main>
  );
}
