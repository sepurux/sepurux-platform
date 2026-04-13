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
  UserPlus,
  CheckCircle2,
  ArrowRight,
  Github,
} from "lucide-react";

import {
  api,
  type AuthSessionResponse,
  type DemoInfoResponse,
  type SocialOAuthProvider,
} from "@/lib/api";
import { clearStoredAuthSession, setStoredAuthSession } from "@/lib/auth-session";
import { applyThemeMode, getStoredThemeMode, resolveSystemThemeMode } from "@/lib/theme";
import {
  setStoredApiBaseUrl,
  setStoredApiKey,
  setStoredProjectId,
} from "@/lib/tenant-settings";
const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:8000" : "/api/backend";
const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sepurux.com";
const DEMO_PREVIEW_FLAG_KEY = "sepurux.demoPreview";
const DEMO_CAMPAIGN_STORAGE_KEY = "sepurux.demoCampaign";
const OAUTH_API_BASE_URL_KEY = "sepurux.oauthApiBaseUrl";

type AccessMode = "demo" | "access";
type AccessIntent = "signup" | "login";

const TEAL = "hsl(var(--primary))";
const TEAL_DIM = "rgb(var(--primary-rgb) / 0.12)";
const TEAL_BORDER = "rgb(var(--primary-rgb) / 0.3)";
const GREEN = "var(--accent-teal)";
const GREEN_DIM = "var(--accent-teal-dim)";
const GREEN_BORDER = "rgb(var(--teal-rgb) / 0.2)";

const leftPanelFeatures = [
  "Paste a trace and see the failing step",
  "Keep replay and mutation tests for later",
  "Save traces when you need history",
  "Promote stable traces into CI checks",
];

const socialProviders: Array<{
  provider: SocialOAuthProvider;
  label: string;
}> = [
  { provider: "google", label: "Continue with Google" },
  { provider: "microsoft", label: "Continue with Microsoft" },
  { provider: "github", label: "Continue with GitHub" },
];

function normalizeNextPath(rawPath: string | null) {
  if (!rawPath || !rawPath.startsWith("/")) {
    return "/dashboard";
  }
  return rawPath;
}

function resolvePostAuthPath(
  requestedPath: string,
  session: { is_super_admin?: boolean | null }
) {
  const isSuperAdmin = Boolean(session.is_super_admin);
  if (isSuperAdmin) {
    return requestedPath.startsWith("/internal") ? requestedPath : "/internal/dashboard";
  }
  if (requestedPath.startsWith("/internal")) {
    return "/dashboard";
  }
  return requestedPath;
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

function resolveOauthBrowserBase(inputBaseUrl: string) {
  const resolvedBase = resolveBaseForBrowser(inputBaseUrl);
  if (/^https?:\/\//.test(resolvedBase)) {
    return resolvedBase.endsWith("/") ? resolvedBase.slice(0, -1) : resolvedBase;
  }
  if (typeof window === "undefined") {
    return resolvedBase;
  }
  const normalizedPath = resolvedBase.startsWith("/") ? resolvedBase : `/${resolvedBase}`;
  return `${window.location.origin}${normalizedPath}`;
}

// ── Shared field style ──────────────────────────────────────────────────────
const fieldClass =
  "w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-primary/12";

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
          : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }
      }
    >
      {children}
    </button>
  );
}

// ── Primary action button ──────────────────────────────────────────────────
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
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
      style={{
        background: disabled ? "hsl(var(--primary) / 0.45)" : TEAL,
        boxShadow: disabled ? "none" : "0 0 0 1px hsl(var(--primary) / 0.4), 0 4px 24px hsl(var(--primary) / 0.2)",
      }}
    >
      {children}
    </button>
  );
}

function SocialButton({
  label,
  provider,
  disabled,
  onClick,
}: {
  label: string;
  provider: SocialOAuthProvider;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="relative inline-flex w-full items-center justify-center rounded-2xl border border-border/70 bg-card/75 px-4 py-2.5 text-sm font-medium text-foreground transition hover:-translate-y-px hover:border-primary/35 hover:bg-accent/50 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.18)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="absolute left-4 flex h-6 w-6 items-center justify-center">
        <ProviderIcon provider={provider} />
      </span>
      <span>{label}</span>
    </button>
  );
}

function ProviderIcon({ provider }: { provider: SocialOAuthProvider }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4A9.6 9.6 0 0 0 2.4 12c0 5.3 4.3 9.6 9.6 9.6 5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.5z"
        />
        <path
          fill="#4285F4"
          d="M21.1 12.4c0-.6-.1-1.1-.2-1.5H12v3.9h5.4c-.3 1.4-1.1 2.5-2.3 3.3l3.5 2.7c2-1.8 3.2-4.6 3.2-8.4z"
        />
        <path
          fill="#FBBC05"
          d="M6.2 14.3a5.8 5.8 0 0 1 0-4L3.1 7.9a9.6 9.6 0 0 0 0 8.2z"
        />
        <path
          fill="#34A853"
          d="M12 21.6c2.7 0 4.9-.9 6.5-2.4L15 16.5c-.9.6-2 .9-3 .9-2.5 0-4.7-1.7-5.5-4l-3.1 2.4a9.6 9.6 0 0 0 8.6 5.8z"
        />
      </svg>
    );
  }

  if (provider === "microsoft") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" fill="#F25022" />
        <rect x="13" y="3" width="8" height="8" fill="#7FBA00" />
        <rect x="3" y="13" width="8" height="8" fill="#00A4EF" />
        <rect x="13" y="13" width="8" height="8" fill="#FFB900" />
      </svg>
    );
  }

  return <Github className="h-6 w-6 text-foreground" aria-hidden="true" />;
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
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_API_BASE_URL;
    }
    try {
      return window.localStorage.getItem(OAUTH_API_BASE_URL_KEY) || DEFAULT_API_BASE_URL;
    } catch {
      return DEFAULT_API_BASE_URL;
    }
  });
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupProjectName, setSignupProjectName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [demoInfo, setDemoInfo] = useState<DemoInfoResponse | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [submittingAccess, setSubmittingAccess] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams]);
  const oauthExchangeToken = searchParams.get("exchange");
  const oauthError = searchParams.get("oauth_error");

  useEffect(() => {
    const previousTheme =
      getStoredThemeMode() ??
      (typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
        ? "dark"
        : "light");
    applyThemeMode("dark");
    return () => {
      const restoreTheme = getStoredThemeMode() ?? previousTheme ?? resolveSystemThemeMode();
      applyThemeMode(restoreTheme);
    };
  }, []);

  useEffect(() => {
    setMode(searchParams.get("mode") === "access" ? "access" : "demo");
    setIntent(searchParams.get("intent") === "login" ? "login" : "signup");
  }, [searchParams]);

  useEffect(() => {
    if (!oauthError) {
      return;
    }
    setMode("access");
    setIntent("login");
    setErrorMessage(oauthError);
  }, [oauthError]);

  useEffect(() => {
    const exchangeToken = oauthExchangeToken as string | null;
    if (!exchangeToken) {
      return;
    }

    let cancelled = false;
    async function finishOAuthLogin() {
      setOauthPending(true);
      setErrorMessage(null);
      try {
        const resolvedBase = resolveBaseForBrowser(apiBaseUrl);
        const session = await api.exchangeOAuthSession(
          { token: exchangeToken as string },
          { baseUrl: resolvedBase }
        );
        if (cancelled) {
          return;
        }
        await persistSession(session, resolvedBase);
        router.replace(resolvePostAuthPath(nextPath, session));
      } catch (error) {
        if (cancelled) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Unable to finish sign-in");
      } finally {
        if (!cancelled) {
          setOauthPending(false);
        }
      }
    }

    void finishOAuthLogin();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, oauthExchangeToken, nextPath, router]);

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
      window.localStorage.removeItem(OAUTH_API_BASE_URL_KEY);
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
      router.replace(resolvePostAuthPath(nextPath, authSession));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start demo session");
    } finally {
      setLoadingDemo(false);
    }
  }

  function updateQuery(nextMode: AccessMode, nextIntent: AccessIntent) {
    if (typeof window === "undefined") return;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("mode", nextMode);
    nextUrl.searchParams.set("intent", nextIntent);
    nextUrl.searchParams.delete("plan");
    window.history.replaceState({}, "", nextUrl.toString());
  }

  function handleModeSwitch(nextMode: AccessMode) {
    const nextIntent = nextMode === "access" ? intent : "signup";
    setMode(nextMode);
    setErrorMessage(null);
    setForgotMessage(null);
    updateQuery(nextMode, nextIntent);
  }

  function handleIntentSwitch(nextIntent: AccessIntent) {
    setIntent(nextIntent);
    setErrorMessage(null);
    setForgotMessage(null);
    updateQuery("access", nextIntent);
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
        },
        { baseUrl: resolvedBase }
      );
      await persistSession(session, resolvedBase);
      router.replace(resolvePostAuthPath(nextPath, session));
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
    setForgotMessage(null);
    try {
      const resolvedBase = resolveBaseForBrowser(apiBaseUrl);
      const session = await api.login(
        { email: loginEmail.trim(), password: loginPassword },
        { baseUrl: resolvedBase }
      );
      await persistSession(session, resolvedBase);
      router.replace(resolvePostAuthPath(nextPath, session));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to log in");
    } finally {
      setSubmittingAccess(false);
    }
  }

  async function handleForgotPassword() {
    const email = loginEmail.trim();
    if (!email || forgotBusy || submittingAccess) {
      return;
    }
    setForgotBusy(true);
    setErrorMessage(null);
    setForgotMessage(null);
    try {
      const resolvedBase = resolveBaseForBrowser(apiBaseUrl);
      const response = await api.requestPasswordReset({ email }, { baseUrl: resolvedBase });
      setForgotMessage(response.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to process password reset");
    } finally {
      setForgotBusy(false);
    }
  }

  function handleSocialLogin(provider: SocialOAuthProvider) {
    const oauthBase = resolveOauthBrowserBase(apiBaseUrl);
    const normalizedBase = resolveBaseForBrowser(apiBaseUrl);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(OAUTH_API_BASE_URL_KEY, normalizedBase);
      const startUrl = new URL(`${oauthBase}/auth/oauth/${provider}/start`);
      startUrl.searchParams.set("next", nextPath);
      window.location.assign(startUrl.toString());
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-4">
      <div
        className="panel-surface grid w-full max-w-5xl overflow-hidden lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]"
      >
        {/* ── Left branded panel ── */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-8 lg:flex"
          style={{
            background:
              "radial-gradient(circle at 18% 18%, rgba(124,58,237,0.18) 0%, transparent 34%), radial-gradient(circle at 84% 14%, rgba(6,182,212,0.08) 0%, transparent 28%), linear-gradient(180deg, hsl(var(--background) / 0.98), hsl(var(--card) / 0.94))",
          }}
        >
          {/* brand orbs */}
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full"
            style={{
              background: "radial-gradient(circle, rgb(var(--primary-rgb) / 0.18) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-16 right-0 h-48 w-48 rounded-full"
            style={{
              background: "radial-gradient(circle, rgb(var(--teal-rgb) / 0.1) 0%, transparent 70%)",
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
              Trace debugging for AI
            </p>
            <h2 className="mb-6 text-2xl font-bold leading-snug tracking-tight text-white">
              Paste the trace.<br />Find the issue fast.
            </h2>

            <ul className="space-y-3">
              {leftPanelFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: GREEN }}
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* bottom stats */}
          <div className="relative z-10">
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
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
            <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/60">
              <span className="font-medium text-white">Full product access</span>
              {" — "}
              Runs are only used when you save a trace, replay later, or run mutation-heavy workflows.
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex flex-col gap-5 p-6 sm:p-8">
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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
                <Tab active={mode === "demo"} onClick={() => handleModeSwitch("demo")}>
                  <span className="flex items-center gap-1.5">
                    <MonitorPlay className="h-3 w-3" /> Demo trace
                  </span>
                </Tab>
                <Tab active={mode === "access"} onClick={() => handleModeSwitch("access")}>
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="h-3 w-3" /> Save traces
                  </span>
                </Tab>
              </div>
            </div>
          </div>

          {/* heading */}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {mode === "demo"
                ? "Try the demo trace"
                : intent === "signup"
                ? "Create an account after the first answer"
                : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "demo"
                ? "A short-lived session with a pre-loaded trace and no credentials needed."
                : intent === "signup"
                ? "Sign up once the debugger has shown you the issue, then save traces and compare runs."
                : "Sign in to open saved traces, replay history, and compare runs."}
            </p>
          </div>

          {/* ── DEMO MODE ── */}
          {mode === "demo" ? (
            <div className="space-y-4">
              <div
                className="rounded-xl border p-4 text-sm"
                style={{ borderColor: GREEN_BORDER, background: "rgb(var(--teal-rgb) / 0.05)" }}
              >
                <p className="font-semibold" style={{ color: GREEN }}>Demo trace</p>
                <p className="mt-1 text-muted-foreground">
                  Try the debugger on a sample failure. No credentials needed.
                </p>
                {demoInfo ? (
                  <p className="mt-2 text-xs text-muted-foreground/80">
                    Limits: {demoInfo.limits.campaigns_per_hour}/hr campaigns,{" "}
                    {demoInfo.limits.mutations_per_run}/run mutations.
                  </p>
                ) : null}
              </div>

              <TealButton onClick={() => void handleActivateDemo()} disabled={loadingDemo}>
                {loadingDemo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading demo trace...
                  </>
                ) : (
                  <>
                    <MonitorPlay className="h-4 w-4" />
                    Open demo trace
                  </>
                )}
              </TealButton>
            </div>
          ) : (
            /* ── ACCESS MODE ── */
            <div className="space-y-4">
              <div className="space-y-2">
                {socialProviders.map(({ provider, label }) => (
                  <SocialButton
                    key={provider}
                    label={label}
                    provider={provider}
                    disabled={submittingAccess || oauthPending}
                    onClick={() => handleSocialLogin(provider)}
                  />
                ))}
              </div>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 w-fit rounded-xl border border-border/60 bg-muted/30 p-1">
                <Tab active={intent === "signup"} onClick={() => handleIntentSwitch("signup")}>
                  <span className="flex items-center gap-1.5"><UserPlus className="h-3 w-3" /> Sign up</span>
                </Tab>
                <Tab active={intent === "login"} onClick={() => handleIntentSwitch("login")}>
                  <span className="flex items-center gap-1.5"><LogIn className="h-3 w-3" /> Log in</span>
                </Tab>
              </div>

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

              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground lg:hidden">
                <span className="font-medium text-foreground">Full product access</span>
                {" — "}
                Runs are only used when you save a trace, replay later, or run mutation-heavy workflows.
              </div>

              {/* ── SIGN UP FORM ── */}
              {intent === "signup" ? (
                <form className="space-y-4" onSubmit={handleSignup}>
                  <div className="grid gap-3 sm:grid-cols-2">
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
                      <span className="text-xs text-muted-foreground">Project name</span>
                      <input
                        className={fieldClass}
                        value={signupProjectName}
                        onChange={(e) => setSignupProjectName(e.target.value)}
                        placeholder="Fraud Agent Sandbox"
                      />
                    </label>
                    <label className="block space-y-1 sm:col-span-2">
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
                    <label className="block space-y-1 sm:col-span-2">
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
                  </div>

                  <TealButton type="submit" disabled={submittingAccess || oauthPending}>
                    {submittingAccess || oauthPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
                    ) : (
                      <><UserPlus className="h-4 w-4" /> Create account<ArrowRight className="h-3.5 w-3.5" /></>
                    )}
                  </TealButton>
                </form>
              ) : (
                /* ── LOG IN FORM ── */
                <form className="space-y-4" onSubmit={handleLogin}>
                  <div className="grid gap-3">
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
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          void handleForgotPassword();
                        }}
                        disabled={forgotBusy || submittingAccess || !loginEmail.trim()}
                        className="text-xs font-medium text-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {forgotBusy ? "Sending reset link..." : "Forgot password?"}
                      </button>
                    </div>
                  </div>

                  <TealButton type="submit" disabled={submittingAccess || oauthPending}>
                    {submittingAccess || oauthPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                    ) : (
                      <><LogIn className="h-4 w-4" /> Open saved traces</>
                    )}
                  </TealButton>
                  {forgotMessage ? (
                    <p className="text-xs text-primary">{forgotMessage}</p>
                  ) : null}
                </form>
              )}

              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                Social sign-in creates or links your Sepurux workspace automatically. Email login keeps the same session model and saved-trace identity.
              </div>
            </div>
          )}

          {/* error */}
          {oauthPending ? (
            <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: TEAL_BORDER, background: TEAL_DIM, color: TEAL }}>
              Completing sign-in with your identity provider...
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
