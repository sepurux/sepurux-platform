"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { api, type ToolRegistryMetadata } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import { useAuthSession } from "@/lib/use-auth-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; tools: ToolRegistryMetadata[] };

export function SecurityToolsView() {
  const authSession = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
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
      try {
        const tools = await api.listTools();
        if (cancelled) {
          return;
        }
        setState({
          status: "ready",
          tools: [...tools].sort((left, right) => left.name.localeCompare(right.name)),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load tool zones",
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
      setState({
        status: "ready",
        tools: [...tools].sort((left, right) => left.name.localeCompare(right.name)),
      });
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
      setState((currentValue) => {
        if (currentValue.status !== "ready") {
          return currentValue;
        }
        return {
          status: "ready",
          tools: currentValue.tools
            .map((item) => (item.tool_id === toolId ? updated : item))
            .sort((left, right) => left.name.localeCompare(right.name)),
        };
      });
    } catch (error) {
      setToolConfigError(error instanceof Error ? error.message : "Failed to update tool zone");
    } finally {
      setSavingToolId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Manage Tool Zones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep trust-boundary configuration on its own screen instead of mixing it into security event review.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/security">View Security Events</Link>
        </Button>
      </div>

      {!canManageSecurityConfig && authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Tool-zone management is restricted to admin memberships on plans with security access.
          </CardContent>
        </Card>
      ) : null}

      {state.status === "loading" ? (
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-[360px] w-full" />
          </CardContent>
        </Card>
      ) : state.status === "error" ? (
        <Card className="border-rose-400/20">
          <CardContent className="p-5 text-sm text-rose-100">{state.message}</CardContent>
        </Card>
      ) : (
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
                    disabled={creatingTool}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Zone</span>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    value={toolZone}
                    onChange={(event) => setToolZone(event.target.value)}
                    disabled={creatingTool}
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
            ) : null}

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
                {state.tools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No tool zones configured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.tools.map((tool) => (
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
      )}
    </div>
  );
}
