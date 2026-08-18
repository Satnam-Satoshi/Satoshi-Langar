import Link from "next/link";
import { BookOpen, HandHeart, Lightbulb, Network, ShieldCheck, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageIntro } from "../components/PageIntro";

const waysToSupport = [
  [HandHeart, "Time", "Offer a small, clearly scoped block of time for local Seva, review, moderation, testing, translation, or community support."],
  [Lightbulb, "Skills", "Contribute design, engineering, writing, research, education, accessibility, media, documentation, organizing, or professional expertise."],
  [BookOpen, "Knowledge", "Share evidence, lived experience, source material, corrections, teaching resources, or a question that helps the community learn."],
  [Network, "Introductions", "Connect the project with people, communities, nonprofits, builders, researchers, educators, or local service opportunities that fit the mission."],
] as const;

export default function SupportPage() {
  return (
    <main>
      <PageIntro eyebrow="Support" title="Support the mission without giving up control." description="Public Alpha recognizes time, skills, knowledge, and trusted introductions as meaningful support. Financial support is not active in this release." />
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {waysToSupport.map(([Icon, title, body]) => (
            <Card key={title} className="p-7">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <h2 className="mt-5 text-xl font-medium">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-primary/25 p-7">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium uppercase tracking-[.16em] text-primary">Human control boundary</p>
              <h2 className="mt-3 text-2xl font-medium tracking-tight">No wallet, payment, custody, or treasury action is enabled here.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">Any future financial-support pathway must be separately reviewed for governance, legal, privacy, custody, treasury, and account-owner requirements before it appears as an actionable public flow.</p>
            </div>
          </div>
        </Card>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Card className="p-7">
            <h2 className="text-xl font-medium">Ready to contribute?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Choose a skill or time contribution path in the Public Alpha Join experience. GitHub remains available for engineering work but is not required for membership.</p>
            <Link href="/join" className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">Join / contribute</Link>
          </Card>
          <Card className="p-7">
            <WalletCards className="size-5 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-medium">Future financial support</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Not active in Public Alpha. No address, QR code, payment processor, token, or donation checkout on this page should be interpreted as authorized.</p>
          </Card>
        </div>
      </section>
    </main>
  );
}
