// site/app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Syne } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { siteAssetVersion, siteConfig } from "@/lib/site";

import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const headingFont = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Sepurux | Reliability infrastructure for AI agents",
    template: "%s | Sepurux",
  },
  description: siteConfig.description,
  icons: {
    icon: [
      { url: `/favicon.png?v=${siteAssetVersion}`, type: "image/png" },
      { url: siteConfig.logo, type: "image/png" },
    ],
    shortcut: [{ url: `/favicon.png?v=${siteAssetVersion}`, type: "image/png" }],
    apple: [
      { url: `/apple-touch-icon.png?v=${siteAssetVersion}`, type: "image/png", sizes: "180x180" },
      {
        url: `/apple-touch-icon-precomposed.png?v=${siteAssetVersion}`,
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
  openGraph: {
    title: "Sepurux | Reliability infrastructure for AI agents",
    description: siteConfig.description,
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        alt: "Sepurux",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sepurux | Reliability infrastructure for AI agents",
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${bodyFont.variable} ${headingFont.variable} ${monoFont.variable} min-h-screen bg-background font-sans text-foreground`}
      >
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
