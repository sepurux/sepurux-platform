// site/app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import Script from "next/script";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { siteAssetVersion, siteConfig } from "@/lib/site";

import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const headingFont = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: "Sepurux | Trace Debugger for AI Agents",
    template: "%s | Sepurux",
  },
  description: siteConfig.description,
  keywords: [
    "AI agent reliability",
    "AI chaos engineering",
    "agent trace replay",
    "mutation testing for AI agents",
    "AI policy gates",
    "CI reliability gate",
    "Sepurux",
  ],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  icons: {
    icon: [{ url: `/favicon.png?v=${siteAssetVersion}`, type: "image/png" }],
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
    title: "Sepurux | Trace Debugger for AI Agents",
    description: siteConfig.description,
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Sepurux — Trace Debugger for AI Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    title: "Sepurux | Trace Debugger for AI Agents",
    description: siteConfig.description,
    images: [{ url: siteConfig.ogImage, alt: "Sepurux — Trace Debugger for AI Agents" }],
  },
};

const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Sepurux",
  applicationCategory: "DeveloperApplication",
  description: siteConfig.description,
  url: "https://sepurux.com",
  author: {
    "@type": "Organization",
    name: "Sepurux",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sepurux",
  url: "https://sepurux.com",
  sameAs: [
    siteConfig.linkedinUrl,
    siteConfig.githubUrl,
    siteConfig.twitterUrl,
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body
        className={`${bodyFont.variable} ${headingFont.variable} ${monoFont.variable} min-h-screen overflow-x-hidden bg-background font-sans text-foreground`}
      >
        <Navbar />
        <main className="relative pt-[78px] sm:pt-[82px]">{children}</main>
        <Footer />
        {process.env.NODE_ENV === "production" && (
          <Script
            defer
            data-domain="sepurux.com"
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
