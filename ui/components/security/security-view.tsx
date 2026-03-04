"use client";

import { useEffect, useMemo, useState } from "react";

import { api, type SecurityEventListItem } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; events: SecurityEventListItem[] };

type ToolRiskSummary = {
  tool: string;
  blocks: number;
  sanitizes: number;
  allows: number;
  avgRisk: number;
  maxRisk: number;
};

export function SecurityView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const runs = await api.listRuns(25);
        const eventResults = await Promise.allSettled(
          runs.map((run) => api.listRunSecurityEvents(run.run_id, { limit: 200, offset: 0 }))
        );
        const events = eventResults
          .filter((result): result is PromiseFulfilledResult<SecurityEventListItem[]> => result.status === "fulfilled")
          .flatMap((result) => result.value)
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

        if (cancelled) return;
        setState({ status: "ready", events });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load security data",
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const topRiskyTools = useMemo(() => {
    if (state.status !== "ready") return [] as ToolRiskSummary[];

    const byTool = new Map<string, ToolRiskSummary>();
    for (const event of state.events) {
      const current = byTool.get(event.tool) ?? {
        tool: event.tool,
        blocks: 0,
        sanitizes: 0,
        allows: 0,
        avgRisk: 0,
        maxRisk: 0,
      };
      if (event.action === "block") current.blocks += 1;
      else if (event.action === "sanitize") current.sanitizes += 1;
      else current.allows += 1;

      const total = current.blocks + current.sanitizes + current.allows;
      current.avgRisk = total === 1 ? event.risk_score : ((current.avgRisk * (total - 1)) + event.risk_score) / total;
      current.maxRisk = Math.max(current.maxRisk, event.risk_score);
      byTool.set(event.tool, current);
    }

    return [...byTool.values()]
      .sort(
        (a, b) =>
          b.blocks - a.blocks ||
          b.sanitizes - a.sanitizes ||
          b.maxRisk - a.maxRisk ||
          a.tool.localeCompare(b.tool)
      )
      .slice(0, 12);
  }, [state]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trust-zone prompt injection firewall activity and risky tool outputs.
        </p>
      </div>

      {state.status === "loading" ? (
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      ) : state.status === "error" ? (
        <Card className="border-rose-400/20">
          <CardContent className="p-5 text-sm text-rose-100">{state.message}</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Risky Tools</CardTitle>
              <CardDescription>
                Ranked by block count, then sanitizations, from recent security events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tool</TableHead>
                    <TableHead className="text-right">Blocks</TableHead>
                    <TableHead className="text-right">Sanitizes</TableHead>
                    <TableHead className="text-right">Avg Risk</TableHead>
                    <TableHead className="text-right">Max Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topRiskyTools.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No security events recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    topRiskyTools.map((item) => (
                      <TableRow key={item.tool}>
                        <TableCell className="font-medium text-foreground">{item.tool}</TableCell>
                        <TableCell className="text-right text-rose-200">{item.blocks}</TableCell>
                        <TableCell className="text-right text-amber-200">{item.sanitizes}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {Math.round(item.avgRisk * 100)}%
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {Math.round(item.maxRisk * 100)}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Latest trust-zone actions captured during run replay.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Tool</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Run</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        No security events recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    state.events.slice(0, 20).map((event) => (
                      <TableRow key={event.security_event_id}>
                        <TableCell>
                          <Badge
                            variant={
                              event.action === "block"
                                ? "danger"
                                : event.action === "sanitize"
                                  ? "warning"
                                  : "default"
                            }
                          >
                            {event.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-foreground" title={event.tool}>
                          {event.tool}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{event.zone}</TableCell>
                        <TableCell className="text-muted-foreground">{Math.round(event.risk_score * 100)}%</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {shortId(event.run_id, 10)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {shortId(event.attempt_id, 10)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatRelativeDate(event.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
