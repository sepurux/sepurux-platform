"use client";

import { useEffect, useMemo, useState } from "react";

import { api, type AuditEventListItem } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; events: AuditEventListItem[] };

const PAGE_SIZE = 25;

export function AuditEventsView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  async function load() {
    setState({ status: "loading" });
    try {
      const events = await api.listAuditEvents({ limit: 200, offset: 0 });
      setState({ status: "ready", events });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load audit events",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredEvents = useMemo(() => {
    if (state.status !== "ready") {
      return [] as AuditEventListItem[];
    }
    if (eventTypeFilter === "all") {
      return state.events;
    }
    return state.events.filter((event) => event.event_type === eventTypeFilter);
  }, [state, eventTypeFilter]);

  const pagedEvents = useMemo(
    () => filteredEvents.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filteredEvents, page]
  );
  const hasNext = (page + 1) * PAGE_SIZE < filteredEvents.length;

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredEvents.length / PAGE_SIZE) - 1);
    setPage((currentValue) => (currentValue > maxPage ? maxPage : currentValue));
  }, [filteredEvents.length]);

  const eventTypes = useMemo(() => {
    if (state.status !== "ready") {
      return [] as string[];
    }
    return [...new Set(state.events.map((event) => event.event_type))].sort();
  }, [state]);

  return (
    <div className="mx-auto max-w-[88rem] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Append-only project event history for operational traceability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            value={eventTypeFilter}
            onChange={(event) => {
              setEventTypeFilter(event.target.value);
              setPage(0);
            }}
          >
            <option value="all">All events</option>
            {eventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
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
        <Card>
          <CardHeader>
            <CardTitle>Audit Events</CardTitle>
            <CardDescription>
              {filteredEvents.length} event(s) in current view.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Metadata</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No audit events found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedEvents.map((event) => (
                    <TableRow key={event.audit_event_id}>
                      <TableCell>
                        <Badge variant="outline">{event.event_type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{event.actor ?? "system"}</TableCell>
                      <TableCell className="max-w-[420px] truncate text-xs text-muted-foreground">
                        <code title={JSON.stringify(event.metadata)}>
                          {metadataPreview(event.metadata)}
                        </code>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {shortId(event.audit_event_id, 12)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatRelativeDate(event.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              currentCount={pagedEvents.length}
              hasNext={hasNext}
              onPrev={() => setPage((currentValue) => Math.max(0, currentValue - 1))}
              onNext={() => setPage((currentValue) => currentValue + 1)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function metadataPreview(metadata: Record<string, unknown>) {
  const raw = JSON.stringify(metadata);
  if (raw.length <= 120) {
    return raw;
  }
  return `${raw.slice(0, 117)}...`;
}
