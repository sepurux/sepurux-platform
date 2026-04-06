"use client";

import { useEffect, useMemo, useState } from "react";

import { ApiError, api, type InternalWaitlistEntry } from "@/lib/api";

const statusOptions = ["pending", "contacted", "approved", "rejected"] as const;

type StatusValue = (typeof statusOptions)[number];

export function InternalWaitlistView() {
  const [entries, setEntries] = useState<InternalWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | StatusValue>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, StatusValue>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  async function loadEntries(nextStatus = statusFilter) {
    try {
      const payload = await api.listInternalWaitlist({
        status: nextStatus || undefined,
        limit: 200,
      });
      setEntries(payload);
      setStatusDrafts(
        Object.fromEntries(payload.map((entry) => [entry.waitlist_entry_id, entry.status as StatusValue]))
      );
      setNoteDrafts(
        Object.fromEntries(payload.map((entry) => [entry.waitlist_entry_id, entry.notes ?? ""]))
      );
      setError(null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Failed to load waitlist entries");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEntries("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    return statusOptions.reduce<Record<StatusValue, number>>(
      (acc, status) => {
        acc[status] = entries.filter((entry) => entry.status === status).length;
        return acc;
      },
      { pending: 0, contacted: 0, approved: 0, rejected: 0 }
    );
  }, [entries]);

  async function saveEntry(waitlistEntryId: string) {
    setSavingId(waitlistEntryId);
    try {
      const updated = await api.updateInternalWaitlist(waitlistEntryId, {
        status: statusDrafts[waitlistEntryId],
        notes: noteDrafts[waitlistEntryId] || null,
      });
      setEntries((current) =>
        current.map((entry) => (entry.waitlist_entry_id === waitlistEntryId ? updated : entry))
      );
      setError(null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Failed to update waitlist entry");
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[88rem] space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Waitlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review early-access demand, track outreach, and approve the next cohort.
          </p>
        </div>
        <label className="text-sm text-muted-foreground">
          Status
          <select
            value={statusFilter}
            onChange={(event) => {
              const nextValue = event.target.value as "" | StatusValue;
              setStatusFilter(nextValue);
              setLoading(true);
              void loadEntries(nextValue);
            }}
            className="mt-1 h-10 min-w-40 rounded-md border border-border/70 bg-background px-3 text-sm text-foreground"
          >
            <option value="">All</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statusOptions.map((status) => (
          <article key={status} className="rounded-lg border border-border/70 bg-card/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{status}</p>
            <p className="mt-2 text-3xl font-semibold text-primary">{counts[status]}</p>
          </article>
        ))}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading waitlist…</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border/70 bg-card/70">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-background/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Reviewed</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.length ? (
              entries.map((entry) => (
                <tr key={entry.waitlist_entry_id} className="border-t border-border/70 align-top text-muted-foreground">
                  <td className="px-4 py-3 text-xs">{new Date(entry.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-foreground">{entry.email}</td>
                  <td className="px-4 py-3">{entry.role}</td>
                  <td className="px-4 py-3">{entry.company ?? "-"}</td>
                  <td className="px-4 py-3">{entry.source}</td>
                  <td className="px-4 py-3">
                    <select
                      value={statusDrafts[entry.waitlist_entry_id] ?? (entry.status as StatusValue)}
                      onChange={(event) =>
                        setStatusDrafts((current) => ({
                          ...current,
                          [entry.waitlist_entry_id]: event.target.value as StatusValue,
                        }))
                      }
                      className="h-9 w-full rounded border border-border/70 bg-background px-3 text-sm text-foreground"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      value={noteDrafts[entry.waitlist_entry_id] ?? ""}
                      onChange={(event) =>
                        setNoteDrafts((current) => ({
                          ...current,
                          [entry.waitlist_entry_id]: event.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded border border-border/70 bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="Reached out, strong use case, follow-up date…"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {entry.reviewed_by ? (
                      <>
                        <p>{entry.reviewed_by}</p>
                        <p className="mt-1">{entry.reviewed_at ? new Date(entry.reviewed_at).toLocaleString() : "-"}</p>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={savingId === entry.waitlist_entry_id}
                      onClick={() => void saveEntry(entry.waitlist_entry_id)}
                      className="rounded border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
                    >
                      {savingId === entry.waitlist_entry_id ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No waitlist entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
