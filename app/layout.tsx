import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Satnam Satoshi | Satoshi Langar',
    template: '%s | Satnam Satoshi',
  },
  description:
    'Bitcoin-first seva infrastructure for Satoshi Langar, AI sevadars, treasury transparency, Lightning donations, and global community education.',
  metadataBase: new URL('https://satoshi-langar.vercel.app'),
  openGraph: {
    title: 'Satnam Satoshi | Satoshi Langar',
    description:
      'Time is Chain. Truth is Value. Love is Currency. A Bitcoin-powered humanitarian and spiritual technology movement.',
    siteName: 'Satnam Satoshi',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Satnam Satoshi | Satoshi Langar',
    description:
      'A digital gurudwara for Bitcoin-first seva, transparent treasury, AI sevadars, and community education.',
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#050505',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
