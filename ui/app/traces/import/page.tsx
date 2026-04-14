"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { api } from "@/lib/api";

export default function ImportTracePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const encoded = searchParams.get("trace");
    if (!encoded) {
      router.replace("/traces");
      return;
    }

    let payload: unknown;
    try {
      const decoded = decodeURIComponent(escape(atob(encoded)));
      payload = JSON.parse(decoded);
    } catch {
      setError("Invalid trace data in URL.");
      return;
    }

    api
      .createTrace(payload)
      .then((created) => {
        router.replace(`/traces/${created.trace_id}`);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to save trace.";
        // If unauthenticated, redirect to login with a next path back here
        if (message.toLowerCase().includes("401") || message.toLowerCase().includes("unauthorized")) {
          const here = `/traces/import?trace=${encoded}`;
          router.replace(`/auth?mode=access&intent=login&next=${encodeURIComponent(here)}`);
          return;
        }
        setError(message);
      });
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm font-semibold text-foreground">Could not save trace</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => router.replace("/traces")}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Go to traces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Saving trace…</p>
      </div>
    </div>
  );
}
