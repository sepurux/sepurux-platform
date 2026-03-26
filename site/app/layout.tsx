// site/app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Syne } from "next/font/google";
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
    default: "Sepurux | Chaos Engineering for AI Agents",
    template: "%s | Sepurux",
  },
  description: siteConfig.description,
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
    title: "Sepurux | Chaos Engineering for AI Agents",
    description: siteConfig.description,
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Sepurux — Chaos Engineering for AI Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    title: "Sepurux | Chaos Engineering for AI Agents",
    description: siteConfig.description,
    images: [{ url: siteConfig.ogImage, alt: "Sepurux — Chaos Engineering for AI Agents" }],
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
    <html lang="en" className="dark">
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
        className={`${bodyFont.variable} ${headingFont.variable} ${monoFont.variable} min-h-screen bg-background font-sans text-foreground`}
      >
        <Navbar />
        <main>{children}</main>
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
