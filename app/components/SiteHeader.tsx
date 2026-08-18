"use client";

import Link from "next/link";
import { ExternalLink, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SatnamMark } from "@/app/components/SatnamMark";

const primaryNavigation = [
  ["Mission", "/mission"],
  ["Projects", "/projects"],
  ["Community", "/community"],
  ["Open Source", "/open-source"],
] as const;

const secondaryNavigation = [
  ["Support", "/support"],
  ["Treasury Intelligence", "/treasury"],
  ["LTC", "/conversations"],
  ["Langar", "/langar"],
  ["Transparency", "/transparency"],
] as const;

const desktopUtilityNavigation = [
  ["Support", "/support"],
  ["Treasury", "/treasury"],
  ["LTC", "/conversations"],
  ["Langar", "/langar"],
  ["Transparency", "/transparency"],
] as const;

const githubUrl = "https://github.com/Satnam-Satoshi/Satoshi-Langar";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className={cn("flex items-center gap-3 rounded-lg", focusRing)} aria-label="Satnam Satoshi home">
          <span className="grid size-10 place-items-center rounded-full bg-[#0D0F14] p-1.5 shadow-sm" aria-hidden="true"><SatnamMark className="size-full" title="" /></span>
          <span className="leading-tight"><strong className="block font-semibold tracking-tight">Satnam Satoshi</strong><span className="hidden text-[11px] text-muted-foreground sm:block">Digital Darbar for Humanity</span></span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {primaryNavigation.map(([label, href]) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", focusRing, active && "bg-accent text-foreground")}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-1 lg:flex">
          <nav className="flex items-center gap-1" aria-label="Secondary navigation">
            {desktopUtilityNavigation.map(([label, href]) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("rounded-full px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", focusRing, active && "bg-accent text-foreground")}>{label}</Link>
              );
            })}
          </nav>
          <a href={githubUrl} target="_blank" rel="noreferrer" aria-label="Satnam Satoshi on GitHub (opens in a new tab)" className={cn("inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", focusRing)}>
            GitHub <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <Link href="/join" aria-current={pathname === "/join" ? "page" : undefined} className={cn("rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90", focusRing)}>Join / contribute</Link>
        </div>
        <button type="button" className={cn("grid size-11 place-items-center rounded-full border border-border lg:hidden", focusRing)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-navigation" className="border-t border-border bg-background px-5 py-4 lg:hidden" aria-label="Mobile navigation">
          <div className="mx-auto grid max-w-7xl gap-1">
            {primaryNavigation.map(([label, href]) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} className={cn("rounded-xl px-4 py-3 text-muted-foreground", focusRing, active && "bg-accent text-foreground")}>{label}</Link>
              );
            })}
            <div className="my-2 border-t border-border" aria-hidden="true" />
            {secondaryNavigation.map(([label, href]) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} className={cn("rounded-xl px-4 py-3 text-sm text-muted-foreground", focusRing, active && "bg-accent text-foreground")}>{label}</Link>
              );
            })}
            <a href={githubUrl} target="_blank" rel="noreferrer" aria-label="Satnam Satoshi on GitHub (opens in a new tab)" onClick={() => setOpen(false)} className={cn("mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground", focusRing)}>GitHub <ExternalLink className="size-4" aria-hidden="true" /></a>
            <Link href="/join" aria-current={pathname === "/join" ? "page" : undefined} onClick={() => setOpen(false)} className={cn("mt-1 rounded-xl bg-primary px-4 py-3 text-center font-semibold text-primary-foreground", focusRing)}>Join / contribute</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
