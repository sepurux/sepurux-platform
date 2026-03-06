"use client";

import { FormEvent, useEffect, useState } from "react";

import { api, type WebhookMetadata } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; webhooks: WebhookMetadata[] };

export function WebhooksView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("run.completed");
  const [isEnabled, setIsEnabled] = useState(true);
  const [busyWebhookId, setBusyWebhookId] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  async function load() {
    setState({ status: "loading" });
    try {
      const webhooks = await api.listWebhooks();
      setState({ status: "ready", webhooks });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load webhooks",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreateWebhook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSubmitBusy(true);
      setRevealedSecret(null);
      const created = await api.createWebhook({
        url,
        events: parseEvents(events),
        is_enabled: isEnabled,
      });
      setUrl("");
      setEvents("run.completed");
      setIsEnabled(true);
      setRevealedSecret(created.secret);
      await load();
    } finally {
      setSubmitBusy(false);
    }
  }

  async function onToggleEnabled(webhook: WebhookMetadata) {
    try {
      setBusyWebhookId(webhook.webhook_id);
      await api.updateWebhook(webhook.webhook_id, { is_enabled: !webhook.is_enabled });
      await load();
    } finally {
      setBusyWebhookId(null);
    }
  }

  async function onEditWebhook(webhook: WebhookMetadata) {
    const nextUrl = window.prompt("Webhook URL", webhook.url);
    if (nextUrl === null) {
      return;
    }
    const nextEventsRaw = window.prompt(
      "Subscribed events (comma-separated)",
      webhook.events.join(", ")
    );
    if (nextEventsRaw === null) {
      return;
    }
    try {
      setBusyWebhookId(webhook.webhook_id);
      await api.updateWebhook(webhook.webhook_id, {
        url: nextUrl,
        events: parseEvents(nextEventsRaw),
      });
      await load();
    } finally {
      setBusyWebhookId(null);
    }
  }

  async function onRotateSecret(webhook: WebhookMetadata) {
    const confirmed = window.confirm(
      "Rotate this webhook secret? Existing signature verification will fail until consumer config is updated."
    );
    if (!confirmed) {
      return;
    }
    try {
      setBusyWebhookId(webhook.webhook_id);
      const rotated = await api.rotateWebhookSecret(webhook.webhook_id);
      setRevealedSecret(rotated.secret);
      await load();
    } finally {
      setBusyWebhookId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Webhooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure outbound event notifications signed with HMAC SHA256.
        </p>
      </div>

      {revealedSecret ? (
        <Card className="border-amber-300/20 bg-amber-400/5">
          <CardHeader>
            <CardTitle className="text-amber-100">Webhook Secret (shown once)</CardTitle>
            <CardDescription>
              Save this value now. It will not be returned again except on rotate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block overflow-auto rounded-md border border-amber-200/20 bg-background/70 p-3 text-xs text-amber-100">
              {revealedSecret}
            </code>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create Webhook</CardTitle>
          <CardDescription>
            Subscribe a destination URL to project events like <code>run.completed</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[2fr_1fr_auto_auto]" onSubmit={onCreateWebhook}>
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="https://example.com/webhooks/crash-lab"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
            />
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="run.completed"
              value={events}
              onChange={(event) => setEvents(event.target.value)}
            />
            <label className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(event) => setIsEnabled(event.target.checked)}
              />
              Enabled
            </label>
            <Button type="submit" disabled={submitBusy}>
              {submitBusy ? "Creating..." : "Create"}
            </Button>
          </form>
        </CardContent>
      </Card>

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
            <CardTitle>Configured Webhooks</CardTitle>
            <CardDescription>{state.webhooks.length} webhook(s) in current project.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Last Delivery</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.webhooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No webhooks configured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.webhooks.map((webhook) => (
                    <TableRow key={webhook.webhook_id}>
                      <TableCell>
                        <Badge variant={webhook.is_enabled ? "default" : "outline"}>
                          {webhook.is_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-foreground" title={webhook.url}>
                        {webhook.url}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate text-muted-foreground" title={webhook.events.join(", ")}>
                        {webhook.events.join(", ") || "--"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {webhook.last_success_at ? formatRelativeDate(webhook.last_success_at) : webhook.last_error ? "Last attempt failed" : "--"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {shortId(webhook.webhook_id, 12)}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyWebhookId === webhook.webhook_id}
                          onClick={() => void onToggleEnabled(webhook)}
                        >
                          {webhook.is_enabled ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyWebhookId === webhook.webhook_id}
                          onClick={() => void onEditWebhook(webhook)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyWebhookId === webhook.webhook_id}
                          onClick={() => void onRotateSecret(webhook)}
                        >
                          Rotate Secret
                        </Button>
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

function parseEvents(raw: string): string[] {
  const items = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return [...new Set(items)];
}
