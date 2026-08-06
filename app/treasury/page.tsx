import type { Metadata } from "next";
import { ArrowRight, Bitcoin, BookOpenCheck, Building2, Database, FileCheck2, Landmark, Scale, ShieldCheck, Waypoints } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EvidenceRow, SectionNumber, StatusPill } from "../components/TrustPrimitives";
import { Reveal } from "../components/Reveal";

export const metadata: Metadata = {
  title: "Treasury Intelligence",
  description: "Source-visible research for understanding public Bitcoin, Litecoin, Stellar, ETF, and institutional treasury activity.",
};

const networks = [
  { symbol: "BTC", title: "Bitcoin", question: "Why Bitcoin?", body: "The clearest public test of digitally scarce, independently verifiable monetary infrastructure—and the center of institutional treasury adoption.", icon: Bitcoin },
  { symbol: "LTC", title: "Litecoin", question: "Why Litecoin?", body: "A durable proof-of-work network with a long operating history, payment utility, and an institutional record that deserves the same evidentiary discipline.", icon: Waypoints },
  { symbol: "XLM", title: "Stellar", question: "Why Stellar?", body: "Public infrastructure for payments and tokenized assets, connecting network research to regulated financial institutions and real-world settlement.", icon: Landmark },
] as const;

const coverage = [
  ["Public treasuries", "Companies, governments, funds, and institutions—without confusing custody with ownership."],
  ["ETFs and ETPs", "Flows, holdings, issuer disclosures, and reconciliations between reported and estimated data."],
  ["Policy and law", "Primary legislation, regulator actions, and exact procedural status rather than headline summaries."],
  ["Network evidence", "Core software, security, usage, and infrastructure developments from official sources."],
] as const;

const pipeline = [
  ["Source registry", "13 governed sources", "Verified"],
  ["Primary-source policy", "Required for material claims", "Active"],
  ["Classification model", "Fact · estimate · interpretation", "Prepared"],
  ["Public daily dataset", "Awaiting ingestion verification", "Not live"],
] as const;

export default function TreasuryPage() {
  return <main>
    <section className="relative overflow-hidden border-b border-border">
      <div className="hero-grid-pattern absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="relative mx-auto grid min-h-[72svh] max-w-7xl items-end gap-14 px-5 py-20 md:py-28 lg:grid-cols-[1.15fr_.85fr] lg:px-8">
        <div>
          <p className="section-kicker">Treasury Intelligence</p>
          <h1 className="max-w-4xl text-balance text-5xl font-medium leading-[.96] tracking-[-.052em] sm:text-7xl lg:text-[5.4rem]">See the evidence.<br/><span className="text-muted-foreground">Then form a view.</span></h1>
          <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">A public research system for understanding Bitcoin-standard institutions—built to expose sources, uncertainty, classifications, and corrections.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Button asChild><Link href="#method">Read the method <ArrowRight className="size-4" aria-hidden="true"/></Link></Button><Button asChild variant="secondary"><Link href="#coverage">Explore coverage</Link></Button></div>
        </div>
        <Card className="overflow-hidden bg-card/70 backdrop-blur">
          <div className="flex items-center justify-between gap-4 border-b border-border p-5"><span className="text-xs uppercase tracking-[.16em] text-muted-foreground">Research system</span><StatusPill state="preparing">Pre-publication</StatusPill></div>
          <div className="p-6"><p className="text-sm text-muted-foreground">Evidence readiness</p><p className="mt-3 text-4xl font-medium tracking-[-.04em]">Method first.</p><p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">We will not display live treasury figures until ingestion, reconciliation, freshness, and correction controls are verified.</p><div className="mt-8 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">Read-only research · No custody · No execution · No individualized financial advice</div></div>
        </Card>
      </div>
    </section>

    <section id="coverage" className="scroll-mt-24 border-b border-border" aria-labelledby="coverage-title"><Reveal className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]"><div><SectionNumber>01 / COVERAGE</SectionNumber><h2 id="coverage-title" className="section-title mt-5">An institutional map, not a price screen.</h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">Treasury Intelligence connects balance sheets, public policy, market structure, and network health. Every category has boundaries.</p></div><div className="border-y border-border">{coverage.map(([title,body],index)=><div key={title} className="grid gap-3 border-t border-border py-6 first:border-t-0 sm:grid-cols-[3rem_12rem_1fr]"><span className="font-mono text-xs text-primary">0{index+1}</span><h3 className="font-medium">{title}</h3><p className="text-sm leading-6 text-muted-foreground">{body}</p></div>)}</div></div>
    </Reveal></section>

    <section className="bg-card/35" aria-labelledby="networks-title"><Reveal className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
      <div className="mb-12 max-w-3xl"><SectionNumber>02 / NETWORKS</SectionNumber><h2 id="networks-title" className="section-title mt-5">Three networks. Three distinct questions.</h2><p className="mt-5 text-lg leading-8 text-muted-foreground">Coverage is based on public relevance—not promotion or price speculation.</p></div>
      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-3">{networks.map(({symbol,title,question,body,icon:Icon})=><article key={symbol} className="group flex min-h-[25rem] flex-col bg-card p-7"><div className="flex items-center justify-between"><Icon className="size-5 text-primary" aria-hidden="true"/><span className="font-mono text-xs text-muted-foreground">{symbol}</span></div><div className="mt-auto"><p className="text-xs uppercase tracking-[.16em] text-primary">{question}</p><h3 className="mt-4 text-3xl font-medium tracking-[-.035em]">{title}</h3><p className="mt-5 text-sm leading-6 text-muted-foreground">{body}</p></div></article>)}</div>
    </Reveal></section>

    <section id="method" className="scroll-mt-24 border-y border-border" aria-labelledby="method-title"><Reveal className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]"><div><SectionNumber>03 / METHOD</SectionNumber><h2 id="method-title" className="section-title mt-5">Every claim carries its receipt.</h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">A number without provenance is only decoration. Published observations are designed to preserve who said what, when it was true, when we retrieved it, and how confidently it can be used.</p></div><div className="grid gap-4 sm:grid-cols-2">{[[FileCheck2,"Provenance","Source, retrieval time, effective time, and methodology."],[Scale,"Classification","Verified fact, reported claim, estimate, interpretation, or dispute."],[ShieldCheck,"Verification","Confidence, corroboration, reviewer, and correction state."],[BookOpenCheck,"Plain language","Why the observation matters and what it does not prove."]].map(([I,t,b])=>{const Icon=I as typeof FileCheck2;return <Card key={String(t)} className="p-7"><Icon className="size-5 text-primary" aria-hidden="true"/><h3 className="mt-10 text-xl font-medium">{String(t)}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{String(b)}</p></Card>})}</div></div>
    </Reveal></section>

    <section aria-labelledby="readiness-title"><Reveal className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]"><div><SectionNumber>04 / READINESS</SectionNumber><h2 id="readiness-title" className="section-title mt-5">Transparency begins before launch.</h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">This status is intentionally visible. Prepared architecture is not presented as live intelligence.</p></div><Card className="px-6 py-2">{pipeline.map(([label,detail,status])=><EvidenceRow key={label} label={label} value={status} detail={detail} status={status}/>)}</Card></div>
      <div className="mt-16 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-8"><div className="flex items-center gap-3 text-sm text-muted-foreground"><Building2 className="size-4 text-primary" aria-hidden="true"/>Designed for institutions, researchers, communities, and public-interest reporting.</div><Link href="/conversations" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">See how research becomes a public story <ArrowRight className="size-4" aria-hidden="true"/></Link></div>
    </Reveal></section>
  </main>;
}
