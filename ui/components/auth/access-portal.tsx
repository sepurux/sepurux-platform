// ui/components/auth/access-portal.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  KeyRound,
  Loader2,
  LogIn,
  MonitorPlay,
  Sparkles,
  UserPlus,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

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

const TEAL = "#00e5cc";
const TEAL_DIM = "rgba(0,229,204,0.12)";
const TEAL_BORDER = "rgba(0,229,204,0.3)";

const leftPanelFeatures = [
  "Replay exact agent executions step by step",
  "Inject schema drift, timeouts, and poisoning",
  "Gate merges on reliability score thresholds",
  "Policy checks before irreversible tool calls",
];

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

// ── Shared field style ──────────────────────────────────────────────────────
const fieldClass =
  "w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-[rgba(0,229,204,0.5)] focus:ring-2 focus:ring-[rgba(0,229,204,0.12)]";

// ── Segmented control tab ───────────────────────────────────────────────────
function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-4 py-1.5 text-xs font-semibold tracking-wide transition-all"
      style={
        active
          ? { background: TEAL_DIM, color: TEAL, border: `1px solid ${TEAL_BORDER}` }
          : { color: "var(--color-muted-foreground)", border: "1px solid transparent" }
      }
    >
      {children}
    </button>
  );
}

// ── Teal primary button ─────────────────────────────────────────────────────
function TealButton({
  type = "button",
  disabled,
  onClick,
  children,
}: {
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-black transition-all disabled:opacity-50"
      style={{
        background: disabled ? "rgba(0,229,204,0.4)" : TEAL,
        boxShadow: disabled ? "none" : "0 0 0 1px rgba(0,229,204,0.4), 0 4px 24px rgba(0,229,204,0.2)",
      }}
    >
      {children}
    </button>
  );
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
        if (!cancelled) setDemoInfo(payload);
      } catch {
        if (!cancelled) setDemoInfo(null);
      }
    }
    void loadDemoInfo();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (mode !== "demo") return;
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
    if (nextPlan) nextUrl.searchParams.set("plan", nextPlan);
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
        { email: loginEmail.trim(), password: loginPassword },
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
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-4">
      <div
        className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-border/60 lg:grid-cols-[1fr_1fr]"
        style={{ background: "hsl(var(--card))" }}
      >
        {/* ── Left branded panel ── */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-8 lg:flex"
          style={{ background: "hsl(214 27% 4%)" }}
        >
          {/* teal orb */}
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(0,229,204,0.18) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-16 right-0 h-48 w-48 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(0,229,204,0.10) 0%, transparent 70%)",
              filter: "blur(30px)",
            }}
          />

          <div className="relative z-10">
            {/* Logo */}
            <div className="mb-10 flex items-center gap-2.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: TEAL }}
              />
              <span className="font-display text-base font-bold tracking-tight text-white">
                Sepurux
              </span>
            </div>

            <p
              className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em]"
              style={{ color: TEAL }}
            >
              Chaos engineering for AI
            </p>
            <h2 className="mb-6 text-2xl font-bold leading-snug tracking-tight text-white">
              Break things in staging.<br />Ship with confidence.
            </h2>

            <ul className="space-y-3">
              {leftPanelFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: TEAL }}
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* bottom stats */}
          <div className="relative z-10">
            <div
              className="grid grid-cols-2 gap-3 rounded-2xl border p-4"
              style={{ borderColor: "rgba(0,229,204,0.15)", background: "rgba(0,229,204,0.04)" }}
            >
              {[
                { value: "12", label: "Pilot teams" },
                { value: "99.2%", label: "Detection rate" },
                { value: "< 200ms", label: "Replay latency" },
                { value: "3", label: "Enterprise evals" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-xs text-white/40">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex flex-col gap-6 p-8">
          {/* back link */}
          <div className="flex items-center justify-between">
            <Link
              href={DEFAULT_SITE_URL}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              Back to site
            </Link>

            {/* mode tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
              <Tab active={mode === "demo"} onClick={() => handleModeSwitch("demo")}>
                <span className="flex items-center gap-1.5">
                  <MonitorPlay className="h-3 w-3" /> Demo
                </span>
              </Tab>
              <Tab active={mode === "access"} onClick={() => handleModeSwitch("access")}>
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3 w-3" /> Get Access
                </span>
              </Tab>
            </div>
          </div>

          {/* heading */}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {mode === "demo"
                ? "Try the seeded demo"
                : intent === "signup"
                ? "Create your workspace"
                : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "demo"
                ? "A short-lived session with pre-loaded trace and campaign data."
                : intent === "signup"
                ? "Your workspace unlocks as soon as you're in."
                : "Sign in to access your reliability dashboard."}
            </p>
          </div>

          {/* ── DEMO MODE ── */}
          {mode === "demo" ? (
            <div className="space-y-4">
              <div
                className="rounded-xl border p-4 text-sm"
                style={{ borderColor: "rgba(0,229,204,0.2)", background: "rgba(0,229,204,0.05)" }}
              >
                <p className="font-semibold" style={{ color: TEAL }}>Seeded demo workspace</p>
                <p className="mt-1 text-white/60">
                  Isolated session, resettable dataset — no credentials needed.
                </p>
                {demoInfo ? (
                  <p className="mt-2 text-xs text-white/40">
                    Limits: {demoInfo.limits.campaigns_per_hour}/hr campaigns,{" "}
                    {demoInfo.limits.mutations_per_run}/run mutations.
                  </p>
                ) : null}
              </div>

              <TealButton onClick={() => void handleActivateDemo()} disabled={loadingDemo}>
                {loadingDemo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading demo workspace...
                  </>
                ) : (
                  <>
                    <MonitorPlay className="h-4 w-4" />
                    Enter demo dashboard
                  </>
                )}
              </TealButton>
            </div>
          ) : (
            /* ── ACCESS MODE ── */
            <div className="space-y-4">
              {/* intent tabs */}
              <div className="flex items-center gap-1 w-fit rounded-xl border border-border/60 bg-muted/30 p-1">
                <Tab active={intent === "signup"} onClick={() => handleIntentSwitch("signup")}>
                  <span className="flex items-center gap-1.5"><UserPlus className="h-3 w-3" /> Sign up</span>
                </Tab>
                <Tab active={intent === "login"} onClick={() => handleIntentSwitch("login")}>
                  <span className="flex items-center gap-1.5"><LogIn className="h-3 w-3" /> Log in</span>
                </Tab>
              </div>

              {/* API Base URL — collapsed by default */}
              <details className="text-sm">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  API Base URL (advanced)
                </summary>
                <div className="mt-2">
                  <input
                    className={fieldClass}
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder="/api/backend"
                  />
                </div>
              </details>

              {/* ── SIGN UP FORM ── */}
              {intent === "signup" ? (
                <form className="space-y-3" onSubmit={handleSignup}>
                  {/* plan selector */}
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Workspace plan</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {pricingTierDefinitions.map((plan) => {
                        const active = plan.tier === signupPlan;
                        return (
                          <button
                            key={plan.tier}
                            type="button"
                            onClick={() => handlePlanSwitch(plan.tier)}
                            className="rounded-xl border p-3 text-left text-xs transition-all"
                            style={
                              active
                                ? {
                                    borderColor: TEAL_BORDER,
                                    background: TEAL_DIM,
                                    boxShadow: `0 0 0 1px ${TEAL_BORDER}`,
                                  }
                                : {
                                    borderColor: "hsl(var(--border))",
                                    background: "hsl(var(--muted)/0.3)",
                                  }
                            }
                          >
                            <p className="font-semibold text-foreground">{plan.name}</p>
                            <p className="mt-0.5 text-muted-foreground">{plan.summary}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Name</span>
                    <input
                      className={fieldClass}
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="Ada Lovelace"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Work email</span>
                    <input
                      type="email"
                      className={fieldClass}
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Password</span>
                    <input
                      type="password"
                      className={fieldClass}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      minLength={8}
                      required
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Project name</span>
                    <input
                      className={fieldClass}
                      value={signupProjectName}
                      onChange={(e) => setSignupProjectName(e.target.value)}
                      placeholder="Fraud Agent Sandbox"
                    />
                  </label>

                  <TealButton type="submit" disabled={submittingAccess}>
                    {submittingAccess ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Creating workspace...</>
                    ) : (
                      <><UserPlus className="h-4 w-4" /> Create account<ArrowRight className="h-3.5 w-3.5" /></>
                    )}
                  </TealButton>
                </form>
              ) : (
                /* ── LOG IN FORM ── */
                <form className="space-y-3" onSubmit={handleLogin}>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <input
                      type="email"
                      className={fieldClass}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Password</span>
                    <input
                      type="password"
                      className={fieldClass}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Your password"
                      minLength={8}
                      required
                    />
                  </label>

                  <TealButton type="submit" disabled={submittingAccess}>
                    {submittingAccess ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                    ) : (
                      <><LogIn className="h-4 w-4" /> Log in to dashboard</>
                    )}
                  </TealButton>
                </form>
              )}

              {/* API key fallback */}
              <details className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                  Use an existing API key instead
                </summary>
                <form className="mt-4 space-y-3" onSubmit={handleManualConnect}>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">API Key</span>
                    <input
                      className={fieldClass}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="cl_..."
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Project ID (optional)</span>
                    <input
                      className={fieldClass}
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="UUID"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <TealButton type="submit" disabled={connecting}>
                      {connecting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</>
                      ) : (
                        <><KeyRound className="h-4 w-4" /> Continue with API key</>
                      )}
                    </TealButton>
                    <button
                      type="button"
                      onClick={resetStoredCredentials}
                      className="rounded-xl border border-border/60 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </details>
            </div>
          )}

          {/* error */}
          {errorMessage ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {errorMessage}
            </div>
          ) : null}

          {/* plan preview footer (access mode only) */}
          {mode === "access" && (
            <div className="mt-auto rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{selectedPlanDefinition.name}</span>
              {" — "}{selectedPlanDefinition.menuHighlights.join(", ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
