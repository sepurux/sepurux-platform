"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Loader2, MonitorPlay } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    if (typeof window === "undefined") {
      return;
    }
    const previewFlag = window.localStorage.getItem(DEMO_PREVIEW_FLAG_KEY) === "1";
    const campaign = window.localStorage.getItem(DEMO_CAMPAIGN_STORAGE_KEY);
    if (campaign) {
      setCampaignName(campaign);
    }
    setIsActive(previewFlag || getStoredApiKey() === DEMO_API_KEY);
  }, [pathname]);

  useEffect(() => {
    if (!isPreviewRequest) {
      return;
    }

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

        // For backward compatibility with older APIs, verify project fallback if
        // the session endpoint does not return a project id.
        if (!getStoredProjectId()) {
          const projects = await api.listProjects();
          if (cancelled) return;
          const preferredProject =
            projects.find((project) => project.name === (info.demo_project ?? "")) ?? projects[0];
          if (preferredProject) {
            setStoredProjectId(preferredProject.project_id);
          }
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
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrapDemoPreview();

    return () => {
      cancelled = true;
    };
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

  if (!isActive && !isPreviewRequest) {
    return null;
  }

  return (
    <div className="border-b border-blue-400/30 bg-blue-500/10 px-4 py-2 text-blue-100">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          {isBootstrapping ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-200" />
          ) : (
            <MonitorPlay className="h-3.5 w-3.5 text-blue-200" />
          )}
          <span className="font-semibold uppercase tracking-[0.14em]">Live Preview</span>
          <span className="hidden text-blue-100/80 sm:inline">
            Seeded demo workspace. Campaign: <span className="font-medium">{campaignName}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="border-blue-300/40 text-blue-100">
            <Link href="/dashboard">Open Dashboard</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-blue-300/40 text-blue-100">
            <a href={siteUrl}>
              Back to Site <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button size="sm" variant="ghost" className="text-blue-100" onClick={handleExitDemo}>
            Exit Demo
          </Button>
        </div>
      </div>
      {errorMessage ? <p className="mt-2 text-xs text-rose-200">{errorMessage}</p> : null}
    </div>
  );
}
