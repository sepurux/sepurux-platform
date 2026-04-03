import type { Metadata } from "next";

const defaultSiteUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:3001" : "https://sepurux.com";
const defaultAppUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://app.sepurux.dev";
const defaultApiBaseUrl =
  process.env.NODE_ENV === "development"
    ? `${defaultAppUrl}/api/backend`
    : "https://app.sepurux.dev/api/backend";
export const siteAssetVersion = process.env.NEXT_PUBLIC_SITE_ASSET_VERSION || "20260330";

export type PricingTier = "starter" | "team" | "enterprise";

export const siteConfig = {
  name: "Sepurux",
  description:
    "Sepurux is the chaos engineering platform for AI agents. Inject failures, replay traces, and enforce reliability policies before your agents hit production.",
  url: process.env.NEXT_PUBLIC_SITE_URL || defaultSiteUrl,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || defaultAppUrl,
  apiBaseUrl: process.env.SEPURUX_API_BASE_URL || defaultApiBaseUrl,
  founderEmail: process.env.NEXT_PUBLIC_FOUNDER_EMAIL || "felix.sarpong@sepurux.com",
  founderPhone: process.env.NEXT_PUBLIC_FOUNDER_PHONE || "+16055853783",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@sepurux.com",
  linkedinUrl: process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://www.linkedin.com/company/sepurux/",
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/sepurux/sepurux-feedback",
  discordUrl: process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/HHrSna2Z",
  twitterUrl: process.env.NEXT_PUBLIC_TWITTER_URL || "https://x.com/sepurux",
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE || "@sepurux",
  logo: `/logo.png?v=${siteAssetVersion}`,
  ogImage: `/og-image.png`,
};

export function buildAppAuthHref({
  mode,
  intent,
  plan,
  preview,
  next,
  utmSource,
  utmMedium,
  utmCampaign,
}: {
  mode: "demo" | "access";
  intent?: "signup" | "login";
  plan?: PricingTier;
  preview?: string;
  next?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  const url = new URL("/auth", siteConfig.appUrl);
  url.searchParams.set("mode", mode);
  if (intent) {
    url.searchParams.set("intent", intent);
  }
  if (plan) {
    url.searchParams.set("plan", plan);
  }
  if (preview) {
    url.searchParams.set("preview", preview);
  }
  if (next) {
    url.searchParams.set("next", next);
  }
  if (utmSource) {
    url.searchParams.set("utm_source", utmSource);
  }
  if (utmMedium) {
    url.searchParams.set("utm_medium", utmMedium);
  }
  if (utmCampaign) {
    url.searchParams.set("utm_campaign", utmCampaign);
  }
  return url.toString();
}

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
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title,
      description,
      images: [siteConfig.ogImage],
    },
  };
}
