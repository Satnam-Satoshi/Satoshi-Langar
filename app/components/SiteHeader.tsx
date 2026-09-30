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
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/94 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="Satnam.x home">
          <span className="text-[1.05rem] font-semibold tracking-[-0.035em] text-foreground">
            SATNAM<span className="text-primary">.X</span>
          </span>
          <span className="hidden border-l border-border pl-3 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:block">
            Humanity · AI · Bitcoin · Seva
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link key={href} href={href} className={cn("rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", pathname === href && "bg-accent text-foreground")}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:block">
          <Link href="/community" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">Enter the Digital Darbar</Link>
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
            <Link href="/community" onClick={() => setOpen(false)} className="mt-2 rounded-xl bg-primary px-4 py-3 text-center font-semibold text-primary-foreground">Enter the Digital Darbar</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
