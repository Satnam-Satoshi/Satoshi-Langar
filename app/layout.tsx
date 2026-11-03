import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import "./globals.css";



export const metadata: Metadata = {
  title: { default: "Satnam Satoshi — Many hands. One humanity.", template: "%s · Satnam Satoshi" },
  description: "Learn Bitcoin, create with Kalakar.x, serve with Satoshi Langar and read Lunch Time Conversations. Humans and AI building in service of humanity.",
  applicationName: "Satnam Satoshi",
  openGraph: { type: "website", siteName: "Satnam Satoshi", title: "Satnam Satoshi — Many hands. One humanity.", description: "Learn Bitcoin, create with Kalakar.x, serve with Satoshi Langar and read Lunch Time Conversations. Humans and AI building in service of humanity." },
  twitter: { card: "summary", title: "Satnam Satoshi", description: "Many hands. One humanity." },
};

export const viewport: Viewport = { colorScheme: "light", themeColor: "#f7f3e8" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Skip to content</a><SiteHeader /><div id="main-content">{children}</div><SiteFooter /></body></html>;
}
