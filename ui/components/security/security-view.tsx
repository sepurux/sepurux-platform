"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  api,
  type SecurityEventListItem,
  type ToolRegistryMetadata,
} from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { useAuthSession } from "@/lib/use-auth-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const authSession = useAuthSession();
  const searchParams = useSearchParams();
  const toolFilter = (searchParams.get("tool") ?? "").trim().toLowerCase();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [toolRegistry, setToolRegistry] = useState<ToolRegistryMetadata[]>([]);
  const [toolName, setToolName] = useState("");
  const [toolZone, setToolZone] = useState("untrusted");
  const [toolConfigError, setToolConfigError] = useState<string | null>(null);
  const [creatingTool, setCreatingTool] = useState(false);
  const [savingToolId, setSavingToolId] = useState<string | null>(null);

  const canManageSecurityConfig =
    authSession?.permissions.can_manage_security_config ?? false;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const [runs, tools] = await Promise.all([api.listRuns(25), api.listTools()]);
        const eventResults = await Promise.allSettled(
          runs.map((run) => api.listRunSecurityEvents(run.run_id, { limit: 200, offset: 0 }))
        );
        const events = eventResults
          .filter((result): result is PromiseFulfilledResult<SecurityEventListItem[]> => result.status === "fulfilled")
          .flatMap((result) => result.value)
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

        if (cancelled) return;
        setToolRegistry(
          [...tools].sort((left, right) => left.name.localeCompare(right.name))
        );
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

  async function onCreateTool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToolConfigError(null);
    setCreatingTool(true);

    try {
      await api.createTool({ name: toolName, zone: toolZone });
      const tools = await api.listTools();
      setToolRegistry(
        [...tools].sort((left, right) => left.name.localeCompare(right.name))
      );
      setToolName("");
      setToolZone("untrusted");
    } catch (error) {
      setToolConfigError(error instanceof Error ? error.message : "Failed to create tool zone");
    } finally {
      setCreatingTool(false);
    }
  }

  async function onUpdateToolZone(toolId: string, zone: string) {
    setToolConfigError(null);
    setSavingToolId(toolId);

    try {
      const updated = await api.updateToolZone(toolId, zone);
      setToolRegistry((currentValue) =>
        currentValue
          .map((item) => (item.tool_id === toolId ? updated : item))
          .sort((left, right) => left.name.localeCompare(right.name))
      );
    } catch (error) {
      setToolConfigError(error instanceof Error ? error.message : "Failed to update tool zone");
    } finally {
      setSavingToolId(null);
    }
  }

  const filteredEvents = useMemo(() => {
    if (state.status !== "ready") return [] as SecurityEventListItem[];
    if (!toolFilter) return state.events;
    return state.events.filter((event) => event.tool.toLowerCase().includes(toolFilter));
  }, [state, toolFilter]);

  const topRiskyTools = useMemo(() => {
    if (state.status !== "ready") return [] as ToolRiskSummary[];

    const byTool = new Map<string, ToolRiskSummary>();
    for (const event of filteredEvents) {
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
  }, [filteredEvents, state.status]);

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
              <CardTitle>Tool Zones</CardTitle>
              <CardDescription>
                Tool trust boundaries follow workspace RBAC and plan access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManageSecurityConfig ? (
                <form
                  className="grid gap-4 rounded-md border border-border/60 bg-muted/10 p-4 md:grid-cols-[1.4fr_0.8fr_auto]"
                  onSubmit={onCreateTool}
                >
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">Tool Name</span>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                      value={toolName}
                      onChange={(event) => setToolName(event.target.value)}
                      placeholder="jira.create_issue"
                      required
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">Zone</span>
                    <select
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                      value={toolZone}
                      onChange={(event) => setToolZone(event.target.value)}
                    >
                      <option value="trusted">trusted</option>
                      <option value="untrusted">untrusted</option>
                    </select>
                  </label>
                  <div className="flex items-end">
                    <Button type="submit" disabled={creatingTool}>
                      {creatingTool ? "Saving..." : "Add Tool"}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tool-zone management is restricted to admin memberships on plans with security access.
                </p>
              )}

              {toolConfigError ? (
                <p className="text-sm text-rose-200">{toolConfigError}</p>
              ) : null}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tool</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {toolRegistry.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        No tool zones configured yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    toolRegistry.map((tool) => (
                      <TableRow key={tool.tool_id}>
                        <TableCell className="font-mono text-xs text-foreground">
                          {tool.name}
                        </TableCell>
                        <TableCell>
                          {canManageSecurityConfig ? (
                            <select
                              className="rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
                              value={tool.zone}
                              disabled={savingToolId === tool.tool_id}
                              onChange={(event) =>
                                void onUpdateToolZone(tool.tool_id, event.target.value)
                              }
                            >
                              <option value="trusted">trusted</option>
                              <option value="untrusted">untrusted</option>
                            </select>
                          ) : (
                            <Badge variant={tool.zone === "trusted" ? "default" : "warning"}>
                              {tool.zone}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatRelativeDate(tool.created_at)}
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
              <CardTitle>Top Risky Tools</CardTitle>
              <CardDescription>
                {toolFilter
                  ? `Filtered to tools matching "${toolFilter}".`
                  : "Ranked by block count, then sanitizations, from recent security events."}
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
              <CardDescription>
                {toolFilter
                  ? `Latest trust-zone actions for tools matching "${toolFilter}".`
                  : "Latest trust-zone actions captured during run replay."}
              </CardDescription>
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
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        {toolFilter
                          ? "No security events match this tool filter."
                          : "No security events recorded yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.slice(0, 20).map((event) => (
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
