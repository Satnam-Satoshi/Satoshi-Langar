import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("site-card rounded-2xl border border-border bg-card text-card-foreground", className)} {...props} />;
}
