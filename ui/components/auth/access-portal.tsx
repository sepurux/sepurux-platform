"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, KeyRound, Loader2, MonitorPlay, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type DemoInfoResponse } from "@/lib/api";
import {
  clearStoredApiBaseUrl,
  clearStoredApiKey,
  clearStoredProjectId,
  setStoredApiBaseUrl,
  setStoredApiKey,
  setStoredProjectId,
} from "@/lib/tenant-settings";

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:8000" : "/api/backend";
const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sepurux.com";
const DEMO_PREVIEW_FLAG_KEY = "sepurux.demoPreview";
const DEMO_CAMPAIGN_STORAGE_KEY = "sepurux.demoCampaign";

function normalizeNextPath(rawPath: string | null) {
  if (!rawPath || !rawPath.startsWith("/")) {
    return "/dashboard";
  }
  return rawPath;
}

function resolveBaseForBrowser(inputBaseUrl: string) {
  const candidate = inputBaseUrl.trim();
  if (!candidate) {
    return "/api/backend";
  }
  if (!/^https?:\/\//.test(candidate)) {
    return candidate;
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.hostname === "api" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return "/api/backend";
    }
  } catch {
    return candidate;
  }
  return candidate;
}

export function AccessPortal() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [mode, setMode] = useState<"demo" | "access">(
    searchParams.get("mode") === "access" ? "access" : "demo"
  );
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [demoInfo, setDemoInfo] = useState<DemoInfoResponse | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nextPath = useMemo(
    () => normalizeNextPath(searchParams.get("next")),
    [searchParams]
  );

  useEffect(() => {
    setMode(searchParams.get("mode") === "access" ? "access" : "demo");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadDemoInfo() {
      try {
        const payload = await api.getDemoInfo();
        if (!cancelled) {
          setDemoInfo(payload);
        }
      } catch {
        if (!cancelled) {
          setDemoInfo(null);
        }
      }
    }
    void loadDemoInfo();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== "demo") {
      return;
    }
    void handleActivateDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function handleActivateDemo() {
    if (loadingDemo) return;
    setLoadingDemo(true);
    setErrorMessage(null);
    try {
      const session = await api.createDemoSession();
      const resolvedBase = resolveBaseForBrowser(DEFAULT_API_BASE_URL);

      setStoredApiBaseUrl(resolvedBase);
      setStoredApiKey(session.api_key);
      setStoredProjectId(session.project_id);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(DEMO_PREVIEW_FLAG_KEY, "1");
        window.localStorage.setItem(DEMO_CAMPAIGN_STORAGE_KEY, session.demo_campaign);
      }

      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start demo session");
    } finally {
      setLoadingDemo(false);
    }
  }

  function handleModeSwitch(nextMode: "demo" | "access") {
    setMode(nextMode);
    setErrorMessage(null);
    if (typeof window === "undefined") return;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("mode", nextMode);
    window.history.replaceState({}, "", nextUrl.toString());
  }

  async function handleManualConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (connecting) return;
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      setErrorMessage("API key is required");
      return;
    }

    setConnecting(true);
    setErrorMessage(null);
    try {
      const resolvedBase = resolveBaseForBrowser(apiBaseUrl);

      setStoredApiBaseUrl(resolvedBase);
      setStoredApiKey(trimmedApiKey);
      if (projectId.trim()) {
        setStoredProjectId(projectId.trim());
      } else {
        clearStoredProjectId();
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DEMO_PREVIEW_FLAG_KEY);
        window.localStorage.removeItem(DEMO_CAMPAIGN_STORAGE_KEY);
      }

      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to connect");
    } finally {
      setConnecting(false);
    }
  }

  function resetStoredCredentials() {
    clearStoredApiBaseUrl();
    clearStoredApiKey();
    clearStoredProjectId();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_PREVIEW_FLAG_KEY);
      window.localStorage.removeItem(DEMO_CAMPAIGN_STORAGE_KEY);
    }
    setApiKey("");
    setProjectId("");
    setErrorMessage(null);
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href={DEFAULT_SITE_URL} className="text-sm text-blue-200 hover:text-blue-100">
          <span className="inline-flex items-center gap-1">
            Back to site <ExternalLink className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-2xl">Sepurux Access</CardTitle>
            <CardDescription>
              Start with seeded demo data or connect your own project credentials.
            </CardDescription>
            <div className="inline-flex w-fit items-center rounded-lg border border-border/70 bg-muted/40 p-1">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === "demo"
                    ? "bg-blue-400/15 text-blue-100"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleModeSwitch("demo")}
              >
                View Demo
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === "access"
                    ? "bg-blue-400/15 text-blue-100"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleModeSwitch("access")}
              >
                Get Access
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {mode === "demo" ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
                  <p className="font-medium">Seeded Demo Workspace</p>
                  <p className="mt-1 text-blue-100/80">
                    We issue a per-session demo API key and route you to a resettable shared dataset.
                  </p>
                  {demoInfo ? (
                    <p className="mt-2 text-blue-100/80">
                      Limits: {demoInfo.limits.campaigns_per_hour}/hr campaigns,{" "}
                      {demoInfo.limits.mutations_per_run}/run mutations.
                    </p>
                  ) : null}
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => void handleActivateDemo()}
                  disabled={loadingDemo}
                >
                  {loadingDemo ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading demo workspace...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <MonitorPlay className="h-4 w-4" /> Enter demo dashboard
                    </span>
                  )}
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleManualConnect}>
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">API Base URL</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    value={apiBaseUrl}
                    onChange={(event) => setApiBaseUrl(event.target.value)}
                    placeholder="/api/backend"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">API Key</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="cl_..."
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Project ID (optional)</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    placeholder="UUID"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={connecting}>
                    {connecting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <KeyRound className="h-4 w-4" /> Continue to dashboard
                      </span>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetStoredCredentials}>
                    Reset
                  </Button>
                </div>
              </form>
            )}

            {errorMessage ? (
              <div className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>How this works</CardTitle>
            <CardDescription>Envato-style preview entry with safe tenant isolation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-blue-300" /> View Demo
              </p>
              <p className="mt-1">
                Generates a short-lived demo key mapped to seeded project data, then opens dashboard instantly.
              </p>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <KeyRound className="h-4 w-4 text-blue-300" /> Get Access
              </p>
              <p className="mt-1">
                Uses your API key + project scope for persistent workspaces and unrestricted runs.
              </p>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <MonitorPlay className="h-4 w-4 text-blue-300" /> Seeded Data
              </p>
              <p className="mt-1">
                Demo traces, campaigns, and mutation packs are preloaded and periodically reset.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
