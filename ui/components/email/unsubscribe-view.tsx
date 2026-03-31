"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";

import { ApiError, api } from "@/lib/api";

export function UnsubscribeView({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [message, setMessage] = useState<string>(
    token ? "Processing your unsubscribe request..." : "Missing unsubscribe token."
  );
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function run() {
      try {
        const payload = await api.unsubscribeFromNewsletter({ token });
        if (cancelled) return;
        setStatus("success");
        setEmail(payload.email);
        setMessage(payload.message);
      } catch (requestError) {
        if (cancelled) return;
        setStatus("error");
        setMessage(requestError instanceof ApiError ? requestError.message : "Failed to unsubscribe");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center px-4 py-10">
      <div className="w-full overflow-hidden rounded-[32px] border border-[#eadfd1] bg-[#fffaf5] shadow-[0_24px_70px_rgba(20,33,23,0.12)]">
        <div className="border-b border-[#eadfd1] bg-[#fbf5ee] px-8 py-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7843b]">Sepurux Newsletter</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[#142117]">Email preferences updated.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f6d63]">
            We only use this flow for product and platform update emails. Transactional account and security emails still continue as needed.
          </p>
        </div>

        <div className="space-y-5 px-8 py-8">
          <div className="rounded-[24px] border border-[#e8ddd0] bg-white px-6 py-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full border border-[#eadfd1] bg-[#f7f1ea] p-3">
                {status === "loading" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#d7843b]" />
                ) : status === "success" ? (
                  <CheckCircle2 className="h-5 w-5 text-[#4f8767]" />
                ) : (
                  <MailWarning className="h-5 w-5 text-[#d7843b]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-[#142117]">
                  {status === "success"
                    ? "You are unsubscribed"
                    : status === "loading"
                      ? "Updating your preference"
                      : "We could not complete this request"}
                </p>
                <p className="mt-2 text-sm leading-7 text-[#445147]">{message}</p>
                {email ? <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[#4f8767]">{email}</p> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/auth?mode=access&intent=login"
              className="inline-flex rounded-full bg-[#d7843b] px-5 py-3 font-semibold text-white transition hover:brightness-105"
            >
              Open Sepurux
            </Link>
            <a
              href="mailto:support@sepurux.com"
              className="inline-flex rounded-full border border-[#d9c8b8] px-5 py-3 font-semibold text-[#223127] transition hover:bg-[#f7f1ea]"
            >
              Contact support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
