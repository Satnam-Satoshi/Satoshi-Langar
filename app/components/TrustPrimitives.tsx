import type { ReactNode } from "react";
import { Check, CircleDashed, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusPill({ state, children }: { state: "verified" | "review" | "preparing"; children: ReactNode }) {
  const Icon = state === "verified" ? Check : state === "review" ? Clock3 : CircleDashed;
  return <span className={cn("inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs", state === "verified" ? "border-primary/30 bg-primary/8 text-primary" : "border-border text-muted-foreground")}><Icon className="size-3.5" aria-hidden="true" />{children}</span>;
}

export function EvidenceRow({ label, value, detail, status }: { label: string; value: string; detail: string; status?: string }) {
  return <div className="grid gap-3 border-t border-border py-5 first:border-t-0 sm:grid-cols-[10rem_1fr_auto] sm:items-center"><span className="text-sm font-medium">{label}</span><span className="text-sm leading-6 text-muted-foreground">{detail}</span><span className="font-mono text-xs text-primary">{status ?? value}</span></div>;
}

export function SectionNumber({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[.68rem] tracking-[.16em] text-primary">{children}</span>;
}
