"use client";

import { useEffect, useState } from "react";

import { api, type ScheduledCampaignMetadata } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: ScheduledCampaignMetadata[] };

function statusBadge(status: string | null) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  if (status === "success") return <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">success</Badge>;
  if (status === "skipped_insufficient_credits") return <Badge variant="outline" className="border-amber-500/40 text-amber-400">skipped (credits)</Badge>;
  return <Badge variant="outline" className="border-rose-500/40 text-rose-400">{status}</Badge>;
}

export function ScheduledCampaignsView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const items = await api.listScheduledCampaigns({ limit: 200, offset: 0 });
        if (cancelled) return;
        setState({ status: "ready", items });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load scheduled campaigns",
        });
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Scheduled Campaigns</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Automated mutation campaigns that run on a cron schedule with credit enforcement.
        </p>
      </div>

      {state.status === "loading" ? (
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : state.status === "error" ? (
        <Card className="border-rose-400/20">
          <CardContent className="p-5 text-sm text-rose-100">{state.message}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Schedules</CardTitle>
            <CardDescription>
              {state.items.length} scheduled campaign(s) in current project scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Mutation Pack</TableHead>
                  <TableHead>Cron Schedule</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Last Status</TableHead>
                  <TableHead className="text-right">Last Run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No scheduled campaigns yet. Use the API to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.items.map((item) => (
                    <TableRow key={item.scheduled_campaign_id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {shortId(item.campaign_id, 16)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {shortId(item.mutation_pack_id, 16)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground">
                        {item.cron_schedule}
                      </TableCell>
                      <TableCell>
                        {item.enabled ? (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">on</Badge>
                        ) : (
                          <Badge variant="outline" className="border-zinc-500/40 text-zinc-400">off</Badge>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(item.last_run_status)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.last_run_at ? formatRelativeDate(item.last_run_at) : "—"}
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
