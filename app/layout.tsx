import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import "./globals.css";

const publicWebOrigin = "https://https-github-com-satnam-satoshi-sat.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(publicWebOrigin),
  title: { default: "Satnam.x — A global community building on the Bitcoin Standard", template: "%s · Satnam.x" },
  description: "Satnam Satoshi is an open-source Human + AI community organized around the Bitcoin Standard, Proof of Seva, education, humanitarian service, transparent research, and human sovereignty.",
  applicationName: "Satnam.x",
  openGraph: { type: "website", siteName: "Satnam.x", title: "Satnam.x — One Humanity. One Truth. One Future.", description: "A global Human + AI community building public-interest infrastructure on the Bitcoin Standard.", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Satnam.x — One Humanity. One Truth. One Future." }] },
  twitter: { card: "summary_large_image", title: "Satnam.x", description: "A global Human + AI community building public-interest infrastructure on the Bitcoin Standard.", images: ["/og.png"] },
};

export const viewport: Viewport = { colorScheme: "light", themeColor: "#f7f3e8" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Skip to content</a><SiteHeader /><div id="main-content">{children}</div><SiteFooter /></body></html>;
}
