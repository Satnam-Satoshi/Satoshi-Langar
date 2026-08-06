import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-5 py-20 md:py-28 lg:px-8">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="max-w-5xl text-balance text-5xl font-medium tracking-[-0.045em] sm:text-6xl lg:text-7xl">{title}</h1>
        <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">{description}</p>
        {children}
      </div>
    </section>
  );
}
