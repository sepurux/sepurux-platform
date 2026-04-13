// ui/components/layout/demo-preview-bar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import {
  getStoredProjectId,
  setStoredApiBaseUrl,
  setStoredApiKey,
  setStoredProjectId,
} from "@/lib/tenant-settings";

const DEMO_PREVIEW_FLAG_KEY = "sepurux.demoPreview";
const DEMO_CAMPAIGN_STORAGE_KEY = "sepurux.demoCampaign";
const DEFAULT_DEMO_API_BASE =
  process.env.NODE_ENV === "development" ? "http://localhost:8000" : "/api/backend";

export function DemoPreviewBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const searchParamString = searchParams.toString();
  const isPreviewRequest = useMemo(() => {
    return searchParams.get("demo") === "1" || searchParams.get("preview") === "envato";
  }, [searchParams]);

  useEffect(() => {
    if (!isPreviewRequest) return;

    let cancelled = false;

    async function bootstrapDemoPreview() {
      setIsBootstrapping(true);

      try {
        const info = await api.getDemoInfo();
        const session = await api.createDemoSession();
        if (cancelled) return;

        setStoredApiBaseUrl(DEFAULT_DEMO_API_BASE);
        setStoredApiKey(session.api_key);
        setStoredProjectId(session.project_id);

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

        const nextParams = new URLSearchParams(searchParamString);
        nextParams.delete("demo");
        nextParams.delete("preview");
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
      } catch {
        // silently fail — demo bootstrap is best-effort
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    void bootstrapDemoPreview();
    return () => { cancelled = true; };
  }, [isPreviewRequest, pathname, router, searchParamString]);

  if (isBootstrapping) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-primary/35 bg-card/92 px-3 py-1.5 text-xs font-medium text-foreground shadow-panel backdrop-blur-xl">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        <span>Setting up demo…</span>
      </div>
    );
  }

  return null;
}
