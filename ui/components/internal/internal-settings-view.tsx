"use client";

import { useEffect, useState } from "react";

import { ApiError, api, type InternalFeatureFlags } from "@/lib/api";

const toggleRows: Array<{
  key: keyof InternalFeatureFlags;
  label: string;
  description: string;
}> = [
  {
    key: "enable_registration",
    label: "Enable Registration",
    description: "Allow new users to sign up. Disable to gate access during beta or incidents.",
  },
  {
    key: "enable_ci",
    label: "Enable CI",
    description: "Allow CI-triggered campaign workflows.",
  },
  {
    key: "enable_mutations",
    label: "Enable Mutations",
    description: "Allow mutation pipelines and mutation-based runs.",
  },
  {
    key: "enable_billing",
    label: "Enable Billing",
    description: "Allow billing and credit purchase flows.",
  },
  {
    key: "enable_injection_scanning",
    label: "Enable Injection Scanning",
    description: "Run prompt injection firewall checks on all incoming LLM inputs.",
  },
  {
    key: "enable_opa_enforcement",
    label: "Enable OPA Enforcement",
    description: "Enforce Open Policy Agent policy decisions on run execution.",
  },
  {
    key: "enable_counterfactuals",
    label: "Enable Counterfactuals",
    description: "Run counterfactual replay pipelines after each completed run.",
  },
];

export function InternalSettingsView() {
  const [flags, setFlags] = useState<InternalFeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await api.getInternalFeatureFlags();
        if (cancelled) return;
        setFlags(payload);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError && requestError.status === 403) {
          setError("Access denied. Super admin role is required.");
        } else {
          setError(
            requestError instanceof Error ? requestError.message : "Failed to load internal settings"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveFlags() {
    if (!flags) return;
    setSaving(true);
    setStatus(null);
    try {
      const updated = await api.updateInternalFeatureFlags(flags);
      setFlags(updated);
      setError(null);
      setStatus("Internal settings updated.");
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Failed to update internal settings");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold text-primary">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Global internal feature flags for Sepurux platform controls.
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border/70 bg-card/70 p-4">
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && flags ? (
        <div className="space-y-3 rounded-lg border border-border/70 bg-card/70 p-4">
          {toggleRows.map((item) => {
            const enabled = Boolean(flags[item.key]);
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 rounded-md border border-border/70 bg-background/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() =>
                    setFlags((current) =>
                      current ? { ...current, [item.key]: !current[item.key] } : current
                    )
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    enabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform ${
                      enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            );
          })}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveFlags}
              disabled={saving}
              className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
            {status ? <p className="text-sm text-primary">{status}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
