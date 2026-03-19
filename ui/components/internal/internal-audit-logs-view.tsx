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
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-semibold text-white">Audit Logs</h1>
        <p className="mt-1 text-sm text-neutral-400">Internal action history across user, admin, and system activity.</p>
      </div>

      {loading ? <p className="text-sm text-neutral-400">Loading logs...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-black/60 text-xs uppercase tracking-[0.14em] text-neutral-400">
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
                  <tr key={record.id} className="border-t border-neutral-800 align-top text-neutral-200">
                    <td className="px-4 py-3 text-xs text-neutral-400">
                      {new Date(record.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{record.action}</td>
                    <td className="px-4 py-3">{record.actor}</td>
                    <td className="px-4 py-3 text-neutral-300">{record.entity}</td>
                    <td className="px-4 py-3 text-xs text-neutral-400">
                      <pre className="whitespace-pre-wrap break-words">{JSON.stringify(record.metadata)}</pre>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
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
