"use client";

import { useEffect, useState } from "react";

import { ApiError, api, type InternalAuditLogEntry } from "@/lib/api";

export function InternalAuditLogsView() {
  const [logs, setLogs] = useState<InternalAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const records = await api.listInternalAuditLogs({ limit: 100 });
        if (cancelled) return;
        setLogs(records);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Failed to load audit logs");
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

  return (
    <section className="mx-auto w-full max-w-[88rem] space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold text-primary">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Internal action history across user, admin, and system activity.</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading logs...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card/70">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-background/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.length ? (
                logs.map((record) => (
                  <tr key={record.id} className="border-t border-border/70 align-top text-muted-foreground">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(record.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{record.action}</td>
                    <td className="px-4 py-3">{record.actor}</td>
                    <td className="px-4 py-3 text-muted-foreground">{record.entity}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <pre className="whitespace-pre-wrap break-words">{JSON.stringify(record.metadata)}</pre>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No audit logs available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
