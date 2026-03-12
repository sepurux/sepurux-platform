"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type DemoRole = "Platform Eng" | "Security" | "Product" | "Founder" | "Other";

const roles: DemoRole[] = ["Platform Eng", "Security", "Product", "Founder", "Other"];

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
      setMessage(payload?.message || "Thanks. We will reach out to schedule your demo.");
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

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border/80 bg-card/85 p-6 shadow-panel shadow-black/30">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="text-muted-foreground">Work email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="you@company.com"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-muted-foreground">Role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as DemoRole)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            {roles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm md:col-span-2">
          <span className="text-muted-foreground">Company</span>
          <input
            required
            type="text"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Acme Inc"
          />
        </label>

        <label className="space-y-2 text-sm md:col-span-2">
          <span className="text-muted-foreground">What do you want to see in the demo?</span>
          <textarea
            required
            value={useCase}
            onChange={(event) => setUseCase(event.target.value)}
            className="min-h-32 w-full rounded-lg border border-input bg-background px-3 py-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Example: We want to see campaign creation from the SDK, seeded mutation packs, and policy gating for agent tool calls."
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
          {status === "loading" ? "Submitting..." : "Book demo"}
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
