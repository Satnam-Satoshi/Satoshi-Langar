import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.2fr_1fr] lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full border border-primary/40 text-xs text-primary">ਸ</span><strong className="font-medium">Satnam Satoshi</strong></div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">An open-source Human + AI community project for service, education, evidence-led research, and transparent collaboration.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground sm:grid-cols-3">
          <Link href="/mission" className="hover:text-foreground">Mission</Link>
          <Link href="/projects" className="hover:text-foreground">Projects</Link>
          <Link href="/open-source" className="hover:text-foreground">GitHub</Link>
          <Link href="/community" className="hover:text-foreground">Contribute</Link>
          <Link href="/transparency" className="hover:text-foreground">Transparency</Link>
          <Link href="/conversations" className="hover:text-foreground">LTC</Link>
        </div>
      </div>
      <div className="border-t border-border px-5 py-5 text-center text-xs text-muted-foreground">© 2026 Satnam Satoshi project · Humans govern. AI assists. · Public Alpha</div>
    </footer>
  );
}
