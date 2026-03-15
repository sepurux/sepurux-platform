// ui/components/layout/demo-preview-bar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Loader2, MonitorPlay, X } from "lucide-react";

import { api } from "@/lib/api";
import {
  clearStoredApiBaseUrl,
  clearStoredApiKey,
  clearStoredProjectId,
  getStoredApiKey,
  getStoredProjectId,
  setStoredApiBaseUrl,
  setStoredApiKey,
  setStoredProjectId,
} from "@/lib/tenant-settings";

const DEMO_PREVIEW_FLAG_KEY = "sepurux.demoPreview";
const DEMO_CAMPAIGN_STORAGE_KEY = "sepurux.demoCampaign";
const DEFAULT_SITE_URL = "https://sepurux.com";
const DEMO_API_KEY = "demo_sepurux_key";
const DEFAULT_DEMO_API_BASE =
  process.env.NODE_ENV === "development" ? "http://localhost:8000" : "/api/backend";

export function DemoPreviewBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isActive, setIsActive] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [campaignName, setCampaignName] = useState("demo_campaign");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const searchParamString = searchParams.toString();
  const isPreviewRequest = useMemo(() => {
    return searchParams.get("demo") === "1" || searchParams.get("preview") === "envato";
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const previewFlag = window.localStorage.getItem(DEMO_PREVIEW_FLAG_KEY) === "1";
    const campaign = window.localStorage.getItem(DEMO_CAMPAIGN_STORAGE_KEY);
    if (campaign) setCampaignName(campaign);
    setIsActive(previewFlag || getStoredApiKey() === DEMO_API_KEY);
  }, [pathname]);

  useEffect(() => {
    if (!isPreviewRequest) return;

    let cancelled = false;

    async function bootstrapDemoPreview() {
      setIsBootstrapping(true);
      setErrorMessage(null);

      try {
        const info = await api.getDemoInfo();
        const session = await api.createDemoSession();
        if (cancelled) return;

        setStoredApiBaseUrl(DEFAULT_DEMO_API_BASE);
        setStoredApiKey(session.api_key);
        setStoredProjectId(session.project_id);
        setCampaignName(session.demo_campaign);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(DEMO_PREVIEW_FLAG_KEY, "1");
          window.localStorage.setItem(DEMO_CAMPAIGN_STORAGE_KEY, session.demo_campaign);
        }

        if (!getStoredProjectId()) {
          const projects = await api.listProjects();
          if (cancelled) return;
          const preferredProject =
            projects.find((project) => project.name === (info.demo_project ?? "")) ?? projects[0];
          if (preferredProject) setStoredProjectId(preferredProject.project_id);
        }

        setIsActive(true);

        const nextParams = new URLSearchParams(searchParamString);
        nextParams.delete("demo");
        nextParams.delete("preview");
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Failed to activate demo preview");
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    void bootstrapDemoPreview();
    return () => { cancelled = true; };
  }, [isPreviewRequest, pathname, router, searchParamString]);

  function handleExitDemo() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_PREVIEW_FLAG_KEY);
      window.localStorage.removeItem(DEMO_CAMPAIGN_STORAGE_KEY);
    }
    clearStoredApiKey();
    clearStoredProjectId();
    clearStoredApiBaseUrl();
    setIsActive(false);
    if (typeof window !== "undefined") {
      window.location.assign(siteUrl);
      return;
    }
    router.push("/");
  }

  if (!isActive && !isPreviewRequest) return null;

  return (
    <div
      className="border-b px-4 py-2"
      style={{
        borderColor: "rgba(0,229,204,0.2)",
        background: "rgba(0,229,204,0.06)",
      }}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          {isBootstrapping ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--accent-teal)" }} />
          ) : (
            <MonitorPlay className="h-3.5 w-3.5" style={{ color: "var(--accent-teal)" }} />
          )}
          <span
            className="font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--accent-teal)" }}
          >
            Live Preview
          </span>
          <span className="hidden text-muted-foreground sm:inline">
            Seeded demo workspace · Campaign:{" "}
            <span className="font-medium text-foreground">{campaignName}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/70 bg-card/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
          >
            Open Dashboard
          </Link>
          <a
            href={siteUrl}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/70 bg-card/60 px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to Site
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            onClick={handleExitDemo}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Exit demo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-2 text-xs text-rose-300">{errorMessage}</p>
      ) : null}
    </div>
  );
}
