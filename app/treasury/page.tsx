import { Database, FileCheck2, RefreshCcw, Scale, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageIntro } from "../components/PageIntro";

const assets = [
  ["Bitcoin", "Public-company, sovereign, fund, and institutional observations."],
  ["Litecoin", "A dedicated institutional register with the same evidence standard."],
  ["Stellar", "Payments, tokenization, and public-infrastructure research."],
  ["ETFs", "Issuer flows, holdings, disclosures, and source reconciliation."],
];

export default function TreasuryPage() {
  return <main><PageIntro eyebrow="Treasury Intelligence" title="Public evidence, carefully classified." description="A read-only research system for understanding public digital-asset treasuries. Satnam Satoshi does not custody funds, execute trades, or provide individualized financial advice."><div className="mt-8 flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="rounded-full border border-border px-3 py-2">Sources visible</span><span className="rounded-full border border-border px-3 py-2">Corrections public</span><span className="rounded-full border border-border px-3 py-2">No transaction capability</span></div></PageIntro>
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-4 md:grid-cols-2">{assets.map(([title, body]) => <Card key={title} className="p-7"><Database className="size-5 text-primary" /><h2 className="mt-12 text-2xl font-medium">{title}</h2><p className="mt-3 leading-7 text-muted-foreground">{body}</p><span className="mt-8 inline-flex items-center gap-2 text-sm text-primary"><RefreshCcw className="size-4" />Dataset preparation in progress</span></Card>)}</div></section>
    <section className="border-y border-border bg-card/40"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><p className="section-kicker">Trust model</p><h2 className="section-title">Every observation carries its receipt.</h2><div className="mt-12 grid gap-8 md:grid-cols-3">{[[FileCheck2,"Provenance","Source, retrieval time, effective time, and methodology."],[Scale,"Classification","Owned, custodied, restricted, estimated, or disputed."],[ShieldCheck,"Verification","Confidence, correction state, and human review remain visible."]].map(([I,t,b]) => {const Icon=I as typeof FileCheck2; return <div key={String(t)}><Icon className="size-5 text-primary"/><h3 className="mt-5 font-medium">{String(t)}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{String(b)}</p></div>})}</div></div></section>
  </main>;
}
