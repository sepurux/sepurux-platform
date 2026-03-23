import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/product",
    "/pricing",
    "/docs",
    "/docs/getting-started",
    "/docs/ci-cd",
    "/docs/policy-security",
    "/docs/api-reference",
    "/docs/faq",
    "/company",
    "/book-demo",
    "/legal/privacy",
    "/legal/terms",
  ];
  const now = new Date();

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
