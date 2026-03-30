"use client";

import { useEffect, useState, type ReactNode } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { api, type AuthSessionMetadata } from "@/lib/api";
import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession } from "@/lib/auth-session";
import {
  clearStoredApiBaseUrl,
  clearStoredApiKey,
  clearStoredProjectId,
  getStoredApiKey,
} from "@/lib/tenant-settings";

import { DemoPreviewBar } from "@/components/layout/demo-preview-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

const PUBLIC_API_KEY =
  process.env.NEXT_PUBLIC_SEPURUX_API_KEY ??
  process.env.NEXT_PUBLIC_CRASHLAB_API_KEY ??
  process.env.NEXT_PUBLIC_API_KEY ??
  "";

function sectionForPath(pathname: string) {
  if (pathname.startsWith("/billing")) return "billing";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/traces")) return "traces";
  if (pathname.startsWith("/campaigns")) return "campaigns";
  if (pathname.startsWith("/runs")) return "runs";
  if (pathname.startsWith("/mutation-packs")) return "mutation-packs";
  if (pathname.startsWith("/policies")) return "policies";
  if (pathname.startsWith("/security")) return "security";
  if (pathname.startsWith("/audit")) return "audit";
  if (pathname.startsWith("/webhooks")) return "webhooks";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

function pathForSection(section: string) {
  switch (section) {
    case "billing":
      return "/billing";
    case "reports":
      return "/reports";
    case "traces":
      return "/traces";
    case "campaigns":
      return "/campaigns";
    case "runs":
      return "/runs";
    case "mutation-packs":
      return "/mutation-packs";
    case "policies":
      return "/policies";
    case "security":
      return "/security";
    case "audit":
      return "/audit";
    case "webhooks":
      return "/webhooks";
    case "settings":
      return "/settings";
    default:
      return "/dashboard";
  }
}

export function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [gateState, setGateState] = useState<"checking" | "allowed" | "redirecting">("checking");
  const [authSession, setAuthSession] = useState<AuthSessionMetadata | null>(null);

  const isAuthPage = pathname.startsWith("/auth");
  const isInternalPage = pathname.startsWith("/internal");

  useEffect(() => {
    if (isAuthPage) {
      setGateState("allowed");
      return;
    }

    const hasApiKey = Boolean(getStoredApiKey() || PUBLIC_API_KEY);
    if (hasApiKey) {
      const cachedSession = getStoredAuthSession();
      if (cachedSession) {
        setAuthSession(cachedSession);
      }

      let cancelled = false;
      async function loadAuthSession() {
        try {
          const session = await api.getAuthSession();
          if (cancelled) return;
          setStoredAuthSession(session);
          setAuthSession(session);
          if (session.is_super_admin) {
            if (!isInternalPage) {
              setGateState("redirecting");
              router.replace("/internal/dashboard");
              return;
            }
          } else if (isInternalPage) {
            setGateState("redirecting");
            router.replace("/dashboard");
            return;
          }
          if (!isInternalPage) {
            const currentSection = sectionForPath(pathname);
            if (!session.permissions.visible_sections.includes(currentSection)) {
              const nextSection = session.permissions.visible_sections[0] ?? "dashboard";
              setGateState("redirecting");
              router.replace(pathForSection(nextSection));
              return;
            }
          }
          setGateState("allowed");
        } catch {
          if (cancelled) return;
          clearStoredAuthSession();
          clearStoredApiKey();
          clearStoredProjectId();
          clearStoredApiBaseUrl();
          setAuthSession(null);
          const query = searchParams.toString();
          const nextPath = query ? `${pathname}?${query}` : pathname;
          setGateState("redirecting");
          router.replace(`/auth?mode=access&intent=login&next=${encodeURIComponent(nextPath)}`);
        }
      }

      setGateState("checking");
      void loadAuthSession();

      return () => {
        cancelled = true;
      };
    }

    const query = searchParams.toString();
    const nextPath = query ? `${pathname}?${query}` : pathname;
    clearStoredAuthSession();
    setGateState("redirecting");
    router.replace(`/auth?mode=access&intent=signup&next=${encodeURIComponent(nextPath)}`);
  }, [isAuthPage, isInternalPage, pathname, router, searchParams]);

  if (isAuthPage) {
    return <main className="app-shell-backdrop faint-grid min-h-screen p-4 md:p-8">{children}</main>;
  }

  if (gateState !== "allowed") {
    return (
      <div className="app-shell-backdrop faint-grid flex min-h-screen items-center justify-center p-6">
        <div className="glass-surface px-7 py-5 text-sm text-muted-foreground shadow-panel">
          <span className="inline-flex items-center gap-2 font-medium text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Preparing workspace...
          </span>
        </div>
      </div>
    );
  }

  if (isInternalPage) {
    return <div className="app-shell-backdrop min-h-screen bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="app-shell-backdrop flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <DemoPreviewBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar authSession={authSession} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar authSession={authSession} />
          {pathname.startsWith("/dashboard") && authSession?.is_low_credit ? (
            <div className="border-b border-amber-300/45 bg-amber-100/90 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/22 dark:bg-amber-500/12 dark:text-amber-100 md:px-6">
              Credits are running low. This workspace has {authSession.credits_balance ?? 0} credits remaining.
              Upgrade the plan or top up credits before the next campaign run is blocked.
            </div>
          ) : null}
          <main className="faint-grid flex-1 overflow-y-auto px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
