import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, FileSearch, MessageSquareText, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "../components/Reveal";
import { SectionNumber, StatusPill } from "../components/TrustPrimitives";

export const metadata: Metadata = {
  title: "Lunch Time Conversations",
  description: "A source-led public-interest publication from Satnam Satoshi.",
};

const desks = [
  ["01", "Markets & institutions", "Follow the structures connecting public treasuries, funds, settlement, and digital assets."],
  ["02", "Bitcoin standard", "Explain Bitcoin’s monetary, technical, and institutional development without promotion or price theatre."],
  ["03", "Policy & public record", "Translate laws, filings, and official decisions into language people can use."],
  ["04", "Service & community", "Document the people, practices, and open systems turning knowledge into public benefit."],
] as const;

const formats = [
  [Newspaper, "Briefing", "A concise map of what changed, why it matters, and what remains uncertain."],
  [BookOpen, "Essay", "A considered argument with evidence, context, and an accountable point of view."],
  [MessageSquareText, "Conversation", "A human exchange edited for understanding rather than promotion."],
  [FileSearch, "Source file", "Primary documents, methods, charts, and correction history kept together."],
] as const;

export default function ConversationsPage() {
  return (
    <main>
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 lg:px-8 lg:pb-20 lg:pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5 text-[.68rem] uppercase tracking-[.18em] text-muted-foreground">
            <span>A Satnam Satoshi publication</span><span>Evidence · context · conversation</span>
          </div>
          <div className="py-10 text-center sm:py-14">
            <p className="section-kicker">Lunch Time Conversations</p>
            <h1 className="editorial-serif mx-auto max-w-6xl text-balance text-[3.25rem] leading-[.92] tracking-[-.05em] sm:text-7xl lg:text-[7.8rem]">Make the important understandable.</h1>
          </div>
          <div className="grid gap-6 border-y border-border py-5 text-sm text-muted-foreground md:grid-cols-[1fr_auto_1fr] md:items-center">
            <p>A public-interest newspaper for the Bitcoin era.</p>
            <StatusPill state="review">Founding edition in review</StatusPill>
            <p className="md:text-right">Primary sources. Human judgment. Visible corrections.</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="lead-story">
        <Reveal className="grid gap-12 lg:grid-cols-[1.35fr_.65fr]">
          <article className="border-b border-border pb-12 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-14">
            <div className="mb-10 flex items-center gap-3"><SectionNumber>FOUNDING EDITION</SectionNumber><span className="h-px flex-1 bg-border" /></div>
            <p className="text-sm text-primary">Editorial standard</p>
            <h2 id="lead-story" className="editorial-serif mt-4 max-w-4xl text-balance text-5xl leading-[.98] tracking-[-.04em] sm:text-6xl lg:text-7xl">The public record should be easier to understand—and harder to distort.</h2>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">Our first edition explains how a public intelligence institution separates observation from inference, preserves uncertainty, and keeps AI-assisted research accountable to human editors.</p>
            <div className="mt-9 flex flex-wrap items-center gap-5"><Button disabled aria-label="Founding edition is still in editorial review">Read when published</Button><span className="text-xs text-muted-foreground">No publication date claimed until review is complete.</span></div>
          </article>
          <aside aria-label="Editor’s note">
            <SectionNumber>EDITOR’S NOTE</SectionNumber>
            <h2 className="mt-5 text-2xl font-medium tracking-tight">Attention is a public resource.</h2>
            <p className="mt-5 leading-7 text-muted-foreground">We will not fill a daily edition simply because a day has passed. Lunch Time Conversations publishes when evidence and context can leave the reader better informed.</p>
            <div className="mt-10 border-t border-border pt-6"><p className="text-sm font-medium">The editorial compact</p><ul className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">{["Distinguish fact, estimate, and opinion.", "Link to primary sources whenever available.", "Show material corrections on the public record.", "Name the limits of every conclusion."].map((item) => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}</ul></div>
          </aside>
        </Reveal>
      </section>

      <section className="border-y border-border bg-card/35" aria-labelledby="desks-title">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <Reveal><p className="section-kicker">Editorial desks</p><h2 id="desks-title" className="section-title">One publication. Four ways into the story.</h2></Reveal>
          <div className="mt-14 grid border-t border-border md:grid-cols-2">{desks.map(([number, title, body], index) => <article key={title} className={`border-b border-border py-8 md:px-8 ${index % 2 === 0 ? "md:border-r md:pl-0" : "md:pr-0"}`}><SectionNumber>{number}</SectionNumber><h3 className="mt-8 text-2xl font-medium tracking-tight">{title}</h3><p className="mt-4 max-w-lg leading-7 text-muted-foreground">{body}</p></article>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="formats-title">
        <Reveal className="grid gap-12 lg:grid-cols-[.68fr_1.32fr]">
          <div><p className="section-kicker">The edition</p><h2 id="formats-title" className="section-title">Different forms. The same burden of proof.</h2></div>
          <div className="divide-y divide-border border-y border-border">{formats.map(([Icon, title, body]) => <div key={title} className="grid gap-4 py-6 sm:grid-cols-[40px_130px_1fr] sm:items-start"><Icon className="size-5 text-primary" aria-hidden="true" /><h3 className="font-medium">{title}</h3><p className="text-sm leading-6 text-muted-foreground">{body}</p></div>)}</div>
        </Reveal>
      </section>

      <section className="border-y border-border" aria-labelledby="workflow-title">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <Reveal className="grid gap-14 lg:grid-cols-[.8fr_1.2fr]">
            <div><p className="section-kicker">Human + AI newsroom</p><h2 id="workflow-title" className="section-title">Machines widen the field. People carry the judgment.</h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">AI assists with retrieval, comparison, classification, and quality checks. Human editors choose what matters, test the framing, approve the copy, and own every publication decision.</p></div>
            <ol className="divide-y divide-border border-y border-border">{[["01", "Collect", "Gather primary material and preserve retrieval context."], ["02", "Interrogate", "Test claims, compare sources, and expose uncertainty."], ["03", "Edit", "Apply human judgment, proportionality, and clear language."], ["04", "Publish", "Release with sources, classification, and correction state."], ["05", "Correct", "Amend visibly when stronger evidence changes the record."]].map(([number, title, body]) => <li key={number} className="grid gap-3 py-6 sm:grid-cols-[48px_120px_1fr]"><SectionNumber>{number}</SectionNumber><strong className="font-medium">{title}</strong><span className="text-sm leading-6 text-muted-foreground">{body}</span></li>)}</ol>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <Reveal className="rounded-3xl border border-border bg-card p-8 sm:p-12 lg:flex lg:items-end lg:justify-between lg:gap-16">
          <div><p className="section-kicker">Open newsroom</p><h2 className="max-w-3xl text-balance text-4xl font-medium leading-tight tracking-[-.04em] sm:text-5xl">Help us find the evidence worth understanding.</h2><p className="mt-5 max-w-2xl leading-7 text-muted-foreground">Researchers, editors, subject-matter experts, and careful readers can contribute sources and review methods through the open-source project.</p></div>
          <Button asChild variant="secondary" className="mt-8 shrink-0 lg:mt-0"><Link href="/community">Enter the community <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
        </Reveal>
      </section>
    </main>
  );
}
