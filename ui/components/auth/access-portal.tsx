"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, KeyRound, Loader2, LogIn, MonitorPlay, Sparkles, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type AuthSessionResponse, type DemoInfoResponse } from "@/lib/api";
import { clearStoredAuthSession, setStoredAuthSession } from "@/lib/auth-session";
import {
  getPricingTierDefinition,
  isPricingTier,
  pricingTierDefinitions,
  type PricingTier,
} from "@/lib/pricing";
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

type AccessMode = "demo" | "access";
type AccessIntent = "signup" | "login";
const DEFAULT_SIGNUP_PLAN: PricingTier = "team";

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
    if (
      parsed.hostname === "api" ||
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1"
    ) {
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

  const [mode, setMode] = useState<AccessMode>(
    searchParams.get("mode") === "access" ? "access" : "demo"
  );
  const [intent, setIntent] = useState<AccessIntent>(
    searchParams.get("intent") === "login" ? "login" : "signup"
  );
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupProjectName, setSignupProjectName] = useState("");
  const [signupPlan, setSignupPlan] = useState<PricingTier>(DEFAULT_SIGNUP_PLAN);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [demoInfo, setDemoInfo] = useState<DemoInfoResponse | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [submittingAccess, setSubmittingAccess] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams]);
  const selectedPlanDefinition = useMemo(() => getPricingTierDefinition(signupPlan), [signupPlan]);

  useEffect(() => {
    setMode(searchParams.get("mode") === "access" ? "access" : "demo");
    setIntent(searchParams.get("intent") === "login" ? "login" : "signup");
    const nextPlan = searchParams.get("plan");
    setSignupPlan(isPricingTier(nextPlan) ? nextPlan : DEFAULT_SIGNUP_PLAN);
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

  async function persistSession(session: AuthSessionResponse, resolvedBase: string) {
    const { api_key: _apiKey, ...sessionMetadata } = session;
    setStoredApiBaseUrl(resolvedBase);
    setStoredApiKey(session.api_key);
    setStoredProjectId(session.project_id);
    setStoredAuthSession(sessionMetadata);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_PREVIEW_FLAG_KEY);
      window.localStorage.removeItem(DEMO_CAMPAIGN_STORAGE_KEY);
    }
  }

  async function refreshSessionFromStoredCredentials() {
    const session = await api.getAuthSession();
    setStoredAuthSession(session);
    return session;
  }

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

      const authSession = await refreshSessionFromStoredCredentials();
      setStoredAuthSession({ ...authSession, is_demo: true });
      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start demo session");
    } finally {
      setLoadingDemo(false);
    }
  }

  function updateQuery(nextMode: AccessMode, nextIntent: AccessIntent, nextPlan?: PricingTier) {
    if (typeof window === "undefined") return;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("mode", nextMode);
    nextUrl.searchParams.set("intent", nextIntent);
    if (nextPlan) {
      nextUrl.searchParams.set("plan", nextPlan);
    }
    window.history.replaceState({}, "", nextUrl.toString());
  }

  function handleModeSwitch(nextMode: AccessMode) {
    const nextIntent = nextMode === "access" ? intent : "signup";
    setMode(nextMode);
    setErrorMessage(null);
    updateQuery(nextMode, nextIntent, signupPlan);
  }

  function handleIntentSwitch(nextIntent: AccessIntent) {
    setIntent(nextIntent);
    setErrorMessage(null);
    updateQuery("access", nextIntent, signupPlan);
  }

  function handlePlanSwitch(nextPlan: PricingTier) {
    setSignupPlan(nextPlan);
    setErrorMessage(null);
    updateQuery("access", intent, nextPlan);
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingAccess) return;
    setSubmittingAccess(true);
    setErrorMessage(null);
    try {
      const resolvedBase = resolveBaseForBrowser(apiBaseUrl);
      const session = await api.signup(
        {
          email: signupEmail.trim(),
          password: signupPassword,
          name: signupName.trim() || undefined,
          project_name: signupProjectName.trim() || undefined,
          pricing_tier: signupPlan,
        },
        { baseUrl: resolvedBase }
      );
      await persistSession(session, resolvedBase);
      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create account");
    } finally {
      setSubmittingAccess(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingAccess) return;
    setSubmittingAccess(true);
    setErrorMessage(null);
    try {
      const resolvedBase = resolveBaseForBrowser(apiBaseUrl);
      const session = await api.login(
        {
          email: loginEmail.trim(),
          password: loginPassword,
        },
        { baseUrl: resolvedBase }
      );
      await persistSession(session, resolvedBase);
      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to log in");
    } finally {
      setSubmittingAccess(false);
    }
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

      await refreshSessionFromStoredCredentials();
      router.replace(nextPath);
    } catch (error) {
      clearStoredAuthSession();
      setErrorMessage(error instanceof Error ? error.message : "Unable to connect");
    } finally {
      setConnecting(false);
    }
  }

  function resetStoredCredentials() {
    clearStoredApiBaseUrl();
    clearStoredApiKey();
    clearStoredProjectId();
    clearStoredAuthSession();
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
              Create a workspace account, sign back in, or launch the seeded demo environment.
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
                    We issue a short-lived demo session and route you into a resettable shared dataset.
                  </p>
                  {demoInfo ? (
                    <p className="mt-2 text-blue-100/80">
                      Limits: {demoInfo.limits.campaigns_per_hour}/hr campaigns, {" "}
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
              <div className="space-y-5">
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">API Base URL</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    value={apiBaseUrl}
                    onChange={(event) => setApiBaseUrl(event.target.value)}
                    placeholder="/api/backend"
                  />
                </label>

                <div className="inline-flex w-fit items-center rounded-lg border border-border/70 bg-muted/40 p-1">
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      intent === "signup"
                        ? "bg-blue-400/15 text-blue-100"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => handleIntentSwitch("signup")}
                  >
                    Sign up
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      intent === "login"
                        ? "bg-blue-400/15 text-blue-100"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => handleIntentSwitch("login")}
                  >
                    Log in
                  </button>
                </div>

                {intent === "signup" ? (
                  <form className="space-y-4" onSubmit={handleSignup}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Workspace plan</span>
                        <span className="text-xs uppercase tracking-[0.14em] text-blue-200">
                          {selectedPlanDefinition.name}
                        </span>
                      </div>
                      <div className="grid gap-2 md:grid-cols-3">
                        {pricingTierDefinitions.map((plan) => {
                          const active = plan.tier === signupPlan;
                          return (
                            <button
                              key={plan.tier}
                              type="button"
                              onClick={() => handlePlanSwitch(plan.tier)}
                              className={`rounded-lg border p-3 text-left transition ${
                                active
                                  ? "border-blue-400/60 bg-blue-500/10 shadow-[0_0_0_1px_rgba(96,165,250,0.18)]"
                                  : "border-border/70 bg-muted/20 hover:border-border hover:bg-muted/35"
                              }`}
                            >
                              <p className="text-sm font-medium text-foreground">{plan.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{plan.summary}</p>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This plan controls which dashboard surfaces unlock after signup.
                      </p>
                    </div>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <input
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={signupName}
                        onChange={(event) => setSignupName(event.target.value)}
                        placeholder="Ada Lovelace"
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Work email</span>
                      <input
                        type="email"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={signupEmail}
                        onChange={(event) => setSignupEmail(event.target.value)}
                        placeholder="you@company.com"
                        required
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Password</span>
                      <input
                        type="password"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={signupPassword}
                        onChange={(event) => setSignupPassword(event.target.value)}
                        placeholder="Minimum 8 characters"
                        minLength={8}
                        required
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Project name</span>
                      <input
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={signupProjectName}
                        onChange={(event) => setSignupProjectName(event.target.value)}
                        placeholder="Fraud Agent Sandbox"
                      />
                    </label>

                    <Button type="submit" className="w-full" disabled={submittingAccess}>
                      {submittingAccess ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Creating workspace...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <UserPlus className="h-4 w-4" /> Create account and open dashboard
                        </span>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={handleLogin}>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Email</span>
                      <input
                        type="email"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={loginEmail}
                        onChange={(event) => setLoginEmail(event.target.value)}
                        placeholder="you@company.com"
                        required
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Password</span>
                      <input
                        type="password"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={loginPassword}
                        onChange={(event) => setLoginPassword(event.target.value)}
                        placeholder="Your password"
                        minLength={8}
                        required
                      />
                    </label>

                    <Button type="submit" className="w-full" disabled={submittingAccess}>
                      {submittingAccess ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <LogIn className="h-4 w-4" /> Log in to dashboard
                        </span>
                      )}
                    </Button>
                  </form>
                )}

                <details className="rounded-lg border border-border/70 bg-muted/25 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    Use an existing API key instead
                  </summary>
                  <form className="mt-4 space-y-4" onSubmit={handleManualConnect}>
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
                            <KeyRound className="h-4 w-4" /> Continue with API key
                          </span>
                        )}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetStoredCredentials}>
                        Reset
                      </Button>
                    </div>
                  </form>
                </details>
              </div>
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
            <CardTitle>Access model</CardTitle>
            <CardDescription>
              Role-aware dashboard entry with plan-based menus, demo isolation, and per-session keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="font-medium text-foreground">
                Selected plan: {selectedPlanDefinition.name}
              </p>
              <p className="mt-1">{selectedPlanDefinition.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Includes: {selectedPlanDefinition.menuHighlights.join(", ")}
              </p>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <UserPlus className="h-4 w-4 text-blue-300" /> Sign up
              </p>
              <p className="mt-1">
                Creates a workspace on the selected plan, makes you the admin for the first project, and issues a project-scoped session key.
              </p>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <LogIn className="h-4 w-4 text-blue-300" /> Log in
              </p>
              <p className="mt-1">
                Restores your role-aware dashboard session and uses the backend RBAC model to gate access.
              </p>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-blue-300" /> View Demo
              </p>
              <p className="mt-1">
                Generates a short-lived demo key mapped to seeded data without exposing shared credentials.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
