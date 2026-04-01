"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

type DemoRole = "Platform Eng" | "Security" | "Product" | "Founder" | "Other";

const roles: DemoRole[] = ["Platform Eng", "Security", "Product", "Founder", "Other"];

const fieldClass =
  "h-11 w-full rounded-2xl border border-[--border] bg-white/8 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-[rgba(var(--accent-rgb),0.32)] focus:ring-2 focus:ring-[rgba(var(--accent-rgb),0.12)]";

const labelClass = "block space-y-1.5 text-sm";
const labelTextClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

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
      <div className="accent-panel-soft flex min-h-[360px] flex-col items-center justify-center rounded-[30px] p-10 text-center">
        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border"
          style={{
            borderColor: "rgba(var(--accent-rgb), 0.22)",
            background: "rgba(var(--accent-rgb), 0.08)",
          }}
        >
          <CheckCircle2 className="h-7 w-7" style={{ color: "var(--color-accent)" }} />
        </div>
        <h2 className="text-xl font-semibold text-[--text-primary]">Request received</h2>
        <p className="mt-3 max-w-sm text-sm leading-7 text-slate-300">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="page-surface space-y-5 p-6 md:p-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Request a walkthrough
        </p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[--text-primary]">
          Tell us what you need to validate.
        </p>
      </div>

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
              <option key={item} value={item} className="bg-[#0d1629] text-slate-100">
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
            borderColor: "rgba(var(--accent-rgb), 0.35)",
            background: "var(--color-accent)",
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

        {message && status === "error" ? <p className="text-sm text-rose-600">{message}</p> : null}
      </div>
    </form>
  );
}
