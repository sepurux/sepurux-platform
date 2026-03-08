"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { api, type ProjectMetadata } from "@/lib/api";
import {
  getStoredApiBaseUrl,
  getStoredApiKey,
  getStoredProjectId,
  setStoredApiBaseUrl,
  setStoredApiKey,
  setStoredProjectId,
} from "@/lib/tenant-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ENV_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const ENV_API_KEY =
  process.env.NEXT_PUBLIC_SEPURUX_API_KEY ?? process.env.NEXT_PUBLIC_API_KEY ?? "";

export function SettingsView() {
  const [apiBaseUrl, setApiBaseUrl] = useState(ENV_API_BASE_URL);
  const [apiKey, setApiKey] = useState(ENV_API_KEY);
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [projectsVisible, setProjectsVisible] = useState(false);

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const storedApiBaseUrl = getStoredApiBaseUrl();
    const storedApiKey = getStoredApiKey();
    const storedProjectId = getStoredProjectId();

    if (storedApiBaseUrl) setApiBaseUrl(storedApiBaseUrl);
    if (storedApiKey) setApiKey(storedApiKey);
    if (storedProjectId) setProjectId(storedProjectId);

    let cancelled = false;

    async function loadProjects() {
      try {
        const records = await api.listProjects();
        if (cancelled) return;
        setProjects(records);
        setProjectsVisible(records.length > 0);
        if (!storedProjectId && records[0]) {
          setProjectId(records[0].project_id);
        }
      } catch {
        if (cancelled) return;
        setProjects([]);
        setProjectsVisible(false);
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveBaseUrl = useMemo(() => {
    return apiBaseUrl.trim() || ENV_API_BASE_URL;
  }, [apiBaseUrl]);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStoredApiBaseUrl(apiBaseUrl);
    setStoredApiKey(apiKey);
    if (projectId) {
      setStoredProjectId(projectId);
    }
    setSaveMessage("Saved locally. Refresh pages to apply updated headers/base URL everywhere.");
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestMessage(null);
    setTestError(null);

    try {
      const base = resolveBaseForBrowser(effectiveBaseUrl);
      const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
      const target = `${normalizedBase}/healthz`;

      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (apiKey.trim()) {
        headers["X-API-Key"] = apiKey.trim();
      }
      if (projectId.trim()) {
        headers["X-Project-Id"] = projectId.trim();
      }

      const response = await fetch(target, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const payload = await response.json().catch(() => null);
      setTestMessage(`Connected (${payload?.status ?? "ok"})`);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure local API access for development.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Values are stored in localStorage for this browser profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSave}>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">API Base URL</span>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
                placeholder="http://localhost:8000"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">API Key</span>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sepurux-dev-key"
              />
            </label>

            {projectsVisible ? (
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Project</span>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                >
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {saveMessage ? (
              <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 p-2 text-sm text-cyan-100">
                {saveMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit">Save Settings</Button>
              <Button type="button" variant="outline" onClick={() => void handleTestConnection()} disabled={testing}>
                {testing ? "Testing..." : "Test connection"}
              </Button>
            </div>

            {testMessage ? (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-100">
                {testMessage}
              </div>
            ) : null}
            {testError ? (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-sm text-rose-200">
                {testError}
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
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
    if (parsed.hostname === "api") {
      return "/api/backend";
    }
  } catch {
    return candidate;
  }

  return candidate;
}
