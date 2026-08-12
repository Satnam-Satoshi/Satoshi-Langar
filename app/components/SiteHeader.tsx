"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  ["Mission", "/mission"],
  ["Projects", "/projects"],
  ["Langar", "/langar"],
  ["LTC", "/conversations"],
  ["Open Source", "/open-source"],
  ["Transparency", "/transparency"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Satnam Satoshi home">
          <span className="grid size-9 place-items-center rounded-full border border-primary/35 bg-primary/10 text-sm font-semibold text-primary" aria-hidden="true">ਸ</span>
          <span className="leading-tight"><strong className="block font-semibold tracking-tight">Satnam Satoshi</strong><span className="hidden text-[11px] text-muted-foreground sm:block">Digital Darbar for Humanity</span></span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link key={href} href={href} className={cn("rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", pathname === href && "bg-accent text-foreground")}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:block">
          <Link href="/community" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">Join the mission</Link>
        </div>
        <button type="button" className="grid size-11 place-items-center rounded-full border border-border lg:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-border bg-background px-5 py-4 lg:hidden" aria-label="Mobile navigation">
          <div className="mx-auto grid max-w-7xl gap-1">
            {navigation.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("rounded-xl px-4 py-3 text-muted-foreground", pathname === href && "bg-accent text-foreground")}>{label}</Link>
            ))}
            <Link href="/community" onClick={() => setOpen(false)} className="mt-2 rounded-xl bg-primary px-4 py-3 text-center font-semibold text-primary-foreground">Join the mission</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
