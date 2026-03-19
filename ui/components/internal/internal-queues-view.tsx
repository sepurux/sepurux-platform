"use client";

import { useEffect, useState } from "react";

import {
  ApiError,
  api,
  type InternalQueueActionResponse,
  type InternalQueueJobEntry,
  type InternalQueueOverview,
} from "@/lib/api";

export function InternalQueuesView() {
  const [data, setData] = useState<InternalQueueOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<InternalQueueActionResponse | null>(null);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);

  async function loadQueues() {
    try {
      const payload = await api.getInternalQueues();
      setData(payload);
      setError(null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Failed to load queue status");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueues();
  }, []);

  async function runJobAction(jobId: string, action: "retry" | "cancel") {
    setProcessingJobId(jobId);
    try {
      const response =
        action === "retry"
          ? await api.retryInternalQueueJob(jobId)
          : await api.cancelInternalQueueJob(jobId);
      setActionResult(response);
      await loadQueues();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Queue action failed");
      }
    } finally {
      setProcessingJobId(null);
    }
  }

  function renderRows(jobs: InternalQueueJobEntry[], includeActions: boolean) {
    if (!jobs.length) {
      return (
        <tr>
          <td colSpan={includeActions ? 6 : 5} className="px-4 py-5 text-center text-neutral-500">
            No jobs
          </td>
        </tr>
      );
    }

    return jobs.map((job) => (
      <tr key={job.job_id} className="border-t border-neutral-800 text-neutral-200">
        <td className="px-4 py-3 text-xs text-neutral-400">{job.job_id}</td>
        <td className="px-4 py-3">{job.status}</td>
        <td className="px-4 py-3">{job.queue}</td>
        <td className="px-4 py-3">{job.description ?? "-"}</td>
        <td className="px-4 py-3 text-xs text-neutral-400">
          {job.enqueued_at ? new Date(job.enqueued_at).toLocaleString() : "-"}
        </td>
        {includeActions ? (
          <td className="px-4 py-3">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={processingJobId === job.job_id}
                onClick={() => {
                  void runJobAction(job.job_id, "retry");
                }}
                className="rounded border border-neutral-700 px-2 py-1 text-xs text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                Retry
              </button>
              <button
                type="button"
                disabled={processingJobId === job.job_id}
                onClick={() => {
                  void runJobAction(job.job_id, "cancel");
                }}
                className="rounded border border-neutral-700 px-2 py-1 text-xs text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </td>
        ) : null}
      </tr>
    ));
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-semibold text-white">Queues</h1>
        <p className="mt-1 text-sm text-neutral-400">Monitor running jobs, failed jobs, backlog, and worker health.</p>
      </div>

      {loading ? <p className="text-sm text-neutral-400">Loading queue state...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <article className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Jobs Running</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data.jobs_running}</p>
            </article>
            <article className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Jobs Failed</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data.jobs_failed}</p>
            </article>
            <article className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Queue Backlog</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data.queue_backlog}</p>
            </article>
            <article className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Worker Status</p>
              <p className="mt-2 text-2xl font-semibold text-white capitalize">{data.worker_status}</p>
            </article>
          </div>

          {actionResult ? (
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-300">
              {actionResult.action} {actionResult.job_id}: {actionResult.success ? "success" : "failed"}
              {actionResult.detail ? ` (${actionResult.detail})` : ""}
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
              <p className="border-b border-neutral-800 px-4 py-3 text-xs uppercase tracking-[0.14em] text-neutral-400">
                Running Jobs
              </p>
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-black/50 text-xs uppercase tracking-[0.14em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-2">Job ID</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Queue</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Enqueued</th>
                  </tr>
                </thead>
                <tbody>{renderRows(data.running_jobs, false)}</tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
              <p className="border-b border-neutral-800 px-4 py-3 text-xs uppercase tracking-[0.14em] text-neutral-400">
                Failed Jobs
              </p>
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-black/50 text-xs uppercase tracking-[0.14em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-2">Job ID</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Queue</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Enqueued</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>{renderRows(data.failed_jobs, true)}</tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
