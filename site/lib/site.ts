import type { Metadata } from "next";

export const siteConfig = {
  name: "Crash Lab",
  description:
    "Chaos engineering for AI agents. Replay + mutate + score tool-using agents before they ship.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://crashlab.ai",
  logo: "/logo.png",
  ogImage: "/logo.png",
};

export function buildPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const absoluteUrl = `${siteConfig.url}${path}`;
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl,
      siteName: siteConfig.name,
      type: "website",
      images: [
        {
          url: siteConfig.ogImage,
          alt: `${siteConfig.name} marketing`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.ogImage],
    },
  };
}
