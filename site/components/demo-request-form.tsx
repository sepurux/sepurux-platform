// site/components/demo-request-form.tsx
"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

type DemoRole = "Platform Eng" | "Security" | "Product" | "Founder" | "Other";

const roles: DemoRole[] = ["Platform Eng", "Security", "Product", "Founder", "Other"];

const fieldClass =
  "h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white outline-none placeholder:text-white/30 transition focus:border-[rgba(0,229,204,0.4)] focus:bg-white/[0.06] focus:ring-2 focus:ring-[rgba(0,229,204,0.12)]";

const labelClass = "block space-y-1.5 text-sm";
const labelTextClass = "text-xs font-medium uppercase tracking-[0.14em] text-white/40";

export function DemoRequestForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<DemoRole>("Platform Eng");
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, company, use_case: useCase, website }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setStatus("error");
        setMessage(payload?.message || "Unable to submit demo request.");
        return;
      }

      setStatus("success");
      setMessage(payload?.message || "Thanks. We'll reach out to schedule your demo.");
      setEmail("");
      setRole("Platform Eng");
      setCompany("");
      setUseCase("");
      setWebsite("");
    } catch {
      setStatus("error");
      setMessage("Unexpected network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div
        className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border p-10 text-center"
        style={{
          borderColor: "rgba(0,229,204,0.2)",
          background: "rgba(0,229,204,0.04)",
        }}
      >
        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border"
          style={{ borderColor: "rgba(0,229,204,0.3)", background: "rgba(0,229,204,0.08)" }}
        >
          <CheckCircle2 className="h-7 w-7" style={{ color: "var(--accent-teal)" }} />
        </div>
        <h2 className="text-xl font-semibold text-white">Request received</h2>
        <p className="mt-3 max-w-sm text-sm leading-7 text-neutral-400">{message}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-6 md:p-8"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          <span className={labelTextClass}>Work email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            placeholder="you@company.com"
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as DemoRole)}
            className={`${fieldClass} appearance-none`}
          >
            {roles.map((item) => (
              <option key={item} value={item} className="bg-neutral-900 text-white">
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className={`${labelClass} md:col-span-2`}>
          <span className={labelTextClass}>Company</span>
          <input
            required
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={fieldClass}
            placeholder="Acme Inc"
          />
        </label>

        <label className={`${labelClass} md:col-span-2`}>
          <span className={labelTextClass}>What do you want to see?</span>
          <textarea
            required
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            className={`${fieldClass} h-auto min-h-32 py-3`}
            placeholder="Example: We want to see campaign creation from the SDK, seeded mutation packs, and policy gating for agent tool calls."
          />
        </label>

        {/* honeypot */}
        <label className="hidden" aria-hidden>
          Website
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "loading"}
          className="teal-glow-btn inline-flex h-11 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold text-white disabled:opacity-50"
          style={{
            borderColor: "rgba(0,229,204,0.35)",
            background: "rgba(0,229,204,0.08)",
          }}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Book demo
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {message && status === "error" ? (
          <p className="text-sm text-rose-400">{message}</p>
        ) : null}
      </div>
    </form>
  );
}
