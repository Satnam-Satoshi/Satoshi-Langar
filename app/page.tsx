import Link from "next/link";
import { ArrowRight, Bitcoin, CheckCircle2, GitBranch, HandHeart, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "./components/Reveal";
import { humanAiRoles, participationToday, pillars, productCards, sevaSteps, trustItems } from "./data/content";

const standard = [
  ["Bitcoin Standard", "Long-horizon discipline, verifiability, self-custody, and rules stronger than personalities."],
  ["Proof of Work", "Useful effort should be visible, inspectable, and grounded in reality."],
  ["Proof of Seva", "Service can be documented without turning human dignity into a score or financial instrument."],
  ["Human Authority", "AI expands capacity. Humans retain consent, governance, custody, mission, and responsibility."],
] as const;

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div className="hero-grid-pattern absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.07] to-transparent" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-7xl items-center gap-16 px-5 py-20 md:py-28 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-28">
          <div>
            <div className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium uppercase tracking-[0.17em] text-muted-foreground">
              <span className="text-primary">Satnam Satoshi</span>
              <span aria-hidden="true">·</span>
              <span>Human + AI</span>
              <span aria-hidden="true">·</span>
              <span>Bitcoin Standard</span>
            </div>
            <h1 className="max-w-5xl text-balance text-6xl font-medium leading-[.94] tracking-[-0.058em] sm:text-7xl lg:text-[5.9rem]">
              A place to learn,
              <br />
              build, serve,
              <br />
              <span className="text-muted-foreground">and belong.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              Satnam Satoshi is an open-source global community building public-interest infrastructure on the Bitcoin Standard—where humans keep authority and AI helps people coordinate knowledge, service, and useful work.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild><Link href="#participate">Enter the Digital Darbar <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
              <Button asChild variant="secondary"><Link href="/mission">Read the Living White Paper</Link></Button>
            </div>
            <p className="mt-7 max-w-xl text-sm leading-6 text-muted-foreground">
              No token is required to join. No private keys are requested. Contribution begins with one useful, reviewable act.
            </p>
          </div>

          <div className="self-center">
            <Card className="overflow-hidden border-border/80 bg-card/90 shadow-[0_28px_90px_rgba(0,0,0,.08)] backdrop-blur">
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div className="flex items-center gap-2 text-primary"><Bitcoin className="size-5" aria-hidden="true" /><span className="text-xs font-medium uppercase tracking-[.16em]">The standard</span></div>
                <span className="text-xs text-muted-foreground">Public Alpha</span>
              </div>
              <div className="divide-y divide-border">
                {standard.map(([title, body], index) => (
                  <div key={title} className="grid gap-3 px-6 py-6 sm:grid-cols-[2rem_9.5rem_1fr]">
                    <span className="font-mono text-xs text-primary">0{index + 1}</span>
                    <strong className="font-medium">{title}</strong>
                    <p className="text-sm leading-6 text-muted-foreground">{body}</p>
                  </div>
                ))}
              </div>
            </Card>
            <div className="editorial-rule mt-8 text-[.68rem] uppercase tracking-[.17em]"><span>Build in public · Serve in public · Correct in public</span></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="why-title">
        <Reveal className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="section-kicker">Why we exist</p>
            <h2 id="why-title" className="section-title">Technology should make human responsibility easier to see.</h2>
            <p className="mt-6 max-w-md leading-7 text-muted-foreground">The internet made coordination global. Bitcoin made verification global. AI can make knowledge easier to navigate. Satnam Satoshi brings those capabilities together around service rather than speculation.</p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-[0_24px_80px_rgba(0,0,0,.08)] sm:grid-cols-2">
            {pillars.map(({ title, body, icon: Icon }) => <div key={title} className="bg-card p-7"><Icon className="mb-8 size-5 text-primary" aria-hidden="true" /><h3 className="font-medium">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p></div>)}
          </div>
        </Reveal>
      </section>

      <section className="border-y border-border bg-card/35" aria-labelledby="langar-title">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="grid gap-12 lg:grid-cols-[.78fr_1.22fr]">
            <div>
              <HandHeart className="mb-7 size-7 text-primary" aria-hidden="true" />
              <p className="section-kicker">Satoshi Langar</p>
              <h2 id="langar-title" className="section-title">Use intelligence to help feed humanity.</h2>
              <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">Langar is the clearest expression of the mission: identify need, coordinate people and resources, preserve dignity, document what happened, and make the learning reusable for the next community.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Button asChild><Link href="/langar">Explore Satoshi Langar <ArrowRight className="size-4" aria-hidden="true" /></Link></Button><Button asChild variant="secondary"><Link href="/community">Volunteer a skill</Link></Button></div>
            </div>
            <Card className="overflow-hidden">
              <div className="border-b border-border p-6"><p className="text-xs font-medium uppercase tracking-[.16em] text-muted-foreground">A human-first coordination loop</p></div>
              <div className="divide-y divide-border">
                {["Need is identified with consent", "Humans and AI coordinate useful work", "Local people act", "Evidence and lessons are documented", "The community improves the next act of service"].map((item, index) => (
                  <div key={item} className="grid grid-cols-[2rem_1fr] gap-4 px-6 py-5"><span className="font-mono text-xs text-primary">0{index + 1}</span><p className="text-sm leading-6">{item}</p></div>
                ))}
              </div>
              <div className="border-t border-border bg-background/50 px-6 py-5 text-xs leading-5 text-muted-foreground">Human dignity is not scored. AI does not control funds, custody, or beneficiaries.</div>
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="seva-title">
        <Reveal className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
          <div><p className="section-kicker">Proof of Seva</p><h2 id="seva-title" className="section-title">Service made visible. Human worth left unscored.</h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">Proof of Seva is a method for documenting useful contribution and learning—not a token, wage, reputation market, or ranking of people.</p></div>
          <ol className="divide-y divide-border border-y border-border" aria-label="How Proof of Seva works">
            {sevaSteps.map(({ number, title, body }) => <li key={number} className="grid gap-3 py-6 sm:grid-cols-[48px_170px_1fr] sm:items-start"><span className="font-mono text-xs text-primary">{number}</span><strong className="font-medium">{title}</strong><span className="text-sm leading-6 text-muted-foreground">{body}</span></li>)}
          </ol>
        </Reveal>
      </section>

      <section className="border-y border-border bg-card/35" aria-labelledby="products-title">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <div className="mb-12 max-w-3xl"><p className="section-kicker">Public work</p><h2 id="products-title" className="section-title">Research, publication, and service—built where people can inspect them.</h2><p className="mt-5 text-lg leading-8 text-muted-foreground">Public Alpha keeps the surface intentionally small. Every project is labeled by maturity so plans are never presented as completed systems.</p></div>
            <div className="grid gap-4 lg:grid-cols-3">
              {productCards.map(({ title, body, href, label, icon: Icon }) => <Card key={title} className="group flex min-h-80 flex-col p-7 transition-colors hover:border-primary/40"><Icon className="size-6 text-primary" aria-hidden="true" /><h3 className="mt-auto text-2xl font-medium tracking-tight">{title}</h3><p className="mt-4 text-sm leading-6 text-muted-foreground">{body}</p><Link href={href} className="mt-6 inline-flex items-center gap-2 text-sm text-primary">{label}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></Card>)}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="collaboration-title">
        <Reveal className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
          <div><div className="mb-7 flex gap-2 text-primary"><Users className="size-6" aria-hidden="true" /><Sparkles className="size-5" aria-hidden="true" /></div><p className="section-kicker">Human + AI</p><h2 id="collaboration-title" className="section-title">AI helps the Sangat navigate. Humans remain responsible.</h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">AI can research, organize, explain, test, and coordinate. It cannot inherit moral authority, consent, treasury control, custody, or legal responsibility.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {humanAiRoles.map(({ label, items }) => <Card key={label} className="p-7"><h3 className="text-xl font-medium">{label}</h3><ul className="mt-8 space-y-4">{items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}</ul></Card>)}
          </div>
        </Reveal>
      </section>

      <section className="border-y border-border bg-card/35" aria-labelledby="report-title">
        <Reveal className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-8 lg:py-28">
          <div><p className="section-kicker">Lunch Time Conversations</p><h2 id="report-title" className="section-title">A daily public record that shows its work.</h2><p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">Research should come with receipts: source, effective time, retrieval time, classification, confidence, and correction state.</p><Button asChild variant="secondary" className="mt-8"><Link href="/conversations">Read the publication</Link></Button></div>
          <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-border p-5"><span className="text-xs font-medium uppercase tracking-[.14em] text-muted-foreground">Editorial standard</span><span className="text-xs text-primary">Evidence before narrative</span></div><div className="p-7"><p className="text-sm text-muted-foreground">Lunch Time Conversations</p><h3 className="mt-3 text-3xl font-medium tracking-tight">Understand the day without surrendering your judgment.</h3><p className="mt-5 leading-7 text-muted-foreground">The publication connects Bitcoin, Litecoin, Stellar, public policy, treasuries, infrastructure, and community progress while clearly separating verified facts, estimates, interpretation, and open questions.</p><div className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-5 text-xs text-muted-foreground"><span>Primary sources</span><span>Human review</span><span>Corrections visible</span></div></div></Card>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="transparency-title">
        <Reveal>
          <div className="mb-12 max-w-3xl"><p className="section-kicker">Transparency</p><h2 id="transparency-title" className="section-title">Trust should be inspectable, not requested.</h2></div>
          <div className="divide-y divide-border border-y border-border">{trustItems.map(({ label, detail, icon: Icon }) => <div key={label} className="grid gap-4 py-6 sm:grid-cols-[40px_180px_1fr] sm:items-center"><Icon className="size-5 text-primary" aria-hidden="true" /><strong className="font-medium">{label}</strong><span className="text-sm leading-6 text-muted-foreground">{detail}</span></div>)}</div>
        </Reveal>
      </section>

      <section id="participate" className="border-t border-border bg-card/35" aria-labelledby="participate-title">
        <Reveal className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <div><p className="section-kicker">The Digital Darbar</p><h2 id="participate-title" className="section-title">Bring the skill you already have.</h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">Researchers can research. Developers can build. Artists can create. Writers can publish. Volunteers can serve. Translators can open doors. Begin with one useful contribution.</p><Button asChild className="mt-8"><Link href="/community">Find your place <ArrowRight className="size-4" aria-hidden="true" /></Link></Button></div>
            <div className="divide-y divide-border border-y border-border">{participationToday.map(({ title, body, icon: Icon }) => <div key={title} className="grid gap-3 py-5 sm:grid-cols-[36px_180px_1fr] sm:items-center"><Icon className="size-5 text-primary" aria-hidden="true" /><strong className="font-medium">{title}</strong><span className="text-sm leading-6 text-muted-foreground">{body}</span></div>)}</div>
          </div>
          <div className="mt-16 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-border bg-background p-6"><div><p className="font-medium">The institution is built in public.</p><p className="mt-1 text-sm text-muted-foreground">Roadmap, issues, decisions, architecture, and contribution paths live in the open-source program.</p></div><Button asChild variant="secondary"><Link href="/open-source"><GitBranch className="size-4" aria-hidden="true" />Build with us</Link></Button></div>
        </Reveal>
      </section>
    </main>
  );
}
