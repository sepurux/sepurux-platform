"use client";

import { useEffect, useState } from "react";
import { RefreshCcw, ShieldCheck, Zap, BarChart3, CreditCard } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api, type CreditWalletMetadata, type ProjectReliabilitySummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_GRID = "#1E2936";
const CHART_AXIS = "#94A3B8";
const TOOLTIP_BG = "#121821";
const TOOLTIP_BORDER = "#1E2936";
const COLOR_HEALTHY = "#00e5cc";
const COLOR_WARNING = "#f59e0b";
const COLOR_CRITICAL = "#ef4444";
const COLOR_MUTED = "#1E2936";

const BAR_COLORS = [
  "#00e5cc",
  "#7c3aed",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#f97316",
  "#8b5cf6",
];

type ReliabilityData = {
  summary: ProjectReliabilitySummary;
  wallet: CreditWalletMetadata | null;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ReliabilityData };

function scoreColor(status: "healthy" | "warning" | "critical") {
  if (status === "critical") return COLOR_CRITICAL;
  if (status === "warning") return COLOR_WARNING;
  return COLOR_HEALTHY;
}

function ReliabilityGauge({ score, status }: { score: number; status: "healthy" | "warning" | "critical" }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = scoreColor(status);

  // Build a simple arc gauge using SVG
  const cx = 80;
  const cy = 80;
  const r = 60;
  const startAngle = -210;
  const totalDegrees = 240;
  const fillDegrees = (clampedScore / 100) * totalDegrees;

  function polarToXY(deg: number, radius: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arcPath(startDeg: number, endDeg: number, radius: number) {
    const start = polarToXY(startDeg, radius);
    const end = polarToXY(endDeg, radius);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="160" height="130" viewBox="0 0 160 130">
        {/* Track */}
        <path
          d={arcPath(startAngle, startAngle + totalDegrees, r)}
          fill="none"
          stroke={COLOR_MUTED}
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Fill */}
        {fillDegrees > 0 && (
          <path
            d={arcPath(startAngle, startAngle + fillDegrees, r)}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}
        {/* Score label */}
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="28" fontWeight="700" fill={color}>
          {Math.round(clampedScore)}
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="11" fill={CHART_AXIS}>
          / 100
        </text>
      </svg>
      <span
        className={cn(
          "rounded-full px-3 py-0.5 text-xs font-semibold capitalize",
          status === "healthy" && "bg-emerald-500/10 text-emerald-400",
          status === "warning" && "bg-amber-500/10 text-amber-400",
          status === "critical" && "bg-red-500/10 text-red-400"
        )}
      >
        {status}
      </span>
    </div>
  );
}

function KpiStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function FailureBreakdownChart({ breakdown }: { breakdown: Array<{ type: string; count: number }> }) {
  if (breakdown.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No failures recorded
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={breakdown} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis
          type="number"
          tick={{ fill: CHART_AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: CHART_GRID }}
        />
        <YAxis
          type="category"
          dataKey="type"
          width={120}
          tick={{ fill: CHART_AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}`, borderRadius: 6 }}
          labelStyle={{ color: "#e2e8f0", fontSize: 12 }}
          itemStyle={{ color: "#e2e8f0", fontSize: 12 }}
          cursor={{ fill: CHART_GRID }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {breakdown.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CreditsUsageChart({
  creditsUsed,
  wallet,
}: {
  creditsUsed: number;
  wallet: CreditWalletMetadata | null;
}) {
  const monthlyCredits = wallet?.monthly_credits ?? 0;
  const remaining = Math.max(0, monthlyCredits - creditsUsed);
  const hasData = monthlyCredits > 0;

  const pieData = hasData
    ? [
        { name: "Used", value: Math.min(creditsUsed, monthlyCredits) },
        { name: "Remaining", value: remaining },
      ]
    : [{ name: "No plan data", value: 1 }];

  const pct = hasData ? Math.round((creditsUsed / monthlyCredits) * 100) : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={COLOR_HEALTHY} />
            <Cell fill={COLOR_MUTED} />
          </Pie>
          <Tooltip
            contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}`, borderRadius: 6 }}
            labelStyle={{ color: "#e2e8f0", fontSize: 12 }}
            itemStyle={{ color: "#e2e8f0", fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex gap-6 text-sm">
        <div className="flex flex-col items-center">
          <span className="font-semibold text-foreground">{creditsUsed}</span>
          <span className="text-xs text-muted-foreground">Used</span>
        </div>
        {hasData && (
          <>
            <div className="flex flex-col items-center">
              <span className="font-semibold text-foreground">{remaining}</span>
              <span className="text-xs text-muted-foreground">Remaining</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-semibold text-foreground">{pct}%</span>
              <span className="text-xs text-muted-foreground">of monthly</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReliabilityPanels({ data }: { data: ReliabilityData }) {
  const { summary, wallet } = data;

  return (
    <div className="space-y-6">
      {/* Top row: gauge + KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="md:col-span-1 flex flex-col items-center justify-center py-4">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Agent Reliability Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReliabilityGauge score={summary.reliability_score} status={summary.status} />
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-center px-6 py-6 gap-6">
          <KpiStat label="Campaigns Run" value={summary.campaigns_run} icon={BarChart3} />
          <KpiStat
            label="Failure Categories"
            value={summary.failure_breakdown.length}
            icon={Zap}
          />
        </Card>

        <Card className="md:col-span-2 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" />
              Credits Used This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreditsUsageChart creditsUsed={summary.credits_used} wallet={wallet} />
          </CardContent>
        </Card>
      </div>

      {/* Failure breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Failure Breakdown by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FailureBreakdownChart breakdown={summary.failure_breakdown} />
        </CardContent>
      </Card>
    </div>
  );
}

function ReliabilityLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-52 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function ReliabilityDashboard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const [summary, wallet] = await Promise.all([
          api.getProjectReliability(),
          api.getBillingCredits().catch(() => null),
        ]);
        if (!cancelled) {
          setState({ status: "ready", data: { summary, wallet } });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Failed to load reliability data",
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Project-wide reliability score, failure taxonomy, and credit consumption.
        </p>
        <Button variant="outline" size="sm" onClick={() => setReloadNonce((n) => n + 1)}>
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {state.status === "loading" ? (
        <ReliabilityLoading />
      ) : state.status === "error" ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {state.message}
        </div>
      ) : (
        <ReliabilityPanels data={state.data} />
      )}
    </div>
  );
}
