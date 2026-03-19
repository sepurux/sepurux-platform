"use client";

import { useEffect, useState } from "react";

import {
  ApiError,
  api,
  type InternalAlertItem,
  type InternalAlertNotificationResponse,
} from "@/lib/api";

export function InternalAlertsView() {
  const [alerts, setAlerts] = useState<InternalAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationResult, setNotificationResult] =
    useState<InternalAlertNotificationResponse | null>(null);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await api.listInternalAlerts();
        if (cancelled) return;
        setAlerts(payload);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Failed to load alerts");
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

  async function handleNotify() {
    setNotifying(true);
    try {
      const payload = await api.notifyInternalAlerts();
      setNotificationResult(payload);
      setError(null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Failed to dispatch alerts");
      }
    } finally {
      setNotifying(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">High failure rate, campaign failures, and system errors.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleNotify();
          }}
          disabled={notifying}
          className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {notifying ? "Dispatching..." : "Send Slack + Email"}
        </button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading alerts...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {alerts.length ? (
            alerts.map((alert, index) => (
              <article
                key={`${alert.alert_type}-${index}`}
                className="rounded-lg border border-border/70 bg-card/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                    {alert.alert_type.replaceAll("_", " ")}
                  </p>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                      alert.severity === "critical"
                        ? "bg-red-900/40 text-red-200"
                        : "bg-amber-900/40 text-amber-200"
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground">{alert.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Metric: {alert.metric} ({alert.value})
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
              No active alerts.
            </div>
          )}
        </div>
      ) : null}

      {notificationResult ? (
        <div className="rounded-lg border border-border/70 bg-card/70 p-4">
          <p className="text-sm font-medium text-foreground">
            Notifications processed for {notificationResult.alerts_count} alerts
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {notificationResult.notifications.map((item) => (
              <li key={item.channel}>
                {item.channel}: {item.delivered ? "delivered" : `not delivered (${item.detail ?? "error"})`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
