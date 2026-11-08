import Link from "next/link";
import { SatnamMark } from "@/app/components/SatnamMark";

const githubUrl = "https://github.com/Satnam-Satoshi/Satoshi-Langar";
const footerLink = "rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.2fr_1fr] lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-[#0D0F14] p-1.5 shadow-sm" aria-hidden="true"><SatnamMark className="size-full" title="" /></span><strong className="font-medium">Satnam Satoshi</strong></div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">An open-source Human + AI community project for service, education, evidence-led research, and transparent collaboration.</p>
        </div>
        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-4 text-sm text-muted-foreground sm:grid-cols-3">
          <Link href="/mission" className={footerLink}>Mission</Link>
          <Link href="/projects" className={footerLink}>Projects</Link>
          <Link href="/community" className={footerLink}>Community</Link>
          <Link href="/join" className={footerLink}>Join / contribute</Link>
          <Link href="/support" className={footerLink}>Support</Link>
          <Link href="/open-source" className={footerLink}>Open Source</Link>
          <a href={githubUrl} target="_blank" rel="noreferrer" aria-label="Satnam Satoshi on GitHub (opens in a new tab)" className={footerLink}>GitHub ↗</a>
          <Link href="/transparency" className={footerLink}>Transparency</Link>
          <Link href="/conversations" className={footerLink}>LTC</Link>
        </nav>
      </div>
      <div className="border-t border-border px-5 py-5 text-center text-xs text-muted-foreground">© 2026 Satnam Satoshi project · Humans govern. AI assists. · Public Alpha</div>
    </footer>
  );
}
