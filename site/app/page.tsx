// site/app/page.tsx
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/site";
import { HomeContent } from "@/components/home-content";

export const metadata: Metadata = buildPageMetadata({
  title: "Sepurux",
  description:
    "Paste a trace. Find the failing step, likely cause, and next fix before a user sees it.",
  path: "/",
});

export default function HomePage() {
  return <HomeContent />;
}
