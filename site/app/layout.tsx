import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { siteAssetVersion, siteConfig } from "@/lib/site";

import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
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
      <body className={`${headingFont.variable} ${monoFont.variable} font-[family-name:var(--font-heading)]`}>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
