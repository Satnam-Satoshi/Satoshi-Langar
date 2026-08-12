import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Reveal({ children, className }: { children: ReactNode; delay?: number; className?: string }) {
  return <div className={cn("reveal", className)}>{children}</div>;
}
