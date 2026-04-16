"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Send, Users } from "lucide-react";

import {
  ApiError,
  api,
  type InternalNewsletterCampaignEntry,
  type InternalNewsletterOverview,
  type InternalNewsletterSendRequest,
} from "@/lib/api";

const defaultForm: InternalNewsletterSendRequest = {
  audience: "subscribed_users",
  subject: "Sepurux product update",
  preview_text: "New platform improvements, workflow reliability updates, and what is shipping next.",
  eyebrow: "Sepurux Newsletter",
  title: "Reliability improvements you can ship this week.",
  summary: "A concise update for teams hardening agent workflows in production.",
  body: [
    "We refreshed the Sepurux experience to make reliability work faster to scan and easier to act on.",
    "",
    "In this update:",
    "- cleaner diagnostics and dashboard review flows",
    "- improved email branding to match the new Sepurux identity",
    "- stronger sandbox and site polish across the product surface",
    "",
    "We are also tightening the operator workflows that sit behind campaigns, alerts, and workspace controls so the product feels more coherent end to end.",
  ].join("\n"),
  cta_label: "Open Sepurux",
  cta_url: "https://app.sepurux.com/dashboard",
};

function formatTimestamp(value: string | null) {
  if (!value) return "Not sent";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function bodyBlocks(value: string) {
  const blocks: Array<{ type: "paragraph" | "list"; items: string[] }> = [];
  const paragraph: string[] = [];
  const list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", items: [paragraph.join(" ")] });
      paragraph.length = 0;
    }
  };

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: [...list] });
      list.length = 0;
    }
  };

  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      list.push(line.slice(2).trim());
      continue;
    }
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function CampaignHistoryCard({ campaign }: { campaign: InternalNewsletterCampaignEntry }) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-insetSoft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {campaign.eyebrow || "Newsletter"}
          </p>
          <h3 className="mt-2 text-base font-semibold text-foreground">{campaign.subject}</h3>
        </div>
        <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {campaign.delivered_count}/{campaign.recipients_count} delivered
        </span>
      </div>
      {campaign.summary ? <p className="mt-3 text-sm text-muted-foreground">{campaign.summary}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Sent by {campaign.sent_by}</span>
        <span>{formatTimestamp(campaign.sent_at)}</span>
      </div>
    </article>
  );
}

export function InternalEmailView() {
  const [overview, setOverview] = useState<InternalNewsletterOverview | null>(null);
  const [form, setForm] = useState<InternalNewsletterSendRequest>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await api.getInternalNewsletters();
        if (cancelled) return;
        setOverview(payload);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : "Failed to load email console");
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

  const previewBlocks = useMemo(() => bodyBlocks(form.body), [form.body]);

  async function handleSend() {
    setSending(true);
    setStatus(null);
    try {
      const payload = await api.sendInternalNewsletter(form);
      setOverview((current) => ({
        audience: payload.audience,
        campaigns: current ? [payload.campaign, ...current.campaigns] : [payload.campaign],
      }));
      setError(null);
      setStatus(`Newsletter sent to ${payload.campaign.delivered_count} recipients.`);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Failed to send newsletter");
      }
    } finally {
      setSending(false);
    }
  }

  const audience = overview?.audience;

  return (
    <section className="mx-auto w-full max-w-[88rem] space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Email</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Transactional emails now use the refreshed Sepurux brand. This console sends product newsletters to subscribed users only.
          </p>
        </div>
        <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Audience</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {audience ? audience.subscribed_users.toLocaleString() : "--"}
          </p>
          <p className="text-xs text-muted-foreground">Subscribed users</p>
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading email console...</p> : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/8 p-4 text-sm text-danger">{error}</div>
      ) : null}

      {!loading ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-panel">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Users className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Reach</span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{audience?.subscribed_users ?? 0}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Current newsletter subscribers</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center gap-2 text-[color:var(--accent-teal)]">
                    <Mail className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Total users</span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{audience?.total_users ?? 0}</p>
                  <p className="mt-1 text-xs text-muted-foreground">All accounts in the system</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Send className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Opt-outs</span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{audience?.unsubscribed_users ?? 0}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Excluded from marketing sends</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Composer</p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">Send a professional Sepurux newsletter</h2>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_16px_40px_rgba(215,132,59,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {sending ? "Sending..." : "Send newsletter"}
                </button>
              </div>

              {status ? <p className="mt-4 text-sm text-primary">{status}</p> : null}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Subject</span>
                  <input
                    value={form.subject}
                    onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                    className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/45"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Preview Text</span>
                  <input
                    value={form.preview_text ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, preview_text: event.target.value }))}
                    className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/45"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Eyebrow</span>
                  <input
                    value={form.eyebrow ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, eyebrow: event.target.value }))}
                    className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/45"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Headline</span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/45"
                  />
                </label>
              </div>

              <label className="mt-4 grid gap-2 text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Summary</span>
                <input
                  value={form.summary ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                  className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/45"
                />
              </label>

              <label className="mt-4 grid gap-2 text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Body</span>
                <textarea
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  rows={12}
                  className="rounded-2xl border border-border/70 bg-background/80 px-3 py-3 text-sm leading-7 text-foreground outline-none focus:border-primary/45"
                />
                <p className="text-xs text-muted-foreground">Use blank lines for paragraphs and `- item` for bullet lists.</p>
              </label>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">CTA Label</span>
                  <input
                    value={form.cta_label ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, cta_label: event.target.value }))}
                    className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/45"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">CTA URL</span>
                  <input
                    value={form.cta_url ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, cta_url: event.target.value }))}
                    className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/45"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-panel">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Live Preview</p>
              <div className="mt-4 overflow-hidden rounded-xl border border-border/60 bg-white">
                {/* Header — dark */}
                <div className="bg-[#0d0d1a] px-6 py-7">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.13em] text-[#a5b4fc]">
                    {form.eyebrow || "Sepurux Newsletter"}
                  </p>
                  <h3 className="mt-3 text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-white">
                    {form.title || "Newsletter title"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#9ca3af]">
                    {form.preview_text || form.summary || form.subject}
                  </p>
                </div>
                {/* Body */}
                <div className="space-y-4 bg-[#f9fafb] px-6 py-6 text-sm leading-7 text-[#111827]">
                  <div className="rounded-md border-l-[3px] border-[#4f46e5] border border-[#e5e7eb] bg-white px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4f46e5]">Sepurux</p>
                    <p className="mt-2 text-sm leading-7 text-[#374151]">
                      {form.summary || "A concise update for subscribed Sepurux users."}
                    </p>
                  </div>
                  {previewBlocks.map((block, index) =>
                    block.type === "paragraph" ? (
                      <p key={index} className="text-sm leading-7 text-[#374151]">
                        {block.items[0]}
                      </p>
                    ) : (
                      <ul key={index} className="list-disc space-y-2 pl-5 text-sm leading-7 text-[#374151]">
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )
                  )}
                  {form.cta_label && form.cta_url ? (
                    <div className="pt-2">
                      <span className="inline-flex rounded-md bg-[#4f46e5] px-5 py-3 text-sm font-semibold text-white">
                        {form.cta_label}
                      </span>
                    </div>
                  ) : null}
                  <div className="border-t border-[#e5e7eb] pt-4 text-xs leading-6 text-[#6b7280]">
                    <p>You are receiving this email because you are subscribed to Sepurux product updates.</p>
                    <p className="mt-1 text-[#4f46e5]">Unsubscribe link appears in every newsletter.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Recent Campaigns</p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">Newsletter history</h2>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {overview?.campaigns.length ? (
                  overview.campaigns.map((campaign) => (
                    <CampaignHistoryCard key={campaign.newsletter_campaign_id} campaign={campaign} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                    No newsletters have been sent yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
