"use client";

import { useEffect, useState, type ReactNode } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { getStoredApiKey } from "@/lib/tenant-settings";

import { DemoPreviewBar } from "@/components/layout/demo-preview-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

const PUBLIC_API_KEY =
  process.env.NEXT_PUBLIC_SEPURUX_API_KEY ??
  process.env.NEXT_PUBLIC_CRASHLAB_API_KEY ??
  process.env.NEXT_PUBLIC_API_KEY ??
  "";

export function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [gateState, setGateState] = useState<"checking" | "allowed" | "redirecting">("checking");

  const isAuthPage = pathname.startsWith("/auth");

  useEffect(() => {
    if (isAuthPage) {
      setGateState("allowed");
      return;
    }

    const hasApiKey = Boolean(getStoredApiKey() || PUBLIC_API_KEY);
    if (hasApiKey) {
      setGateState("allowed");
      return;
    }

    const query = searchParams.toString();
    const nextPath = query ? `${pathname}?${query}` : pathname;
    setGateState("redirecting");
    router.replace(`/auth?mode=demo&next=${encodeURIComponent(nextPath)}`);
  }, [isAuthPage, pathname, router, searchParams]);

  if (isAuthPage) {
    return <main className="faint-grid min-h-screen p-4 md:p-8">{children}</main>;
  }

  if (gateState !== "allowed") {
    return (
      <div className="faint-grid flex min-h-screen items-center justify-center bg-background p-6">
        <div className="rounded-lg border border-border/70 bg-card/80 px-6 py-5 text-sm text-muted-foreground shadow-panel">
          <span className="inline-flex items-center gap-2 text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
            Preparing workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <DemoPreviewBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="faint-grid flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
