import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://satnam.x"),
  title: { default: "Satnam Satoshi — Build trust. Serve humanity.", template: "%s · Satnam Satoshi" },
  description: "Open-source humanitarian infrastructure for service, education, transparent research, and responsible human–AI collaboration.",
  applicationName: "Satnam Satoshi",
  openGraph: { type: "website", siteName: "Satnam Satoshi", title: "Satnam Satoshi — Build trust. Serve humanity.", description: "Open-source humanitarian infrastructure for service, education, transparent research, and responsible human–AI collaboration.", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Satnam Satoshi — Build trust. Serve humanity." }] },
  twitter: { card: "summary_large_image", title: "Satnam Satoshi", description: "Build trust. Serve humanity.", images: ["/og.png"] },
};

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#101713" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" className="dark"><body><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Skip to content</a><SiteHeader /><div id="main-content">{children}</div><SiteFooter /></body></html>;
}
