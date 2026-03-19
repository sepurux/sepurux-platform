"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { ApiError, api, type InternalSearchResults } from "@/lib/api";

const sectionCard = "rounded-lg border border-neutral-800 bg-neutral-950 p-4";

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
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-semibold text-white">Global Search</h1>
        <p className="mt-1 text-sm text-neutral-400">Search across users, projects, campaigns, and failures.</p>
      </div>

      <form onSubmit={submitSearch} className="flex gap-2">
        <input
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          placeholder="Search internal entities"
          className="h-11 flex-1 rounded-md border border-neutral-800 bg-black px-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-neutral-600"
        />
        <button
          type="submit"
          className="h-11 rounded-md border border-neutral-700 bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Search
        </button>
      </form>

      {!query ? (
        <div className={sectionCard}>
          <p className="text-sm text-neutral-400">Enter a term to run internal search.</p>
        </div>
      ) : null}

      {loading ? (
        <div className={sectionCard}>
          <p className="text-sm text-neutral-300">Searching for "{query}"...</p>
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
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">Users</h2>
            <ul className="mt-3 space-y-2 text-sm text-neutral-200">
              {results.users.length ? (
                results.users.map((item) => (
                  <li key={item.user_id} className="rounded border border-neutral-800 bg-black px-3 py-2">
                    <p className="font-medium text-white">{item.email}</p>
                    <p className="text-xs text-neutral-400">{item.name ?? "-"}</p>
                  </li>
                ))
              ) : (
                <li className="text-neutral-500">No users found</li>
              )}
            </ul>
          </article>

          <article className={sectionCard}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">Projects</h2>
            <ul className="mt-3 space-y-2 text-sm text-neutral-200">
              {results.projects.length ? (
                results.projects.map((item) => (
                  <li key={item.project_id} className="rounded border border-neutral-800 bg-black px-3 py-2">
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-xs text-neutral-500">{item.project_id}</p>
                  </li>
                ))
              ) : (
                <li className="text-neutral-500">No projects found</li>
              )}
            </ul>
          </article>

          <article className={sectionCard}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">Campaigns</h2>
            <ul className="mt-3 space-y-2 text-sm text-neutral-200">
              {results.campaigns.length ? (
                results.campaigns.map((item) => (
                  <li key={item.campaign_id} className="rounded border border-neutral-800 bg-black px-3 py-2">
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-xs text-neutral-400">Status: {item.status}</p>
                  </li>
                ))
              ) : (
                <li className="text-neutral-500">No campaigns found</li>
              )}
            </ul>
          </article>

          <article className={sectionCard}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">Failures</h2>
            <ul className="mt-3 space-y-2 text-sm text-neutral-200">
              {results.failures.length ? (
                results.failures.map((item) => (
                  <li key={item.failure_id} className="rounded border border-neutral-800 bg-black px-3 py-2">
                    <p className="font-medium text-white">{item.failure_type}</p>
                    <p className="text-xs text-neutral-300">{item.description}</p>
                  </li>
                ))
              ) : (
                <li className="text-neutral-500">No failures found</li>
              )}
            </ul>
          </article>
        </div>
      ) : null}
    </section>
  );
}
