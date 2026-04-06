"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { ApiError, api, type InternalSearchResults } from "@/lib/api";

const sectionCard = "rounded-lg border border-border/70 bg-card/70 p-4";

export function InternalSearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";

  const [queryInput, setQueryInput] = useState(queryFromUrl);
  const [results, setResults] = useState<InternalSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => queryFromUrl.trim(), [queryFromUrl]);

  useEffect(() => {
    setQueryInput(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!query) {
        setResults(null);
        setError(null);
        return;
      }

      setLoading(true);
      try {
        const payload = await api.searchInternal(query);
        if (cancelled) return;
        setResults(payload);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Failed to run internal search");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [query]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = queryInput.trim();
    if (!next) {
      router.push("/internal/search");
      return;
    }
    router.push(`/internal/search?q=${encodeURIComponent(next)}`);
  }

  return (
    <section className="mx-auto w-full max-w-[88rem] space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold text-primary">Global Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search across users, projects, campaigns, and failures.</p>
      </div>

      <form onSubmit={submitSearch} className="flex gap-2">
        <input
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          placeholder="Search internal entities"
          className="h-11 flex-1 rounded-md border border-border/70 bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-border/70"
        />
        <button
          type="submit"
          className="h-11 rounded-md border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary hover:bg-primary/20"
        >
          Search
        </button>
      </form>

      {!query ? (
        <div className={sectionCard}>
          <p className="text-sm text-muted-foreground">Enter a term to run internal search.</p>
        </div>
      ) : null}

      {loading ? (
        <div className={sectionCard}>
          <p className="text-sm text-muted-foreground">Searching for "{query}"...</p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && results ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className={sectionCard}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Users</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {results.users.length ? (
                results.users.map((item) => (
                  <li key={item.user_id} className="rounded border border-border/70 bg-background px-3 py-2">
                    <p className="font-medium text-foreground">{item.email}</p>
                    <p className="text-xs text-muted-foreground">{item.name ?? "-"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ID: <span className="select-all font-mono">{item.user_id}</span>
                    </p>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No users found</li>
              )}
            </ul>
          </article>

          <article className={sectionCard}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Projects</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {results.projects.length ? (
                results.projects.map((item) => (
                  <li key={item.project_id} className="rounded border border-border/70 bg-background px-3 py-2">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Project: {item.project_id}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Tenant:{" "}
                      <span className="select-all font-mono">{item.tenant_id}</span>
                    </p>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No projects found</li>
              )}
            </ul>
          </article>

          <article className={sectionCard}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Campaigns</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {results.campaigns.length ? (
                results.campaigns.map((item) => (
                  <li key={item.campaign_id} className="rounded border border-border/70 bg-background px-3 py-2">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Status: {item.status}</p>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No campaigns found</li>
              )}
            </ul>
          </article>

          <article className={sectionCard}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Failures</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {results.failures.length ? (
                results.failures.map((item) => (
                  <li key={item.failure_id} className="rounded border border-border/70 bg-background px-3 py-2">
                    <p className="font-medium text-foreground">{item.failure_type}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No failures found</li>
              )}
            </ul>
          </article>
        </div>
      ) : null}
    </section>
  );
}
