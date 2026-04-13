"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type WaitlistRole = "Platform Eng" | "Security" | "Product" | "Other";

const roles: WaitlistRole[] = ["Platform Eng", "Security", "Product", "Other"];

export function WaitlistForm({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WaitlistRole>("Platform Eng");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, company, website }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setStatus("error");
        setMessage(payload?.message || "Unable to submit waitlist request.");
        return;
      }

      setStatus("success");
      setMessage(payload?.message || "You are on the waitlist.");
      setEmail("");
      setRole("Platform Eng");
      setCompany("");
      setWebsite("");
    } catch {
      setStatus("error");
      setMessage("Unexpected network error. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-[28px] border border-white/8 bg-card/82 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] md:p-7">
      {title ? <h3 className="text-lg font-semibold text-foreground">{title}</h3> : null}
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="text-muted-foreground">Work email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[rgba(var(--accent-rgb),0.4)] focus:ring-4 focus:ring-[rgba(var(--accent-rgb),0.12)]"
            placeholder="you@company.com"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-muted-foreground">Role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as WaitlistRole)}
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none transition focus:border-[rgba(var(--accent-rgb),0.4)] focus:ring-4 focus:ring-[rgba(var(--accent-rgb),0.12)]"
          >
            {roles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm md:col-span-2">
          <span className="text-muted-foreground">Company (optional)</span>
          <input
            type="text"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[rgba(var(--accent-rgb),0.4)] focus:ring-4 focus:ring-[rgba(var(--accent-rgb),0.12)]"
            placeholder="Acme Inc"
          />
        </label>

        <label className="hidden" aria-hidden>
          Website
          <input
            type="text"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Submitting..." : "Join waitlist"}
        </Button>
        {message ? (
          <p
            className={
              status === "success"
                ? "text-sm text-success"
                : status === "error"
                  ? "text-sm text-danger"
                  : "text-sm text-muted-foreground"
            }
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
