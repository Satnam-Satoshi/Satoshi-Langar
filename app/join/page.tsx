import { ArrowUpRight, Clock3, HandHeart, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageIntro } from "../components/PageIntro";

const githubUrl = "https://github.com/Satnam-Satoshi/Satoshi-Langar";

const contributionPaths = [
  "Software / engineering",
  "Design / UX / accessibility",
  "Research / writing / documentation",
  "Education / translation / media",
  "Professional expertise",
  "Community organizing / local Seva",
  "General volunteer time",
];

export default function JoinPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Join Public Alpha"
        title="Bring a skill, some time, or a useful question."
        description="Satnam Satoshi is open to technical and nontechnical contributors. GitHub is useful for engineering work, but it is not a membership requirement. Public Alpha participation is human-reviewed and no donation or cryptocurrency ownership is required."
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-16 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
        <Card className="p-7 lg:p-9">
          <p className="text-xs font-medium uppercase tracking-[.16em] text-primary">Participation profile</p>
          <h2 className="mt-4 text-2xl font-medium tracking-tight">Lightweight join form architecture</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            This Public Alpha form is intentionally frontend-only. It does not submit, transmit, or store information yet. The fields define the minimum future member-intake structure while privacy review and a human-governed submission path are completed.
          </p>

          <form className="mt-8 space-y-6" aria-describedby="join-form-note">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Display name
                <input className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" name="displayName" autoComplete="name" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Preferred contribution path
                <select className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" name="contributionPath" defaultValue="">
                  <option value="" disabled>Select a path</option>
                  {contributionPaths.map((path) => <option key={path} value={path}>{path}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Time you can offer
                <select className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" name="availability" defaultValue="">
                  <option value="" disabled>Select availability</option>
                  <option value="one-hour">About one hour</option>
                  <option value="few-hours">A few hours</option>
                  <option value="recurring">Recurring contribution</option>
                  <option value="project-based">Project-based / as needed</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Location or timezone <span className="font-normal text-muted-foreground">(optional)</span>
                <input className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" name="location" autoComplete="off" />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium">
              What would you like to contribute or learn?
              <textarea className="min-h-32 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" name="intent" />
            </label>

            <label className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
              <input className="mt-1 size-4 rounded border-border" type="checkbox" name="humanReviewConsent" />
              <span>I understand that Public Alpha participation is human-reviewed and that this preview form does not currently transmit or store my information.</span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground" type="button" disabled aria-disabled="true">
                Submission activates after privacy review
              </button>
              <a className="inline-flex items-center gap-2 text-sm font-medium text-primary" href={githubUrl} target="_blank" rel="noreferrer">
                Technical contributors: open GitHub <ArrowUpRight className="size-4" />
              </a>
            </div>
            <p id="join-form-note" className="text-xs leading-5 text-muted-foreground">No payment, wallet, identity verification, seed phrase, financial information, or government identifier belongs in this form.</p>
          </form>
        </Card>

        <div className="grid gap-5">
          <Card className="p-7">
            <HandHeart className="size-5 text-primary" />
            <h2 className="mt-5 text-xl font-medium">Skills count</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Code, design, research, writing, translation, education, accessibility, media, documentation, professional expertise, organizing, and local Seva are all valid contribution paths.</p>
          </Card>
          <Card className="p-7">
            <Clock3 className="size-5 text-primary" />
            <h2 className="mt-5 text-xl font-medium">Time counts</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">A single hour of review, testing, documentation, mentoring, translation, or local service can be useful. Public Alpha should make small contributions legible and welcome.</p>
          </Card>
          <Card className="p-7">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="mt-5 text-xl font-medium">Human governance stays explicit</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Participation does not grant treasury, custody, legal, contractual, or governance authority. Those controls remain with designated humans under published project governance.</p>
          </Card>
        </div>
      </section>
    </main>
  );
}
