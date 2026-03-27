"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Flame,
  RefreshCcw,
  ShieldCheck,
  TestTube2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api, type ReplayAttemptListItem, type RunMetadata, type RunStats, type ToolFragilityResponse } from "@/lib/api";
import { formatPercent, formatRelativeDate, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CounterfactualInspector } from "@/components/dashboard/counterfactual-inspector";
import { ReliabilityDashboard } from "@/components/dashboard/reliability-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DashboardData = {
  runs: RunMetadata[];
  runStatsById: Record<string, RunStats>;
  failedAttemptsByRunId: Record<string, ReplayAttemptListItem[]>;
  fragility: ToolFragilityResponse;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardData };

const CHART_LINE = "#00e5cc";
const CHART_GRID = "#1E2936";
const CHART_AXIS = "#94A3B8";
const TOOLTIP_BG = "#121821";
const TOOLTIP_BORDER = "#1E2936";

export function DashboardView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const runs = await api.listRuns(40);
        const sampledRuns = runs.slice(0, 8);

        const [fragility, statsResults, failedAttemptsResults] = await Promise.all([
          api.getToolsFragility(7, 8),
          Promise.allSettled(sampledRuns.map((run) => api.getRunStats(run.run_id))),
          Promise.allSettled(
            sampledRuns.map((run) => api.listRunAttempts(run.run_id, { limit: 100, offset: 0, result: "failed" }))
          )
        ]);

        const runStatsById: Record<string, RunStats> = {};
        statsResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            runStatsById[sampledRuns[index].run_id] = result.value;
          }
        });

        const failedAttemptsByRunId: Record<string, ReplayAttemptListItem[]> = {};
        failedAttemptsResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            failedAttemptsByRunId[sampledRuns[index].run_id] = result.value;
          }
        });

        if (!cancelled) {
          setState({
            status: "ready",
            data: {
              runs,
              runStatsById,
              failedAttemptsByRunId,
              fragility,
            },
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Failed to load dashboard",
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reliability trends, failure taxonomy, and fragile tools across recent runs.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setReloadNonce((n) => n + 1)}>
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {state.status === "loading" ? (
        <DashboardLoading />
      ) : state.status === "error" ? (
        <DashboardError message={state.message} onRetry={() => setReloadNonce((n) => n + 1)} />
      ) : (
        <DashboardPanels data={state.data} />
      )}
    </div>
  );
}

function DashboardPanels({ data }: { data: DashboardData }) {
  const dashboardRuns = data.runs.slice(0, 12);
  const kpis = useMemo(() => computeKpis(dashboardRuns, data.runStatsById), [dashboardRuns, data.runStatsById]);
  const passRateTrend = useMemo(
    () => buildPassRateTrend(dashboardRuns, data.runStatsById),
    [dashboardRuns, data.runStatsById]
  );
  const heatmap = useMemo(
    () => buildFailureTaxonomyHeatmap(data.failedAttemptsByRunId),
    [data.failedAttemptsByRunId]
  );
  const lethalMutations = useMemo(
    () => buildDashboardLethalMutations(data.runStatsById),
    [data.runStatsById]
  );
  const statusMix = useMemo(() => buildRunStatusMix(dashboardRuns), [dashboardRuns]);
  const failureReasons = useMemo(
    () => buildFailureReasonSeries(data.runStatsById),
    [data.runStatsById]
  );
  const failureStepSeries = useMemo(
    () => buildFirstFailureStepSeries(data.runStatsById),
    [data.runStatsById]
  );
  const attemptVolumeSeries = useMemo(
    () => buildAttemptVolumeSeries(dashboardRuns, data.runStatsById),
    [dashboardRuns, data.runStatsById]
  );
  const mostRecentRun = dashboardRuns[0];
  const recentRunInsights = mostRecentRun ? (data.runStatsById[mostRecentRun.run_id]?.insights ?? []) : [];

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="inline-flex h-auto rounded-full border-0 bg-muted/70 p-1">
        <TabsTrigger value="overview" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Overview</TabsTrigger>
        <TabsTrigger value="taxonomy" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Taxonomy</TabsTrigger>
        <TabsTrigger value="diagnostics" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Diagnostics</TabsTrigger>
        <TabsTrigger value="reliability" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Reliability</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Reliability Score"
            value={kpis.reliabilityScore === null ? "--" : `${kpis.reliabilityScore}`}
            subtitle="Weighted from recent run pass rates"
            icon={ShieldCheck}
            accent="success"
          />
          <KpiCard
            title="Tests Run"
            value={String(kpis.testsRun)}
            subtitle="Replay attempts across recent runs"
            icon={TestTube2}
            accent="neutral"
          />
          <KpiCard
            title="Failed Attempts"
            value={String(kpis.failedAttempts)}
            subtitle="Failed replays in current dashboard sample"
            icon={Flame}
            accent="danger"
          />
          <KpiCard
            title="Avg Duration"
            value={kpis.avgDurationLabel}
            subtitle="Estimated from attempt count in current window"
            icon={Clock3}
            accent="info"
          />
        </div>

        <div className="grid gap-4 grid-cols-[1fr_360px]">
          <RecentRunsCard runs={dashboardRuns} statsById={data.runStatsById} />
          <PassRateTrendCard series={passRateTrend} />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <TopFragileToolsCard fragility={data.fragility} />
          <RunStatusMixCard series={statusMix} />
          <FailureReasonsCard reasons={failureReasons} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <MostLethalMutationsCard mutations={lethalMutations} />
          <FirstFailureStepCard series={failureStepSeries} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <RecommendedFixesCard
            runId={mostRecentRun?.run_id ?? null}
            insights={recentRunInsights.slice(0, 3)}
          />
          <AttemptVolumeCard series={attemptVolumeSeries} />
        </div>
      </TabsContent>

      <TabsContent value="taxonomy" className="space-y-6">
        <FailureTaxonomyHeatmap heatmap={heatmap} />
      </TabsContent>

      <TabsContent value="diagnostics" className="space-y-6">
        <CounterfactualInspector runs={dashboardRuns} failedAttemptsByRunId={data.failedAttemptsByRunId} />
      </TabsContent>

      <TabsContent value="reliability" className="space-y-6">
        <ReliabilityDashboard />
      </TabsContent>
    </Tabs>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "neutral",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "neutral" | "success" | "danger" | "info";
}) {
  const iconClasses: Record<string, string> = {
    neutral: "text-blue-400 border-blue-400/20 bg-blue-400/10",
    success: "text-teal border-teal/20 bg-teal/10",
    danger: "text-rose-400 border-rose-400/20 bg-rose-400/10",
    info: "text-purple-400 border-purple-400/20 bg-purple-400/10",
  };

  return (
    <Card className="overflow-hidden rounded-2xl bg-muted/30">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
            <p className="mt-2 text-5xl font-semibold leading-none tracking-tight text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={cn("grid h-10 w-10 place-items-center rounded-md border", iconClasses[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentRunsCard({ runs, statsById }: { runs: RunMetadata[]; statsById: Record<string, RunStats> }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Runs</CardTitle>
        <CardDescription>Latest queued/executed runs from the API.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Pass Rate</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No runs found yet.
                </TableCell>
              </TableRow>
            ) : (
              runs.slice(0, 6).map((run) => {
                const stats = statsById[run.run_id];
                const summary = run.summary as Record<string, unknown> | null;
                const attemptCount = typeof summary?.attempt_count === "number" ? summary.attempt_count : null;
                const passedCount = typeof summary?.passed_count === "number" ? summary.passed_count : null;
                const derivedPassRate =
                  stats?.attempts.pass_rate ??
                  (attemptCount && passedCount !== null && attemptCount > 0 ? Number((passedCount / attemptCount).toFixed(4)) : null);

                return (
                  <TableRow key={run.run_id}>
                    <TableCell className="font-medium text-foreground">{shortId(run.run_id, 10)}</TableCell>
                    <TableCell className="text-muted-foreground">{shortId(run.campaign_id, 8)}</TableCell>
                    <TableCell>
                      <StatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {derivedPassRate === null ? "--" : formatPercent(derivedPassRate, 0)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatRelativeDate(run.created_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PassRateTrendCard({ series }: { series: Array<{ name: string; passRate: number }> }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-info" /> Pass Rate Trend
        </CardTitle>
        <CardDescription>Recent run pass rate trend (from /runs/{`{id}`}/stats).</CardDescription>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <EmptyPanelMessage>No stats available yet.</EmptyPanelMessage>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="name" tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: CHART_AXIS, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: TOOLTIP_BG,
                    border: `1px solid ${TOOLTIP_BORDER}`,
                    borderRadius: 12,
                    color: "#e5e7eb",
                  }}
                  formatter={(value: number) => `${value.toFixed(0)}%`}
                />
                <Line type="monotone" dataKey="passRate" stroke={CHART_LINE} strokeWidth={2.5} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopFragileToolsCard({ fragility }: { fragility: ToolFragilityResponse }) {
  const chartData = fragility.tools.slice(0, 6).map((tool) => ({
    tool: tool.tool.split(".").slice(-1)[0] || tool.tool,
    failures: tool.failures,
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Fragile Tools</CardTitle>
        <CardDescription>
          Failing tools in the last {fragility.window_days} days ({fragility.attempts_definition}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          {fragility.tools.slice(0, 5).map((tool) => (
            <div key={tool.tool} className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{tool.tool}</p>
                <p className="text-xs text-muted-foreground">
                  {tool.top_reasons[0]?.reason ?? "unknown"} • {formatPercent(tool.failure_rate, 1)} failure rate
                </p>
              </div>
              <Badge variant="danger">{tool.failures} failures</Badge>
            </div>
          ))}
        </div>

        <div className="h-[220px] rounded-md border border-border/60 bg-card/40 p-2">
          {chartData.length === 0 ? (
            <EmptyPanelMessage>No fragile tools yet.</EmptyPanelMessage>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="tool" tick={{ fill: CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{
                    background: TOOLTIP_BG,
                    border: `1px solid ${TOOLTIP_BORDER}`,
                    borderRadius: 12,
                    color: "#e5e7eb",
                  }}
                />
                <Bar dataKey="failures" radius={[6, 6, 0, 0]} fill={CHART_LINE} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RunStatusMixCard({
  series,
}: {
  series: Array<{ status: string; count: number }>;
}) {
  const total = series.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Run Status Mix</CardTitle>
        <CardDescription>Distribution of recent run statuses in the dashboard sample.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[220px] rounded-md border border-border/60 bg-card/40 p-2">
          {series.length === 0 ? (
            <EmptyPanelMessage>No runs available yet.</EmptyPanelMessage>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={series}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={84}
                  paddingAngle={2}
                >
                  {series.map((entry, index) => (
                    <Cell key={entry.status} fill={statusColor(entry.status, index)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: TOOLTIP_BG,
                    border: `1px solid ${TOOLTIP_BORDER}`,
                    borderRadius: 12,
                    color: "#e5e7eb",
                  }}
                  formatter={(value: number) => `${value} runs`}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        {series.length > 0 ? (
          <div className="space-y-2">
            {series.map((item, index) => {
              const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.status} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: statusColor(item.status, index) }}
                    />
                    <span>{item.status}</span>
                  </div>
                  <span className="text-foreground">
                    {item.count} ({percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FailureReasonsCard({ reasons }: { reasons: Array<{ reason: string; count: number }> }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Failure Reasons</CardTitle>
        <CardDescription>Aggregated across run stats in the dashboard sample.</CardDescription>
      </CardHeader>
      <CardContent>
        {reasons.length === 0 ? (
          <EmptyPanelMessage>No failure reason data yet.</EmptyPanelMessage>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasons} layout="vertical" margin={{ top: 8, right: 10, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                <XAxis type="number" tick={{ fill: CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="reason"
                  tick={{ fill: CHART_AXIS, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={94}
                />
                <Tooltip
                  contentStyle={{
                    background: TOOLTIP_BG,
                    border: `1px solid ${TOOLTIP_BORDER}`,
                    borderRadius: 12,
                    color: "#e5e7eb",
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} fill={CHART_LINE} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FirstFailureStepCard({
  series,
}: {
  series: Array<{ step: string; failures: number }>;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>First-Failure Step Distribution</CardTitle>
        <CardDescription>Where failures happen first in event timelines.</CardDescription>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <EmptyPanelMessage>No failure step data available yet.</EmptyPanelMessage>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="step" tick={{ fill: CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{
                    background: TOOLTIP_BG,
                    border: `1px solid ${TOOLTIP_BORDER}`,
                    borderRadius: 12,
                    color: "#e5e7eb",
                  }}
                  formatter={(value: number) => `${value} failures`}
                />
                <Bar dataKey="failures" radius={[6, 6, 0, 0]} fill={CHART_LINE} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttemptVolumeCard({
  series,
}: {
  series: Array<{ run: string; attempts: number; failed: number }>;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Attempt Volume by Run</CardTitle>
        <CardDescription>Recent run volume split by failed attempts.</CardDescription>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <EmptyPanelMessage>No attempt metrics available yet.</EmptyPanelMessage>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="run" tick={{ fill: CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{
                    background: TOOLTIP_BG,
                    border: `1px solid ${TOOLTIP_BORDER}`,
                    borderRadius: 12,
                    color: "#e5e7eb",
                  }}
                />
                <Bar dataKey="attempts" radius={[6, 6, 0, 0]} fill={CHART_LINE} />
                <Bar dataKey="failed" radius={[6, 6, 0, 0]} fill="#f43f5e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FailureTaxonomyHeatmap({ heatmap }: { heatmap: ReturnType<typeof buildFailureTaxonomyHeatmap> }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Failure Taxonomy Heatmap</CardTitle>
        <CardDescription>
          Placeholder taxonomy built from failed attempts across recent runs (tool category × failure reason).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {heatmap.categories.length === 0 || heatmap.faultTypes.length === 0 ? (
          <EmptyPanelMessage>No failed attempts available to build a taxonomy heatmap yet.</EmptyPanelMessage>
        ) : (
          <div className="overflow-auto">
            <div
              className="grid min-w-[640px] gap-2"
              style={{ gridTemplateColumns: `170px repeat(${heatmap.faultTypes.length}, minmax(90px, 1fr))` }}
            >
              <div className="p-2 text-xs uppercase tracking-wide text-muted-foreground">Category</div>
              {heatmap.faultTypes.map((fault) => (
                <div key={fault} className="p-2 text-center text-xs font-medium text-muted-foreground">
                  {fault}
                </div>
              ))}
              {heatmap.categories.map((category) => (
                <HeatmapRow key={category} category={category} heatmap={heatmap} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MostLethalMutationsCard({
  mutations,
}: {
  mutations: Array<{
    mutation_id: string;
    failures: number;
    attempts_hit: number;
    failure_rate_when_hit: number;
    top_tools: Array<{ tool: string; count: number }>;
  }>;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Most Lethal Mutations</CardTitle>
        <CardDescription>
          Top mutation_trace contributors to failures across the current dashboard sample.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mutations.length === 0 ? (
          <EmptyPanelMessage>Run more attempts to compute lethal mutations.</EmptyPanelMessage>
        ) : (
          <div className="space-y-2">
            {mutations.slice(0, 5).map((item) => (
              <div
                key={item.mutation_id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/15 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground" title={item.mutation_id}>
                    {item.mutation_id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.failures}/{item.attempts_hit} •{" "}
                    {formatPercent(item.failure_rate_when_hit, 1)}
                  </p>
                </div>
                <Badge variant="outline">{item.top_tools[0]?.tool ?? "unknown"}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendedFixesCard({
  runId,
  insights,
}: {
  runId: string | null;
  insights: RunStats["insights"];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recommended Fixes</CardTitle>
        <CardDescription>
          Top 3 insights from the most recent run{runId ? ` (${shortId(runId, 8)})` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <EmptyPanelMessage>Run more attempts to generate recommended fixes.</EmptyPanelMessage>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="rounded-md border border-border/60 bg-muted/15 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground" title={insight.title}>
                      {insight.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{insight.recommendation}</p>
                  </div>
                  <Badge
                    variant={
                      insight.confidence >= 0.75
                        ? "success"
                        : insight.confidence >= 0.6
                          ? "warning"
                          : "outline"
                    }
                  >
                    {formatPercent(insight.confidence, 0)}
                  </Badge>
                </div>
                <details className="mt-2 rounded border border-border/50 bg-background/40 p-2">
                  <summary className="cursor-pointer text-xs font-medium text-foreground">
                    View evidence
                  </summary>
                  <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                    <p>
                      Tools:{" "}
                      {insight.evidence.top_tools.length > 0
                        ? insight.evidence.top_tools
                            .map((item) => `${item.tool} (${item.count})`)
                            .join(", ")
                        : "--"}
                    </p>
                    <p>
                      Mutations:{" "}
                      {insight.evidence.top_mutations.length > 0
                        ? insight.evidence.top_mutations
                            .map((item) => `${item.mutation_id} (${item.count})`)
                            .join(", ")
                        : "--"}
                    </p>
                    <p>
                      Reasons:{" "}
                      {insight.evidence.top_reasons.length > 0
                        ? insight.evidence.top_reasons
                            .map((item) => `${item.reason} (${item.count})`)
                            .join(", ")
                        : "--"}
                    </p>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HeatmapRow({
  category,
  heatmap,
}: {
  category: string;
  heatmap: ReturnType<typeof buildFailureTaxonomyHeatmap>;
}) {
  return (
    <>
      <div className="flex items-center rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-sm font-medium text-foreground">
        {category}
      </div>
      {heatmap.faultTypes.map((fault) => {
        const count = heatmap.matrix[category]?.[fault] ?? 0;
        const intensity = heatmap.maxCount > 0 ? count / heatmap.maxCount : 0;
        return (
          <div
            key={`${category}:${fault}`}
            className="grid h-12 place-items-center rounded-md border border-border/50 text-xs font-semibold text-foreground"
            style={{
              backgroundColor: `rgba(56, 189, 248, ${0.06 + intensity * 0.42})`,
              boxShadow: intensity > 0 ? `inset 0 0 0 1px rgba(56,189,248,${0.08 + intensity * 0.35})` : undefined,
            }}
            title={`${category} × ${fault}: ${count}`}
          >
            {count > 0 ? count : "-"}
          </div>
        );
      })}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return <Badge variant="success">completed</Badge>;
  if (normalized === "failed") return <Badge variant="danger">failed</Badge>;
  if (normalized === "running") return <Badge variant="info">running</Badge>;
  if (normalized === "queued") return <Badge variant="neutral">queued</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

function statusColor(status: string, index: number) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "completed") return "#00e5cc";
  if (normalized === "failed") return "#EF4444";
  if (normalized === "running") return "#3B82F6";
  if (normalized === "queued") return "#94A3B8";
  const fallbackPalette = ["#60A5FA", "#F59E0B", "#A78BFA", "#22D3EE", "#94A3B8"];
  return fallbackPalette[index % fallbackPalette.length];
}

function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-28" />
              <Skeleton className="mt-2 h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardContent className="p-5"><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardContent className="p-5"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card><CardContent className="p-5"><Skeleton className="h-72 w-full" /></CardContent></Card>
        <Card><CardContent className="p-5"><Skeleton className="h-72 w-full" /></CardContent></Card>
        <Card><CardContent className="p-5"><Skeleton className="h-72 w-full" /></CardContent></Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardContent className="p-5"><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardContent className="p-5"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-rose-400/20">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md border border-rose-400/20 bg-rose-500/10 p-2 text-rose-300">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-foreground">Failed to load dashboard data</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyPanelMessage({ children }: { children: React.ReactNode }) {
  return <div className="grid h-full min-h-[120px] place-items-center text-sm text-muted-foreground">{children}</div>;
}

function computeKpis(runs: RunMetadata[], statsById: Record<string, RunStats>) {
  let testsRun = 0;
  let failedAttempts = 0;
  let weightedPassAccumulator = 0;
  let weightedAttemptAccumulator = 0;
  let estimatedDurationAccumulator = 0;
  let estimatedDurationSamples = 0;

  for (const run of runs.slice(0, 20)) {
    const stats = statsById[run.run_id];
    const summary = run.summary as Record<string, unknown> | null;
    const attemptCountFromSummary = typeof summary?.attempt_count === "number" ? summary.attempt_count : 0;
    const attemptCount = stats?.attempts.total ?? attemptCountFromSummary;
    const failedCount = stats?.attempts.failed ?? (typeof summary?.failed_count === "number" ? summary.failed_count : 0);
    const passRate = stats?.attempts.pass_rate;

    testsRun += attemptCount;
    failedAttempts += failedCount;

    if (typeof passRate === "number" && attemptCount > 0) {
      weightedPassAccumulator += passRate * attemptCount;
      weightedAttemptAccumulator += attemptCount;
    }

    if (attemptCount > 0) {
      estimatedDurationAccumulator += 220 + attemptCount * 185;
      estimatedDurationSamples += 1;
    }
  }

  const reliabilityScore =
    weightedAttemptAccumulator > 0
      ? Math.round((weightedPassAccumulator / weightedAttemptAccumulator) * 100)
      : null;

  const avgDurationMs = estimatedDurationSamples > 0 ? estimatedDurationAccumulator / estimatedDurationSamples : null;

  return {
    reliabilityScore,
    testsRun,
    failedAttempts,
    avgDurationLabel: avgDurationMs === null ? "--" : avgDurationMs >= 1000 ? `${(avgDurationMs / 1000).toFixed(2)}s` : `${Math.round(avgDurationMs)}ms`,
  };
}

function buildPassRateTrend(runs: RunMetadata[], statsById: Record<string, RunStats>) {
  return runs
    .slice(0, 10)
    .map((run) => {
      const stats = statsById[run.run_id];
      if (!stats) return null;
      return {
        name: shortId(run.run_id, 6),
        passRate: Number((stats.attempts.pass_rate * 100).toFixed(1)),
      };
    })
    .filter((value): value is { name: string; passRate: number } => value !== null)
    .reverse();
}

function buildFailureTaxonomyHeatmap(failedAttemptsByRunId: Record<string, ReplayAttemptListItem[]>) {
  const categoryCounts = new Map<string, number>();
  const faultCounts = new Map<string, number>();
  const matrix = new Map<string, Map<string, number>>();

  for (const attempts of Object.values(failedAttemptsByRunId)) {
    for (const attempt of attempts) {
      const category = (attempt.first_failure_tool ?? "unknown.tool").split(".")[0] || "unknown";
      const fault = attempt.failure_reason ?? "unknown";
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      faultCounts.set(fault, (faultCounts.get(fault) ?? 0) + 1);

      if (!matrix.has(category)) matrix.set(category, new Map());
      const row = matrix.get(category)!;
      row.set(fault, (row.get(fault) ?? 0) + 1);
    }
  }

  const categories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([category]) => category);
  const faultTypes = [...faultCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([fault]) => fault);

  const normalizedMatrix: Record<string, Record<string, number>> = {};
  let maxCount = 0;

  for (const category of categories) {
    normalizedMatrix[category] = {};
    const row = matrix.get(category);
    for (const fault of faultTypes) {
      const count = row?.get(fault) ?? 0;
      normalizedMatrix[category][fault] = count;
      if (count > maxCount) maxCount = count;
    }
  }

  return { categories, faultTypes, matrix: normalizedMatrix, maxCount };
}

function buildDashboardLethalMutations(statsById: Record<string, RunStats>) {
  const byMutation = new Map<
    string,
    {
      failures: number;
      attempts_hit: number;
      topTools: Map<string, number>;
      topReasons: Map<string, number>;
    }
  >();

  for (const stats of Object.values(statsById)) {
    for (const item of stats.most_lethal_mutations ?? []) {
      if (!byMutation.has(item.mutation_id)) {
        byMutation.set(item.mutation_id, {
          failures: 0,
          attempts_hit: 0,
          topTools: new Map(),
          topReasons: new Map(),
        });
      }
      const current = byMutation.get(item.mutation_id)!;
      current.failures += item.failures;
      current.attempts_hit += item.attempts_hit;

      for (const tool of item.top_tools) {
        current.topTools.set(tool.tool, (current.topTools.get(tool.tool) ?? 0) + tool.count);
      }
      for (const reason of item.top_reasons) {
        current.topReasons.set(
          reason.reason,
          (current.topReasons.get(reason.reason) ?? 0) + reason.count
        );
      }
    }
  }

  return [...byMutation.entries()]
    .map(([mutation_id, value]) => {
      const topTools = [...value.topTools.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([tool, count]) => ({ tool, count }));
      const topReasons = [...value.topReasons.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([reason, count]) => ({ reason, count }));
      const failureRate =
        value.attempts_hit > 0 ? Number((value.failures / value.attempts_hit).toFixed(4)) : 0;

      return {
        mutation_id,
        failures: value.failures,
        attempts_hit: value.attempts_hit,
        failure_rate_when_hit: failureRate,
        top_tools: topTools,
        top_reasons: topReasons,
      };
    })
    .sort(
      (a, b) =>
        b.failures - a.failures ||
        b.failure_rate_when_hit - a.failure_rate_when_hit ||
        b.attempts_hit - a.attempts_hit ||
        a.mutation_id.localeCompare(b.mutation_id)
    );
}

function buildRunStatusMix(runs: RunMetadata[]) {
  const byStatus = new Map<string, number>();
  for (const run of runs) {
    const status = run.status.trim().toLowerCase() || "unknown";
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
  }
  return [...byStatus.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
}

function buildFailureReasonSeries(statsById: Record<string, RunStats>) {
  const byReason = new Map<string, number>();
  for (const stats of Object.values(statsById)) {
    for (const item of stats.top_failure_reasons ?? []) {
      byReason.set(item.reason, (byReason.get(item.reason) ?? 0) + item.count);
    }
  }
  return [...byReason.entries()]
    .map(([reason, count]) => ({
      reason: reason.length > 18 ? `${reason.slice(0, 16)}...` : reason,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
    .slice(0, 6);
}

function buildFirstFailureStepSeries(statsById: Record<string, RunStats>) {
  const byStep = new Map<number, number>();
  for (const stats of Object.values(statsById)) {
    for (const item of stats.first_failure_step_distribution ?? []) {
      byStep.set(item.event_index, (byStep.get(item.event_index) ?? 0) + item.count);
    }
  }
  return [...byStep.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, 10)
    .map(([eventIndex, failures]) => ({ step: `#${eventIndex}`, failures }));
}

function buildAttemptVolumeSeries(runs: RunMetadata[], statsById: Record<string, RunStats>) {
  return runs
    .slice(0, 8)
    .map((run) => {
      const stats = statsById[run.run_id];
      const summary = run.summary as Record<string, unknown> | null;
      const attemptsFromSummary =
        typeof summary?.attempt_count === "number" ? summary.attempt_count : null;
      const failedFromSummary =
        typeof summary?.failed_count === "number" ? summary.failed_count : null;

      const attempts = stats?.attempts.total ?? attemptsFromSummary ?? 0;
      const failed = stats?.attempts.failed ?? failedFromSummary ?? 0;

      return {
        run: shortId(run.run_id, 6),
        attempts,
        failed,
      };
    })
    .filter((item) => item.attempts > 0)
    .reverse();
}
